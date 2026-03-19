"""
AI Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from config import EMERGENT_LLM_KEY
from database import db

router = APIRouter()

class UpsellRequest(BaseModel):
    car_type: str
    current_service: str

class PhotoAnalysisRequest(BaseModel):
    image_base64: str

class QuoteRequest(BaseModel):
    car_type: str
    condition: str
    services_requested: List[str]
    notes: Optional[str] = None

@router.post("/ai/upsell")
async def get_upsell_suggestions(data: UpsellRequest):
    """Get AI-powered upsell suggestions"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nincs konfigurálva")
    
    try:
        from emergentintegrations.llm.chat import Chat, UserMessage
        
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        services_text = "\n".join([f"- {s['name']}: {s['price']} Ft ({s.get('category', 'egyéb')})" for s in services])
        
        chat = Chat(
            api_key=EMERGENT_LLM_KEY,
            model="gemini-2.0-flash",
            system_prompt=f"""Te egy autómosó upsell asszisztens vagy. A feladatod, hogy a megadott autótípus és aktuális szolgáltatás alapján ajánlj további szolgáltatásokat.

Elérhető szolgáltatások:
{services_text}

Válaszolj CSAK JSON formátumban:
{{"suggestions": [{{"service_name": "...", "reason": "..."}}], "priority_suggestion": "..."}}"""
        )
        
        response = await chat.send_message_async(
            UserMessage(content=f"Autó típus: {data.car_type}\nJelenlegi szolgáltatás: {data.current_service}")
        )
        
        import json
        try:
            result = json.loads(response.content)
        except:
            result = {"suggestions": [], "priority_suggestion": response.content[:200]}
        
        return result
        
    except Exception as e:
        logging.error(f"AI upsell error: {e}")
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")

@router.post("/ai/photo-analysis")
async def analyze_car_photos(data: PhotoAnalysisRequest):
    """Analyze car photos using AI"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nincs konfigurálva")
    
    try:
        from emergentintegrations.llm.chat import Chat, UserMessage
        
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        services_text = "\n".join([f"- {s['name']}: {s['price']} Ft" for s in services])
        
        chat = Chat(
            api_key=EMERGENT_LLM_KEY,
            model="gemini-2.0-flash",
            system_prompt=f"""Te egy autómosó szakértő vagy. Elemezd a kapott autó képet és adj javaslatokat.

Elérhető szolgáltatások:
{services_text}

Válaszolj CSAK JSON formátumban:
{{
  "condition": "jó/közepes/rossz",
  "detected_issues": ["..."],
  "recommended_services": ["..."],
  "estimated_price_range": "X-Y Ft",
  "notes": "..."
}}"""
        )
        
        response = await chat.send_message_async(
            UserMessage(
                content="Elemezd ezt az autó képet és adj javaslatokat a tisztításhoz.",
                images=[f"data:image/jpeg;base64,{data.image_base64}"]
            )
        )
        
        import json
        try:
            result = json.loads(response.content)
        except:
            result = {
                "condition": "ismeretlen",
                "detected_issues": [],
                "recommended_services": [],
                "estimated_price_range": "N/A",
                "notes": response.content[:500]
            }
        
        return result
        
    except Exception as e:
        logging.error(f"AI photo analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")

@router.post("/ai/quote")
async def generate_quote(data: QuoteRequest):
    """Generate AI-powered price quote"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nincs konfigurálva")
    
    try:
        from emergentintegrations.llm.chat import Chat, UserMessage
        
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        services_dict = {s["name"]: s for s in services}
        
        total_base = 0
        service_details = []
        for srv_name in data.services_requested:
            if srv_name in services_dict:
                srv = services_dict[srv_name]
                total_base += srv["price"]
                service_details.append(f"- {srv_name}: {srv['price']} Ft")
        
        chat = Chat(
            api_key=EMERGENT_LLM_KEY,
            model="gemini-2.0-flash",
            system_prompt="""Te egy autómosó árajánlat készítő vagy. Az alapárak mellett adj javaslatot az állapot alapján esetleges felárra vagy kedvezményre.

Válaszolj CSAK JSON formátumban:
{
  "base_total": 0,
  "condition_adjustment": 0,
  "adjustment_reason": "...",
  "final_total": 0,
  "time_estimate_minutes": 0,
  "recommendations": "..."
}"""
        )
        
        prompt = f"""Autó: {data.car_type}
Állapot: {data.condition}
Kért szolgáltatások:
{chr(10).join(service_details)}
Alapár összesen: {total_base} Ft
Megjegyzés: {data.notes or 'nincs'}"""
        
        response = await chat.send_message_async(UserMessage(content=prompt))
        
        import json
        try:
            result = json.loads(response.content)
            result["base_total"] = total_base
            if "final_total" not in result or result["final_total"] == 0:
                result["final_total"] = total_base + result.get("condition_adjustment", 0)
        except:
            result = {
                "base_total": total_base,
                "condition_adjustment": 0,
                "adjustment_reason": "Automatikus számítás",
                "final_total": total_base,
                "time_estimate_minutes": 60,
                "recommendations": response.content[:300]
            }
        
        return result
        
    except Exception as e:
        logging.error(f"AI quote error: {e}")
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")
