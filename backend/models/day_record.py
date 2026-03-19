from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class DayRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: f"day_{uuid.uuid4().hex[:12]}")
    date: datetime
    location: str
    opening_balance: float
    closing_balance: Optional[float] = None
    cash_total: Optional[float] = None
    card_total: Optional[float] = None
    total_cars: Optional[int] = None
    notes: Optional[str] = None
    status: str = "open"  # open, closed
    opened_by: str
    closed_by: Optional[str] = None
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None
    withdrawals: list = Field(default_factory=list)
    expected_closing: Optional[float] = None
    discrepancy: Optional[float] = None

class CashWithdrawal(BaseModel):
    amount: float
    reason: str
    withdrawn_by: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DayOpenCreate(BaseModel):
    location: str
    opening_balance: float

class DayCloseCreate(BaseModel):
    location: str
    closing_balance: float
    notes: Optional[str] = None

class CashWithdrawalCreate(BaseModel):
    location: str
    amount: float
    reason: str
