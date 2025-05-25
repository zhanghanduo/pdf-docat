from fastapi import APIRouter, File, Form, UploadFile, Depends
from typing import Any
from sqlalchemy.orm import Session

from app.api.v1.endpoints import auth, users, pdf, credits, settings, health, account, languages, async_pdf
from app.api import deps
from app.models.user import User

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pdf.router, prefix="/pdf", tags=["pdf"])
api_router.include_router(async_pdf.router, prefix="/async", tags=["async-processing"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(languages.router, prefix="/supported-languages", tags=["languages"])

# Root endpoint for health check at the api/v1 level
@api_router.get("/", tags=["health"])
def api_root_health():
    """
    API root health check
    """
    return {"status": "ok", "service": "PDF-Docat API"}

# Add direct translate endpoint for compatibility
@api_router.post("/translate", tags=["pdf"])
async def translate_pdf_direct(
    file: UploadFile = File(...),
    source_lang: str = Form("en"),
    target_lang: str = Form("zh"),
    dual: bool = Form(False),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Direct translation endpoint at API root level
    """
    # Import here to avoid circular imports
    from app.api.v1.endpoints.pdf import translate_pdf
    
    # Call the PDF translate function
    return await translate_pdf(
        db=db,
        file=file,
        source_lang=source_lang,
        target_lang=target_lang,
        dual=dual,
        current_user=current_user
    )
