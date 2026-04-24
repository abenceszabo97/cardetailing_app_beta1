"""
Blacklist Routes
"""
from fastapi import APIRouter, Depends, HTTPException
import re
from dependencies import get_current_user
from database import db
from models.user import User
from models.blacklist import BlacklistEntry, BlacklistCreate

router = APIRouter()


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D+", "", value)
    if digits.startswith("36") and len(digits) > 9:
        digits = digits[2:]
    elif digits.startswith("06"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    return digits[-9:] if digits else None


def _parse_address_parts(address_value: str | None) -> tuple[str | None, str | None, str | None]:
    if not address_value:
        return (None, None, None)
    cleaned = str(address_value).strip()
    match = re.match(r"^(\d{4})\s+([^,]+),?\s*(.*)$", cleaned)
    if match:
        zip_code = match.group(1).strip() or None
        city = match.group(2).strip() or None
        street = match.group(3).strip() or None
        return (zip_code, city, street)
    return (None, None, cleaned or None)

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
    resolved_phone = data.phone or (customer.get("phone") if customer else None)
    address_zip = data.address_zip
    address_city = data.address_city
    address_street = data.address_street
    if customer and not (address_zip and address_city and address_street):
        parsed_zip, parsed_city, parsed_street = _parse_address_parts(customer.get("address"))
        address_zip = address_zip or parsed_zip
        address_city = address_city or parsed_city
        address_street = address_street or parsed_street
    
    entry = BlacklistEntry(
        plate_number=plate,
        phone=resolved_phone,
        address_zip=address_zip,
        address_city=address_city,
        address_street=address_street,
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
        return {"blacklisted": True, "reason": entry.get("reason")}
    return {"blacklisted": False}
