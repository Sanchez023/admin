"""
Users Router - User Management
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.database import get_db
from app.models.user import User, LoginRecord
from app.models.role import Role, UserGroup
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, LoginRecordResponse
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response
from app.utils.security import get_password_hash

router = APIRouter()


@router.get("", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    keyword: Optional[str] = Query(None, description="Search keyword"),
    role_id: Optional[int] = Query(None, description="Filter by role"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of users
    """
    query = select(User).where(User.is_deleted == False)

    if keyword:
        query = query.where(User.username.contains(keyword))

    if role_id:
        query = query.where(User.role_id == role_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.id.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    # Get role names
    user_list = []
    for user in users:
        role_name = None
        if user.role_id:
            result = await db.execute(select(Role).where(Role.id == user.role_id))
            role = result.scalar_one_or_none()
            if role:
                role_name = role.name

        user_list.append({
            "id": user.id,
            "username": user.username,
            "role_id": user.role_id,
            "role": role_name,
            "permissions": user.permissions,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_deleted": user.is_deleted,
        })

    return api_response(
        data={
            "users": user_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user by ID
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        return error_response(message="User not found", code=404)

    # Get role
    role_name = None
    if user.role_id:
        result = await db.execute(select(Role).where(Role.id == user.role_id))
        role = result.scalar_one_or_none()
        if role:
            role_name = role.name

    # Get user groups
    result = await db.execute(
        select(UserGroup).join(
            UserGroup.users
        ).where(User.id == user_id)
    )
    groups = result.scalars().all()

    return api_response(
        data={
            "id": user.id,
            "username": user.username,
            "role_id": user.role_id,
            "role": role_name,
            "permissions": user.permissions,
            "user_groups": [{"id": g.id, "name": g.name} for g in groups],
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
    )


@router.post("", response_model=dict)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new user (admin only)
    """
    # Check if username exists
    result = await db.execute(
        select(User).where(
            User.username == user_data.username,
            User.is_deleted == False
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        return error_response(message="Username already exists", code=400)

    # Create user
    password_hash = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        password_hash=password_hash,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return api_response(
        data={
            "id": new_user.id,
            "username": new_user.username,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
        },
        message="User created successfully",
        code=201,
    )


@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user information
    """
    # Check permission: admin or self
    if current_user.id != user_id and not current_user.role_id:
        result = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result.scalar_one_or_none()
        if not role or role.name != "admin":
            return error_response(message="Permission denied", code=403)

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        return error_response(message="User not found", code=404)

    # Update fields
    if user_data.username is not None:
        # Check if new username exists
        result = await db.execute(
            select(User).where(
                User.username == user_data.username,
                User.id != user_id,
                User.is_deleted == False
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return error_response(message="Username already exists", code=400)
        user.username = user_data.username

    if user_data.password is not None:
        user.password_hash = get_password_hash(user_data.password)

    if user_data.role_id is not None:
        # Only admin can change role
        result = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result.scalar_one_or_none()
        if role and role.name == "admin":
            user.role_id = user_data.role_id

    if user_data.permissions is not None:
        # Only admin can change permissions
        result = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result.scalar_one_or_none()
        if role and role.name == "admin":
            user.permissions = user_data.permissions

    await db.commit()
    await db.refresh(user)

    return api_response(
        data={
            "id": user.id,
            "username": user.username,
            "role_id": user.role_id,
            "permissions": user.permissions,
        },
        message="User updated successfully",
    )


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a user (soft delete)
    """
    # Cannot delete yourself
    if current_user.id == user_id:
        return error_response(message="Cannot delete yourself", code=400)

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        return error_response(message="User not found", code=404)

    # Soft delete
    from datetime import datetime
    user.is_deleted = True
    user.deleted_at = datetime.utcnow()

    await db.commit()

    return api_response(message="User deleted successfully")


@router.get("/{user_id}/login-records", response_model=dict)
async def get_user_login_records(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's login records
    """
    # Users can only view their own records, admins can view all
    if current_user.id != user_id:
        result = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result.scalar_one_or_none()
        if not role or role.name != "admin":
            return error_response(message="Permission denied", code=403)

    query = select(LoginRecord).where(LoginRecord.user_id == user_id).order_by(LoginRecord.login_time.desc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    records = result.scalars().all()

    return api_response(
        data={
            "records": [
                {
                    "id": r.id,
                    "username": r.username,
                    "login_time": r.login_time.isoformat() if r.login_time else None,
                    "success": r.success,
                    "ip_address": r.ip_address,
                    "user_agent": r.user_agent,
                }
                for r in records
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.post("/{user_id}/groups/{group_id}", response_model=dict)
async def add_user_to_group(
    user_id: int,
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Add user to a group
    """
    # Check user exists
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return error_response(message="User not found", code=404)

    # Check group exists
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        return error_response(message="User group not found", code=404)

    # Add to group
    if group not in user.user_groups:
        user.user_groups.append(group)
        await db.commit()

    return api_response(message="User added to group successfully")


@router.delete("/{user_id}/groups/{group_id}", response_model=dict)
async def remove_user_from_group(
    user_id: int,
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Remove user from a group
    """
    # Check user exists
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return error_response(message="User not found", code=404)

    # Check group exists
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        return error_response(message="User group not found", code=404)

    # Remove from group
    if group in user.user_groups:
        user.user_groups.remove(group)
        await db.commit()

    return api_response(message="User removed from group successfully")
