from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Worker(BaseModel):
    worker_id: str = Field(default_factory=lambda: f"wrk_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    location: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    location: str
    user_id: Optional[str] = None

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    active: Optional[bool] = None
