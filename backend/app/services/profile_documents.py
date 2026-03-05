"""Profile documents service - manages documents in ProfileDrawer bucket."""

import logging
import posixpath
from typing import List, Dict, Any
from uuid import UUID

import httpx
from fastapi import UploadFile

from app.config import Settings

logger = logging.getLogger(__name__)

PROFILE_BUCKET = "ProfileDrawer"


async def list_documents(user_id: UUID, settings: Settings) -> List[Dict[str, Any]]:
    """List all profile documents for a user."""
    auth_key = settings.supabase_service_role_key_clean or settings.supabase_anon_key_clean
    if not settings.supabase_project_url or not auth_key:
        raise RuntimeError("Supabase configuration missing")
    
    base = settings.supabase_project_url.rstrip("/")
    user_folder = str(user_id)
    
    # List objects in the user's folder
    url = f"{base}/storage/v1/object/list/{PROFILE_BUCKET}"
    
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            url,
            headers={
                "apikey": auth_key,
                "Authorization": f"Bearer {auth_key}",
                "Content-Type": "application/json",
            },
            json={
                "prefix": user_folder,
                "limit": 100,
                "offset": 0,
            },
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to list documents: {response.status_code} - {response.text}")
            return []
        
        data = response.json()
        documents = []
        
        for item in data:
            if item.get("name"):  # Skip folders
                documents.append({
                    "path": f"{user_folder}/{item['name']}",
                    "name": item["name"],
                    "size": item.get("metadata", {}).get("size", 0),
                    "updatedAt": item.get("updated_at"),
                })
        
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
    file_path = f"{user_folder}/{file.filename}"
    
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
            "name": file.filename,
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
