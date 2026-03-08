"""
Auth Schemas
"""
from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(BaseModel):
    user_id: int
    username: str
    role: Optional[str] = None
    token: TokenResponse
