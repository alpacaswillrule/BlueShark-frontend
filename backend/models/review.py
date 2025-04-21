from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    bathroom_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    directions: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    created_at: datetime
    user_id: Optional[str] = None

    class Config:
        orm_mode = True
