"""Conversation-related database helpers."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, assert_conversation_access
from app.config import get_settings
from app.models import (
    ConversationDetail,
    ConversationDetailResponse,
    ConversationSummary,
    FileMeta,
    Message,
)
from app.services.files import delete_files_from_storage

DEFAULT_TITLE = "New conversation"


def _generate_title(initial_message: str) -> str:
    title = (initial_message or "").strip()
    if not title:
        title = DEFAULT_TITLE
    return title[:60]


async def get_or_create_conversation_for_message(
    db: AsyncSession,
    current_user: CurrentUser,
    maybe_conversation_id: Optional[UUID],
    initial_message: str,
) -> dict:
    """Return an existing conversation or create a new one."""
    if maybe_conversation_id is None:
        result = await db.execute(
            text(
                """
                insert into conversations (user_id, title)
                values (:user_id, :title)
                returning id, user_id, assigned_lawyer_id, title, created_at, updated_at
                """
            ),
            {"user_id": current_user.id, "title": _generate_title(initial_message)},
        )
        convo = result.mappings().one()
        await db.commit()
        return dict(convo)

    conversation = await assert_conversation_access(db, current_user, maybe_conversation_id)
    return dict(conversation)


async def list_conversations_for_user(
    db: AsyncSession,
    current_user: CurrentUser,
) -> List[ConversationSummary]:
    """Return summaries of the user's conversations."""
    result = await db.execute(
        text(
            """
            select id, title, created_at, updated_at, assigned_lawyer_id
            from conversations
            where user_id = :user_id
            order by updated_at desc
            """
        ),
        {"user_id": current_user.id},
    )
    rows = result.mappings().all()
    return [ConversationSummary(**row) for row in rows]


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: UUID,
    current_user: CurrentUser,
) -> ConversationDetailResponse:
    """Return conversation details with messages and files."""
    conversation_row = await assert_conversation_access(db, current_user, conversation_id)
    conversation = ConversationDetail(**conversation_row)

    messages_result = await db.execute(
        text(
            """
            select id, conversation_id, user_id, role, content, model, metadata, created_at
            from messages
            where conversation_id = :conversation_id
            order by created_at asc
            """
        ),
        {"conversation_id": conversation_id},
    )
    messages = [Message(**row) for row in messages_result.mappings().all()]

    files_result = await db.execute(
        text(
            """
            select id, conversation_id, user_id, supabase_path, mime_type, original_name, created_at
            from files
            where conversation_id = :conversation_id
            order by created_at asc
            """
        ),
        {"conversation_id": conversation_id},
    )
    files = [
        FileMeta(
            id=row["id"],
            conversation_id=row["conversation_id"],
            supabase_path=row["supabase_path"],
            mime_type=row["mime_type"],
            original_name=row["original_name"],
            created_at=row["created_at"],
        )
        for row in files_result.mappings().all()
    ]

    return ConversationDetailResponse(
        conversation=conversation,
        messages=messages,
        files=files,
    )


async def touch_conversation_updated_at(
    db: AsyncSession,
    conversation_id: UUID,
) -> None:
    """Update the conversation's updated_at timestamp."""
    await db.execute(
        text(
            """
            update conversations
            set updated_at = now()
            where id = :conversation_id
            """
        ),
        {"conversation_id": conversation_id},
    )
    await db.commit()


async def delete_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    current_user: CurrentUser,
) -> None:
    """Delete a conversation owned by the current user."""
    await assert_conversation_access(db, current_user, conversation_id)
    # fetch storage paths before deleting
    file_rows = await db.execute(
        text("select supabase_path from files where conversation_id = :conversation_id"),
        {"conversation_id": conversation_id},
    )
    storage_paths = [row["supabase_path"] for row in file_rows.mappings().all()]

    await db.execute(
        text(
            """
            delete from conversations
            where id = :conversation_id
            """
        ),
        {"conversation_id": conversation_id},
    )
    await db.commit()

    settings = get_settings()
    await delete_files_from_storage(storage_paths, settings)

