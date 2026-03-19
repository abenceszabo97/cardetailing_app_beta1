from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key for AI features
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# CORS configuration from environment
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app = FastAPI(title="X-CLEAN API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Health check endpoint (no auth required)
@app.get("/api/health")
async def health_check():
    """Health check for deployment"""
    try:
        # Test MongoDB connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# Twilio SMS config
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    from twilio.rest import Client as TwilioClient
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    logging.info("Twilio SMS integration initialized")

# Resend email config
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    import resend
    resend.api_key = RESEND_API_KEY
    logging.info("Resend email integration initialized")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "dolgozo"  # admin or dolgozo
    location: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Customer(BaseModel):
    customer_id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:12]}")
    name: str
    phone: str
    car_type: Optional[str] = None
    plate_number: str
    total_spent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    car_type: Optional[str] = None
    plate_number: str

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
    status: str = "foglalt"  # foglalt, folyamatban, kesz
    location: str
    payment_method: Optional[str] = None  # keszpenz, kartya
    date: datetime
    notes: Optional[str] = None
    images_before: List[str] = Field(default_factory=list)  # URLs of before images
    images_after: List[str] = Field(default_factory=list)  # URLs of after images
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
    images_before: Optional[List[str]] = None
    images_after: Optional[List[str]] = None

class Worker(BaseModel):
    worker_id: str = Field(default_factory=lambda: f"wrk_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None  # beosztás
    location: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    location: str
    user_id: Optional[str] = None

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    active: Optional[bool] = None

class Shift(BaseModel):
    shift_id: str = Field(default_factory=lambda: f"shft_{uuid.uuid4().hex[:12]}")
    worker_id: str
    worker_name: str
    location: str
    start_time: datetime
    end_time: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    worker_id: str
    location: str
    start_time: datetime
    end_time: datetime

# ===================== BOOKING MODELS =====================

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

class BlacklistEntry(BaseModel):
    blacklist_id: str = Field(default_factory=lambda: f"bl_{uuid.uuid4().hex[:12]}")
    plate_number: str
    customer_name: Optional[str] = None
    reason: str
    added_by: str
    added_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlacklistCreate(BaseModel):
    plate_number: str
    reason: str

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
    withdrawals: list = Field(default_factory=list)  # List of cash withdrawals
    expected_closing: Optional[float] = None  # Expected closing balance
    discrepancy: Optional[float] = None  # Difference between expected and actual

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

# ===================== AUTH HELPERS =====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Nincs bejelentkezve")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Érvénytelen munkamenet")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Lejárt munkamenet")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Felhasználó nem található")
    
    return User(**user)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Csak admin jogosultság")
    return user

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id szükséges")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Érvénytelen session_id")
    
    user_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # First user becomes admin
        user_count = await db.users.count_documents({})
        role = "admin" if user_count == 0 else "dolgozo"
        
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "role": role,
            "location": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Sikeres kijelentkezés"}

# ===================== USER ROUTES =====================

@api_router.get("/users")
async def get_users(user: User = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, user: User = Depends(require_admin)):
    """Update user role (admin only)"""
    role = data.get("role")
    if role not in ["admin", "dolgozo"]:
        raise HTTPException(status_code=400, detail="Érvénytelen szerepkör")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    return {"message": "Szerepkör frissítve"}

# ===================== CUSTOMER ROUTES =====================

@api_router.get("/customers")
async def get_customers(user: User = Depends(get_current_user)):
    """Get all customers"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: User = Depends(get_current_user)):
    """Get customer by ID"""
    customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    # Get customer jobs
    jobs = await db.jobs.find({"customer_id": customer_id}, {"_id": 0}).sort("date", -1).to_list(100)
    
    return {"customer": customer, "jobs": jobs}

@api_router.post("/customers")
async def create_customer(data: CustomerCreate, user: User = Depends(get_current_user)):
    """Create new customer"""
    customer = Customer(**data.model_dump())
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.customers.insert_one(doc)
    return customer.model_dump()

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: CustomerCreate, user: User = Depends(get_current_user)):
    """Update customer"""
    result = await db.customers.update_one(
        {"customer_id": customer_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    return {"message": "Ügyfél frissítve"}

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: User = Depends(get_current_user)):
    """Delete customer (admin only)"""
    result = await db.customers.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    return {"message": "Ügyfél törölve"}

# ===================== SERVICE ROUTES =====================

@api_router.get("/services")
async def get_services(user: User = Depends(get_current_user)):
    """Get all services"""
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    return services

@api_router.post("/services")
async def create_service(data: ServiceCreate, user: User = Depends(get_current_user)):
    """Create new service (admin only)"""
    service = Service(**data.model_dump())
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return service.model_dump()

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, data: ServiceCreate, user: User = Depends(get_current_user)):
    """Update service (admin only)"""
    result = await db.services.update_one(
        {"service_id": service_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    return {"message": "Szolgáltatás frissítve"}

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: User = Depends(get_current_user)):
    """Delete service (admin only)"""
    result = await db.services.delete_one({"service_id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    return {"message": "Szolgáltatás törölve"}

# ===================== WORKER ROUTES =====================

@api_router.get("/workers")
async def get_workers(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all workers"""
    query = {"active": True}
    if location:
        query["location"] = location
    workers = await db.workers.find(query, {"_id": 0}).to_list(1000)
    return workers

@api_router.post("/workers")
async def create_worker(data: WorkerCreate, user: User = Depends(get_current_user)):
    """Create new worker (admin only)"""
    worker = Worker(**data.model_dump())
    doc = worker.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.workers.insert_one(doc)
    return worker.model_dump()

@api_router.put("/workers/{worker_id}")
async def update_worker(worker_id: str, data: WorkerUpdate, user: User = Depends(get_current_user)):
    """Update worker (admin only)"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    return {"message": "Dolgozó frissítve"}

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, user: User = Depends(get_current_user)):
    """Deactivate worker (admin only)"""
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    return {"message": "Dolgozó törölve"}

# ===================== JOB ROUTES =====================

@api_router.get("/jobs")
async def get_jobs(
    location: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    worker_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get jobs with filters"""
    query = {}
    
    if location:
        query["location"] = location
    
    if date:
        try:
            date_obj = datetime.fromisoformat(date.replace("Z", "+00:00"))
            start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            query["date"] = {
                "$gte": start_of_day.isoformat(),
                "$lt": end_of_day.isoformat()
            }
        except:
            pass
    
    if status:
        query["status"] = status
    
    # If user is dolgozo, only show their jobs
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query["worker_id"] = worker["worker_id"]
    elif worker_id:
        query["worker_id"] = worker_id
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return jobs

@api_router.get("/jobs/today")
async def get_today_jobs(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get today's jobs including bookings"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    today_str = today.strftime("%Y-%m-%d")
    
    query = {
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }
    
    if location:
        query["location"] = location
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query["worker_id"] = worker["worker_id"]
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Also get today's bookings and convert them to job-like format
    booking_query = {"date": today_str, "status": {"$nin": ["lemondta", "nem_jott_el"]}}
    if location:
        booking_query["location"] = location
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            booking_query["worker_id"] = worker["worker_id"]
    
    bookings = await db.bookings.find(booking_query, {"_id": 0}).to_list(500)
    
    # Convert bookings to job format for display
    for b in bookings:
        # Check if already converted to job (by booking_id)
        existing_job = next((j for j in jobs if j.get("booking_id") == b["booking_id"]), None)
        if not existing_job:
            jobs.append({
                "job_id": f"bkg_{b['booking_id']}",
                "booking_id": b["booking_id"],
                "customer_name": b["customer_name"],
                "plate_number": b["plate_number"],
                "service_id": b.get("service_id"),
                "service_name": b.get("service_name"),
                "worker_id": b.get("worker_id"),
                "worker_name": b.get("worker_name"),
                "location": b["location"],
                "date": f"{b['date']}T{b['time_slot']}:00",
                "time_slot": b.get("time_slot"),
                "price": b.get("price", 0),
                "status": "foglalt" if b.get("status") == "foglalt" else b.get("status", "foglalt"),
                "is_booking": True,
                "phone": b.get("phone"),
                "car_type": b.get("car_type")
            })
    
    # Sort by time
    jobs.sort(key=lambda x: x.get("date", "") or x.get("time_slot", ""))
    return jobs

@api_router.post("/jobs")
async def create_job(data: JobCreate, user: User = Depends(get_current_user)):
    """Create new job"""
    # Get customer info
    customer = await db.customers.find_one({"customer_id": data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    # Get service info
    service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    
    # Get worker info if provided
    worker_name = None
    if data.worker_id:
        worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
        if worker:
            worker_name = worker["name"]
    
    job = Job(
        customer_id=data.customer_id,
        customer_name=customer["name"],
        plate_number=customer["plate_number"],
        service_id=data.service_id,
        service_name=service["name"],
        worker_id=data.worker_id,
        worker_name=worker_name,
        price=data.price,
        location=data.location,
        date=data.date,
        notes=data.notes
    )
    
    doc = job.model_dump()
    doc["date"] = doc["date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.jobs.insert_one(doc)
    
    return job.model_dump()

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobUpdate, user: User = Depends(get_current_user)):
    """Update job"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "worker_id" in update_data:
        worker = await db.workers.find_one({"worker_id": update_data["worker_id"]}, {"_id": 0})
        if worker:
            update_data["worker_name"] = worker["name"]
    
    # If status changed to kesz, update customer total_spent
    if update_data.get("status") == "kesz":
        job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
        if job:
            await db.customers.update_one(
                {"customer_id": job["customer_id"]},
                {"$inc": {"total_spent": job["price"]}}
            )
    
    result = await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Munka nem található")
    
    return {"message": "Munka frissítve"}

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: User = Depends(get_current_user)):
    """Delete job (admin only)"""
    result = await db.jobs.delete_one({"job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Munka nem található")
    return {"message": "Munka törölve"}

# ===================== SHIFT ROUTES =====================

@api_router.get("/shifts")
async def get_shifts(
    location: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get shifts"""
    query = {}
    
    if location:
        query["location"] = location
    
    if start_date and end_date:
        query["start_time"] = {"$gte": start_date}
        query["end_time"] = {"$lte": end_date}
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_time", 1).to_list(1000)
    return shifts

@api_router.post("/shifts")
async def create_shift(data: ShiftCreate, user: User = Depends(get_current_user)):
    """Create shift (admin only)"""
    worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    shift = Shift(
        worker_id=data.worker_id,
        worker_name=worker["name"],
        location=data.location,
        start_time=data.start_time,
        end_time=data.end_time
    )
    
    doc = shift.model_dump()
    doc["start_time"] = doc["start_time"].isoformat()
    doc["end_time"] = doc["end_time"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.shifts.insert_one(doc)
    
    return shift.model_dump()

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    """Delete shift (admin only)"""
    result = await db.shifts.delete_one({"shift_id": shift_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Műszak nem található")
    return {"message": "Műszak törölve"}

@api_router.get("/stats/worker-monthly")
async def get_worker_monthly_stats(month: Optional[str] = None, location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get monthly statistics per worker: days worked, hours, cars completed"""
    if month:
        year, m = month.split("-")
        month_start = datetime(int(year), int(m), 1, tzinfo=timezone.utc)
    else:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    
    # Get all workers
    worker_query = {}
    if location and location != "all":
        worker_query["location"] = location
    all_workers = await db.workers.find(worker_query, {"_id": 0}).to_list(100)
    
    # Get shifts for this month
    shift_query = {
        "start_time": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
    }
    if location and location != "all":
        shift_query["location"] = location
    all_shifts = await db.shifts.find(shift_query, {"_id": 0}).to_list(5000)
    
    # Get completed jobs for this month
    job_query = {
        "status": "kesz",
        "date": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
    }
    if location and location != "all":
        job_query["location"] = location
    all_jobs = await db.jobs.find(job_query, {"_id": 0}).to_list(5000)
    
    result = []
    for worker in all_workers:
        wid = worker["worker_id"]
        
        # Shifts for this worker
        worker_shifts = [s for s in all_shifts if s.get("worker_id") == wid]
        
        # Unique days worked
        days_set = set()
        total_hours = 0.0
        for s in worker_shifts:
            try:
                start = datetime.fromisoformat(s["start_time"])
                end = datetime.fromisoformat(s["end_time"])
                days_set.add(start.strftime("%Y-%m-%d"))
                total_hours += (end - start).total_seconds() / 3600.0
            except (ValueError, KeyError):
                pass
        
        # Cars completed by this worker
        worker_jobs = [j for j in all_jobs if j.get("worker_id") == wid]
        cars_count = len(worker_jobs)
        revenue = sum(j.get("price", 0) for j in worker_jobs)
        
        result.append({
            "worker_id": wid,
            "name": worker.get("name", ""),
            "location": worker.get("location", ""),
            "days_worked": len(days_set),
            "hours_worked": round(total_hours, 1),

# ===================== INVENTORY ROUTES =====================
            "cars_completed": cars_count,
            "revenue": revenue
        })
    
    return result

@api_router.get("/inventory")
async def get_inventory(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get inventory"""
    query = {}
    if location:
        query["location"] = location
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return inventory

@api_router.post("/inventory")
async def create_inventory(data: InventoryCreate, user: User = Depends(get_current_user)):
    """Create inventory item (admin only)"""
    item = Inventory(**data.model_dump())
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.inventory.insert_one(doc)
    return item.model_dump()

@api_router.put("/inventory/{inventory_id}")
async def update_inventory(inventory_id: str, data: InventoryUpdate, user: User = Depends(get_current_user)):
    """Update inventory item"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.inventory.update_one(
        {"inventory_id": inventory_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    
    return {"message": "Készlet frissítve"}

@api_router.delete("/inventory/{inventory_id}")
async def delete_inventory(inventory_id: str, user: User = Depends(get_current_user)):
    """Delete inventory item (admin only)"""
    result = await db.inventory.delete_one({"inventory_id": inventory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    return {"message": "Készlet törölve"}


# ===================== BOOKING ROUTES =====================

@api_router.get("/bookings/available-slots")
async def get_available_slots(location: str, date: str, service_id: Optional[str] = None):
    """Get available time slots for a given date and location (public)"""
    workers_list = await db.workers.find({"location": location, "active": True}, {"_id": 0}).to_list(100)
    existing = await db.bookings.find({
        "location": location, "date": date,
        "status": {"$nin": ["lemondta", "nem_jott_el"]}
    }, {"_id": 0}).to_list(500)
    
    all_slots = []
    for hour in range(8, 20):
        for minute in [0, 30]:
            slot_time = f"{hour:02d}:{minute:02d}"
            booked_workers = {bkg["worker_id"] for bkg in existing if bkg.get("time_slot") == slot_time and bkg.get("worker_id")}
            free_workers = [w for w in workers_list if w["worker_id"] not in booked_workers]
            booked_count = len(booked_workers)
            total_workers = len(workers_list)
            
            all_slots.append({
                "time_slot": slot_time,
                "available_workers": [{"worker_id": w["worker_id"], "name": w["name"]} for w in free_workers],
                "is_available": len(free_workers) > 0,
                "booked_count": booked_count,
                "total_workers": total_workers,
                "availability_percent": int((len(free_workers) / total_workers * 100)) if total_workers > 0 else 0
            })
    
    return all_slots

@api_router.get("/bookings/public-services")
async def get_public_services():
    """Get services list (public, no auth)"""
    services = await db.services.find({}, {"_id": 0}).to_list(200)
    return services

@api_router.get("/bookings/public-locations")
async def get_public_locations():
    """Get available locations (public)"""
    return ["Debrecen"]

@api_router.get("/bookings/lookup-plate/{plate_number}")
async def lookup_customer_by_plate(plate_number: str):
    """Lookup customer by plate number for quick booking (public)"""
    plate = plate_number.upper().strip()
    customer = await db.customers.find_one({"plate_number": plate}, {"_id": 0})
    if not customer:
        return {"found": False}
    
    # Get booking history stats
    bookings = await db.bookings.find({"plate_number": plate}, {"_id": 0}).to_list(100)
    completed_count = len([b for b in bookings if b.get("status") == "kesz"])
    
    return {
        "found": True,
        "customer_name": customer.get("name", ""),
        "phone": customer.get("phone", ""),
        "email": customer.get("email", ""),
        "car_type": customer.get("car_type", ""),
        "address": customer.get("address", ""),
        "total_spent": customer.get("total_spent", 0),
        "booking_count": customer.get("booking_count", 0),
        "completed_bookings": completed_count,
        "is_vip": completed_count >= 5  # VIP after 5 completed bookings
    }

@api_router.post("/bookings")
async def create_booking(data: BookingCreate):
    """Create a new booking (public, no auth required)"""
    service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    
    worker_name = None
    if data.worker_id:
        worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
        if worker:
            worker_name = worker["name"]
    
    booking = Booking(
        customer_name=data.customer_name, car_type=data.car_type,
        plate_number=data.plate_number.upper(), email=data.email, phone=data.phone,
        address=data.address, invoice_name=data.invoice_name,
        invoice_tax_number=data.invoice_tax_number, invoice_address=data.invoice_address,
        service_id=data.service_id, service_name=service["name"],
        worker_id=data.worker_id, worker_name=worker_name,
        location=data.location, date=data.date, time_slot=data.time_slot,
        price=service["price"], notes=data.notes
    )
    
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.bookings.insert_one(doc)
    
    # Auto-create/update customer
    existing_cust = await db.customers.find_one({"plate_number": data.plate_number.upper()}, {"_id": 0})
    if not existing_cust:
        cust = Customer(name=data.customer_name, phone=data.phone, car_type=data.car_type, plate_number=data.plate_number.upper())
        cdoc = cust.model_dump()
        cdoc["created_at"] = cdoc["created_at"].isoformat()
        cdoc["email"] = data.email
        cdoc["address"] = data.address
        cdoc["total_spent"] = 0
        cdoc["booking_count"] = 1
        cdoc["no_show_count"] = 0
        cdoc["cancel_count"] = 0
        cdoc["blacklisted"] = False
        await db.customers.insert_one(cdoc)
    else:
        await db.customers.update_one(
            {"plate_number": data.plate_number.upper()},
            {"$inc": {"booking_count": 1}, "$set": {"email": data.email, "phone": data.phone}}
        )
    
    # Send confirmation email if configured
    if RESEND_API_KEY:
        try:
            import resend
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [data.email],
                "subject": f"X-CLEAN Foglalás visszaigazolás - {data.date} {data.time_slot}",
                "html": f"<h2>Foglalás visszaigazolás</h2><p>Kedves {data.customer_name}!</p><p>Foglalása rögzítve: {data.date} {data.time_slot}, {service['name']}, {data.location}, {service['price']} Ft</p><p>Várjuk szeretettel!</p>"
            })
        except Exception as e:
            logging.warning(f"Booking email failed: {e}")
    
    # Create notification for management system
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "type": "new_booking",
        "title": "Új online foglalás",
        "message": f"{data.customer_name} - {data.plate_number} - {data.date} {data.time_slot}",
        "booking_id": booking.booking_id,
        "location": data.location,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return booking.model_dump()

@api_router.get("/bookings")
async def get_bookings(location: Optional[str] = None, date: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, status: Optional[str] = None, worker_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get bookings with filters"""
    query = {}
    if location and location != "all":
        query["location"] = location
    if date:
        query["date"] = date
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    if status:
        query["status"] = status
    if worker_id:
        query["worker_id"] = worker_id
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    return booking

@api_router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, data: BookingUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "worker_id" in update_data:
        worker = await db.workers.find_one({"worker_id": update_data["worker_id"]}, {"_id": 0})
        if worker:
            update_data["worker_name"] = worker["name"]
    if "service_id" in update_data:
        service = await db.services.find_one({"service_id": update_data["service_id"]}, {"_id": 0})
        if service:
            update_data["service_name"] = service["name"]
            update_data["price"] = service["price"]
    if "plate_number" in update_data:
        update_data["plate_number"] = update_data["plate_number"].upper()
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    result = await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if data.status == "nem_jott_el" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"no_show_count": 1}})
    elif data.status == "lemondta" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"cancel_count": 1}})
    elif data.status == "kesz" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"total_spent": booking.get("price", 0)}})
    return {"message": "Foglalás frissítve"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: User = Depends(get_current_user)):
    result = await db.bookings.delete_one({"booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    return {"message": "Foglalás törölve"}

# ===================== BLACKLIST ROUTES =====================

@api_router.get("/blacklist")
async def get_blacklist(user: User = Depends(get_current_user)):
    """Get all blacklisted customers"""
    blacklist = await db.blacklist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return blacklist

@api_router.post("/blacklist")
async def add_to_blacklist(data: BlacklistCreate, user: User = Depends(get_current_user)):
    """Add customer to blacklist"""
    plate = data.plate_number.upper().strip()
    
    # Check if already blacklisted
    existing = await db.blacklist.find_one({"plate_number": plate})
    if existing:
        raise HTTPException(status_code=400, detail="Ez a rendszám már a tiltólistán van")
    
    # Get customer name if exists
    customer = await db.customers.find_one({"plate_number": plate}, {"_id": 0})
    customer_name = customer.get("name") if customer else None
    
    entry = BlacklistEntry(
        plate_number=plate,
        customer_name=customer_name,
        reason=data.reason,
        added_by=user.user_id,
        added_by_name=user.name
    )
    
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.blacklist.insert_one(doc)
    
    # Update customer record
    if customer:
        await db.customers.update_one(
            {"plate_number": plate},
            {"$set": {"blacklisted": True, "blacklist_reason": data.reason}}
        )
    
    return entry.model_dump()

@api_router.delete("/blacklist/{plate_number}")
async def remove_from_blacklist(plate_number: str, user: User = Depends(get_current_user)):
    """Remove customer from blacklist"""
    plate = plate_number.upper().strip()
    result = await db.blacklist.delete_one({"plate_number": plate})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rendszám nincs a tiltólistán")
    
    # Update customer record
    await db.customers.update_one(
        {"plate_number": plate},
        {"$set": {"blacklisted": False}, "$unset": {"blacklist_reason": ""}}
    )
    
    return {"message": "Eltávolítva a tiltólistáról"}

@api_router.get("/blacklist/check/{plate_number}")
async def check_blacklist(plate_number: str):
    """Check if a plate number is blacklisted (public for booking page)"""
    plate = plate_number.upper().strip()
    entry = await db.blacklist.find_one({"plate_number": plate}, {"_id": 0})
    if entry:
        return {"blacklisted": True, "reason": entry.get("reason")}
    return {"blacklisted": False}

# ===================== DAY RECORD ROUTES =====================

@api_router.get("/day-records")
async def get_day_records(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get day records"""
    query = {}
    if location:
        query["location"] = location
    
    records = await db.day_records.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return records

@api_router.get("/day-records/today")
async def get_today_record(location: str, user: User = Depends(get_current_user)):
    """Get today's day record - prioritize open records"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    # First try to find an open record
    record = await db.day_records.find_one({
        "location": location,
        "status": "open",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0})
    
    if not record:
        # Fall back to most recent record (closed)
        record = await db.day_records.find_one({
            "location": location,
            "date": {
                "$gte": today.isoformat(),
                "$lt": tomorrow.isoformat()
            }
        }, {"_id": 0}, sort=[("opened_at", -1)])
    
    return record

@api_router.post("/day-records/open")
async def open_day(data: DayOpenCreate, user: User = Depends(get_current_user)):
    """Open day"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    # Check if already open (only block if an OPEN record exists)
    existing = await db.day_records.find_one({
        "location": data.location,
        "status": "open",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="A nap már nyitva van")
    
    record = DayRecord(
        date=today,
        location=data.location,
        opening_balance=data.opening_balance,
        opened_by=user.user_id
    )
    
    doc = record.model_dump()
    doc["date"] = doc["date"].isoformat()
    doc["opened_at"] = doc["opened_at"].isoformat()
    await db.day_records.insert_one(doc)
    
    return record.model_dump()

@api_router.post("/day-records/close")
async def close_day(data: DayCloseCreate, user: User = Depends(get_current_user)):
    """Close day with cash audit"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    record = await db.day_records.find_one({
        "location": data.location,
        "status": "open",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0})
    
    if not record:
        raise HTTPException(status_code=400, detail="Nincs nyitott nap")
    
    # Calculate stats
    jobs = await db.jobs.find({
        "location": data.location,
        "status": "kesz",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    total_cars = len(jobs)
    cash_total = sum(j["price"] for j in jobs if j.get("payment_method") == "keszpenz")
    card_total = sum(j["price"] for j in jobs if j.get("payment_method") == "kartya")
    
    # Calculate withdrawals
    withdrawals = record.get("withdrawals", [])
    total_withdrawals = sum(w.get("amount", 0) for w in withdrawals)
    
    # Expected closing balance = opening + cash revenue - withdrawals
    expected_closing = record["opening_balance"] + cash_total - total_withdrawals
    actual_closing = data.closing_balance
    discrepancy = actual_closing - expected_closing
    
    await db.day_records.update_one(
        {"record_id": record["record_id"]},
        {"$set": {
            "status": "closed",
            "total_cars": total_cars,
            "cash_total": cash_total,
            "card_total": card_total,
            "closing_balance": actual_closing,
            "expected_closing": expected_closing,
            "discrepancy": discrepancy,
            "notes": data.notes,
            "closed_by": user.user_id,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for day close
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "type": "day_closed",
        "title": "Nap lezárva",
        "message": f"{data.location} - {total_cars} autó - {cash_total + card_total:,.0f} Ft bevétel",
        "location": data.location,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if abs(discrepancy) > 0:
        notification["message"] += f" | Eltérés: {discrepancy:+,.0f} Ft"
    await db.notifications.insert_one(notification)
    
    return {
        "message": "Nap lezárva", 
        "total_cars": total_cars, 
        "cash_total": cash_total, 
        "card_total": card_total,
        "expected_closing": expected_closing,
        "actual_closing": actual_closing,
        "discrepancy": discrepancy
    }

@api_router.post("/day-records/withdraw")
async def add_cash_withdrawal(data: CashWithdrawalCreate, user: User = Depends(get_current_user)):
    """Add cash withdrawal from register"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    record = await db.day_records.find_one({
        "location": data.location,
        "status": "open",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0})
    
    if not record:
        raise HTTPException(status_code=400, detail="Nincs nyitott nap")
    
    withdrawal = {
        "withdrawal_id": f"wd_{uuid.uuid4().hex[:8]}",
        "amount": data.amount,
        "reason": data.reason,
        "withdrawn_by": user.name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.day_records.update_one(
        {"record_id": record["record_id"]},
        {"$push": {"withdrawals": withdrawal}}
    )
    
    return {"message": "Pénzelvitel rögzítve", "withdrawal": withdrawal}

# ===================== STATISTICS ROUTES =====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    month_start = today.replace(day=1)
    
    query_base = {}
    if location:
        query_base["location"] = location
    
    if user.role == "dolgozo":
        worker = await db.workers.find_one({"user_id": user.user_id}, {"_id": 0})
        if worker:
            query_base["worker_id"] = worker["worker_id"]
    
    # Today's completed jobs
    today_query = {
        **query_base,
        "status": "kesz",
        "date": {"$gte": today.isoformat(), "$lt": tomorrow.isoformat()}
    }
    today_jobs = await db.jobs.find(today_query, {"_id": 0}).to_list(1000)
    today_cars = len(today_jobs)
    today_revenue = sum(j["price"] for j in today_jobs)
    today_cash = sum(j["price"] for j in today_jobs if j.get("payment_method") == "keszpenz")
    today_card = sum(j["price"] for j in today_jobs if j.get("payment_method") == "kartya")
    
    # Monthly stats
    month_query = {
        **query_base,
        "status": "kesz",
        "date": {"$gte": month_start.isoformat(), "$lt": tomorrow.isoformat()}
    }
    month_jobs = await db.jobs.find(month_query, {"_id": 0}).to_list(1000)
    month_cars = len(month_jobs)
    month_revenue = sum(j["price"] for j in month_jobs)
    month_cash = sum(j["price"] for j in month_jobs if j.get("payment_method") == "keszpenz")
    month_card = sum(j["price"] for j in month_jobs if j.get("payment_method") == "kartya")
    
    return {
        "today_cars": today_cars,
        "today_revenue": today_revenue,
        "today_cash": today_cash,
        "today_card": today_card,
        "month_cars": month_cars,
        "month_revenue": month_revenue,
        "month_cash": month_cash,
        "month_card": month_card
    }

@api_router.get("/stats/daily")
async def get_daily_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get daily statistics for current month"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    # Group by date
    daily_stats = {}
    for job in jobs:
        date_str = job["date"][:10]
        if date_str not in daily_stats:
            daily_stats[date_str] = {"date": date_str, "count": 0, "revenue": 0}
        daily_stats[date_str]["count"] += 1
        daily_stats[date_str]["revenue"] += job["price"]
    
    return list(daily_stats.values())

@api_router.get("/stats/monthly")
async def get_monthly_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get monthly statistics"""
    query = {"status": "kesz"}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(10000)
    
    # Group by month
    monthly_stats = {}
    for job in jobs:
        month_str = job["date"][:7]
        if month_str not in monthly_stats:
            monthly_stats[month_str] = {"month": month_str, "count": 0, "revenue": 0}
        monthly_stats[month_str]["count"] += 1
        monthly_stats[month_str]["revenue"] += job["price"]
    
    return sorted(monthly_stats.values(), key=lambda x: x["month"])

@api_router.get("/stats/workers")
async def get_worker_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get worker statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    # Group by worker
    worker_stats = {}
    for job in jobs:
        worker_id = job.get("worker_id")
        if not worker_id:
            continue
        if worker_id not in worker_stats:
            worker_stats[worker_id] = {
                "worker_id": worker_id,
                "worker_name": job.get("worker_name", "Ismeretlen"),
                "count": 0,
                "revenue": 0
            }
        worker_stats[worker_id]["count"] += 1
        worker_stats[worker_id]["revenue"] += job["price"]
    
    return list(worker_stats.values())

@api_router.get("/stats/services")
async def get_service_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get service statistics"""
    query = {"status": "kesz"}
    if location:
        query["location"] = location
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(10000)
    
    # Group by service
    service_stats = {}
    for job in jobs:
        service_id = job.get("service_id")
        if not service_id:
            continue
        if service_id not in service_stats:
            service_stats[service_id] = {
                "service_id": service_id,
                "service_name": job.get("service_name", "Ismeretlen"),
                "count": 0,
                "revenue": 0
            }
        service_stats[service_id]["count"] += 1
        service_stats[service_id]["revenue"] += job["price"]
    
    return sorted(service_stats.values(), key=lambda x: x["count"], reverse=True)

@api_router.get("/stats/locations")
async def get_location_stats(user: User = Depends(get_current_user)):
    """Get location statistics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    query = {"status": "kesz", "date": {"$gte": month_start.isoformat()}}
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    # Group by location
    location_stats = {}
    for job in jobs:
        loc = job.get("location")
        if not loc:
            continue
        if loc not in location_stats:
            location_stats[loc] = {"location": loc, "count": 0, "revenue": 0}
        location_stats[loc]["count"] += 1
        location_stats[loc]["revenue"] += job["price"]
    
    return list(location_stats.values())

# ===================== ADVANCED ANALYTICS =====================

@api_router.get("/stats/advanced")
async def get_advanced_stats(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get advanced analytics"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    # Get previous month
    if month_start.month == 1:
        prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month_start = month_start.replace(month=month_start.month - 1)
    prev_month_end = month_start
    
    query_base = {"status": "kesz"}
    if location:
        query_base["location"] = location
    
    # Current month jobs
    current_month_query = {**query_base, "date": {"$gte": month_start.isoformat()}}
    current_jobs = await db.jobs.find(current_month_query, {"_id": 0}).to_list(10000)
    
    # Previous month jobs
    prev_month_query = {**query_base, "date": {"$gte": prev_month_start.isoformat(), "$lt": prev_month_end.isoformat()}}
    prev_jobs = await db.jobs.find(prev_month_query, {"_id": 0}).to_list(10000)
    
    # All completed jobs for returning customers
    all_jobs = await db.jobs.find(query_base, {"_id": 0}).to_list(50000)
    
    # Calculate metrics
    current_cars = len(current_jobs)
    current_revenue = sum(j["price"] for j in current_jobs)
    prev_cars = len(prev_jobs)
    prev_revenue = sum(j["price"] for j in prev_jobs)
    
    # Average revenue per car
    avg_revenue_per_car = current_revenue / current_cars if current_cars > 0 else 0
    
    # Returning customers (customers with more than 1 job)
    customer_job_counts = {}
    for job in all_jobs:
        cid = job.get("customer_id")
        if cid:
            customer_job_counts[cid] = customer_job_counts.get(cid, 0) + 1
    returning_customers = sum(1 for count in customer_job_counts.values() if count > 1)
    
    # Top 10 customers by spending
    customer_spending = {}
    for job in all_jobs:
        cid = job.get("customer_id")
        cname = job.get("customer_name", "Ismeretlen")
        if cid:
            if cid not in customer_spending:
                customer_spending[cid] = {"customer_id": cid, "name": cname, "total": 0, "jobs": 0}
            customer_spending[cid]["total"] += job["price"]
            customer_spending[cid]["jobs"] += 1
    
    top_customers = sorted(customer_spending.values(), key=lambda x: x["total"], reverse=True)[:10]
    
    # Revenue per employee (current month)
    employee_revenue = {}
    for job in current_jobs:
        wid = job.get("worker_id")
        wname = job.get("worker_name", "Ismeretlen")
        if wid:
            if wid not in employee_revenue:
                employee_revenue[wid] = {"worker_id": wid, "name": wname, "revenue": 0, "cars": 0}
            employee_revenue[wid]["revenue"] += job["price"]
            employee_revenue[wid]["cars"] += 1
    
    # Revenue per location (current month)
    location_revenue = {}
    for job in current_jobs:
        loc = job.get("location")
        if loc:
            if loc not in location_revenue:
                location_revenue[loc] = {"location": loc, "revenue": 0, "cars": 0}
            location_revenue[loc]["revenue"] += job["price"]
            location_revenue[loc]["cars"] += 1
    
    # Month to month comparison
    cars_change = ((current_cars - prev_cars) / prev_cars * 100) if prev_cars > 0 else 0
    revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    # Day of week performance (0=Monday, 6=Sunday)
    day_performance = {i: {"day": i, "revenue": 0, "cars": 0, "count": 0} for i in range(7)}
    day_names = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"]
    
    for job in all_jobs:
        try:
            job_date = datetime.fromisoformat(job["date"].replace("Z", "+00:00"))
            dow = job_date.weekday()
            day_performance[dow]["revenue"] += job["price"]
            day_performance[dow]["cars"] += 1
            day_performance[dow]["count"] += 1
        except:
            pass
    
    # Calculate averages and find strongest/weakest days
    for i in range(7):
        d = day_performance[i]
        d["name"] = day_names[i]
        d["avg_revenue"] = round(d["revenue"] / max(d["count"], 1), 0)
        d["avg_cars"] = round(d["cars"] / max(d["count"], 1), 1)
    
    sorted_by_revenue = sorted(day_performance.values(), key=lambda x: x["avg_revenue"], reverse=True)
    strongest_days = sorted_by_revenue[:2]  # Top 2 strongest days
    weakest_days = sorted_by_revenue[-2:]  # Bottom 2 weakest days
    
    return {
        "avg_revenue_per_car": round(avg_revenue_per_car, 0),
        "returning_customers": returning_customers,
        "total_customers": len(customer_job_counts),
        "top_customers": top_customers,
        "month_comparison": {
            "current_month": {
                "cars": current_cars,
                "revenue": current_revenue
            },
            "previous_month": {
                "cars": prev_cars,
                "revenue": prev_revenue
            },
            "cars_change_percent": round(cars_change, 1),
            "revenue_change_percent": round(revenue_change, 1)
        },
        "employee_revenue": list(employee_revenue.values()),
        "location_revenue": list(location_revenue.values()),
        "day_performance": list(day_performance.values()),
        "strongest_days": strongest_days,
        "weakest_days": weakest_days
    }

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data(user: User = Depends(get_current_user)):
    """Seed initial data (admin only)"""
    
    # Check if already seeded
    service_count = await db.services.count_documents({})
    if service_count > 0:
        return {"message": "Adatok már léteznek"}
    
    # X-CLEAN Services based on the image
    services = [
        # Külső + Belső csomagok
        {"name": "Külső + Belső S", "category": "komplett", "price": 6000, "duration": 60, "car_size": "S", "package": "Eco"},
        {"name": "Külső + Belső M", "category": "komplett", "price": 7500, "duration": 75, "car_size": "M", "package": "Eco"},
        {"name": "Külső + Belső L", "category": "komplett", "price": 8600, "duration": 90, "car_size": "L", "package": "Eco"},
        {"name": "Külső + Belső XL", "category": "komplett", "price": 10100, "duration": 105, "car_size": "XL", "package": "Eco"},
        {"name": "Külső + Belső XXL", "category": "komplett", "price": 13000, "duration": 120, "car_size": "XXL", "package": "Eco"},
        {"name": "Külső + Belső S Pro", "category": "komplett", "price": 11800, "duration": 90, "car_size": "S", "package": "Pro"},
        {"name": "Külső + Belső M Pro", "category": "komplett", "price": 13100, "duration": 100, "car_size": "M", "package": "Pro"},
        {"name": "Külső + Belső L Pro", "category": "komplett", "price": 14200, "duration": 110, "car_size": "L", "package": "Pro"},
        {"name": "Külső + Belső XL Pro", "category": "komplett", "price": 16400, "duration": 120, "car_size": "XL", "package": "Pro"},
        {"name": "Külső + Belső XXL Pro", "category": "komplett", "price": 17400, "duration": 135, "car_size": "XXL", "package": "Pro"},
        {"name": "Külső + Belső S VIP", "category": "komplett", "price": 14700, "duration": 120, "car_size": "S", "package": "VIP"},
        {"name": "Külső + Belső M VIP", "category": "komplett", "price": 16400, "duration": 130, "car_size": "M", "package": "VIP"},
        {"name": "Külső + Belső L VIP", "category": "komplett", "price": 17800, "duration": 140, "car_size": "L", "package": "VIP"},
        {"name": "Külső + Belső XL VIP", "category": "komplett", "price": 20500, "duration": 150, "car_size": "XL", "package": "VIP"},
        {"name": "Külső + Belső XXL VIP", "category": "komplett", "price": 21700, "duration": 165, "car_size": "XXL", "package": "VIP"},
        
        # Külső szolgáltatások
        {"name": "Külső tisztítás S", "category": "kulso", "price": 4000, "duration": 30, "car_size": "S"},
        {"name": "Külső tisztítás M", "category": "kulso", "price": 4800, "duration": 35, "car_size": "M"},
        {"name": "Külső tisztítás L", "category": "kulso", "price": 5500, "duration": 40, "car_size": "L"},
        {"name": "Külső tisztítás XL", "category": "kulso", "price": 6300, "duration": 45, "car_size": "XL"},
        {"name": "Külső tisztítás XXL", "category": "kulso", "price": 8000, "duration": 50, "car_size": "XXL"},
        
        # Belső szolgáltatások
        {"name": "Belső tisztítás S", "category": "belso", "price": 3000, "duration": 30, "car_size": "S"},
        {"name": "Belső tisztítás M", "category": "belso", "price": 3500, "duration": 35, "car_size": "M"},
        {"name": "Belső tisztítás L", "category": "belso", "price": 4000, "duration": 40, "car_size": "L"},
        {"name": "Belső tisztítás XL", "category": "belso", "price": 4800, "duration": 45, "car_size": "XL"},
        {"name": "Belső tisztítás XXL", "category": "belso", "price": 6300, "duration": 50, "car_size": "XXL"},
        
        # Extrák
        {"name": "Vízkő eltávolítás", "category": "extra", "price": 9000, "duration": 30, "description": "Vízkő eltávolítása"},
        {"name": "Gyanta eltávolítás", "category": "extra", "price": 3000, "duration": 20, "description": "Gyanta eltávolítása"},
        {"name": "Liquid kerámia", "category": "extra", "price": 12000, "duration": 45, "description": "Liquid kerámia bevonat"},
        {"name": "Légtér ózonos fertőtlenítés", "category": "extra", "price": 8000, "duration": 30, "description": "Klíma és légtér fertőtlenítés"},
        {"name": "Komplett kárpittisztítás", "category": "extra", "price": 28000, "duration": 120, "description": "Teljes kárpittisztítás"},
        {"name": "Kárpittisztítás/ülés", "category": "extra", "price": 7000, "duration": 30, "description": "Egy ülés tisztítása"},
        {"name": "Folteltávolítás", "category": "extra", "price": 3000, "duration": 20, "description": "Foltok eltávolítása"},
        {"name": "3 fázisú bőrápolás/ülés", "category": "extra", "price": 7000, "duration": 30, "description": "Bőrülés ápolás"},
        {"name": "Komplett 3 fázisú bőrápolás", "category": "extra", "price": 30000, "duration": 90, "description": "Teljes bőrápolás"},
        {"name": "Állatszőr eltávolítás", "category": "extra", "price": 5000, "duration": 30, "description": "Állatszőr eltávolítása"},
        {"name": "Eladásra felkészítés", "category": "extra", "price": 50000, "duration": 240, "description": "Komplett felkészítés eladásra"},
    ]
    
    for s in services:
        service = Service(**s)
        doc = service.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.services.insert_one(doc)
    
    # Sample workers
    workers = [
        {"name": "Kovács Péter", "location": "Budapest", "phone": "+36 30 123 4567"},
        {"name": "Nagy István", "location": "Budapest", "phone": "+36 30 234 5678"},
        {"name": "Szabó János", "location": "Debrecen", "phone": "+36 30 345 6789"},
        {"name": "Tóth Gábor", "location": "Debrecen", "phone": "+36 30 456 7890"},
    ]
    
    for w in workers:
        worker = Worker(**w)
        doc = worker.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.workers.insert_one(doc)
    
    # Sample inventory
    inventory_items = [
        {"product_name": "Autósampon", "current_quantity": 50, "min_level": 10, "unit": "liter", "location": "Budapest"},
        {"product_name": "Autósampon", "current_quantity": 45, "min_level": 10, "unit": "liter", "location": "Debrecen"},
        {"product_name": "Wax", "current_quantity": 20, "min_level": 5, "unit": "db", "location": "Budapest"},
        {"product_name": "Wax", "current_quantity": 15, "min_level": 5, "unit": "db", "location": "Debrecen"},
        {"product_name": "Mikroszálas kendő", "current_quantity": 100, "min_level": 20, "unit": "db", "location": "Budapest"},
        {"product_name": "Mikroszálas kendő", "current_quantity": 80, "min_level": 20, "unit": "db", "location": "Debrecen"},
        {"product_name": "Kerámia bevonat", "current_quantity": 8, "min_level": 5, "unit": "db", "location": "Budapest"},
        {"product_name": "Kerámia bevonat", "current_quantity": 3, "min_level": 5, "unit": "db", "location": "Debrecen"},
        {"product_name": "Belső tisztító spray", "current_quantity": 25, "min_level": 10, "unit": "db", "location": "Budapest"},
        {"product_name": "Belső tisztító spray", "current_quantity": 18, "min_level": 10, "unit": "db", "location": "Debrecen"},
    ]
    
    for item in inventory_items:
        inv = Inventory(**item)
        doc = inv.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.inventory.insert_one(doc)
    
    return {"message": "Adatok sikeresen létrehozva"}

# ===================== IMAGE UPLOAD =====================

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload image and return base64 data URL"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Csak képfájl tölthető fel")
    
    # Read and encode to base64
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    # Store in database for persistence
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    await db.images.insert_one({
        "image_id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "data_url": data_url,
        "uploaded_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"image_id": image_id, "url": data_url}

@api_router.get("/images/{image_id}")
async def get_image(image_id: str, user: User = Depends(get_current_user)):
    """Get image by ID"""
    image = await db.images.find_one({"image_id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Kép nem található")
    return image

# ===================== NOTIFICATIONS =====================

@api_router.get("/notifications/low-stock")
async def get_low_stock_notifications(user: User = Depends(get_current_user)):
    """Get low stock items as notifications"""
    items = await db.inventory.find({}, {"_id": 0}).to_list(500)
    low_stock = []
    for item in items:
        if item.get("current_quantity", 0) < item.get("min_level", 0):
            low_stock.append({
                "inventory_id": item.get("inventory_id"),
                "product_name": item.get("product_name"),
                "current_quantity": item.get("current_quantity"),
                "min_level": item.get("min_level"),
                "location": item.get("location", ""),
                "severity": "critical" if item.get("current_quantity", 0) == 0 else "warning"
            })
    return low_stock

@api_router.get("/notifications/bookings")
async def get_booking_notifications(user: User = Depends(get_current_user)):
    """Get unread booking notifications"""
    notifications = await db.notifications.find(
        {"type": "new_booking", "read": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Értesítés olvasottnak jelölve"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all booking notifications as read"""
    await db.notifications.update_many(
        {"type": "new_booking", "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Összes értesítés olvasottnak jelölve"}

# ===================== SMS (TWILIO) =====================

class SMSRequest(BaseModel):
    phone_number: str
    message: str

@api_router.post("/send-sms")
async def send_sms(data: SMSRequest, user: User = Depends(get_current_user)):
    """Send SMS via Twilio"""
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        raise HTTPException(status_code=503, detail="SMS szolgáltatás nincs konfigurálva. Kérjük adja meg a Twilio API kulcsokat a .env fájlban.")
    
    try:
        message = twilio_client.messages.create(
            body=data.message,
            from_=TWILIO_PHONE_NUMBER,
            to=data.phone_number
        )
        return {"status": "sent", "sid": message.sid}
    except Exception as e:
        logging.error(f"SMS sending failed: {e}")
        raise HTTPException(status_code=500, detail=f"SMS küldés sikertelen: {str(e)}")

@api_router.post("/jobs/{job_id}/notify-customer")
async def notify_customer_job_done(job_id: str, user: User = Depends(get_current_user)):
    """Send SMS to customer when job is completed"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")
    
    # Find customer
    customer = await db.customers.find_one({"customer_id": job.get("customer_id")}, {"_id": 0})
    if not customer or not customer.get("phone"):
        raise HTTPException(status_code=400, detail="Ügyfél telefonszáma nem elérhető")
    
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        raise HTTPException(status_code=503, detail="SMS szolgáltatás nincs konfigurálva. Kérjük adja meg a Twilio API kulcsokat a .env fájlban.")
    
    message_text = f"Kedves {customer.get('name', 'Ügyfelünk')}! Az autója elkészült az X-CLEAN autómosóban. Várjuk szeretettel!"
    
    try:
        message = twilio_client.messages.create(
            body=message_text,
            from_=TWILIO_PHONE_NUMBER,
            to=customer["phone"]
        )
        
        # Mark notification sent
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {"sms_sent": True, "sms_sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"status": "sent", "sid": message.sid, "message": message_text}
    except Exception as e:
        logging.error(f"Customer SMS failed: {e}")
        raise HTTPException(status_code=500, detail=f"SMS küldés sikertelen: {str(e)}")

# ===================== EMAIL (RESEND) =====================

class EmailRequest(BaseModel):
    recipient_email: str
    subject: str
    html_content: str

@api_router.post("/send-email")
async def send_email(data: EmailRequest, user: User = Depends(get_current_user)):
    """Send email via Resend"""
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email szolgáltatás nincs konfigurálva. Kérjük adja meg a Resend API kulcsot a .env fájlban.")
    
    import resend
    params = {
        "from": SENDER_EMAIL,
        "to": [data.recipient_email],
        "subject": data.subject,
        "html": data.html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "email_id": email.get("id")}
    except Exception as e:
        logging.error(f"Email sending failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email küldés sikertelen: {str(e)}")

# ===================== ROOT ROUTE =====================

@api_router.get("/")
async def root():
    return {"message": "X-CLEAN API", "version": "1.0.0"}

# Include router
# ===================== AI ROUTES =====================

class UpsellRequest(BaseModel):
    service_id: str
    car_type: str

class PhotoAnalysisRequest(BaseModel):
    images: List[str]  # List of base64 encoded images

@api_router.post("/ai/upsell")
async def get_upsell_suggestions(data: UpsellRequest):
    """AI-powered upsell suggestions based on service and car type"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nem elérhető")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get all services
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        service_list = "\n".join([f"- {s['name']}: {s.get('price', 0)} Ft" for s in services])
        
        # Get selected service
        selected = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
        selected_name = selected["name"] if selected else "Ismeretlen"
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"upsell_{uuid.uuid4().hex[:8]}",
            system_message="Te egy autómosó szakértő vagy. Magyar nyelven válaszolj, röviden és tömören."
        ).with_model("gemini", "gemini-2.5-flash")
        
        prompt = f"""Az ügyfél autója: {data.car_type}
Kiválasztott szolgáltatás: {selected_name}

Elérhető szolgáltatások:
{service_list}

Javasolj maximum 2 kiegészítő szolgáltatást, ami illeszkedik az autó típusához és a kiválasztott szolgáltatáshoz. 
Válaszolj JSON formátumban: {{"suggestions": [{{"name": "szolgáltatás neve", "reason": "miért ajánlod röviden"}}]}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response
        try:
            # Try to extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                return result
        except:
            pass
        
        return {"suggestions": [], "raw_response": response}
        
    except Exception as e:
        logging.error(f"AI upsell error: {e}")
        return {"suggestions": [], "error": str(e)}

@api_router.post("/ai/photo-analysis")
async def analyze_car_photos(data: PhotoAnalysisRequest):
    """AI-powered car photo analysis for service recommendations"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nem elérhető")
    
    if not data.images or len(data.images) == 0:
        raise HTTPException(status_code=400, detail="Legalább egy kép szükséges")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        # Get all services for recommendations
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        service_list = "\n".join([f"- {s['name']}: {s.get('price', 0)} Ft ({s.get('category', '')})" for s in services])
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"photo_{uuid.uuid4().hex[:8]}",
            system_message="Te egy autómosó szakértő vagy aki képek alapján felméri az autó állapotát. Magyar nyelven válaszolj."
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Create image contents
        image_contents = []
        for img_base64 in data.images[:5]:  # Max 5 images
            # Remove data URL prefix if present
            if "," in img_base64:
                img_base64 = img_base64.split(",")[1]
            image_contents.append(ImageContent(image_base64=img_base64))
        
        prompt = f"""Elemezd ezeket az autófotókat és adj állapotfelmérést!

Értékeld:
1. Külső szennyezettség (1-10 skála, 10=nagyon koszos)
2. Belső szennyezettség (ha látható, 1-10)
3. Autó mérete (S/M/L/XL/XXL)
4. Lakk állapota (jó/közepes/rossz)
5. Felni állapota (ha látható)

Elérhető szolgáltatásaink:
{service_list}

Válaszolj JSON formátumban:
{{
  "exterior_dirt_level": 1-10,
  "interior_dirt_level": 1-10 vagy null,
  "car_size": "S/M/L/XL/XXL",
  "paint_condition": "jó/közepes/rossz",
  "wheel_condition": "jó/közepes/rossz" vagy null,
  "analysis_text": "Rövid szöveges értékelés",
  "recommended_services": ["szolgáltatás1", "szolgáltatás2"],
  "estimated_price_range": {{"min": szám, "max": szám}}
}}"""

        response = await chat.send_message(UserMessage(
            text=prompt,
            image_contents=image_contents
        ))
        
        # Parse response
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                return result
        except:
            pass
        
        return {"analysis_text": response, "recommended_services": []}
        
    except Exception as e:
        logging.error(f"AI photo analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Hiba a képelemzéskor: {str(e)}")

class QuoteRequest(BaseModel):
    car_type: str
    car_size: Optional[str] = None  # S/M/L/XL/XXL
    exterior_dirt_level: Optional[int] = None  # 1-10
    interior_dirt_level: Optional[int] = None  # 1-10
    services_requested: Optional[List[str]] = None
    notes: Optional[str] = None

@api_router.post("/ai/quote")
async def generate_quote(data: QuoteRequest):
    """AI-powered quote generation based on car details"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nem elérhető")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get all services with prices
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        service_list = "\n".join([f"- {s['name']}: {s.get('price', 0)} Ft (kategória: {s.get('category', 'egyéb')}, méret: {s.get('car_size', 'mind')})" for s in services])
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quote_{uuid.uuid4().hex[:8]}",
            system_message="Te egy autómosó árajánlat készítő szakértő vagy. Magyar nyelven válaszolj, pontosan és részletesen."
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Build context
        context_parts = [f"Autó típusa: {data.car_type}"]
        if data.car_size:
            context_parts.append(f"Autó mérete: {data.car_size}")
        if data.exterior_dirt_level:
            context_parts.append(f"Külső szennyezettség: {data.exterior_dirt_level}/10")
        if data.interior_dirt_level:
            context_parts.append(f"Belső szennyezettség: {data.interior_dirt_level}/10")
        if data.services_requested:
            context_parts.append(f"Kért szolgáltatások: {', '.join(data.services_requested)}")
        if data.notes:
            context_parts.append(f"Megjegyzés: {data.notes}")
        
        context = "\n".join(context_parts)
        
        prompt = f"""Készíts részletes árajánlatot az alábbi autóhoz:

{context}

Elérhető szolgáltatásaink és áraink:
{service_list}

Készíts árajánlatot JSON formátumban:
{{
  "recommended_package": {{
    "name": "ajánlott csomag neve",
    "services": ["szolgáltatás1", "szolgáltatás2"],
    "total_price": összár,
    "estimated_duration_minutes": becsült idő percben,
    "reason": "miért ezt ajánlod"
  }},
  "alternatives": [
    {{
      "name": "alternatív csomag",
      "services": ["szolgáltatás"],
      "total_price": ár,
      "estimated_duration_minutes": idő
    }}
  ],
  "extras_suggested": ["opcionális extra1", "extra2"],
  "notes": "egyéb megjegyzés az ügyfélnek"
}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                return result
        except:
            pass
        
        return {"raw_response": response, "error": "Could not parse AI response"}
        
    except Exception as e:
        logging.error(f"AI quote error: {e}")
        raise HTTPException(status_code=500, detail=f"Hiba az árajánlat készítéskor: {str(e)}")

app.include_router(api_router)

# CORS middleware - use environment variable for origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
