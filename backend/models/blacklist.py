from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class BlacklistEntry(BaseModel):
    blacklist_id: str = Field(default_factory=lambda: f"bl_{uuid.uuid4().hex[:12]}")
    plate_number: str
    customer_name: Optional[str] = None
    reason: str
    evidence_images: List[str] = Field(default_factory=list)  # Evidence images URLs
    added_by: str
    added_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlacklistCreate(BaseModel):
    plate_number: str
    reason: str
    evidence_images: Optional[List[str]] = None
