from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class Booking(BaseModel):
    booking_id: str = Field(default_factory=lambda: f"bkg_{uuid.uuid4().hex[:12]}")
    customer_name: str
    car_type: str
    plate_number: str
    email: str
    phone: str
    address: Optional[str] = None
    invoice_name: Optional[str] = None
    invoice_tax_number: Optional[str] = None
    invoice_address: Optional[str] = None
    service_id: str
    service_name: str
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    location: str
    date: str
    time_slot: str
    price: float
    status: str = "foglalt"  # foglalt, folyamatban, kesz, lemondta, nem_jott_el
    notes: Optional[str] = None
    rating: Optional[int] = None
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    customer_name: str
    car_type: str
    plate_number: str
    email: str
    phone: str
    address: Optional[str] = None
    invoice_name: Optional[str] = None
    invoice_tax_number: Optional[str] = None
    invoice_address: Optional[str] = None
    service_id: str
    worker_id: Optional[str] = None
    location: str
    date: str
    time_slot: str
    notes: Optional[str] = None
    # Second car (optional)
    second_car: Optional[dict] = None  # {car_type, plate_number, service_id}

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    worker_id: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    review: Optional[str] = None
    date: Optional[str] = None
    time_slot: Optional[str] = None
    service_id: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    car_type: Optional[str] = None
    plate_number: Optional[str] = None
