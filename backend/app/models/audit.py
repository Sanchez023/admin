"""
Audit Log Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditLog(Base):
    """Audit log model"""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    user_group_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("user_groups.id"), nullable=True)

    action: Mapped[str] = mapped_column(String(50), nullable=False)  # create, update, delete
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user, provider, model, mcp, skill
    resource_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User")
    user_group: Mapped[Optional["UserGroup"]] = relationship("UserGroup")


# Import at bottom to avoid circular imports
from app.models.user import User
from app.models.role import UserGroup
