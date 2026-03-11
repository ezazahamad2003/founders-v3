"""Agentic Debate endpoint: OpenAI and Claude argue a topic until consensus is reached."""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.claude_client import call_claude_non_stream, stream_claude_message
from app.config import Settings, get_settings
from app.db import get_db_session
from app.services.document_text import extract_text_from_bytes
from app.services import conversations as conversations_service
from app.services import messages as messages_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["debate"])

STREAM_MEDIA_TYPE = "text/event-stream"

MAX_TOKENS_PER_TURN = 1024
MAX_TOKENS_SYNTHESIS = 2048
MAX_ROUNDS_DEFAULT = 8
MAX_ROUNDS_HARD_LIMIT = 15


# ── System prompts ──────────────────────────────────────────────────────────

OPENAI_SYSTEM = """You are Analyst A (GPT) in a structured legal/document analysis debate.
Your goal is to present a well-reasoned position on the topic, respond to opposing arguments thoughtfully,
and work toward a consensus with Analyst B without abandoning valid points.
Be concise (2-4 paragraphs). Focus on logical, evidence-based arguments.
When you agree with a point from the opposing analyst, explicitly say so."""

CLAUDE_SYSTEM = """You are Analyst B (Claude) in a structured legal/document analysis debate.
Your goal is to present a well-reasoned position on the topic, respond to opposing arguments thoughtfully,
and work toward a consensus with Analyst A without abandoning valid points.
Be concise (2-4 paragraphs). Focus on logical, evidence-based arguments.
When you agree with a point from the opposing analyst, explicitly say so."""

CONSENSUS_JUDGE_SYSTEM = (
    "You are a neutral debate judge. Given two analyst positions, rate their consensus "
    "from 0 to 100. Respond with ONLY a single integer. "
    "0 = completely opposed, 100 = full agreement."
)

SYNTHESIS_SYSTEM = """You are a senior legal analyst synthesizing a debate into a final unified analysis.
Combine the agreed-upon points from both analysts into a coherent, well-structured conclusion.
Highlight key agreements, note any remaining nuances, and present actionable insights where applicable."""


# ── Helpers ─────────────────────────────────────────────────────────────────

def _jl(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _debate_title(topic: str) -> str:
    trimmed = (topic or "").strip()
    if not trimmed:
        return "Agentic Debate"
    return f"Agentic Debate: {trimmed[:60]}"


def _build_debate_request_message(
    *,
    topic: str,
    target_consensus: int,
    max_rounds: int,
    file_name: Optional[str],
) -> str:
    lines = [
        "⚔️ Agentic Debate Request",
        "",
        f"Topic: {topic or 'Uploaded document'}",
        f"Target consensus: {target_consensus}%",
        f"Max rounds: {max_rounds}",
    ]
    if file_name:
        lines.append(f"Document: {file_name}")
    return "\n".join(lines)


def _build_debate_record_message(
    *,
    topic: str,
    target_consensus: int,
    final_consensus: int,
    rounds_completed: int,
    consensus_history: List[dict],
    debate_turns: List[dict],
    synthesis_text: str,
) -> str:
    lines: List[str] = [
        "## ⚔️ Agentic Debate",
        "",
        f"**Topic:** {topic or 'Uploaded document'}",
        f"**Target consensus:** {target_consensus}%",
        f"**Final consensus:** {final_consensus}%",
        f"**Rounds completed:** {rounds_completed}",
        "",
        "### Consensus Progress",
    ]

    for item in consensus_history:
        suffix = " (target reached)" if item.get("reached") else ""
        lines.append(f"- Round {item.get('round')}: {item.get('percentage')}%{suffix}")

    lines.extend(["", "### Debate Transcript", ""])
    for turn in debate_turns:
        model_name = "GPT" if turn.get("model") == "openai" else "Claude"
        lines.append(f"#### Round {turn.get('round')} — {model_name}")
        lines.append(turn.get("content", "").strip() or "_No output_")
        lines.append("")

    lines.extend(["### Unified Synthesis", "", synthesis_text.strip() or "_No synthesis generated._"])
    return "\n".join(lines).strip()


def _get_openai_client(settings: Settings) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key_clean)


async def _stream_openai_turn(
    messages: List[dict],
    settings: Settings,
) -> AsyncIterator[str]:
    client = _get_openai_client(settings)
    stream = await client.chat.completions.create(
        model=settings.openai_model_chat,
        messages=messages,
        max_completion_tokens=MAX_TOKENS_PER_TURN,
        temperature=0.7,
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def _call_openai_non_stream(
    messages: List[dict],
    system: str,
    settings: Settings,
    max_tokens: int = 512,
) -> str:
    client = _get_openai_client(settings)
    full_messages = [{"role": "system", "content": system}] + messages
    response = await client.chat.completions.create(
        model=settings.openai_model_chat,
        messages=full_messages,
        max_completion_tokens=max_tokens,
        temperature=0.0,
    )
    if response.choices:
        return response.choices[0].message.content or ""
    return ""


async def _calculate_consensus(
    openai_text: str,
    claude_text: str,
    topic: str,
    settings: Settings,
) -> int:
    prompt = (
        f'Topic: "{topic}"\n\n'
        f"Position A (GPT):\n{openai_text}\n\n"
        f"Position B (Claude):\n{claude_text}\n\n"
        "Rate consensus 0-100. Respond with ONLY the integer."
    )
    raw = await _call_openai_non_stream(
        messages=[{"role": "user", "content": prompt}],
        system=CONSENSUS_JUDGE_SYSTEM,
        settings=settings,
        max_tokens=8,
    )
    try:
        return max(0, min(100, int(raw.strip())))
    except (ValueError, TypeError):
        return 50


# ── Main debate generator ────────────────────────────────────────────────────

async def _debate_generator(
    topic: str,
    doc_context: str,
    target_consensus: int,
    max_rounds: int,
    settings: Settings,
    db: AsyncSession,
    current_user: CurrentUser,
    conversation_id: UUID,
) -> AsyncIterator[str]:
    context_block = (
        f"\n\nDocument context:\n{doc_context[:8000]}" if doc_context else ""
    )
    full_topic = f"{topic}{context_block}"

    # Separate conversation histories
    openai_messages: List[dict] = [{"role": "system", "content": OPENAI_SYSTEM}]
    claude_messages: List[dict] = []

    openai_latest = ""
    claude_latest = ""
    consensus = 0
    rounds_completed = 0
    consensus_history: List[dict] = []
    debate_turns: List[dict] = []

    yield _jl({"event": "debate_start", "target_consensus": target_consensus})

    for round_num in range(1, max_rounds + 1):
        yield _jl({"event": "round_start", "round": round_num})

        # ── OpenAI turn ──────────────────────────────────────────────
        if round_num == 1:
            user_prompt = (
                f"Topic: {full_topic}\n\n"
                "Please provide your initial analysis and position on this topic."
            )
        else:
            user_prompt = (
                f"Analyst B (Claude) responded:\n{claude_latest}\n\n"
                "Please respond to their points, acknowledge any agreements, "
                "and refine your position where appropriate."
            )

        openai_messages.append({"role": "user", "content": user_prompt})
        yield _jl({"event": "model_turn_start", "model": "openai", "round": round_num})

        openai_latest = ""
        try:
            async for token in _stream_openai_turn(openai_messages, settings):
                openai_latest += token
                yield _jl({"event": "token", "model": "openai", "delta": token})
        except Exception as e:
            logger.error("OpenAI debate turn failed: %s", e)
            yield _jl({"event": "error", "message": f"OpenAI turn failed: {e}"})
            return

        openai_messages.append({"role": "assistant", "content": openai_latest})
        debate_turns.append({"round": round_num, "model": "openai", "content": openai_latest})
        yield _jl({"event": "model_turn_end", "model": "openai", "round": round_num, "content": openai_latest})

        # ── Claude turn ──────────────────────────────────────────────
        if round_num == 1:
            claude_user_prompt = (
                f"Topic: {full_topic}\n\n"
                f"Analyst A (GPT) has given their initial analysis:\n{openai_latest}\n\n"
                "Please provide your own analysis and respond to their points."
            )
        else:
            claude_user_prompt = (
                f"Analyst A (GPT) responded:\n{openai_latest}\n\n"
                "Please respond to their points, acknowledge any agreements, "
                "and refine your position where appropriate."
            )

        claude_messages.append({"role": "user", "content": claude_user_prompt})
        yield _jl({"event": "model_turn_start", "model": "claude", "round": round_num})

        claude_latest = ""
        try:
            async for token in stream_claude_message(
                messages=claude_messages,
                system=CLAUDE_SYSTEM,
                settings=settings,
                max_tokens=MAX_TOKENS_PER_TURN,
                temperature=0.7,
            ):
                claude_latest += token
                yield _jl({"event": "token", "model": "claude", "delta": token})
        except Exception as e:
            logger.error("Claude debate turn failed: %s", e)
            yield _jl({"event": "error", "message": f"Claude turn failed: {e}"})
            return

        claude_messages.append({"role": "assistant", "content": claude_latest})
        debate_turns.append({"round": round_num, "model": "claude", "content": claude_latest})
        yield _jl({"event": "model_turn_end", "model": "claude", "round": round_num, "content": claude_latest})

        # ── Consensus check ──────────────────────────────────────────
        try:
            consensus = await _calculate_consensus(openai_latest, claude_latest, topic, settings)
        except Exception as e:
            logger.warning("Consensus calculation failed: %s", e)
            consensus = 50

        rounds_completed = round_num
        reached = consensus >= target_consensus
        consensus_history.append(
            {"round": round_num, "percentage": consensus, "reached": reached}
        )
        yield _jl({"event": "consensus_check", "round": round_num, "percentage": consensus, "reached": reached})

        if reached:
            break

    # ── Synthesis ────────────────────────────────────────────────────────────
    yield _jl({"event": "synthesis_start"})

    synthesis_prompt = (
        f"Topic: {topic}\n\n"
        f"Final GPT position:\n{openai_latest}\n\n"
        f"Final Claude position:\n{claude_latest}\n\n"
        f"Reached consensus level: {consensus}%\n\n"
        "Please synthesize these positions into a single, unified, well-structured analysis."
    )

    synthesis_openai_messages = [
        {"role": "system", "content": SYNTHESIS_SYSTEM},
        {"role": "user", "content": synthesis_prompt},
    ]

    synthesis_text = ""
    try:
        async for token in _stream_openai_turn(synthesis_openai_messages, settings):
            synthesis_text += token
            yield _jl({"event": "token", "model": "synthesis", "delta": token})
    except Exception as e:
        logger.error("Synthesis generation failed: %s", e)
        yield _jl({"event": "error", "message": f"Synthesis failed: {e}"})
        return

    try:
        debate_record = _build_debate_record_message(
            topic=topic,
            target_consensus=target_consensus,
            final_consensus=consensus,
            rounds_completed=rounds_completed,
            consensus_history=consensus_history,
            debate_turns=debate_turns,
            synthesis_text=synthesis_text,
        )
        assistant_message = await messages_service.insert_assistant_message(
            db=db,
            conversation_id=conversation_id,
            content=debate_record,
            model="agentic_debate",
            metadata={
                "type": "agentic_debate",
                "topic": topic,
                "target_consensus": target_consensus,
                "final_consensus": consensus,
                "rounds_completed": rounds_completed,
                "consensus_history": consensus_history,
                "requested_by": str(current_user.id),
            },
            file_ids=None,
        )
        await conversations_service.touch_conversation_updated_at(db, conversation_id)
    except Exception as e:
        logger.error("Failed to persist debate conversation: %s", e)
        yield _jl({"event": "error", "message": f"Failed to save debate: {e}"})
        return

    yield _jl({
        "event": "done",
        "rounds_completed": rounds_completed,
        "final_consensus": consensus,
        "synthesis": synthesis_text,
        "conversation_id": str(conversation_id),
        "message_id": str(assistant_message.id),
    })


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/debate")
async def debate_endpoint(
    topic: str = Form(default=""),
    target_consensus: int = Form(default=70),
    max_rounds: int = Form(default=MAX_ROUNDS_DEFAULT),
    file: Optional[UploadFile] = File(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Run an agentic debate between OpenAI (GPT) and Claude on a topic or document.
    Streams SSE events for each debate turn, consensus checks, and the final synthesis.
    """
    ensure_tos_accepted(current_user)

    if not topic and not file:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide a topic or upload a document.",
        )

    target_consensus = max(10, min(100, target_consensus))
    max_rounds = max(1, min(max_rounds, MAX_ROUNDS_HARD_LIMIT))

    doc_context = ""
    if file:
        try:
            content = await file.read()
            doc_context = extract_text_from_bytes(
                data=content,
                mime_type=file.content_type,
                file_name=file.filename,
            )
            if not topic:
                topic = file.filename or "Uploaded Document"
        except Exception as e:
            logger.error("Failed to extract document text: %s", e)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not read the uploaded file.",
            )

    logger.info(
        "Debate started by user=%s topic=%r target=%d%% max_rounds=%d doc_len=%d",
        current_user.id,
        topic[:60],
        target_consensus,
        max_rounds,
        len(doc_context),
    )

    title_seed = topic or (file.filename if file else "") or "Agentic Debate"
    conversation_row = await conversations_service.get_or_create_conversation_for_message(
        db=db,
        current_user=current_user,
        maybe_conversation_id=None,
        initial_message=_debate_title(title_seed),
    )
    conversation_id: UUID = conversation_row["id"]

    await messages_service.insert_user_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=_build_debate_request_message(
            topic=topic,
            target_consensus=target_consensus,
            max_rounds=max_rounds,
            file_name=file.filename if file else None,
        ),
    )
    await conversations_service.touch_conversation_updated_at(db, conversation_id)

    generator = _debate_generator(
        topic=topic,
        doc_context=doc_context,
        target_consensus=target_consensus,
        max_rounds=max_rounds,
        settings=settings,
        db=db,
        current_user=current_user,
        conversation_id=conversation_id,
    )

    return StreamingResponse(generator, media_type=STREAM_MEDIA_TYPE)
