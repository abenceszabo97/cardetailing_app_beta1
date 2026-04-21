"""
SMS / WhatsApp notification service via Twilio
"""
import logging
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger(__name__)


def _format_e164(phone: str) -> str:
    """Convert Hungarian phone number to E.164 format (+36XXXXXXXXX)."""
    digits = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if digits.startswith("+"):
        return digits
    if digits.startswith("06"):
        return "+36" + digits[2:]
    if digits.startswith("36") and len(digits) == 11:
        return "+" + digits
    # Bare 9-digit local number
    if len(digits) == 9:
        return "+36" + digits
    return digits


async def send_sms(to_phone: str, message: str, use_whatsapp: bool = False) -> dict:
    """Send an SMS (or WhatsApp) message via Twilio.

    Args:
        to_phone: Recipient phone number (any Hungarian format).
        message: Plain-text message body (max ~160 chars for single-part SMS).
        use_whatsapp: If True, send via WhatsApp channel instead of SMS.
    """
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
        logger.warning("Twilio not configured – SMS skipped")
        return {"status": "skipped", "reason": "Twilio not configured"}

    try:
        from twilio.rest import Client  # imported lazily so startup is unaffected when Twilio is absent
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        to_number = _format_e164(to_phone)
        from_number = TWILIO_PHONE_NUMBER

        if use_whatsapp:
            to_number = f"whatsapp:{to_number}"
            from_number = f"whatsapp:{from_number}"

        msg = client.messages.create(body=message, from_=from_number, to=to_number)
        logger.info(f"SMS sent (sid={msg.sid}) to {to_phone}")
        return {"status": "success", "sid": msg.sid}
    except Exception as exc:
        logger.error(f"SMS send failed for {to_phone}: {exc}")
        return {"status": "error", "detail": str(exc)}


async def send_booking_confirmation_sms(booking: dict) -> dict:
    """Send an immediate booking-confirmation SMS after a new booking is created."""
    phone = booking.get("phone", "")
    if not phone:
        return {"status": "skipped", "reason": "No phone number"}

    date = booking.get("date", "")
    time = booking.get("time_slot", "")
    service = booking.get("service_name", "")
    location = booking.get("location", "")
    booking_id = booking.get("booking_id", "")

    message = (
        f"X-CLEAN foglalás visszaigazolva ✅\n"
        f"{date} {time} – {service}\n"
        f"Telephely: {location}\n"
        f"Azonosító: {booking_id}\n"
        f"Módosítás/lemondás: xclean.hu"
    )
    return await send_sms(phone, message)


async def send_booking_reminder_sms(booking: dict) -> dict:
    """Send a 24-hour-before reminder SMS."""
    phone = booking.get("phone", "")
    if not phone:
        return {"status": "skipped", "reason": "No phone number"}

    date = booking.get("date", "")
    time = booking.get("time_slot", "")
    service = booking.get("service_name", "")
    location = booking.get("location", "")

    message = (
        f"X-CLEAN emlékeztető ⏰\n"
        f"Holnap: {date} {time}\n"
        f"{service} – {location}\n"
        f"Ha nem tud jönni, kérem jelezze!"
    )
    return await send_sms(phone, message)
