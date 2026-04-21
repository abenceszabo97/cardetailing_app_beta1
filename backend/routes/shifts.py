"""
Shifts Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
from dependencies import get_current_user
from database import db
from models.user import User
from models.shift import Shift, ShiftCreate, ShiftUpdate

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
        end_time=data.end_time,
        shift_type=data.shift_type,
        lunch_start=data.lunch_start,
        lunch_end=data.lunch_end
    )
    
    doc = shift.model_dump()
    doc["start_time"] = doc["start_time"].isoformat()
    doc["end_time"] = doc["end_time"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.shifts.insert_one(doc)
    
    return shift.model_dump()

@router.put("/shifts/{shift_id}")
async def update_shift(shift_id: str, data: ShiftUpdate, user: User = Depends(get_current_user)):
    """Update shift"""
    update_data = {}
    
    for k, v in data.model_dump().items():
        if v is not None:
            if k in ["start_time", "end_time"] and isinstance(v, datetime):
                update_data[k] = v.isoformat()
            else:
                update_data[k] = v
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    # If worker_id changed, update worker_name too
    if "worker_id" in update_data:
        worker = await db.workers.find_one({"worker_id": update_data["worker_id"]}, {"_id": 0})
        if worker:
            update_data["worker_name"] = worker["name"]
    
    result = await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Műszak nem található")
    
    return {"message": "Műszak frissítve"}

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
    
    VALID_LOCATIONS = ["Debrecen", "Budapest"]
    worker_query = {"location": {"$in": VALID_LOCATIONS}, "active": True}
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

    # For jobs without extras (older records), fall back to the linked booking's extras
    booking_ids_needed = [j["booking_id"] for j in all_jobs if j.get("booking_id") and not j.get("extras")]
    booking_extras_map = {}
    if booking_ids_needed:
        linked_bookings = await db.bookings.find(
            {"booking_id": {"$in": booking_ids_needed}},
            {"_id": 0, "booking_id": 1, "extras": 1}
        ).to_list(5000)
        booking_extras_map = {b["booking_id"]: b.get("extras") or [] for b in linked_bookings}

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
        # Count total services: each job = 1 main service + number of extras
        # Fall back to linked booking's extras for older job records that lack the field
        def _extras_count(j):
            extras = j.get("extras")
            if not extras and j.get("booking_id"):
                extras = booking_extras_map.get(j["booking_id"], [])
            return len(extras) if isinstance(extras, list) else 0

        services_count = sum(1 + _extras_count(j) for j in worker_jobs)
        revenue = sum(j.get("price", 0) for j in worker_jobs)
        cash = sum(j.get("price", 0) for j in worker_jobs if j.get("payment_method") == "keszpenz")
        card = sum(j.get("price", 0) for j in worker_jobs if j.get("payment_method") in ("kartya", "utalas"))

        result.append({
            "worker_id": wid,
            "name": worker.get("name", ""),
            "location": worker.get("location", ""),
            "days_worked": len(days_set),
            "hours_worked": round(total_hours, 1),
            "cars_completed": cars_count,
            "services_completed": services_count,
            "revenue": revenue,
            "cash": cash,
            "card": card,
        })
    
    return result

@router.get("/shifts/attendance-report")
async def get_attendance_report(month: Optional[str] = None, worker_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get detailed attendance report for PDF generation"""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    query = {"start_time": {"$regex": f"^{month}"}}
    if worker_id:
        query["worker_id"] = worker_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_time", 1).to_list(500)
    
    # Group by worker
    workers_data = {}
    for shift in shifts:
        wid = shift["worker_id"]
        if wid not in workers_data:
            workers_data[wid] = {
                "worker_id": wid,
                "worker_name": shift.get("worker_name", ""),
                "shifts": [],
                "total_hours": 0,
                "normal_days": 0,
                "vacation_days": 0,
                "sick_days": 0,
                "absence_days": 0
            }
        
        start = datetime.fromisoformat(shift["start_time"])
        end = datetime.fromisoformat(shift["end_time"])
        hours = (end - start).total_seconds() / 3600
        
        # Subtract lunch if exists
        if shift.get("lunch_start") and shift.get("lunch_end"):
            try:
                lunch_start = datetime.strptime(shift["lunch_start"], "%H:%M")
                lunch_end = datetime.strptime(shift["lunch_end"], "%H:%M")
                lunch_hours = (lunch_end - lunch_start).total_seconds() / 3600
                hours -= lunch_hours
            except:
                pass
        
        shift_type = shift.get("shift_type", "normal")
        
        workers_data[wid]["shifts"].append({
            "date": start.strftime("%Y-%m-%d"),
            "day_name": start.strftime("%A"),
            "start_time": start.strftime("%H:%M"),
            "end_time": end.strftime("%H:%M"),
            "hours": round(hours, 2),
            "shift_type": shift_type,
            "lunch": f"{shift.get('lunch_start', '')}-{shift.get('lunch_end', '')}" if shift.get('lunch_start') else None
        })
        
        if shift_type == "normal":
            workers_data[wid]["total_hours"] += hours
            workers_data[wid]["normal_days"] += 1
        elif shift_type == "vacation":
            workers_data[wid]["vacation_days"] += 1
        elif shift_type == "sick_leave":
            workers_data[wid]["sick_days"] += 1
        elif shift_type == "absence":
            workers_data[wid]["absence_days"] = workers_data[wid].get("absence_days", 0) + 1
    
    # Round totals
    for wid in workers_data:
        workers_data[wid]["total_hours"] = round(workers_data[wid]["total_hours"], 1)
    
    return {
        "month": month,
        "workers": list(workers_data.values())
    }

@router.get("/shifts/leave-stats")
async def get_leave_stats(year: Optional[str] = None, worker_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get vacation and sick leave statistics"""
    if not year:
        year = datetime.now(timezone.utc).strftime("%Y")
    
    query = {"start_time": {"$regex": f"^{year}"}}
    if worker_id:
        query["worker_id"] = worker_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
    
    # Group by worker
    stats = {}
    for shift in shifts:
        wid = shift["worker_id"]
        if wid not in stats:
            stats[wid] = {
                "worker_id": wid,
                "worker_name": shift.get("worker_name", ""),
                "vacation_days": 0,
                "sick_days": 0,
                "normal_days": 0
            }
        
        shift_type = shift.get("shift_type", "normal")
        if shift_type == "vacation":
            stats[wid]["vacation_days"] += 1
        elif shift_type == "sick_leave":
            stats[wid]["sick_days"] += 1
        else:
            stats[wid]["normal_days"] += 1
    
    return {
        "year": year,
        "workers": list(stats.values())
    }

