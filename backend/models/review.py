from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    booking_id: str
    review_token: str  # matches booking.review_token
    rating: int  # 1-5
    comment: Optional[str] = None
    customer_name: str
    service_name: str
    location: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved: bool = True  # auto-approve for now

class ReviewCreate(BaseModel):
    review_token: str
    rating: int  # 1-5
    comment: Optional[str] = None
