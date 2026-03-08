import { NextRequest } from 'next/server';
import { verifyToken, decodeToken } from '@/lib/jwt';
import { isBlacklistedAsync } from '@/lib/blacklist';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';

export type AuthV1Context = {
  sub: string;
  email: string;
  name?: string | null;
  orgId: string | null;
  orgSlug: string;
  role: string;
  isSuperAdmin?: boolean;
  jti?: string;
  exp?: number;
};

export async function getAuthFromV1Request(req: NextRequest): Promise<AuthV1Context | null> {
  const authz = req.headers.get('authorization') || '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  const apiKey = req.headers.get('x-api-key')?.trim() || '';
  const orgSlug = req.headers.get('x-org-id')?.trim() || DEFAULT_ORG;

  const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN || '';
  const serviceApiKey = process.env.ADMIN_SERVICE_API_KEY || '';
  if (apiKey && serviceApiKey && apiKey === serviceApiKey) {
    return {
      sub: 'service',
      email: 'service@client',
      orgId: null,
      orgSlug,
      role: 'service',
    };
  }
  if (!token) return null;

  if (bootstrapToken && token === bootstrapToken) {
    return {
      sub: 'bootstrap',
      email: 'admin@local',
      orgId: null,
      orgSlug,
      role: 'admin',
      isSuperAdmin: true,
    };
  }

  const payload = decodeToken(token);
  if (!payload || payload.type !== 'access') return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  if (payload.jti && (await isBlacklistedAsync(payload.jti))) return null;

  try {
    await verifyToken(token);
  } catch {
    return null;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: (payload as { name?: string }).name,
    orgId: payload.orgId ?? null,
    orgSlug: payload.orgSlug ?? DEFAULT_ORG,
    role: payload.role ?? 'member',
    isSuperAdmin: payload.isSuperAdmin ?? false,
    jti: payload.jti,
    exp: payload.exp,
  };
}

export function requireAdminV1(ctx: AuthV1Context | null): asserts ctx is AuthV1Context {
  if (!ctx) throw new Error('UNAUTHORIZED');
  const adminRoles = ['admin', 'owner'];
  if (ctx.isSuperAdmin || adminRoles.includes(ctx.role)) return;
  throw new Error('FORBIDDEN');
}

export function requireClientAccessV1(ctx: AuthV1Context | null): asserts ctx is AuthV1Context {
  if (!ctx) throw new Error('UNAUTHORIZED');
}
