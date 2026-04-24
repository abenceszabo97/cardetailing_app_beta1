"""
Append-only audit trail for financial / operational changes.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from database import db


async def log_audit(
    action: str,
    resource_type: str,
    resource_id: str,
    *,
    user_id: str,
    user_name: Optional[str] = None,
    changes: Optional[dict] = None,
    meta: Optional[dict] = None,
) -> None:
    doc = {
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "user_id": user_id,
        "user_name": user_name,
        "changes": _sanitize_for_storage(changes) if changes else None,
        "meta": _sanitize_for_storage(meta) if meta else None,
    }
    try:
        await db.audit_log.insert_one(doc)
    except Exception:
        pass


def _sanitize_for_storage(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _sanitize_for_storage(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_storage(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
