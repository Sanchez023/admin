"""
API Authorization Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class APIAuthListBase(BaseModel):
    user_id: Optional[int] = None
    user_group_id: Optional[int] = None
    authorized_models: Optional[List[int]] = None
    authorized_mcps: Optional[List[int]] = None
    authorized_skills: Optional[List[int]] = None


class APIAuthListCreate(APIAuthListBase):
    api_endpoint: str


class APIAuthListUpdate(BaseModel):
    user_id: Optional[int] = None
    user_group_id: Optional[int] = None
    authorized_models: Optional[List[int]] = None
    authorized_mcps: Optional[List[int]] = None
    authorized_skills: Optional[List[int]] = None
    api_endpoint: Optional[str] = None


class APIAuthListResponse(APIAuthListBase):
    id: int
    api_token: str
    api_endpoint: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class APIAuthListListResponse(BaseModel):
    auth_lists: List[APIAuthListResponse]
    total: int
