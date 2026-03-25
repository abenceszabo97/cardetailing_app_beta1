"""
Services Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from dependencies import get_current_user
from database import db
from models.user import User
from models.service import (
    Service, ServiceCreate, 
    PACKAGE_FEATURES, PRICE_MATRIX, DURATION_MATRIX, 
    EXTRA_SERVICES, CAR_SIZE_INFO, PROMOTIONS
)

router = APIRouter()

# Promotion model
class PromotionCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    category: str = "komplett"
    car_sizes: List[str] = ["S", "M"]
    package: str = "Pro"
    features: Optional[List[str]] = None
    duration: int = 70
    badge: str = "🎉 AKCIÓ"
    valid_until: Optional[str] = None
    active: bool = True

class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    category: Optional[str] = None
    car_sizes: Optional[List[str]] = None
    package: Optional[str] = None
    features: Optional[List[str]] = None
    duration: Optional[int] = None
    badge: Optional[str] = None
    valid_until: Optional[str] = None
    active: Optional[bool] = None

@router.get("/services")
async def get_services(user: User = Depends(get_current_user)):
    """Get all services"""
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    return services

@router.get("/services/pricing-data")
async def get_pricing_data():
    """Get all pricing data for the booking page (public, no auth)"""
    # Get promotions from database
    db_promotions = await db.promotions.find({"active": True}, {"_id": 0}).to_list(100)
    
    # If no DB promotions, use default
    if not db_promotions:
        db_promotions = [p for p in PROMOTIONS if p.get("active", True)]
    
    return {
        "package_features": PACKAGE_FEATURES,
        "price_matrix": PRICE_MATRIX,
        "duration_matrix": DURATION_MATRIX,
        "car_sizes": CAR_SIZE_INFO,
        "packages": ["Eco", "Pro", "VIP"],
        "categories": ["kulso", "belso", "komplett"],
        "promotions": db_promotions
    }

@router.get("/services/promotions")
async def get_promotions():
    """Get all promotions (public, no auth)"""
    promotions = await db.promotions.find({}, {"_id": 0}).to_list(100)
    if not promotions:
        return [p for p in PROMOTIONS if p.get("active", True)]
    return promotions

@router.get("/services/promotions/admin")
async def get_promotions_admin(user: User = Depends(get_current_user)):
    """Get all promotions for admin (including inactive)"""
    promotions = await db.promotions.find({}, {"_id": 0}).to_list(100)
    return promotions

@router.post("/services/promotions")
async def create_promotion(data: PromotionCreate, user: User = Depends(get_current_user)):
    """Create a new promotion (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    # Get features from package if not provided
    features = data.features
    if not features:
        features = PACKAGE_FEATURES.get(data.category, {}).get(data.package, [])
    
    promotion = {
        "id": f"promo_{uuid.uuid4().hex[:8]}",
        "name": data.name,
        "description": data.description,
        "price": data.price,
        "original_price": data.original_price,
        "discount_percent": data.discount_percent,
        "category": data.category,
        "car_sizes": data.car_sizes,
        "package": data.package,
        "features": features,
        "duration": data.duration,
        "badge": data.badge,
        "valid_until": data.valid_until,
        "active": data.active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.promotions.insert_one(promotion)
    
    # Return without _id
    return {k: v for k, v in promotion.items() if k != "_id"}

@router.put("/services/promotions/{promo_id}")
async def update_promotion(promo_id: str, data: PromotionUpdate, user: User = Depends(get_current_user)):
    """Update a promotion (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    result = await db.promotions.update_one(
        {"id": promo_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akció nem található")
    
    return {"message": "Akció frissítve"}

@router.delete("/services/promotions/{promo_id}")
async def delete_promotion(promo_id: str, user: User = Depends(get_current_user)):
    """Delete a promotion (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    result = await db.promotions.delete_one({"id": promo_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Akció nem található")
    
    return {"message": "Akció törölve"}

@router.get("/services/extras")
async def get_extra_services():
    """Get extra services list (public, no auth)"""
    # Get extras from database or use default
    db_extras = await db.services.find(
        {"service_type": "extra"}, 
        {"_id": 0}
    ).to_list(100)
    
    if db_extras:
        return db_extras
    
    # Return default extras
    return EXTRA_SERVICES

@router.get("/services/calculate-price")
async def calculate_service_price(
    car_size: str,
    category: str,
    package: str,
    extras: Optional[str] = None  # comma-separated extra service IDs
):
    """
    Calculate total price for selected services (public, no auth)
    """
    if car_size not in PRICE_MATRIX:
        raise HTTPException(status_code=400, detail="Érvénytelen autó méret")
    if category not in PRICE_MATRIX[car_size]:
        raise HTTPException(status_code=400, detail="Érvénytelen kategória")
    if package not in PRICE_MATRIX[car_size][category]:
        raise HTTPException(status_code=400, detail="Érvénytelen csomag")
    
    base_price = PRICE_MATRIX[car_size][category][package]
    duration = DURATION_MATRIX[car_size][category]
    
    # Get package features
    features = PACKAGE_FEATURES.get(category, {}).get(package, [])
    
    # Add VIP bonus duration
    if package == "VIP":
        duration = int(duration * 1.5)
    elif package == "Pro":
        duration = int(duration * 1.2)
    
    result = {
        "base_price": base_price,
        "extras_price": 0,
        "total_price": base_price,
        "duration": duration,
        "features": features,
        "selected_extras": []
    }
    
    # Calculate extras
    if extras:
        extra_ids = extras.split(",")
        for extra_id in extra_ids:
            extra = await db.services.find_one(
                {"service_id": extra_id, "service_type": "extra"},
                {"_id": 0}
            )
            if extra:
                extra_price = extra.get("price") or extra.get("min_price", 0)
                result["extras_price"] += extra_price
                result["selected_extras"].append({
                    "name": extra["name"],
                    "price": extra_price
                })
        
        result["total_price"] = base_price + result["extras_price"]
    
    return result

@router.post("/services")
async def create_service(data: ServiceCreate, user: User = Depends(get_current_user)):
    """Create new service"""
    service = Service(**data.model_dump())
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return service.model_dump()

@router.post("/services/sync-pricing")
async def sync_pricing_to_db(user: User = Depends(get_current_user)):
    """
    Sync pricing matrix to database services.
    Creates services based on PRICE_MATRIX if they don't exist.
    Admin only.
    """
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    created = 0
    updated = 0
    
    # Create/update base services from price matrix
    for car_size, categories in PRICE_MATRIX.items():
        for category, packages in categories.items():
            for package, price in packages.items():
                service_name = f"{car_size} - {category.capitalize()} {package}"
                duration = DURATION_MATRIX[car_size][category]
                features = PACKAGE_FEATURES.get(category, {}).get(package, [])
                
                # Adjust duration for Pro/VIP
                if package == "VIP":
                    duration = int(duration * 1.5)
                elif package == "Pro":
                    duration = int(duration * 1.2)
                
                existing = await db.services.find_one({
                    "car_size": car_size,
                    "category": category,
                    "package": package
                })
                
                service_data = {
                    "name": service_name,
                    "category": category,
                    "price": price,
                    "duration": duration,
                    "car_size": car_size,
                    "package": package,
                    "features": features,
                    "service_type": "base_service",
                    "active": True
                }
                
                if existing:
                    await db.services.update_one(
                        {"service_id": existing["service_id"]},
                        {"$set": service_data}
                    )
                    updated += 1
                else:
                    service = Service(**service_data)
                    doc = service.model_dump()
                    doc["created_at"] = doc["created_at"].isoformat()
                    await db.services.insert_one(doc)
                    created += 1
    
    # Create/update extra services
    for extra in EXTRA_SERVICES:
        existing = await db.services.find_one({"name": extra["name"], "service_type": "extra"})
        
        extra_data = {
            "name": extra["name"],
            "category": extra["category"],
            "price": extra.get("price", extra.get("min_price", 0)),
            "min_price": extra.get("min_price"),
            "duration": 30,  # Default extra duration
            "description": extra.get("description", ""),
            "service_type": "extra",
            "active": True
        }
        
        if existing:
            await db.services.update_one(
                {"service_id": existing["service_id"]},
                {"$set": extra_data}
            )
            updated += 1
        else:
            service = Service(**extra_data)
            doc = service.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.services.insert_one(doc)
            created += 1
    
    return {"created": created, "updated": updated, "message": "Árak szinkronizálva"}

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
