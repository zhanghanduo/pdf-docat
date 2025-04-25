from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.services import user_service, credit_service
from app.models.user import User
from app.schemas.user import User as UserSchema

router = APIRouter()


@router.get("/", response_model=dict)
def read_account_info(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's account information including credits.
    This is used by the frontend to get combined user and credit information.
    """
    # Get user data
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "tier": current_user.tier,
        "isActive": current_user.is_active,
        "lastActive": current_user.last_active.isoformat() if current_user.last_active else None,
        "createdAt": current_user.created_at.isoformat(),
    }
    
    # Get credits data
    credits = credit_service.get_user_credits(db, current_user.id)
    
    # Combine data
    account_info = {
        "user": user_data,
        "credits": {
            "used": credits.used,
            "limit": credits.limit,
            "available": credits.limit - credits.used
        }
    }
    
    return account_info