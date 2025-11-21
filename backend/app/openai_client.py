"""Wrapper around the OpenAI client."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.models import FileMeta

_client: AsyncOpenAI | None = None


def _get_client(settings: Settings) -> AsyncOpenAI:
    """Instantiate (or reuse) the AsyncOpenAI client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        )
    return _client


class OpenAIChatResult(BaseModel):
    content: str
    model_name: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


async def chat(
    messages: Sequence[Dict[str, Any]],
    *,
    settings: Settings | None = None,
    model_name: Optional[str] = None,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """Standard chat completion."""
    settings = settings or get_settings()
    client = _get_client(settings)
    response: ChatCompletion = await client.chat.completions.create(
        model=model_name or settings.openai_model_chat,
        messages=list(messages),
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
    )
    return _completion_to_result(response, fallback_model=model_name or settings.openai_model_chat)


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
    """Invoke a model with additional context about uploaded documents."""
    settings = settings or get_settings()
    file_notes = []
    for file_meta in files_meta:
        file_notes.append(
            f"- File `{file_meta.original_name or file_meta.id}` stored at `{file_meta.supabase_path}` "
            "should be used as supporting context."
        )
    augmented_messages = list(messages)
    if file_notes:
        augmented_messages.append(
            {
                "role": "system",
                "content": "User provided the following documents:\n" + "\n".join(file_notes),
            }
        )

    client = _get_client(settings)
    response: ChatCompletion = await client.chat.completions.create(
        model=settings.openai_model_chat,
        messages=augmented_messages,
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
    )
    return _completion_to_result(response, fallback_model=settings.openai_model_chat)


async def deep_research(
    query: str,
    conversation_context: Sequence[Dict[str, Any]],
    *,
    settings: Settings | None = None,
    max_output_tokens: Optional[int] = None,
) -> OpenAIChatResult:
    """Perform a deep-research style response."""
    settings = settings or get_settings()
    messages = [
        {
            "role": "system",
            "content": (
                "You are Scopic Legal, a meticulous legal research assistant. "
                "Provide grounded, well-structured analysis referencing the user's context."
            ),
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
    stream = await client.chat.completions.create(
        model=model,
        messages=list(messages),
        max_completion_tokens=max_output_tokens or settings.max_output_tokens,
        temperature=0.2,
        stream=True,
    )
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
    return OpenAIChatResult(
        content=message_content,
        model_name=completion.model or fallback_model,
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

