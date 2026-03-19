from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    customer_id: str
    customer_name: str
    plate_number: str
    service_id: str
    service_name: str
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    price: float
    status: str = "foglalt"  # foglalt, folyamatban, kesz
    location: str
    payment_method: Optional[str] = None  # keszpenz, kartya
    date: datetime
    notes: Optional[str] = None
    images_before: List[str] = Field(default_factory=list)
    images_after: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobCreate(BaseModel):
    customer_id: str
    service_id: str
    worker_id: Optional[str] = None
    price: float
    location: str
    date: datetime
    notes: Optional[str] = None

class JobUpdate(BaseModel):
    status: Optional[str] = None
    worker_id: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    images_before: Optional[List[str]] = None
    images_after: Optional[List[str]] = None
