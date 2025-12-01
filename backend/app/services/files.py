"""File registration and validation helpers."""

from __future__ import annotations

from typing import List, Optional, Sequence
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, assert_conversation_access
from app.config import Settings
from app.models import FileMeta, RegisterFilesRequest


async def register_files(
    db: AsyncSession,
    current_user: CurrentUser,
    req: RegisterFilesRequest,
) -> List[FileMeta]:
    """Register uploaded files for a conversation (or as temp files if conversation_id is None)."""
    if req.conversation_id:
        await assert_conversation_access(db, current_user, req.conversation_id)

    created_files: List[FileMeta] = []
    for file_input in req.files:
        result = await db.execute(
            text(
                """
                insert into files (user_id, conversation_id, supabase_path, mime_type, original_name)
                values (:user_id, :conversation_id, :supabase_path, :mime_type, :original_name)
                returning id, conversation_id, supabase_path, mime_type, original_name, created_at
                """
            ),
            {
                "user_id": current_user.id,
                "conversation_id": req.conversation_id,
                "supabase_path": file_input.supabase_path,
                "mime_type": file_input.mime_type,
                "original_name": file_input.original_name,
            },
        )
        row = result.mappings().one()
        created_files.append(
            FileMeta(
                id=row["id"],
                conversation_id=row["conversation_id"],
                supabase_path=row["supabase_path"],
                mime_type=row["mime_type"],
                original_name=row["original_name"],
                created_at=row["created_at"],
            )
        )
    await db.commit()
    return created_files


async def validate_files_belong_to_conversation(
    db: AsyncSession,
    file_ids: Sequence[UUID],
    conversation_id: UUID,
    user_id: UUID,
) -> List[FileMeta]:
    """Ensure the referenced files belong to the given conversation & user.
    
    If files don't have a conversation_id yet (temp files), associate them with this conversation.
    """
    if not file_ids:
        return []

    result = await db.execute(
        text(
            """
            select id, conversation_id, supabase_path, mime_type, original_name, created_at
            from files
            where id = any(:file_ids) and user_id = :user_id
            """
        ),
        {"file_ids": list(file_ids), "user_id": user_id},
    )
    rows = result.mappings().all()
    if len(rows) != len(set(file_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FILES_NOT_IN_CONVERSATION",
        )

    files: List[FileMeta] = []
    files_to_update: List[UUID] = []
    
    for row in rows:
        # If file doesn't have a conversation yet, mark it for update
        if row["conversation_id"] is None:
            files_to_update.append(row["id"])
        elif row["conversation_id"] != conversation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FILES_NOT_IN_CONVERSATION",
            )
        
        files.append(
            FileMeta(
                id=row["id"],
                conversation_id=conversation_id,  # Use the target conversation_id
                supabase_path=row["supabase_path"],
                mime_type=row["mime_type"],
                original_name=row["original_name"],
                created_at=row["created_at"],
            )
        )
    
    # Update temp files to belong to this conversation
    if files_to_update:
        await db.execute(
            text(
                """
                update files
                set conversation_id = :conversation_id
                where id = any(:file_ids)
                """
            ),
            {"conversation_id": conversation_id, "file_ids": files_to_update},
        )
        await db.commit()
    
    return files


def file_to_public_url(file: FileMeta, settings: Settings) -> Optional[str]:
    """Build a public URL for the stored file if configuration allows."""
    if not settings.supabase_storage_public_base_url:
        return None
    base = settings.supabase_storage_public_base_url.rstrip("/")
    bucket = settings.supabase_storage_bucket_name.strip("/")
    path = file.supabase_path.lstrip("/")
    return f"{base}/{bucket}/{path}"


async def delete_files_from_storage(
    file_paths: Sequence[str],
    settings: Settings,
) -> None:
    """Remove files from Supabase Storage via REST API."""
    if not file_paths:
        return
    if not settings.supabase_project_url or not settings.supabase_anon_key:
        return

    url = f"{settings.supabase_project_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket_name}"
    payload = {"paths": file_paths}

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{url}/remove",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {settings.supabase_anon_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if response.status_code >= 400:
            # don't fail the entire delete if storage removal fails, but log for visibility
            print("Failed to delete storage objects:", response.text)

