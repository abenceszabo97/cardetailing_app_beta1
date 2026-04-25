"""
Simple Mongo-backed outbox for domain events.
"""
from __future__ import annotations

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional

from database import db
from pymongo import ReturnDocument


async def enqueue_event(
    event_type: str, payload: dict, *, aggregate_type: str, aggregate_id: str
) -> str:
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    await db.outbox.insert_one(
        {
            "event_id": event_id,
            "event_type": event_type,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "payload": payload,
            "status": "pending",
            "attempts": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return event_id


async def mark_event_processed(event_id: str, *, error: Optional[str] = None) -> None:
    update = {
        "status": "processed" if not error else "failed",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        update["last_error"] = error
    await db.outbox.update_one({"event_id": event_id}, {"$set": update})


async def process_once() -> int:
    event = await db.outbox.find_one_and_update(
        {"status": "pending"},
        {
            "$set": {
                "status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$inc": {"attempts": 1},
        },
        sort=[("created_at", 1)],
        return_document=ReturnDocument.AFTER,
    )
    if not event:
        return 0
    # MVP processor: mark as processed; future subscribers can fan-out from here.
    await mark_event_processed(event["event_id"])
    return 1


async def worker_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        processed = await process_once()
        if processed == 0:
            await asyncio.sleep(1.0)
