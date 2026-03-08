import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, createOrganization, listOrganizations } from '@/lib/store';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return fail('FORBIDDEN', 403, 'Organization management requires default organization scope.');
    }
    const items = listOrganizations();
    return ok({ items });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to list organizations.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return fail('FORBIDDEN', 403, 'Organization management requires default organization scope.');
    }
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }
    const created = createOrganization(parsed.data);
    appendAuditLog({
      actorRole: 'admin',
      action: 'org.create',
      resource: 'organization',
      targetId: created.id,
      details: { slug: created.slug },
    }, auth.orgSlug);
    return ok(created, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Organization slug already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to create organization.');
  }
}
