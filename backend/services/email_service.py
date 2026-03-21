"""
Email Service using Resend
Sends booking confirmation emails
"""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service initialized")
else:
    logger.warning("RESEND_API_KEY not set - email service disabled")


def generate_booking_confirmation_html(booking: dict) -> str:
    """Generate HTML email for booking confirmation"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .detail-row {{ display: flex; padding: 12px 0; border-bottom: 1px solid #eee; }}
            .detail-label {{ font-weight: bold; color: #666; width: 40%; }}
            .detail-value {{ color: #333; width: 60%; }}
            .highlight {{ background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .info-box {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            .price {{ font-size: 28px; color: #22c55e; font-weight: bold; }}
            .contact-info {{ margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }}
            .contact-row {{ padding: 5px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>xClean Autókozmetika</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Foglalás visszaigazolása</p>
            </div>
            <div class="content">
                <p>Kedves <strong>{booking.get('customer_name', 'Ügyfelünk')}</strong>!</p>
                <p>Köszönjük a foglalását! Az alábbiakban találja a foglalás részleteit:</p>
                
                <div class="highlight">
                    <div class="detail-row">
                        <span class="detail-label">Szolgáltatás:</span>
                        <span class="detail-value">{booking.get('service_name', '-')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dátum:</span>
                        <span class="detail-value">{booking.get('date', '-')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Időpont:</span>
                        <span class="detail-value">{booking.get('time_slot', '-')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Helyszín:</span>
                        <span class="detail-value">{booking.get('location', '-')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Rendszám:</span>
                        <span class="detail-value">{booking.get('plate_number', '-')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Autó típus:</span>
                        <span class="detail-value">{booking.get('car_type', '-')}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin-bottom: 5px;">Fizetendő összeg:</p>
                    <p class="price">{booking.get('price', 0):,.0f} Ft</p>
                </div>
                
                <div class="info-box">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Fontos információ érkezéskor:</p>
                    <p style="margin: 0; color: #78350f; font-size: 14px;">
                        A mélygarázsnál csengő van kihelyezve, kérjük azt használja, hogy kollégáink be tudják engedni a sorompón. 
                        Ha nem reagálnak, akkor nyugodtan hívja azt a kollégát akihez érkezett:
                    </p>
                    <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
                        <strong>Bence:</strong> +36 30 636 7565<br>
                        <strong>Attila:</strong> +36 30 665 7623
                    </p>
                </div>
            </div>
            <div class="footer">
                <p style="font-weight: bold; margin-bottom: 10px;">xClean Autókozmetika</p>
                <div class="contact-info">
                    <div class="contact-row">4034 Debrecen, Vágóhíd u. 2.</div>
                    <div class="contact-row">Telefon: 06 (20) 473 9638</div>
                    <div class="contact-row">Időpontfoglalás: rendeles@xclean.hu</div>
                    <div class="contact-row">Egyéb: info@xclean.hu</div>
                    <div class="contact-row" style="margin-top: 10px;"><strong>Nyitvatartás:</strong> Hétfő - Szombat: 08:00 - 19:00, Vasárnap: Zárva</div>
                </div>
                <p style="margin-top: 15px; font-size: 11px; color: #999;">Ez egy automatikusan generált email, kérjük ne válaszoljon rá.</p>
            </div>
        </div>
    </body>
    </html>
    """


async def send_booking_confirmation(booking: dict) -> dict:
    """Send booking confirmation email"""
    if not RESEND_API_KEY:
        logger.warning("Email not sent - RESEND_API_KEY not configured")
        return {"status": "skipped", "message": "Email service not configured"}
    
    email = booking.get("email")
    if not email:
        logger.warning("Email not sent - no email address provided")
        return {"status": "skipped", "message": "No email address provided"}
    
    try:
        html_content = generate_booking_confirmation_html(booking)
        
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"Foglalás visszaigazolás - xClean Autókozmetika - {booking.get('date', '')}",
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        result = await asyncio.to_thread(resend.Emails.send, params)
        
        logger.info(f"Booking confirmation email sent to {email}")
        return {
            "status": "success",
            "message": f"Email sent to {email}",
            "email_id": result.get("id") if isinstance(result, dict) else str(result)
        }
    except Exception as e:
        logger.error(f"Failed to send booking confirmation email: {str(e)}")
        return {"status": "error", "message": str(e)}
