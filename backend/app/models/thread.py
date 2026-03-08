"""
Thread (Conversation) Model
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Thread(Base):
    """Thread (conversation) model"""
    __tablename__ = "threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    # Metadata
    model_instance_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("llm_model_instances.id"), nullable=True)
    metadata: Mapped[Optional[str]] = mapped_column(JSON, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
    )


class Message(Base):
    """Message model"""
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(Integer, ForeignKey("threads.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata: Mapped[Optional[str]] = mapped_column(JSON, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")
