from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class CreditLogBase(BaseModel):
    amount: int
    document_id: Optional[int] = None
    description: str


class CreditLogCreate(CreditLogBase):
    user_id: int


class CreditLogInDBBase(CreditLogBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        orm_mode = True


class CreditLog(CreditLogInDBBase):
    pass
