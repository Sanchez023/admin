export type ClientType = 'desktop' | 'web';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SSOProviderType = 'oidc' | 'saml';
export type SSOMode = 'disabled' | 'optional' | 'required';

export type ProviderConfigDto = {
  id: string;
  orgId: string | null;
  providerId: string;
  apiType?: 'anthropic' | 'openai';
  displayName: string | null;
  baseUrl: string | null;
  apiKey?: string;
  apiKeyMasked?: string;
  extraModels: { id: string; name: string }[];
  isActive: boolean;
  activeModel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillConfigDto = {
  id: string;
  orgId: string | null;
  skillId: string;
  name?: string;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type MCPServerDto = {
  id: string;
  orgId: string | null;
  name: string;
  description?: string;
  transportType: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemLogDto = {
  id: string;
  orgId: string | null;
  client: ClientType;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogDto = {
  id: string;
  orgId: string | null;
  actorRole: 'admin' | 'service';
  action: string;
  resource: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type SSOProviderDto = {
  id: string;
  orgId: string | null;
  providerType: SSOProviderType;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  clientSecretMasked?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  scopes: string[];
  redirectUri: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SSOPolicyDto = {
  orgId: string | null;
  mode: SSOMode;
  autoProvision: boolean;
  defaultRole: 'member' | 'admin';
  updatedAt: string;
};

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRoleDto = {
  id: string;
  userId: string;
  orgId: string;
  role: OrgRole;
};

export type MemberDto = {
  userId: string;
  email: string;
  name: string | null;
  role: OrgRole;
  joinedAt: string;
};
