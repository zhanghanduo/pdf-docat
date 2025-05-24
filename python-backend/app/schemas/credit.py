from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CreditLogBase(BaseModel):
    amount: int
    document_id: Optional[int] = None
    description: str


class CreditLogCreate(CreditLogBase):
    user_id: int


class CreditLogInDBBase(CreditLogBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    timestamp: datetime


class CreditLog(CreditLogInDBBase):
    pass
