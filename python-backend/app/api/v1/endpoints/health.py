from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.database import engine
from app.core.logging import logger

router = APIRouter()


@router.get("/")
def health_check() -> Any:
    """
    Simple health check endpoint for the API
    """
    return {"status": "ok", "service": "PDF-Docat API"}


@router.get("/db")
def db_health_check(db: Session = Depends(deps.get_db)) -> Any:
    """
    Database connection health check
    """
    try:
        # Execute a simple query to check if the database connection is alive
        result = db.execute("SELECT 1").scalar()
        if result == 1:
            return {"status": "ok", "message": "Database connection is working"}
        else:
            logger.error("Database health check failed: unexpected result")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database health check failed",
            )
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database health check failed: {str(e)}",
        )