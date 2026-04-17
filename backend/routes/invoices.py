"""
Számlázz.hu Invoice Integration
Docs: https://docs.szamlazz.hu/
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from database import db
from models.user import User

router = APIRouter()

SZAMLAZZ_API_URL = "https://www.szamlazz.hu/szamla/"


def get_api_key():
    """Read Számlázz.hu agent key from settings or environment."""
    return os.environ.get("SZAMLAZZ_API_KEY", "")


async def get_api_key_from_db():
    """Read API key from settings collection if stored there."""
    doc = await db.settings.find_one({"key": "szamlazz_api_key"}, {"_id": 0})
    if doc and doc.get("value"):
        return doc["value"]
    return get_api_key()


class InvoiceRequest(BaseModel):
    job_id: str
    buyer_name: str
    buyer_email: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_tax_number: Optional[str] = None  # adószám (optional)
    payment_method: str = "keszpenz"  # keszpenz | kartya | atutalas
    comment: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    api_key: str


@router.get("/invoices/status")
async def get_invoice_status(user: User = Depends(get_current_user)):
    """Check if Számlázz.hu is configured."""
    api_key = await get_api_key_from_db()
    return {
        "configured": bool(api_key),
        "has_key": bool(api_key),
    }


@router.post("/invoices/set-api-key")
async def set_api_key(data: ApiKeyUpdate, user: User = Depends(get_current_user)):
    """Store the Számlázz.hu API key (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    await db.settings.update_one(
        {"key": "szamlazz_api_key"},
        {"$set": {"key": "szamlazz_api_key", "value": data.api_key, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "API kulcs elmentve"}


@router.post("/invoices/create")
async def create_invoice(data: InvoiceRequest, user: User = Depends(get_current_user)):
    """
    Create a Számlázz.hu invoice for a completed job.
    Uses the XML API (agent key authentication).
    """
    api_key = await get_api_key_from_db()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Számlázz.hu API kulcs nincs beállítva. Menj a Beállítások oldalra."
        )

    # Load the job
    job = await db.jobs.find_one({"job_id": data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")

    price = job.get("price", 0)
    service_name = job.get("service_name", "Autókozmetikai szolgáltatás")
    job_date = job.get("date", datetime.now(timezone.utc).isoformat())[:10]

    # Map payment methods
    payment_map = {
        "keszpenz": "Készpénz",
        "kartya": "Bankkártya",
        "atutalas": "Átutalás"
    }
    fizmod = payment_map.get(data.payment_method, "Készpénz")

    # Calculate due date
    due_date = datetime.now(timezone.utc) + timedelta(days=8)
    due_date_str = due_date.strftime("%Y-%m-%d")

    # Net price (gross / 1.27 for 27% VAT)
    gross = float(price)
    net = round(gross / 1.27, 2)
    vat = round(gross - net, 2)

    buyer_xml = f"""
    <vevo>
        <nev>{data.buyer_name}</nev>
        {"<email>" + data.buyer_email + "</email>" if data.buyer_email else ""}
        {"<adoszam>" + data.buyer_tax_number + "</adoszam>" if data.buyer_tax_number else ""}
        {"<cim>" + data.buyer_address + "</cim>" if data.buyer_address else "<irsz>0000</irsz><telepules>Ismeretlen</telepules><cim>-</cim>"}
        <sendEmail>{"true" if data.buyer_email else "false"}</sendEmail>
        <azonosito>{job.get("customer_id", "")}</azonosito>
    </vevo>""".strip()

    xml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
    <beallitasok>
        <szamlaszamTomb>false</szamlaszamTomb>
        <szamlaLetoltes>false</szamlaLetoltes>
        <szamlaLetoltesiPeldanyszam>0</szamlaLetoltesiPeldanyszam>
        <valaszVerzio>1</valaszVerzio>
        <aggregator></aggregator>
        <felhasznalo></felhasznalo>
        <jelszo></jelszo>
        <szamlaagentkulcs>{api_key}</szamlaagentkulcs>
    </beallitasok>
    <fejlec>
        <keltDatum>{datetime.now(timezone.utc).strftime("%Y-%m-%d")}</keltDatum>
        <teljesitesDatum>{job_date}</teljesitesDatum>
        <fizetesiHataridoDatum>{due_date_str}</fizetesiHataridoDatum>
        <fizmod>{fizmod}</fizmod>
        <penznem>HUF</penznem>
        <szamlaNyelve>hu</szamlaNyelve>
        <megjegyzes>{data.comment or f"Foglalás azonosító: {data.job_id}"}</megjegyzes>
        <rendelesSzam>{data.job_id}</rendelesSzam>
        <dijbekeroSzamlaszam></dijbekeroSzamlaszam>
        <elolegszamla>false</elolegszamla>
        <vegszamla>false</vegszamla>
        <dijbekero>false</dijbekero>
        <szamlaszamElotag>XCLEAN</szamlaszamElotag>
    </fejlec>
    {buyer_xml}
    <tetelek>
        <tetel>
            <megnevezes>{service_name}</megnevezes>
            <mennyiseg>1</mennyiseg>
            <mennyisegiEgyseg>db</mennyisegiEgyseg>
            <nettoEgysegAr>{net}</nettoEgysegAr>
            <afakulcs>27</afakulcs>
            <nettoErtek>{net}</nettoErtek>
            <afaErtek>{vat}</afaErtek>
            <bruttoErtek>{gross}</bruttoErtek>
            <megjegyzes></megjegyzes>
        </tetel>
    </tetelek>
</xmlszamla>"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                SZAMLAZZ_API_URL,
                data={"action-xmlagentxmlfile": xml_payload},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

        # Check for Számlázz.hu error
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Számlázz.hu hiba: HTTP {response.status_code}")

        # Parse response headers for invoice number
        invoice_number = response.headers.get("szlaszam", "")
        invoice_net = response.headers.get("szlanettoosszeg", "")
        pdf_url = None

        # Store invoice info on the job
        await db.jobs.update_one(
            {"job_id": data.job_id},
            {"$set": {
                "invoice_number": invoice_number,
                "invoice_created_at": datetime.now(timezone.utc).isoformat(),
                "invoice_buyer": data.buyer_name,
            }}
        )

        return {
            "success": True,
            "invoice_number": invoice_number,
            "message": f"Számla kiállítva: {invoice_number}" if invoice_number else "Számla elküldve a Számlázz.hu rendszerbe",
            "net": net,
            "gross": gross,
        }

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Hálózati hiba a Számlázz.hu kapcsolódáskor: {str(e)}")


@router.get("/invoices/job/{job_id}")
async def get_job_invoice(job_id: str, user: User = Depends(get_current_user)):
    """Get invoice info for a job."""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0, "invoice_number": 1, "invoice_created_at": 1, "invoice_buyer": 1})
    if not job:
        raise HTTPException(status_code=404, detail="Munka nem található")
    return {
        "has_invoice": bool(job.get("invoice_number")),
        "invoice_number": job.get("invoice_number"),
        "invoice_created_at": job.get("invoice_created_at"),
        "invoice_buyer": job.get("invoice_buyer"),
    }
