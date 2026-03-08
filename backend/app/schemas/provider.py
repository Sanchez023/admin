"""
Provider Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# Model Provider Schemas
class ProviderBase(BaseModel):
    name: str
    name_cn: str
    api_base_url: Optional[str] = None
    provider_type: Optional[str] = None


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    name_cn: Optional[str] = None
    api_base_url: Optional[str] = None
    provider_type: Optional[str] = None
    is_enabled: Optional[bool] = None


class ProviderResponse(ProviderBase):
    id: int
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProviderListResponse(BaseModel):
    providers: List[ProviderResponse]
    total: int


# Provider API Key Schemas
class APIKeyBase(BaseModel):
    name: str
    api_key: str


class APIKeyCreate(APIKeyBase):
    provider_id: int


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    is_enabled: Optional[bool] = None


class APIKeyResponse(BaseModel):
    id: int
    provider_id: int
    name: str
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class APIKeyListResponse(BaseModel):
    api_keys: List[APIKeyResponse]
    total: int
