"""
Models Router - LLM Model Instance Management
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.provider import ModelProvider, ProviderAPIKey
from app.models.model_instance import ModelInstance
from app.models.audit import AuditLog
from app.schemas.model_instance import (
    ModelInstanceCreate, ModelInstanceUpdate, ModelInstanceResponse,
    TestConnectionRequest, TestConnectionResponse,
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


@router.get("", response_model=dict)
async def list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    provider_id: Optional[int] = Query(None, description="Filter by provider"),
    provider_type: Optional[str] = Query(None, description="Filter by provider type"),
    keyword: Optional[str] = Query(None, description="Search by model name"),
    is_enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of model instances
    """
    query = select(ModelInstance).where(ModelInstance.deleted_at == None)

    if provider_id:
        query = query.where(ModelInstance.provider_id == provider_id)

    if is_enabled is not None:
        query = query.where(ModelInstance.is_enabled == is_enabled)

    if keyword:
        query = query.where(ModelInstance.name.contains(keyword))

    # Join with provider to filter by type
    if provider_type:
        query = query.join(ModelProvider).where(ModelProvider.provider_type == provider_type)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(ModelInstance.id.desc())

    result = await db.execute(query)
    models = result.scalars().all()

    # Get provider info for each model
    model_list = []
    for model in models:
        result = await db.execute(
            select(ModelProvider).where(ModelProvider.id == model.provider_id)
        )
        provider = result.scalar_one_or_none()

        model_list.append({
            "id": model.id,
            "name": model.name,
            "display_name": model.display_name,
            "provider_id": model.provider_id,
            "provider_name": provider.name if provider else None,
            "provider_type": provider.provider_type if provider else None,
            "api_key_id": model.api_key_id,
            "supports_vision": model.supports_vision,
            "supports_image_generation": model.supports_image_generation,
            "supports_reasoning": model.supports_reasoning,
            "config": model.config,
            "is_enabled": model.is_enabled,
            "created_at": model.created_at.isoformat() if model.created_at else None,
        })

    return api_response(
        data={
            "models": model_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{model_id}", response_model=dict)
async def get_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get model instance by ID
    """
    result = await db.execute(
        select(ModelInstance).where(
            ModelInstance.id == model_id,
            ModelInstance.deleted_at == None
        )
    )
    model = result.scalar_one_or_none()

    if not model:
        return error_response(message="Model not found", code=404)

    # Get provider
    result = await db.execute(
        select(ModelProvider).where(ModelProvider.id == model.provider_id)
    )
    provider = result.scalar_one_or_none()

    # Get API key info
    api_key_info = None
    if model.api_key_id:
        result = await db.execute(
            select(ProviderAPIKey).where(ProviderAPIKey.id == model.api_key_id)
        )
        api_key = result.scalar_one_or_none()
        if api_key:
            api_key_info = {
                "id": api_key.id,
                "name": api_key.name,
                "is_enabled": api_key.is_enabled,
            }

    return api_response(
        data={
            "id": model.id,
            "name": model.name,
            "display_name": model.display_name,
            "provider_id": model.provider_id,
            "provider_name": provider.name if provider else None,
            "provider_type": provider.provider_type if provider else None,
            "api_base_url": provider.api_base_url if provider else None,
            "api_key_id": model.api_key_id,
            "api_key": api_key_info,
            "supports_vision": model.supports_vision,
            "supports_image_generation": model.supports_image_generation,
            "supports_reasoning": model.supports_reasoning,
            "config": model.config,
            "is_enabled": model.is_enabled,
            "created_at": model.created_at.isoformat() if model.created_at else None,
            "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        }
    )


@router.post("", response_model=dict)
async def create_model(
    model_data: ModelInstanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new model instance (admin only)
    """
    # Verify provider exists
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == model_data.provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return error_response(message="Provider not found", code=404)

    # Verify API key if provided
    if model_data.api_key_id:
        result = await db.execute(
            select(ProviderAPIKey).where(
                ProviderAPIKey.id == model_data.api_key_id,
                ProviderAPIKey.deleted_at == None
            )
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            return error_response(message="API key not found", code=404)
        if api_key.provider_id != model_data.provider_id:
            return error_response(message="API key does not belong to the provider", code=400)

    new_model = ModelInstance(
        name=model_data.name,
        display_name=model_data.display_name,
        provider_id=model_data.provider_id,
        api_key_id=model_data.api_key_id,
        supports_vision=model_data.supports_vision,
        supports_image_generation=model_data.supports_image_generation,
        supports_reasoning=model_data.supports_reasoning,
        config=model_data.config,
        created_by=current_user.id,
    )
    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="model",
        resource_id=new_model.id,
        details=f"Created model instance: {new_model.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": new_model.id,
            "name": new_model.name,
            "display_name": new_model.display_name,
            "provider_id": new_model.provider_id,
            "api_key_id": new_model.api_key_id,
            "supports_vision": new_model.supports_vision,
            "supports_image_generation": new_model.supports_image_generation,
            "supports_reasoning": new_model.supports_reasoning,
            "config": new_model.config,
            "is_enabled": new_model.is_enabled,
        },
        message="Model instance created successfully",
        code=201,
    )


@router.put("/{model_id}", response_model=dict)
async def update_model(
    model_id: int,
    model_data: ModelInstanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a model instance (admin only)
    """
    result = await db.execute(
        select(ModelInstance).where(
            ModelInstance.id == model_id,
            ModelInstance.deleted_at == None
        )
    )
    model = result.scalar_one_or_none()

    if not model:
        return error_response(message="Model not found", code=404)

    changes = []
    if model_data.name is not None:
        model.name = model_data.name
        changes.append("name")
    if model_data.display_name is not None:
        model.display_name = model_data.display_name
        changes.append("display_name")
    if model_data.provider_id is not None:
        model.provider_id = model_data.provider_id
        changes.append("provider_id")
    if model_data.api_key_id is not None:
        model.api_key_id = model_data.api_key_id
        changes.append("api_key_id")
    if model_data.supports_vision is not None:
        model.supports_vision = model_data.supports_vision
        changes.append("supports_vision")
    if model_data.supports_image_generation is not None:
        model.supports_image_generation = model_data.supports_image_generation
        changes.append("supports_image_generation")
    if model_data.supports_reasoning is not None:
        model.supports_reasoning = model_data.supports_reasoning
        changes.append("supports_reasoning")
    if model_data.config is not None:
        model.config = model_data.config
        changes.append("config")
    if model_data.is_enabled is not None:
        model.is_enabled = model_data.is_enabled
        changes.append("is_enabled")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="model",
        resource_id=model_id,
        details=f"Updated model fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": model.id,
            "name": model.name,
            "display_name": model.display_name,
            "provider_id": model.provider_id,
            "api_key_id": model.api_key_id,
            "is_enabled": model.is_enabled,
        },
        message="Model instance updated successfully",
    )


@router.delete("/{model_id}", response_model=dict)
async def delete_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a model instance (soft delete)
    """
    result = await db.execute(
        select(ModelInstance).where(
            ModelInstance.id == model_id,
            ModelInstance.deleted_at == None
        )
    )
    model = result.scalar_one_or_none()

    if not model:
        return error_response(message="Model not found", code=404)

    from datetime import datetime
    model.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="model",
        resource_id=model_id,
        details=f"Deleted model instance: {model.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="Model instance deleted successfully")


@router.post("/test-connection", response_model=dict)
async def test_connection(
    test_data: TestConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Test connection to a model provider
    """
    # Verify provider exists
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == test_data.provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return error_response(message="Provider not found", code=404)

    # Get API key if provided
    api_key = None
    if test_data.api_key_id:
        result = await db.execute(
            select(ProviderAPIKey).where(
                ProviderAPIKey.id == test_data.api_key_id,
                ProviderAPIKey.deleted_at == None
            )
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            return error_response(message="API key not found", code=404)

    # TODO: Implement actual connection test using litellm
    # For now, return a mock response
    # In production, this would call the actual provider API

    return api_response(
        data={
            "success": True,
            "message": "Connection test successful (mock)",
            "provider": provider.name,
            "model": test_data.model_name or "default",
        }
    )
