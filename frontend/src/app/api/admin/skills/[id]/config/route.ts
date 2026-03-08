import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, updateSkill } from '@/lib/store';

const PayloadSchema = z.object({
  config: z.record(z.string()),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const { id } = await context.params;
    const updated = updateSkill(id, { config: parsed.data.config }, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'Skill not found.');
    }

    appendAuditLog({
      actorRole: 'admin',
      action: 'skills.updateConfig',
      resource: 'skill',
      targetId: id,
      details: { keys: Object.keys(parsed.data.config) },
    }, auth.orgSlug);
    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update skill config.');
  }
}
