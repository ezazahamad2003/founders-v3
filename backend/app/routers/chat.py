from __future__ import annotations

import json
import logging
import traceback
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
    deep_research,
    stream_chat,
    stream_chat_with_files,
    stream_chat_with_vision,
)
from app.prompts import get_system_prompt
from app.services import conversations, files as files_service, messages as messages_service

logger = logging.getLogger(__name__)

STREAM_MEDIA_TYPE = "text/event-stream"
DOC_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc (legacy Word format)
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
    """
    Main chat endpoint with streaming responses.
    
    Cloud Run Compatible: This endpoint uses Server-Sent Events (SSE) for streaming.
    All external calls (OpenAI, Supabase) have timeouts to prevent blocking.
    The async generator pattern ensures the event loop is not blocked.
    """
    ensure_tos_accepted(current_user)

    # Allow files even without a conversation - they'll be associated when conversation is created

    conversation_row = await conversations.get_or_create_conversation_for_message(
        db=db,
        current_user=current_user,
        maybe_conversation_id=payload.conversation_id,
        initial_message=payload.message,
    )
    conversation_id: UUID = conversation_row["id"]

    # Fetch message history first to collect all file_ids from previous messages
    history = await messages_service.fetch_recent_messages(
        db=db,
        conversation_id=conversation_id,
        limit=settings.max_history_messages,
    )

    # === DEBUG LOGGING: File context tracing ===
    logger.debug(f"[FILE_CONTEXT] === New chat request for conversation {conversation_id} ===")
    logger.debug(f"[FILE_CONTEXT] payload.file_ids from request: {payload.file_ids}")
    logger.debug(f"[FILE_CONTEXT] payload.mode: {payload.mode}, payload.prompt_mode: {payload.prompt_mode}")
    logger.debug(f"[FILE_CONTEXT] History messages count: {len(history)}")

    # Collect file_ids from current request AND from message history
    # This ensures files uploaded in previous messages remain in context
    all_file_ids = set(payload.file_ids or [])
    logger.debug(f"[FILE_CONTEXT] Initial all_file_ids from request: {all_file_ids}")
    
    for msg in history:
        logger.debug(f"[FILE_CONTEXT] Checking history msg role={msg.role}, has_metadata={msg.metadata is not None}")
        if msg.metadata:
            logger.debug(f"[FILE_CONTEXT]   metadata keys: {list(msg.metadata.keys())}")
        if msg.metadata and "input_files" in msg.metadata:
            logger.debug(f"[FILE_CONTEXT]   Found input_files in metadata: {msg.metadata['input_files']}")
            # Extract file_ids from message metadata
            for file_id_str in msg.metadata["input_files"]:
                try:
                    all_file_ids.add(UUID(file_id_str))
                    logger.debug(f"[FILE_CONTEXT]   Added file_id from history: {file_id_str}")
                except (ValueError, TypeError):
                    logger.warning(f"Invalid file_id in message metadata: {file_id_str}")
                    continue

    logger.debug(f"[FILE_CONTEXT] Final all_file_ids (request + history): {all_file_ids}")

    validated_files = await files_service.validate_files_belong_to_conversation(
        db=db,
        file_ids=list(all_file_ids),
        conversation_id=conversation_id,
        user_id=current_user.id,
    )
    
    logger.debug(f"[FILE_CONTEXT] Validated files count: {len(validated_files)}")
    for vf in validated_files:
        logger.debug(f"[FILE_CONTEXT]   - {vf.original_name} (mime={vf.mime_type}, id={vf.id})")

    await messages_service.insert_user_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=payload.message,
        file_ids=list(all_file_ids),  # Include files from history + current request
    )
    await conversations.touch_conversation_updated_at(db, conversation_id)

    # Use the appropriate system prompt based on request's prompt_mode
    # Frontend manages which mode is active and sends it with each request
    prompt_mode_to_use = payload.prompt_mode or "general"
    logger.info(f"Using prompt_mode: {prompt_mode_to_use} for conversation {conversation_id}")
    base_system_prompt = get_system_prompt(prompt_mode=prompt_mode_to_use)

    # Build OpenAI messages: system prompt + history + NEW user message
    openai_messages = [{"role": "system", "content": base_system_prompt}] + [
        {"role": msg.role, "content": msg.content} for msg in history
    ] + [{"role": "user", "content": payload.message}]  # <-- Include the new user message!

    effective_mode = _determine_mode(payload.mode, validated_files)
    file_urls = await _extract_file_urls(validated_files, settings)
    doc_files = [f for f in validated_files if f.mime_type in DOC_MIME_TYPES]

    # === DEBUG LOGGING: Mode determination ===
    logger.debug(f"[FILE_CONTEXT] effective_mode determined: {effective_mode}")
    logger.debug(f"[FILE_CONTEXT] doc_files count (files with DOC_MIME_TYPES): {len(doc_files)}")
    for df in doc_files:
        logger.debug(f"[FILE_CONTEXT]   doc_file: {df.original_name} (mime={df.mime_type})")
    logger.debug(f"[FILE_CONTEXT] file_urls (images) count: {len(file_urls)}")

    response_generator: AsyncIterator[str]

    if effective_mode == "deep_research":
        logger.debug(f"[FILE_CONTEXT] >>> Taking DEEP_RESEARCH path")
        # deep_research adds the query separately, so pass only history (without the new user message)
        oa_result = await deep_research(
            query=payload.message,
            conversation_context=openai_messages[:-1],  # Exclude the new user message we just added
            settings=settings,
        )
        response_generator = _non_streaming_generator(
            result=oa_result,
            db=db,
            conversation_id=conversation_id,
            file_ids=list(all_file_ids),  # Include files from history + current request
            mode=effective_mode,
            settings=settings,
        )
    elif effective_mode == "vision":
        logger.debug(f"[FILE_CONTEXT] >>> Taking VISION path with {len(file_urls)} image URLs - STREAMING")
        try:
            stream_session = await stream_chat_with_vision(
                messages=openai_messages,
                image_urls=file_urls or [],
                settings=settings,
            )
            response_generator = _streaming_generator(
                stream_session=stream_session,
                db=db,
                conversation_id=conversation_id,
                file_ids=list(all_file_ids),  # Include files from history + current request
                mode=effective_mode,
                settings=settings,
            )
        except Exception as e:
            logger.exception("Failed to create streaming vision session")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start chat. Please try again."
            )
    elif effective_mode == "files":
        logger.debug(f"[FILE_CONTEXT] >>> Taking FILES path with {len(doc_files)} documents - STREAMING")
        for df in doc_files:
            logger.debug(f"[FILE_CONTEXT]     Passing to stream_chat_with_files: {df.original_name} (openai_file_id={df.openai_file_id})")
        try:
            stream_session = await stream_chat_with_files(
                messages=openai_messages,
                files_meta=doc_files,
                settings=settings,
            )
            response_generator = _streaming_generator(
                stream_session=stream_session,
                db=db,
                conversation_id=conversation_id,
                file_ids=list(all_file_ids),  # Include files from history + current request
                mode=effective_mode,
                settings=settings,
            )
        except Exception as e:
            logger.exception("Failed to create streaming files session")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start chat. Please try again."
            )
    else:
        logger.debug(f"[FILE_CONTEXT] >>> Taking STREAMING CHAT path (no files/vision)")
        try:
            stream_session = await stream_chat(
                messages=openai_messages,
                settings=settings,
            )
            response_generator = _streaming_generator(
                stream_session=stream_session,
                db=db,
                conversation_id=conversation_id,
                file_ids=list(all_file_ids),  # Include files from history + current request
                mode=effective_mode,
                settings=settings,
            )
        except Exception as e:
            logger.exception("Failed to create streaming session")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start chat. Please try again."
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


async def _extract_file_urls(files_meta, settings: Settings) -> list[str]:
    """Extract signed URLs for image files."""
    urls: list[str] = []
    for file_meta in files_meta:
        if file_meta.mime_type and file_meta.mime_type.startswith("image/"):
            # Generate signed URL with 1 hour expiry
            url = await files_service.file_to_signed_url(file_meta, settings, expiry_seconds=3600)
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
    try:
        async for chunk in stream_session:
            # chunk is a string from StreamingChatSession
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
    except Exception as e:
        logger.error("Error in streaming generator: %s", e)
        traceback.print_exc()
        yield _json_line({"event": "error", "message": str(e)})

