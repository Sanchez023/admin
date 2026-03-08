"""
MCP Router - MCP Server Management
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.mcp import MCPServer
from app.models.audit import AuditLog
from app.schemas.mcp import (
    MCPServerCreate, MCPServerUpdate, MCPServerResponse,
)
from app.dependencies import get_current_user, get_current_admin
from app.utils.responses import api_response, error_response

router = APIRouter()


@router.get("", response_model=dict)
async def list_mcp_servers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    server_type: Optional[str] = Query(None, description="Filter by server type"),
    keyword: Optional[str] = Query(None, description="Search keyword"),
    is_enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of MCP servers
    """
    query = select(MCPServer).where(MCPServer.deleted_at == None)

    if server_type:
        query = query.where(MCPServer.server_type == server_type)

    if keyword:
        query = query.where(MCPServer.name.contains(keyword))

    if is_enabled is not None:
        query = query.where(MCPServer.is_enabled == is_enabled)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(MCPServer.id.desc())

    result = await db.execute(query)
    servers = result.scalars().all()

    return api_response(
        data={
            "servers": [
                {
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "server_type": s.server_type,
                    "command": s.command,
                    "args": s.args,
                    "env": s.env,
                    "url": s.url,
                    "is_enabled": s.is_enabled,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in servers
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{server_id}", response_model=dict)
async def get_mcp_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get MCP server by ID
    """
    result = await db.execute(
        select(MCPServer).where(
            MCPServer.id == server_id,
            MCPServer.deleted_at == None
        )
    )
    server = result.scalar_one_or_none()

    if not server:
        return error_response(message="MCP server not found", code=404)

    return api_response(
        data={
            "id": server.id,
            "name": server.name,
            "description": server.description,
            "server_type": server.server_type,
            "command": server.command,
            "args": server.args,
            "env": server.env,
            "url": server.url,
            "is_enabled": server.is_enabled,
            "created_at": server.created_at.isoformat() if server.created_at else None,
            "updated_at": server.updated_at.isoformat() if server.updated_at else None,
        }
    )


@router.post("", response_model=dict)
async def create_mcp_server(
    server_data: MCPServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new MCP server (admin only)
    """
    # Validate server type
    if server_data.server_type not in ["stdio", "sse"]:
        return error_response(message="Invalid server type. Must be 'stdio' or 'sse'", code=400)

    # For stdio type, command is required
    if server_data.server_type == "stdio" and not server_data.command:
        return error_response(message="Command is required for stdio type servers", code=400)

    # For SSE type, URL is required
    if server_data.server_type == "sse" and not server_data.url:
        return error_response(message="URL is required for SSE type servers", code=400)

    new_server = MCPServer(
        name=server_data.name,
        description=server_data.description,
        server_type=server_data.server_type,
        command=server_data.command,
        args=server_data.args,
        env=server_data.env,
        url=server_data.url,
        created_by=current_user.id,
    )
    db.add(new_server)
    await db.commit()
    await db.refresh(new_server)

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="mcp",
        resource_id=new_server.id,
        details=f"Created MCP server: {new_server.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": new_server.id,
            "name": new_server.name,
            "description": new_server.description,
            "server_type": new_server.server_type,
            "command": new_server.command,
            "args": new_server.args,
            "env": new_server.env,
            "url": new_server.url,
            "is_enabled": new_server.is_enabled,
        },
        message="MCP server created successfully",
        code=201,
    )


@router.put("/{server_id}", response_model=dict)
async def update_mcp_server(
    server_id: int,
    server_data: MCPServerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update an MCP server (admin only)
    """
    result = await db.execute(
        select(MCPServer).where(
            MCPServer.id == server_id,
            MCPServer.deleted_at == None
        )
    )
    server = result.scalar_one_or_none()

    if not server:
        return error_response(message="MCP server not found", code=404)

    changes = []
    if server_data.name is not None:
        server.name = server_data.name
        changes.append("name")
    if server_data.description is not None:
        server.description = server_data.description
        changes.append("description")
    if server_data.server_type is not None:
        server.server_type = server_data.server_type
        changes.append("server_type")
    if server_data.command is not None:
        server.command = server_data.command
        changes.append("command")
    if server_data.args is not None:
        server.args = server_data.args
        changes.append("args")
    if server_data.env is not None:
        server.env = server_data.env
        changes.append("env")
    if server_data.url is not None:
        server.url = server_data.url
        changes.append("url")
    if server_data.is_enabled is not None:
        server.is_enabled = server_data.is_enabled
        changes.append("is_enabled")

    await db.commit()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="mcp",
        resource_id=server_id,
        details=f"Updated MCP server fields: {', '.join(changes)}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(
        data={
            "id": server.id,
            "name": server.name,
            "description": server.description,
            "server_type": server.server_type,
            "is_enabled": server.is_enabled,
        },
        message="MCP server updated successfully",
    )


@router.delete("/{server_id}", response_model=dict)
async def delete_mcp_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete an MCP server (soft delete)
    """
    result = await db.execute(
        select(MCPServer).where(
            MCPServer.id == server_id,
            MCPServer.deleted_at == None
        )
    )
    server = result.scalar_one_or_none()

    if not server:
        return error_response(message="MCP server not found", code=404)

    from datetime import datetime
    server.deleted_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="mcp",
        resource_id=server_id,
        details=f"Deleted MCP server: {server.name}",
    )
    db.add(audit_log)
    await db.commit()

    return api_response(message="MCP server deleted successfully")
