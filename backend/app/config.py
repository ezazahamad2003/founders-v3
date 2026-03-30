"""Application configuration module."""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings backed by environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    openai_base_url: Optional[str] = Field(default=None, alias="OPENAI_BASE_URL")
    claude_api_key: str = Field(..., alias="CLAUDE_API_KEY")
    claude_model: str = Field(default="claude-3-5-sonnet-20241022", alias="CLAUDE_MODEL")

    supabase_db_url: str = Field(..., alias="SUPABASE_DB_URL")
    supabase_jwks_url: Optional[str] = Field(default=None, alias="SUPABASE_JWKS_URL")
    supabase_jwt_secret: Optional[str] = Field(default=None, alias="SUPABASE_JWT_SECRET")
    supabase_anon_key: Optional[str] = Field(default=None, alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: Optional[str] = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_project_url: Optional[str] = Field(
        default=None, alias="SUPABASE_PROJECT_URL"
    )

    allowed_origins: Optional[str] = Field(default=None, alias="ALLOWED_ORIGINS")
    app_env: str = Field(default="local", alias="APP_ENV")

    max_history_messages: int = Field(default=30, alias="MAX_HISTORY_MESSAGES")
    max_output_tokens: int = Field(default=4096, alias="MAX_OUTPUT_TOKENS")

    openai_model_chat: str = Field(default="gpt-5.4", alias="OPENAI_MODEL_CHAT")
    openai_model_vision: str = Field(
        default="gpt-5.4", alias="OPENAI_MODEL_VISION"
    )
    openai_model_deep_research: str = Field(
        default="gpt-5.4", alias="OPENAI_MODEL_DEEP_RESEARCH"
    )

    supabase_storage_bucket_name: str = Field(
        default="uploads", alias="SUPABASE_STORAGE_BUCKET_NAME"
    )

    def allowed_origins_list(self) -> List[str]:
        """Return allowed origins as a list."""
        if not self.allowed_origins:
            return []
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def supabase_anon_key_clean(self) -> Optional[str]:
        """Return SUPABASE_ANON_KEY with whitespace/newlines stripped."""
        if not self.supabase_anon_key:
            return None
        return self.supabase_anon_key.strip(" \t\r\n")

    @property
    def supabase_jwt_secret_clean(self) -> Optional[str]:
        """Return SUPABASE_JWT_SECRET with whitespace/newlines stripped."""
        if not self.supabase_jwt_secret:
            return None
        return self.supabase_jwt_secret.strip(" \t\r\n")

    @property
    def supabase_db_url_clean(self) -> str:
        """Return SUPABASE_DB_URL with whitespace/newlines stripped."""
        return self.supabase_db_url.strip(" \t\r\n")

    @property
    def openai_api_key_clean(self) -> str:
        """Return OPENAI_API_KEY with whitespace/newlines stripped."""
        return self.openai_api_key.strip(" \t\r\n")

    @property
    def supabase_service_role_key_clean(self) -> Optional[str]:
        """Return SUPABASE_SERVICE_ROLE_KEY with whitespace/newlines stripped."""
        if not self.supabase_service_role_key:
            return None
        return self.supabase_service_role_key.strip(" \t\r\n")


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


# Create a global settings instance for convenience
settings = get_settings()
