"""
Shifts Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
from dependencies import get_current_user
from database import db
from models.user import User
from models.shift import Shift, ShiftCreate

router = APIRouter()

@router.get("/shifts")
async def get_shifts(
    location: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get shifts"""
    query = {}
    
    if location:
        query["location"] = location
    
    if start_date and end_date:
        query["start_time"] = {"$gte": start_date}
        query["end_time"] = {"$lte": end_date}
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_time", 1).to_list(1000)
    return shifts

@router.post("/shifts")
async def create_shift(data: ShiftCreate, user: User = Depends(get_current_user)):
    """Create shift"""
    worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    shift = Shift(
        worker_id=data.worker_id,
        worker_name=worker["name"],
        location=data.location,
        start_time=data.start_time,
        end_time=data.end_time
    )
    
    doc = shift.model_dump()
    doc["start_time"] = doc["start_time"].isoformat()
    doc["end_time"] = doc["end_time"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.shifts.insert_one(doc)
    
    return shift.model_dump()

@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    """Delete shift"""
    result = await db.shifts.delete_one({"shift_id": shift_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Műszak nem található")
    return {"message": "Műszak törölve"}

@router.get("/stats/worker-monthly")
async def get_worker_monthly_stats(month: Optional[str] = None, location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get monthly statistics per worker"""
    if month:
        year, m = month.split("-")
        month_start = datetime(int(year), int(m), 1, tzinfo=timezone.utc)
    else:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    
    worker_query = {}
    if location and location != "all":
        worker_query["location"] = location
    all_workers = await db.workers.find(worker_query, {"_id": 0}).to_list(100)
    
    shift_query = {
        "start_time": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
    }
    if location and location != "all":
        shift_query["location"] = location
    all_shifts = await db.shifts.find(shift_query, {"_id": 0}).to_list(5000)
    
    job_query = {
        "status": "kesz",
        "date": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
    }
    if location and location != "all":
        job_query["location"] = location
    all_jobs = await db.jobs.find(job_query, {"_id": 0}).to_list(5000)
    
    result = []
    for worker in all_workers:
        wid = worker["worker_id"]
        
        worker_shifts = [s for s in all_shifts if s.get("worker_id") == wid]
        
        days_set = set()
        total_hours = 0.0
        for s in worker_shifts:
            try:
                start = datetime.fromisoformat(s["start_time"])
                end = datetime.fromisoformat(s["end_time"])
                days_set.add(start.strftime("%Y-%m-%d"))
                total_hours += (end - start).total_seconds() / 3600.0
            except (ValueError, KeyError):
                pass
        
        worker_jobs = [j for j in all_jobs if j.get("worker_id") == wid]
        cars_count = len(worker_jobs)
        revenue = sum(j.get("price", 0) for j in worker_jobs)
        
        result.append({
            "worker_id": wid,
            "name": worker.get("name", ""),
            "location": worker.get("location", ""),
            "days_worked": len(days_set),
            "hours_worked": round(total_hours, 1),
            "cars_completed": cars_count,
            "revenue": revenue
        })
    
    return result
