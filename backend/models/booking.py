from pydantic import BaseModel, Field
from typing import Optional, List
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
    # New fields for enhanced booking
    car_size: Optional[str] = None  # S, M, L, XL, XXL
    package_type: Optional[str] = None  # Eco, Pro, VIP
    category: Optional[str] = None  # kulso, belso, komplett
    duration: Optional[int] = None  # minutes
    extras: Optional[List[str]] = None  # list of extra service IDs
    extras_price: Optional[float] = None
    payment_method: Optional[str] = None  # cash, card, transfer
    # Self-service modification/cancellation tokens
    modify_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    cancel_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    # Review token — set when status → kesz, used for review email
    review_token: Optional[str] = None
    review_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    customer_name: str
    car_type: Optional[str] = None
    plate_number: str
    email: str
    phone: str
    address: Optional[str] = None
    invoice_name: Optional[str] = None
    invoice_tax_number: Optional[str] = None
    invoice_address: Optional[str] = None
    service_id: str
    service_name: Optional[str] = None
    worker_id: Optional[str] = None
    location: str
    date: str
    time_slot: str
    notes: Optional[str] = None
    price: Optional[float] = None
    # New fields
    car_size: Optional[str] = None
    package_type: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[int] = None
    extras: Optional[List[str]] = None
    promotion_id: Optional[str] = None
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
    service_name: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    car_type: Optional[str] = None
    plate_number: Optional[str] = None
    price: Optional[float] = None
    payment_method: Optional[str] = None
