from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from models.review import Review, ReviewCreate
from services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.get("/{bathroom_id}")
async def get_reviews_by_bathroom(
    bathroom_id: int,
    limit: int = Query(10, description="Maximum number of reviews to return")
):
    """Get reviews for a bathroom."""
    try:
        reviews = await ReviewService.get_reviews_by_bathroom(bathroom_id, limit)
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", status_code=201)
async def create_review(review: ReviewCreate):
    """Create a new review."""
    try:
        created_review = await ReviewService.create_review(review)
        return created_review
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
