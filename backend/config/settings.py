import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Settings
API_PREFIX = "/api"
API_TITLE = "SafeRoute API"
API_VERSION = "1.0.0"

# Refuge Restrooms API
REFUGE_RESTROOMS_API_BASE_URL = "https://www.refugerestrooms.org/api/v1/restrooms"

# Default location (Boston, MA)
DEFAULT_LATITUDE = 42.3601
DEFAULT_LONGITUDE = -71.0589

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
