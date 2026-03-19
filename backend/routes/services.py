"""
Services Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import db
from models.user import User
from models.service import Service, ServiceCreate

router = APIRouter()

@router.get("/services")
async def get_services(user: User = Depends(get_current_user)):
    """Get all services"""
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    return services

@router.post("/services")
async def create_service(data: ServiceCreate, user: User = Depends(get_current_user)):
    """Create new service"""
    service = Service(**data.model_dump())
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return service.model_dump()

@router.put("/services/{service_id}")
async def update_service(service_id: str, data: ServiceCreate, user: User = Depends(get_current_user)):
    """Update service"""
    result = await db.services.update_one(
        {"service_id": service_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    return {"message": "Szolgáltatás frissítve"}

@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: User = Depends(get_current_user)):
    """Delete service"""
    result = await db.services.delete_one({"service_id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Szolgáltatás nem található")
    return {"message": "Szolgáltatás törölve"}
