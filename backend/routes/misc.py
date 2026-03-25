"""
Misc Routes (Upload, SMS, Email, Root)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import base64
import uuid
import logging
import asyncio
from dependencies import get_current_user
from database import db
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, RESEND_API_KEY, SENDER_EMAIL
from models.user import User

router = APIRouter()

# ===================== IMAGE UPLOAD =====================

@router.post("/upload")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload image and return base64"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Csak kép fájlok engedélyezettek")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Maximum 10MB")
    
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    b64 = base64.b64encode(content).decode()
    
    await db.images.insert_one({
        "image_id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "data": b64
    })
    
    return {"image_id": image_id, "url": f"/api/images/{image_id}"}

@router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Get image by ID - returns actual image content"""
    from fastapi.responses import Response
    
    img = await db.images.find_one({"image_id": image_id}, {"_id": 0})
    if not img:
        raise HTTPException(status_code=404, detail="Kép nem található")
    
    # Decode base64 and return as image
    try:
        # Handle both formats: 'data' field (raw base64) and 'data_url' field (data URL format)
        if "data" in img:
            base64_data = img["data"]
        elif "data_url" in img:
            # Extract base64 from data URL format: "data:image/png;base64,..."
            data_url = img["data_url"]
            if ";base64," in data_url:
                base64_data = data_url.split(";base64,")[1]
            else:
                base64_data = data_url
        else:
            raise HTTPException(status_code=500, detail="Kép adat nem található")
        
        image_data = base64.b64decode(base64_data)
        content_type = img.get("content_type", "image/jpeg")
        return Response(content=image_data, media_type=content_type)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error decoding image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Hiba a kép dekódolásakor")

# ===================== SMS (TWILIO) =====================

class SMSRequest(BaseModel):
    to: str
    message: str

@router.post("/send-sms")
async def send_sms(data: SMSRequest, user: User = Depends(get_current_user)):
    """Send SMS via Twilio"""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="SMS szolgáltatás nincs konfigurálva")
    
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = twilio_client.messages.create(
            body=data.message,
            from_=TWILIO_PHONE_NUMBER,
            to=data.to
        )
        return {"message_id": message.sid, "status": "sent"}
    except Exception as e:
        logging.error(f"SMS send error: {e}")
        raise HTTPException(status_code=500, detail=f"SMS küldési hiba: {str(e)}")

@router.post("/jobs/{job_id}/notify-customer")
async def notify_customer_job_done(job_id: str, user: User = Depends(get_current_user)):
    """Send SMS to customer that car is ready"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")
    
    customer = await db.customers.find_one({"customer_id": job["customer_id"]}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Ügyfél nem található")
    
    phone = customer.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Ügyfélnek nincs telefonszáma")
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="SMS szolgáltatás nincs konfigurálva")
    
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = twilio_client.messages.create(
            body=f"Kedves {customer['name']}! Az Ön autója ({job['plate_number']}) elkészült az X-CLEAN-nél. Várjuk szeretettel!",
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
        return {"message_id": message.sid, "status": "sent"}
    except Exception as e:
        logging.error(f"SMS notification error: {e}")
        raise HTTPException(status_code=500, detail=f"SMS küldési hiba: {str(e)}")

# ===================== EMAIL (RESEND) =====================

class EmailRequest(BaseModel):
    to: List[str]
    subject: str
    html: str

@router.post("/send-email")
async def send_email(data: EmailRequest, user: User = Depends(get_current_user)):
    """Send email via Resend"""
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email szolgáltatás nincs konfigurálva")
    
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": data.to,
            "subject": data.subject,
            "html": data.html
        })
        return {"status": "sent", "id": result.get("id")}
    except Exception as e:
        logging.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail=f"Email küldési hiba: {str(e)}")

# ===================== ROOT ROUTE =====================

@router.get("/")
async def root():
    """Root endpoint"""
    return {"message": "X-CLEAN API", "version": "2.0.0"}
