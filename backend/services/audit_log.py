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
    request_id: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    safe_changes = _mask_sensitive(_sanitize_for_storage(changes) if changes else None)
    if safe_changes and len(str(safe_changes)) > 8000:
        safe_changes = {"truncated": True, "preview": str(safe_changes)[:8000]}
    doc = {
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "user_id": user_id,
        "user_name": user_name,
        "changes": safe_changes,
        "meta": _sanitize_for_storage(meta) if meta else None,
        "request_id": request_id,
        "ip": ip,
        "user_agent": user_agent,
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


def _mask_sensitive(value: Any, key_name: Optional[str] = None) -> Any:
    sensitive = {"phone", "email", "tax_number", "invoice_tax_number"}
    if isinstance(value, dict):
        return {k: _mask_sensitive(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [_mask_sensitive(v, key_name) for v in value]
    if key_name in sensitive and isinstance(value, str):
        if len(value) <= 3:
            return "***"
        return f"{value[:2]}***{value[-2:]}"
    return value
