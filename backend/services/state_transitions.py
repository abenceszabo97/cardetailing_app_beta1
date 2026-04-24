"""
Explicit booking / job status transition rules.
"""
from __future__ import annotations

from typing import Optional, Set

# All statuses we ever persist on bookings
BOOKING_STATUSES = frozenset(
    {
        "foglalt",
        "visszaigazolva",
        "folyamatban",
        "kesz",
        "lemondta",
        "nem_jott_el",
    }
)

# Workflow: foglalt/visszaigazolva -> folyamatban -> kész; lemondta / no-show státuszok lezárják
BOOKING_NEXT: dict[str, Set[str]] = {
    "foglalt": {"folyamatban", "kesz", "lemondta", "nem_jott_el", "foglalt", "visszaigazolva"},
    "visszaigazolva": {"foglalt", "folyamatban", "kesz", "lemondta", "nem_jott_el", "visszaigazolva"},
    "folyamatban": {"kesz", "lemondta", "nem_jott_el", "folyamatban", "foglalt"},
    "kesz": {"kesz", "folyamatban"},
    "lemondta": set(),
    "nem_jott_el": set(),
}

JOB_STATUSES = frozenset(
    {
        "foglalt",
        "folyamatban",
        "kesz",
        "lemondta",
        "nem_jott_el",
    }
)

JOB_NEXT: dict[str, Set[str]] = {
    "foglalt": {"folyamatban", "kesz", "lemondta", "nem_jott_el", "foglalt"},
    "folyamatban": {"kesz", "lemondta", "nem_jott_el", "folyamatban", "foglalt"},
    "kesz": {"kesz", "folyamatban"},
    "lemondta": set(),
    "nem_jott_el": set(),
}


def is_booking_status_transition_ok(old: Optional[str], new: str) -> bool:
    if not new or new not in BOOKING_STATUSES:
        return False
    if not old or old == new:
        return True
    if old not in BOOKING_STATUSES:
        return True
    return new in BOOKING_NEXT.get(old, set())


def is_job_status_transition_ok(old: Optional[str], new: str) -> bool:
    if not new or new not in JOB_STATUSES:
        return False
    if not old or old == new:
        return True
    if old not in JOB_STATUSES:
        return True
    return new in JOB_NEXT.get(old, set())
