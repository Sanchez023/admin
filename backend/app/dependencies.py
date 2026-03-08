"""
Dependency Injection
"""
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.utils.security import decode_access_token


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Get user from database
    result = await db.execute(
        select(User).where(User.id == int(user_id), User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current user and verify they are an admin
    """
    if current_user.role_id:
        result = await db.execute(
            select(Role).where(Role.id == current_user.role_id)
        )
        role = result.scalar_one_or_none()
        if role and role.name == "admin":
            return current_user

    # Check if user has admin permission
    if current_user.permissions and current_user.permissions.get("is_admin"):
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin privileges required",
    )


def get_user_permissions(user: User, db: AsyncSession) -> dict:
    """
    Get user permissions (union of role, user group, and individual permissions)
    """
    permissions = {}

    # Get role permissions
    if user.role_id:
        # This would need to be loaded from db

    # Get individual permissions
    if user.permissions:
        permissions.update(user.permissions)

    return permissions
