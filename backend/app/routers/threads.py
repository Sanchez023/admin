"""
Threads Router - Thread and Message Management
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.user import User
from app.models.thread import Thread, Message
from app.models.model_instance import ModelInstance
from app.dependencies import get_current_user
from app.utils.responses import api_response, error_response

router = APIRouter()


# ============ Thread Endpoints ============

@router.get("", response_model=dict)
async def list_threads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    model_instance_id: Optional[int] = Query(None, description="Filter by model instance"),
    keyword: Optional[str] = Query(None, description="Search in title"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of threads for current user
    """
    query = select(Thread).where(Thread.user_id == current_user.id)

    if model_instance_id:
        query = query.where(Thread.model_instance_id == model_instance_id)

    if keyword:
        query = query.where(Thread.title.contains(keyword))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(desc(Thread.updated_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    threads = result.scalars().all()

    thread_list = []
    for thread in threads:
        # Get model instance name if available
        model_name = None
        if thread.model_instance_id:
            result = await db.execute(
                select(ModelInstance).where(ModelInstance.id == thread.model_instance_id)
            )
            model = result.scalar_one_or_none()
            model_name = model.name if model else None

        # Get message count
        result = await db.execute(
            select(func.count()).select_from(Message).where(Message.thread_id == thread.id)
        )
        message_count = result.scalar()

        thread_list.append({
            "id": thread.id,
            "title": thread.title,
            "user_id": thread.user_id,
            "model_instance_id": thread.model_instance_id,
            "model_name": model_name,
            "message_count": message_count,
            "metadata": thread.metadata,
            "created_at": thread.created_at.isoformat() if thread.created_at else None,
            "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
        })

    return api_response(
        data={
            "threads": thread_list,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{thread_id}", response_model=dict)
async def get_thread(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific thread by ID
    """
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    # Get model instance if available
    model_name = None
    if thread.model_instance_id:
        result = await db.execute(
            select(ModelInstance).where(ModelInstance.id == thread.model_instance_id)
        )
        model = result.scalar_one_or_none()
        model_name = model.name if model else None

    # Get messages
    result = await db.execute(
        select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return api_response(
        data={
            "id": thread.id,
            "title": thread.title,
            "user_id": thread.user_id,
            "model_instance_id": thread.model_instance_id,
            "model_name": model_name,
            "metadata": thread.metadata,
            "created_at": thread.created_at.isoformat() if thread.created_at else None,
            "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "metadata": m.metadata,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        }
    )


@router.post("", response_model=dict)
async def create_thread(
    title: str = Query(..., description="Thread title"),
    model_instance_id: Optional[int] = Query(None, description="Model instance ID"),
    metadata: Optional[dict] = Query(None, description="Additional metadata"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new thread
    """
    # Verify model instance if provided
    if model_instance_id:
        result = await db.execute(
            select(ModelInstance).where(
                ModelInstance.id == model_instance_id,
                ModelInstance.deleted_at == None
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return error_response(message="Model instance not found", code=404)

    new_thread = Thread(
        user_id=current_user.id,
        title=title,
        model_instance_id=model_instance_id,
        metadata=metadata,
    )
    db.add(new_thread)
    await db.commit()
    await db.refresh(new_thread)

    return api_response(
        data={
            "id": new_thread.id,
            "title": new_thread.title,
            "user_id": new_thread.user_id,
            "model_instance_id": new_thread.model_instance_id,
            "created_at": new_thread.created_at.isoformat() if new_thread.created_at else None,
        },
        message="Thread created successfully",
        code=201,
    )


@router.put("/{thread_id}", response_model=dict)
async def update_thread(
    thread_id: int,
    title: Optional[str] = Query(None, description="Thread title"),
    model_instance_id: Optional[int] = Query(None, description="Model instance ID"),
    metadata: Optional[dict] = Query(None, description="Additional metadata"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a thread
    """
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    if title is not None:
        thread.title = title

    if model_instance_id is not None:
        # Verify model instance if provided
        if model_instance_id:
            result = await db.execute(
                select(ModelInstance).where(
                    ModelInstance.id == model_instance_id,
                    ModelInstance.deleted_at == None
                )
            )
            model = result.scalar_one_or_none()
            if not model:
                return error_response(message="Model instance not found", code=404)
        thread.model_instance_id = model_instance_id

    if metadata is not None:
        thread.metadata = metadata

    await db.commit()
    await db.refresh(thread)

    return api_response(
        data={
            "id": thread.id,
            "title": thread.title,
            "model_instance_id": thread.model_instance_id,
            "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
        },
        message="Thread updated successfully",
    )


@router.delete("/{thread_id}", response_model=dict)
async def delete_thread(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a thread and all its messages
    """
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    # Delete all messages first
    await db.execute(
        Message.__table__.delete().where(Message.thread_id == thread_id)
    )

    # Delete thread
    await db.execute(
        Thread.__table__.delete().where(Thread.id == thread_id)
    )

    await db.commit()

    return api_response(message="Thread deleted successfully")


# ============ Message Endpoints ============

@router.get("/{thread_id}/messages", response_model=dict)
async def list_messages(
    thread_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get messages for a thread
    """
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    query = select(Message).where(Message.thread_id == thread_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Message.created_at).offset(offset).limit(page_size)

    result = await db.execute(query)
    messages = result.scalars().all()

    return api_response(
        data={
            "messages": [
                {
                    "id": m.id,
                    "thread_id": m.thread_id,
                    "role": m.role,
                    "content": m.content,
                    "metadata": m.metadata,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.post("/{thread_id}/messages", response_model=dict)
async def create_message(
    thread_id: int,
    role: str = Query(..., description="Message role (user, assistant, system)"),
    content: str = Query(..., description="Message content"),
    metadata: Optional[dict] = Query(None, description="Additional metadata"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a message to a thread
    """
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    # Validate role
    if role not in ["user", "assistant", "system"]:
        return error_response(message="Invalid role. Must be user, assistant, or system", code=400)

    new_message = Message(
        thread_id=thread_id,
        role=role,
        content=content,
        metadata=metadata,
    )
    db.add(new_message)

    # Update thread's updated_at
    from datetime import datetime
    thread.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(new_message)

    return api_response(
        data={
            "id": new_message.id,
            "thread_id": new_message.thread_id,
            "role": new_message.role,
            "content": new_message.content,
            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        },
        message="Message created successfully",
        code=201,
    )


@router.delete("/{thread_id}/messages/{message_id}", response_model=dict)
async def delete_message(
    thread_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a message from a thread
    """
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == thread_id,
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()

    if not thread:
        return error_response(message="Thread not found", code=404)

    # Find message
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.thread_id == thread_id
        )
    )
    message = result.scalar_one_or_none()

    if not message:
        return error_response(message="Message not found", code=404)

    await db.delete(message)
    await db.commit()

    return api_response(message="Message deleted successfully")
