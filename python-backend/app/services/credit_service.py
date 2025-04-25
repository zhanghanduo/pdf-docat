from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.credit_log import CreditLog
from app.core.config import settings


def get_user_credits(db: Session, user_id: int) -> Dict[str, int]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"used": 0, "limit": 0}
    
    return {
        "used": user.credits_used or 0,
        "limit": user.credits_limit or settings.TIER_CREDITS["free"]
    }


def use_credits(
    db: Session, 
    user_id: int, 
    amount: int, 
    document_id: Optional[int] = None, 
    description: Optional[str] = None
) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    
    # Pro users have unlimited credits
    if user.tier == settings.USER_TIERS["PRO"]:
        # Still log the credit usage for tracking
        log_credit_usage(db, user_id, amount, document_id, description or "Document processing")
        return True
    
    # Check if user has enough credits
    if user.credits_used + amount > user.credits_limit:
        return False
    
    # Update user credits
    user.credits_used += amount
    db.add(user)
    
    # Log the credit usage
    log_credit_usage(db, user_id, amount, document_id, description or "Document processing")
    
    db.commit()
    return True


def log_credit_usage(
    db: Session, 
    user_id: int, 
    amount: int, 
    document_id: Optional[int] = None, 
    description: Optional[str] = None
) -> CreditLog:
    credit_log = CreditLog(
        user_id=user_id,
        amount=amount,
        document_id=document_id,
        description=description or "Credit usage"
    )
    
    db.add(credit_log)
    db.commit()
    db.refresh(credit_log)
    return credit_log


def get_credit_logs(
    db: Session, 
    user_id: int, 
    limit: int = 10, 
    offset: int = 0
) -> List[CreditLog]:
    return (
        db.query(CreditLog)
        .filter(CreditLog.user_id == user_id)
        .order_by(CreditLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
