"""
Role and User Group Models
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Association table for user-user_group many-to-many relationship
user_group_members = Table(
    "user_group_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("user_group_id", Integer, ForeignKey("user_groups.id"), primary_key=True),
)


class Role(Base):
    """Role model"""
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, default=None)  # JSON dict for permissions

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="role")


class UserGroup(Base):
    """User Group model"""
    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, default=None)  # JSON dict for permissions

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        secondary=user_group_members,
        back_populates="user_groups",
    )
    api_auth_lists: Mapped[List["APIAuthList"]] = relationship("APIAuthList", back_populates="user_group")
