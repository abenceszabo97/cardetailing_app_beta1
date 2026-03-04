from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

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
    location: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    location: str
    user_id: Optional[str] = None

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
    current_quantity: Optional[float] = None
    min_level: Optional[float] = None

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

class DayOpenCreate(BaseModel):
    location: str
    opening_balance: float

class DayCloseCreate(BaseModel):
    location: str
    notes: Optional[str] = None

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
async def delete_customer(customer_id: str, user: User = Depends(require_admin)):
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
async def create_service(data: ServiceCreate, user: User = Depends(require_admin)):
    """Create new service (admin only)"""
    service = Service(**data.model_dump())
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return service.model_dump()

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, data: ServiceCreate, user: User = Depends(require_admin)):
    """Update service (admin only)"""
    result = await db.services.update_one(
        {"service_id": service_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    return {"message": "Szolgáltatás frissítve"}

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: User = Depends(require_admin)):
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
async def create_worker(data: WorkerCreate, user: User = Depends(require_admin)):
    """Create new worker (admin only)"""
    worker = Worker(**data.model_dump())
    doc = worker.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.workers.insert_one(doc)
    return worker.model_dump()

@api_router.put("/workers/{worker_id}")
async def update_worker(worker_id: str, data: WorkerCreate, user: User = Depends(require_admin)):
    """Update worker (admin only)"""
    result = await db.workers.update_one(
        {"worker_id": worker_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    return {"message": "Dolgozó frissítve"}

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, user: User = Depends(require_admin)):
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
    """Get today's jobs"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
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
async def delete_job(job_id: str, user: User = Depends(require_admin)):
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
async def create_shift(data: ShiftCreate, user: User = Depends(require_admin)):
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
async def delete_shift(shift_id: str, user: User = Depends(require_admin)):
    """Delete shift (admin only)"""
    result = await db.shifts.delete_one({"shift_id": shift_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Műszak nem található")
    return {"message": "Műszak törölve"}

# ===================== INVENTORY ROUTES =====================

@api_router.get("/inventory")
async def get_inventory(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get inventory"""
    query = {}
    if location:
        query["location"] = location
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return inventory

@api_router.post("/inventory")
async def create_inventory(data: InventoryCreate, user: User = Depends(require_admin)):
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
async def delete_inventory(inventory_id: str, user: User = Depends(require_admin)):
    """Delete inventory item (admin only)"""
    result = await db.inventory.delete_one({"inventory_id": inventory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Készlet tétel nem található")
    return {"message": "Készlet törölve"}

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
    """Get today's day record"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    record = await db.day_records.find_one({
        "location": location,
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0})
    
    return record

@api_router.post("/day-records/open")
async def open_day(data: DayOpenCreate, user: User = Depends(get_current_user)):
    """Open day"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    # Check if already open
    existing = await db.day_records.find_one({
        "location": data.location,
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
    """Close day"""
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
    closing_balance = record["opening_balance"] + cash_total
    
    await db.day_records.update_one(
        {"record_id": record["record_id"]},
        {"$set": {
            "status": "closed",
            "total_cars": total_cars,
            "cash_total": cash_total,
            "card_total": card_total,
            "closing_balance": closing_balance,
            "notes": data.notes,
            "closed_by": user.user_id,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Nap lezárva", "total_cars": total_cars, "cash_total": cash_total, "card_total": card_total}

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

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data(user: User = Depends(require_admin)):
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

# ===================== ROOT ROUTE =====================

@api_router.get("/")
async def root():
    return {"message": "X-CLEAN API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
