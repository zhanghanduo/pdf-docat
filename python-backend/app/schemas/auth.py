from typing import Optional
from pydantic import BaseModel

from app.schemas.user import User


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: User
