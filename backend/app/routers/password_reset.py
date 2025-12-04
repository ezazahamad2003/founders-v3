"""
Password reset endpoints with email verification code.
"""
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db_session
from app.config import settings

router = APIRouter(prefix="/api/v1/password-reset", tags=["password-reset"])


class RequestResetRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# In-memory store for verification codes (in production, use Redis or database)
# Structure: {email: {"code": "123456", "expires_at": datetime, "attempts": 0}}
verification_codes: dict[str, dict] = {}


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return str(secrets.randbelow(1000000)).zfill(6)


async def send_verification_email(email: str, code: str) -> None:
    """Send verification code via email using Supabase SMTP or Gmail."""
    try:
        # Email configuration
        sender_email = "noreply@scopiclegal.com"
        subject = "Password Reset Verification Code"
        
        # Create HTML email
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
                        This code will expire in <strong>10 minutes</strong>.
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>© 2024 Scopic Legal Inc. All rights reserved.</p>
                </div>
            </body>
        </html>
        """
        
        # For development, just print the code
        print(f"\n{'='*60}")
        print(f"PASSWORD RESET CODE FOR: {email}")
        print(f"CODE: {code}")
        print(f"Expires in 10 minutes")
        print(f"{'='*60}\n")
        
        # TODO: In production, configure SMTP to actually send emails
        # Uncomment and configure this section for production:
        """
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Use your SMTP server (Gmail, SendGrid, AWS SES, etc.)
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, 'your-app-password')
            server.send_message(msg)
        """
        
    except Exception as e:
        print(f"Error sending email: {e}")
        # Don't fail the request if email fails in development
        pass


@router.post("/request-code")
async def request_reset_code(
    request: RequestResetRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Request a password reset code. Sends a 6-digit code to the user's email.
    """
    email = request.email.lower()
    
    # Check if user exists in Supabase auth
    # Note: We can't directly query Supabase auth users, so we check profiles table
    query = text("SELECT id FROM profiles WHERE email = :email LIMIT 1")
    result = await db.execute(query, {"email": email})
    user = result.fetchone()
    
    if not user:
        # Don't reveal if email exists or not for security
        return {
            "success": True,
            "message": "If an account exists with this email, a verification code has been sent."
        }
    
    # Generate verification code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store code
    verification_codes[email] = {
        "code": code,
        "expires_at": expires_at,
        "attempts": 0,
        "user_id": str(user[0])
    }
    
    # Send email
    await send_verification_email(email, code)
    
    return {
        "success": True,
        "message": "If an account exists with this email, a verification code has been sent.",
        "expires_in_minutes": 10
    }


@router.post("/verify-code")
async def verify_reset_code(request: VerifyCodeRequest):
    """
    Verify the reset code before allowing password change.
    """
    email = request.email.lower()
    code = request.code.strip()
    
    # Check if code exists
    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    
    stored_data = verification_codes[email]
    
    # Check if expired
    if datetime.utcnow() > stored_data["expires_at"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
    
    # Check attempts (max 5)
    if stored_data["attempts"] >= 5:
        del verification_codes[email]
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new code.")
    
    # Verify code
    if stored_data["code"] != code:
        stored_data["attempts"] += 1
        remaining = 5 - stored_data["attempts"]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempts remaining."
        )
    
    return {
        "success": True,
        "message": "Code verified successfully. You can now reset your password."
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Reset password using verified code.
    """
    email = request.email.lower()
    code = request.code.strip()
    new_password = request.new_password
    
    # Validate password
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    
    # Check if code exists and is valid
    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    
    stored_data = verification_codes[email]
    
    # Check if expired
    if datetime.utcnow() > stored_data["expires_at"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification code has expired.")
    
    # Verify code one more time
    if stored_data["code"] != code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    try:
        # Update password in Supabase auth using admin API
        # Note: This requires the Supabase service role key
        from supabase import create_client
        
        supabase_admin = create_client(
            settings.supabase_project_url,
            settings.supabase_service_role_key
        )
        
        # Update user password
        user_id = stored_data["user_id"]
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            {"password": new_password}
        )
        
        # Clear the verification code
        del verification_codes[email]
        
        return {
            "success": True,
            "message": "Password has been reset successfully. You can now sign in with your new password."
        }
        
    except Exception as e:
        print(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password. Please try again.")
