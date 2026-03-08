import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type {
  AuditLogDto,
  MCPServerDto,
  MemberDto,
  OrganizationDto,
  OrgRole,
  ProviderConfigDto,
  SkillConfigDto,
  SSOProviderDto,
  SSOPolicyDto,
  SystemLogDto,
  UserDto,
  UserRoleDto,
} from './types';

const now = () => new Date().toISOString();
const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';
const toOrgId = (orgSlug?: string): string | null => (orgSlug && orgSlug !== DEFAULT_ORG ? orgSlug : null);
const isSuperScope = (orgSlug?: string): boolean => toOrgId(orgSlug) === null;
const canManageRow = (rowOrgId: string | null, orgSlug?: string): boolean => {
  if (isSuperScope(orgSlug)) {
    return true;
  }
  return rowOrgId === toOrgId(orgSlug);
};
const normalizeScopedOrgId = (requestedOrgId: string | null | undefined, orgSlug?: string): string | null => {
  if (!isSuperScope(orgSlug)) {
    return toOrgId(orgSlug);
  }
  return requestedOrgId ?? null;
};

const MAX_LOG_ROWS = 20_000;
const MAX_AUDIT_ROWS = 10_000;
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi,
];
const SENSITIVE_KEYS = ['api_key', 'apikey', 'authorization', 'token', 'secret', 'password', 'client_secret', 'cookie'];
const OPENAI_LIKE_PROVIDER_IDS = new Set([
  'openai',
  'openrouter',
  'azure-openai',
  'gemini',
  'qwen',
  'moonshot',
  'zhipu',
  'volcengine',
  'youdaozhiyun',
  'ollama',
]);

function normalizeProviderApiType(
  providerId: string | null | undefined,
  apiType?: string | null,
): 'anthropic' | 'openai' {
  if (apiType === 'anthropic' || apiType === 'openai') {
    return apiType;
  }

  const normalizedProviderId = String(providerId || '').trim().toLowerCase();
  if (!normalizedProviderId) {
    return 'openai';
  }
  if (OPENAI_LIKE_PROVIDER_IDS.has(normalizedProviderId)) {
    return 'openai';
  }
  if (normalizedProviderId === 'anthropic' || normalizedProviderId.includes('claude')) {
    return 'anthropic';
  }
  return 'openai';
}

function mergeScopedBy<T extends { orgId: string | null }>(
  rows: T[],
  orgSlug: string | undefined,
  keyOf: (item: T) => string,
): T[] {
  const orgId = toOrgId(orgSlug);
  const global = rows.filter((item) => item.orgId === null);
  if (!orgId) {
    return global;
  }
  const local = rows.filter((item) => item.orgId === orgId);
  const seen = new Set(local.map(keyOf));
  return [...local, ...global.filter((item) => !seen.has(keyOf(item)))];
}

function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source);
}

function parseDateToMs(value?: string): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function redactText(input: string): string {
  return SECRET_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), input);
}

function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeUnknown(item, depth + 1));

  const next: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (SENSITIVE_KEYS.some((fragment) => normalized.includes(fragment))) {
      next[key] = '[REDACTED]';
      continue;
    }
    next[key] = sanitizeUnknown(val, depth + 1);
  }
  return next;
}

function sanitizeLogMessage(message: string): string {
  return redactText(message).slice(0, 2000);
}

const providers: ProviderConfigDto[] = [
  {
    id: randomUUID(),
    orgId: null,
    providerId: 'openai',
    apiType: 'openai',
    displayName: 'OpenAI-Compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    apiKeyMasked: process.env.OPENAI_API_KEY ? 'sk-***' : '',
    extraModels: [],
    isActive: true,
    activeModel: 'gpt-4.1-mini',
    createdAt: now(),
    updatedAt: now(),
  },
];

const skills: SkillConfigDto[] = [
  {
    id: randomUUID(),
    orgId: null,
    skillId: 'docx',
    name: 'Docx',
    enabled: true,
    sortOrder: 10,
    config: {},
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    orgId: null,
    skillId: 'web-search',
    name: 'Web Search',
    enabled: true,
    sortOrder: 20,
    config: {},
    createdAt: now(),
    updatedAt: now(),
  },
];

const mcpServers: MCPServerDto[] = [];
const ssoProviders: SSOProviderDto[] = [];
const ssoPolicies: SSOPolicyDto[] = [
  {
    orgId: null,
    mode: 'optional',
    autoProvision: true,
    defaultRole: 'member',
    updatedAt: now(),
  },
];
const logs: SystemLogDto[] = [];
const auditLogs: AuditLogDto[] = [];

const organizations: OrganizationDto[] = [
  {
    id: randomUUID(),
    name: 'Default',
    slug: 'default',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

const users: (UserDto & { passwordHash?: string })[] = [];
const userRoles: UserRoleDto[] = [];

type PersistedStoreSnapshot = {
  providers: ProviderConfigDto[];
  skills: SkillConfigDto[];
  mcpServers: MCPServerDto[];
  ssoProviders: SSOProviderDto[];
  ssoPolicies: SSOPolicyDto[];
  logs: SystemLogDto[];
  auditLogs: AuditLogDto[];
  organizations: OrganizationDto[];
};

const STORE_FILE_PATH = join(process.cwd(), '.data', 'store.json');

function parseArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

function persistStoreSnapshot(): void {
  try {
    mkdirSync(dirname(STORE_FILE_PATH), { recursive: true });
    const snapshot: PersistedStoreSnapshot = {
      providers,
      skills,
      mcpServers,
      ssoProviders,
      ssoPolicies,
      logs,
      auditLogs,
      organizations,
    };
    writeFileSync(STORE_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    console.warn('[admin/store] Failed to persist store snapshot:', error);
  }
}

function hydrateStoreFromDisk(): void {
  try {
    const raw = readFileSync(STORE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStoreSnapshot>;

    if (Array.isArray(parsed.providers)) {
      replaceArray(
        providers,
        parseArray<ProviderConfigDto>(parsed.providers).map((item) => ({
          ...item,
          apiType: normalizeProviderApiType(item.providerId, item.apiType),
        })),
      );
    }
    if (Array.isArray(parsed.skills)) {
      replaceArray(skills, parseArray<SkillConfigDto>(parsed.skills));
    }
    if (Array.isArray(parsed.mcpServers)) {
      replaceArray(mcpServers, parseArray<MCPServerDto>(parsed.mcpServers));
    }
    if (Array.isArray(parsed.ssoProviders)) {
      replaceArray(ssoProviders, parseArray<SSOProviderDto>(parsed.ssoProviders));
    }
    if (Array.isArray(parsed.ssoPolicies)) {
      replaceArray(ssoPolicies, parseArray<SSOPolicyDto>(parsed.ssoPolicies));
    }
    if (Array.isArray(parsed.logs)) {
      replaceArray(logs, parseArray<SystemLogDto>(parsed.logs));
    }
    if (Array.isArray(parsed.auditLogs)) {
      replaceArray(auditLogs, parseArray<AuditLogDto>(parsed.auditLogs));
    }
    if (Array.isArray(parsed.organizations)) {
      replaceArray(organizations, parseArray<OrganizationDto>(parsed.organizations));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[admin/store] Failed to hydrate store snapshot:', error);
    }
  }
}

hydrateStoreFromDisk();

export function listProviders(orgSlug?: string): ProviderConfigDto[] {
  return mergeScopedBy(providers, orgSlug, (item) => item.providerId);
}

export function createProvider(input: {
  orgId?: string | null;
  providerId: string;
  apiType?: 'anthropic' | 'openai';
  displayName?: string | null;
  baseUrl?: string | null;
  apiKey?: string;
  extraModels?: { id: string; name: string }[];
  isActive?: boolean;
  activeModel?: string | null;
}, orgSlug?: string): ProviderConfigDto {
  const orgId = normalizeScopedOrgId(
    input.orgId === undefined ? toOrgId(orgSlug) : input.orgId,
    orgSlug,
  );
  if (providers.some((item) => item.orgId === orgId && item.providerId === input.providerId)) {
    throw new Error('Provider already exists');
  }
  const row: ProviderConfigDto = {
    id: randomUUID(),
    orgId: orgId ?? null,
    providerId: input.providerId,
    apiType: normalizeProviderApiType(input.providerId, input.apiType),
    displayName: input.displayName ?? null,
    baseUrl: input.baseUrl ?? null,
    apiKey: input.apiKey?.trim() || undefined,
    apiKeyMasked: input.apiKey?.trim() ? 'sk-***' : undefined,
    extraModels: input.extraModels ?? [],
    isActive: input.isActive ?? false,
    activeModel: input.activeModel ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  providers.push(row);

  if (row.isActive) {
    setActiveProvider(
      row.providerId,
      row.activeModel || 'gpt-4.1-mini',
      row.orgId === null ? undefined : row.orgId,
    );
  } else {
    persistStoreSnapshot();
  }

  return row;
}

export function listSkills(orgSlug?: string): SkillConfigDto[] {
  return mergeScopedBy(skills, orgSlug, (item) => item.skillId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listMcpServers(orgSlug?: string): MCPServerDto[] {
  return mergeScopedBy(mcpServers, orgSlug, (item) => item.name);
}

export function listSsoProviders(orgSlug?: string): SSOProviderDto[] {
  return mergeScopedBy(
    ssoProviders,
    orgSlug,
    (item) => `${item.providerType}:${item.issuerUrl}:${item.clientId}`,
  );
}

export function getActiveModel(orgSlug?: string): { providerId: string; model: string } {
  const active = listProviders(orgSlug).find((item) => item.isActive);
  if (!active) {
    return { providerId: 'openai', model: 'gpt-4.1-mini' };
  }
  return {
    providerId: active.providerId,
    model: active.activeModel || 'gpt-4.1-mini',
  };
}

export function upsertProvider(
  id: string,
  patch: Partial<ProviderConfigDto>,
  orgSlug?: string,
): ProviderConfigDto | null {
  const found = providers.find((item) => item.id === id);
  if (!found || !canManageRow(found.orgId, orgSlug)) {
    return null;
  }
  if (
    patch.providerId &&
    patch.providerId !== found.providerId &&
    providers.some((item) => item.id !== found.id && item.orgId === found.orgId && item.providerId === patch.providerId)
  ) {
    throw new Error('Provider already exists');
  }
  Object.assign(found, patch, { updatedAt: now() });
  if (patch.apiType !== undefined) {
    found.apiType = normalizeProviderApiType(found.providerId, patch.apiType);
  } else if (!found.apiType) {
    found.apiType = normalizeProviderApiType(found.providerId);
  }
  if (typeof patch.apiKey === 'string') {
    found.apiKey = patch.apiKey.trim() || undefined;
  }
  if (patch.apiKey && patch.apiKey.trim()) {
    found.apiKeyMasked = 'sk-***';
  }
  if (patch.isActive === true) {
    for (const item of providers) {
      if (item.orgId === found.orgId && item.id !== found.id) {
        item.isActive = false;
      }
    }
  }
  persistStoreSnapshot();
  return found;
}

export function deleteProvider(id: string, orgSlug?: string): boolean {
  const idx = providers.findIndex((item) => item.id === id);
  if (idx === -1 || !canManageRow(providers[idx].orgId, orgSlug)) return false;
  providers.splice(idx, 1);
  persistStoreSnapshot();
  return true;
}

export function setActiveProvider(providerId: string, model: string, orgSlug?: string): boolean {
  const scopeOrgId = toOrgId(orgSlug);
  const items = providers.filter((item) => item.orgId === scopeOrgId);
  if (!items.some((item) => item.providerId === providerId)) {
    return false;
  }
  for (const item of items) {
    item.isActive = item.providerId === providerId;
    if (item.providerId === providerId) {
      item.activeModel = model;
      item.updatedAt = now();
    }
  }
  persistStoreSnapshot();
  return true;
}

export function createSkill(input: {
  orgId?: string | null;
  skillId: string;
  name?: string;
  enabled?: boolean;
  sortOrder?: number;
  config?: Record<string, string>;
}, orgSlug?: string): SkillConfigDto {
  const orgId = normalizeScopedOrgId(
    input.orgId === undefined ? toOrgId(orgSlug) : input.orgId,
    orgSlug,
  );
  if (skills.some((item) => item.orgId === orgId && item.skillId === input.skillId)) {
    throw new Error('Skill already exists');
  }
  const row: SkillConfigDto = {
    id: randomUUID(),
    orgId,
    skillId: input.skillId,
    name: input.name || input.skillId,
    enabled: input.enabled ?? true,
    sortOrder: input.sortOrder ?? 100,
    config: input.config ?? {},
    createdAt: now(),
    updatedAt: now(),
  };
  skills.push(row);
  persistStoreSnapshot();
  return row;
}

export function updateSkill(
  id: string,
  patch: Partial<SkillConfigDto>,
  orgSlug?: string,
): SkillConfigDto | null {
  const found = skills.find((item) => item.id === id);
  if (!found || !canManageRow(found.orgId, orgSlug)) {
    return null;
  }
  if (
    patch.skillId &&
    patch.skillId !== found.skillId &&
    skills.some((item) => item.id !== found.id && item.orgId === found.orgId && item.skillId === patch.skillId)
  ) {
    throw new Error('Skill already exists');
  }
  Object.assign(found, patch, { updatedAt: now() });
  persistStoreSnapshot();
  return found;
}

export function deleteSkill(id: string, orgSlug?: string): boolean {
  const idx = skills.findIndex((item) => item.id === id);
  if (idx === -1 || !canManageRow(skills[idx].orgId, orgSlug)) return false;
  skills.splice(idx, 1);
  persistStoreSnapshot();
  return true;
}

export function createMcp(input: Omit<MCPServerDto, 'id' | 'createdAt' | 'updatedAt'>): MCPServerDto {
  if (mcpServers.some((item) => item.orgId === input.orgId && item.name === input.name)) {
    throw new Error('MCP server already exists');
  }
  const row: MCPServerDto = {
    id: randomUUID(),
    ...input,
    createdAt: now(),
    updatedAt: now(),
  };
  mcpServers.push(row);
  persistStoreSnapshot();
  return row;
}

export function updateMcp(id: string, patch: Partial<MCPServerDto>, orgSlug?: string): MCPServerDto | null {
  const found = mcpServers.find((item) => item.id === id);
  if (!found || !canManageRow(found.orgId, orgSlug)) {
    return null;
  }
  if (
    patch.name &&
    patch.name !== found.name &&
    mcpServers.some((item) => item.id !== found.id && item.orgId === found.orgId && item.name === patch.name)
  ) {
    throw new Error('MCP server already exists');
  }
  Object.assign(found, patch, { updatedAt: now() });
  persistStoreSnapshot();
  return found;
}

export function deleteMcp(id: string, orgSlug?: string): boolean {
  const index = mcpServers.findIndex((item) => item.id === id);
  if (index >= 0 && canManageRow(mcpServers[index].orgId, orgSlug)) {
    mcpServers.splice(index, 1);
    persistStoreSnapshot();
    return true;
  }
  return false;
}

export function createSsoProvider(input: {
  orgId?: string | null;
  providerType: 'oidc' | 'saml';
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  scopes?: string[];
  redirectUri: string;
  enabled?: boolean;
}, orgSlug?: string): SSOProviderDto {
  const orgId = normalizeScopedOrgId(
    input.orgId === undefined ? toOrgId(orgSlug) : input.orgId,
    orgSlug,
  );
  if (
    ssoProviders.some(
      (item) =>
        item.orgId === orgId &&
        item.providerType === input.providerType &&
        item.issuerUrl === input.issuerUrl &&
        item.clientId === input.clientId,
    )
  ) {
    throw new Error('SSO provider already exists');
  }
  const secret = input.clientSecret?.trim() || undefined;
  const row: SSOProviderDto = {
    id: randomUUID(),
    orgId: orgId ?? null,
    providerType: input.providerType,
    name: input.name,
    issuerUrl: input.issuerUrl,
    clientId: input.clientId,
    clientSecret: secret,
    clientSecretMasked: secret ? '***' : undefined,
    authorizationEndpoint: input.authorizationEndpoint,
    tokenEndpoint: input.tokenEndpoint,
    userInfoEndpoint: input.userInfoEndpoint,
    scopes: input.scopes && input.scopes.length > 0 ? input.scopes : ['openid', 'profile', 'email'],
    redirectUri: input.redirectUri,
    enabled: input.enabled ?? false,
    createdAt: now(),
    updatedAt: now(),
  };
  ssoProviders.push(row);
  persistStoreSnapshot();
  return row;
}

export function updateSsoProvider(
  id: string,
  patch: Partial<SSOProviderDto>,
  orgSlug?: string,
): SSOProviderDto | null {
  const found = ssoProviders.find((item) => item.id === id);
  if (!found || !canManageRow(found.orgId, orgSlug)) {
    return null;
  }
  if (
    (patch.providerType || patch.issuerUrl || patch.clientId) &&
    ssoProviders.some((item) => {
      if (item.id === found.id || item.orgId !== found.orgId) return false;
      return (
        (patch.providerType ?? found.providerType) === item.providerType &&
        (patch.issuerUrl ?? found.issuerUrl) === item.issuerUrl &&
        (patch.clientId ?? found.clientId) === item.clientId
      );
    })
  ) {
    throw new Error('SSO provider already exists');
  }
  Object.assign(found, patch, { updatedAt: now() });
  if (typeof patch.clientSecret === 'string') {
    found.clientSecret = patch.clientSecret.trim() || undefined;
    found.clientSecretMasked = patch.clientSecret.trim() ? '***' : undefined;
  }
  persistStoreSnapshot();
  return found;
}

export function deleteSsoProvider(id: string, orgSlug?: string): boolean {
  const index = ssoProviders.findIndex((item) => item.id === id);
  if (index >= 0 && canManageRow(ssoProviders[index].orgId, orgSlug)) {
    ssoProviders.splice(index, 1);
    persistStoreSnapshot();
    return true;
  }
  return false;
}

export function getSsoPolicy(orgSlug?: string): SSOPolicyDto {
  const orgId = toOrgId(orgSlug);
  if (orgId) {
    const local = ssoPolicies.find((item) => item.orgId === orgId);
    if (local) {
      return local;
    }
  }
  const global = ssoPolicies.find((item) => item.orgId === null);
  if (global) {
    return global;
  }
  return {
    orgId: orgId ?? null,
    mode: 'optional',
    autoProvision: true,
    defaultRole: 'member',
    updatedAt: now(),
  };
}

export function upsertSsoPolicy(
  patch: Partial<Omit<SSOPolicyDto, 'orgId'>>,
  orgSlug?: string,
): SSOPolicyDto {
  const orgId = toOrgId(orgSlug);
  const found = ssoPolicies.find((item) => item.orgId === orgId);
  if (!found) {
    const created: SSOPolicyDto = {
      orgId: orgId ?? null,
      mode: patch.mode ?? 'optional',
      autoProvision: patch.autoProvision ?? true,
      defaultRole: patch.defaultRole ?? 'member',
      updatedAt: now(),
    };
    ssoPolicies.push(created);
    persistStoreSnapshot();
    return created;
  }
  Object.assign(found, patch, { updatedAt: now() });
  persistStoreSnapshot();
  return found;
}

export function getClientAuthConfig(orgSlug?: string): {
  policy: SSOPolicyDto;
  providers: Array<Omit<SSOProviderDto, 'clientSecret'>>;
} {
  return {
    policy: getSsoPolicy(orgSlug),
    providers: listSsoProviders(orgSlug).map(({ clientSecret, ...item }) => item),
  };
}

export function appendAuditLog(
  input: Omit<AuditLogDto, 'id' | 'orgId' | 'createdAt'> & { orgId?: string | null },
  orgSlug?: string,
): AuditLogDto {
  const orgId = input.orgId === undefined ? toOrgId(orgSlug) : input.orgId;
  const row: AuditLogDto = {
    id: randomUUID(),
    orgId: orgId ?? null,
    actorRole: input.actorRole,
    action: input.action,
    resource: input.resource,
    targetId: input.targetId,
    details: sanitizeUnknown(input.details) as Record<string, unknown> | undefined,
    createdAt: now(),
  };
  auditLogs.push(row);
  if (auditLogs.length > MAX_AUDIT_ROWS) {
    auditLogs.splice(0, auditLogs.length - MAX_AUDIT_ROWS);
  }
  persistStoreSnapshot();
  return row;
}

export function listAuditLogs(orgSlug?: string): AuditLogDto[] {
  const orgId = toOrgId(orgSlug);
  return auditLogs
    .filter((item) => item.orgId === orgId)
    .slice(-1000)
    .slice()
    .reverse();
}

export function appendLogs(client: 'desktop' | 'web', items: Array<{ level: string; message: string; action?: string; resource?: string; meta?: Record<string, unknown> }>, orgSlug?: string): void {
  const orgId = toOrgId(orgSlug);
  for (const item of items) {
    logs.push({
      id: randomUUID(),
      orgId,
      client,
      level: (item.level as SystemLogDto['level']) || 'info',
      message: sanitizeLogMessage(item.message),
      meta: {
        action: item.action,
        resource: item.resource,
        ...(sanitizeUnknown(item.meta || {}) as Record<string, unknown>),
      },
      createdAt: now(),
    });
  }
  if (logs.length > MAX_LOG_ROWS) {
    logs.splice(0, logs.length - MAX_LOG_ROWS);
  }
  persistStoreSnapshot();
}

export function listLogs(orgSlug?: string): SystemLogDto[] {
  const orgId = toOrgId(orgSlug);
  return logs
    .filter((item) => item.orgId === orgId)
    .slice(-1000)
    .slice()
    .reverse();
}

export type LogsFilter = {
  startTime?: string;
  endTime?: string;
  client?: 'desktop' | 'web';
  level?: string;
  action?: string;
  limit?: number;
  offset?: number;
};

export function listLogsFiltered(orgSlug: string | undefined, filter: LogsFilter): { items: SystemLogDto[]; total: number } {
  const orgId = toOrgId(orgSlug);
  const startMs = parseDateToMs(filter.startTime);
  const endMs = parseDateToMs(filter.endTime);
  let result = logs
    .filter((item) => item.orgId === orgId)
    .slice()
    .reverse();
  if (startMs !== null) {
    result = result.filter((item) => {
      const createdMs = parseDateToMs(item.createdAt);
      return createdMs !== null && createdMs >= startMs;
    });
  }
  if (endMs !== null) {
    result = result.filter((item) => {
      const createdMs = parseDateToMs(item.createdAt);
      return createdMs !== null && createdMs <= endMs;
    });
  }
  if (filter.client) {
    result = result.filter((item) => item.client === filter.client);
  }
  if (filter.level) {
    result = result.filter((item) => item.level === filter.level);
  }
  if (filter.action) {
    result = result.filter((item) => {
      const action = (item.meta as { action?: unknown } | undefined)?.action;
      return typeof action === 'string' && action.includes(filter.action!);
    });
  }
  const total = result.length;
  const limit = Math.min(filter.limit ?? 50, 200);
  const offset = Math.max(filter.offset ?? 0, 0);
  result = result.slice(offset, offset + limit);
  return { items: result, total };
}

export type AuditFilter = {
  startTime?: string;
  endTime?: string;
  action?: string;
  limit?: number;
  offset?: number;
};

export function listAuditLogsFiltered(orgSlug: string | undefined, filter: AuditFilter): { items: AuditLogDto[]; total: number } {
  const orgId = toOrgId(orgSlug);
  const startMs = parseDateToMs(filter.startTime);
  const endMs = parseDateToMs(filter.endTime);
  let result = auditLogs
    .filter((item) => item.orgId === orgId)
    .slice(-1000)
    .slice()
    .reverse();
  if (startMs !== null) {
    result = result.filter((item) => {
      const createdMs = parseDateToMs(item.createdAt);
      return createdMs !== null && createdMs >= startMs;
    });
  }
  if (endMs !== null) {
    result = result.filter((item) => {
      const createdMs = parseDateToMs(item.createdAt);
      return createdMs !== null && createdMs <= endMs;
    });
  }
  if (filter.action) {
    result = result.filter((item) => item.action.includes(filter.action!));
  }
  const total = result.length;
  const limit = Math.min(filter.limit ?? 50, 200);
  const offset = Math.max(filter.offset ?? 0, 0);
  result = result.slice(offset, offset + limit);
  return { items: result, total };
}

export function listOrganizations(): OrganizationDto[] {
  return [...organizations];
}

export function getOrganization(id: string): OrganizationDto | null {
  return organizations.find((o) => o.id === id) ?? null;
}

export function getOrganizationBySlug(slug: string): OrganizationDto | null {
  return organizations.find((o) => o.slug === slug) ?? null;
}

export function createOrganization(input: {
  name: string;
  slug: string;
  isActive?: boolean;
}): OrganizationDto {
  if (organizations.some((o) => o.slug === input.slug)) {
    throw new Error('Organization slug already exists');
  }
  const row: OrganizationDto = {
    id: randomUUID(),
    name: input.name,
    slug: input.slug,
    isActive: input.isActive ?? true,
    createdAt: now(),
    updatedAt: now(),
  };
  organizations.push(row);
  persistStoreSnapshot();
  return row;
}

export function updateOrganization(id: string, patch: Partial<Pick<OrganizationDto, 'name' | 'slug' | 'isActive'>>): OrganizationDto | null {
  const found = organizations.find((o) => o.id === id);
  if (!found) return null;
  if (patch.slug !== undefined && patch.slug !== found.slug && organizations.some((o) => o.slug === patch.slug)) {
    throw new Error('Organization slug already exists');
  }
  Object.assign(found, patch, { updatedAt: now() });
  persistStoreSnapshot();
  return found;
}

export function deleteOrganization(id: string): boolean {
  const idx = organizations.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  if (organizations[idx].slug === 'default') {
    throw new Error('Cannot delete default organization');
  }
  organizations.splice(idx, 1);
  userRoles.splice(0, userRoles.length, ...userRoles.filter((r) => r.orgId !== id));
  persistStoreSnapshot();
  return true;
}

function toUserDto(u: UserDto & { passwordHash?: string }): UserDto {
  const { passwordHash: _, ...dto } = u;
  return dto;
}

export function listUsers(filter?: { orgId?: string; role?: OrgRole; isActive?: boolean; q?: string }): { items: UserDto[]; total: number } {
  let result = users.map(toUserDto);
  if (filter?.orgId) {
    const userIds = new Set(userRoles.filter((r) => r.orgId === filter.orgId).map((r) => r.userId));
    result = result.filter((u) => userIds.has(u.id));
  }
  if (filter?.role) {
    const userIds = new Set(userRoles.filter((r) => r.role === filter.role).map((r) => r.userId));
    result = result.filter((u) => userIds.has(u.id));
  }
  if (filter?.isActive !== undefined) {
    result = result.filter((u) => u.isActive === filter.isActive);
  }
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    result = result.filter((u) => u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q));
  }
  const total = result.length;
  return { items: result, total };
}

export function getUser(id: string): (UserDto & { roles?: { orgId: string; orgSlug: string; role: OrgRole }[] }) | null {
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  const roles = userRoles
    .filter((r) => r.userId === id)
    .map((r) => {
      const org = organizations.find((o) => o.id === r.orgId);
      return { orgId: r.orgId, orgSlug: org?.slug ?? r.orgId, role: r.role };
    });
  return { ...toUserDto(u), roles };
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
  isSuperAdmin?: boolean;
  organizationId?: string | null;
  role?: OrgRole;
}): UserDto {
  const emailLower = input.email.toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === emailLower)) {
    throw new Error('Email already exists');
  }
  const id = randomUUID();
  const row: UserDto & { passwordHash?: string } = {
    id,
    email: input.email,
    name: input.name ?? null,
    isSuperAdmin: input.isSuperAdmin ?? false,
    isActive: true,
    lastLoginAt: null,
    createdAt: now(),
    updatedAt: now(),
    passwordHash: input.passwordHash,
  };
  users.push(row);
  if (input.organizationId && input.role) {
    userRoles.push({
      id: randomUUID(),
      userId: id,
      orgId: input.organizationId,
      role: input.role,
    });
  }
  persistStoreSnapshot();
  return toUserDto(row);
}

export function updateUser(id: string, patch: Partial<Pick<UserDto, 'name' | 'isActive'>>): UserDto | null {
  const found = users.find((u) => u.id === id);
  if (!found) return null;
  if (patch.name !== undefined) found.name = patch.name;
  if (patch.isActive !== undefined) found.isActive = patch.isActive;
  found.updatedAt = now();
  persistStoreSnapshot();
  return toUserDto(found);
}

export function deleteUser(id: string): boolean {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  const toRemove = userRoles.filter((r) => r.userId === id);
  toRemove.forEach((r) => {
    const i = userRoles.findIndex((x) => x.id === r.id);
    if (i >= 0) userRoles.splice(i, 1);
  });
  persistStoreSnapshot();
  return true;
}

export function listMembers(orgId: string): MemberDto[] {
  const org = organizations.find((o) => o.id === orgId);
  if (!org) return [];
  return userRoles
    .filter((r) => r.orgId === orgId)
    .map((r) => {
      const u = users.find((x) => x.id === r.userId);
      return {
        userId: r.userId,
        email: u?.email ?? '',
        name: u?.name ?? null,
        role: r.role,
        joinedAt: u?.createdAt ?? now(),
      };
    });
}

export function addMember(orgId: string, userId: string, role: OrgRole): MemberDto | null {
  if (userRoles.some((r) => r.orgId === orgId && r.userId === userId)) {
    throw new Error('User already in organization');
  }
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  userRoles.push({
    id: randomUUID(),
    userId,
    orgId,
    role,
  });
  persistStoreSnapshot();
  return { userId: user.id, email: user.email, name: user.name, role, joinedAt: user.createdAt };
}

export function updateMemberRole(orgId: string, userId: string, role: OrgRole): boolean {
  const r = userRoles.find((x) => x.orgId === orgId && x.userId === userId);
  if (!r) return false;
  r.role = role;
  persistStoreSnapshot();
  return true;
}

export function removeMember(orgId: string, userId: string): boolean {
  const idx = userRoles.findIndex((r) => r.orgId === orgId && r.userId === userId);
  if (idx === -1) return false;
  userRoles.splice(idx, 1);
  persistStoreSnapshot();
  return true;
}

export function getUserByEmail(email: string): (UserDto & { passwordHash?: string }) | null {
  const emailLower = email.toLowerCase();
  return users.find((u) => u.email.toLowerCase() === emailLower) ?? null;
}

export function getUserOrgRoles(userId: string): { orgId: string; role: OrgRole }[] {
  return userRoles.filter((r) => r.userId === userId).map((r) => ({ orgId: r.orgId, role: r.role }));
}
