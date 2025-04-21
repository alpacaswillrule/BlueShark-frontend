import os
import logging
import asyncio
from typing import List, Dict, Any
import sys

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import supabase
from config.settings import DEFAULT_LATITUDE, DEFAULT_LONGITUDE
from services.external_api import get_refuge_restrooms, transform_refuge_restroom
from models.bathroom import BathroomCreate

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def transform_and_store_bathrooms(restrooms: List[Dict[str, Any]]) -> None:
    """
    Transform restroom data and store it in Supabase.
    
    Args:
        restrooms: List of restroom data from Refuge Restrooms API
    """
    bathrooms_to_insert = []
    
    for item in restrooms:
        # Transform the restroom data
        bathroom_data = transform_refuge_restroom(item)
        bathrooms_to_insert.append(bathroom_data)
    
    # Insert bathrooms in batches to avoid hitting API limits
    batch_size = 100
    for i in range(0, len(bathrooms_to_insert), batch_size):
        batch = bathrooms_to_insert[i:i+batch_size]
        
        try:
            # Use upsert to update existing bathrooms or insert new ones
            response = supabase.table('bathrooms').upsert(
                batch, 
                on_conflict='external_id, external_source'
            ).execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error upserting bathrooms: {response.error}")
            else:
                logger.info(f"Successfully upserted {len(batch)} bathrooms")
        
        except Exception as e:
            logger.error(f"Error upserting bathrooms: {e}")

async def main():
    """Main function to fetch and store bathroom data."""
    try:
        # Use a default location (e.g., Boston, MA) for initial data load
        default_lat = DEFAULT_LATITUDE
        default_lng = DEFAULT_LONGITUDE
        
        logger.info("Starting bathroom data ingestion")
        
        # Fetch restrooms from Refuge Restrooms API
        restrooms = await get_refuge_restrooms(default_lat, default_lng, per_page=100, max_results=1000)
        
        if restrooms:
            # Transform and store bathrooms
            await transform_and_store_bathrooms(restrooms)
            logger.info(f"Successfully processed {len(restrooms)} restrooms")
        else:
            logger.warning("No restrooms fetched from Refuge Restrooms API")
        
        logger.info("Bathroom data ingestion completed")
    
    except Exception as e:
        logger.error(f"Error in bathroom data ingestion: {e}")

if __name__ == "__main__":
    asyncio.run(main())
