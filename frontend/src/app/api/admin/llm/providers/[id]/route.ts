import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, deleteProvider, upsertProvider } from '@/lib/store';

const PatchSchema = z.object({
  apiType: z.enum(['anthropic', 'openai']).optional(),
  displayName: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  apiKey: z.string().optional(),
  activeModel: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  extraModels: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});

function toAdminProvider<T extends { apiKey?: string }>(provider: T): Omit<T, 'apiKey'> {
  const { apiKey, ...safe } = provider;
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
    const updated = upsertProvider(id, parsed.data, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'Provider not found.');
    }

    appendAuditLog({
      actorRole: 'admin',
      action: 'llm.updateProvider',
      resource: 'llm.provider',
      targetId: id,
      details: parsed.data,
    }, auth.orgSlug);
    return ok(toAdminProvider(updated));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Provider already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update provider.');
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { id } = await context.params;
    const removed = deleteProvider(id, auth.orgSlug);
    if (!removed) {
      return fail('NOT_FOUND', 404, 'Provider not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'llm.deleteProvider',
      resource: 'llm.provider',
      targetId: id,
    }, auth.orgSlug);
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to delete provider.');
  }
}
