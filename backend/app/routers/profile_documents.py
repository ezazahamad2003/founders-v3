"""Profile documents management endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.config import Settings, get_settings
from app.db import get_db_session
from app.services import profile_documents as profile_docs_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile-documents"])


@router.get("/documents")
async def list_profile_documents(
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """List all profile documents for the current user."""
    ensure_tos_accepted(current_user)
    
    try:
        documents = await profile_docs_service.list_documents(
            user_id=current_user.id,
            settings=settings,
        )
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Failed to list profile documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list documents. Please try again.",
        )


@router.post("/documents/upload")
async def upload_profile_document(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Upload a profile document."""
    ensure_tos_accepted(current_user)
    
    logger.info(f"Uploading profile document: {file.filename} for user: {current_user.id}")
    
    try:
        result = await profile_docs_service.upload_document(
            file=file,
            user_id=current_user.id,
            settings=settings,
        )
        logger.info(f"Profile document uploaded: {result['path']}")
        return result
    except Exception as e:
        logger.error(f"Profile document upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload failed. Please try again.",
        )


@router.delete("/documents")
async def delete_profile_document(
    path: str,
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Delete a profile document by path."""
    ensure_tos_accepted(current_user)
    
    logger.info(f"Deleting profile document: {path} for user: {current_user.id}")
    
    try:
        await profile_docs_service.delete_document(
            path=path,
            user_id=current_user.id,
            settings=settings,
        )
        logger.info(f"Profile document deleted: {path}")
        return {"message": "Document deleted successfully"}
    except ValueError as e:
        logger.error(f"Document not found or unauthorized: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Profile document deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deletion failed. Please try again.",
        )


@router.get("/documents/download")
async def download_profile_document(
    path: str,
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Generate a signed URL for downloading a profile document."""
    ensure_tos_accepted(current_user)
    
    try:
        signed_url = await profile_docs_service.get_download_url(
            path=path,
            user_id=current_user.id,
            settings=settings,
        )
        return {"url": signed_url}
    except ValueError as e:
        logger.error(f"Document not found or unauthorized: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL. Please try again.",
        )
