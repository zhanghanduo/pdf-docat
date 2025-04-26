from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import LoggingMiddleware
from app.database import Base, engine
from app.services import api_key_service

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize API key pools
api_key_service.initialize_api_key_pools()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set up CORS - use default origins if none are specified
cors_origins = settings.BACKEND_CORS_ORIGINS or ["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return JSONResponse(
        content={
            "message": "Welcome to PDF-Docat API",
            "docs": f"/docs",
            "version": "1.0.0",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
