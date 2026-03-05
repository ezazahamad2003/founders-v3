"""Async wrapper around the Anthropic Claude API."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import List, Optional

from anthropic import AsyncAnthropic

from app.config import Settings

logger = logging.getLogger(__name__)

_claude_client: AsyncAnthropic | None = None


def _get_claude_client(settings: Settings) -> AsyncAnthropic:
    global _claude_client
    if _claude_client is None:
        _claude_client = AsyncAnthropic(api_key=settings.claude_api_key.strip())
    return _claude_client


async def stream_claude_message(
    messages: List[dict],
    system: str,
    settings: Settings,
    max_tokens: int = 2048,
    temperature: float = 0.7,
) -> AsyncIterator[str]:
    """Async generator that yields text tokens from Claude."""
    client = _get_claude_client(settings)
    async with client.messages.stream(
        model=settings.claude_model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        temperature=temperature,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def call_claude_non_stream(
    messages: List[dict],
    system: str,
    settings: Settings,
    max_tokens: int = 512,
    temperature: float = 0.0,
) -> str:
    """Single non-streaming call to Claude. Returns full response text."""
    client = _get_claude_client(settings)
    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        temperature=temperature,
    )
    if response.content:
        return response.content[0].text
    return ""
