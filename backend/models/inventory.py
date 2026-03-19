from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Inventory(BaseModel):
    inventory_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    product_name: str
    current_quantity: float
    min_level: float
    unit: str = "db"
    location: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryCreate(BaseModel):
    product_name: str
    current_quantity: float
    min_level: float
    unit: str = "db"
    location: str

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = None
    current_quantity: Optional[float] = None
    min_level: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
