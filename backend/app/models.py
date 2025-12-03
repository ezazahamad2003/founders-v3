"""Pydantic schemas for Scopic Legal API."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: UUID
    email: Optional[str]
    role: str
    accepted_tos_at: Optional[datetime]


class FileMeta(BaseModel):
    id: UUID
    conversation_id: Optional[UUID]  # Null for temp files before first message
    supabase_path: str
    openai_file_id: Optional[str] = None  # OpenAI Files API file ID
    mime_type: Optional[str] = None
    original_name: Optional[str] = None
    created_at: datetime


class RegisterFileInput(BaseModel):
    supabase_path: str
    openai_file_id: Optional[str] = None  # OpenAI Files API file ID
    mime_type: Optional[str] = None
    original_name: Optional[str] = None


class RegisterFilesRequest(BaseModel):
    conversation_id: Optional[UUID]  # Null for temp files
    files: List[RegisterFileInput]


class RegisterFilesResponse(BaseModel):
    files: List[FileMeta]


class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    user_id: Optional[UUID]
    role: Literal["user", "assistant", "system"]
    content: str
    model: Optional[str]
    metadata: Optional[dict] = None
    created_at: datetime


class ConversationSummary(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    assigned_lawyer_id: Optional[UUID] = None


class ConversationDetail(BaseModel):
    id: UUID
    user_id: UUID
    assigned_lawyer_id: Optional[UUID]
    title: Optional[str]
    created_at: datetime
    updated_at: datetime


class ConversationsListResponse(BaseModel):
    conversations: List[ConversationSummary]


class ConversationDetailResponse(BaseModel):
    conversation: ConversationDetail
    messages: List[Message]
    files: List[FileMeta]


class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str
    file_ids: Optional[List[UUID]] = None
    mode: Literal["auto", "chat", "vision", "files", "deep_research"] = "auto"


class MeResponse(UserProfile):
    pass


class AcceptTosRequest(BaseModel):
    """Placeholder for future metadata."""

    pass

