from services import slot_cache
from services.normalizers import normalize_payment_method, normalize_phone, normalize_plate
from services.state_transitions import is_booking_status_transition_ok, is_job_status_transition_ok
from services.audit_log import _mask_sensitive


def test_normalizers_basics():
    assert normalize_plate(" abc-123 ") == "ABC-123"
    assert normalize_phone("+36 30 123 4567") == "301234567"
    assert normalize_payment_method("bankkartya") == "kartya"


def test_state_transitions():
    assert is_booking_status_transition_ok("foglalt", "folyamatban")
    assert not is_booking_status_transition_ok("lemondta", "foglalt")
    assert is_job_status_transition_ok("folyamatban", "kesz")
    assert not is_job_status_transition_ok("nem_jott_el", "kesz")


def test_slot_cache_set_get_invalidate():
    slot_cache.invalidate_slots()
    slot_cache.set_slots("Budapest", "2026-01-25", None, 60, [{"time_slot": "10:00"}], ttl_seconds=5)
    cached = slot_cache.get_slots("Budapest", "2026-01-25", None, 60)
    assert cached is not None
    assert cached[0]["time_slot"] == "10:00"
    slot_cache.invalidate_slots(location="Budapest", date="2026-01-25")
    assert slot_cache.get_slots("Budapest", "2026-01-25", None, 60) is None


def test_audit_mask_sensitive_fields():
    masked = _mask_sensitive(
        {
            "phone": "36301234567",
            "email": "test@example.com",
            "tax_number": "12345678-1-42",
            "safe": "ok",
        }
    )
    assert masked["phone"].startswith("36")
    assert "***" in masked["email"]
    assert "***" in masked["tax_number"]
    assert masked["safe"] == "ok"
