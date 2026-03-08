import { NextRequest } from 'next/server';
import { decodeToken } from '@/lib/jwt';

export type AuthContext = {
  role: 'admin' | 'service' | 'anonymous';
  orgSlug: string;
};

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';

export function getAuthContext(req: NextRequest): AuthContext {
  const authz = req.headers.get('authorization') || '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  const apiKey = req.headers.get('x-api-key')?.trim() || '';

  const adminToken = process.env.ADMIN_BOOTSTRAP_TOKEN || '';
  const serviceApiKey = process.env.ADMIN_SERVICE_API_KEY || '';

  const orgSlug = req.headers.get('x-org-id')?.trim() || DEFAULT_ORG;

  if (token && adminToken && token === adminToken) {
    return { role: 'admin', orgSlug };
  }

  if (apiKey && serviceApiKey && apiKey === serviceApiKey) {
    return { role: 'service', orgSlug };
  }

  const payload = token ? decodeToken(token) : null;
  if (payload && payload.type === 'access' && payload.exp && payload.exp * 1000 > Date.now()) {
    const adminRoles = ['admin', 'owner'];
    const role = adminRoles.includes(payload.role) || payload.isSuperAdmin ? 'admin' : 'service';
    return { role, orgSlug: payload.orgSlug ?? orgSlug };
  }

  return { role: 'anonymous', orgSlug: DEFAULT_ORG };
}

export function requireAdmin(ctx: AuthContext): void {
  if (ctx.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
}

export function requireClientAccess(ctx: AuthContext): void {
  if (ctx.role !== 'admin' && ctx.role !== 'service') {
    throw new Error('UNAUTHORIZED');
  }
}
