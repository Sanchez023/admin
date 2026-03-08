"""
Audit Log Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_group_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int


class AuditLogQuery(BaseModel):
    user_id: Optional[int] = None
    user_group_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = 1
    page_size: int = 50
