-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('desktop', 'web');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('debug', 'info', 'warn', 'error');

-- CreateEnum
CREATE TYPE "MCPTransportType" AS ENUM ('stdio', 'http');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'member',

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY['client:config:read', 'client:logs:write']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsoConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT,
    "clientSecretIv" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT,
    "baseUrl" TEXT,
    "apiKeyEnc" TEXT,
    "apiKeyIv" TEXT,
    "extraModels" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activeModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "skillId" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPServerConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transportType" "MCPTransportType" NOT NULL,
    "command" TEXT,
    "args" JSONB,
    "env" JSONB,
    "url" TEXT,
    "headersEnc" TEXT,
    "headersIv" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MCPServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "client" "ClientType",
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "details" JSONB,
    "level" "LogLevel" NOT NULL DEFAULT 'info',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "client" "ClientType",
    "message" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlacklist" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "exp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "UserRole_orgId_idx" ON "UserRole"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_orgId_key" ON "UserRole"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "SsoConfig_orgId_idx" ON "SsoConfig"("orgId");

-- CreateIndex
CREATE INDEX "ProviderConfig_orgId_idx" ON "ProviderConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_orgId_providerId_key" ON "ProviderConfig"("orgId", "providerId");

-- CreateIndex
CREATE INDEX "SkillConfig_orgId_idx" ON "SkillConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillConfig_orgId_skillId_key" ON "SkillConfig"("orgId", "skillId");

-- CreateIndex
CREATE INDEX "MCPServerConfig_orgId_idx" ON "MCPServerConfig"("orgId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_idx" ON "AuditLog"("orgId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_client_createdAt_idx" ON "AuditLog"("client", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "SystemLog_orgId_idx" ON "SystemLog"("orgId");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_client_createdAt_idx" ON "SystemLog"("client", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlacklist_jti_key" ON "TokenBlacklist"("jti");

-- CreateIndex
CREATE INDEX "TokenBlacklist_exp_idx" ON "TokenBlacklist"("exp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoConfig" ADD CONSTRAINT "SsoConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillConfig" ADD CONSTRAINT "SkillConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPServerConfig" ADD CONSTRAINT "MCPServerConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

