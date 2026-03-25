from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

# Image slot definitions
IMAGE_SLOTS_BEFORE = [
    "kulter_elol_jobb",      # Kültér Előlről jobboldal
    "kulter_elol_bal",       # Kültér Elől baloldal
    "kulter_hatul_jobb",     # Kültér Hátul jobboldal
    "kulter_hatul_bal",      # Kültér Hátul baloldal
    "belter_elol_bal",       # Beltér elől baloldal
    "belter_elol_jobb",      # Beltér elől jobboldal
    "belter_hatul_bal",      # Beltér hátul bal oldal
    "belter_hatul_jobb",     # Beltér hátul jobboldal
]

IMAGE_SLOTS_AFTER = [
    "elol_jobb",             # Előlről jobboldal
    "elol_bal",              # Elől baloldal
    "hatul_jobb",            # Hátul jobboldal
    "hatul_bal",             # Hátul baloldal
    "belter_elol_bal",       # Beltér elől baloldal
    "belter_elol_jobb",      # Beltér elől jobboldal
    "belter_hatul_bal",      # Beltér hátul bal oldal
    "belter_hatul_jobb",     # Beltér hátul jobboldal
]

IMAGE_SLOT_LABELS_BEFORE = {
    "kulter_elol_jobb": "Kültér Előlről jobboldal",
    "kulter_elol_bal": "Kültér Elől baloldal",
    "kulter_hatul_jobb": "Kültér Hátul jobboldal",
    "kulter_hatul_bal": "Kültér Hátul baloldal",
    "belter_elol_bal": "Beltér elől baloldal",
    "belter_elol_jobb": "Beltér elől jobboldal",
    "belter_hatul_bal": "Beltér hátul bal oldal",
    "belter_hatul_jobb": "Beltér hátul jobboldal",
}

IMAGE_SLOT_LABELS_AFTER = {
    "elol_jobb": "Előlről jobboldal",
    "elol_bal": "Elől baloldal",
    "hatul_jobb": "Hátul jobboldal",
    "hatul_bal": "Hátul baloldal",
    "belter_elol_bal": "Beltér elől baloldal",
    "belter_elol_jobb": "Beltér elől jobboldal",
    "belter_hatul_bal": "Beltér hátul bal oldal",
    "belter_hatul_jobb": "Beltér hátul jobboldal",
}

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
    status: str = "foglalt"  # foglalt, folyamatban, kesz, nem_jott_el, lemondta
    location: str
    payment_method: Optional[str] = None  # keszpenz, kartya
    date: datetime
    time_slot: Optional[str] = None
    car_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    # New structured image storage - Dict with slot_id -> image_url
    images_before: Dict[str, str] = Field(default_factory=dict)
    images_after: Dict[str, str] = Field(default_factory=dict)
    # Keep old list format for backwards compatibility
    images_before_legacy: List[str] = Field(default_factory=list)
    images_after_legacy: List[str] = Field(default_factory=list)
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
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    price: Optional[float] = None
    images_before: Optional[Dict[str, str]] = None
    images_after: Optional[Dict[str, str]] = None
