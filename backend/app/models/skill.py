"""
Skill Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Skill(Base):
    """Skill model"""
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Skill configuration
    skill_type: Mapped[str] = mapped_column(String(50), nullable=False)  # prompt, function, etc.
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Prompt or function definition
    config: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # Additional configuration

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
