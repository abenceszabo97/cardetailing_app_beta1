"""
File Upload Routes - Object Storage Integration
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Request
from fastapi.responses import Response
import uuid
import logging
from datetime import datetime, timezone
from database import db
from services.storage_service import put_object, get_object, generate_storage_path, get_content_type

router = APIRouter()

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'}

def validate_file(filename: str, file_size: int):
    """Validate file extension and size"""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Nem támogatott fájltípus. Engedélyezett: {', '.join(ALLOWED_EXTENSIONS)}")
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"A fájl túl nagy. Maximum: {MAX_FILE_SIZE // (1024*1024)}MB")

@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str = Query(..., description="Entity type: job, booking, customer"),
    entity_id: str = Query(..., description="Entity ID")
):
    """
    Upload a file to object storage.
    Returns file metadata including storage path.
    """
    # Read file content
    content = await file.read()
    
    # Validate file
    validate_file(file.filename, len(content))
    
    # Generate unique storage path
    storage_path = generate_storage_path(entity_id, file.filename)
    content_type = file.content_type or get_content_type(file.filename)
    
    try:
        # Upload to object storage
        result = put_object(storage_path, content, content_type)
        
        # Store file reference in database
        file_record = {
            "file_id": f"file_{uuid.uuid4().hex[:12]}",
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(content)),
            "entity_type": entity_type,
            "entity_id": entity_id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_record)
        
        # Return file info (exclude _id)
        return {
            "file_id": file_record["file_id"],
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": file_record["size"]
        }
        
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
    
    for file in files:
        try:
            content = await file.read()
            validate_file(file.filename, len(content))
            
            storage_path = generate_storage_path(entity_id, file.filename)
            content_type = file.content_type or get_content_type(file.filename)
            
            result = put_object(storage_path, content, content_type)
            
            file_record = {
                "file_id": f"file_{uuid.uuid4().hex[:12]}",
                "storage_path": result["path"],
                "original_filename": file.filename,
                "content_type": content_type,
                "size": result.get("size", len(content)),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.files.insert_one(file_record)
            
            results.append({
                "file_id": file_record["file_id"],
                "storage_path": result["path"],
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

@router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    """Download file by ID"""
    record = await db.files.find_one({"file_id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Fájl nem található")
    
    try:
        content, content_type = get_object(record["storage_path"])
        return Response(
            content=content,
            media_type=record.get("content_type", content_type),
            headers={
                "Content-Disposition": f"inline; filename=\"{record['original_filename']}\""
            }
        )
    except Exception as e:
        logging.error(f"File download failed: {e}")
        raise HTTPException(status_code=500, detail="Fájl letöltés sikertelen")

@router.get("/files/entity/{entity_type}/{entity_id}")
async def get_entity_files(entity_type: str, entity_id: str):
    """Get all files for an entity (job, booking, customer)"""
    files = await db.files.find(
        {"entity_type": entity_type, "entity_id": entity_id, "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    return files

@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Soft-delete a file (mark as deleted, storage has no delete API)"""
    result = await db.files.update_one(
        {"file_id": file_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fájl nem található")
    return {"message": "Fájl törölve"}
