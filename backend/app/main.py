"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.utils.responses import api_response
from app.routers import (
    auth,
    users,
    roles,
    providers,
    models,
    mcp,
    skills,
    logs,
    audit,
    threads,
    api_auth,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="Claw Admin Backend",
    description="Unified admin control plane API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["roles"])
app.include_router(providers.router, prefix="/api/v1/providers", tags=["providers"])
app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(mcp.router, prefix="/api/v1/mcp", tags=["mcp"])
app.include_router(skills.router, prefix="/api/v1/skills", tags=["skills"])
app.include_router(logs.router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])
app.include_router(threads.router, prefix="/api/v1/threads", tags=["threads"])
app.include_router(api_auth.router, prefix="/api/v1/api-auth", tags=["api-auth"])


@app.get("/")
async def root():
    """Root endpoint"""
    return api_response(data={"name": "Claw Admin Backend", "version": "1.0.0"})


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return api_response(data={"status": "healthy"})
