from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Shift(BaseModel):
    shift_id: str = Field(default_factory=lambda: f"shft_{uuid.uuid4().hex[:12]}")
    worker_id: str
    worker_name: str
    location: str
    start_time: datetime
    end_time: datetime
    shift_type: str = "normal"  # normal, vacation, day_off, sick_leave, absence
    # Lunch break
    lunch_start: Optional[str] = None  # e.g. "12:00"
    lunch_end: Optional[str] = None    # e.g. "12:30"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    worker_id: str
    location: str
    start_time: datetime
    end_time: datetime
    shift_type: str = "normal"  # normal, vacation, day_off, sick_leave, absence
    lunch_start: Optional[str] = None
    lunch_end: Optional[str] = None

class ShiftUpdate(BaseModel):
    worker_id: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    lunch_start: Optional[str] = None
    lunch_end: Optional[str] = None
    shift_type: Optional[str] = None  # normal, vacation, day_off, sick_leave, absence
