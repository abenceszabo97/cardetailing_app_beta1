"""
Centralized booking availability and public booking policy rules.

Used by: GET /bookings/available-slots, POST /bookings, and (optionally) other endpoints.
"""
from __future__ import annotations

import re
from calendar import monthrange
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from database import db
from services import slot_cache

LOCAL_TZ = ZoneInfo("Europe/Budapest")


def _normalize_phone(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    digits = re.sub(r"\D+", "", str(value))
    if digits.startswith("36") and len(digits) > 9:
        digits = digits[2:]
    elif digits.startswith("06"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    return digits[-9:] if digits else None


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", str(value).strip().lower())
    return normalized or None


def _parse_address_parts(
    address_value: Optional[str],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if not address_value:
        return (None, None, None)
    cleaned = str(address_value).strip()
    match = re.match(r"^(\d{4})\s+([^,]+),?\s*(.*)$", cleaned)
    if match:
        zip_code = match.group(1).strip() or None
        city = match.group(2).strip() or None
        street = match.group(3).strip() or None
        return (zip_code, city, street)
    return (None, None, cleaned or None)


def _easter_sunday(year: int) -> datetime:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return datetime(year, month, day)


def _hungarian_holidays_for_year(year: int) -> set[str]:
    easter = _easter_sunday(year)
    good_friday = easter - timedelta(days=2)
    easter_monday = easter + timedelta(days=1)
    pentecost_monday = easter + timedelta(days=50)
    fixed_days = [
        (1, 1),
        (3, 15),
        (5, 1),
        (8, 20),
        (10, 23),
        (11, 1),
        (12, 25),
        (12, 26),
    ]
    result = {f"{year}-{m:02d}-{d:02d}" for m, d in fixed_days}
    result.update(
        {
            good_friday.strftime("%Y-%m-%d"),
            easter_monday.strftime("%Y-%m-%d"),
            pentecost_monday.strftime("%Y-%m-%d"),
        }
    )
    return result


def is_hungarian_public_holiday(date_str: str) -> bool:
    try:
        y, m, d = [int(v) for v in date_str.split("-")]
        if m < 1 or m > 12 or d < 1 or d > monthrange(y, m)[1]:
            return False
    except Exception:
        return False
    return date_str in _hungarian_holidays_for_year(y)


async def find_blacklist_match(
    plate_number: str, phone: Optional[str], address: Optional[str]
) -> Optional[dict]:
    plate = (plate_number or "").upper().strip()
    normalized_phone = _normalize_phone(phone)
    zip_code, city, street = _parse_address_parts(address)
    normalized_city = _normalize_text(city)
    normalized_street = _normalize_text(street)

    entries = await db.blacklist.find({}, {"_id": 0}).to_list(2000)
    for entry in entries:
        entry_plate = str(entry.get("plate_number", "")).upper().strip()
        if plate and entry_plate and plate == entry_plate:
            return {"type": "plate", "reason": entry.get("reason")}

        entry_phone = _normalize_phone(entry.get("phone"))
        if normalized_phone and entry_phone and normalized_phone == entry_phone:
            return {"type": "phone", "reason": entry.get("reason")}

        entry_zip = (entry.get("address_zip") or "").strip()
        entry_city = _normalize_text(entry.get("address_city"))
        entry_street = _normalize_text(entry.get("address_street"))
        if (
            zip_code
            and normalized_city
            and normalized_street
            and entry_zip
            and entry_city
            and entry_street
        ):
            if (
                zip_code == entry_zip
                and normalized_city == entry_city
                and normalized_street == entry_street
            ):
                return {"type": "address", "reason": entry.get("reason")}
    return None


def is_past_slot_local(date_str: str, time_str: str) -> bool:
    try:
        slot_dt = datetime.strptime(
            f"{date_str} {time_str}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=LOCAL_TZ)
    except ValueError:
        return False
    return slot_dt < datetime.now(LOCAL_TZ)


async def assert_public_booking_create_allowed(
    date: str, time_slot: str, plate_number: str, phone: str, address: str
) -> None:
    if is_hungarian_public_holiday(date):
        raise HTTPException(
            status_code=400,
            detail="Ünnepnapon zárva tartunk, erre a napra nem foglalható időpont",
        )
    if await find_blacklist_match(plate_number, phone, address):
        raise HTTPException(
            status_code=403,
            detail="A megadott adatok tiltólistán szerepelnek, foglalás nem lehetséges",
        )
    if is_past_slot_local(date, time_slot):
        raise HTTPException(
            status_code=400, detail="A kiválasztott időpont már elmúlt"
        )


def time_to_minutes(time_str: str) -> int:
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _parse_hhmm_to_minutes(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        hour, minute = value.split(":")
        return int(hour) * 60 + int(minute)
    except Exception:
        return None


def _intervals_overlap(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return max(start_a, start_b) < min(end_a, end_b)


def _extract_time_minutes_from_iso(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        return dt.hour * 60 + dt.minute
    except Exception:
        return None


def get_blocked_slots(bookings: List[dict], workers_list: List[dict]) -> dict:
    blocked = {w["worker_id"]: set() for w in workers_list}
    for bkg in bookings:
        worker_id = bkg.get("worker_id")
        if not worker_id or worker_id not in blocked:
            continue
        time_slot = bkg.get("time_slot")
        if not time_slot:
            continue
        duration = bkg.get("duration") or 60
        start_minutes = time_to_minutes(time_slot)
        end_minutes = start_minutes + duration
        current = start_minutes
        while current < end_minutes:
            blocked[worker_id].add(minutes_to_time(current))
            current += 30
    return blocked


async def compute_available_slots(
    location: str, date: str, service_id: Optional[str] = None, duration: Optional[int] = None
) -> list:
    cached = slot_cache.get_slots(location, date, service_id, duration)
    if cached is not None:
        return cached
    if is_hungarian_public_holiday(date):
        return []

    workers_list = await db.workers.find(
        {"location": location, "active": True}, {"_id": 0}
    ).to_list(100)
    now_local = datetime.now(LOCAL_TZ)
    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Érvénytelen dátum formátum")
    is_today_local = selected_date == now_local.date()

    absences = await db.worker_absences.find(
        {"date": date}, {"_id": 0, "worker_id": 1}
    ).to_list(50)
    absent_ids = {a["worker_id"] for a in absences}

    unavailable_shifts = await db.shifts.find(
        {
            "start_time": {"$regex": f"^{date}"},
            "shift_type": {"$in": ["vacation", "day_off", "sick_leave", "absence"]},
        },
        {"_id": 0, "worker_id": 1},
    ).to_list(200)
    absent_ids.update(s["worker_id"] for s in unavailable_shifts if s.get("worker_id"))

    workers_list = [w for w in workers_list if w["worker_id"] not in absent_ids]

    shifts_for_day = await db.shifts.find(
        {
            "start_time": {"$regex": f"^{date}"},
            "worker_id": {"$in": [w["worker_id"] for w in workers_list]},
        },
        {
            "_id": 0,
            "worker_id": 1,
            "shift_type": 1,
            "start_time": 1,
            "end_time": 1,
            "lunch_start": 1,
            "lunch_end": 1,
        },
    ).to_list(300)
    shift_windows_by_worker: dict = {}
    lunch_breaks_by_worker: dict = {}
    for shift in shifts_for_day:
        wid = shift.get("worker_id")
        shift_type = shift.get("shift_type", "normal")
        start_min = _extract_time_minutes_from_iso(shift.get("start_time"))
        end_min = _extract_time_minutes_from_iso(shift.get("end_time"))
        if (
            wid
            and shift_type == "normal"
            and start_min is not None
            and end_min is not None
            and end_min > start_min
        ):
            shift_windows_by_worker.setdefault(wid, []).append((start_min, end_min))

        lunch_start = _parse_hhmm_to_minutes(shift.get("lunch_start"))
        lunch_end = _parse_hhmm_to_minutes(shift.get("lunch_end"))
        if (
            wid
            and lunch_start is not None
            and lunch_end is not None
            and lunch_end > lunch_start
        ):
            lunch_breaks_by_worker.setdefault(wid, []).append(
                (lunch_start, lunch_end)
            )

    existing = await db.bookings.find(
        {
            "location": location,
            "date": date,
            "status": {"$nin": ["lemondta", "nem_jott_el"]},
        },
        {"_id": 0},
    ).to_list(500)

    jobs = await db.jobs.find(
        {
            "location": location,
            "date": {"$gte": f"{date}T00:00:00", "$lt": f"{date}T23:59:59"},
            "status": {"$nin": ["lemondta", "nem_jott_el"]},
        },
        {"_id": 0},
    ).to_list(500)

    for job in jobs:
        existing.append(
            {
                "worker_id": job.get("worker_id"),
                "time_slot": job.get("time_slot"),
                "duration": 60,
            }
        )

    blocked_slots = get_blocked_slots(existing, workers_list)

    check_duration = duration or 60
    slots_needed = (check_duration + 29) // 30

    all_slots = []
    for hour in range(8, 19):
        for minute in [0, 30]:
            slot_time = f"{hour:02d}:{minute:02d}"
            slot_minutes = time_to_minutes(slot_time)

            if is_today_local and slot_minutes < (
                now_local.hour * 60 + now_local.minute
            ):
                continue

            free_workers = []
            for w in workers_list:
                worker_id = w["worker_id"]
                is_free = True
                slot_end_minutes = slot_minutes + check_duration

                worker_shift_windows = shift_windows_by_worker.get(worker_id, [])
                fits_any_shift_window = any(
                    slot_minutes >= shift_start
                    and slot_end_minutes <= shift_end
                    for shift_start, shift_end in worker_shift_windows
                )
                if not fits_any_shift_window:
                    continue

                for lunch_start, lunch_end in lunch_breaks_by_worker.get(
                    worker_id, []
                ):
                    if _intervals_overlap(
                        slot_minutes, slot_end_minutes, lunch_start, lunch_end
                    ):
                        is_free = False
                        break
                if not is_free:
                    continue

                for i in range(slots_needed):
                    check_time = minutes_to_time(slot_minutes + (i * 30))
                    if check_time in blocked_slots.get(worker_id, set()):
                        is_free = False
                        break
                    if slot_minutes + (i * 30) >= 19 * 60:
                        is_free = False
                        break

                if is_free:
                    free_workers.append(w)

            booked_count = len(workers_list) - len(free_workers)
            total_workers = len(workers_list)

            all_slots.append(
                {
                    "time_slot": slot_time,
                    "available_workers": [
                        {"worker_id": w["worker_id"], "name": w["name"]}
                        for w in free_workers
                    ],
                    "is_available": len(free_workers) > 0,
                    "booked_count": booked_count,
                    "total_workers": total_workers,
                    "availability_percent": int(
                        (len(free_workers) / total_workers * 100)
                    )
                    if total_workers > 0
                    else 0,
                }
            )
    slot_cache.set_slots(location, date, service_id, duration, all_slots)
    return all_slots


async def explain_booking_slot(
    *,
    location: str,
    date: str,
    time_slot: str,
    duration: Optional[int] = None,
    plate_number: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
) -> dict:
    reasons: list[dict] = []
    blocking_rules: list[str] = []

    if is_hungarian_public_holiday(date):
        blocking_rules.append("holiday")
        reasons.append(
            {
                "code": "holiday",
                "message": "Ünnepnapon zárva tartunk.",
            }
        )
    if is_past_slot_local(date, time_slot):
        blocking_rules.append("past_slot")
        reasons.append(
            {
                "code": "past_slot",
                "message": "A kiválasztott időpont már elmúlt.",
            }
        )

    if plate_number:
        blacklist_match = await find_blacklist_match(plate_number, phone, address)
        if blacklist_match:
            blocking_rules.append("blacklist")
            reasons.append(
                {
                    "code": "blacklist",
                    "message": "A megadott adatok tiltólistán szerepelnek.",
                    "meta": blacklist_match,
                }
            )

    slots = await compute_available_slots(location, date, duration=duration)
    selected_slot = next((s for s in slots if s.get("time_slot") == time_slot), None)
    if not selected_slot:
        blocking_rules.append("slot_not_in_working_hours")
        reasons.append(
            {
                "code": "slot_not_in_working_hours",
                "message": "A kért időpont a foglalható időablakon kívül esik.",
            }
        )
    elif not selected_slot.get("is_available"):
        blocking_rules.append("no_available_worker")
        reasons.append(
            {
                "code": "no_available_worker",
                "message": "Nincs elérhető dolgozó a kért időpontra.",
                "meta": {
                    "booked_count": selected_slot.get("booked_count"),
                    "total_workers": selected_slot.get("total_workers"),
                },
            }
        )

    return {
        "allowed": len(blocking_rules) == 0,
        "blocking_rules": blocking_rules,
        "reasons": reasons,
        "slot_snapshot": selected_slot,
    }
