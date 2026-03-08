"""
API Authorization Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class APIAuthList(Base):
    """API Authorization List model"""
    __tablename__ = "api_auth_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Authorization target
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    user_group_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("user_groups.id"), nullable=True)

    # Authorized resources (stored as JSON arrays)
    authorized_models: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # Model instance IDs
    authorized_mcps: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # MCP server IDs
    authorized_skills: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # Skill IDs

    # API access
    api_token: Mapped[str] = mapped_column(String(500), nullable=False)
    api_endpoint: Mapped[str] = mapped_column(String(200), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    user_group: Mapped[Optional["UserGroup"]] = relationship("UserGroup", back_populates="api_auth_lists")


# Import at bottom to avoid circular imports
from app.models.user import User
from app.models.role import UserGroup
