"""
X-CLEAN API - Main Entry Point
Clean Fleet Hub - Car Wash Management System
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
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
    yield
    # Shutdown
    logger.info("X-CLEAN API shutting down...")
    await close_db()

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
