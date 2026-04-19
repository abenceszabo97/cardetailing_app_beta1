"""
X-CLEAN API - Main Entry Point
Clean Fleet Hub - Car Wash Management System
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging

from config import CORS_ORIGINS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, RESEND_API_KEY
from database import db, close_db
from routes import api_router

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Log integrations status
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    logger.info("Twilio SMS integration initialized")
if RESEND_API_KEY:
    logger.info("Resend email integration initialized")

logger.info(f"CORS Origins configured: {CORS_ORIGINS}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("X-CLEAN API starting up...")
    
    # Warn if using default (insecure) JWT secret
    from config import JWT_SECRET_KEY
    if JWT_SECRET_KEY == "xclean-secret-key-change-in-production-2024":
        logger.warning("⚠️  JWT_SECRET_KEY is the default insecure value! Set JWT_SECRET_KEY env variable in Railway immediately.")

    # Check Cloudinary configuration
    try:
        from services.storage_service import get_cloudinary_config
        config = get_cloudinary_config()
        if config["configured"]:
            logger.info(f"Cloudinary configured: {config['cloud_name']}")
        else:
            logger.warning("Cloudinary not configured - image uploads will fail")
    except Exception as e:
        logger.warning(f"Cloudinary config check failed: {e}")

    # Create MongoDB indexes for performance and data integrity
    try:
        # Bookings
        await db.bookings.create_index("plate_number")
        await db.bookings.create_index([("date", 1), ("location", 1)])
        await db.bookings.create_index("status")
        await db.bookings.create_index("modify_token", sparse=True)
        await db.bookings.create_index("cancel_token", sparse=True)
        await db.bookings.create_index("review_token", sparse=True)
        # Customers
        await db.customers.create_index("plate_number", unique=True)
        # Workers
        await db.workers.create_index("worker_id", unique=True)
        await db.workers.create_index([("location", 1), ("active", 1)])
        # Shifts
        await db.shifts.create_index([("worker_id", 1), ("start_time", 1)])
        await db.shifts.create_index("shift_id", unique=True)
        # Jobs
        await db.jobs.create_index([("worker_id", 1), ("date", 1)])
        await db.jobs.create_index("plate_number")
        await db.jobs.create_index([("location", 1), ("date", 1)])
        # Sessions — TTL: auto-delete expired sessions from MongoDB
        await db.user_sessions.create_index("session_token")
        await db.user_sessions.create_index(
            "expires_at",
            expireAfterSeconds=0  # MongoDB TTL index: removes doc when expires_at passes
        )
        # Reviews
        await db.reviews.create_index("booking_id", unique=True, sparse=True)
        logger.info("MongoDB indexes created/verified")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
    
    # Start background reminder task
    import asyncio
    reminder_task = asyncio.create_task(reminder_loop())
    
    yield
    
    # Shutdown
    logger.info("X-CLEAN API shutting down...")
    reminder_task.cancel()
    await close_db()


async def reminder_loop():
    """Background task: check for bookings that need reminders every hour"""
    import asyncio
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            tomorrow = now + timedelta(hours=24)
            tomorrow_date = tomorrow.strftime("%Y-%m-%d")
            
            bookings = await db.bookings.find({
                "date": {"$regex": f"^{tomorrow_date}"},
                "status": {"$in": ["foglalt", "visszaigazolva"]},
                "reminder_sent": {"$ne": True}
            }, {"_id": 0}).to_list(100)
            
            if bookings:
                logger.info(f"Sending {len(bookings)} reminders for {tomorrow_date}")
                for booking in bookings:
                    reminder_ok = False
                    # Email reminder
                    email = booking.get("email")
                    if email:
                        try:
                            from services.email_service import send_booking_reminder
                            result = await send_booking_reminder(booking)
                            if result.get("status") == "success":
                                reminder_ok = True
                        except Exception as e:
                            logger.error(f"Reminder email error: {e}")
                    # SMS reminder
                    phone = booking.get("phone")
                    if phone:
                        try:
                            from services.sms_service import send_booking_reminder_sms
                            sms_result = await send_booking_reminder_sms(booking)
                            if sms_result.get("status") == "success":
                                reminder_ok = True
                            logger.info(f"Reminder SMS: {sms_result.get('status')}")
                        except Exception as e:
                            logger.error(f"Reminder SMS error: {e}")
                    if reminder_ok:
                        await db.bookings.update_one(
                            {"booking_id": booking["booking_id"]},
                            {"$set": {"reminder_sent": True}}
                        )
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Reminder loop error: {e}")
            await asyncio.sleep(60)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter for public write endpoints."""
    def __init__(self, app, max_requests: int = 15, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        # Protect: POST /api/bookings, available-slots, token modify, and login (brute force)
        limited = (
            (method == "POST" and path == "/api/bookings") or
            (method == "GET" and "/api/bookings/available-slots" in path) or
            (method == "PUT" and "/api/bookings/by-token/" in path) or
            (method == "POST" and path == "/api/auth/login")
        )
        if limited:
            ip = request.client.host if request.client else "unknown"
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(seconds=self.window_seconds)
            self._store[ip] = [t for t in self._store[ip] if t > cutoff]
            if len(self._store[ip]) >= self.max_requests:
                return Response(
                    content='{"detail":"Túl sok kérés. Kérjük várjon egy percet."}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
            self._store[ip].append(now)
        return await call_next(request)


app = FastAPI(
    title="X-CLEAN API",
    version="2.0.0",
    description="Clean Fleet Hub - Car Wash Management System",
    lifespan=lifespan
)

# Determine if we should use wildcard or specific origins
# When credentials are True, we can't use "*" directly, so we echo the origin
allow_all = "*" in CORS_ORIGINS

if allow_all:
    # For wildcard, we need to handle it specially with credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False with wildcard
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # For specific origins, credentials can be True
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Rate limiting (before CORS so it fires early)
app.add_middleware(RateLimitMiddleware, max_requests=15, window_seconds=60)

# Add explicit OPTIONS handler for preflight with credentials support
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str):
    origin = request.headers.get("origin", "")
    response = Response(status_code=200)
    
    if origin:
        if allow_all or origin in CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cookie, X-Requested-With"
            response.headers["Access-Control-Max-Age"] = "600"
    
    return response

# Health check endpoint (no auth required)
@app.get("/api/health")
async def health_check():
    """Health check for deployment"""
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# Include all API routes
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
