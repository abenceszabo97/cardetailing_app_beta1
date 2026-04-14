"""
Notifications Routes
"""
from fastapi import APIRouter, Depends
from dependencies import get_current_user
from database import db
from models.user import User

router = APIRouter()

@router.get("/notifications/low-stock")
async def get_low_stock_notifications(user: User = Depends(get_current_user)):
    """Get low stock notifications"""
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    
    low_stock = []
    for item in inventory:
        qty = item.get("current_quantity", 0)
        min_lvl = item.get("min_level", 0)
        if qty <= min_lvl:
            severity = "critical" if qty <= 0 else "warning"
            low_stock.append({
                "inventory_id": item["inventory_id"],
                "product_name": item["product_name"],
                "current_quantity": qty,
                "min_level": min_lvl,
                "unit": item.get("unit", "db"),
                "location": item.get("location", ""),
                "severity": severity
            })
    
    return low_stock

@router.get("/notifications/bookings")
async def get_booking_notifications(user: User = Depends(get_current_user)):
    """Get booking notifications"""
    notifications = await db.notifications.find(
        {"type": {"$in": ["new_booking", "day_closed"]}, "read": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Olvasottnak jelölve"}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Összes olvasottnak jelölve"}
