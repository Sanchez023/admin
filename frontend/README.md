# Claw Admin

Unified admin control plane shared by:

- `desktop` (LobsterAI-based desktop client)
- `web` (Suna-based web stack)

This service owns centralized management for logs, SSO, LLM providers, skills, and MCP.

## Scope

- Client runtime APIs (`/api/client/*`) for desktop/web:
  - LLM, skills, MCP, and auth/SSO config snapshots
  - Batched client log ingestion
- Admin write/read APIs (`/api/admin/*`):
  - LLM provider management + active model
  - Skill management + skill config updates
  - MCP server CRUD + enabled switch
  - SSO policy + SSO provider management
  - System logs and audit logs
- Admin console UI at `/` for quick operations and validation.

## Quick Start

```bash
cd admin
npm install
cp .env.example .env.local
npm run dev
```

Default dev port: `3006`.

## API contract

- **OpenAPI 3.0**: See [openapi.yaml](openapi.yaml). Base path is `/api/v1` for auth, admin, and client APIs.
- **Environment**: See [docs/ENV.md](docs/ENV.md) for full variable list (Admin, Desktop, Web).

## Environment

Copy `.env.example` to `.env.local` and set:

- `ADMIN_BOOTSTRAP_TOKEN` for admin routes (`Authorization: Bearer ...`)
- `ADMIN_SERVICE_API_KEY` for desktop/web service access (`X-Api-Key`)
- `DEFAULT_ORG_SLUG` default tenant
- `DATABASE_URL`, `ENCRYPTION_KEY` for future persistent mode

## Integration Variables

Desktop (`desktop`):

- `ADMIN_API_URL=http://localhost:3006/api`
- `ADMIN_TOKEN=<ADMIN_BOOTSTRAP_TOKEN>` (for writable desktop operations)
- `ADMIN_API_KEY=<ADMIN_SERVICE_API_KEY>` (read/log ingestion fallback)
- `ADMIN_ORG=default`

Web backend (`web/backend`):

- `ADMIN_CONFIG_URL=http://localhost:3006/api` (or `ADMIN_API_URL` alias)
- `ADMIN_TOKEN=<ADMIN_BOOTSTRAP_TOKEN>` for full runtime config sync
- `ADMIN_API_KEY=<ADMIN_SERVICE_API_KEY>`
- `ADMIN_ORG=default`

## Current Storage Mode

- Current runtime store is in-memory with local file persistence (`src/lib/store.ts`).
- Snapshot file is written to `admin/.data/store.json` (path resolved from `process.cwd()`).
- Prisma schema/migration skeleton is still included for the next durable DB-backed step.
