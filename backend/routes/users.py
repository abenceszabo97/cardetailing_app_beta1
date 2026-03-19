"""
Users Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import require_admin
from database import db
from models.user import User

router = APIRouter()

@router.get("/users")
async def get_users(user: User = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, user: User = Depends(require_admin)):
    """Update user role (admin only)"""
    role = data.get("role")
    if role not in ["admin", "dolgozo"]:
        raise HTTPException(status_code=400, detail="Érvénytelen szerepkör")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    return {"message": "Szerepkör frissítve"}
