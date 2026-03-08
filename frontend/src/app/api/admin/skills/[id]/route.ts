import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, noContent, ok } from '@/lib/http';
import { appendAuditLog, deleteSkill, updateSkill } from '@/lib/store';

const PatchSchema = z.object({
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string()).optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const { id } = await context.params;
    const updated = updateSkill(id, parsed.data, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'Skill not found.');
    }

    appendAuditLog({
      actorRole: 'admin',
      action: 'skills.update',
      resource: 'skill',
      targetId: id,
      details: parsed.data,
    }, auth.orgSlug);
    return ok(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Skill already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update skill.');
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { id } = await context.params;
    const removed = deleteSkill(id, auth.orgSlug);
    if (!removed) {
      return fail('NOT_FOUND', 404, 'Skill not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'skills.delete',
      resource: 'skill',
      targetId: id,
    }, auth.orgSlug);
    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to delete skill.');
  }
}
