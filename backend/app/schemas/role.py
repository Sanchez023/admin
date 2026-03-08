"""
Role Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# Role Schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permissions: Optional[dict] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[dict] = None


class RoleResponse(RoleBase):
    id: int
    permissions: Optional[dict] = None
    created_at: datetime
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)


class RoleListResponse(BaseModel):
    roles: List[RoleResponse]
    total: int


# User Group Schemas
class UserGroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class UserGroupCreate(UserGroupBase):
    permissions: Optional[dict] = None


class UserGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[dict] = None


class UserGroupResponse(UserGroupBase):
    id: int
    permissions: Optional[dict] = None
    created_at: datetime
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)


class UserGroupListResponse(BaseModel):
    groups: List[UserGroupResponse]
    total: int
