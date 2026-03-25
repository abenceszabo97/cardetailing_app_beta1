"""
File Upload Routes - Cloudinary Integration
Images stored in Cloudinary, metadata in MongoDB
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
import uuid
import logging
from datetime import datetime, timezone
from database import db
from services.storage_service import (
    generate_signature, upload_image, delete_image, 
    get_cloudinary_config, get_optimized_url, get_thumbnail_url
)

router = APIRouter()

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def validate_file(filename: str, file_size: int):
    """Validate file extension and size"""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Nem támogatott fájltípus. Engedélyezett: {', '.join(ALLOWED_EXTENSIONS)}")
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"A fájl túl nagy. Maximum: {MAX_FILE_SIZE // (1024*1024)}MB")

@router.get("/cloudinary/config")
async def get_config():
    """Get Cloudinary configuration status"""
    return get_cloudinary_config()

@router.get("/cloudinary/signature")
async def get_upload_signature(
    folder: str = Query("uploads", description="Target folder in Cloudinary"),
    resource_type: str = Query("image", enum=["image", "video"])
):
    """
    Generate signed upload parameters for frontend direct upload.
    Frontend uses these params to upload directly to Cloudinary.
    """
    try:
        return generate_signature(folder, resource_type)
    except Exception as e:
        logging.error(f"Signature generation failed: {e}")
        raise HTTPException(status_code=500, detail="Aláírás generálás sikertelen")

@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str = Query(..., description="Entity type: job, booking, customer, blacklist"),
    entity_id: str = Query(..., description="Entity ID")
):
    """
    Upload a file via backend to Cloudinary.
    Returns file metadata including Cloudinary URL.
    """
    # Read file content
    content = await file.read()
    
    # Validate file
    validate_file(file.filename, len(content))
    
    # Determine folder based on entity type
    folder = f"{entity_type}s/{entity_id}"
    
    try:
        # Upload to Cloudinary
        result = upload_image(content, folder, file.filename)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Feltöltés sikertelen"))
        
        # Store file reference in database (metadata only)
        file_record = {
            "file_id": f"file_{uuid.uuid4().hex[:12]}",
            "cloudinary_public_id": result["public_id"],
            "url": result["url"],
            "thumbnail_url": get_thumbnail_url(result["public_id"]),
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result.get("bytes", len(content)),
            "width": result.get("width"),
            "height": result.get("height"),
            "entity_type": entity_type,
            "entity_id": entity_id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_record)
        
        # Return file info (exclude _id)
        return {
            "file_id": file_record["file_id"],
            "url": result["url"],
            "thumbnail_url": file_record["thumbnail_url"],
            "public_id": result["public_id"],
            "original_filename": file.filename,
            "size": file_record["size"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Fájl feltöltés sikertelen: {str(e)}")

@router.post("/files/upload-multiple")
async def upload_multiple_files(
    files: list[UploadFile] = File(...),
    entity_type: str = Query(..., description="Entity type: job, booking, customer"),
    entity_id: str = Query(..., description="Entity ID")
):
    """Upload multiple files at once"""
    results = []
    errors = []
    
    folder = f"{entity_type}s/{entity_id}"
    
    for file in files:
        try:
            content = await file.read()
            validate_file(file.filename, len(content))
            
            result = upload_image(content, folder, file.filename)
            
            if not result.get("success"):
                errors.append({"filename": file.filename, "error": result.get("error")})
                continue
            
            file_record = {
                "file_id": f"file_{uuid.uuid4().hex[:12]}",
                "cloudinary_public_id": result["public_id"],
                "url": result["url"],
                "thumbnail_url": get_thumbnail_url(result["public_id"]),
                "original_filename": file.filename,
                "content_type": file.content_type,
                "size": result.get("bytes", len(content)),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.files.insert_one(file_record)
            
            results.append({
                "file_id": file_record["file_id"],
                "url": result["url"],
                "thumbnail_url": file_record["thumbnail_url"],
                "original_filename": file.filename,
                "size": file_record["size"]
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {"uploaded": results, "errors": errors}

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    """Get file info by ID"""
    record = await db.files.find_one({"file_id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Fájl nem található")
    return record

@router.get("/files/entity/{entity_type}/{entity_id}")
async def get_entity_files(entity_type: str, entity_id: str):
    """Get all files for an entity (job, booking, customer)"""
    files = await db.files.find(
        {"entity_type": entity_type, "entity_id": entity_id, "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    return files

@router.delete("/files/{file_id}")
async def delete_file_endpoint(file_id: str):
    """Delete a file from Cloudinary and mark as deleted in DB"""
    record = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Fájl nem található")
    
    # Delete from Cloudinary
    if record.get("cloudinary_public_id"):
        delete_result = delete_image(record["cloudinary_public_id"])
        if not delete_result.get("success"):
            logging.warning(f"Cloudinary delete failed: {delete_result}")
    
    # Mark as deleted in DB
    result = await db.files.update_one(
        {"file_id": file_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Fájl törölve"}

# Legacy upload endpoint for backwards compatibility
@router.post("/upload")
async def legacy_upload(file: UploadFile = File(...)):
    """
    Legacy upload endpoint - uploads to 'uploads' folder.
    Returns URL for backwards compatibility with existing code.
    """
    content = await file.read()
    validate_file(file.filename, len(content))
    
    result = upload_image(content, "uploads", file.filename)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Feltöltés sikertelen"))
    
    # Return in legacy format
    return {"url": result["url"]}
