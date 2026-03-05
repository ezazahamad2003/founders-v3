"""Lawyer dashboard API endpoints."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db_session
from app.models import UserProfile


def _require_lawyer_or_admin(current_user: UserProfile) -> None:
    if current_user.role not in {"lawyer", "admin"}:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

router = APIRouter(prefix="/api/lawyer", tags=["lawyer-dashboard"])


class UserStats(BaseModel):
    """Statistics for a single user."""
    user_id: UUID
    email: Optional[str]
    full_name: Optional[str]
    total_conversations: int
    total_messages: int
    total_documents: int
    last_activity: Optional[str]


class ConversationPreview(BaseModel):
    """Preview of a conversation."""
    id: UUID
    title: Optional[str]
    message_count: int
    created_at: str
    updated_at: str


class DocumentPreview(BaseModel):
    """Preview of a document."""
    id: UUID
    original_name: Optional[str]
    mime_type: Optional[str]
    created_at: str


class UserDetailResponse(BaseModel):
    """Detailed user information."""
    user_id: UUID
    email: Optional[str]
    full_name: Optional[str]
    company_name: Optional[str]
    role: str
    created_at: str
    total_conversations: int
    total_messages: int
    total_documents: int
    conversations: List[ConversationPreview]
    documents: List[DocumentPreview]


class MessageDetail(BaseModel):
    """Message in a conversation."""
    id: UUID
    role: str
    content: str
    created_at: str


class ConversationDetailResponse(BaseModel):
    """Full conversation with messages."""
    id: UUID
    title: Optional[str]
    created_at: str
    updated_at: str
    messages: List[MessageDetail]


@router.get("/users", response_model=List[UserStats])
async def get_all_users(
    current_user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all users with their statistics."""
    _require_lawyer_or_admin(current_user)
    
    query = text("""
        SELECT 
            p.id,
            p.email,
            p.full_name,
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT m.id) as total_messages,
            COUNT(DISTINCT f.id) as total_documents,
            MAX(COALESCE(m.created_at, c.created_at, f.created_at)) as last_activity
        FROM profiles p
        LEFT JOIN conversations c ON c.user_id = p.id
        LEFT JOIN messages m ON m.conversation_id = c.id
        LEFT JOIN files f ON f.user_id = p.id
        WHERE p.role = 'client'
        GROUP BY p.id, p.email, p.full_name
        ORDER BY last_activity DESC NULLS LAST
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    users = []
    for row in rows:
        users.append(UserStats(
            user_id=row[0],
            email=row[1],
            full_name=row[2],
            total_conversations=row[3],
            total_messages=row[4],
            total_documents=row[5],
            last_activity=row[6].isoformat() if row[6] else None,
        ))
    
    return users


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    current_user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get detailed information for a specific user."""
    _require_lawyer_or_admin(current_user)
    
    # Get user profile
    user_query = text("""
        SELECT id, email, full_name, company_name, role, created_at
        FROM profiles
        WHERE id = :user_id
    """)
    user_result = await db.execute(user_query, {"user_id": str(user_id)})
    user_row = user_result.fetchone()
    
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get conversations
    conv_query = text("""
        SELECT 
            c.id,
            c.title,
            COUNT(m.id) as message_count,
            c.created_at,
            c.updated_at
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = :user_id
        GROUP BY c.id, c.title, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
    """)
    conv_result = await db.execute(conv_query, {"user_id": str(user_id)})
    
    conversations = []
    for row in conv_result.fetchall():
        conversations.append(ConversationPreview(
            id=row[0],
            title=row[1],
            message_count=row[2],
            created_at=row[3].isoformat(),
            updated_at=row[4].isoformat(),
        ))
    
    # Get documents
    doc_query = text("""
        SELECT id, original_name, mime_type, created_at
        FROM files
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """)
    doc_result = await db.execute(doc_query, {"user_id": str(user_id)})
    
    documents = []
    for row in doc_result.fetchall():
        documents.append(DocumentPreview(
            id=row[0],
            original_name=row[1],
            mime_type=row[2],
            created_at=row[3].isoformat(),
        ))
    
    # Get totals
    stats_query = text("""
        SELECT 
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT m.id) as total_messages,
            COUNT(DISTINCT f.id) as total_documents
        FROM profiles p
        LEFT JOIN conversations c ON c.user_id = p.id
        LEFT JOIN messages m ON m.conversation_id = c.id
        LEFT JOIN files f ON f.user_id = p.id
        WHERE p.id = :user_id
    """)
    stats_result = await db.execute(stats_query, {"user_id": str(user_id)})
    stats_row = stats_result.fetchone()
    
    return UserDetailResponse(
        user_id=user_row[0],
        email=user_row[1],
        full_name=user_row[2],
        company_name=user_row[3],
        role=user_row[4],
        created_at=user_row[5].isoformat(),
        total_conversations=stats_row[0],
        total_messages=stats_row[1],
        total_documents=stats_row[2],
        conversations=conversations,
        documents=documents,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(
    conversation_id: UUID,
    current_user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full conversation with all messages."""
    _require_lawyer_or_admin(current_user)
    
    # Get conversation
    conv_query = text("""
        SELECT id, title, created_at, updated_at
        FROM conversations
        WHERE id = :conversation_id
    """)
    conv_result = await db.execute(conv_query, {"conversation_id": str(conversation_id)})
    conv_row = conv_result.fetchone()
    
    if not conv_row:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    msg_query = text("""
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = :conversation_id
        ORDER BY created_at ASC
    """)
    msg_result = await db.execute(msg_query, {"conversation_id": str(conversation_id)})
    
    messages = []
    for row in msg_result.fetchall():
        messages.append(MessageDetail(
            id=row[0],
            role=row[1],
            content=row[2],
            created_at=row[3].isoformat(),
        ))
    
    return ConversationDetailResponse(
        id=conv_row[0],
        title=conv_row[1],
        created_at=conv_row[2].isoformat(),
        updated_at=conv_row[3].isoformat(),
        messages=messages,
    )
