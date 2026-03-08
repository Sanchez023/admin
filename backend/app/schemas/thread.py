"""
Thread Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# Thread Schemas
class ThreadBase(BaseModel):
    title: str
    model_instance_id: Optional[int] = None
    metadata: Optional[dict] = None


class ThreadCreate(ThreadBase):
    pass


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    model_instance_id: Optional[int] = None
    metadata: Optional[dict] = None


class ThreadResponse(ThreadBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ThreadListResponse(BaseModel):
    threads: List[ThreadResponse]
    total: int


# Message Schemas
class MessageBase(BaseModel):
    role: str  # user, assistant, system
    content: str
    metadata: Optional[dict] = None


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: int
    thread_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
