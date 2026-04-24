"""
Idempotency for POST /bookings and POST /invoices/create using Idempotency-Key header.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Tuple

from fastapi import HTTPException
from database import db

TTL = timedelta(hours=24)
SCOPE_BOOKING = "post_booking"
SCOPE_INVOICE = "post_invoice"


def body_hash(data: Any) -> str:
    if hasattr(data, "model_dump"):
        raw = data.model_dump()
    elif isinstance(data, dict):
        raw = data
    else:
        raw = {"_": str(data)}
    payload = json.dumps(raw, default=str, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def get_cached_response(
    scope: str, idempotency_key: str, expected_hash: str
) -> Tuple[Optional[dict], Optional[str]]:
    if not idempotency_key or len(idempotency_key) < 8:
        return None, None
    doc = await db.idempotency.find_one(
        {"scope": scope, "idempotency_key": idempotency_key}, {"_id": 0}
    )
    if not doc:
        return None, None
    if doc.get("body_hash") != expected_hash:
        return None, "mismatch"
    return doc.get("response"), None


async def store_response(
    scope: str, idempotency_key: str, body_hash: str, response: dict
) -> None:
    if not idempotency_key or len(idempotency_key) < 8:
        return
    expires = datetime.now(timezone.utc) + TTL
    await db.idempotency.update_one(
        {
            "scope": scope,
            "idempotency_key": idempotency_key,
        },
        {
            "$set": {
                "body_hash": body_hash,
                "response": response,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires,
            }
        },
        upsert=True,
    )


def ensure_idempotency_key_valid(key: Optional[str]) -> None:
    if key is not None and key != "" and len(key) < 8:
        raise HTTPException(
            status_code=400, detail="Idempotency-Key must be at least 8 characters"
        )
