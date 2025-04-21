from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import API routes
from api.routes import bathrooms, reviews
from config.settings import API_TITLE, API_VERSION, API_PREFIX

# Initialize FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION
)

# Enable CORS for all routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(bathrooms.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)

@app.get("/")
async def root():
    return {
        "message": "Welcome to SafeRoute API",
        "version": API_VERSION,
        "endpoints": {
            "bathrooms": f"{API_PREFIX}/bathrooms",
            "reviews": f"{API_PREFIX}/reviews"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
