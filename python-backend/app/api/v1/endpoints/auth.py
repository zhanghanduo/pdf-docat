from datetime import timedelta, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.security import create_access_token
from app.core.logging import log_user_action
from app.services import user_service
from app.schemas.auth import Token, LoginResponse
from app.schemas.user import UserCreate, User

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Standard authentication for regular users
    user = user_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive, please contact an administrator",
        )
    
    # Update last active timestamp
    user_service.update_user_last_active(db, user.id)
    
    # Log user login
    log_user_action(db, user.id, "User logged in")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        user.id, user.email, user.role, expires_delta=access_token_expires
    )
    
    return {
        "token": token,
        "user": user
    }


@router.post("/register", response_model=LoginResponse)
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Register a new user
    """
    # Check if email already exists
    user = user_service.get_user_by_email(db, user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    
    # Create new user
    user = user_service.create_user(db, user_in)
    
    # Log user registration
    log_user_action(db, user.id, "User registered")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        user.id, user.email, user.role, expires_delta=access_token_expires
    )
    
    return {
        "token": token,
        "user": user
    }
