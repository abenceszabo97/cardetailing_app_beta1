from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Service(BaseModel):
    service_id: str = Field(default_factory=lambda: f"srv_{uuid.uuid4().hex[:12]}")
    name: str
    category: str  # kulso, belso, extra
    price: float
    duration: int  # minutes
    description: Optional[str] = None
    car_size: Optional[str] = None  # S, M, L, XL, XXL
    package: Optional[str] = None  # Eco, Pro, VIP
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceCreate(BaseModel):
    name: str
    category: str
    price: float
    duration: int
    description: Optional[str] = None
    car_size: Optional[str] = None
    package: Optional[str] = None
