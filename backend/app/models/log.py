"""
System Log Model
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemLog(Base):
    """System log model"""
    __tablename__ = "system_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    module: Mapped[str] = mapped_column(String(100), nullable=False)  # Module name
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
