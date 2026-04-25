"""
Short-lived in-memory cache for booking slot responses.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

DEFAULT_TTL_SECONDS = 45

_CACHE: dict[str, dict[str, Any]] = {}


def _key(location: str, date: str, service_id: Optional[str], duration: Optional[int]) -> str:
    return f"{location}|{date}|{service_id or '-'}|{duration or 60}"


def get_slots(
    location: str, date: str, service_id: Optional[str], duration: Optional[int]
) -> Optional[list]:
    key = _key(location, date, service_id, duration)
    doc = _CACHE.get(key)
    if not doc:
        return None
    if doc["expires_at"] <= datetime.now(timezone.utc):
        _CACHE.pop(key, None)
        return None
    return doc["value"]


def set_slots(
    location: str,
    date: str,
    service_id: Optional[str],
    duration: Optional[int],
    value: list,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> None:
    key = _key(location, date, service_id, duration)
    _CACHE[key] = {
        "value": value,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
    }


def invalidate_slots(location: Optional[str] = None, date: Optional[str] = None) -> int:
    if not location and not date:
        n = len(_CACHE)
        _CACHE.clear()
        return n
    removed = 0
    for key in list(_CACHE.keys()):
        parts = key.split("|")
        k_location = parts[0] if len(parts) > 0 else None
        k_date = parts[1] if len(parts) > 1 else None
        if location and k_location != location:
            continue
        if date and k_date != date:
            continue
        _CACHE.pop(key, None)
        removed += 1
    return removed
