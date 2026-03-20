"""
X-CLEAN Auth Dependencies
"""
from fastapi import Request, HTTPException, Depends
from datetime import datetime, timezone
from jose import jwt, JWTError
from database import db
from config import JWT_SECRET_KEY, JWT_ALGORITHM
from models.user import User

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Nincs bejelentkezve")
    
    # Verify JWT token
    try:
        payload = jwt.decode(session_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Érvénytelen token")
    except JWTError:
        # Fallback to session-based auth for backward compatibility
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=401, detail="Érvénytelen munkamenet")
        
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Lejárt munkamenet")
        
        user_id = session["user_id"]
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Felhasználó nem található")
    
    if not user.get("active", True):
        raise HTTPException(status_code=401, detail="A fiók inaktív")
    
    return User(**user)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Csak admin jogosultság")
    return user
