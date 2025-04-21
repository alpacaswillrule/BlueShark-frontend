import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE")

def get_supabase_client() -> Client:
    """Get a Supabase client instance."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase URL and key must be set in environment variables")
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)

supabase = get_supabase_client()
