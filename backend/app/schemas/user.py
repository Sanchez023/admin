"""
User Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# User Schemas
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    permissions: Optional[dict] = None


class UserResponse(UserBase):
    id: int
    role_id: Optional[int] = None
    permissions: Optional[dict] = None
    created_at: datetime
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


# Login Record Schemas
class LoginRecordResponse(BaseModel):
    id: int
    username: str
    login_time: datetime
    success: bool
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
