from __future__ import annotations

import json
from typing import AsyncIterator, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.config import Settings, get_settings
from app.db import get_db_session
from app.models import ChatRequest
from app.openai_client import (
    OpenAIChatResult,
    StreamingChatSession,
    chat_with_files,
    chat_with_vision,
    deep_research,
    stream_chat,
)
from app.prompts import get_system_prompt
from app.services import conversations, files as files_service, messages as messages_service

STREAM_MEDIA_TYPE = "text/event-stream"
DOC_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "text/plain",
}

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat_endpoint(
    payload: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
):
    """Main chat endpoint with streaming responses."""
    ensure_tos_accepted(current_user)

    # Allow files even without a conversation - they'll be associated when conversation is created

    conversation_row = await conversations.get_or_create_conversation_for_message(
        db=db,
        current_user=current_user,
        maybe_conversation_id=payload.conversation_id,
        initial_message=payload.message,
    )
    conversation_id: UUID = conversation_row["id"]

    validated_files = await files_service.validate_files_belong_to_conversation(
        db=db,
        file_ids=payload.file_ids or [],
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    await messages_service.insert_user_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=payload.message,
        file_ids=payload.file_ids,
    )
    await conversations.touch_conversation_updated_at(db, conversation_id)

    history = await messages_service.fetch_recent_messages(
        db=db,
        conversation_id=conversation_id,
        limit=settings.max_history_messages,
    )

    # Use the adaptive Scopic Legal system prompt
    base_system_prompt = get_system_prompt(mode="default")

    openai_messages = [{"role": "system", "content": base_system_prompt}] + [
        {"role": msg.role, "content": msg.content} for msg in history
    ]

    effective_mode = _determine_mode(payload.mode, validated_files)
    file_urls = _extract_file_urls(validated_files, settings)
    doc_files = [f for f in validated_files if f.mime_type in DOC_MIME_TYPES]

    response_generator: AsyncIterator[str]

    if effective_mode == "deep_research":
        oa_result = await deep_research(
            query=payload.message,
            conversation_context=openai_messages,
            settings=settings,
        )
        response_generator = _non_streaming_generator(
            result=oa_result,
            db=db,
            conversation_id=conversation_id,
            file_ids=payload.file_ids,
            mode=effective_mode,
            settings=settings,
        )
    elif effective_mode == "vision":
        oa_result = await chat_with_vision(
            messages=openai_messages,
            image_urls=file_urls or [],
            settings=settings,
        )
        response_generator = _non_streaming_generator(
            result=oa_result,
            db=db,
            conversation_id=conversation_id,
            file_ids=payload.file_ids,
            mode=effective_mode,
            settings=settings,
        )
    elif effective_mode == "files":
        oa_result = await chat_with_files(
            messages=openai_messages,
            files_meta=doc_files,
            settings=settings,
        )
        response_generator = _non_streaming_generator(
            result=oa_result,
            db=db,
            conversation_id=conversation_id,
            file_ids=payload.file_ids,
            mode=effective_mode,
            settings=settings,
        )
    else:
        stream_session = await stream_chat(
            messages=openai_messages,
            settings=settings,
        )
        response_generator = _streaming_generator(
            stream_session=stream_session,
            db=db,
            conversation_id=conversation_id,
            file_ids=payload.file_ids,
            mode=effective_mode,
            settings=settings,
        )

    return StreamingResponse(response_generator, media_type=STREAM_MEDIA_TYPE)


def _determine_mode(requested_mode: str, files_meta) -> str:
    if requested_mode == "deep_research":
        return "deep_research"
    has_images = any(
        f.mime_type and f.mime_type.startswith("image/") for f in files_meta
    )
    has_docs = any(
        f.mime_type in DOC_MIME_TYPES for f in files_meta
    )
    if requested_mode == "vision":
        return "vision" if has_images else "chat"
    if requested_mode == "files":
        return "files" if has_docs else "chat"
    if has_images:
        return "vision"
    if has_docs:
        return "files"
    return "chat"


def _extract_file_urls(files_meta, settings: Settings) -> list[str]:
    urls: list[str] = []
    for file_meta in files_meta:
        if file_meta.mime_type and file_meta.mime_type.startswith("image/"):
            url = files_service.file_to_public_url(file_meta, settings)
            if url:
                urls.append(url)
    return urls


def _build_metadata(
    result: OpenAIChatResult,
    mode: str,
    file_ids: Sequence[UUID] | None,
    settings: Settings,
) -> dict:
    return {
        "type": mode,
        "model": result.model_name,
        "input_files": [str(fid) for fid in file_ids or []],
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
        "total_tokens": result.total_tokens,
        "max_output_tokens": settings.max_output_tokens,
    }


async def _persist_assistant_message(
    *,
    db: AsyncSession,
    conversation_id: UUID,
    result: OpenAIChatResult,
    mode: str,
    file_ids: Sequence[UUID] | None,
    settings: Settings,
):
    metadata = _build_metadata(result, mode, file_ids, settings)
    assistant_message = await messages_service.insert_assistant_message(
        db=db,
        conversation_id=conversation_id,
        content=result.content,
        model=result.model_name,
        metadata=metadata,
        file_ids=file_ids,
    )
    await conversations.touch_conversation_updated_at(db, conversation_id)
    return assistant_message


def _json_line(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


async def _non_streaming_generator(
    *,
    result: OpenAIChatResult,
    db: AsyncSession,
    conversation_id: UUID,
    file_ids: Sequence[UUID] | None,
    mode: str,
    settings: Settings,
) -> AsyncIterator[str]:
    """Yield a single chunk followed by the done event."""
    yield _json_line({"event": "token", "delta": result.content})
    assistant_message = await _persist_assistant_message(
        db=db,
        conversation_id=conversation_id,
        result=result,
        mode=mode,
        file_ids=file_ids,
        settings=settings,
    )
    yield _json_line(
        {
            "event": "done",
            "conversation_id": str(conversation_id),
            "message_id": str(assistant_message.id),
        }
    )


async def _streaming_generator(
    *,
    stream_session: StreamingChatSession,
    db: AsyncSession,
    conversation_id: UUID,
    file_ids: Sequence[UUID] | None,
    mode: str,
    settings: Settings,
) -> AsyncIterator[str]:
    async for chunk in stream_session:
        yield _json_line({"event": "token", "delta": chunk})

    result = stream_session.final_result()
    assistant_message = await _persist_assistant_message(
        db=db,
        conversation_id=conversation_id,
        result=result,
        mode=mode,
        file_ids=file_ids,
        settings=settings,
    )
    yield _json_line(
        {
            "event": "done",
            "conversation_id": str(conversation_id),
            "message_id": str(assistant_message.id),
        }
    )

