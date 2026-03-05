"""
Password reset endpoints with email verification code.
Codes are stored in the database (password_reset_codes table) so they
survive server restarts and work correctly across multiple instances.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db_session
from app.config import settings

router = APIRouter(prefix="/api/v1/password-reset", tags=["password-reset"])

_CODE_TTL_MINUTES = 10
_MAX_ATTEMPTS = 5


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RequestResetRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_code() -> str:
    """Return a random 6-digit string."""
    return str(secrets.randbelow(1_000_000)).zfill(6)


def _hash_code(code: str) -> str:
    """SHA-256 hex digest of the code string."""
    return hashlib.sha256(code.encode()).hexdigest()


async def _delete_codes_for_email(db: AsyncSession, email: str) -> None:
    """Remove all existing reset codes for an email (cleanup before issuing new one)."""
    await db.execute(
        text("DELETE FROM password_reset_codes WHERE email = :email"),
        {"email": email},
    )


async def _get_valid_code_row(db: AsyncSession, email: str) -> dict | None:
    """
    Fetch the active (non-expired) code row for email.
    Returns None if no row exists or the row is expired (and deletes it).
    """
    result = await db.execute(
        text(
            "SELECT id, code_hash, expires_at, attempts, user_id "
            "FROM password_reset_codes "
            "WHERE email = :email "
            "LIMIT 1"
        ),
        {"email": email},
    )
    row = result.fetchone()
    if row is None:
        return None

    row_dict = dict(row._mapping)

    if datetime.utcnow() > row_dict["expires_at"].replace(tzinfo=None):
        await db.execute(
            text("DELETE FROM password_reset_codes WHERE id = :id"),
            {"id": row_dict["id"]},
        )
        await db.commit()
        return None

    return row_dict


async def send_verification_email(email: str, code: str) -> None:
    """Send verification code via email. Prints to console for now; wire up SMTP for production."""
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">Scopic Legal</h1>
                <p style="color: white; margin-top: 10px;">Password Reset Request</p>
            </div>

            <div style="padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #1f2937;">Your Verification Code</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                    You requested to reset your password. Use the verification code below to continue:
                </p>

                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
                </div>

                <p style="color: #4b5563; line-height: 1.6;">
                    This code will expire in <strong>{_CODE_TTL_MINUTES} minutes</strong>.
                </p>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    If you didn't request this password reset, please ignore this email or contact support.
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>© 2024 Scopic Legal Inc. All rights reserved.</p>
            </div>
        </body>
    </html>
    """  # noqa: F841  (kept for future SMTP wiring)

    # TODO: configure SMTP (Gmail / SendGrid / AWS SES) for production and send html_content
    print(f"\n{'='*60}")
    print(f"PASSWORD RESET CODE FOR: {email}")
    print(f"CODE: {code}")
    print(f"Expires in {_CODE_TTL_MINUTES} minutes")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/request-code")
async def request_reset_code(
    request: RequestResetRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Request a password reset code. Sends a 6-digit code to the user's email."""
    email = request.email.lower()

    # Look up user in profiles table
    result = await db.execute(
        text("SELECT id FROM profiles WHERE email = :email LIMIT 1"),
        {"email": email},
    )
    user = result.fetchone()

    # Always return the same generic message to avoid leaking whether an account exists
    if not user:
        return {
            "success": True,
            "message": "If an account exists with this email, a verification code has been sent.",
        }

    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=_CODE_TTL_MINUTES)

    # Remove any previous code for this email, then insert the new one
    await _delete_codes_for_email(db, email)
    await db.execute(
        text(
            "INSERT INTO password_reset_codes (email, code_hash, user_id, expires_at) "
            "VALUES (:email, :code_hash, :user_id, :expires_at)"
        ),
        {
            "email": email,
            "code_hash": _hash_code(code),
            "user_id": str(user[0]),
            "expires_at": expires_at,
        },
    )
    await db.commit()

    await send_verification_email(email, code)

    return {
        "success": True,
        "message": "If an account exists with this email, a verification code has been sent.",
        "expires_in_minutes": _CODE_TTL_MINUTES,
    }


@router.post("/verify-code")
async def verify_reset_code(
    request: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Verify the reset code before allowing a password change."""
    email = request.email.lower()
    code = request.code.strip()

    row = await _get_valid_code_row(db, email)
    if row is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if row["attempts"] >= _MAX_ATTEMPTS:
        await _delete_codes_for_email(db, email)
        await db.commit()
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new code.")

    if row["code_hash"] != _hash_code(code):
        new_attempts = row["attempts"] + 1
        await db.execute(
            text("UPDATE password_reset_codes SET attempts = :attempts WHERE id = :id"),
            {"attempts": new_attempts, "id": row["id"]},
        )
        await db.commit()
        remaining = _MAX_ATTEMPTS - new_attempts
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    return {
        "success": True,
        "message": "Code verified successfully. You can now reset your password.",
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Reset password using a verified 6-digit code."""
    email = request.email.lower()
    code = request.code.strip()
    new_password = request.new_password

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    row = await _get_valid_code_row(db, email)
    if row is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if row["code_hash"] != _hash_code(code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    try:
        from supabase import create_client

        supabase_admin = create_client(
            settings.supabase_project_url,
            settings.supabase_service_role_key,
        )
        supabase_admin.auth.admin.update_user_by_id(
            row["user_id"],
            {"password": new_password},
        )

        # Code has been used — delete it so it cannot be replayed
        await _delete_codes_for_email(db, email)
        await db.commit()

        return {
            "success": True,
            "message": "Password has been reset successfully. You can now sign in with your new password.",
        }

    except Exception as e:
        print(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password. Please try again.")
