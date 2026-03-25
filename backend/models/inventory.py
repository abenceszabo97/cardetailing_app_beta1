from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

def calculate_status(current_quantity: float, min_level: float) -> str:
    """Calculate inventory status based on quantity and min level"""
    if current_quantity <= 0:
        return "kifogyott"
    elif current_quantity <= min_level:
        return "alacsony"
    elif current_quantity <= min_level * 1.5:
        return "figyelmeztetes"
    else:
        return "rendben"

class Inventory(BaseModel):
    inventory_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    product_name: str
    current_quantity: float
    min_level: float
    unit: str = "db"
    location: str
    status: Optional[str] = None  # kifogyott, alacsony, figyelmeztetes, rendben
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def __init__(self, **data):
        super().__init__(**data)
        # Auto-calculate status
        if self.status is None:
            self.status = calculate_status(self.current_quantity, self.min_level)

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
