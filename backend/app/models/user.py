"""
User Model
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """User model"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id"), nullable=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, default=None)  # JSON dict for permissions

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    role: Mapped[Optional["Role"]] = relationship("Role", back_populates="users")
    user_groups: Mapped[List["UserGroup"]] = relationship(
        "UserGroup",
        secondary="user_group_members",
        back_populates="users",
    )
    login_records: Mapped[List["LoginRecord"]] = relationship("LoginRecord", back_populates="user")


class LoginRecord(Base):
    """Login record model"""
    __tablename__ = "login_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    login_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="login_records")
