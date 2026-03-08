import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, getSsoPolicy, upsertSsoPolicy } from '@/lib/store';

const PatchSchema = z.object({
  mode: z.enum(['disabled', 'optional', 'required']).optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.enum(['member', 'admin']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok(getSsoPolicy(auth.orgSlug));
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load SSO policy.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const updated = upsertSsoPolicy(parsed.data, auth.orgSlug);
    appendAuditLog({
      actorRole: 'admin',
      action: 'sso.updatePolicy',
      resource: 'sso.policy',
      details: parsed.data,
    }, auth.orgSlug);
    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update SSO policy.');
  }
}
