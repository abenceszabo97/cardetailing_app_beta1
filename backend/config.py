"""
X-CLEAN Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# CORS
_cors_raw = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",")]
print(f"[CONFIG] CORS_ORIGINS loaded: {CORS_ORIGINS}")

# Groq AI (FREE)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Twilio SMS
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

# Resend Email
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# Booking frontend base URL (for self-service links in emails)
BOOKING_FRONTEND_URL = os.environ.get("BOOKING_FRONTEND_URL", "https://xclean.hu/foglalas")

# JWT Settings
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "xclean-secret-key-change-in-production-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days
