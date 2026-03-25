"""
Inventory Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user
from database import db
from models.user import User
from models.inventory import Inventory, InventoryCreate, InventoryUpdate, calculate_status

router = APIRouter()

@router.get("/inventory")
async def get_inventory(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get inventory with auto-calculated status"""
    query = {}
    if location:
        query["location"] = location
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    
    # Auto-calculate status for each item
    for item in inventory:
        item["status"] = calculate_status(item["current_quantity"], item["min_level"])
    
    return inventory

@router.get("/inventory/low-stock")
async def get_low_stock(user: User = Depends(get_current_user)):
    """Get items with low stock (below min_level)"""
    # Find items where current_quantity <= min_level
    pipeline = [
        {"$match": {"$expr": {"$lte": ["$current_quantity", "$min_level"]}}},
        {"$project": {"_id": 0}}
    ]
    low_stock = await db.inventory.aggregate(pipeline).to_list(100)
    
    # Add status to each item
    for item in low_stock:
        item["status"] = calculate_status(item["current_quantity"], item["min_level"])
    
    return low_stock

@router.post("/inventory")
async def create_inventory(data: InventoryCreate, user: User = Depends(get_current_user)):
    """Create inventory item with auto status"""
    item = Inventory(**data.model_dump())
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.inventory.insert_one(doc)
    return item.model_dump()

@router.put("/inventory/{inventory_id}")
async def update_inventory(inventory_id: str, data: InventoryUpdate, user: User = Depends(get_current_user)):
    """Update inventory item - auto-recalculates status"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Get current item to calculate new status
    current = await db.inventory.find_one({"inventory_id": inventory_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    
    # Merge with update and recalculate status
    new_quantity = update_data.get("current_quantity", current["current_quantity"])
    new_min_level = update_data.get("min_level", current["min_level"])
    update_data["status"] = calculate_status(new_quantity, new_min_level)
    
    result = await db.inventory.update_one(
        {"inventory_id": inventory_id},
        {"$set": update_data}
    )
    
    return {"message": "Készlet frissítve", "status": update_data["status"]}

@router.delete("/inventory/{inventory_id}")
async def delete_inventory(inventory_id: str, user: User = Depends(get_current_user)):
    """Delete inventory item"""
    result = await db.inventory.delete_one({"inventory_id": inventory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    return {"message": "Készlet törölve"}
