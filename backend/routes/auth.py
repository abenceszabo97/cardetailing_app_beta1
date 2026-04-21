"""
Auth Routes - Username/Password Authentication
"""
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
from jose import jwt
from database import db
from config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from models.user import User, UserCreate, UserLogin, PasswordChange

router = APIRouter()

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), password_hash.encode())

def create_access_token(user_id: str) -> str:
    """Create JWT access token"""
    expires = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expires,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

@router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    """Login with username and password"""
    user = await db.users.find_one({"username": data.username}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Hibás felhasználónév vagy jelszó")
    
    if not user.get("active", True):
        raise HTTPException(status_code=401, detail="A fiók inaktív")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Jelszó nincs beállítva")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Hibás felhasználónév vagy jelszó")
    
    # Create session token
    session_token = create_access_token(user["user_id"])
    expires_at = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    # Store session
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 60 * 60
    )
    
    # Return user without password_hash
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "name": user["name"],
        "email": user.get("email"),
        "role": user["role"],
        "location": user.get("location"),
        "picture": user.get("picture")
    }

@router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    from dependencies import get_current_user
    user = await get_current_user(request)
    return {
        "user_id": user.user_id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "location": user.location,
        "picture": user.picture
    }

@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Sikeres kijelentkezés"}

@router.post("/auth/change-password")
async def change_password(data: PasswordChange, request: Request):
    """Change user password"""
    from dependencies import get_current_user
    user = await get_current_user(request)
    
    # Get user with password
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not verify_password(data.current_password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Hibás jelenlegi jelszó")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_hash": new_hash}}
    )

    # Invalidate all OTHER active sessions for this user (keep current one)
    current_token = request.cookies.get("session_token") or \
        (request.headers.get("Authorization", "").replace("Bearer ", "") or "")
    await db.user_sessions.delete_many({
        "user_id": user.user_id,
        "session_token": {"$ne": current_token}
    })

    return {"message": "Jelszó sikeresen megváltoztatva"}

# ============== Admin: User Management ==============

@router.post("/auth/create-user")
async def create_user(data: UserCreate, request: Request):
    """Create new user (admin only)"""
    from dependencies import get_current_user, require_admin
    current_user = await get_current_user(request)
    await require_admin(current_user)
    
    # Check if username exists
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Ez a felhasználónév már foglalt")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(data.password)
    
    new_user = {
        "user_id": user_id,
        "username": data.username,
        "password_hash": password_hash,
        "name": data.name,
        "email": data.email,
        "role": data.role,
        "location": data.location,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    return {
        "user_id": user_id,
        "username": data.username,
        "name": data.name,
        "role": data.role,
        "message": "Felhasználó létrehozva"
    }

@router.put("/auth/reset-password/{user_id}")
async def reset_user_password(user_id: str, data: dict, request: Request):
    """Reset user password (admin only)"""
    from dependencies import get_current_user, require_admin
    admin = await require_admin(await get_current_user(request))
    
    new_password = data.get("new_password")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="A jelszó legalább 4 karakter legyen")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    new_hash = hash_password(new_password)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Jelszó visszaállítva"}

@router.put("/auth/toggle-user/{user_id}")
async def toggle_user_active(user_id: str, request: Request):
    """Toggle user active status (admin only)"""
    from dependencies import get_current_user, require_admin
    admin = await require_admin(await get_current_user(request))
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    new_status = not user.get("active", True)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"active": new_status}}
    )
    
    return {"message": f"Felhasználó {'aktiválva' if new_status else 'deaktiválva'}", "active": new_status}

# ============== Initial Admin Setup ==============

@router.post("/auth/setup")
async def setup_admin(data: UserCreate):
    """Create initial admin user (only works if no users exist)"""
    user_count = await db.users.count_documents({})
    if user_count > 0:
        raise HTTPException(status_code=400, detail="Admin már létezik")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(data.password)
    
    admin_user = {
        "user_id": user_id,
        "username": data.username,
        "password_hash": password_hash,
        "name": data.name,
        "email": data.email,
        "role": "admin",
        "location": data.location,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    
    return {
        "user_id": user_id,
        "username": data.username,
        "name": data.name,
        "role": "admin",
        "message": "Admin felhasználó létrehozva"
    }
