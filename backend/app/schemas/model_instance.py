"""
Model Instance Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ModelInstanceBase(BaseModel):
    name: str
    display_name: Optional[str] = None
    provider_id: int
    api_key_id: Optional[int] = None

    supports_vision: bool = False
    supports_image_generation: bool = False
    supports_reasoning: bool = False
    config: Optional[dict] = None


class ModelInstanceCreate(ModelInstanceBase):
    pass


class ModelInstanceUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    provider_id: Optional[int] = None
    api_key_id: Optional[int] = None
    supports_vision: Optional[bool] = None
    supports_image_generation: Optional[bool] = None
    supports_reasoning: Optional[bool] = None
    config: Optional[dict] = None
    is_enabled: Optional[bool] = None


class ModelInstanceResponse(ModelInstanceBase):
    id: int
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelInstanceListResponse(BaseModel):
    models: List[ModelInstanceResponse]
    total: int


# Test connection request/response
class TestConnectionRequest(BaseModel):
    provider_id: int
    api_key_id: Optional[int] = None
    model_name: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
