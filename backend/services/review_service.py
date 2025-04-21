from typing import List, Dict, Any
from config.database import supabase
from models.review import ReviewCreate

class ReviewService:
    @staticmethod
    async def get_reviews_by_bathroom(bathroom_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get reviews for a bathroom."""
        response = supabase.table('reviews') \
            .select('*') \
            .eq('bathroom_id', bathroom_id) \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error fetching reviews: {response.error}")
            
        return response.data

    @staticmethod
    async def create_review(review: ReviewCreate) -> Dict[str, Any]:
        """Create a new review."""
        response = supabase.table('reviews').insert(review.dict()).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error creating review: {response.error}")
            
        return response.data[0]
