"""Doc Generation endpoints: Q&A chat and document generation using mega-prompts."""

from __future__ import annotations

import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.config import Settings, get_settings
from app.routers.docgen_prompts import DOCS
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/docgen", tags=["docgen"])

STREAM_MEDIA_TYPE = "text/plain; charset=utf-8"

_client: AsyncOpenAI | None = None


def _get_client(settings: Settings) -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key_clean,
            base_url=settings.openai_base_url or None,
        )
    return _client


def _json_line(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class DocgenChatRequest(BaseModel):
    doc_type: str = Field(..., description="Document type slug, e.g. 'nda'")
    messages: List[ChatMessage] = Field(default_factory=list)


class DocgenGenerateRequest(BaseModel):
    doc_type: str = Field(..., description="Document type slug")
    context: str = Field(..., description="Collected Q&A context to inject into the mega-prompt")


async def _stream_openai(messages: list, settings: Settings, max_tokens: int | None = None):
    """Yield newline-delimited JSON tokens from OpenAI streaming (matches chat router format)."""
    client = _get_client(settings)
    model = settings.openai_model_chat
    token_limit = max_tokens or settings.max_output_tokens
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_completion_tokens=token_limit,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield _json_line({"event": "token", "delta": delta.content})
        yield _json_line({"event": "done"})
    except Exception as exc:
        logger.exception("OpenAI streaming error in docgen: %s", exc)
        yield _json_line({"event": "error", "message": str(exc)})


@router.get("/docs")
async def list_docs(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return the list of available document types."""
    ensure_tos_accepted(current_user)
    return [
        {
            "slug": slug,
            "title": cfg["title"],
            "description": cfg["description"],
            "icon": cfg["icon"],
        }
        for slug, cfg in DOCS.items()
    ]


@router.post("/chat")
async def docgen_chat(
    payload: DocgenChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Streaming Q&A endpoint that gathers context for document generation."""
    ensure_tos_accepted(current_user)

    if payload.doc_type not in DOCS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown doc_type '{payload.doc_type}'. "
            f"Valid types: {', '.join(DOCS.keys())}",
        )

    cfg = DOCS[payload.doc_type]
    system_message = {"role": "system", "content": cfg["gathering_system_prompt"]}

    openai_messages = [system_message] + [
        {"role": msg.role, "content": msg.content} for msg in payload.messages
    ]

    return StreamingResponse(
        _stream_openai(openai_messages, settings),
        media_type=STREAM_MEDIA_TYPE,
    )


@router.post("/generate")
async def docgen_generate(
    payload: DocgenGenerateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Streaming endpoint that generates the full legal document using the mega-prompt."""
    ensure_tos_accepted(current_user)

    if payload.doc_type not in DOCS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown doc_type '{payload.doc_type}'.",
        )

    cfg = DOCS[payload.doc_type]
    full_prompt = (
        cfg["generation_mega_prompt"]
        + payload.context
        + "\n\nNow generate the complete legal document based on the above information. "
        "Output the full document in formal legal style — nothing summarized, nothing truncated."
    )

    messages = [{"role": "user", "content": full_prompt}]

    return StreamingResponse(
        _stream_openai(messages, settings, max_tokens=16000),
        media_type=STREAM_MEDIA_TYPE,
    )
