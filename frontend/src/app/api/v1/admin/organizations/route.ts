import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { appendAuditLog, createOrganization, listOrganizations } from '@/lib/store';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';
const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    if (auth.orgSlug !== DEFAULT_ORG && !auth.isSuperAdmin) {
      return failV1('FORBIDDEN', 403, 'Organization list requires default scope or SuperAdmin');
    }
    const items = listOrganizations();
    return okV1({ items }, 200, { total: items.length });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to list organizations');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return failV1('FORBIDDEN', 403, 'Organization creation requires default scope');
    }
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const created = createOrganization(parsed.data);
    appendAuditLog(
      { actorRole: 'admin', action: 'org.create', resource: 'organization', targetId: created.id, details: { slug: created.slug } },
      auth.orgSlug,
    );
    return okV1(created, 201);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
      if (e.message === 'Organization slug already exists') return failV1('CONFLICT', 409, e.message);
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to create organization');
  }
}
