from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.core.config import settings


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[str] = "user"
    tier: Optional[str] = settings.USER_TIERS["FREE"]
    credits_used: Optional[int] = 0
    credits_limit: Optional[int] = settings.TIER_CREDITS["free"]


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str
    confirm_password: str

    # TODO: Re-implement password validation for Pydantic v2
    # @field_validator('confirm_password')
    # @classmethod
    # def passwords_match(cls, v, info):
    #     if hasattr(info, 'data') and 'password' in info.data and v != info.data['password']:
    #         raise ValueError('Passwords do not match')
    #     return v


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: EmailStr
    role: str
    tier: str
    credits_used: int
    credits_limit: int
    is_active: bool
    last_active: Optional[datetime] = None
    created_at: datetime


# Properties to return to client
class User(UserInDBBase):
    pass


# Properties stored in DB
class UserInDB(UserInDBBase):
    password: str


# Properties for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Properties for user credits
class UserCredits(BaseModel):
    used: int
    limit: int
