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
    EXTRA_SERVICES, CAR_SIZE_INFO, PROMOTIONS,
    POLISHING_PRICES, POLISHING_ADDONS
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
    location: Optional[str] = None

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
    location: Optional[str] = None

@router.get("/services")
async def get_services(location: Optional[str] = None, strict: bool = False, user: User = Depends(get_current_user)):
    """Get services filtered by location.

    - strict=True: only services explicitly assigned to that location (admin edit view)
    - strict=False (default): services for that location + global (no location set), for display/booking
    """
    query = {}
    if location and location != "all":
        if strict:
            # Admin strict view: only services with this exact location
            query["location"] = location
        else:
            # Display view: include global (null/missing) + location-specific
            query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    services = await db.services.find(query, {"_id": 0}).to_list(1000)
    return services

@router.get("/services/pricing-data")
async def get_pricing_data(location: Optional[str] = None):
    """Get all pricing data for the booking page (public, no auth)"""
    # Get promotions from database
    promo_query = {"active": True}
    if location == "Budapest":
        # Budapest: STRICT — only show explicitly Budapest-tagged promotions (no global/null ones)
        promo_query["location"] = "Budapest"
    elif location:
        promo_query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    db_promotions = await db.promotions.find(promo_query, {"_id": 0}).to_list(100)

    # Also include any hard-coded defaults that match the location and aren't already in DB
    # Deduplicate by both id AND name (case-insensitive) to avoid duplicates
    db_promo_ids = {p.get("id") for p in db_promotions}
    db_promo_names = {p.get("name", "").strip().lower() for p in db_promotions}
    for p in PROMOTIONS:
        if not p.get("active", True):
            continue
        if p.get("id") in db_promo_ids:
            continue
        if p.get("name", "").strip().lower() in db_promo_names:
            continue
        if location == "Budapest":
            # Budapest strict: only include hardcoded promotions explicitly tagged Budapest
            if p.get("location") != "Budapest":
                continue
        elif location and p.get("location") and p.get("location") != location:
            continue
        db_promotions.append(p)
    
    # Get extras from database (filtered by location)
    extras_query = {"service_type": "extra", "active": {"$ne": False}}
    if location:
        extras_query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    db_extras = await db.services.find(extras_query, {"_id": 0}).to_list(100)

    # Auto-seed and fallback if DB extras are empty
    if not db_extras:
        for extra in EXTRA_SERVICES:
            existing = await db.services.find_one({"name": extra["name"], "service_type": "extra"})
            if not existing:
                from models.service import Service
                service = Service(
                    name=extra["name"],
                    category=extra.get("category", "extra_kulso"),
                    price=extra.get("price", extra.get("min_price", 0)),
                    min_price=extra.get("min_price"),
                    duration=30,
                    description=extra.get("description", ""),
                    service_type="extra",
                    active=True
                )
                doc = service.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                await db.services.insert_one(doc)
        db_extras = await db.services.find(extras_query, {"_id": 0}).to_list(100)
        if not db_extras:
            db_extras = EXTRA_SERVICES

    # Get polishing services from DB (for Debrecen)
    polishing_query = {"category": "poliroz", "active": {"$ne": False}}
    if location and location.lower() == "debrecen":
        polishing_query["$or"] = [{"location": "Debrecen"}, {"location": None}, {"location": {"$exists": False}}]
    db_polishing = await db.services.find(polishing_query, {"_id": 0}).to_list(50)

    # Check for custom polishing prices in DB settings
    saved_polish = await db.settings.find_one({"key": "polishing_prices"}, {"_id": 0})
    if saved_polish and "prices" in saved_polish:
        merged_polishing = {}
        for type_key, type_data in POLISHING_PRICES.items():
            merged_polishing[type_key] = {
                **type_data,
                "prices": saved_polish["prices"].get(type_key, type_data["prices"])
            }
    else:
        merged_polishing = POLISHING_PRICES

    # Merge DB polishing services (with size_prices) into the types dict
    # DB polishing types are identified by category=="poliroz" and having a service_id
    merged_polishing_with_db = dict(merged_polishing)
    for db_pol in db_polishing:
        if db_pol.get("size_prices"):
            # This is a full polishing type record, expose it in types by service_id key
            type_key = db_pol["service_id"]
            prices = db_pol["size_prices"]
            merged_polishing_with_db[type_key] = {
                "name": db_pol["name"],
                "duration_label": db_pol.get("duration_label", ""),
                "description": db_pol.get("description", ""),
                "location": db_pol.get("location"),
                "service_id": db_pol["service_id"],
                "prices": prices,
                "_db": True
            }

    return {
        "package_features": PACKAGE_FEATURES,
        "price_matrix": PRICE_MATRIX,
        "duration_matrix": DURATION_MATRIX,
        "car_sizes": CAR_SIZE_INFO,
        "packages": ["Eco", "Pro", "VIP"],
        "categories": ["kulso", "belso", "komplett"],
        "promotions": db_promotions,
        "extras": db_extras,
        "polishing": {
            "types": merged_polishing_with_db,
            "addons": POLISHING_ADDONS,
            "custom": db_polishing
        }
    }

@router.get("/services/promotions")
async def get_promotions():
    """Get all promotions (public, no auth)"""
    promotions = await db.promotions.find({}, {"_id": 0}).to_list(100)
    if not promotions:
        return [p for p in PROMOTIONS if p.get("active", True)]
    return promotions

@router.get("/services/promotions/admin")
async def get_promotions_admin(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all promotions for admin (including inactive), optionally filtered by location.
    Also merges hardcoded PROMOTIONS that are not yet in DB so they can be managed."""
    query = {}
    if location == "Budapest":
        # Budapest admin: strict — only explicitly Budapest-tagged promos
        query["location"] = "Budapest"
    elif location and location != "all":
        # Other locations: inclusive (location-specific + global/null)
        query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    promotions = await db.promotions.find(query, {"_id": 0}).to_list(100)

    # Include hardcoded promotions not yet saved to DB (marked _hardcoded=True)
    db_promo_ids = {p.get("id") for p in promotions}
    db_promo_names = {p.get("name", "").strip().lower() for p in promotions}
    for p in PROMOTIONS:
        if p.get("id") in db_promo_ids:
            continue
        if p.get("name", "").strip().lower() in db_promo_names:
            continue
        p_loc = p.get("location")
        if location == "Budapest":
            # Strict: only Budapest-tagged hardcoded promos
            if p_loc != "Budapest":
                continue
        elif location and location != "all":
            # Inclusive: skip only if explicitly tagged to a DIFFERENT location
            if p_loc and p_loc != location:
                continue
        merged = dict(p)
        merged["_hardcoded"] = True
        promotions.append(merged)

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
        "location": data.location,
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
async def get_extra_services(location: Optional[str] = None):
    """Get extra services list (public, no auth)"""
    query = {"service_type": "extra", "active": {"$ne": False}}
    if location:
        query["$or"] = [{"location": location}, {"location": None}, {"location": {"$exists": False}}]
    
    db_extras = await db.services.find(query, {"_id": 0}).to_list(100)
    
    if db_extras:
        return db_extras
    
    # Return default extras (Debrecen only)
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

@router.post("/services/extras/seed")
async def seed_extras(user: User = Depends(get_current_user)):
    """Seed default extras into DB if not present (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    created = 0
    for extra in EXTRA_SERVICES:
        existing = await db.services.find_one({"name": extra["name"], "service_type": "extra"})
        if not existing:
            service = Service(
                name=extra["name"],
                category=extra.get("category", "extra_kulso"),
                price=extra.get("price", extra.get("min_price", 0)),
                min_price=extra.get("min_price"),
                duration=30,
                description=extra.get("description", ""),
                service_type="extra",
                active=True
            )
            doc = service.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.services.insert_one(doc)
            created += 1
    return {"created": created, "message": f"{created} alapértelmezett extra hozzáadva az adatbázishoz"}


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


# ============== Extras CRUD ==============

class ExtraCreate(BaseModel):
    name: str
    category: str = "extra_kulso"
    price: Optional[float] = None
    min_price: Optional[float] = None
    description: Optional[str] = None
    location: Optional[str] = None

class ExtraUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    min_price: Optional[float] = None
    description: Optional[str] = None
    location: Optional[str] = None
    active: Optional[bool] = None

@router.get("/services/extras/admin")
async def get_extras_admin(location: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all extras for admin (including inactive)"""
    query = {"service_type": "extra"}
    if location:
        query["location"] = location
    extras = await db.services.find(query, {"_id": 0}).to_list(100)
    return extras

@router.post("/services/extras")
async def create_extra(data: ExtraCreate, user: User = Depends(get_current_user)):
    """Create a new extra service"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    service = Service(
        name=data.name,
        category=data.category,
        price=data.price or data.min_price or 0,
        min_price=data.min_price,
        duration=30,
        description=data.description,
        service_type="extra",
        location=data.location,
        active=True
    )
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/services/extras/{service_id}")
async def update_extra(service_id: str, data: ExtraUpdate, user: User = Depends(get_current_user)):
    """Update an extra service"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nincs frissítendő adat")
    
    result = await db.services.update_one(
        {"service_id": service_id, "service_type": "extra"},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Extra szolgáltatás nem található")
    return {"message": "Extra szolgáltatás frissítve"}

@router.delete("/services/extras/{service_id}")
async def delete_extra(service_id: str, user: User = Depends(get_current_user)):
    """Delete an extra service"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    
    result = await db.services.delete_one({"service_id": service_id, "service_type": "extra"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Extra szolgáltatás nem található")
    return {"message": "Extra szolgáltatás törölve"}

# ============== Locations ==============

LOCATIONS = [
    {"id": "Debrecen", "name": "Debrecen", "active": True},
    {"id": "Budapest", "name": "Budapest", "active": True}
]

@router.get("/services/locations")
async def get_locations():
    """Get available locations (public)"""
    return LOCATIONS


@router.get("/services/polishing-prices")
async def get_polishing_prices():
    """Get current polishing prices (falls back to defaults)"""
    saved = await db.settings.find_one({"key": "polishing_prices"}, {"_id": 0})
    if saved and "prices" in saved:
        return saved["prices"]
    from models.service import POLISHING_PRICES
    return {k: v["prices"] for k, v in POLISHING_PRICES.items()}

@router.post("/services/polishing-prices")
async def save_polishing_prices(prices: dict, user: User = Depends(get_current_user)):
    """Save custom polishing prices to DB settings"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin jogosultság szükséges")
    await db.settings.update_one(
        {"key": "polishing_prices"},
        {"$set": {"key": "polishing_prices", "prices": prices}},
        upsert=True
    )
    return {"message": "Polírozási árak mentve"}
