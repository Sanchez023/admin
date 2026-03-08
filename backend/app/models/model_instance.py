"""
Model Instance Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ModelInstance(Base):
    """LLM Model Instance model"""
    __tablename__ = "llm_model_instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # Model name (e.g., gpt-4)
    display_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Display name
    provider_id: Mapped[int] = mapped_column(Integer, ForeignKey("model_providers.id"), nullable=False)
    api_key_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("model_provider_api_keys.id"), nullable=True)

    # Model capabilities
    supports_vision: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_image_generation: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_reasoning: Mapped[bool] = mapped_column(Boolean, default=False)

    # Fine-tuning parameters (stored as JSON)
    config: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # temperature, top_p, etc.

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    provider: Mapped["ModelProvider"] = relationship("ModelProvider", back_populates="model_instances")
    api_key: Mapped[Optional["ProviderAPIKey"]] = relationship("ProviderAPIKey", back_populates="model_instances")
