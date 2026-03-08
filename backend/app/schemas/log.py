"""
Log Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SystemLogResponse(BaseModel):
    id: int
    level: str
    module: str
    message: str
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemLogListResponse(BaseModel):
    logs: List[SystemLogResponse]
    total: int


class SystemLogQuery(BaseModel):
    level: Optional[str] = None
    module: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = 1
    page_size: int = 50
