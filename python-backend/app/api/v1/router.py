from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, pdf, credits, settings

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pdf.router, prefix="/pdf", tags=["pdf"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
