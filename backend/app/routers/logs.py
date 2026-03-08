"""
Logs Router - System Log Management
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.user import User
from app.models.log import SystemLog
from app.dependencies import get_current_user
from app.utils.responses import api_response, error_response

router = APIRouter()


@router.get("", response_model=dict)
async def list_system_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    level: Optional[str] = Query(None, description="Filter by log level"),
    module: Optional[str] = Query(None, description="Filter by module"),
    keyword: Optional[str] = Query(None, description="Search in message"),
    start_time: Optional[str] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[str] = Query(None, description="End time (ISO format)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get system logs with filtering and pagination
    """
    query = select(SystemLog)

    # Apply filters
    if level:
        query = query.where(SystemLog.level == level.upper())

    if module:
        query = query.where(SystemLog.module == module)

    if keyword:
        query = query.where(SystemLog.message.contains(keyword))

    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time)
            query = query.where(SystemLog.created_at >= start_dt)
        except ValueError:
            pass

    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time)
            query = query.where(SystemLog.created_at <= end_dt)
        except ValueError:
            pass

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate and order by time descending
    offset = (page - 1) * page_size
    query = query.order_by(desc(SystemLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return api_response(
        data={
            "logs": [
                {
                    "id": log.id,
                    "level": log.level,
                    "module": log.module,
                    "message": log.message,
                    "details": log.details,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{log_id}", response_model=dict)
async def get_system_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific system log by ID
    """
    result = await db.execute(
        select(SystemLog).where(SystemLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        return error_response(message="Log not found", code=404)

    return api_response(
        data={
            "id": log.id,
            "level": log.level,
            "module": log.module,
            "message": log.message,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
    )


@router.get("/modules/list", response_model=dict)
async def list_modules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of unique modules that have logs
    """
    result = await db.execute(
        select(SystemLog.module).distinct()
    )
    modules = result.scalars().all()

    return api_response(
        data={"modules": list(modules)}
    )


@router.get("/levels/list", response_model=dict)
async def list_levels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of available log levels
    """
    return api_response(
        data={"levels": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]}
    )


@router.post("", response_model=dict)
async def create_log(
    level: str = Query(..., description="Log level"),
    module: str = Query(..., description="Module name"),
    message: str = Query(..., description="Log message"),
    details: Optional[str] = Query(None, description="Additional details"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a system log entry (for internal use)
    """
    # Validate level
    valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    if level.upper() not in valid_levels:
        return error_response(message="Invalid log level", code=400)

    new_log = SystemLog(
        level=level.upper(),
        module=module,
        message=message,
        details=details,
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)

    return api_response(
        data={
            "id": new_log.id,
            "level": new_log.level,
            "module": new_log.module,
            "message": new_log.message,
        },
        message="Log created",
        code=201,
    )


@router.delete("/cleanup", response_model=dict)
async def cleanup_old_logs(
    days: int = Query(30, ge=1, le=365, description="Delete logs older than this many days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clean up logs older than specified days (admin only)
    """
    from datetime import timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Delete old logs
    result = await db.execute(
        SystemLog.__table__.delete().where(SystemLog.created_at < cutoff_date)
    )
    await db.commit()

    deleted_count = result.rowcount

    return api_response(
        data={"deleted_count": deleted_count},
        message=f"Deleted {deleted_count} logs older than {days} days"
    )
