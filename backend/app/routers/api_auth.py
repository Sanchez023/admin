"""
API Auth Router - API Authorization Management
"""
from typing import Optional, List
import secrets
import string

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.role import UserGroup
from app.models.api_auth import APIAuthList
from app.models.model_instance import ModelInstance
from app.models.mcp import MCPServer
from app.models.skill import Skill
from app.models.audit import AuditLog
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


def generate_token(length: int = 32) -> str:
    """Generate a random API token"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ============ API Auth List Endpoints ============

@router.get("", response_model=dict)
async def list_api_auths(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    user_group_id: Optional[int] = Query(None, description="Filter by user group ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of API authorization lists
    """
    query = select(APIAuthList).where(APIAuthList.deleted_at == None)

    if user_id:
        query = query.where(APIAuthList.user_id == user_id)

    if user_group_id:
        query = query.where(APIAuthList.user_group_id == user_group_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(APIAuthList.id.desc())

    result = await db.execute(query)
    auth_lists = result.scalars().all()

    # Get user/group names
    auth_list_data = []
    for auth in auth_lists:
        username = None
        if auth.user_id:
            result = await db.execute(
                select(User).where(User.id == auth.user_id)
            )
            user = result.scalar_one_or_none()
            username = user.username if user else None

        group_name = None
        if auth.user_group_id:
            result = await db.execute(
                select(UserGroup).where(UserGroup.id == auth.user_group_id)
            )
            group = result.scalar_one_or_none()
            group_name = group.name if group else None

        auth_list_data.append({
            "id": auth.id,
            "user_id": auth.user_id,
            "username": username,
            "user_group_id": auth.user_group_id,
            "user_group_name": group_name,
            "authorized_models": auth.authorized_models,
            "authorized_mcps": auth.authorized_mcps,
            "authorized_skills": auth.authorized_skills,
            "api_token": auth.api_token,
            "api_endpoint": auth.api_endpoint,
            "created_at": auth.created_at.isoformat() if auth.created_at else None,
        })

    return api_response(
        data={
            "auth_lists": auth_list_data,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{auth_id}", response_model=dict)
async def get_api_auth(
    auth_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get API authorization by ID
    """
    result = await db.execute(
        select(APIAuthList).where(
            APIAuthList.id == auth_id,
            APIAuthList.deleted_at == None
        )
    )
    auth = result.scalar_one_or_none()

    if not auth:
        return error_response(message="API authorization not found", code=404)

    # Get username
    username = None
    if auth.user_id:
        result = await db.execute(
            select(User).where(User.id == auth.user_id)
        )
        user = result.scalar_one_or_none()
        username = user.username if user else None

    # Get group name
    group_name = None
    if auth.user_group_id:
        result = await db.execute(
            select(UserGroup).where(UserGroup.id == auth.user_group_id)
        )
        group = result.scalar_one_or_none()
        group_name = group.name if group else None

    # Get model names
    model_names = []
    if auth.authorized_models:
        for model_id in auth.authorized_models:
            result = await db.execute(
                select(ModelInstance).where(ModelInstance.id == model_id)
            )
            model = result.scalar_one_or_none()
            if model:
                model_names.append({"id": model.id, "name": model.name})

    # Get MCP names
    mcp_names = []
    if auth.authorized_mcps:
        for mcp_id in auth.authorized_mcps:
            result = await db.execute(
                select(MCPServer).where(MCPServer.id == mcp_id)
            )
            mcp = result.scalar_one_or_none()
            if mcp:
                mcp_names.append({"id": mcp.id, "name": mcp.name})

    # Get skill names
    skill_names = []
    if auth.authorized_skills:
        for skill_id in auth.authorized_skills:
            result = await db.execute(
                select(Skill).where(Skill.id == skill_id)
            )
            skill = result.scalar_one_or_none()
            if skill:
                skill_names.append({"id": skill.id, "name": skill.name})

    return api_response(
        data={
            "id": auth.id,
            "user_id": auth.user_id,
            "username": username,
            "user_group_id": auth.user_group_id,
            "user_group_name": group_name,
            "authorized_models": auth.authorized_models,
            "authorized_model_details": model_names,
            "authorized_mcps": auth.authorized_mcps,
            "authorized_mcp_details": mcp_names,
            "authorized_skills": auth.authorized_skills,
            "authorized_skill_details": skill_names,
            "api_token": auth.api_token,
            "api_endpoint": auth.api_endpoint,
            "created_at": auth.created_at.isoformat() if auth.created_at else None,
            "updated_at": auth.updated_at.isoformat() if auth.updated_at else None,
        }
    )


@router.post("", response_model=dict)
async def create_api_auth(
    user_id: Optional[int] = Query(None, description="User ID"),
    user_group_id: Optional[int] = Query(None, description="User group ID"),
    authorized_models: Optional[List[int]] = Query(None, description="Authorized model IDs"),
    authorized_mcps: Optional[List[int]] = Query(None, description="Authorized MCP IDs"),
    authorized_skills: Optional[List[int]] = Query(None, description="Authorized skill IDs"),
    api_endpoint: str = Query(..., description="API endpoint"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new API authorization (admin only)
    """
    # Validate: must have either user_id or user_group_id
    if not user_id and not user_group_id:
        return error_response(message="Either user_id or user_group_id must be provided", code=400)

    # Validate user if provided
    if user_id:
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        user = result.scalar_one_or_none()
        if not user:
            return error_response(message="User not found", code=404)

    # Validate user group if provided
    if user_group_id:
        result = await db.execute(
            select(UserGroup).where(UserGroup.id == user_group_id, UserGroup.is_deleted == False)
        )
        group = result.scalar_one_or_none()
        if not group:
            return error_response(message="User group not found", code=404)

    # Generate API token
    api_token = generate_token()

    new_auth = APIAuthList(
        user_id=user_id,
        user_group_id=user_group_id,
        authorized_models=authorized_models,
        authorized_mcps=authorized_mcps,
        authorized_skills=authorized_skills,
        api_token=api_token,
        api_endpoint=api_endpoint,
    )
    db.add(new_auth)

    # Create audit log
    target = f"user {user_id}" if user_id else f"group {user_group_id}"
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="api_auth",
        resource_id=new_auth.id,
        details=f"Created API authorization for {target}",
    )
    db.add(audit_log)
    await db.commit()
    await db.refresh(new_auth)

    return api_response(
        data={
            "id": new_auth.id,
            "user_id": new_auth.user_id,
            "user_group_id": new_auth.user_group_id,
            "authorized_models": new_auth.authorized_models,
            "authorized_mcps": new_auth.authorized_mcps,
            "authorized_skills": new_auth.authorized_skills,
            "api_token": new_auth.api_token,
            "api_endpoint": new_auth.api_endpoint,
        },
        message="API authorization created successfully",
        code=201,
    )


@router.put("/{auth_id}", response_model=dict)
async def update_api_auth(
    auth_id: int,
    authorized_models: Optional[List[int]] = Query(None, description="Authorized model IDs"),
    authorized_mcps: Optional[List[int]] = Query(None, description="Authorized MCP IDs"),
    authorized_skills: Optional[List[int]] = Query(None, description="Authorized skill IDs"),
    api_endpoint: Optional[str] = Query(None, description="API endpoint"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update an API authorization (admin only)
    """
    result = await db.execute(
        select(APIAuthList).where(
            APIAuthList.id == auth_id,
            APIAuthList.deleted_at == None
        )
    )
    auth = result.scalar_one_or_none()

    if not auth:
        return error_response(message="API authorization not found", code=404)

    changes = []
    if authorized_models is not None:
        auth.authorized_models = authorized_models
        changes.append("authorized_models")
    if authorized_mcps is not None:
        auth.authorized_mcps = authorized_mcps
        changes.append("authorized_mcps")
    if authorized_skills is not None:
        auth.authorized_skills = authorized_skills
        changes.append("authorized_skills")
    if api_endpoint is not None:
        auth.api_endpoint = api_endpoint
        changes.append("api_endpoint")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="api_auth",
        resource_id=auth_id,
        details=f"Updated API authorization fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": auth.id,
            "authorized_models": auth.authorized_models,
            "authorized_mcps": auth.authorized_mcps,
            "authorized_skills": auth.authorized_skills,
            "api_endpoint": auth.api_endpoint,
        },
        message="API authorization updated successfully",
    )


@router.delete("/{auth_id}", response_model=dict)
async def delete_api_auth(
    auth_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete an API authorization (soft delete)
    """
    result = await db.execute(
        select(APIAuthList).where(
            APIAuthList.id == auth_id,
            APIAuthList.deleted_at == None
        )
    )
    auth = result.scalar_one_or_none()

    if not auth:
        return error_response(message="API authorization not found", code=404)

    from datetime import datetime
    auth.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="api_auth",
        resource_id=auth_id,
        details=f"Deleted API authorization",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="API authorization deleted successfully")


@router.post("/{auth_id}/regenerate-token", response_model=dict)
async def regenerate_token(
    auth_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Regenerate API token (admin only)
    """
    result = await db.execute(
        select(APIAuthList).where(
            APIAuthList.id == auth_id,
            APIAuthList.deleted_at == None
        )
    )
    auth = result.scalar_one_or_none()

    if not auth:
        return error_response(message="API authorization not found", code=404)

    # Generate new token
    auth.api_token = generate_token()
    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="api_auth",
        resource_id=auth_id,
        details=f"Regenerated API token",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": auth.id,
            "api_token": auth.api_token,
        },
        message="API token regenerated successfully",
    )


@router.get("/verify/{token}", response_model=dict)
async def verify_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an API token (public endpoint for external services)
    """
    result = await db.execute(
        select(APIAuthList).where(
            APIAuthList.api_token == token,
            APIAuthList.deleted_at == None
        )
    )
    auth = result.scalar_one_or_none()

    if not auth:
        return error_response(message="Invalid token", code=401)

    # Get authorized resources
    return api_response(
        data={
            "valid": True,
            "user_id": auth.user_id,
            "user_group_id": auth.user_group_id,
            "authorized_models": auth.authorized_models,
            "authorized_mcps": auth.authorized_mcps,
            "authorized_skills": auth.authorized_skills,
            "api_endpoint": auth.api_endpoint,
        }
    )
