from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=True, index=True)
    engine = Column(String, nullable=False)
    status = Column(String, nullable=False)
    processing_time = Column(Integer, nullable=True)
    extracted_content = Column(JSON, nullable=True)
    file_annotations = Column(JSON, nullable=True)
    credits_used = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="processing_logs")
