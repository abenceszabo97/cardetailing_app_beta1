from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Attendance(BaseModel):
    attendance_id: str = Field(default_factory=lambda: f"att_{uuid.uuid4().hex[:12]}")
    worker_id: str
    worker_name: str
    location: str
    date: str  # YYYY-MM-DD
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str = "not_checked_in"  # not_checked_in, checked_in, checked_out
    hours_worked: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceCheckIn(BaseModel):
    worker_id: str
    location: str
    notes: Optional[str] = None

class AttendanceCheckOut(BaseModel):
    worker_id: str
    location: str
    notes: Optional[str] = None
