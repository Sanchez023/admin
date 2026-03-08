"""
MCP Server Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MCPServer(Base):
    """MCP Server model"""
    __tablename__ = "mcp_servers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # MCP server configuration
    server_type: Mapped[str] = mapped_column(String(50), nullable=False)  # stdio, sse, etc.
    command: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # For stdio type
    args: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # Command arguments
    env: Mapped[Optional[str]] = mapped_column(JSON, default=None)  # Environment variables
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # For SSE type

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
