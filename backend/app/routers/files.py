import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.config import Settings, get_settings
from app.db import get_db_session
from app.models import RegisterFilesRequest, RegisterFilesResponse, FileMeta
from app.services import files as files_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["files"])


@router.post("/files/register", response_model=RegisterFilesResponse)
async def register_files(
    payload: RegisterFilesRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> RegisterFilesResponse:
    """Register metadata for files uploaded via Supabase storage."""
    ensure_tos_accepted(current_user)
    created_files = await files_service.register_files(db, current_user, payload)
    return RegisterFilesResponse(files=created_files)


@router.post("/files/upload", response_model=FileMeta)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> FileMeta:
    """
    Upload a file using the new flow:
    1. Upload to OpenAI Files API first
    2. Store metadata in DB with openai_file_id
    3. Upload to Supabase Storage
    
    This ensures files are available to OpenAI before being stored in Supabase.
    """
    ensure_tos_accepted(current_user)
    
    logger.info(f"Starting file upload for {file.filename}")
    
    try:
        # Step 1: Upload to OpenAI Files API
        uploaded_file = await files_service.upload_file_to_openai_and_supabase(
            file=file,
            user_id=current_user.id,
            conversation_id=conversation_id,
            db=db,
            settings=settings,
        )
        
        logger.info(f"File uploaded successfully: {uploaded_file.id} (OpenAI: {uploaded_file.openai_file_id})")
        return uploaded_file
        
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}",
        )


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> None:
    """
    Delete a file owned by the user.
    Removes from:
    1. Database
    2. Supabase Storage
    3. OpenAI Files API (if applicable)
    """
    ensure_tos_accepted(current_user)
    
    logger.info(f"Deleting file: {file_id} for user: {current_user.id}")
    
    try:
        await files_service.delete_file(
            db=db,
            file_id=file_id,
            user_id=current_user.id,
            settings=settings,
        )
        logger.info(f"File deleted successfully: {file_id}")
        
    except ValueError as e:
        logger.error(f"File not found or unauthorized: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"File deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File deletion failed: {str(e)}",
        )

