from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, ensure_tos_accepted, get_current_user
from app.db import get_db_session
from app.models import ConversationDetailResponse, ConversationsListResponse
from app.services import conversations as conversations_service

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get("/conversations", response_model=ConversationsListResponse)
async def list_conversations(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> ConversationsListResponse:
    """Return all conversations owned by the user."""
    ensure_tos_accepted(current_user)
    conversations = await conversations_service.list_conversations_for_user(
        db,
        current_user,
    )
    return ConversationsListResponse(conversations=conversations)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> ConversationDetailResponse:
    """Return a conversation along with its messages and files."""
    ensure_tos_accepted(current_user)
    return await conversations_service.get_conversation_detail(
        db,
        conversation_id=conversation_id,
        current_user=current_user,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete a conversation owned by the user."""
    ensure_tos_accepted(current_user)
    await conversations_service.delete_conversation(
        db=db,
        conversation_id=conversation_id,
        current_user=current_user,
    )

