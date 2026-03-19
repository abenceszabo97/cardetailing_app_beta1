"""
Customers Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import db
from models.user import User
from models.customer import Customer, CustomerCreate

router = APIRouter()

@router.get("/customers")
async def get_customers(user: User = Depends(get_current_user)):
    """Get all customers"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return customers

@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: User = Depends(get_current_user)):
    """Get customer by ID"""
    customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    jobs = await db.jobs.find({"customer_id": customer_id}, {"_id": 0}).sort("date", -1).to_list(100)
    
    return {"customer": customer, "jobs": jobs}

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
