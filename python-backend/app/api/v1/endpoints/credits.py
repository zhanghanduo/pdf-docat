from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.services import credit_service
from app.models.user import User
from app.schemas.credit import CreditLog
from app.schemas.user import UserCredits

router = APIRouter()


@router.get("/", response_model=UserCredits)
def read_credits(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's credits.
    """
    credits = credit_service.get_user_credits(db, current_user.id)
    return credits


@router.get("/logs", response_model=List[CreditLog])
def read_credit_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 10,
    offset: int = 0,
) -> Any:
    """
    Get current user's credit logs.
    """
    logs = credit_service.get_credit_logs(db, current_user.id, limit, offset)
    return logs


@router.get("/user/{user_id}", response_model=UserCredits)
def read_user_credits(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get a specific user's credits. Admin only.
    """
    credits = credit_service.get_user_credits(db, user_id)
    return credits


@router.get("/user/{user_id}/logs", response_model=List[CreditLog])
def read_user_credit_logs(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get a specific user's credit logs. Admin only.
    """
    logs = credit_service.get_credit_logs(db, user_id, limit, offset)
    return logs
