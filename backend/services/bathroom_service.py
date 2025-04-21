from typing import List, Optional, Dict, Any
from config.database import supabase
from models.bathroom import Bathroom, BathroomCreate, BathroomUpdate

class BathroomService:
    @staticmethod
    async def get_bathrooms_by_location(
        latitude: float, 
        longitude: float, 
        radius: float = 5.0, 
        limit: int = 50,
        rating_min: Optional[float] = None,
        is_unisex: Optional[bool] = None,
        is_accessible: Optional[bool] = None,
        has_changing_table: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Get bathrooms within a radius of a location.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius: Search radius in kilometers
            limit: Maximum number of results to return
            rating_min: Minimum rating filter
            is_unisex: Filter for unisex bathrooms
            is_accessible: Filter for accessible bathrooms
            has_changing_table: Filter for bathrooms with changing tables
            
        Returns:
            List of bathrooms within the radius
        """
        # Log the filter parameters for debugging
        print(f"Fetching bathrooms with filters: rating_min={rating_min}, is_unisex={is_unisex}, is_accessible={is_accessible}, has_changing_table={has_changing_table}")
        
        # First, get bathrooms within the radius using the stored procedure
        response = supabase.rpc('nearby_bathrooms', {
            'lat': latitude,
            'lng': longitude,
            'radius_km': radius,
            'limit_val': limit
        }).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error fetching bathrooms: {response.error}")
        
        # If we have filters, apply them to the results in Python
        # This is a workaround if the RPC doesn't support filtering directly
        bathrooms = response.data
        filtered_bathrooms = bathrooms
        
        # Apply filters if provided
        if rating_min is not None:
            filtered_bathrooms = [b for b in filtered_bathrooms if b.get('average_rating', 0) >= rating_min]
            print(f"After rating_min filter: {len(filtered_bathrooms)} bathrooms")
            
        if is_unisex is not None:
            filtered_bathrooms = [b for b in filtered_bathrooms if b.get('is_unisex') == is_unisex]
            print(f"After is_unisex filter: {len(filtered_bathrooms)} bathrooms")
            
        if is_accessible is not None:
            filtered_bathrooms = [b for b in filtered_bathrooms if b.get('is_accessible') == is_accessible]
            print(f"After is_accessible filter: {len(filtered_bathrooms)} bathrooms")
            
        if has_changing_table is not None:
            filtered_bathrooms = [b for b in filtered_bathrooms if b.get('has_changing_table') == has_changing_table]
            print(f"After has_changing_table filter: {len(filtered_bathrooms)} bathrooms")
        
        print(f"Original bathrooms: {len(bathrooms)}, Filtered bathrooms: {len(filtered_bathrooms)}")
        
        return filtered_bathrooms

    @staticmethod
    async def get_bathroom(bathroom_id: int) -> Dict[str, Any]:
        """Get a bathroom by ID."""
        response = supabase.table('bathrooms').select('*').eq('id', bathroom_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error fetching bathroom: {response.error}")
            
        if not response.data:
            raise ValueError(f"Bathroom with ID {bathroom_id} not found")
            
        return response.data[0]

    @staticmethod
    async def create_bathroom(bathroom: BathroomCreate) -> Dict[str, Any]:
        """Create a new bathroom."""
        response = supabase.table('bathrooms').insert(bathroom.dict()).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error creating bathroom: {response.error}")
            
        return response.data[0]

    @staticmethod
    async def update_bathroom(bathroom_id: int, bathroom: BathroomUpdate) -> Dict[str, Any]:
        """Update a bathroom."""
        # Only include non-None values
        update_data = {k: v for k, v in bathroom.dict().items() if v is not None}
        
        response = supabase.table('bathrooms').update(update_data).eq('id', bathroom_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error updating bathroom: {response.error}")
            
        if not response.data:
            raise ValueError(f"Bathroom with ID {bathroom_id} not found")
            
        return response.data[0]

    @staticmethod
    async def delete_bathroom(bathroom_id: int) -> None:
        """Delete a bathroom."""
        response = supabase.table('bathrooms').delete().eq('id', bathroom_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Error deleting bathroom: {response.error}")
