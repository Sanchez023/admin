import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, createSkill, listSkills } from '@/lib/store';

const CreateSchema = z.object({
  orgId: z.string().nullable().optional(),
  skillId: z.string().min(1),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok({ items: listSkills(auth.orgSlug) });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load skills.');
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
    const created = createSkill(parsed.data, auth.orgSlug);
    appendAuditLog({
      actorRole: 'admin',
      action: 'skills.create',
      resource: 'skill',
      targetId: created.id,
      details: { skillId: created.skillId },
    }, auth.orgSlug);
    return ok(created, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Skill already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to create skill.');
  }
}
