"""
MCP Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class MCPServerBase(BaseModel):
    name: str
    description: Optional[str] = None
    server_type: str  # stdio, sse
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    url: Optional[str] = None


class MCPServerCreate(MCPServerBase):
    pass


class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    server_type: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    url: Optional[str] = None
    is_enabled: Optional[bool] = None


class MCPServerResponse(MCPServerBase):
    id: int
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MCPServerListResponse(BaseModel):
    servers: List[MCPServerResponse]
    total: int
