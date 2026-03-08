# Admin 环境变量与配置

本文档约定 Admin、Desktop、Web 各端所需环境变量，与《多端架构与Admin管理端_实施方案》Phase 0 一致。

## Admin 服务

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是* | PostgreSQL 连接串。\* 当前支持内存+文件模式，启用 DB 后必填 |
| `REDIS_URL` | 否 | Redis 连接串，用于 Session/Refresh Token、限流、客户端配置缓存 |
| `ENCRYPTION_KEY` | 是* | 32 字节 hex 或 base64，用于 AES-256-GCM 加密 API Key、client_secret 等 |
| `JWT_SECRET` | 是* | JWT 签发与校验密钥，建议 32+ 字符 |
| `ADMIN_BOOTSTRAP_TOKEN` | 否 | 开发/占位用 Bearer Token，与现有鉴权兼容；生产建议仅用 JWT |
| `ADMIN_SERVICE_API_KEY` | 否 | 客户端（Desktop/Web）服务端拉取配置用 X-Api-Key |
| `DEFAULT_ORG_SLUG` | 否 | 默认租户 slug，默认 `default` |
| `NEXTAUTH_URL` | 否 | NextAuth 回调 base URL，如 `https://admin.example.com` |
| `NEXTAUTH_SECRET` | 否 | NextAuth 会话加密，与 JWT_SECRET 可共用 |

## Desktop 端

| 变量 | 说明 |
|------|------|
| `ADMIN_API_URL` | Admin API 根地址，如 `http://localhost:3006/api` 或 `https://admin.example.com/api` |
| `ADMIN_TOKEN` | 可写操作用 Bearer Token（或登录后获得的 JWT） |
| `ADMIN_API_KEY` | 只读/上报用 X-Api-Key（可选） |
| `ADMIN_ORG` | 当前租户 slug，如 `default` |

## Web 端（backend）

| 变量 | 说明 |
|------|------|
| `ADMIN_CONFIG_URL` / `ADMIN_API_URL` | Admin API 根地址 |
| `ADMIN_TOKEN` | 全量配置同步用 Bearer Token |
| `ADMIN_API_KEY` | 只读/上报用 X-Api-Key |
| `ADMIN_ORG` | 默认租户 slug |

## 认证与租户

- **认证**：`Authorization: Bearer <access_token>` 或 `X-Api-Key: <key>`（客户端只读/上报）。
- **租户**：Header `X-Org-Id: <slug>` 或 JWT 内 `org_id`；未传时使用 `DEFAULT_ORG_SLUG`。
- **错误格式**：统一 JSON `{ "code", "message", "details" }`（或 `success: false, error: { code, message, details }`）。

## 契约与版本

- API 基准路径：`/api/v1`（见 `admin/openapi.yaml`）。
- 开发前请将 `openapi.yaml` 与实现对齐，Desktop/Web 可据此生成客户端或 Mock。
