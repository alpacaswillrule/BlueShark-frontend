import logging
import requests
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from config.settings import REFUGE_RESTROOMS_API_BASE_URL

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def get_refuge_restrooms(lat: float, lng: float, page: int = 1, per_page: int = 100, 
                              max_results: int = 1000, ada: Optional[bool] = None, 
                              unisex: Optional[bool] = None) -> List[Dict[str, Any]]:
    """
    Fetch restroom data from Refuge Restrooms API.
    
    Args:
        lat: Latitude
        lng: Longitude
        page: Starting page number for pagination
        per_page: Number of results per page
        max_results: Maximum number of results to fetch (will make multiple API calls if needed)
        ada: Filter for ADA accessible restrooms
        unisex: Filter for unisex restrooms
        
    Returns:
        List of restroom locations
    """
    # Prepare base parameters
    base_params = {
        "lat": lat,
        "lng": lng,
        "per_page": per_page
    }
    
    # Add optional filters if provided
    if ada is not None:
        base_params["ada"] = "true" if ada else "false"
    if unisex is not None:
        base_params["unisex"] = "true" if unisex else "false"
    
    # Fetch data with multiple API calls if needed
    all_data = []
    current_page = page
    max_pages = (max_results + per_page - 1) // per_page  # Ceiling division
    
    try:
        while len(all_data) < max_results:
            # Update page parameter
            params = base_params.copy()
            params["page"] = current_page
            
            logger.info(f"Fetching data from Refuge Restrooms API with params: {params} (Page {current_page}/{max_pages})")
            response = requests.get(f"{REFUGE_RESTROOMS_API_BASE_URL}/by_location.json", params=params)
            response.raise_for_status()
            
            page_data = response.json()
            
            logger.info(f"Received {len(page_data)} restrooms from Refuge Restrooms API (page {current_page})")
            
            # If we got an empty response or fewer items than requested, we've reached the end
            if not page_data or len(page_data) < per_page:
                all_data.extend(page_data)
                break
                
            all_data.extend(page_data)
            current_page += 1
            
            # If we've fetched enough pages or reached the max_pages limit, stop
            if len(all_data) >= max_results or current_page > max_pages:
                break
                
            # Add a small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        
        # Trim to max_results if we got more
        if len(all_data) > max_results:
            all_data = all_data[:max_results]
            
        logger.info(f"Total restrooms fetched: {len(all_data)}")
        
        return all_data
    
    except requests.RequestException as e:
        logger.error(f"Error fetching data from Refuge Restrooms API: {e}")
        return []

def transform_refuge_restroom(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform a restroom item from Refuge Restrooms API to our application's format.
    
    Args:
        item: Restroom item from Refuge Restrooms API
        
    Returns:
        Transformed restroom item
    """
    # Handle potential None values in address fields
    street = item.get("street", "") or ""
    city = item.get("city", "") or ""
    state = item.get("state", "") or ""
    
    # Construct address with proper handling of None values
    address_parts = []
    if street:
        address_parts.append(street)
    if city:
        address_parts.append(city)
    if state:
        address_parts.append(state)
    
    address = ", ".join(address_parts) if address_parts else "Unknown Address"
    
    return {
        "name": item.get("name", "Unknown Restroom"),
        "address": address,
        "latitude": float(item.get("latitude", 0)),
        "longitude": float(item.get("longitude", 0)),
        "is_unisex": item.get("unisex", False),
        "is_accessible": item.get("accessible", False),
        "has_changing_table": item.get("changing_table", False),
        "directions": item.get("directions", ""),
        "comment": item.get("comment", ""),
        "external_id": str(item.get("id", "")),
        "external_source": "refuge_restrooms"
    }
