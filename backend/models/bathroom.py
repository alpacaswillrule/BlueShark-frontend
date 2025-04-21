from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class BathroomBase(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    is_unisex: Optional[bool] = False
    is_accessible: Optional[bool] = False
    has_changing_table: Optional[bool] = False
    directions: Optional[str] = None
    comment: Optional[str] = None

class BathroomCreate(BathroomBase):
    external_id: Optional[str] = None
    external_source: Optional[str] = None

class BathroomUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_unisex: Optional[bool] = None
    is_accessible: Optional[bool] = None
    has_changing_table: Optional[bool] = None
    directions: Optional[str] = None
    comment: Optional[str] = None

class Bathroom(BathroomBase):
    id: int
    average_rating: float = 0
    total_ratings: int = 0
    external_id: Optional[str] = None
    external_source: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
