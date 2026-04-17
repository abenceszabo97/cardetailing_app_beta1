"""
Customers Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user
from database import db
from models.user import User
from models.customer import Customer, CustomerCreate

router = APIRouter()

@router.get("/customers")
async def get_customers(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all customers, optionally filtered by location"""
    query = {}
    if location and location != "all":
        query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    return customers

@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: User = Depends(get_current_user)):
    """Get customer by ID"""
    customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    # Search jobs by both customer_id AND plate_number for complete history
    plate = customer.get("plate_number", "")
    jobs_query = {"$or": [{"customer_id": customer_id}]}
    if plate:
        jobs_query["$or"].append({"plate_number": plate})
    jobs = await db.jobs.find(jobs_query, {"_id": 0}).sort("date", -1).to_list(100)
    
    # Deduplicate by job_id
    seen = set()
    unique_jobs = []
    for j in jobs:
        jid = j.get("job_id")
        if jid and jid not in seen:
            seen.add(jid)
            unique_jobs.append(j)
    
    # Also include completed bookings that were never converted to jobs
    if plate:
        bookings = await db.bookings.find(
            {"plate_number": plate, "status": {"$in": ["kesz", "folyamatban", "foglalt"]}},
            {"_id": 0}
        ).sort("date", -1).to_list(100)
        
        existing_booking_ids = {j.get("booking_id") for j in unique_jobs if j.get("booking_id")}
        for b in bookings:
            if b.get("booking_id") not in existing_booking_ids:
                unique_jobs.append({
                    "job_id": f"bkg_{b['booking_id']}",
                    "booking_id": b["booking_id"],
                    "customer_name": b.get("customer_name", ""),
                    "plate_number": b.get("plate_number", ""),
                    "service_name": b.get("service_name", ""),
                    "worker_name": b.get("worker_name", ""),
                    "price": b.get("price", 0),
                    "status": b.get("status", "foglalt"),
                    "date": f"{b['date']}T{b.get('time_slot', '00:00')}:00",
                    "location": b.get("location", ""),
                    "is_booking": True
                })
    
    unique_jobs.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"customer": customer, "jobs": unique_jobs}

@router.post("/customers")
async def create_customer(data: CustomerCreate, user: User = Depends(get_current_user)):
    """Create new customer"""
    customer = Customer(**data.model_dump())
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.customers.insert_one(doc)
    return customer.model_dump()

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: CustomerCreate, user: User = Depends(get_current_user)):
    """Update customer"""
    result = await db.customers.update_one(
        {"customer_id": customer_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    return {"message": "Ügyfél frissítve"}

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: User = Depends(get_current_user)):
    """Delete customer"""
    result = await db.customers.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    return {"message": "Ügyfél törölve"}
