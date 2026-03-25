"""
Cloudinary Storage Service - Image Upload Integration
Images stored in Cloudinary, metadata in MongoDB
"""
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import os
import time
import logging
from typing import Optional

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

ALLOWED_FOLDERS = ("jobs/", "bookings/", "customers/", "uploads/", "blacklist/")

def get_cloudinary_config():
    """Get Cloudinary configuration status"""
    return {
        "configured": bool(os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY")),
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME")
    }

def generate_signature(folder: str = "uploads", resource_type: str = "image") -> dict:
    """
    Generate signed upload parameters for frontend direct upload to Cloudinary.
    Returns signature, timestamp, and other params needed for upload.
    """
    # Validate folder
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        folder = "uploads/" + folder
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
        "resource_type": resource_type
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

def upload_image(file_bytes: bytes, folder: str = "uploads", filename: str = None) -> dict:
    """
    Upload image directly from backend (for server-side uploads).
    Automatically compresses and optimizes images for minimal storage.
    Returns Cloudinary response with url, public_id, etc.
    """
    # Validate folder
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        folder = "uploads/" + folder
    
    try:
        # Build public_id if filename provided
        public_id = None
        if filename:
            # Remove extension for public_id
            name_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
            public_id = f"{folder}/{name_without_ext}"
        
        # Upload with smart compression and optimization
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder if not public_id else None,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            invalidate=True,
            # Compression & optimization settings
            transformation=[
                {"quality": "auto"},           # Smart quality - adapts to image content
                {"width": 800, "crop": "scale"} # Max 800px wide, maintain aspect ratio
            ],
            unique_filename=True
        )
        
        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes")
        }
    except Exception as e:
        logging.error(f"Cloudinary upload failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def delete_image(public_id: str) -> dict:
    """
    Delete image from Cloudinary.
    """
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return {
            "success": result.get("result") == "ok",
            "result": result
        }
    except Exception as e:
        logging.error(f"Cloudinary delete failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def get_optimized_url(public_id: str, width: int = None, height: int = None, crop: str = "scale") -> str:
    """
    Generate optimized Cloudinary URL with transformations.
    """
    transformations = ["q_auto", "f_auto"]  # Smart quality + auto format (webp/avif)
    
    if width:
        transformations.append(f"w_{width}")
    if height:
        transformations.append(f"h_{height}")
    if crop and (width or height):
        transformations.append(f"c_{crop}")
    
    transform_str = ",".join(transformations)
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/{transform_str}/{public_id}"

def get_thumbnail_url(public_id: str, size: int = 150) -> str:
    """
    Generate small thumbnail URL for previews.
    """
    return get_optimized_url(public_id, width=size, height=size, crop="scale")
