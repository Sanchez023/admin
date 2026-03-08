"""
Provider and API Key Models
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ModelProvider(Base):
    """Model Provider (LLM vendor) model"""
    __tablename__ = "model_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # English name
    name_cn: Mapped[str] = mapped_column(String(100), nullable=False)  # Chinese name
    api_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    provider_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # openai, anthropic, etc.
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    api_keys: Mapped[List["ProviderAPIKey"]] = relationship(
        "ProviderAPIKey",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    model_instances: Mapped[List["ModelInstance"]] = relationship(
        "ModelInstance",
        back_populates="provider",
        cascade="all, delete-orphan",
    )


class ProviderAPIKey(Base):
    """Provider API Key model"""
    __tablename__ = "model_provider_api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(Integer, ForeignKey("model_providers.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)  # Encrypted
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    provider: Mapped["ModelProvider"] = relationship("ModelProvider", back_populates="api_keys")
    model_instances: Mapped[List["ModelInstance"]] = relationship(
        "ModelInstance",
        back_populates="api_key",
    )
