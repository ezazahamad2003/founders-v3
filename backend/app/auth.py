"""Authentication helpers for Supabase JWT validation."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import jwt
from jose.exceptions import JWTError
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_db_session

JWKS_CACHE_TTL_SECONDS = 300
_jwks_cache: Dict[str, Any] | None = None
_jwks_fetched_at: float = 0.0
logger = logging.getLogger(__name__)


class CurrentUser(BaseModel):
    """Representation of an authenticated Supabase user."""

    id: UUID
    email: Optional[str] = None
    role: str = "client"
    accepted_tos_at: Optional[datetime] = None


async def _fetch_jwks(settings: Settings) -> Dict[str, Any]:
    """Retrieve (and cache) the JWKS used to verify Supabase JWTs."""
    global _jwks_cache, _jwks_fetched_at
    if (
        _jwks_cache is not None
        and (time.time() - _jwks_fetched_at) < JWKS_CACHE_TTL_SECONDS
    ):
        return _jwks_cache

    jwks_url = settings.supabase_jwks_url
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MISSING_JWKS_URL",
        )

    headers = {}
    if settings.supabase_anon_key:
        headers["apikey"] = settings.supabase_anon_key

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(jwks_url, headers=headers or None)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_fetched_at = time.time()
        return _jwks_cache


async def verify_jwt(token: str, settings: Settings) -> Dict[str, Any]:
    """Validate the Supabase JWT and return decoded claims."""
    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True},
            )
        except JWTError as exc:
            # fallback to JWKS flow if local secret fails
            logger.warning("HS256 verification failed; falling back to JWKS: %s", exc)

    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        ) from exc

    jwks = await _fetch_jwks(settings)
    keys = jwks.get("keys", [])
    matching_key = next(
        (key for key in keys if key.get("kid") == unverified_header.get("kid")), None
    )
    if not matching_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        )

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(matching_key))

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=[matching_key.get("alg", "RS256")],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        ) from exc
    return claims


async def _get_profile(
    db: AsyncSession,
    user_id: UUID,
) -> Optional[Dict[str, Any]]:
    result = await db.execute(
        text(
            """
            select id, email, role, accepted_tos_at
            from profiles
            where id = :id
            """
        ),
        {"id": user_id},
    )
    return result.mappings().one_or_none()


async def _create_profile(
    db: AsyncSession,
    user_id: UUID,
    email: Optional[str],
) -> Dict[str, Any]:
    result = await db.execute(
        text(
            """
            insert into profiles (id, email, role)
            values (:id, :email, 'client')
            on conflict (id) do update set email = excluded.email
            returning id, email, role, accepted_tos_at
            """
        ),
        {"id": user_id, "email": email},
    )
    await db.commit()
    return result.mappings().one()


async def _get_or_create_profile(
    db: AsyncSession,
    user_id: UUID,
    email: Optional[str],
) -> Dict[str, Any]:
    profile = await _get_profile(db, user_id)
    if profile:
        return profile
    return await _create_profile(db, user_id, email)


def _extract_bearer_token(authorization: str) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED",
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED",
        )
    return token


async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """Return the authenticated Supabase user, creating a profile if needed."""
    token = _extract_bearer_token(authorization)
    claims = await verify_jwt(token, settings)

    user_id_value = claims.get("sub")
    if not user_id_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        )
    try:
        user_id = UUID(user_id_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        ) from exc

    email = claims.get("email")
    profile = await _get_or_create_profile(db, user_id, email)
    return CurrentUser(
        id=user_id,
        email=profile.get("email"),
        role=profile.get("role", "client"),
        accepted_tos_at=profile.get("accepted_tos_at"),
    )


async def assert_conversation_access(
    db: AsyncSession,
    current_user: CurrentUser,
    conversation_id: UUID,
) -> Dict[str, Any]:
    """Ensure the current user can read the provided conversation."""
    result = await db.execute(
        text(
            """
            select id, user_id, assigned_lawyer_id, title, created_at, updated_at
            from conversations
            where id = :id
            """
        ),
        {"id": conversation_id},
    )
    conversation = result.mappings().one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CONVERSATION_NOT_FOUND",
        )

    owns_conversation = conversation.get("user_id") == current_user.id
    assigned_lawyer = conversation.get("assigned_lawyer_id") == current_user.id
    lawyer_access = assigned_lawyer and current_user.role in {"lawyer", "admin"}

    if not (owns_conversation or lawyer_access):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FORBIDDEN",
        )

    return conversation


def ensure_tos_accepted(current_user: CurrentUser) -> None:
    """Raise if the current user has not accepted the TOS."""
    if current_user.accepted_tos_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TOS_NOT_ACCEPTED",
        )

