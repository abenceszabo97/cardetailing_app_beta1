"""
Attendance Routes - Worker Check-in/Check-out
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from database import db
from models.user import User
from models.attendance import Attendance, AttendanceCheckIn, AttendanceCheckOut

router = APIRouter()

@router.get("/attendance")
async def get_attendance(
    location: Optional[str] = None,
    date: Optional[str] = None,
    worker_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get attendance records"""
    query = {}
    
    if location:
        query["location"] = location
    if date:
        query["date"] = date
    if worker_id:
        query["worker_id"] = worker_id
    
    records = await db.attendance.find(query, {"_id": 0}).sort("check_in", -1).to_list(500)
    return records

@router.get("/attendance/today")
async def get_today_attendance(
    location: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get today's attendance for all workers"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": today}
    if location:
        query["location"] = location
    
    records = await db.attendance.find(query, {"_id": 0}).to_list(100)
    return records

@router.get("/attendance/worker/{worker_id}")
async def get_worker_attendance(
    worker_id: str,
    month: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get attendance records for a specific worker"""
    query = {"worker_id": worker_id}
    
    if month:
        # Format: YYYY-MM
        query["date"] = {"$regex": f"^{month}"}
    
    records = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return records

@router.post("/attendance/check-in")
async def check_in(data: AttendanceCheckIn, user: User = Depends(get_current_user)):
    """Worker check-in"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    
    # Check if already checked in today
    existing = await db.attendance.find_one({
        "worker_id": data.worker_id,
        "date": today,
        "status": {"$in": ["checked_in", "checked_out"]}
    })
    
    if existing:
        if existing["status"] == "checked_in":
            raise HTTPException(status_code=400, detail="Már bejelentkeztél ma")
        else:
            raise HTTPException(status_code=400, detail="Már kijelentkeztél ma, új bejelentkezés nem lehetséges")
    
    # Get worker info
    worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    attendance = Attendance(
        worker_id=data.worker_id,
        worker_name=worker["name"],
        location=data.location,
        date=today,
        check_in=now,
        status="checked_in",
        notes=data.notes
    )
    
    doc = attendance.model_dump()
    doc["check_in"] = doc["check_in"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.attendance.insert_one(doc)
    
    return {
        "message": "Sikeres bejelentkezés",
        "check_in": now.isoformat(),
        "attendance_id": attendance.attendance_id
    }

@router.post("/attendance/check-out")
async def check_out(data: AttendanceCheckOut, user: User = Depends(get_current_user)):
    """Worker check-out"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    
    # Find today's check-in
    record = await db.attendance.find_one({
        "worker_id": data.worker_id,
        "date": today,
        "status": "checked_in"
    })
    
    if not record:
        raise HTTPException(status_code=400, detail="Nincs aktív bejelentkezés")
    
    # Calculate hours worked
    check_in_time = datetime.fromisoformat(record["check_in"])
    hours_worked = (now - check_in_time).total_seconds() / 3600
    
    # Update record
    update_data = {
        "check_out": now.isoformat(),
        "status": "checked_out",
        "hours_worked": round(hours_worked, 2)
    }
    
    if data.notes:
        existing_notes = record.get("notes", "")
        update_data["notes"] = f"{existing_notes}\nKijelentkezés: {data.notes}".strip()
    
    await db.attendance.update_one(
        {"attendance_id": record["attendance_id"]},
        {"$set": update_data}
    )
    
    return {
        "message": "Sikeres kijelentkezés",
        "check_out": now.isoformat(),
        "hours_worked": round(hours_worked, 2)
    }

@router.get("/attendance/stats/{worker_id}")
async def get_worker_attendance_stats(
    worker_id: str,
    month: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get attendance statistics for a worker"""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    records = await db.attendance.find({
        "worker_id": worker_id,
        "date": {"$regex": f"^{month}"},
        "status": "checked_out"
    }, {"_id": 0}).to_list(100)
    
    total_days = len(records)
    total_hours = sum(r.get("hours_worked", 0) for r in records)
    avg_hours = total_hours / total_days if total_days > 0 else 0
    
    return {
        "worker_id": worker_id,
        "month": month,
        "total_days_worked": total_days,
        "total_hours_worked": round(total_hours, 2),
        "average_hours_per_day": round(avg_hours, 2)
    }

@router.delete("/attendance/{attendance_id}")
async def delete_attendance(attendance_id: str, user: User = Depends(get_current_user)):
    """Delete an attendance record (admin only)"""
    result = await db.attendance.delete_one({"attendance_id": attendance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Jelenléti rekord nem található")
    return {"message": "Jelenléti rekord törölve"}
