"""
Számlázz.hu Invoice Integration — Multi-entity support
Docs: https://docs.szamlazz.hu/

Billing logic:
  - Budapest            → API key: szamlazz_budapest   (X cég)
  - Debrecen + private  → API key: szamlazz_debrecen_p (Y cég)
  - Debrecen + company  → API key: szamlazz_debrecen_c (Z cég)

Company detection: customer name contains KFT, BT, ZRT, RT, NYRT, KHT, SZK, stb.
No VAT number / private person → send nyugta (receipt) instead of számla
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
import re
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from database import db
from models.user import User
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

SZAMLAZZ_API_URL = "https://www.szamlazz.hu/szamla/"

# Company suffixes to detect business customers (Hungarian)
COMPANY_PATTERNS = re.compile(
    r'\b(kft|bt|zrt|rt|nyrt|kht|szk|kv|ev|oe|ltda|llc|gmbh|ag|sa|nv)\b\.?',
    re.IGNORECASE
)


def detect_company(name: str) -> bool:
    """Return True if the name looks like a company."""
    return bool(COMPANY_PATTERNS.search(name or ""))


async def get_setting(key: str) -> Optional[str]:
    """Read a setting from DB."""
    doc = await db.settings.find_one({"key": key}, {"_id": 0})
    return doc.get("value") if doc else None


async def resolve_api_key(location: str, is_company: bool) -> Optional[str]:
    """Determine which Számlázz.hu API key to use."""
    if location and location.lower() == "budapest":
        key = await get_setting("szamlazz_budapest")
    elif is_company:
        key = await get_setting("szamlazz_debrecen_company")
    else:
        key = await get_setting("szamlazz_debrecen_private")
    return key or None


# ─── Pydantic models ──────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    job_id: str
    buyer_name: str
    buyer_email: Optional[str] = None
    buyer_address: Optional[str] = None      # "Irányítószám Város, Utca hsz."
    buyer_zip: Optional[str] = None
    buyer_city: Optional[str] = None
    buyer_street: Optional[str] = None
    buyer_tax_number: Optional[str] = None   # adószám → triggers számla; empty → nyugta
    want_invoice: bool = True                # False → nyugta
    payment_method: str = "keszpenz"
    comment: Optional[str] = None
    extra_items: Optional[List[dict]] = None  # [{name, price}]
    billing_entity: Optional[str] = None  # "budapest" | "debrecen_private" | "debrecen_company" | None = auto


class ApiKeyUpdate(BaseModel):
    entity: str  # "budapest" | "debrecen_private" | "debrecen_company"
    api_key: str


class SellerUpdate(BaseModel):
    entity: str
    name: str
    zip: str
    city: str
    street: str
    tax_number: str
    bank_account: Optional[str] = None
    email: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _payment_label(method: str) -> str:
    return {
        "keszpenz": "Készpénz",
        "kartya": "Bankkártya",
        "bankkartya": "Bankkártya",
        "utalas": "Átutalás",
        "atutalas": "Átutalás",
        "banki_atutalas": "Átutalás",
    }.get(method, "Készpénz")


def _normalize_payment_method(value: Optional[str]) -> str:
    if not value:
        return "keszpenz"
    method = str(value).strip().lower()
    if method in {"utalas", "atutalas", "banki_atutalas"}:
        return "atutalas"
    if method in {"bankkartya", "kartya"}:
        return "kartya"
    return method


def _build_invoice_xml(api_key: str, job: dict, data: InvoiceCreate, is_receipt: bool) -> str:
    gross = float(job.get("price", 0))
    net = round(gross / 1.27, 2)
    vat_amount = round(gross - net, 2)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    job_date = (job.get("date") or today)[:10]
    due_date = (datetime.now(timezone.utc) + timedelta(days=8)).strftime("%Y-%m-%d")
    fizmod = _payment_label(data.payment_method)

    # Build item list
    items_xml = _build_items_xml(job, data, net, vat_amount, gross)

    # Address
    zip_code = data.buyer_zip or "0000"
    city = data.buyer_city or (data.buyer_address.split()[0] if data.buyer_address else "Ismeretlen")
    street = data.buyer_street or data.buyer_address or "-"

    buyer_xml = f"""
    <vevo>
        <nev>{_esc(data.buyer_name)}</nev>
        <irsz>{_esc(zip_code)}</irsz>
        <telepules>{_esc(city)}</telepules>
        <cim>{_esc(street)}</cim>
        {"<adoszam>" + _esc(data.buyer_tax_number) + "</adoszam>" if data.buyer_tax_number else ""}
        {"<email>" + _esc(data.buyer_email) + "</email>" if data.buyer_email else ""}
        <sendEmail>{"true" if data.buyer_email else "false"}</sendEmail>
        <azonosito>{job.get("customer_id", "")}</azonosito>
    </vevo>""".strip()

    if is_receipt:
        # Nyugta XML
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtacreate xmlns="http://www.szamlazz.hu/xmlnyugtacreate"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.szamlazz.hu/xmlnyugtacreate https://www.szamlazz.hu/szamla/docs/xsds/agentNyugta/xmlnyugtacreate.xsd">
    <beallitasok>
        <szamlaagentkulcs>{api_key}</szamlaagentkulcs>
        <pdfLetoltes>false</pdfLetoltes>
    </beallitasok>
    <fejlec>
        <hivasAzonosito>{job.get("job_id", "")}</hivasAzonosito>
        <keltDatum>{today}</keltDatum>
        <fizmod>{fizmod}</fizmod>
        <penznem>HUF</penznem>
        <megjegyzes>{_esc(data.comment or "")}</megjegyzes>
    </fejlec>
    {items_xml}
</xmlnyugtacreate>"""

    # Számla XML
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
    <beallitasok>
        <szamlaLetoltes>false</szamlaLetoltes>
        <valaszVerzio>1</valaszVerzio>
        <szamlaagentkulcs>{api_key}</szamlaagentkulcs>
    </beallitasok>
    <fejlec>
        <keltDatum>{today}</keltDatum>
        <teljesitesDatum>{job_date}</teljesitesDatum>
        <fizetesiHataridoDatum>{due_date}</fizetesiHataridoDatum>
        <fizmod>{fizmod}</fizmod>
        <penznem>HUF</penznem>
        <szamlaNyelve>hu</szamlaNyelve>
        <megjegyzes>{_esc(data.comment or f"Munka: {job.get('job_id', '')}")}</megjegyzes>
        <rendelesSzam>{job.get("job_id", "")}</rendelesSzam>
        <dijbekero>false</dijbekero>
        <szamlaszamElotag>XCLEAN</szamlaszamElotag>
    </fejlec>
    {buyer_xml}
    {items_xml}
</xmlszamla>"""


def _build_items_xml(job: dict, data: InvoiceCreate, net: float, vat_amount: float, gross: float) -> str:
    """Build <tetelek> XML, including extras if present."""
    service_name = job.get("service_name", "Autókozmetikai szolgáltatás")
    extra_items = data.extra_items or []

    if not extra_items:
        # Single item
        return f"""<tetelek>
        <tetel>
            <megnevezes>{_esc(service_name)}</megnevezes>
            <mennyiseg>1</mennyiseg>
            <mennyisegiEgyseg>db</mennyisegiEgyseg>
            <nettoEgysegAr>{net}</nettoEgysegAr>
            <afakulcs>27</afakulcs>
            <nettoErtek>{net}</nettoErtek>
            <afaErtek>{vat_amount}</afaErtek>
            <bruttoErtek>{gross}</bruttoErtek>
        </tetel>
    </tetelek>"""

    # Multiple items: base service + extras
    items = []
    # Separate base price from extras
    extras_total = sum(float(e.get("price", 0)) for e in extra_items)
    base_gross = gross - extras_total
    base_net = round(base_gross / 1.27, 2)
    base_vat = round(base_gross - base_net, 2)

    items.append(f"""        <tetel>
            <megnevezes>{_esc(service_name)}</megnevezes>
            <mennyiseg>1</mennyiseg>
            <mennyisegiEgyseg>db</mennyisegiEgyseg>
            <nettoEgysegAr>{base_net}</nettoEgysegAr>
            <afakulcs>27</afakulcs>
            <nettoErtek>{base_net}</nettoErtek>
            <afaErtek>{base_vat}</afaErtek>
            <bruttoErtek>{base_gross}</bruttoErtek>
        </tetel>""")

    for ex in extra_items:
        eg = float(ex.get("price", 0))
        en = round(eg / 1.27, 2)
        ev = round(eg - en, 2)
        items.append(f"""        <tetel>
            <megnevezes>{_esc(ex.get("name", "Extra"))}</megnevezes>
            <mennyiseg>1</mennyiseg>
            <mennyisegiEgyseg>db</mennyisegiEgyseg>
            <nettoEgysegAr>{en}</nettoEgysegAr>
            <afakulcs>27</afakulcs>
            <nettoErtek>{en}</nettoErtek>
            <afaErtek>{ev}</afaErtek>
            <bruttoErtek>{eg}</bruttoErtek>
        </tetel>""")

    return "<tetelek>\n" + "\n".join(items) + "\n    </tetelek>"


def _esc(text: str) -> str:
    """Escape XML special chars."""
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ─── API Routes ───────────────────────────────────────────────────────────────

@router.get("/invoices/status")
async def get_invoice_status(user: User = Depends(get_current_user)):
    """Check which billing entities are configured."""
    bp = await get_setting("szamlazz_budapest")
    dp = await get_setting("szamlazz_debrecen_private")
    dc = await get_setting("szamlazz_debrecen_company")
    return {
        "configured": bool(bp or dp or dc),
        "budapest": bool(bp),
        "debrecen_private": bool(dp),
        "debrecen_company": bool(dc),
    }


@router.post("/invoices/set-api-key")
async def set_api_key(data: ApiKeyUpdate, user: User = Depends(get_current_user)):
    """Store a Számlázz.hu API key (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    valid_entities = {"budapest", "debrecen_private", "debrecen_company"}
    if data.entity not in valid_entities:
        raise HTTPException(status_code=400, detail=f"Érvénytelen entitás. Válassz: {valid_entities}")
    key_name = f"szamlazz_{data.entity}"
    await db.settings.update_one(
        {"key": key_name},
        {"$set": {"key": key_name, "value": data.api_key, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": f"API kulcs elmentve ({data.entity})"}


@router.post("/invoices/create")
async def create_invoice(data: InvoiceCreate, user: User = Depends(get_current_user)):
    """
    Create a Számlázz.hu invoice or receipt for a completed job.
    Automatically picks the correct billing entity based on location and customer type.
    """
    # Load job
    job = await db.jobs.find_one({"job_id": data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")

    # Auto-populate extra_items from job extras if not explicitly provided
    if not data.extra_items and job.get("extras"):
        auto_extras = []
        for extra_id in job["extras"]:
            extra_svc = await db.services.find_one({"service_id": extra_id}, {"_id": 0, "name": 1, "price": 1, "min_price": 1})
            if extra_svc:
                auto_extras.append({
                    "name": extra_svc.get("name", "Extra"),
                    "price": extra_svc.get("price") or extra_svc.get("min_price", 0)
                })
        if auto_extras:
            data = data.model_copy(update={"extra_items": auto_extras})

    location = job.get("location", "Debrecen")
    is_company = detect_company(data.buyer_name) or bool(data.buyer_tax_number)
    is_receipt = not data.want_invoice or (not data.buyer_tax_number and not is_company)

    if data.billing_entity:
        api_key = await get_setting(f"szamlazz_{data.billing_entity}")
        if not api_key:
            raise HTTPException(status_code=400, detail=f"Nincs beállítva API kulcs ehhez a fiókhoz ({data.billing_entity}). Menj a Beállítások oldalra.")
    else:
        api_key = await resolve_api_key(location, is_company)
        if not api_key:
            raise HTTPException(status_code=400, detail="Számlázz.hu API kulcs nincs beállítva ehhez a telephely/ügyfél kombinációhoz. Menj a Beállítások oldalra.")

    normalized_payment_method = _normalize_payment_method(data.payment_method)
    data = data.model_copy(update={"payment_method": normalized_payment_method})

    xml_payload = _build_invoice_xml(api_key, job, data, is_receipt)

    action_field = "action-xmlagentxmlfile" if not is_receipt else "action-szamla_agent_nyugta_create"

    # Retry up to 3 times for transient network issues
    last_error = None
    response = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    SZAMLAZZ_API_URL,
                    data={action_field: xml_payload},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
            break  # success — exit retry loop
        except httpx.TimeoutException as e:
            last_error = e
            logger.warning(f"Számlázz.hu timeout (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(1)
        except httpx.ConnectError as e:
            last_error = e
            logger.warning(f"Számlázz.hu connection error (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(1)
        except httpx.RequestError as e:
            last_error = e
            logger.error(f"Számlázz.hu request error (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(1)

    if response is None:
        # All attempts failed
        if isinstance(last_error, httpx.TimeoutException):
            raise HTTPException(status_code=503, detail="A számlázási szolgáltatás nem válaszol. Kérjük próbálja újra.")
        elif isinstance(last_error, httpx.ConnectError):
            raise HTTPException(status_code=503, detail="Nem sikerült csatlakozni a számlázási szolgáltatáshoz. Kérjük ellenőrizze az internetkapcsolatot.")
        else:
            raise HTTPException(status_code=503, detail=f"Számlázási hálózati hiba, kérjük próbálja újra. ({type(last_error).__name__})")

    if response.status_code != 200:
        logger.error(f"Számlázz.hu HTTP error: {response.status_code} — {response.text[:200]}")
        raise HTTPException(status_code=502, detail=f"Számlázz.hu hiba (HTTP {response.status_code}). Kérjük ellenőrizze az API kulcsot és a számlázási adatokat.")

    invoice_number = response.headers.get("szlaszam", "") or response.headers.get("nyugtaszam", "")
    invoice_id = f"inv_{uuid.uuid4().hex[:8]}"

    # Store invoice record
    invoice_doc = {
        "invoice_id": invoice_id,
        "job_id": data.job_id,
        "customer_id": job.get("customer_id"),
        "customer_name": data.buyer_name,
        "customer_email": data.buyer_email,
        "buyer_tax_number": data.buyer_tax_number,
        "is_receipt": is_receipt,
        "is_company": is_company,
        "invoice_number": invoice_number,
        "amount": job.get("price", 0),
        "location": location,
        "billing_entity": "budapest" if location.lower() == "budapest" else ("debrecen_company" if is_company else "debrecen_private"),
        "payment_method": data.payment_method,
        "status": "fizetve" if data.payment_method in ("keszpenz", "kartya") else "fizetesre_var",
        "job_date": (job.get("date") or "")[:10],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
    }
    await db.invoices.insert_one(invoice_doc)

    # Update job
    await db.jobs.update_one(
        {"job_id": data.job_id},
        {"$set": {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "invoice_type": "nyugta" if is_receipt else "szamla",
            "invoice_created_at": datetime.now(timezone.utc).isoformat(),
            "invoice_buyer": data.buyer_name,
        }}
    )

    type_label = "Nyugta" if is_receipt else "Számla"
    return {
        "success": True,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "is_receipt": is_receipt,
        "billing_entity": invoice_doc["billing_entity"],
        "message": f"{type_label} kiállítva" + (f": {invoice_number}" if invoice_number else " és elküldve"),
    }


@router.get("/invoices")
async def list_invoices(
    location: Optional[str] = None,
    month: Optional[str] = None,   # YYYY-MM
    customer_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """List invoices with optional filters."""
    query = {}
    if location and location != "all":
        query["location"] = location
    if month:
        query["created_at"] = {"$regex": f"^{month}"}
    if customer_id:
        query["customer_id"] = customer_id

    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = sum(inv.get("amount", 0) for inv in invoices)
    return {"invoices": invoices, "total": total, "count": len(invoices)}


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: User = Depends(get_current_user)):
    inv = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Számla nem található")
    return inv


@router.post("/invoices/{invoice_id}/resend-email")
async def resend_invoice_email(invoice_id: str, user: User = Depends(get_current_user)):
    """Resend invoice email via Számlázz.hu (not yet supported by their API directly)."""
    inv = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Számla nem található")
    if not inv.get("invoice_number"):
        raise HTTPException(status_code=400, detail="Nincs számlaszám")
    # Számlázz.hu doesn't have a resend API endpoint publicly — we note this limitation
    return {"message": "Az email újraküldése a Számlázz.hu felületéről lehetséges.", "invoice_number": inv.get("invoice_number")}


@router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, user: User = Depends(get_current_user)):
    """Update payment status (fizetve / fizetesre_var)."""
    await db.invoices.update_one({"invoice_id": invoice_id}, {"$set": {"status": status}})
    return {"message": "Státusz frissítve"}


@router.get("/invoices/job/{job_id}")
async def get_job_invoice(job_id: str, user: User = Depends(get_current_user)):
    """Get invoice info for a specific job."""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0, "invoice_id": 1, "invoice_number": 1, "invoice_type": 1, "invoice_created_at": 1, "invoice_buyer": 1})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")
    return {
        "has_invoice": bool(job.get("invoice_number")),
        "invoice_id": job.get("invoice_id"),
        "invoice_number": job.get("invoice_number"),
        "invoice_type": job.get("invoice_type"),
        "invoice_created_at": job.get("invoice_created_at"),
        "invoice_buyer": job.get("invoice_buyer"),
    }
