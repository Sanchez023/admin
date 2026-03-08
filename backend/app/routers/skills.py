"""
Skills Router - Skill Management
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.skill import Skill
from app.models.audit import AuditLog
from app.schemas.skill import (
    SkillCreate, SkillUpdate, SkillResponse,
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


@router.get("", response_model=dict)
async def list_skills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    skill_type: Optional[str] = Query(None, description="Filter by skill type"),
    keyword: Optional[str] = Query(None, description="Search keyword"),
    is_enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of skills
    """
    query = select(Skill).where(Skill.deleted_at == None)

    if skill_type:
        query = query.where(Skill.skill_type == skill_type)

    if keyword:
        query = query.where(Skill.name.contains(keyword))

    if is_enabled is not None:
        query = query.where(Skill.is_enabled == is_enabled)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Skill.id.desc())

    result = await db.execute(query)
    skills = result.scalars().all()

    return api_response(
        data={
            "skills": [
                {
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "skill_type": s.skill_type,
                    "content": s.content,
                    "config": s.config,
                    "is_enabled": s.is_enabled,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in skills
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{skill_id}", response_model=dict)
async def get_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get skill by ID
    """
    result = await db.execute(
        select(Skill).where(
            Skill.id == skill_id,
            Skill.deleted_at == None
        )
    )
    skill = result.scalar_one_or_none()

    if not skill:
        return error_response(message="Skill not found", code=404)

    return api_response(
        data={
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "skill_type": skill.skill_type,
            "content": skill.content,
            "config": skill.config,
            "is_enabled": skill.is_enabled,
            "created_at": skill.created_at.isoformat() if skill.created_at else None,
            "updated_at": skill.updated_at.isoformat() if skill.updated_at else None,
        }
    )


@router.post("", response_model=dict)
async def create_skill(
    skill_data: SkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new skill (admin only)
    """
    # Validate skill type
    if skill_data.skill_type not in ["prompt", "function"]:
        return error_response(message="Invalid skill type. Must be 'prompt' or 'function'", code=400)

    # For prompt type, content is required
    if skill_data.skill_type == "prompt" and not skill_data.content:
        return error_response(message="Content is required for prompt type skills", code=400)

    new_skill = Skill(
        name=skill_data.name,
        description=skill_data.description,
        skill_type=skill_data.skill_type,
        content=skill_data.content,
        config=skill_data.config,
        created_by=current_user.id,
    )
    db.add(new_skill)
    await db.commit()
    await db.refresh(new_skill)

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="skill",
        resource_id=new_skill.id,
        details=f"Created skill: {new_skill.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": new_skill.id,
            "name": new_skill.name,
            "description": new_skill.description,
            "skill_type": new_skill.skill_type,
            "content": new_skill.content,
            "config": new_skill.config,
            "is_enabled": new_skill.is_enabled,
        },
        message="Skill created successfully",
        code=201,
    )


@router.put("/{skill_id}", response_model=dict)
async def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a skill (admin only)
    """
    result = await db.execute(
        select(Skill).where(
            Skill.id == skill_id,
            Skill.deleted_at == None
        )
    )
    skill = result.scalar_one_or_none()

    if not skill:
        return error_response(message="Skill not found", code=404)

    changes = []
    if skill_data.name is not None:
        skill.name = skill_data.name
        changes.append("name")
    if skill_data.description is not None:
        skill.description = skill_data.description
        changes.append("description")
    if skill_data.skill_type is not None:
        skill.skill_type = skill_data.skill_type
        changes.append("skill_type")
    if skill_data.content is not None:
        skill.content = skill_data.content
        changes.append("content")
    if skill_data.config is not None:
        skill.config = skill_data.config
        changes.append("config")
    if skill_data.is_enabled is not None:
        skill.is_enabled = skill_data.is_enabled
        changes.append("is_enabled")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="skill",
        resource_id=skill_id,
        details=f"Updated skill fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "skill_type": skill.skill_type,
            "is_enabled": skill.is_enabled,
        },
        message="Skill updated successfully",
    )


@router.delete("/{skill_id}", response_model=dict)
async def delete_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a skill (soft delete)
    """
    result = await db.execute(
        select(Skill).where(
            Skill.id == skill_id,
            Skill.deleted_at == None
        )
    )
    skill = result.scalar_one_or_none()

    if not skill:
        return error_response(message="Skill not found", code=404)

    from datetime import datetime
    skill.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="skill",
        resource_id=skill_id,
        details=f"Deleted skill: {skill.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="Skill deleted successfully")
