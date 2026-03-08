import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, getActiveModel, setActiveProvider } from '@/lib/store';

const PayloadSchema = z.object({
  providerId: z.string().min(1),
  model: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok(getActiveModel(auth.orgSlug));
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load active provider.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const switched = setActiveProvider(parsed.data.providerId, parsed.data.model, auth.orgSlug);
    if (!switched) {
      return fail('NOT_FOUND', 404, 'Provider not found in current organization scope.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'llm.setActiveProvider',
      resource: 'llm.provider',
      targetId: parsed.data.providerId,
      details: { model: parsed.data.model },
    }, auth.orgSlug);
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to set active provider.');
  }
}
