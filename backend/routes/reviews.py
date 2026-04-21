"""
Reviews Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from dependencies import get_current_user
from database import db
from models.user import User
from models.review import Review, ReviewCreate

router = APIRouter()


@router.get("/reviews")
async def get_reviews():
    """Get approved reviews (public, no auth)"""
    reviews = await db.reviews.find(
        {"approved": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return reviews


@router.post("/reviews")
async def submit_review(data: ReviewCreate):
    """Submit a review via token (public, no auth)"""
    # Validate rating range
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Az értékelésnek 1 és 5 között kell lennie")

    # Find booking by review_token
    booking = await db.bookings.find_one({"review_token": data.review_token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Érvénytelen értékelési link")

    # Validate booking status
    if booking.get("status") != "kesz":
        raise HTTPException(status_code=400, detail="Ez a foglalás még nem teljesített")

    # Check for duplicate review (also check if token already consumed)
    existing_review = await db.reviews.find_one({"booking_id": booking["booking_id"]})
    if existing_review:
        raise HTTPException(status_code=400, detail="Ehhez a foglaláshoz már érkezett értékelés")
    if booking.get("review_token_used"):
        raise HTTPException(status_code=400, detail="Ez az értékelési link már fel lett használva")

    # Create review document
    review = Review(
        booking_id=booking["booking_id"],
        review_token=data.review_token,
        rating=data.rating,
        comment=data.comment,
        customer_name=booking.get("customer_name", ""),
        service_name=booking.get("service_name", ""),
        location=booking.get("location"),
    )
    doc = review.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.reviews.insert_one(doc)
    del doc["_id"]

    # Mark review token as consumed so it cannot be reused
    await db.bookings.update_one(
        {"booking_id": booking["booking_id"]},
        {"$set": {"review_token_used": True}}
    )

    return doc


@router.get("/reviews/admin")
async def get_all_reviews_admin(user: User = Depends(get_current_user)):
    """Get all reviews for admin (auth required)"""
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reviews


@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: User = Depends(get_current_user)):
    """Delete a review (auth required)"""
    result = await db.reviews.delete_one({"review_id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Értékelés nem található")
    return {"message": "Értékelés törölve"}
