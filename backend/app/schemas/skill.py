"""
Skill Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SkillBase(BaseModel):
    name: str
    description: Optional[str] = None
    skill_type: str  # prompt, function
    content: Optional[str] = None
    config: Optional[dict] = None


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    skill_type: Optional[str] = None
    content: Optional[str] = None
    config: Optional[dict] = None
    is_enabled: Optional[bool] = None


class SkillResponse(SkillBase):
    id: int
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillListResponse(BaseModel):
    skills: List[SkillResponse]
    total: int
