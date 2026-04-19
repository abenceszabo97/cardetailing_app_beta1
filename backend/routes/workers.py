"""
Workers Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
from dependencies import get_current_user
from database import db
from models.user import User
from models.worker import Worker, WorkerCreate, WorkerUpdate


class AbsenceCreate(BaseModel):
    date: str  # "YYYY-MM-DD"
    reason: Optional[str] = None  # "Betegszabadság", "Szabadság", etc.

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


# ============== WORKER ABSENCES ==============

@router.get("/workers/absences/all")
async def get_all_absences(date_from: Optional[str] = None, date_to: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all worker absences in a date range (for calendar overlay)"""
    query = {}
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        query["date"] = {"$gte": date_from}
    absences = await db.worker_absences.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return absences


@router.get("/workers/{worker_id}/absences")
async def get_worker_absences(worker_id: str, user: User = Depends(get_current_user)):
    """Get absences for a specific worker"""
    absences = await db.worker_absences.find(
        {"worker_id": worker_id}, {"_id": 0}
    ).sort("date", 1).to_list(200)
    return absences


@router.post("/workers/{worker_id}/absences")
async def add_worker_absence(worker_id: str, data: AbsenceCreate, user: User = Depends(get_current_user)):
    """Add an absence record for a worker"""
    # Check worker exists
    worker = await db.workers.find_one({"worker_id": worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    # Check no duplicate
    existing = await db.worker_absences.find_one({"worker_id": worker_id, "date": data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Erre a napra már van hiányzás rögzítve")
    doc = {
        "absence_id": f"abs_{uuid.uuid4().hex[:10]}",
        "worker_id": worker_id,
        "worker_name": worker.get("name", ""),
        "date": data.date,
        "reason": data.reason or "Hiányzás",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.worker_absences.insert_one(doc)
    del doc["_id"]
    return doc


@router.delete("/workers/{worker_id}/absences/{absence_id}")
async def delete_worker_absence(worker_id: str, absence_id: str, user: User = Depends(get_current_user)):
    """Delete an absence record"""
    result = await db.worker_absences.delete_one({"absence_id": absence_id, "worker_id": worker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hiányzás nem található")
    return {"message": "Hiányzás törölve"}
