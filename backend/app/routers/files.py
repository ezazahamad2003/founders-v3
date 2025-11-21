from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.db import get_db_session
from app.models import RegisterFilesRequest, RegisterFilesResponse
from app.services import files as files_service

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

