"""
AI Routes - Using Groq (FREE)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
import uuid
from database import db
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

class UpsellRequest(BaseModel):
    car_type: str
    current_service: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

# In-memory chat history (for session management)
chat_sessions = {}

def get_groq_client():
    """Get Groq client"""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="AI szolgáltatás nincs konfigurálva. Kérjük állítsa be a GROQ_API_KEY környezeti változót.")
    
    from groq import Groq
    return Groq(api_key=GROQ_API_KEY)


@router.post("/ai/chat")
async def chat_with_assistant(data: ChatMessage):
    """Chat with AI assistant about car wash services using Groq (FREE)"""
    try:
        client = get_groq_client()
        
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        services_text = "\n".join([f"- {s['name']}: {s['price']} Ft ({s.get('category', 'egyéb')}) - {s.get('description', '')}" for s in services])
        
        system_prompt = f"""Te az xClean autókozmetika AI asszisztense vagy. Segíts az ügyfeleknek a szolgáltatásokkal kapcsolatos kérdésekben.

Elérhető szolgáltatások:
{services_text}

Fontos információk:
- Telephely: Debrecen
- Nyitvatartás: H-P 8:00-18:00, Sz 8:00-14:00
- Foglalás az oldalon keresztül lehetséges
- VIP státusz 5+ sikeres mosás után jár

Legyél kedves, segítőkész és tömör. Válaszolj magyarul. Ha nem tudsz valamit, ajánld fel, hogy az ügyfél hívja a telephelyet."""
        
        session_id = data.session_id or f"chat_{uuid.uuid4().hex[:8]}"
        
        # Get or create session history
        if session_id not in chat_sessions:
            chat_sessions[session_id] = []
        
        # Build messages list
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_sessions[session_id][-10:])  # Keep last 10 messages
        messages.append({"role": "user", "content": data.message})
        
        # Call Groq
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast and free
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        response = completion.choices[0].message.content
        
        # Save to session history
        chat_sessions[session_id].append({"role": "user", "content": data.message})
        chat_sessions[session_id].append({"role": "assistant", "content": response})
        
        # Limit session size
        if len(chat_sessions[session_id]) > 20:
            chat_sessions[session_id] = chat_sessions[session_id][-20:]
        
        return {
            "response": response,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")


@router.post("/ai/upsell")
async def get_upsell_suggestions(data: UpsellRequest):
    """Get AI-powered upsell suggestions using Groq (FREE)"""
    try:
        client = get_groq_client()
        
        services = await db.services.find({}, {"_id": 0}).to_list(100)
        services_text = "\n".join([f"- {s['name']}: {s['price']} Ft ({s.get('category', 'egyéb')})" for s in services])
        
        system_prompt = f"""Te egy autókozmetika upsell asszisztens vagy. A feladatod, hogy a megadott autótípus és aktuális szolgáltatás alapján ajánlj további szolgáltatásokat.

Elérhető szolgáltatások:
{services_text}

Válaszolj CSAK JSON formátumban, semmilyen más szöveget ne írj:
{{"suggestions": [{{"service_name": "szolgáltatás neve", "reason": "rövid indoklás"}}], "priority_suggestion": "legfontosabb javaslat"}}"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Autó típus: {data.car_type}\nJelenlegi szolgáltatás: {data.current_service}"}
        ]
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.5,
            max_tokens=300
        )
        
        response = completion.choices[0].message.content
        
        import json
        try:
            # Clean response - remove markdown if present
            content = response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            result = json.loads(content.strip())
        except Exception:
            result = {"suggestions": [], "priority_suggestion": str(response)[:200]}
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"AI upsell error: {e}")
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")


@router.get("/ai/status")
async def get_ai_status():
    """Check AI service status"""
    return {
        "provider": "Groq",
        "model": "llama-3.1-8b-instant",
        "configured": bool(GROQ_API_KEY),
        "features": ["chat", "upsell"],
        "cost": "FREE"
    }
