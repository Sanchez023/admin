"""
Providers Router - Model Provider and API Key Management
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.provider import ModelProvider, ProviderAPIKey
from app.models.audit import AuditLog
from app.schemas.provider import (
    ProviderCreate, ProviderUpdate, ProviderResponse,
    APIKeyCreate, APIKeyUpdate, APIKeyResponse,
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


# ============ Provider Endpoints ============

@router.get("", response_model=dict)
async def list_providers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    provider_type: Optional[str] = Query(None, description="Filter by provider type"),
    keyword: Optional[str] = Query(None, description="Search keyword"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of model providers
    """
    query = select(ModelProvider).where(ModelProvider.deleted_at == None)

    if provider_type:
        query = query.where(ModelProvider.provider_type == provider_type)

    if keyword:
        query = query.where(
            (ModelProvider.name.contains(keyword)) |
            (ModelProvider.name_cn.contains(keyword))
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(ModelProvider.id.desc())

    result = await db.execute(query)
    providers = result.scalars().all()

    return api_response(
        data={
            "providers": [
                {
                    "id": p.id,
                    "name": p.name,
                    "name_cn": p.name_cn,
                    "api_base_url": p.api_base_url,
                    "provider_type": p.provider_type,
                    "is_enabled": p.is_enabled,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in providers
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{provider_id}", response_model=dict)
async def get_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get provider by ID
    """
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()

    if not provider:
        return error_response(message="Provider not found", code=404)

    # Get API keys
    result = await db.execute(
        select(ProviderAPIKey).where(
            ProviderAPIKey.provider_id == provider_id,
            ProviderAPIKey.deleted_at == None
        )
    )
    api_keys = result.scalars().all()

    return api_response(
        data={
            "id": provider.id,
            "name": provider.name,
            "name_cn": provider.name_cn,
            "api_base_url": provider.api_base_url,
            "provider_type": provider.provider_type,
            "is_enabled": provider.is_enabled,
            "created_at": provider.created_at.isoformat() if provider.created_at else None,
            "updated_at": provider.updated_at.isoformat() if provider.updated_at else None,
            "api_keys": [
                {
                    "id": k.id,
                    "name": k.name,
                    "is_enabled": k.is_enabled,
                    "created_at": k.created_at.isoformat() if k.created_at else None,
                }
                for k in api_keys
            ],
        }
    )


@router.post("", response_model=dict)
async def create_provider(
    provider_data: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new model provider (admin only)
    """
    new_provider = ModelProvider(
        name=provider_data.name,
        name_cn=provider_data.name_cn,
        api_base_url=provider_data.api_base_url,
        provider_type=provider_data.provider_type,
        created_by=current_user.id,
    )
    db.add(new_provider)
    await db.commit()
    await db.refresh(new_provider)

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="provider",
        resource_id=new_provider.id,
        details=f"Created provider: {new_provider.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": new_provider.id,
            "name": new_provider.name,
            "name_cn": new_provider.name_cn,
            "api_base_url": new_provider.api_base_url,
            "provider_type": new_provider.provider_type,
            "is_enabled": new_provider.is_enabled,
        },
        message="Provider created successfully",
        code=201,
    )


@router.put("/{provider_id}", response_model=dict)
async def update_provider(
    provider_id: int,
    provider_data: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a provider (admin only)
    """
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()

    if not provider:
        return error_response(message="Provider not found", code=404)

    changes = []
    if provider_data.name is not None:
        provider.name = provider_data.name
        changes.append("name")
    if provider_data.name_cn is not None:
        provider.name_cn = provider_data.name_cn
        changes.append("name_cn")
    if provider_data.api_base_url is not None:
        provider.api_base_url = provider_data.api_base_url
        changes.append("api_base_url")
    if provider_data.provider_type is not None:
        provider.provider_type = provider_data.provider_type
        changes.append("provider_type")
    if provider_data.is_enabled is not None:
        provider.is_enabled = provider_data.is_enabled
        changes.append("is_enabled")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="provider",
        resource_id=provider_id,
        details=f"Updated provider fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": provider.id,
            "name": provider.name,
            "name_cn": provider.name_cn,
            "api_base_url": provider.api_base_url,
            "provider_type": provider.provider_type,
            "is_enabled": provider.is_enabled,
        },
        message="Provider updated successfully",
    )


@router.delete("/{provider_id}", response_model=dict)
async def delete_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a provider (soft delete)
    """
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()

    if not provider:
        return error_response(message="Provider not found", code=404)

    from datetime import datetime
    provider.deleted_at = datetime.utcnow()

    # Soft delete all API keys
    result = await db.execute(
        select(ProviderAPIKey).where(
            ProviderAPIKey.provider_id == provider_id,
            ProviderAPIKey.deleted_at == None
        )
    )
    api_keys = result.scalars().all()
    for key in api_keys:
        key.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="provider",
        resource_id=provider_id,
        details=f"Deleted provider: {provider.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="Provider deleted successfully")


# ============ API Key Endpoints ============

@router.get("/{provider_id}/keys", response_model=dict)
async def list_api_keys(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get API keys for a provider
    """
    # Verify provider exists
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return error_response(message="Provider not found", code=404)

    result = await db.execute(
        select(ProviderAPIKey).where(
            ProviderAPIKey.provider_id == provider_id,
            ProviderAPIKey.deleted_at == None
        )
    )
    api_keys = result.scalars().all()

    return api_response(
        data={
            "api_keys": [
                {
                    "id": k.id,
                    "name": k.name,
                    "is_enabled": k.is_enabled,
                    "created_at": k.created_at.isoformat() if k.created_at else None,
                }
                for k in api_keys
            ]
        }
    )


@router.post("/{provider_id}/keys", response_model=dict)
async def create_api_key(
    provider_id: int,
    key_data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create an API key for a provider (admin only)
    """
    # Verify provider exists
    result = await db.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.deleted_at == None
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        return error_response(message="Provider not found", code=404)

    new_key = ProviderAPIKey(
        provider_id=provider_id,
        name=key_data.name,
        api_key=key_data.api_key,
        created_by=current_user.id,
    )
    db.add(new_key)

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="api_key",
        resource_id=new_key.id,
        details=f"Created API key '{key_data.name}' for provider {provider.name}",
    )
    db.add(audit_log)
    await db.commit()
    await db.refresh(new_key)

    return api_response(
        data={
            "id": new_key.id,
            "provider_id": new_key.provider_id,
            "name": new_key.name,
            "api_key": new_key.api_key,
            "is_enabled": new_key.is_enabled,
        },
        message="API key created successfully",
        code=201,
    )


@router.put("/{provider_id}/keys/{key_id}", response_model=dict)
async def update_api_key(
    provider_id: int,
    key_id: int,
    key_data: APIKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update an API key
    """
    result = await db.execute(
        select(ProviderAPIKey).where(
            ProviderAPIKey.id == key_id,
            ProviderAPIKey.provider_id == provider_id,
            ProviderAPIKey.deleted_at == None
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        return error_response(message="API key not found", code=404)

    changes = []
    if key_data.name is not None:
        api_key.name = key_data.name
        changes.append("name")
    if key_data.api_key is not None:
        api_key.api_key = key_data.api_key
        changes.append("api_key")
    if key_data.is_enabled is not None:
        api_key.is_enabled = key_data.is_enabled
        changes.append("is_enabled")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="api_key",
        resource_id=key_id,
        details=f"Updated API key fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": api_key.id,
            "name": api_key.name,
            "is_enabled": api_key.is_enabled,
        },
        message="API key updated successfully",
    )


@router.delete("/{provider_id}/keys/{key_id}", response_model=dict)
async def delete_api_key(
    provider_id: int,
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete an API key
    """
    result = await db.execute(
        select(ProviderAPIKey).where(
            ProviderAPIKey.id == key_id,
            ProviderAPIKey.provider_id == provider_id,
            ProviderAPIKey.deleted_at == None
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        return error_response(message="API key not found", code=404)

    from datetime import datetime
    api_key.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="api_key",
        resource_id=key_id,
        details=f"Deleted API key: {api_key.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="API key deleted successfully")
