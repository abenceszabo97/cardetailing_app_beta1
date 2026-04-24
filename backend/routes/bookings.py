"""
Bookings Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging
import re
from dependencies import get_current_user
from routes.events import publish_event
from database import db
from config import RESEND_API_KEY
from models.user import User
from models.booking import Booking, BookingCreate, BookingUpdate
from models.customer import Customer
from services.booking_rules import (
    assert_public_booking_create_allowed,
    compute_available_slots,
)
from services.state_transitions import is_booking_status_transition_ok
from services.audit_log import log_audit
from services import idempotency as idem

router = APIRouter()


def _normalize_payment_method(value: Optional[str]) -> Optional[str]:
    """Normalize payment method aliases to canonical values."""
    if not value:
        return value
    method = str(value).strip().lower()
    if method in {"utalas", "atutalas", "banki_atutalas"}:
        return "atutalas"
    if method in {"kartya", "bankkartya"}:
        return "kartya"
    return method

@router.get("/bookings/available-slots")
async def get_available_slots(
    location: str, 
    date: str, 
    service_id: Optional[str] = None,
    duration: Optional[int] = None
):
    """
    Get available time slots for a given date and location (public).
    """
    return await compute_available_slots(location, date, service_id, duration)

@router.get("/bookings/by-review-token/{token}")
async def get_booking_by_review_token(token: str):
    """Return minimal booking info for the review page (public)"""
    booking = await db.bookings.find_one(
        {"review_token": token},
        {"_id": 0, "service_name": 1, "date": 1, "location": 1, "customer_name": 1}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Érvénytelen értékelési token")
    return booking

@router.get("/bookings/public-services")
async def get_public_services():
    """Get services list (public, no auth)"""
    services = await db.services.find({}, {"_id": 0}).to_list(200)
    return services

@router.get("/bookings/public-locations")
async def get_public_locations():
    """Get available locations (public)"""
    return ["Debrecen", "Budapest"]

@router.get("/bookings/lookup-plate/{plate_number}")
async def lookup_customer_by_plate(plate_number: str):
    """Lookup customer by plate number for quick booking (public)"""
    plate = plate_number.upper().strip()
    customer = await db.customers.find_one({"plate_number": plate}, {"_id": 0})
    if not customer:
        return {"found": False}
    
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
        "is_vip": completed_count >= 5
    }

@router.post("/bookings")
async def create_booking(
    data: BookingCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Create a new booking (public, no auth required)"""
    idem.ensure_idempotency_key_valid(idempotency_key)
    body_fingerprint = idem.body_hash(data)
    if idempotency_key:
        cached, err = await idem.get_cached_response(
            idem.SCOPE_BOOKING, idempotency_key, body_fingerprint
        )
        if err == "mismatch":
            raise HTTPException(
                status_code=409,
                detail="Az Idempotency-Key már más tartalomhoz van társítva",
            )
        if cached is not None:
            return cached

    await assert_public_booking_create_allowed(
        data.date,
        data.time_slot,
        data.plate_number,
        data.phone,
        data.address or "",
    )

    # Get service info if available (for traditional bookings)
    service = None
    service_name = data.service_name
    price = data.price
    
    if not data.service_id.startswith("dynamic_"):
        # Traditional service lookup
        service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
        if service:
            service_name = service["name"]
            price = service["price"]
    
    if not service_name:
        # Build service name from car_size, category, package
        category_names = {"kulso": "Külső", "belso": "Belső", "komplett": "Komplett"}
        service_name = f"{data.car_size or ''} - {category_names.get(data.category, '')} {data.package_type or ''}".strip()
    
    if not price:
        price = 0
    
    worker_name = None
    if data.worker_id:
        worker = await db.workers.find_one({"worker_id": data.worker_id}, {"_id": 0})
        if worker:
            worker_name = worker["name"]
    
    # Cooldown check: block new booking if same plate cancelled within the last hour
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_cancel = await db.bookings.find_one({
        "plate_number": {"$regex": f"^{re.escape(data.plate_number.upper())}$", "$options": "i"},
        "status": "lemondta",
        "cancelled_at": {"$gt": one_hour_ago.isoformat()}
    }, {"_id": 0, "booking_id": 1})
    if recent_cancel:
        raise HTTPException(
            status_code=429,
            detail="Nemrég lemondott foglalás után 1 óra szünetet tartunk az újrafoglalás előtt. Kérjük próbálja újra később."
        )

    # Calculate extras price — batch lookup instead of N+1 queries
    extras_price = 0
    if data.extras:
        extra_docs = await db.services.find(
            {"service_id": {"$in": data.extras}, "service_type": "extra"},
            {"_id": 0, "service_id": 1, "price": 1, "min_price": 1}
        ).to_list(len(data.extras))
        extras_map = {e["service_id"]: e for e in extra_docs}
        for extra_id in data.extras:
            extra = extras_map.get(extra_id)
            if extra:
                extras_price += extra.get("price") or extra.get("min_price", 0)
    
    booking = Booking(
        customer_name=data.customer_name, 
        car_type=data.car_type or "",
        plate_number=data.plate_number.upper(), 
        email=data.email, 
        phone=data.phone,
        address=data.address, 
        invoice_name=data.invoice_name,
        invoice_tax_number=data.invoice_tax_number, 
        invoice_address=data.invoice_address,
        service_id=data.service_id, 
        service_name=service_name,
        worker_id=data.worker_id, 
        worker_name=worker_name,
        location=data.location, 
        date=data.date, 
        time_slot=data.time_slot,
        price=price + extras_price, 
        notes=data.notes,
        car_size=data.car_size,
        package_type=data.package_type,
        category=data.category,
        duration=data.duration,
        extras=data.extras,
        extras_price=extras_price if extras_price > 0 else None
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
        customer_id = cust.customer_id
    else:
        await db.customers.update_one(
            {"plate_number": data.plate_number.upper()},
            {"$inc": {"booking_count": 1}, "$set": {"email": data.email, "phone": data.phone}}
        )
        customer_id = existing_cust.get("customer_id", "")

    # Link customer_id to the booking
    if customer_id:
        await db.bookings.update_one(
            {"booking_id": booking.booking_id},
            {"$set": {"customer_id": customer_id}}
        )
    
    # Send confirmation email if configured
    if RESEND_API_KEY and data.email:
        try:
            from services.email_service import send_booking_confirmation
            email_result = await send_booking_confirmation(doc)
            logging.info(f"Booking confirmation email: {email_result}")
        except Exception as e:
            logging.warning(f"Booking email failed: {e}")

    # Send confirmation SMS (fire-and-forget; never block booking creation)
    if data.phone:
        try:
            from services.sms_service import send_booking_confirmation_sms
            sms_result = await send_booking_confirmation_sms(doc)
            logging.info(f"Booking confirmation SMS: {sms_result.get('status')}")
        except Exception as e:
            logging.warning(f"Booking SMS failed: {e}")

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
    
    # Handle second car booking if provided
    second_booking = None
    if data.second_car:
        second_car = data.second_car
        second_service = await db.services.find_one({"service_id": second_car.get("service_id", data.service_id)}, {"_id": 0})
        if not second_service:
            second_service = service
        
        # Calculate next time slot (30 min later + service duration)
        hour, minute = map(int, data.time_slot.split(":"))
        # Add service duration (rounded to 30 min slots); service may be None for dynamic bookings
        service_duration = (service.get("duration") if service else None) or data.duration or 60
        duration_slots = (service_duration + 29) // 30  # Round up to next 30 min
        total_minutes = hour * 60 + minute + duration_slots * 30
        next_hour = total_minutes // 60
        next_minute = total_minutes % 60
        next_time_slot = f"{next_hour:02d}:{next_minute:02d}"
        
        # Check if next slot is available
        if next_hour < 19:  # Only if within business hours
            second_booking_obj = Booking(
                customer_name=data.customer_name,
                car_type=second_car.get("car_type", data.car_type),
                plate_number=second_car.get("plate_number", "").upper(),
                email=data.email, phone=data.phone,
                address=data.address, invoice_name=data.invoice_name,
                invoice_tax_number=data.invoice_tax_number, invoice_address=data.invoice_address,
                service_id=second_car.get("service_id", data.service_id),
                service_name=second_service["name"],
                worker_id=data.worker_id, worker_name=worker_name,
                location=data.location, date=data.date, time_slot=next_time_slot,
                price=second_service["price"],
                notes=f"Második autó - kapcsolódó foglalás: {booking.booking_id}"
            )
            
            second_doc = second_booking_obj.model_dump()
            second_doc["created_at"] = second_doc["created_at"].isoformat()
            second_doc["linked_booking_id"] = booking.booking_id
            await db.bookings.insert_one(second_doc)
            
            # Update first booking with link
            await db.bookings.update_one(
                {"booking_id": booking.booking_id},
                {"$set": {"linked_booking_id": second_booking_obj.booking_id}}
            )
            
            # Create notification for second car
            notification2 = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "type": "new_booking",
                "title": "Új online foglalás (2. autó)",
                "message": f"{data.customer_name} - {second_car.get('plate_number', '')} - {data.date} {next_time_slot}",
                "booking_id": second_booking_obj.booking_id,
                "location": data.location,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification2)
            
            second_booking = second_booking_obj.model_dump()
            
            # Auto-create customer for second car
            second_plate = second_car.get("plate_number", "").upper()
            if second_plate:
                existing_cust2 = await db.customers.find_one({"plate_number": second_plate}, {"_id": 0})
                if not existing_cust2:
                    cust2 = Customer(name=data.customer_name, phone=data.phone, car_type=second_car.get("car_type"), plate_number=second_plate)
                    cdoc2 = cust2.model_dump()
                    cdoc2["created_at"] = cdoc2["created_at"].isoformat()
                    cdoc2["email"] = data.email
                    cdoc2["booking_count"] = 1
                    cdoc2["total_spent"] = 0
                    cdoc2["blacklisted"] = False
                    await db.customers.insert_one(cdoc2)
    
    result = booking.model_dump()
    if second_booking:
        result["second_booking"] = second_booking
    if idempotency_key:
        await idem.store_response(
            idem.SCOPE_BOOKING, idempotency_key, body_fingerprint, result
        )
    return result

@router.get("/bookings")
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

@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    return booking

@router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, data: BookingUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "payment_method" in update_data:
        update_data["payment_method"] = _normalize_payment_method(update_data.get("payment_method"))
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
    
    # Get original booking BEFORE update for comparison
    original_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not original_booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található")

    if "status" in update_data:
        if not is_booking_status_transition_ok(
            original_booking.get("status"), update_data["status"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Érvénytelen státuszváltás ehhez a foglaláshoz",
            )
    
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    
    # Get updated booking
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    # Create notification for status change
    status_labels = {
        "foglalt": "Foglalt",
        "folyamatban": "Folyamatban",
        "kesz": "Kész",
        "lemondta": "Lemondta",
        "nem_jott_el": "Nem jött el"
    }
    
    if data.status and data.status != original_booking.get("status"):
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "type": "booking_status_change",
            "title": f"Foglalás státusz: {status_labels.get(data.status, data.status)}",
            "message": f"{booking['customer_name']} - {booking['plate_number']} - {booking['date']} {booking['time_slot']}",
            "booking_id": booking_id,
            "location": booking.get("location"),
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    # Create notification for date/time modification
    if (data.date and data.date != original_booking.get("date")) or \
       (data.time_slot and data.time_slot != original_booking.get("time_slot")):
        new_date = data.date or original_booking.get("date")
        new_time = data.time_slot or original_booking.get("time_slot")
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "type": "booking_modified",
            "title": "Foglalás módosítva",
            "message": f"{booking['customer_name']} - {booking['plate_number']} - Új időpont: {new_date} {new_time}",
            "booking_id": booking_id,
            "location": booking.get("location"),
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    if data.status == "nem_jott_el" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"no_show_count": 1}})
    elif data.status == "lemondta" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"cancel_count": 1}})
    elif data.status == "kesz" and booking and original_booking.get("status") != "kesz":
        # Only increment total_spent if it wasn't already "kesz" (prevent double-count)
        # Also skip if a completed job already exists for this booking (jobs.py handles it)
        existing_done_job = await db.jobs.find_one({"booking_id": booking_id, "status": "kesz"}, {"_id": 0, "job_id": 1})
        if not existing_done_job:
            await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"total_spent": booking.get("price", 0)}})
        # Generate review token if not already set
        if not booking.get("review_token"):
            review_token = uuid.uuid4().hex
            await db.bookings.update_one(
                {"booking_id": booking_id},
                {"$set": {"review_token": review_token, "review_sent": False}}
            )
            booking["review_token"] = review_token
            booking["review_sent"] = False
        # Send review request email if not already sent
        if not booking.get("review_sent") and booking.get("email"):
            try:
                from services.email_service import send_review_request
                email_result = await send_review_request(booking)
                logging.info(f"Review request email: {email_result}")
                if email_result.get("status") == "success":
                    await db.bookings.update_one(
                        {"booking_id": booking_id},
                        {"$set": {"review_sent": True}}
                    )
            except Exception as e:
                logging.warning(f"Review email failed: {e}")
    change_snapshot = {k: {"from": original_booking.get(k), "to": v} for k, v in update_data.items()}
    await log_audit(
        "update",
        "booking",
        booking_id,
        user_id=user.user_id,
        user_name=user.name,
        changes=change_snapshot,
    )
    publish_event("refresh", {"reason": "booking_updated"})
    return {"message": "Foglalás frissítve"}

@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: User = Depends(get_current_user)):
    before = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    result = await db.bookings.delete_one({"booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    if before:
        await log_audit(
            "delete",
            "booking",
            booking_id,
            user_id=user.user_id,
            user_name=user.name,
            changes={"previous": {k: before.get(k) for k in before if k != "_id"}},
        )
    publish_event("refresh", {"reason": "booking_deleted"})
    return {"message": "Foglalás törölve"}


# ============== SELF-SERVICE: MODIFY / CANCEL BY TOKEN ==============

TOKEN_EXPIRY_DAYS = 90  # modify/cancel links expire after 90 days

def _check_token_expiry(booking: dict):
    """Raise 410 if the booking's self-service token has expired."""
    created_raw = booking.get("created_at")
    if created_raw:
        try:
            created_at = datetime.fromisoformat(str(created_raw))
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - created_at > timedelta(days=TOKEN_EXPIRY_DAYS):
                raise HTTPException(status_code=410, detail="A módosítási link lejárt (90 nap)")
        except (ValueError, TypeError):
            pass  # can't parse date → don't block


@router.get("/bookings/by-token/{token}")
async def get_booking_by_token(token: str):
    """Public — returns booking details for self-service modification page"""
    booking = await db.bookings.find_one(
        {"$or": [{"modify_token": token}, {"cancel_token": token}]},
        {"_id": 0, "modify_token": 0, "cancel_token": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található vagy a link lejárt")
    if booking.get("status") not in ("foglalt", "visszaigazolva"):
        raise HTTPException(status_code=410, detail="Ez a foglalás már nem módosítható")
    _check_token_expiry(booking)
    return booking


@router.put("/bookings/by-token/{token}/modify")
async def modify_booking_by_token(token: str, date: str, time_slot: str):
    """Public — reschedule booking date/time using modify_token"""
    booking = await db.bookings.find_one({"modify_token": token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található vagy a link lejárt")
    if booking.get("status") not in ("foglalt", "visszaigazolva"):
        raise HTTPException(status_code=410, detail="Ez a foglalás már nem módosítható")
    _check_token_expiry(booking)

    try:
        await assert_public_booking_create_allowed(
            date,
            time_slot,
            booking.get("plate_number", ""),
            booking.get("phone") or "",
            booking.get("address") or "",
        )
    except HTTPException:
        raise

    await db.bookings.update_one(
        {"modify_token": token},
        {"$set": {"date": date, "time_slot": time_slot, "status": "foglalt"}}
    )
    publish_event("refresh", {"reason": "booking_modified"})
    return {"message": "Foglalás módosítva", "date": date, "time_slot": time_slot}


@router.put("/bookings/by-token/{token}/cancel")
async def cancel_booking_by_token(token: str):
    """Public — cancel booking using cancel_token"""
    booking = await db.bookings.find_one({"cancel_token": token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található vagy a link lejárt")
    if booking.get("status") not in ("foglalt", "visszaigazolva"):
        raise HTTPException(status_code=410, detail="Ez a foglalás már korábban lemondva vagy teljesítve")
    _check_token_expiry(booking)
    if not is_booking_status_transition_ok(booking.get("status"), "lemondta"):
        raise HTTPException(
            status_code=400, detail="Ez a státuszról nem lehet lemondani"
        )

    await db.bookings.update_one(
        {"cancel_token": token},
        {"$set": {"status": "lemondta", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    publish_event("refresh", {"reason": "booking_cancelled"})
    return {"message": "Foglalás lemondva"}


# ============== REMINDER EMAILS ==============

@router.post("/bookings/send-reminders")
async def send_reminders():
    """Send reminder emails for bookings in the next 24 hours. Called by frontend polling or cron."""
    if not RESEND_API_KEY:
        return {"status": "skipped", "message": "Email not configured", "sent": 0}
    
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(hours=24)
    tomorrow_date = tomorrow.strftime("%Y-%m-%d")
    
    # Find bookings for tomorrow that haven't been reminded
    bookings = await db.bookings.find({
        "date": {"$regex": f"^{tomorrow_date}"},
        "status": {"$in": ["foglalt", "visszaigazolva"]},
        "reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    for booking in bookings:
        email = booking.get("email")
        if not email:
            continue
        
        try:
            from services.email_service import send_booking_reminder
            result = await send_booking_reminder(booking)
            if result.get("status") == "success":
                await db.bookings.update_one(
                    {"booking_id": booking["booking_id"]},
                    {"$set": {"reminder_sent": True}}
                )
                sent_count += 1
        except Exception as e:
            logging.error(f"Reminder failed for {booking['booking_id']}: {e}")
    
    return {"status": "done", "sent": sent_count, "total_found": len(bookings)}
