from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.db import get_db_session
from app.models import AcceptTosRequest, MeResponse

router = APIRouter(prefix="/api", tags=["user"])


@router.get("/me", response_model=MeResponse)
async def me(current_user: CurrentUser = Depends(get_current_user)) -> MeResponse:
    """Return the authenticated user's profile."""
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        accepted_tos_at=current_user.accepted_tos_at,
    )


@router.post("/accept-tos", response_model=MeResponse)
async def accept_tos(
    _: AcceptTosRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    """Mark that the current user accepted the TOS and return updated profile."""
    result = await db.execute(
        text(
            """
            update profiles
            set accepted_tos_at = now()
            where id = :id
            returning id, email, role, accepted_tos_at
            """
        ),
        {"id": current_user.id},
    )
    row = result.mappings().one()
    await db.commit()

    current_user.accepted_tos_at = row["accepted_tos_at"]

    return MeResponse(
        id=row["id"],
        email=row["email"],
        role=row["role"],
        accepted_tos_at=row["accepted_tos_at"],
    )

