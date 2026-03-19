"""
Inventory Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user
from database import db
from models.user import User
from models.inventory import Inventory, InventoryCreate, InventoryUpdate

router = APIRouter()

@router.get("/inventory")
async def get_inventory(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get inventory"""
    query = {}
    if location:
        query["location"] = location
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return inventory

@router.post("/inventory")
async def create_inventory(data: InventoryCreate, user: User = Depends(get_current_user)):
    """Create inventory item"""
    item = Inventory(**data.model_dump())
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.inventory.insert_one(doc)
    return item.model_dump()

@router.put("/inventory/{inventory_id}")
async def update_inventory(inventory_id: str, data: InventoryUpdate, user: User = Depends(get_current_user)):
    """Update inventory item"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.inventory.update_one(
        {"inventory_id": inventory_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    
    return {"message": "Készlet frissítve"}

@router.delete("/inventory/{inventory_id}")
async def delete_inventory(inventory_id: str, user: User = Depends(get_current_user)):
    """Delete inventory item"""
    result = await db.inventory.delete_one({"inventory_id": inventory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    return {"message": "Készlet törölve"}
