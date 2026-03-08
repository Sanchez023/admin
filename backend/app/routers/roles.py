"""
Roles Router - Role and User Group Management
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.role import Role, UserGroup, user_group_members
from app.schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserGroupCreate, UserGroupUpdate, UserGroupResponse,
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


# ============ Role Endpoints ============

@router.get("/roles", response_model=dict)
async def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of roles
    """
    query = select(Role).where(Role.is_deleted == False)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Role.id)

    result = await db.execute(query)
    roles = result.scalars().all()

    return api_response(
        data={
            "roles": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "permissions": r.permissions,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in roles
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/roles/{role_id}", response_model=dict)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get role by ID
    """
    result = await db.execute(
        select(Role).where(
            Role.id == role_id,
            Role.is_deleted == False
        )
    )
    role = result.scalar_one_or_none()

    if not role:
        return error_response(message="Role not found", code=404)

    # Get users with this role
    result = await db.execute(
        select(User).where(
            User.role_id == role_id,
            User.is_deleted == False
        )
    )
    users = result.scalars().all()

    return api_response(
        data={
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions,
            "created_at": role.created_at.isoformat() if role.created_at else None,
            "updated_at": role.updated_at.isoformat() if role.updated_at else None,
            "user_count": len(users),
        }
    )


@router.post("/roles", response_model=dict)
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new role (admin only)
    """
    # Check if role name exists
    result = await db.execute(
        select(Role).where(
            Role.name == role_data.name,
            Role.is_deleted == False
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        return error_response(message="Role name already exists", code=400)

    new_role = Role(
        name=role_data.name,
        description=role_data.description,
        permissions=role_data.permissions,
    )
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)

    return api_response(
        data={
            "id": new_role.id,
            "name": new_role.name,
            "description": new_role.description,
            "permissions": new_role.permissions,
        },
        message="Role created successfully",
        code=201,
    )


@router.put("/roles/{role_id}", response_model=dict)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a role (admin only)
    """
    result = await db.execute(
        select(Role).where(
            Role.id == role_id,
            Role.is_deleted == False
        )
    )
    role = result.scalar_one_or_none()

    if not role:
        return error_response(message="Role not found", code=404)

    # Cannot modify admin role
    if role.name == "admin":
        return error_response(message="Cannot modify admin role", code=400)

    if role_data.name is not None:
        # Check if new name exists
        result = await db.execute(
            select(Role).where(
                Role.name == role_data.name,
                Role.id != role_id,
                Role.is_deleted == False
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return error_response(message="Role name already exists", code=400)
        role.name = role_data.name

    if role_data.description is not None:
        role.description = role_data.description

    if role_data.permissions is not None:
        role.permissions = role_data.permissions

    await db.commit()
    await db.refresh(role)

    return api_response(
        data={
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions,
        },
        message="Role updated successfully",
    )


@router.delete("/roles/{role_id}", response_model=dict)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a role (soft delete)
    """
    result = await db.execute(
        select(Role).where(
            Role.id == role_id,
            Role.is_deleted == False
        )
    )
    role = result.scalar_one_or_none()

    if not role:
        return error_response(message="Role not found", code=404)

    # Cannot delete admin role
    if role.name == "admin":
        return error_response(message="Cannot delete admin role", code=400)

    # Check if any users have this role
    result = await db.execute(
        select(User).where(
            User.role_id == role_id,
            User.is_deleted == False
        )
    )
    users = result.scalars().all()
    if users:
        return error_response(message="Cannot delete role with assigned users", code=400)

    # Soft delete
    from datetime import datetime
    role.is_deleted = True
    role.deleted_at = datetime.utcnow()

    await db.commit()

    return api_response(message="Role deleted successfully")


# ============ User Group Endpoints ============

@router.get("/groups", response_model=dict)
async def list_user_groups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of user groups
    """
    query = select(UserGroup).where(UserGroup.is_deleted == False)

    if keyword:
        query = query.where(UserGroup.name.contains(keyword))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(UserGroup.id)

    result = await db.execute(query)
    groups = result.scalars().all()

    return api_response(
        data={
            "groups": [
                {
                    "id": g.id,
                    "name": g.name,
                    "description": g.description,
                    "permissions": g.permissions,
                    "created_at": g.created_at.isoformat() if g.created_at else None,
                }
                for g in groups
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/groups/{group_id}", response_model=dict)
async def get_user_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user group by ID
    """
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()

    if not group:
        return error_response(message="User group not found", code=404)

    # Get users in this group
    result = await db.execute(
        select(User).where(
            User.is_deleted == False
        )
    )
    all_users = result.scalars().all()

    # Filter users that belong to this group
    users_in_group = [u for u in all_users if group in u.user_groups]

    # Get authorized resources from permissions
    permissions = group.permissions or {}
    authorized_providers = permissions.get("providers", [])
    authorized_models = permissions.get("models", [])
    authorized_mcps = permissions.get("mcps", [])
    authorized_skills = permissions.get("skills", [])

    return api_response(
        data={
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "permissions": group.permissions,
            "authorized_providers": authorized_providers,
            "authorized_models": authorized_models,
            "authorized_mcps": authorized_mcps,
            "authorized_skills": authorized_skills,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "updated_at": group.updated_at.isoformat() if group.updated_at else None,
            "user_count": len(users_in_group),
        }
    )


@router.post("/groups", response_model=dict)
async def create_user_group(
    group_data: UserGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new user group (admin only)
    """
    new_group = UserGroup(
        name=group_data.name,
        description=group_data.description,
        permissions=group_data.permissions,
    )
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)

    return api_response(
        data={
            "id": new_group.id,
            "name": new_group.name,
            "description": new_group.description,
            "permissions": new_group.permissions,
        },
        message="User group created successfully",
        code=201,
    )


@router.put("/groups/{group_id}", response_model=dict)
async def update_user_group(
    group_id: int,
    group_data: UserGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a user group (admin only)
    """
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()

    if not group:
        return error_response(message="User group not found", code=404)

    if group_data.name is not None:
        group.name = group_data.name

    if group_data.description is not None:
        group.description = group_data.description

    if group_data.permissions is not None:
        group.permissions = group_data.permissions

    await db.commit()
    await db.refresh(group)

    return api_response(
        data={
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "permissions": group.permissions,
        },
        message="User group updated successfully",
    )


@router.delete("/groups/{group_id}", response_model=dict)
async def delete_user_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a user group (soft delete)
    """
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()

    if not group:
        return error_response(message="User group not found", code=404)

    # Soft delete
    from datetime import datetime
    group.is_deleted = True
    group.deleted_at = datetime.utcnow()

    await db.commit()

    return api_response(message="User group deleted successfully")


@router.get("/groups/{group_id}/users", response_model=dict)
async def get_group_users(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get users in a group
    """
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()

    if not group:
        return error_response(message="User group not found", code=404)

    # Get all users and filter
    result = await db.execute(
        select(User).where(User.is_deleted == False)
    )
    all_users = result.scalars().all()
    users_in_group = [u for u in all_users if group in u.user_groups]

    return api_response(
        data={
            "users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in users_in_group
            ]
        }
    )


@router.post("/groups/{group_id}/permissions", response_model=dict)
async def update_group_permissions(
    group_id: int,
    permissions: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update group permissions (authorized resources)
    """
    result = await db.execute(
        select(UserGroup).where(
            UserGroup.id == group_id,
            UserGroup.is_deleted == False
        )
    )
    group = result.scalar_one_or_none()

    if not group:
        return error_response(message="User group not found", code=404)

    # Update permissions
    group.permissions = permissions
    await db.commit()

    return api_response(
        data={
            "id": group.id,
            "permissions": group.permissions,
        },
        message="Group permissions updated successfully",
    )
