"""
Day Records Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
from dependencies import get_current_user
from database import db
from models.user import User
from models.day_record import DayRecord, DayOpenCreate, DayCloseCreate, CashWithdrawalCreate

router = APIRouter()

@router.get("/day-records")
async def get_day_records(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get day records"""
    query = {}
    if location:
        query["location"] = location
    
    records = await db.day_records.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return records

@router.get("/day-records/today")
async def get_today_record(location: str, user: User = Depends(get_current_user)):
    """Get today's day record - prioritize open records"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    record = await db.day_records.find_one({
        "location": location,
        "status": "open",
        "date": {
            "$gte": today.isoformat(),
            "$lt": tomorrow.isoformat()
        }
    }, {"_id": 0})
    
    if not record:
        record = await db.day_records.find_one({
            "location": location,
            "date": {
                "$gte": today.isoformat(),
                "$lt": tomorrow.isoformat()
            }
        }, {"_id": 0}, sort=[("opened_at", -1)])
    
    return record

@router.post("/day-records/open")
async def open_day(data: DayOpenCreate, user: User = Depends(get_current_user)):
    """Open day"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    existing = await db.day_records.find_one({
        "location": data.location,
        "status": "open",
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

@router.post("/day-records/close")
async def close_day(data: DayCloseCreate, user: User = Depends(get_current_user)):
    """Close day with cash audit"""
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
    card_total = sum(j["price"] for j in jobs if j.get("payment_method") in ("kartya", "bankkartya"))
    transfer_total = sum(j["price"] for j in jobs if j.get("payment_method") in ("atutalas", "utalas", "banki_atutalas"))
    
    withdrawals = record.get("withdrawals", [])
    total_withdrawals = sum(w.get("amount", 0) for w in withdrawals)
    
    expected_closing = record["opening_balance"] + cash_total - total_withdrawals
    actual_closing = data.closing_balance
    discrepancy = actual_closing - expected_closing
    
    await db.day_records.update_one(
        {"record_id": record["record_id"]},
        {"$set": {
            "status": "closed",
            "total_cars": total_cars,
            "cash_total": cash_total,
            "card_total": card_total,
            "transfer_total": transfer_total,
            "closing_balance": actual_closing,
            "expected_closing": expected_closing,
            "discrepancy": discrepancy,
            "notes": data.notes,
            "closed_by": user.user_id,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "type": "day_closed",
        "title": "Nap lezárva",
        "message": f"{data.location} - {total_cars} autó - {cash_total + card_total + transfer_total:,.0f} Ft bevétel",
        "location": data.location,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if abs(discrepancy) > 0:
        notification["message"] += f" | Eltérés: {discrepancy:+,.0f} Ft"
    await db.notifications.insert_one(notification)
    
    return {
        "message": "Nap lezárva",
        "total_cars": total_cars,
        "cash_total": cash_total,
        "card_total": card_total,
        "transfer_total": transfer_total,
        "expected_closing": expected_closing,
        "actual_closing": actual_closing,
        "discrepancy": discrepancy
    }

@router.post("/day-records/withdraw")
async def add_cash_withdrawal(data: CashWithdrawalCreate, user: User = Depends(get_current_user)):
    """Add cash withdrawal from register"""
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
    
    withdrawal = {
        "withdrawal_id": f"wd_{uuid.uuid4().hex[:8]}",
        "amount": data.amount,
        "reason": data.reason,
        "withdrawn_by": user.name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.day_records.update_one(
        {"record_id": record["record_id"]},
        {"$push": {"withdrawals": withdrawal}}
    )
    
    return {"message": "Pénzelvitel rögzítve", "withdrawal": withdrawal}
