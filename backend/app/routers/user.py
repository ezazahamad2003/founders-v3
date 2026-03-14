from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.db import get_db_session
from app.models import AcceptTosRequest, MeResponse, UpdateProfileRequest

router = APIRouter(prefix="/api", tags=["user"])


@router.get("/me", response_model=MeResponse)
async def me(current_user: CurrentUser = Depends(get_current_user)) -> MeResponse:
    """Return the authenticated user's profile."""
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        accepted_tos_at=current_user.accepted_tos_at,
        full_name=current_user.full_name,
        company_name=current_user.company_name,
        website=current_user.website,
        profile_image_path=current_user.profile_image_path,
    )


@router.post("/accept-tos", response_model=MeResponse)
async def accept_tos(
    _: AcceptTosRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    """Mark that the current user accepted the TOS and return updated profile."""
    try:
        result = await db.execute(
            text(
                """
                update profiles
                set accepted_tos_at = now()
                where id = :id
                returning id, email, role, accepted_tos_at, full_name, company_name, website, profile_image_path
                """
            ),
            {"id": current_user.id},
        )
    except Exception as exc:
        # Backward compatibility while migration 004 rolls out.
        if "website" in str(exc).lower() or "profile_image_path" in str(exc).lower():
            result = await db.execute(
                text(
                    """
                    update profiles
                    set accepted_tos_at = now()
                    where id = :id
                    returning id, email, role, accepted_tos_at, full_name, company_name,
                              null::text as website, null::text as profile_image_path
                    """
                ),
                {"id": current_user.id},
            )
        else:
            raise
    row = result.mappings().one()
    await db.commit()

    current_user.accepted_tos_at = row["accepted_tos_at"]

    return MeResponse(
        id=row["id"],
        email=row["email"],
        role=row["role"],
        accepted_tos_at=row["accepted_tos_at"],
        full_name=row["full_name"],
        company_name=row["company_name"],
        website=row["website"],
        profile_image_path=row["profile_image_path"],
    )


@router.patch("/me", response_model=MeResponse)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    """Update editable profile fields for the current user."""
    fields_set = payload.model_fields_set

    query_params = {
        "id": current_user.id,
        "update_full_name": "full_name" in fields_set,
        "full_name": payload.full_name,
        "update_company_name": "company_name" in fields_set,
        "company_name": payload.company_name,
        "update_website": "website" in fields_set,
        "website": payload.website,
        "update_profile_image_path": "profile_image_path" in fields_set,
        "profile_image_path": payload.profile_image_path,
    }

    try:
        result = await db.execute(
            text(
                """
                update profiles
                set
                    full_name = case when :update_full_name then :full_name else full_name end,
                    company_name = case when :update_company_name then :company_name else company_name end,
                    website = case when :update_website then :website else website end,
                    profile_image_path = case when :update_profile_image_path then :profile_image_path else profile_image_path end
                where id = :id
                returning id, email, role, accepted_tos_at, full_name, company_name, website, profile_image_path
                """
            ),
            query_params,
        )
    except Exception as exc:
        # Backward compatibility while migration 004 rolls out.
        if "website" in str(exc).lower() or "profile_image_path" in str(exc).lower():
            result = await db.execute(
                text(
                    """
                    update profiles
                    set
                        full_name = case when :update_full_name then :full_name else full_name end,
                        company_name = case when :update_company_name then :company_name else company_name end
                    where id = :id
                    returning id, email, role, accepted_tos_at, full_name, company_name,
                              null::text as website, null::text as profile_image_path
                    """
                ),
                query_params,
            )
        else:
            raise
    row = result.mappings().one()
    await db.commit()

    return MeResponse(
        id=row["id"],
        email=row["email"],
        role=row["role"],
        accepted_tos_at=row["accepted_tos_at"],
        full_name=row["full_name"],
        company_name=row["company_name"],
        website=row["website"],
        profile_image_path=row["profile_image_path"],
    )

