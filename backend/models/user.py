from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class User(BaseModel):
    user_id: str
    username: Optional[str] = None  # For login (optional for backward compat)
    email: Optional[str] = None
    name: str
    password_hash: Optional[str] = None  # bcrypt hashed password
    picture: Optional[str] = None
    role: str = "dolgozo"  # admin or dolgozo
    location: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = None
    role: str = "dolgozo"
    location: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
