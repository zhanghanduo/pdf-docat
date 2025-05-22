from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.schemas.auth import TokenPayload


# Reuse the security dependencies
def get_db_with_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Generator:
    """
    Get DB session with current user
    """
    try:
        yield db
    finally:
        pass
