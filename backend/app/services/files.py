"""File registration and validation helpers."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import List, Optional, Sequence
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, UploadFile, status
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, assert_conversation_access
from app.config import Settings
from app.models import FileMeta, RegisterFilesRequest

logger = logging.getLogger(__name__)


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
        # Try with openai_file_id first (new schema)
        try:
            result = await db.execute(
                text(
                    """
                    insert into files (user_id, conversation_id, supabase_path, openai_file_id, mime_type, original_name)
                    values (:user_id, :conversation_id, :supabase_path, :openai_file_id, :mime_type, :original_name)
                    returning id, conversation_id, supabase_path, openai_file_id, mime_type, original_name, created_at
                    """
                ),
                {
                    "user_id": current_user.id,
                    "conversation_id": req.conversation_id,
                    "supabase_path": file_input.supabase_path,
                    "openai_file_id": file_input.openai_file_id,
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
                    openai_file_id=row.get("openai_file_id"),
                    mime_type=row["mime_type"],
                    original_name=row["original_name"],
                    created_at=row["created_at"],
                )
            )
        except Exception as e:
            # If column doesn't exist, fall back to old schema
            if "openai_file_id" in str(e).lower() or "column" in str(e).lower():
                logger.warning("openai_file_id column not found, using legacy schema")
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
                        openai_file_id=None,
                        mime_type=row["mime_type"],
                        original_name=row["original_name"],
                        created_at=row["created_at"],
                    )
                )
            else:
                raise
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

    # Try with openai_file_id first (new schema), fall back to old schema if needed
    try:
        result = await db.execute(
            text(
                """
                select id, conversation_id, supabase_path, openai_file_id, mime_type, original_name, created_at
                from files
                where id = any(:file_ids) and user_id = :user_id
                """
            ),
            {"file_ids": list(file_ids), "user_id": user_id},
        )
        rows = result.mappings().all()
    except Exception as e:
        if "openai_file_id" in str(e).lower() or "column" in str(e).lower():
            logger.warning("openai_file_id column not found in validate_files, using legacy schema")
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
        else:
            raise
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
                openai_file_id=row.get("openai_file_id"),  # May be None in legacy schema
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


async def file_to_signed_url(file: FileMeta, settings: Settings, expiry_seconds: int = 3600) -> Optional[str]:
    """
    Generate a signed URL for secure file access using Supabase Storage API.
    Works for images, PDFs, and DOCX files.
    
    Args:
        file: File metadata
        settings: Application settings
        expiry_seconds: URL expiry time in seconds (default: 1 hour)
    
    Returns:
        Signed URL that expires after the specified time
    """
    if not settings.supabase_project_url:
        return None
    
    # Use service role key for signing (bypasses RLS)
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not auth_key:
        return None
    
    base = settings.supabase_project_url.rstrip("/")
    bucket = settings.supabase_storage_bucket_name
    path = file.supabase_path.lstrip("/")
    
    # Call Supabase Storage API to create a signed URL
    url = f"{base}/storage/v1/object/sign/{bucket}/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                headers={
                    "apikey": auth_key,
                    "Authorization": f"Bearer {auth_key}",
                    "Content-Type": "application/json",
                },
                json={"expiresIn": expiry_seconds},
            )
            
            if response.status_code == 200:
                data = response.json()
                signed_path = data.get("signedURL")
                if signed_path:
                    # Return the full signed URL
                    return f"{base}/storage/v1{signed_path}"
            
            logger.error(f"Failed to generate signed URL: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        return None


async def delete_file(
    db: AsyncSession,
    file_id: UUID,
    user_id: UUID,
    settings: Settings,
) -> None:
    """
    Delete a file owned by the user.
    Removes from database, Supabase Storage, and OpenAI Files API.
    """
    # Fetch the file and verify ownership
    result = await db.execute(
        text(
            """
            select id, user_id, supabase_path, openai_file_id
            from files
            where id = :file_id
            """
        ),
        {"file_id": file_id},
    )
    row = result.mappings().one_or_none()
    
    if not row:
        raise ValueError(f"File {file_id} not found")
    
    if row["user_id"] != user_id:
        raise ValueError(f"File {file_id} does not belong to user {user_id}")
    
    supabase_path = row["supabase_path"]
    openai_file_id = row["openai_file_id"]
    
    # Delete from database first
    await db.execute(
        text("delete from files where id = :file_id"),
        {"file_id": file_id},
    )
    await db.commit()
    
    # Delete from Supabase Storage
    if supabase_path:
        await delete_files_from_storage([supabase_path], settings)
    
    # Delete from OpenAI Files API if applicable
    if openai_file_id:
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key_clean)
            await client.files.delete(openai_file_id)
            logger.info(f"Deleted OpenAI file: {openai_file_id}")
        except Exception as e:
            logger.warning(f"Failed to delete OpenAI file {openai_file_id}: {e}")


async def delete_files_from_storage(
    file_paths: Sequence[str],
    settings: Settings,
) -> None:
    """Remove files from Supabase Storage via REST API."""
    if not file_paths:
        return
    
    # Use service role key for backend operations (bypasses RLS)
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        return

    url = f"{settings.supabase_project_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket_name}"
    payload = {"prefixes": file_paths}  # Changed from "paths" to "prefixes" for Supabase API

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.delete(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if response.status_code >= 400:
            # don't fail the entire delete if storage removal fails, but log for visibility
            logger.warning(f"Failed to delete storage objects: {response.text}")


async def upload_file_to_openai_and_supabase(
    file: UploadFile,
    user_id: UUID,
    conversation_id: Optional[UUID],
    db: AsyncSession,
    settings: Settings,
) -> FileMeta:
    """
    New file upload flow: OpenAI Files API → DB → Supabase Storage
    
    1. Upload to OpenAI Files API first
    2. Store metadata in DB with openai_file_id
    3. Upload to Supabase Storage
    
    This ensures files are available to OpenAI before being stored in Supabase.
    """
    # Read file content once
    file_content = await file.read()
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )
    
    # Step 1: Upload to OpenAI Files API for document types (PDF, DOC, DOCX)
    # OpenAI Files API supports PDF, DOC, and DOCX files
    OPENAI_UPLOADABLE_MIMES = {
        "application/pdf",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    }
    OPENAI_UPLOADABLE_EXTENSIONS = {".pdf", ".doc", ".docx"}
    
    openai_file_id = None
    lower_name = (file.filename or "").lower()
    is_uploadable = (
        file.content_type in OPENAI_UPLOADABLE_MIMES
        or any(lower_name.endswith(ext) for ext in OPENAI_UPLOADABLE_EXTENSIONS)
    )
    
    if is_uploadable:
        logger.info(f"Uploading document to OpenAI Files API: {file.filename} (type: {file.content_type})")
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key_clean)
            
            file_obj = BytesIO(file_content)
            file_obj.name = file.filename or "file"
            
            openai_file = await client.files.create(
                file=(file.filename or "file", file_obj, file.content_type or "application/octet-stream"),
                purpose="assistants",
            )
            
            openai_file_id = openai_file.id
            logger.info(f"Received openai_file_id: {openai_file_id}")
            
        except Exception as e:
            logger.error(f"Failed to upload to OpenAI Files API: {e}")
            logger.warning(f"Continuing without OpenAI file upload for {file.filename}")
            openai_file_id = None
    else:
        logger.info(f"Skipping OpenAI Files API upload for non-document file: {file.filename} (type: {file.content_type})")
        logger.info(f"File will use text extraction fallback during chat")
    
    # Step 2: Store metadata in DB with openai_file_id
    # Generate a unique path for Supabase (but don't upload yet)
    file_extension = ""
    if file.filename and "." in file.filename:
        file_extension = file.filename.rsplit(".", 1)[1]
    
    supabase_path = f"{user_id}/{uuid4()}.{file_extension}" if file_extension else f"{user_id}/{uuid4()}"
    
    try:
        result = await db.execute(
            text(
                """
                insert into files (user_id, conversation_id, supabase_path, openai_file_id, mime_type, original_name)
                values (:user_id, :conversation_id, :supabase_path, :openai_file_id, :mime_type, :original_name)
                returning id, conversation_id, supabase_path, openai_file_id, mime_type, original_name, created_at
                """
            ),
            {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "supabase_path": supabase_path,
                "openai_file_id": openai_file_id,
                "mime_type": file.content_type,
                "original_name": file.filename,
            },
        )
        row = result.mappings().one()
        await db.commit()
        
        file_meta = FileMeta(
            id=row["id"],
            conversation_id=row["conversation_id"],
            supabase_path=row["supabase_path"],
            openai_file_id=row["openai_file_id"],
            mime_type=row["mime_type"],
            original_name=row["original_name"],
            created_at=row["created_at"],
        )
        
    except Exception as e:
        logger.error(f"Failed to store file metadata in DB: {e}")
        # Try to clean up OpenAI file if DB insert fails and file was uploaded
        if openai_file_id:
            try:
                client = AsyncOpenAI(api_key=settings.openai_api_key_clean)
                await client.files.delete(openai_file_id)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store file metadata. Please try again.",
        )
    
    # Step 3: Upload to Supabase Storage
    logger.info(f"Uploading file to Supabase storage: {supabase_path}")
    try:
        await _upload_to_supabase_storage(
            file_content=file_content,
            path=supabase_path,
            content_type=file.content_type or "application/octet-stream",
            settings=settings,
        )
        logger.info(f"File uploaded to Supabase successfully")
        
    except Exception as e:
        logger.error(f"Failed to upload to Supabase Storage: {e}")
        # File is already in OpenAI and DB, so we don't fail the request
        # But we log the error for visibility
        logger.warning(f"File {file_meta.id} is in OpenAI and DB but not in Supabase Storage")
    
    return file_meta


async def _upload_to_supabase_storage(
    file_content: bytes,
    path: str,
    content_type: str,
    settings: Settings,
) -> None:
    """Upload file bytes to Supabase Storage."""
    # Use service role key for backend operations (bypasses RLS)
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    url = f"{settings.supabase_project_url.rstrip('/')}/storage/v1/object/{settings.supabase_storage_bucket_name}/{path}"
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": content_type,
            },
            content=file_content,
        )
        
        if response.status_code >= 400:
            raise RuntimeError(f"Supabase upload failed ({response.status_code}): {response.text}")

