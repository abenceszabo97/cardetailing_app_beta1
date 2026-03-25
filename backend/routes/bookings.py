"""
Bookings Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import asyncio
import uuid
import logging
from dependencies import get_current_user
from database import db
from config import RESEND_API_KEY, SENDER_EMAIL
from models.user import User
from models.booking import Booking, BookingCreate, BookingUpdate
from models.customer import Customer

router = APIRouter()

@router.get("/bookings/available-slots")
async def get_available_slots(location: str, date: str, service_id: Optional[str] = None):
    """Get available time slots for a given date and location (public)"""
    workers_list = await db.workers.find({"location": location, "active": True}, {"_id": 0}).to_list(100)
    existing = await db.bookings.find({
        "location": location, "date": date,
        "status": {"$nin": ["lemondta", "nem_jott_el"]}
    }, {"_id": 0}).to_list(500)
    
    all_slots = []
    for hour in range(8, 19):
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

@router.get("/bookings/public-services")
async def get_public_services():
    """Get services list (public, no auth)"""
    services = await db.services.find({}, {"_id": 0}).to_list(200)
    return services

@router.get("/bookings/public-locations")
async def get_public_locations():
    """Get available locations (public)"""
    return ["Debrecen"]

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
async def create_booking(data: BookingCreate):
    """Create a new booking (public, no auth required)"""
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
    
    # Calculate extras price
    extras_price = 0
    if data.extras:
        for extra_id in data.extras:
            extra = await db.services.find_one({"service_id": extra_id, "service_type": "extra"}, {"_id": 0})
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
    else:
        await db.customers.update_one(
            {"plate_number": data.plate_number.upper()},
            {"$inc": {"booking_count": 1}, "$set": {"email": data.email, "phone": data.phone}}
        )
    
    # Send confirmation email if configured
    if RESEND_API_KEY and data.email:
        try:
            from services.email_service import send_booking_confirmation
            email_result = await send_booking_confirmation(doc)
            logging.info(f"Booking confirmation email: {email_result}")
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
    
    # Handle second car booking if provided
    second_booking = None
    if data.second_car:
        second_car = data.second_car
        second_service = await db.services.find_one({"service_id": second_car.get("service_id", data.service_id)}, {"_id": 0})
        if not second_service:
            second_service = service
        
        # Calculate next time slot (30 min later + service duration)
        hour, minute = map(int, data.time_slot.split(":"))
        # Add service duration (rounded to 30 min slots)
        duration_slots = (service["duration"] + 29) // 30  # Round up to next 30 min
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
    
    result = await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    
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
    elif data.status == "kesz" and booking:
        await db.customers.update_one({"plate_number": booking.get("plate_number")}, {"$inc": {"total_spent": booking.get("price", 0)}})
    return {"message": "Foglalás frissítve"}

@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: User = Depends(get_current_user)):
    result = await db.bookings.delete_one({"booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    return {"message": "Foglalás törölve"}
