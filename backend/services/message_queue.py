"""
Mongo-backed lightweight queue for outbound email/SMS.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from database import db
from pymongo import ReturnDocument

MAX_ATTEMPTS = 5


async def enqueue_message(
    *,
    channel: str,
    event_type: str,
    payload: dict,
    dedupe_key: Optional[str] = None,
) -> str:
    if dedupe_key:
        existing = await db.message_queue.find_one(
            {
                "dedupe_key": dedupe_key,
                "status": {"$in": ["pending", "processing", "done"]},
            },
            {"_id": 0, "message_id": 1},
        )
        if existing:
            return existing["message_id"]
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    await db.message_queue.insert_one(
        {
            "message_id": message_id,
            "channel": channel,
            "event_type": event_type,
            "payload": payload,
            "dedupe_key": dedupe_key,
            "status": "pending",
            "attempts": 0,
            "next_attempt_at": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
    )
    return message_id


async def process_once() -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    item = await db.message_queue.find_one_and_update(
        {
            "status": "pending",
            "next_attempt_at": {"$lte": now_iso},
        },
        {
            "$set": {
                "status": "processing",
                "updated_at": now_iso,
            }
        },
        sort=[("next_attempt_at", 1)],
        return_document=ReturnDocument.AFTER,
    )
    if not item:
        return 0
    message_id = item["message_id"]
    try:
        await _dispatch(item["channel"], item["event_type"], item["payload"])
        await db.message_queue.update_one(
            {"message_id": message_id},
            {
                "$set": {
                    "status": "done",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return 1
    except Exception as exc:
        attempts = int(item.get("attempts", 0)) + 1
        if attempts >= MAX_ATTEMPTS:
            await db.message_queue.update_one(
                {"message_id": message_id},
                {
                    "$set": {
                        "status": "dead_letter",
                        "attempts": attempts,
                        "last_error": str(exc),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
        else:
            backoff_seconds = min(300, 2**attempts)
            next_attempt = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)
            await db.message_queue.update_one(
                {"message_id": message_id},
                {
                    "$set": {
                        "status": "pending",
                        "attempts": attempts,
                        "last_error": str(exc),
                        "next_attempt_at": next_attempt.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
        return 0


async def worker_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        processed = await process_once()
        if processed == 0:
            await asyncio.sleep(1.0)


async def _dispatch(channel: str, event_type: str, payload: dict) -> None:
    if channel == "email" and event_type == "booking_confirmation":
        from services.email_service import send_booking_confirmation

        await send_booking_confirmation(payload)
        return
    if channel == "sms" and event_type == "booking_confirmation":
        from services.sms_service import send_booking_confirmation_sms

        await send_booking_confirmation_sms(payload)
        return
    raise ValueError(f"Unsupported queue message: {channel}/{event_type}")
