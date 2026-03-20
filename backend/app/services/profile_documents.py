"""Profile documents service - manages documents in ProfileDrawer bucket."""

import logging
import posixpath
import re
import time
from typing import List, Dict, Any
from uuid import UUID

import httpx
from fastapi import UploadFile

from app.config import Settings

logger = logging.getLogger(__name__)

PROFILE_BUCKET = "ProfileDrawer"


def _normalize_uploaded_name(filename: str | None) -> str:
    raw = (filename or "document").strip()
    if not raw:
        raw = "document"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", raw).strip("-")
    return safe or "document"


def _display_name(stored_name: str) -> str:
    return re.sub(r"^\d{13}-", "", stored_name)


def _parse_list_response(response: httpx.Response, prefix: str) -> List[Dict[str, Any]]:
    """Parse Supabase Storage list response into document dicts. Name is full path in bucket."""
    documents = []
    try:
        data = response.json()
    except Exception as e:
        logger.error(f"Failed to parse list response as JSON: {e}. Body: {response.text[:500]}")
        return []
    if not isinstance(data, list):
        logger.warning(f"Storage list response is not a list: {type(data)}. Body: {response.text[:200]}")
        return []
    for item in data:
        if not isinstance(item, dict):
            continue
        if item.get("metadata") is None:
            continue
        name = item.get("name")
        if not name:
            continue
        # Name can be full path (userId/file.pdf) or relative (file.pdf); normalize to full path
        path = name if name.startswith(prefix) else f"{prefix.rstrip('/')}/{name}".replace("//", "/")
        file_name = path.split("/")[-1]
        documents.append({
            "path": path,
            "name": _display_name(file_name),
            "size": (item.get("metadata") or {}).get("size", 0),
            "updatedAt": item.get("updated_at"),
        })
    return documents


async def list_documents(user_id: UUID, settings: Settings) -> List[Dict[str, Any]]:
    """List all profile documents for a user."""
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    base = settings.supabase_project_url.rstrip("/")
    user_folder = str(user_id)
    url = f"{base}/storage/v1/object/list/{PROFILE_BUCKET}"
    headers = {
        "apikey": auth_key,
        "Authorization": f"Bearer {auth_key}",
        "Content-Type": "application/json",
    }
    
    documents: List[Dict[str, Any]] = []
    
    async with httpx.AsyncClient(timeout=15) as client:
        # List root user folder (backend uploads go here)
        try:
            response = await client.post(
                url,
                headers=headers,
                json={"prefix": user_folder, "limit": 100, "offset": 0},
            )
            if response.status_code == 200:
                documents.extend(_parse_list_response(response, user_folder))
            else:
                logger.warning(f"List {user_folder} failed: {response.status_code} - {response.text[:300]}")
        except Exception as e:
            logger.error(f"List {user_folder} request failed: {e}", exc_info=True)
            raise
        
        # List legacy profile-library subfolder (ProfileDrawer/document-vault uploads)
        legacy_prefix = f"{user_folder}/profile-library"
        try:
            legacy_response = await client.post(
                url,
                headers=headers,
                json={"prefix": legacy_prefix, "limit": 200, "offset": 0},
            )
            if legacy_response.status_code == 200:
                documents.extend(_parse_list_response(legacy_response, legacy_prefix))
            else:
                logger.warning(f"List {legacy_prefix} failed: {legacy_response.status_code} - {legacy_response.text[:300]}")
        except Exception as e:
            logger.warning(f"List {legacy_prefix} request failed (non-fatal): {e}")
        
        return documents


async def upload_document(file: UploadFile, user_id: UUID, settings: Settings) -> Dict[str, Any]:
    """Upload a profile document to the ProfileDrawer bucket."""
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    # Read file content
    file_content = await file.read()
    if not file_content:
        raise ValueError("Empty file")
    
    base = settings.supabase_project_url.rstrip("/")
    user_folder = str(user_id)
    safe_name = _normalize_uploaded_name(file.filename)
    stored_name = f"{int(time.time() * 1000)}-{safe_name}"
    file_path = f"{user_folder}/{stored_name}"
    
    # Upload to Supabase Storage
    url = f"{base}/storage/v1/object/{PROFILE_BUCKET}/{file_path}"
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": file.content_type or "application/octet-stream",
            },
            content=file_content,
        )
        
        if response.status_code >= 400:
            logger.error(f"Upload failed: {response.status_code} - {response.text}")
            raise RuntimeError(f"Upload failed: {response.text}")
        
        return {
            "path": file_path,
            "name": _display_name(stored_name),
            "size": len(file_content),
        }


async def delete_document(path: str, user_id: UUID, settings: Settings) -> None:
    """Delete a profile document."""
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    user_folder = str(user_id)
    normalized = posixpath.normpath(path)
    if not normalized.startswith(user_folder + "/") and normalized != user_folder:
        raise ValueError("Unauthorized: Document does not belong to user")
    
    base = settings.supabase_project_url.rstrip("/")
    url = f"{base}/storage/v1/object/{PROFILE_BUCKET}"
    
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.delete(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": "application/json",
            },
            json={"prefixes": [path]},
        )
        
        if response.status_code >= 400:
            logger.error(f"Delete failed: {response.status_code} - {response.text}")
            raise RuntimeError(f"Delete failed: {response.text}")


async def get_download_url(path: str, user_id: UUID, settings: Settings, expiry_seconds: int = 3600) -> str:
    """Generate a signed URL for downloading a profile document."""
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    user_folder = str(user_id)
    normalized = posixpath.normpath(path)
    if not normalized.startswith(user_folder + "/") and normalized != user_folder:
        raise ValueError("Unauthorized: Document does not belong to user")
    
    base = settings.supabase_project_url.rstrip("/")
    
    # Generate signed URL
    url = f"{base}/storage/v1/object/sign/{PROFILE_BUCKET}/{path}"
    
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": "application/json",
            },
            json={"expiresIn": expiry_seconds},
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to generate signed URL: {response.status_code} - {response.text}")
            raise RuntimeError(f"Failed to generate signed URL: {response.text}")
        
        data = response.json()
        signed_path = data.get("signedURL")
        if not signed_path:
            raise RuntimeError("No signed URL returned")
        
        return f"{base}/storage/v1{signed_path}"
