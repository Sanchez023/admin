"""
Decorators for audit logging
"""
import functools
import json
from typing import Callable

from fastapi import Request

from app.utils.responses import get_db


async def create_audit_log(
    db,
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: int = None,
    details: str = None,
    user_group_id: int = None,
):
    """
    Create an audit log entry

    Args:
        db: Database session
        user_id: User ID
        action: Action performed (create, update, delete)
        resource_type: Type of resource (user, provider, model, etc.)
        resource_id: ID of the resource
        details: Additional details
        user_group_id: User group ID if applicable
    """
    from app.models.audit import AuditLog

    audit_log = AuditLog(
        user_id=user_id,
        user_group_id=user_group_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.add(audit_log)
    await db.commit()


def audit_log(action: str, resource_type: str):
    """
    Decorator to automatically create audit logs for CRUD operations

    Usage:
        @audit_log("create", "user")
        async def create_user(...):
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id from kwargs
            user_id = kwargs.get("current_user_id")
            user_group_id = kwargs.get("current_user_group_id")

            # Extract resource_id from result
            result = await func(*args, **kwargs)

            # Get db from kwargs if available
            db = kwargs.get("db")

            if db and user_id:
                # Try to extract resource_id from result
                resource_id = None
                if isinstance(result, dict) and "data" in result:
                    data = result["data"]
                    if isinstance(data, dict) and "id" in data:
                        resource_id = data["id"]

                details = f"{action} {resource_type}"
                await create_audit_log(
                    db=db,
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details=details,
                    user_group_id=user_group_id,
                )

            return result

        return wrapper

    return decorator
