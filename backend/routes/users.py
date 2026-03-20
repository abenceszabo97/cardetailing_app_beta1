"""
Users Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import require_admin, get_current_user
from database import db
from models.user import User

router = APIRouter()

@router.get("/users")
async def get_users(user: User = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
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

@router.put("/users/{user_id}")
async def update_user(user_id: str, data: dict, user: User = Depends(require_admin)):
    """Update user details (admin only)"""
    allowed_fields = ["name", "email", "location", "role"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    return {"message": "Felhasználó frissítve"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: User = Depends(require_admin)):
    """Delete user (admin only) - actually deactivates"""
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Nem törölheted saját magadat")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    # Remove sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"message": "Felhasználó deaktiválva"}
