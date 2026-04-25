"""
Workers Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
from dependencies import get_current_user
from database import db
from models.user import User
from models.worker import Worker, WorkerCreate, WorkerUpdate
from services.audit_log import log_audit
from services import slot_cache, outbox


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
    doc["updated_at"] = doc["created_at"]
    doc["version"] = 1
    await db.workers.insert_one(doc)
    await outbox.enqueue_event(
        "worker.created",
        {"worker_id": worker.worker_id, "location": worker.location},
        aggregate_type="worker",
        aggregate_id=worker.worker_id,
    )
    return worker.model_dump()

@router.put("/workers/{worker_id}")
async def update_worker(
    worker_id: str,
    data: WorkerUpdate,
    user: User = Depends(get_current_user),
    expected_version: Optional[int] = Header(None, alias="If-Match-Version"),
):
    """Update worker"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    before = await db.workers.find_one({"worker_id": worker_id}, {"_id": 0})
    if not before:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    if expected_version is not None and int(before.get("version", 1)) != expected_version:
        raise HTTPException(status_code=409, detail="A dolgozó időközben módosult")

    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {
            "$set": {
                **update_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "version": int(before.get("version", 1)) + 1,
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    await log_audit(
        "update",
        "worker",
        worker_id,
        user_id=user.user_id,
        user_name=user.name,
        changes={k: {"from": before.get(k), "to": v} for k, v in update_data.items()},
    )
    slot_cache.invalidate_slots(location=before.get("location"))
    await outbox.enqueue_event(
        "worker.updated",
        {"worker_id": worker_id, "changes": list(update_data.keys())},
        aggregate_type="worker",
        aggregate_id=worker_id,
    )
    return {"message": "Dolgozó frissítve"}

@router.delete("/workers/{worker_id}")
async def delete_worker(
    worker_id: str,
    user: User = Depends(get_current_user),
    expected_version: Optional[int] = Header(None, alias="If-Match-Version"),
):
    """Deactivate worker"""
    before = await db.workers.find_one({"worker_id": worker_id}, {"_id": 0})
    if expected_version is not None and before and int(before.get("version", 1)) != expected_version:
        raise HTTPException(status_code=409, detail="A dolgozó időközben módosult")
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {
            "$set": {
                "active": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "version": int((before or {}).get("version", 1)) + 1,
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    if before:
        await log_audit(
            "deactivate",
            "worker",
            worker_id,
            user_id=user.user_id,
            user_name=user.name,
            changes={"active": {"from": before.get("active"), "to": False}},
        )
        slot_cache.invalidate_slots(location=before.get("location"))
    await outbox.enqueue_event(
        "worker.deactivated",
        {"worker_id": worker_id},
        aggregate_type="worker",
        aggregate_id=worker_id,
    )
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
    """Add an absence record for a worker and auto-create a matching shift entry."""
    # Check worker exists
    worker = await db.workers.find_one({"worker_id": worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    # Check no duplicate absence
    existing = await db.worker_absences.find_one({"worker_id": worker_id, "date": data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Erre a napra már van hiányzás rögzítve")

    reason = data.reason or "Hiányzás"
    doc = {
        "absence_id": f"abs_{uuid.uuid4().hex[:10]}",
        "worker_id": worker_id,
        "worker_name": worker.get("name", ""),
        "date": data.date,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.worker_absences.insert_one(doc)

    # Map reason → shift type so it appears in jelenléti ív / PDF export
    shift_type_map = {
        "Betegszabadság": "sick_leave",
        "Szabadság": "vacation",
        "Szabadnap": "day_off",
    }
    shift_type = shift_type_map.get(reason, "absence")  # "absence" = unexcused/other

    # Only create a shift if none exists for this worker on this date
    existing_shift = await db.shifts.find_one(
        {"worker_id": worker_id, "start_time": {"$regex": f"^{data.date}"}}
    )
    if not existing_shift:
        shift_doc = {
            "shift_id": f"shift_{uuid.uuid4().hex[:12]}",
            "worker_id": worker_id,
            "worker_name": worker.get("name", ""),
            "location": worker.get("location", ""),
            "start_time": f"{data.date}T08:00:00",
            "end_time": f"{data.date}T16:00:00",
            "shift_type": shift_type,
            "absence_linked": doc["absence_id"],  # reference so we can delete it together
            "lunch_start": None,
            "lunch_end": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.shifts.insert_one(shift_doc)
        slot_cache.invalidate_slots(location=worker.get("location"), date=data.date)
    await outbox.enqueue_event(
        "worker.absence_created",
        {"worker_id": worker_id, "absence_id": doc["absence_id"], "date": data.date},
        aggregate_type="worker_absence",
        aggregate_id=doc["absence_id"],
    )

    return doc


@router.delete("/workers/{worker_id}/absences/{absence_id}")
async def delete_worker_absence(worker_id: str, absence_id: str, user: User = Depends(get_current_user)):
    """Delete an absence record and its linked shift entry (if any)."""
    before = await db.worker_absences.find_one({"absence_id": absence_id, "worker_id": worker_id}, {"_id": 0})
    result = await db.worker_absences.delete_one({"absence_id": absence_id, "worker_id": worker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hiányzás nem található")
    # Also remove the auto-created shift (only if it was linked to this absence)
    await db.shifts.delete_one({"absence_linked": absence_id, "worker_id": worker_id})
    if before:
        slot_cache.invalidate_slots(date=before.get("date"))
    await outbox.enqueue_event(
        "worker.absence_deleted",
        {"worker_id": worker_id, "absence_id": absence_id},
        aggregate_type="worker_absence",
        aggregate_id=absence_id,
    )
    return {"message": "Hiányzás törölve"}
