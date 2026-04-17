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
from routes.events import publish_event

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
        except (ValueError, TypeError):
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
        if existing_job:
            # Merge booking data into existing job (for phone, time_slot, car_type)
            if not existing_job.get("phone") and b.get("phone"):
                existing_job["phone"] = b.get("phone")
            if not existing_job.get("time_slot") and b.get("time_slot"):
                existing_job["time_slot"] = b.get("time_slot")
            if not existing_job.get("car_type") and b.get("car_type"):
                existing_job["car_type"] = b.get("car_type")
        else:
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
                "car_type": b.get("car_type"),
                "email": b.get("email")
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
    
    # Also create a corresponding booking so it shows on the Calendar
    booking_doc = {
        "booking_id": f"bkg_{job.job_id}",
        "customer_name": job.customer_name,
        "car_type": job.car_type or "",
        "plate_number": job.plate_number,
        "email": job.email or "",
        "phone": job.phone or "",
        "service_id": job.service_id,
        "service_name": job.service_name,
        "worker_id": job.worker_id or "",
        "worker_name": job.worker_name or "",
        "location": job.location,
        "date": doc["date"][:10],
        "time_slot": job.time_slot or (doc["date"][11:16] if len(doc["date"]) > 15 else "09:00"),
        "price": job.price,
        "status": job.status,
        "notes": job.notes or "",
        "created_at": doc["created_at"]
    }
    await db.bookings.insert_one(booking_doc)
    
    # Link the job to this booking
    await db.jobs.update_one(
        {"job_id": job.job_id},
        {"$set": {"booking_id": booking_doc["booking_id"]}}
    )
    
    result = job.model_dump()
    result["booking_id"] = booking_doc["booking_id"]
    publish_event("refresh", {"reason": "job_created"})
    return result

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
                # Update existing job with all fields
                await db.jobs.update_one(
                    {"booking_id": booking_id},
                    {"$set": update_data}
                )
                
                # ALSO update the booking to keep them in sync
                booking_sync = {"status": update_data.get("status", "folyamatban")}
                if "price" in update_data:
                    booking_sync["price"] = update_data["price"]
                if "service_id" in update_data:
                    booking_sync["service_id"] = update_data["service_id"]
                if "service_name" in update_data:
                    booking_sync["service_name"] = update_data["service_name"]
                if "worker_id" in update_data:
                    booking_sync["worker_id"] = update_data["worker_id"]
                if "worker_name" in update_data:
                    booking_sync["worker_name"] = update_data["worker_name"]
                    
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": booking_sync}
                )
                
                if update_data.get("status") == "kesz" and update_data.get("payment_method"):
                    # Update customer total_spent with the actual updated price
                    final_price = update_data.get("price", existing_job.get("price", 0))
                    await db.customers.update_one(
                        {"plate_number": booking["plate_number"]},
                        {"$inc": {"total_spent": final_price}}
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
                    "time_slot": booking.get("time_slot"),
                    "phone": booking.get("phone"),
                    "car_type": booking.get("car_type"),
                    "email": booking.get("email"),
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
            # Update booking with all provided fields (price, service, worker, etc.)
            booking_update = {}
            
            # Map job fields to booking fields
            if "price" in update_data:
                booking_update["price"] = update_data["price"]
            if "service_id" in update_data:
                booking_update["service_id"] = update_data["service_id"]
            if "service_name" in update_data:
                booking_update["service_name"] = update_data["service_name"]
            if "worker_id" in update_data:
                booking_update["worker_id"] = update_data["worker_id"]
            if "worker_name" in update_data:
                booking_update["worker_name"] = update_data["worker_name"]
            if "time_slot" in update_data:
                booking_update["time_slot"] = update_data["time_slot"]
            if "car_type" in update_data:
                booking_update["car_type"] = update_data["car_type"]
            if "phone" in update_data:
                booking_update["phone"] = update_data["phone"]
            if "notes" in update_data:
                booking_update["notes"] = update_data["notes"]
            if "status" in update_data:
                booking_update["status"] = update_data["status"]
            
            if booking_update:
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": booking_update}
                )
            
            return {"message": "Foglalás frissítve"}
    
    # Regular job update
    if "worker_id" in update_data:
        worker = await db.workers.find_one({"worker_id": update_data["worker_id"]}, {"_id": 0})
        if worker:
            update_data["worker_name"] = worker["name"]
    
    # Get the job first to check for booking_id
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")
    
    if update_data.get("status") == "kesz":
        await db.customers.update_one(
            {"customer_id": job["customer_id"]},
            {"$inc": {"total_spent": job["price"]}}
        )
    
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": update_data}
    )
    
    # Sync back to booking if this job came from a booking
    if job.get("booking_id"):
        booking_sync = {}
        if "status" in update_data:
            booking_sync["status"] = update_data["status"]
        if "price" in update_data:
            booking_sync["price"] = update_data["price"]
        if "service_name" in update_data:
            booking_sync["service_name"] = update_data["service_name"]
        if "service_id" in update_data:
            booking_sync["service_id"] = update_data["service_id"]
        if "worker_id" in update_data:
            booking_sync["worker_id"] = update_data["worker_id"]
        if "worker_name" in update_data:
            booking_sync["worker_name"] = update_data["worker_name"]
        if "payment_method" in update_data:
            booking_sync["payment_method"] = update_data["payment_method"]
        if booking_sync:
            await db.bookings.update_one(
                {"booking_id": job["booking_id"]},
                {"$set": booking_sync}
            )
    
    publish_event("refresh", {"reason": "job_updated"})
    return {"message": "Munka frissítve"}

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: User = Depends(get_current_user)):
    """Delete job"""
    result = await db.jobs.delete_one({"job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Munka nem található")
    publish_event("refresh", {"reason": "job_deleted"})
    return {"message": "Munka törölve"}
