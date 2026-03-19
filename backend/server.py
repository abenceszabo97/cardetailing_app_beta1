"""
X-CLEAN API - Main Entry Point
Clean Fleet Hub - Car Wash Management System
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
