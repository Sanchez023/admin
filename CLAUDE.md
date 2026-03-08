# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Claw Admin** is a unified admin control plane shared by desktop (LobsterAI) and web (Suna) clients. It provides centralized management for logs, SSO, LLM providers, skills, and MCP servers.

## Common Commands

```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start dev server (port 3006)
npm run build       # Build for production
npm run start       # Start production server (port 3006)
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
```

## Architecture

### Technology Stack
- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Storage**: In-memory with file persistence (`src/lib/store.ts`), Prisma schema ready for future DB migration

### API Structure
- `/api/admin/*` - Admin write/read APIs for CRUD operations
- `/api/client/*` - Client runtime read-only APIs (config snapshots, log ingestion)
- `/api/v1/*` - v1 API version (auth, admin, client)
- `/api/health` - Health check endpoint

### Key Modules

**Store** (`src/lib/store.ts`): In-memory store with file persistence. Manages providers, skills, MCP servers, SSO, logs, organizations, and users. Supports org-scoped data with global fallback.

**Auth** (`src/lib/auth.ts`, `src/lib/auth-v1.ts`): JWT-based authentication. Uses Bearer token for admin routes, API key for service access. Supports org-scoped access.

**HTTP Helpers** (`src/lib/http.ts`, `src/lib/http-v1.ts`): Response helpers (`ok()`, `fail()`) for consistent API responses.

**Types** (`src/lib/types.ts`): TypeScript DTOs for all entities (ProviderConfig, SkillConfig, MCPServer, SSOProvider, etc.).

### Data Model
- Multi-tenant with organization scoping (`orgId`)
- Global (null orgId) vs organization-specific data
- Sensitive data (API keys, secrets) is redacted in logs

### UI Pages
Located in `src/app/(dashboard)/*`:
- `/` - Dashboard overview
- `/skills` - Skill management
- `/mcp` - MCP server management
- `/sso` - SSO configuration
- `/logs` - System logs
- `/audit` - Audit logs

## Environment Variables

Copy `.env.example` to `.env.local`:
- `ADMIN_BOOTSTRAP_TOKEN` - Bearer token for admin routes
- `ADMIN_SERVICE_API_KEY` - API key for desktop/web service access
- `DEFAULT_ORG_SLUG` - Default tenant (default: "default")
- `DATABASE_URL`, `ENCRYPTION_KEY` - For future persistent mode
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - Optional default provider key

## Integration

Desktop (`desktop`) and Web (`web/backend`) connect via:
- `ADMIN_API_URL=http://localhost:3006/api`
- `ADMIN_TOKEN=<ADMIN_BOOTSTRAP_TOKEN>` (writable operations)
- `ADMIN_API_KEY=<ADMIN_SERVICE_API_KEY>` (read/log ingestion)
- `ADMIN_ORG=default`

## Design Documents (design/)

### Overall Design
- **Language**: Python 3.11
- **Architecture**: MVC pattern
- **Framework**: FastAPI with OpenAPI documentation
- **ORM**: SQLAlchemy-compatible ORM for PostgreSQL v17
- **LLM Integration**: litellm library for multi-provider support
- **External API**: litellm-proxy based model API exposure
- **Testing**: pytest for module testing

### Module Requirements

**Login Module** (`design/login_module.md`)
- Username/password authentication
- Auto logout after inactivity
- Registration with username, password, confirm password
- Password encryption for storage and transmission
- Login record table tracking login time, username, success status

**Role Module** (`design/role_module.md`)
- Two roles: Admin and Regular User
- User groups for batch permission management
- Admin can assign providers, models, MCP, skills to users/groups
- Configurable default accessible resources
- User group CRUD operations
- Union of group and individual permissions
- Admin has full permissions
- Database: roles, ugroups, user_groups, users tables

**Provider & Model Module** (`design/providerNmodel_module.md`)
- Create models from preset or custom provider templates
- Test connectivity on save
- Configure model capabilities (image generation, vision, reasoning)
- Filter by provider type, fuzzy search by model name
- Admin can enable/disable models
- Bind model instances to providers
- Fine-tune with temperature, top_p, etc. (litellm config)
- Multiple API keys per provider
- Database: model_providers, model_provider_api_key, llm_model_instances tables

**MCP & Skill Module** (`design/mcpNskill_module.md`)
- MCP server and Skill configuration management (待完善)

**Log & Audit Module** (`design/logNaudit_module.md`)
- Audit logs: CRUD operations on providers, models, MCP, skills
- System logs: Debug logs with module-based filtering
- Prefer decorators for audit injection
- Database: system_log, audit_log tables

**Thread Management Module** (`design/thread_management_module.md`)
- Store conversation context between users and models (待完善)

**API Auth Module** (`design/api_auth_module.md`)
- Admin creates API authorization清单 (auth list)
- Bind models, MCP, skills to users/groups
- Users get API endpoint + token from authorization list
- Log external API calls to audit logs
- Database: api_auth_list table
