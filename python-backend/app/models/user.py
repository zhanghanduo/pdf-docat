from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.core.config import settings


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="user")
    tier = Column(String, nullable=False, default=settings.USER_TIERS["FREE"])
    credits_used = Column(Integer, nullable=False, default=0)
    credits_limit = Column(Integer, nullable=False, default=settings.TIER_CREDITS["free"])
    is_active = Column(Boolean, nullable=False, default=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    processing_logs = relationship("ProcessingLog", back_populates="user")
    credit_logs = relationship("CreditLog", back_populates="user")
