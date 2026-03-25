"""
Jobs Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from database import db
from models.user import User
from models.job import Job, JobCreate, JobUpdate, IMAGE_SLOT_LABELS_BEFORE, IMAGE_SLOT_LABELS_AFTER, IMAGE_SLOTS_BEFORE, IMAGE_SLOTS_AFTER

router = APIRouter()

@router.get("/jobs/image-slots")
async def get_image_slots():
    """Get image slot definitions for before/after photos"""
    return {
        "before": {
            "slots": IMAGE_SLOTS_BEFORE,
            "labels": IMAGE_SLOT_LABELS_BEFORE
        },
        "after": {
            "slots": IMAGE_SLOTS_AFTER,
            "labels": IMAGE_SLOT_LABELS_AFTER
        }
    }

@router.get("/jobs")
async def get_jobs(
    location: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    worker_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get jobs with filters"""
    query = {}
    
    if location:
        query["location"] = location
    
    if date:
        try:
            date_obj = datetime.fromisoformat(date.replace("Z", "+00:00"))
            start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            query["date"] = {
                "$gte": start_of_day.isoformat(),
                "$lt": end_of_day.isoformat()
            }
        except:
            pass
    
    if status:
        query["status"] = status
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query["worker_id"] = worker["worker_id"]
    elif worker_id:
        query["worker_id"] = worker_id
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return jobs

@router.get("/jobs/today")
async def get_today_jobs(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get today's jobs including bookings"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    today_str = today.strftime("%Y-%m-%d")
    
    query = {
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }
    
    if location:
        query["location"] = location
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query["worker_id"] = worker["worker_id"]
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Also get today's bookings
    booking_query = {"date": today_str, "status": {"$nin": ["lemondta", "nem_jott_el"]}}
    if location:
        booking_query["location"] = location
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            booking_query["worker_id"] = worker["worker_id"]
    
    bookings = await db.bookings.find(booking_query, {"_id": 0}).to_list(500)
    
    for b in bookings:
        existing_job = next((j for j in jobs if j.get("booking_id") == b["booking_id"]), None)
        if not existing_job:
            jobs.append({
                "job_id": f"bkg_{b['booking_id']}",
                "booking_id": b["booking_id"],
                "customer_name": b["customer_name"],
                "plate_number": b["plate_number"],
                "service_id": b.get("service_id"),
                "service_name": b.get("service_name"),
                "worker_id": b.get("worker_id"),
                "worker_name": b.get("worker_name"),
                "location": b["location"],
                "date": f"{b['date']}T{b['time_slot']}:00",
                "time_slot": b.get("time_slot"),
                "price": b.get("price", 0),
                "status": "foglalt" if b.get("status") == "foglalt" else b.get("status", "foglalt"),
                "is_booking": True,
                "phone": b.get("phone"),
                "car_type": b.get("car_type")
            })
    
    jobs.sort(key=lambda x: x.get("date", "") or x.get("time_slot", ""))
    return jobs

@router.post("/jobs")
async def create_job(data: JobCreate, user: User = Depends(get_current_user)):
    """Create new job"""
    customer = await db.customers.find_one({"customer_id": data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    
    worker_name = None
    if data.worker_id:
        worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
        if worker:
            worker_name = worker["name"]
    
    job = Job(
        customer_id=data.customer_id,
        customer_name=customer["name"],
        plate_number=customer["plate_number"],
        service_id=data.service_id,
        service_name=service["name"],
        worker_id=data.worker_id,
        worker_name=worker_name,
        price=data.price,
        location=data.location,
        date=data.date,
        time_slot=data.time_slot,
        car_type=data.car_type or customer.get("car_type"),
        phone=data.phone or customer.get("phone"),
        email=data.email or customer.get("email"),
        notes=data.notes
    )
    
    doc = job.model_dump()
    doc["date"] = doc["date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.jobs.insert_one(doc)
    
    return job.model_dump()

@router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobUpdate, user: User = Depends(get_current_user)):
    """Update job - also handles booking to job conversion"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Check if this is a booking reference (starts with bkg_)
    if job_id.startswith("bkg_"):
        # The job_id format is "bkg_{booking_id}" where booking_id is like "bkg_xxx"
        # So we remove only the first "bkg_" prefix
        booking_id = job_id[4:]  # Remove first "bkg_" prefix
        
        booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Foglalás nem található")
        
        # If status is being changed to "folyamatban" or "kesz", convert booking to job
        if update_data.get("status") in ["folyamatban", "kesz"]:
            # Check if job already exists for this booking
            existing_job = await db.jobs.find_one({"booking_id": booking_id}, {"_id": 0})
            
            if existing_job:
                # Update existing job
                result = await db.jobs.update_one(
                    {"booking_id": booking_id},
                    {"$set": update_data}
                )
                if update_data.get("status") == "kesz" and update_data.get("payment_method"):
                    # Update customer total_spent
                    await db.customers.update_one(
                        {"plate_number": booking["plate_number"]},
                        {"$inc": {"total_spent": booking.get("price", 0)}}
                    )
                return {"message": "Munka frissítve"}
            else:
                # Create new job from booking
                from models.job import Job
                import uuid
                
                new_job_id = f"job_{uuid.uuid4().hex[:12]}"
                job_data = {
                    "job_id": new_job_id,
                    "booking_id": booking_id,
                    "customer_id": booking.get("customer_id", ""),
                    "customer_name": booking["customer_name"],
                    "plate_number": booking["plate_number"],
                    "service_id": booking.get("service_id", ""),
                    "service_name": booking.get("service_name", ""),
                    "worker_id": booking.get("worker_id", ""),
                    "worker_name": booking.get("worker_name", ""),
                    "price": booking.get("price", 0),
                    "status": update_data.get("status", "folyamatban"),
                    "location": booking.get("location", ""),
                    "payment_method": update_data.get("payment_method"),
                    "date": datetime.fromisoformat(f"{booking['date']}T{booking.get('time_slot', '00:00')}:00").isoformat(),
                    "notes": booking.get("notes", ""),
                    "images_before": {},
                    "images_after": {},
                    "images_before_legacy": [],
                    "images_after_legacy": [],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.jobs.insert_one(job_data)
                
                # Update booking status
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": {"status": update_data.get("status", "folyamatban")}}
                )
                
                if update_data.get("status") == "kesz" and update_data.get("payment_method"):
                    # Update customer total_spent
                    await db.customers.update_one(
                        {"plate_number": booking["plate_number"]},
                        {"$inc": {"total_spent": booking.get("price", 0)}}
                    )
                
                return {"message": "Munka létrehozva a foglalásból"}
        else:
            # Just update booking status
            await db.bookings.update_one(
                {"booking_id": booking_id},
                {"$set": {"status": update_data.get("status", booking.get("status"))}}
            )
            return {"message": "Foglalás státusza frissítve"}
    
    # Regular job update
    if "worker_id" in update_data:
        worker = await db.workers.find_one({"worker_id": update_data["worker_id"]}, {"_id": 0})
        if worker:
            update_data["worker_name"] = worker["name"]
    
    if update_data.get("status") == "kesz":
        job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
        if job:
            await db.customers.update_one(
                {"customer_id": job["customer_id"]},
                {"$inc": {"total_spent": job["price"]}}
            )
    
    result = await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Munka nem található")
    
    return {"message": "Munka frissítve"}

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: User = Depends(get_current_user)):
    """Delete job"""
    result = await db.jobs.delete_one({"job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Munka nem található")
    return {"message": "Munka törölve"}
