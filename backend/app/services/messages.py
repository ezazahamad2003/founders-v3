"""Message-related helpers."""

from __future__ import annotations

from typing import List, Optional, Sequence
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Message


async def insert_user_message(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
    content: str,
    file_ids: Optional[Sequence[UUID]] = None,
) -> Message:
    """Insert a user-authored message."""
    metadata = None
    if file_ids:
        metadata = {"input_files": [str(fid) for fid in file_ids]}

    result = await db.execute(
        text(
            """
            insert into messages (conversation_id, user_id, role, content, metadata)
            values (:conversation_id, :user_id, 'user', :content, :metadata)
            returning id, conversation_id, user_id, role, content, model, metadata, created_at
            """
        ).bindparams(bindparam("metadata", type_=JSONB)),
        {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "content": content,
            "metadata": metadata,
        },
    )
    row = result.mappings().one()
    await _link_files(db, row["id"], file_ids)
    await db.commit()
    return Message(**row)


async def insert_assistant_message(
    db: AsyncSession,
    conversation_id: UUID,
    content: str,
    model: str,
    metadata: dict,
    file_ids: Optional[Sequence[UUID]] = None,
) -> Message:
    """Insert an assistant-authored message."""
    result = await db.execute(
        text(
            """
            insert into messages (conversation_id, user_id, role, content, model, metadata)
            values (:conversation_id, NULL, 'assistant', :content, :model, :metadata)
            returning id, conversation_id, user_id, role, content, model, metadata, created_at
            """
        ).bindparams(bindparam("metadata", type_=JSONB)),
        {
            "conversation_id": conversation_id,
            "content": content,
            "model": model,
            "metadata": metadata,
        },
    )
    row = result.mappings().one()
    await _link_files(db, row["id"], file_ids)
    await db.commit()
    return Message(**row)


async def fetch_recent_messages(
    db: AsyncSession,
    conversation_id: UUID,
    limit: int,
) -> List[Message]:
    """Fetch messages ordered oldest to newest, capped by limit."""
    result = await db.execute(
        text(
            """
            select id, conversation_id, user_id, role, content, model, metadata, created_at
            from (
                select *
                from messages
                where conversation_id = :conversation_id
                order by created_at desc
                limit :limit
            ) sub
            order by created_at asc
            """
        ),
        {"conversation_id": conversation_id, "limit": limit},
    )
    rows = result.mappings().all()
    return [Message(**row) for row in rows]


async def _link_files(
    db: AsyncSession,
    message_id: UUID,
    file_ids: Optional[Sequence[UUID]],
) -> None:
    if not file_ids:
        return
    unique_ids = list(set(file_ids))
    values_clause = ", ".join(
        f"(:msg_id, :fid_{i})" for i in range(len(unique_ids))
    )
    params: dict = {"msg_id": message_id}
    params.update({f"fid_{i}": fid for i, fid in enumerate(unique_ids)})
    await db.execute(
        text(
            f"INSERT INTO message_files (message_id, file_id) "
            f"VALUES {values_clause} ON CONFLICT DO NOTHING"
        ),
        params,
    )

