import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, createSsoProvider, listSsoProviders } from '@/lib/store';

const CreateSchema = z.object({
  orgId: z.string().nullable().optional(),
  providerType: z.enum(['oidc', 'saml']),
  name: z.string().min(1),
  issuerUrl: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().optional(),
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  userInfoEndpoint: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  redirectUri: z.string().min(1),
  enabled: z.boolean().optional(),
});

function toAdminSsoProvider<T extends { clientSecret?: string }>(provider: T): Omit<T, 'clientSecret'> {
  const { clientSecret, ...safe } = provider;
  return safe;
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok({ items: listSsoProviders(auth.orgSlug).map(toAdminSsoProvider) });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load SSO providers.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const created = createSsoProvider(parsed.data, auth.orgSlug);
    appendAuditLog({
      actorRole: 'admin',
      action: 'sso.createProvider',
      resource: 'sso.provider',
      targetId: created.id,
      details: {
        providerType: created.providerType,
        issuerUrl: created.issuerUrl,
        enabled: created.enabled,
      },
    }, auth.orgSlug);
    return ok(toAdminSsoProvider(created), 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'SSO provider already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to create SSO provider.');
  }
}
