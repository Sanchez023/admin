"""
Auth Router - Login, Register, Token Management
"""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, LoginRecord
from app.models.role import Role
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, LoginResponse
from app.utils.responses import api_response, error_response
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)
from app.config import settings

router = APIRouter()
security = HTTPBearer()


@router.post("/register")
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user
    """
    # Check password match
    if request.password != request.confirm_password:
        return error_response(message="Passwords do not match", code=400)

    # Check if username already exists
    result = await db.execute(
        select(User).where(
            User.username == request.username,
            User.is_deleted == False
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        return error_response(message="Username already exists", code=400)

    # Check if this is the first user (make them admin)
    result = await db.execute(select(User).where(User.is_deleted == False))
    existing_users = result.scalars().all()
    role_id = None
    if len(existing_users) == 0:
        # First user gets admin role
        result = await db.execute(select(Role).where(Role.name == "admin"))
        admin_role = result.scalar_one_or_none()
        if admin_role:
            role_id = admin_role.id

    # Create new user
    password_hash = get_password_hash(request.password)
    new_user = User(
        username=request.username,
        password_hash=password_hash,
        role_id=role_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Record login (for first login after registration)
    login_record = LoginRecord(
        user_id=new_user.id,
        username=new_user.username,
        success=True,
    )
    db.add(login_record)
    await db.commit()

    # Generate token
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return api_response(
        data={
            "user_id": new_user.id,
            "username": new_user.username,
            "role_id": new_user.role_id,
            "token": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
        },
        message="Registration successful",
    )


@router.post("/login")
async def login(
    request: LoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with username and password
    """
    # Find user
    result = await db.execute(
        select(User).where(
            User.username == request.username,
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()

    # Verify password
    success = False
    if user and verify_password(request.password, user.password_hash):
        success = True
        # Generate token
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # Get role name
        role_name = None
        if user.role_id:
            result = await db.execute(
                select(Role).where(Role.id == user.role_id)
            )
            role = result.scalar_one_or_none()
            if role:
                role_name = role.name

        # Record login
        login_record = LoginRecord(
            user_id=user.id,
            username=user.username,
            success=True,
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent"),
        )
        db.add(login_record)
        await db.commit()

        return api_response(
            data={
                "user_id": user.id,
                "username": user.username,
                "role": role_name,
                "token": {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                },
            },
            message="Login successful",
        )

    # Record failed login
    login_record = LoginRecord(
        user_id=user.id if user else None,
        username=request.username,
        success=False,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
    )
    db.add(login_record)
    await db.commit()

    return error_response(message="Invalid username or password", code=401)


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Logout (client-side token removal, server records logout)
    """
    # Get token from header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                # Could record logout here if needed
                pass

    return api_response(message="Logout successful")


@router.get("/me")
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """
    Get current user info
    """
    auth_header = request.headers.get("Authorization") if request else None
    if not auth_header or not auth_header.startswith("Bearer "):
        return error_response(message="Not authenticated", code=401)

    token = auth_header[7:]
    payload = decode_access_token(token)

    if not payload:
        return error_response(message="Invalid token", code=401)

    user_id = payload.get("sub")
    if not user_id:
        return error_response(message="Invalid token", code=401)

    # Get user
    result = await db.execute(
        select(User).where(
            User.id == int(user_id),
            User.is_deleted == False
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        return error_response(message="User not found", code=404)

    # Get role
    role_name = None
    if user.role_id:
        result = await db.execute(
            select(Role).where(Role.id == user.role_id)
        )
        role = result.scalar_one_or_none()
        if role:
            role_name = role.name

    return api_response(
        data={
            "id": user.id,
            "username": user.username,
            "role": role_name,
            "role_id": user.role_id,
            "permissions": user.permissions,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    )


@router.post("/refresh")
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token
    """
    auth_header = request.headers.get("Authorization") if request else None
    if not auth_header or not auth_header.startswith("Bearer "):
        return error_response(message="Not authenticated", code=401)

    token = auth_header[7:]
    payload = decode_access_token(token)

    if not payload:
        return error_response(message="Invalid token", code=401)

    user_id = payload.get("sub")
    if not user_id:
        return error_response(message="Invalid token", code=401)

    # Generate new token
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return api_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
    )
