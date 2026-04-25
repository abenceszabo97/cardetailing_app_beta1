"""
Centralized input normalization helpers.
"""
from __future__ import annotations

import re
from typing import Optional


def normalize_plate(value: Optional[str]) -> str:
    return (value or "").strip().upper()


def normalize_phone(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    digits = re.sub(r"\D+", "", str(value))
    if digits.startswith("36") and len(digits) > 9:
        digits = digits[2:]
    elif digits.startswith("06"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    return digits[-9:] if digits else None


def normalize_payment_method(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    method = str(value).strip().lower()
    if method in {"utalas", "atutalas", "banki_atutalas"}:
        return "atutalas"
    if method in {"kartya", "bankkartya"}:
        return "kartya"
    return method


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", str(value).strip())
    return cleaned or None
