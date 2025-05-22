from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.core.config import settings


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        password=hashed_password,
        name=user_in.name,
        role=user_in.role or "user",
        tier=user_in.tier or settings.USER_TIERS["FREE"],
        credits_used=user_in.credits_used or 0,
        credits_limit=user_in.credits_limit or settings.TIER_CREDITS["free"],
        is_active=user_in.is_active if user_in.is_active is not None else True,
        last_active=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.dict(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        update_data["password"] = get_password_hash(update_data["password"])
    
    if "tier" in update_data and update_data["tier"]:
        # Update credit limit based on tier
        tier = update_data["tier"]
        if tier in settings.TIER_CREDITS:
            update_data["credits_limit"] = settings.TIER_CREDITS[tier]
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    
    db.delete(user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    print(f"Attempting login with email/username: {email}")
    user = get_user_by_email(db, email)
    if not user:
        print(f"User not found with email/username: {email}")
        return None
    if not verify_password(password, user.password):
        print(f"Password verification failed for user: {email}")
        return None
    print(f"Authentication successful for user: {email}")
    return user


def update_user_last_active(db: Session, user_id: int) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    
    user.last_active = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_tier(db: Session, user_id: int, tier: str) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    
    if tier not in settings.TIER_CREDITS:
        return None
    
    user.tier = tier
    user.credits_limit = settings.TIER_CREDITS[tier]
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
