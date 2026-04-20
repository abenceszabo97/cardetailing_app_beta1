"""
Blacklist Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import db
from models.user import User
from models.blacklist import BlacklistEntry, BlacklistCreate

router = APIRouter()

@router.get("/blacklist")
async def get_blacklist(user: User = Depends(get_current_user)):
    """Get all blacklisted customers"""
    blacklist = await db.blacklist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return blacklist

@router.post("/blacklist")
async def add_to_blacklist(data: BlacklistCreate, user: User = Depends(get_current_user)):
    """Add customer to blacklist"""
    plate = data.plate_number.upper().strip()
    
    existing = await db.blacklist.find_one({"plate_number": plate})
    if existing:
        raise HTTPException(status_code=400, detail="Ez a rendszám már a tiltólistán van")
    
    customer = await db.customers.find_one({"plate_number": plate}, {"_id": 0})
    customer_name = customer.get("name") if customer else None
    
    entry = BlacklistEntry(
        plate_number=plate,
        customer_name=customer_name,
        reason=data.reason,
        evidence_images=data.evidence_images or [],
        added_by=user.user_id,
        added_by_name=user.name
    )
    
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.blacklist.insert_one(doc)
    
    if customer:
        await db.customers.update_one(
            {"plate_number": plate},
            {"$set": {"blacklisted": True, "blacklist_reason": data.reason}}
        )
    
    return entry.model_dump()

@router.delete("/blacklist/{plate_number}")
async def remove_from_blacklist(plate_number: str, user: User = Depends(get_current_user)):
    """Remove customer from blacklist"""
    plate = plate_number.upper().strip()
    result = await db.blacklist.delete_one({"plate_number": plate})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rendszám nincs a tiltólistán")
    
    await db.customers.update_one(
        {"plate_number": plate},
        {"$set": {"blacklisted": False}, "$unset": {"blacklist_reason": ""}}
    )
    
    return {"message": "Eltávolítva a tiltólistáról"}

@router.get("/blacklist/check/{plate_number}")
async def check_blacklist(plate_number: str):
    """Check if a plate number is blacklisted (public for booking page)"""
    plate = plate_number.upper().strip()
    entry = await db.blacklist.find_one({"plate_number": plate}, {"_id": 0})
    if entry:
        return {"blacklisted": True}
    return {"blacklisted": False}
