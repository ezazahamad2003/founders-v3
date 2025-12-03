"""Wrapper around the OpenAI client."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI, BadRequestError
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.models import FileMeta
from app.prompts import get_system_prompt
from app.services.document_text import build_documents_contexts

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client(settings: Settings) -> AsyncOpenAI:
    """Instantiate (or reuse) the AsyncOpenAI client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key_clean,
            base_url=settings.openai_base_url or None,
        )
    return _client


class OpenAIChatResult(BaseModel):
    content: str
    model_name: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


async def chat_with_vision(
    messages: Sequence[Dict[str, Any]],
    image_urls: Sequence[str],
    *,
    settings: Settings | None = None,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """Invoke a vision-capable model."""
    settings = settings or get_settings()
    augmented_messages = list(messages)
    if image_urls:
        augmented_messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Consider the attached images in your response."},
                    *[
                        {"type": "image_url", "image_url": {"url": url}}
                        for url in image_urls
                    ],
                ],
            }
        )

    client = _get_client(settings)
    response: ChatCompletion = await client.chat.completions.create(
        model=settings.openai_model_vision,
        messages=augmented_messages,
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
    )
    return _completion_to_result(response, fallback_model=settings.openai_model_vision)


async def chat_with_files(
    messages: Sequence[Dict[str, Any]],
    files_meta: Sequence[FileMeta],
    *,
    settings: Settings | None = None,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """
    Invoke a model with uploaded documents.

    Behavior:
    - If all files are PDFs and have openai_file_id → use OpenAI Files API directly.
    - Otherwise → fall back to text extraction from Supabase.
    """
    settings = settings or get_settings()

    # Decide if we can safely use the Files API
    all_have_ids = all(f.openai_file_id for f in files_meta)
    all_are_pdfs = all(
        (
            f.mime_type and f.mime_type.startswith("application/pdf")
        ) or (
            f.original_name and f.original_name.lower().endswith(".pdf")
        )
        for f in files_meta
    )

    # Preferred path: Files API for PDFs only
    if files_meta and all_have_ids and all_are_pdfs:
        try:
            return await _chat_with_openai_files(
                messages=messages,
                files_meta=files_meta,
                settings=settings,
                max_output_tokens=max_output_tokens,
            )
        except BadRequestError as e:
            logger.warning(
                "OpenAI Files API failed for PDFs, falling back to text extraction: %s",
                e,
            )
            # fall through to legacy path

    # Legacy / fallback path: text extraction from Supabase
    augmented_messages = list(messages)

    doc_contexts = await build_documents_contexts(files_meta, settings)
    if doc_contexts:
        augmented_messages.append(
            {
                "role": "system",
                "content": (
                    "User provided these document excerpts. "
                    "Ground your response in them when relevant:\n\n"
                    + "\n\n".join(doc_contexts)
                ),
            }
        )

    client = _get_client(settings)
    response: ChatCompletion = await client.chat.completions.create(
        model=settings.openai_model_chat,
        messages=augmented_messages,
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
    )
    return _completion_to_result(
        response,
        fallback_model=settings.openai_model_chat,
    )


async def _chat_with_openai_files(
    messages: Sequence[Dict[str, Any]],
    files_meta: Sequence[FileMeta],
    *,
    settings: Settings,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """
    Use OpenAI Files API directly with file_id references.
    This allows the model to see the full PDF with images/formatting.
    """
    client = _get_client(settings)
    
    # Build messages with file references
    augmented_messages = list(messages)
    
    # Add file context to the last user message
    if augmented_messages and augmented_messages[-1]["role"] == "user":
        last_message = augmented_messages[-1]
        
        # Convert to content array format if it's a simple string
        if isinstance(last_message["content"], str):
            text_content = last_message["content"]
            content_array = [{"type": "text", "text": text_content}]
        else:
            content_array = list(last_message["content"])
        
        # Add file references
        for file_meta in files_meta:
            if file_meta.openai_file_id:
                logger.info(f"Adding OpenAI file to chat: {file_meta.openai_file_id} ({file_meta.original_name})")
                content_array.append({
                    "type": "file",
                    "file": {"file_id": file_meta.openai_file_id}
                })
        
        augmented_messages[-1] = {
            "role": "user",
            "content": content_array
        }
    
    # Use a vision-capable model for file processing
    try:
        response: ChatCompletion = await client.chat.completions.create(
            model=settings.openai_model_vision,  # gpt-4o-mini supports files
            messages=augmented_messages,
            max_completion_tokens=max_output_tokens or settings.max_output_tokens,
            temperature=0.2,
        )
    except Exception as e:
        logger.error(f"OpenAI Files API error: {e}")
        logger.error(f"Files attempted: {[f.openai_file_id for f in files_meta if f.openai_file_id]}")
        raise
    return _completion_to_result(response, fallback_model=settings.openai_model_vision)


async def deep_research(
    query: str,
    conversation_context: Sequence[Dict[str, Any]],
    *,
    settings: Settings | None = None,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """Perform a deep-research style response using the adaptive Scopic Legal prompt."""
    settings = settings or get_settings()
    
    # Use the adaptive system prompt with deep research context
    system_prompt = get_system_prompt(mode="default")
    deep_research_addendum = (
        "\n\nFor this deep research query, provide grounded, well-structured analysis "
        "referencing the user's context. Use detailed explanations as appropriate."
    )
    
    messages = [
        {
            "role": "system",
            "content": system_prompt + deep_research_addendum,
        },
        *conversation_context,
        {"role": "user", "content": query},
    ]
    client = _get_client(settings)
    response: ChatCompletion = await client.chat.completions.create(
        model=settings.openai_model_deep_research,
        messages=messages,
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
    )
    return _completion_to_result(
        response,
        fallback_model=settings.openai_model_deep_research,
    )


class StreamingChatSession:
    """Async iterator that yields streaming chunks and exposes the final result."""

    def __init__(self, stream: AsyncIterator[ChatCompletionChunk], accumulator: "_StreamAccumulator"):
        self._stream = stream
        self._accumulator = accumulator

    def __aiter__(self):
        return self._iterate()

    async def _iterate(self):
        async for chunk in self._stream:
            text = _chunk_text(chunk)
            if text:
                self._accumulator.add_text(text)
                yield text
            self._accumulator.capture_usage(chunk)
        self._accumulator.finish()

    def final_result(self) -> OpenAIChatResult:
        """Return the full response after streaming completes."""
        return self._accumulator.to_result()


async def stream_chat(
    messages: Sequence[Dict[str, Any]],
    *,
    settings: Settings | None = None,
    model_name: Optional[str] = None,
    max_output_tokens: Optional[int] = None,
) -> StreamingChatSession:
    """Stream tokens from OpenAI."""
    settings = settings or get_settings()
    client = _get_client(settings)
    model = model_name or settings.openai_model_chat
    
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=list(messages),
            max_completion_tokens=max_output_tokens or settings.max_output_tokens,
            temperature=0.2,
            stream=True,
        )
    except Exception as e:
        logger.exception("OpenAI streaming call failed")
        raise
    
    accumulator = _StreamAccumulator(model_name=model)
    return StreamingChatSession(stream=stream, accumulator=accumulator)


def _completion_to_result(
    completion: ChatCompletion,
    *,
    fallback_model: str,
) -> OpenAIChatResult:
    message_content = ""
    if completion.choices:
        message_content = completion.choices[0].message.content or ""
    usage = completion.usage
    actual_model = completion.model or fallback_model
    logger.info(f"OpenAI returned model: {actual_model} (requested: {fallback_model})")
    return OpenAIChatResult(
        content=message_content,
        model_name=actual_model,
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
        total_tokens=usage.total_tokens if usage else 0,
    )


def _chunk_text(chunk: ChatCompletionChunk) -> str:
    if not chunk.choices:
        return ""
    delta = chunk.choices[0].delta
    if delta.content:
        return delta.content
    return ""


@dataclass
class _StreamAccumulator:
    model_name: str
    chunks: List[str] = field(default_factory=list)
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    finished: bool = False

    def add_text(self, text: str) -> None:
        self.chunks.append(text)

    def capture_usage(self, chunk: ChatCompletionChunk) -> None:
        if chunk.usage:
            self.prompt_tokens = chunk.usage.prompt_tokens or self.prompt_tokens
            self.completion_tokens = chunk.usage.completion_tokens or self.completion_tokens
            self.total_tokens = chunk.usage.total_tokens or self.total_tokens
        if chunk.model:
            self.model_name = chunk.model

    def finish(self) -> None:
        self.finished = True

    def to_result(self) -> OpenAIChatResult:
        if not self.finished:
            raise RuntimeError("Streaming has not completed yet.")
        return OpenAIChatResult(
            content="".join(self.chunks),
            model_name=self.model_name,
            prompt_tokens=self.prompt_tokens,
            completion_tokens=self.completion_tokens,
            total_tokens=self.total_tokens or (self.prompt_tokens + self.completion_tokens),
        )

