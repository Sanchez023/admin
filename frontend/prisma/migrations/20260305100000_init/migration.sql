-- NOTE:
-- Prisma schema keeps orgId nullable for global defaults.
-- Use partial unique indexes to prevent duplicate global rows.

CREATE UNIQUE INDEX IF NOT EXISTS provider_global_unique
  ON "ProviderConfig" ("providerId")
  WHERE "orgId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS provider_org_unique
  ON "ProviderConfig" ("orgId", "providerId")
  WHERE "orgId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_global_unique
  ON "SkillConfig" ("skillId")
  WHERE "orgId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_org_unique
  ON "SkillConfig" ("orgId", "skillId")
  WHERE "orgId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sso_provider_global_unique
  ON "SSOProviderConfig" ("providerType", "issuerUrl", "clientId")
  WHERE "orgId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sso_provider_org_unique
  ON "SSOProviderConfig" ("orgId", "providerType", "issuerUrl", "clientId")
  WHERE "orgId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sso_policy_global_unique
  ON "SSOPolicy" ((1))
  WHERE "orgId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sso_policy_org_unique
  ON "SSOPolicy" ("orgId")
  WHERE "orgId" IS NOT NULL;
