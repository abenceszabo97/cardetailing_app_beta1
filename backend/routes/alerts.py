"""
Operational / business alerts for the admin app (on-demand, no background worker).
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from database import db
from dependencies import require_admin
from models.user import User
from services.booking_rules import is_hungarian_public_holiday

router = APIRouter()
LOCAL_TZ = ZoneInfo("Europe/Budapest")


async def _get_setting_value(key: str) -> Optional[str]:
    doc = await db.settings.find_one({"key": key}, {"_id": 0})
    return doc.get("value") if doc else None


@router.get("/alerts/summary")
async def get_business_alerts(user: User = Depends(require_admin)) -> dict:
    """Return a list of actionable alerts. Admin only."""
    alerts: List[dict] = []
    now_local = datetime.now(LOCAL_TZ)
    today = now_local.date().isoformat()
    is_holiday = is_hungarian_public_holiday(today)
    weekday = now_local.weekday()
    unassigned_warn = int((await _get_setting_value("alerts_unassigned_warn")) or 1)
    unassigned_critical = int((await _get_setting_value("alerts_unassigned_critical")) or 3)
    day_close_hour = int((await _get_setting_value("alerts_day_close_hour")) or 20)

    for loc in ("Debrecen", "Budapest"):
        if not is_holiday and weekday < 6:
            active = await db.workers.count_documents(
                {"location": loc, "active": True}
            )
            if active == 0:
                alerts.append(
                    {
                        "code": f"no_active_workers_{loc}",
                        "severity": "high",
                        "message": f"{loc}: nincs aktív dolgozó (munkanap).",
                    }
                )

    if not is_holiday and weekday < 6:
        unassigned = await db.bookings.count_documents(
            {
                "date": today,
                "status": {"$in": ["foglalt", "visszaigazolva"]},
                "$or": [
                    {"worker_id": {"$in": [None, ""]}},
                    {"worker_id": {"$exists": False}},
                ],
            }
        )
        if unassigned >= unassigned_critical:
            alerts.append(
                {
                    "code": "many_unassigned_bookings",
                    "severity": "medium",
                    "message": f"Ma {unassigned} foglalásnak nincs kiosztott dolgozója.",
                }
            )
        elif unassigned >= unassigned_warn:
            alerts.append(
                {
                    "code": "unassigned_bookings",
                    "severity": "low",
                    "message": f"Ma {unassigned} foglalásnak nincs kiosztott dolgozója.",
                }
            )

    for entity, label in [
        ("szamlazz_budapest", "Budapest Számlázz.hu API"),
        ("szamlazz_debrecen_private", "Debrecen készpénz Számlázz.hu API"),
        ("szamlazz_debrecen_company", "Debrecen kártya/cég Számlázz.hu API"),
    ]:
        key = await _get_setting_value(entity)
        if not key or not str(key).strip():
            alerts.append(
                {
                    "code": f"invoice_key_missing_{entity}",
                    "severity": "high",
                    "message": f"Hiányzik a {label} kulcs — a számlázás elbukhat.",
                }
            )

    if not is_holiday and weekday < 6 and now_local.hour >= day_close_hour:
        day_start_utc = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end_utc = day_start_utc + timedelta(days=1)
        for loc in ("Debrecen", "Budapest"):
            has_closed = await db.day_records.find_one(
                {
                    "location": loc,
                    "date": {
                        "$gte": day_start_utc.isoformat(),
                        "$lt": day_end_utc.isoformat(),
                    },
                    "status": "closed",
                }
            )
            if not has_closed:
                alerts.append(
                    {
                        "code": f"day_not_closed_{loc}",
                        "severity": "medium",
                        "message": f"{loc}: a mai nap még nincs lezárva a napzáró nyilvántartásban.",
                    }
                )

    return {"alerts": alerts, "as_of": datetime.now(timezone.utc).isoformat()}
