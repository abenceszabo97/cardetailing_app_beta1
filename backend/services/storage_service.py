"""
Object Storage Service - Emergent Object Storage Integration
"""
import os
import uuid
import logging
import requests
from typing import Tuple, Optional

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "xclean-carwash"

# Module-level storage key - set once and reused
_storage_key: Optional[str] = None

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg", 
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "json": "application/json",
    "csv": "text/csv",
    "txt": "text/plain"
}

def init_storage() -> str:
    """
    Initialize storage and get session-scoped storage key.
    Call ONCE at startup. Returns a reusable storage_key.
    """
    global _storage_key
    if _storage_key:
        return _storage_key
    
    if not EMERGENT_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logging.info("Object Storage initialized successfully")
        return _storage_key
    except Exception as e:
        logging.error(f"Failed to initialize storage: {e}")
        raise

def get_storage_key() -> str:
    """Get storage key, initializing if needed"""
    global _storage_key
    if not _storage_key:
        return init_storage()
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload file to object storage.
    Returns {"path": "...", "size": 123, "etag": "..."}
    """
    key = get_storage_key()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> Tuple[bytes, str]:
    """
    Download file from object storage.
    Returns (content_bytes, content_type)
    """
    key = get_storage_key()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def generate_storage_path(user_id: str, filename: str) -> str:
    """
    Generate a unique storage path for a file.
    Format: {app_name}/uploads/{user_id}/{uuid}.{ext}
    """
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    unique_id = uuid.uuid4().hex
    return f"{APP_NAME}/uploads/{user_id}/{unique_id}.{ext}"

def get_content_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    return MIME_TYPES.get(ext, "application/octet-stream")
