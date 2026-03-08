import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, noContent, ok } from '@/lib/http';
import { appendAuditLog, deleteSsoProvider, updateSsoProvider } from '@/lib/store';

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  issuerUrl: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().optional(),
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  userInfoEndpoint: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  redirectUri: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

function toAdminSsoProvider<T extends { clientSecret?: string }>(provider: T): Omit<T, 'clientSecret'> {
  const { clientSecret, ...safe } = provider;
  return safe;
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const { id } = await context.params;
    const updated = updateSsoProvider(id, parsed.data, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'SSO provider not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'sso.updateProvider',
      resource: 'sso.provider',
      targetId: id,
      details: parsed.data,
    }, auth.orgSlug);
    return ok(toAdminSsoProvider(updated));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'SSO provider already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update SSO provider.');
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { id } = await context.params;
    const deleted = deleteSsoProvider(id, auth.orgSlug);
    if (!deleted) {
      return fail('NOT_FOUND', 404, 'SSO provider not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'sso.deleteProvider',
      resource: 'sso.provider',
      targetId: id,
    }, auth.orgSlug);
    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to delete SSO provider.');
  }
}
