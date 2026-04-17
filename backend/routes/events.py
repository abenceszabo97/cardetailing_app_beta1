"""
SSE (Server-Sent Events) — real-time dashboard updates
"""
import asyncio
import json
import logging
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, Set
from dependencies import get_current_user
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# ── In-memory event bus ────────────────────────────────────────────────────────
# Each SSE connection gets its own asyncio.Queue.
_subscribers: Set[asyncio.Queue] = set()


def publish_event(event_type: str, data: Optional[dict] = None):
    """
    Call this from any route that mutates jobs/bookings to push a live update
    to all connected Dashboard clients.
    """
    payload = json.dumps({"type": event_type, **(data or {})})
    dead = set()
    for q in _subscribers:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.add(q)
    _subscribers.difference_update(dead)


# ── SSE endpoint ───────────────────────────────────────────────────────────────

@router.get("/events/dashboard")
async def dashboard_events(request: Request, user: User = Depends(get_current_user)):
    """
    Server-Sent Events stream for live Dashboard updates.
    Clients receive 'refresh' events whenever a job or booking is mutated,
    plus a heartbeat every 25 s to keep the connection alive.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers.add(queue)

    async def event_generator():
        # Initial handshake
        yield "data: {\"type\":\"connected\"}\n\n"
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat — keeps proxy/browser connection alive
                    yield ": heartbeat\n\n"
        except Exception as e:
            logger.debug(f"SSE client disconnected: {e}")
        finally:
            _subscribers.discard(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Nginx: disable buffering
        },
    )
