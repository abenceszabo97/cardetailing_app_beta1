from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Customer(BaseModel):
    customer_id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:12]}")
    name: str
    phone: str
    email: Optional[str] = None
    car_type: Optional[str] = None
    plate_number: str
    location: Optional[str] = None   # "Debrecen" | "Budapest" | None (both)
    total_spent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    car_type: Optional[str] = None
    plate_number: str
    location: Optional[str] = None
