"""
Audit Router - Audit Log Management
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.models.role import UserGroup
from app.dependencies import get_current_user
from app.utils.responses import api_response, error_response

router = APIRouter()


@router.get("", response_model=dict)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    user_group_id: Optional[int] = Query(None, description="Filter by user group ID"),
    action: Optional[str] = Query(None, description="Filter by action (create, update, delete)"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[int] = Query(None, description="Filter by resource ID"),
    keyword: Optional[str] = Query(None, description="Search in details"),
    start_time: Optional[str] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[str] = Query(None, description="End time (ISO format)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit logs with filtering and pagination
    """
    query = select(AuditLog)

    # Apply filters
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    if user_group_id:
        query = query.where(AuditLog.user_group_id == user_group_id)

    if action:
        query = query.where(AuditLog.action == action)

    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    if resource_id:
        query = query.where(AuditLog.resource_id == resource_id)

    if keyword:
        query = query.where(AuditLog.details.contains(keyword))

    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time)
            query = query.where(AuditLog.created_at >= start_dt)
        except ValueError:
            pass

    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time)
            query = query.where(AuditLog.created_at <= end_dt)
        except ValueError:
            pass

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate and order by time descending
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    # Get user info for each log
    log_list = []
    for log in logs:
        # Get username
        result = await db.execute(
            select(User).where(User.id == log.user_id)
        )
        user = result.scalar_one_or_none()
        username = user.username if user else "Unknown"

        # Get user group name if applicable
        group_name = None
        if log.user_group_id:
            result = await db.execute(
                select(UserGroup).where(UserGroup.id == log.user_group_id)
            )
            group = result.scalar_one_or_none()
            group_name = group.name if group else None

        log_list.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": username,
            "user_group_id": log.user_group_id,
            "user_group_name": group_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return api_response(
        data={
            "logs": log_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{log_id}", response_model=dict)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific audit log by ID
    """
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        return error_response(message="Audit log not found", code=404)

    # Get username
    result = await db.execute(
        select(User).where(User.id == log.user_id)
    )
    user = result.scalar_one_or_none()
    username = user.username if user else "Unknown"

    # Get user group name if applicable
    group_name = None
    if log.user_group_id:
        result = await db.execute(
            select(UserGroup).where(UserGroup.id == log.user_group_id)
        )
        group = result.scalar_one_or_none()
        group_name = group.name if group else None

    return api_response(
        data={
            "id": log.id,
            "user_id": log.user_id,
            "username": username,
            "user_group_id": log.user_group_id,
            "user_group_name": group_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
    )


@router.get("/resource/{resource_type}/{resource_id}", response_model=dict)
async def get_audit_logs_by_resource(
    resource_type: str,
    resource_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit logs for a specific resource
    """
    query = select(AuditLog).where(
        AuditLog.resource_type == resource_type,
        AuditLog.resource_id == resource_id
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    log_list = []
    for log in logs:
        result = await db.execute(
            select(User).where(User.id == log.user_id)
        )
        user = result.scalar_one_or_none()
        username = user.username if user else "Unknown"

        log_list.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": username,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return api_response(
        data={
            "logs": log_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/users/{user_id}/history", response_model=dict)
async def get_user_audit_history(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit history for a specific user
    """
    query = select(AuditLog).where(AuditLog.user_id == user_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    log_list = []
    for log in logs:
        log_list.append({
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return api_response(
        data={
            "logs": log_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/actions/list", response_model=dict)
async def list_actions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of unique actions in audit logs
    """
    result = await db.execute(
        select(AuditLog.action).distinct()
    )
    actions = result.scalars().all()

    return api_response(
        data={"actions": list(actions)}
    )


@router.get("/resource-types/list", response_model=dict)
async def list_resource_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of unique resource types in audit logs
    """
    result = await db.execute(
        select(AuditLog.resource_type).distinct()
    )
    resource_types = result.scalars().all()

    return api_response(
        data={"resource_types": list(resource_types)}
    )
