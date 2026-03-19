"""
Workers Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user
from database import db
from models.user import User
from models.worker import Worker, WorkerCreate, WorkerUpdate

router = APIRouter()

@router.get("/workers")
async def get_workers(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all workers"""
    query = {"active": True}
    if location:
        query["location"] = location
    workers = await db.workers.find(query, {"_id": 0}).to_list(1000)
    return workers

@router.post("/workers")
async def create_worker(data: WorkerCreate, user: User = Depends(get_current_user)):
    """Create new worker"""
    worker = Worker(**data.model_dump())
    doc = worker.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.workers.insert_one(doc)
    return worker.model_dump()

@router.put("/workers/{worker_id}")
async def update_worker(worker_id: str, data: WorkerUpdate, user: User = Depends(get_current_user)):
    """Update worker"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    return {"message": "Dolgozó frissítve"}

@router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, user: User = Depends(get_current_user)):
    """Deactivate worker"""
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    return {"message": "Dolgozó törölve"}
