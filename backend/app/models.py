"""Pydantic schemas for Scopic Legal API."""

from datetime import datetime
from typing import List, Literal, Optional
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class UserProfile(BaseModel):
    id: UUID
    email: Optional[str]
    role: str
    accepted_tos_at: Optional[datetime]
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    profile_image_path: Optional[str] = None


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
    message: str = Field(..., max_length=50000)
    file_ids: Optional[List[UUID]] = None
    mode: Literal["auto", "chat", "vision", "files", "deep_research"] = "auto"
    prompt_mode: Optional[Literal["general", "contract_review"]] = "general"


class MeResponse(UserProfile):
    pass


class AcceptTosRequest(BaseModel):
    """Placeholder for future metadata."""

    pass


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=200)
    company_name: Optional[str] = Field(default=None, max_length=200)
    website: Optional[str] = Field(default=None, max_length=500)
    profile_image_path: Optional[str] = Field(default=None, max_length=500)

    @field_validator("full_name", "company_name", "website", "profile_image_path", mode="before")
    @classmethod
    def _strip_or_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value

    @field_validator("website")
    @classmethod
    def _normalize_website(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        candidate = value
        if "://" not in candidate:
            candidate = f"https://{candidate}"

        parsed = urlparse(candidate)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("website must be a valid URL")
        return candidate

