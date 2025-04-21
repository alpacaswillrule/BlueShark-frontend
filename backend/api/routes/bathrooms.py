from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from models.bathroom import Bathroom, BathroomCreate, BathroomUpdate
from services.bathroom_service import BathroomService

router = APIRouter(prefix="/bathrooms", tags=["bathrooms"])

@router.get("/")
async def get_bathrooms_by_location(
    latitude: float = Query(..., description="User's latitude"),
    longitude: float = Query(..., description="User's longitude"),
    radius: float = Query(5.0, description="Search radius in kilometers"),
    limit: int = Query(50, description="Maximum number of results to return"),
    rating_min: Optional[float] = Query(None, description="Minimum rating filter"),
    is_unisex: Optional[bool] = Query(None, description="Filter for unisex bathrooms"),
    is_accessible: Optional[bool] = Query(None, description="Filter for accessible bathrooms"),
    has_changing_table: Optional[bool] = Query(None, description="Filter for bathrooms with changing tables")
):
    """Get bathrooms within a radius of the user's location."""
    try:
        bathrooms = await BathroomService.get_bathrooms_by_location(
            latitude=latitude,
            longitude=longitude,
            radius=radius,
            limit=limit,
            rating_min=rating_min,
            is_unisex=is_unisex,
            is_accessible=is_accessible,
            has_changing_table=has_changing_table
        )
        return bathrooms
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{bathroom_id}")
async def get_bathroom(bathroom_id: int):
    """Get a bathroom by ID."""
    try:
        bathroom = await BathroomService.get_bathroom(bathroom_id)
        return bathroom
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", status_code=201)
async def create_bathroom(bathroom: BathroomCreate):
    """Create a new bathroom."""
    try:
        created_bathroom = await BathroomService.create_bathroom(bathroom)
        return created_bathroom
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{bathroom_id}")
async def update_bathroom(bathroom_id: int, bathroom: BathroomUpdate):
    """Update a bathroom."""
    try:
        updated_bathroom = await BathroomService.update_bathroom(bathroom_id, bathroom)
        return updated_bathroom
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bathroom_id}", status_code=204)
async def delete_bathroom(bathroom_id: int):
    """Delete a bathroom."""
    try:
        await BathroomService.delete_bathroom(bathroom_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
