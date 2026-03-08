import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, noContent, ok } from '@/lib/http';
import {
  appendAuditLog,
  deleteOrganization,
  getOrganization,
  updateOrganization,
} from '@/lib/store';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';

const PatchSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return fail('FORBIDDEN', 403, 'Organization management requires default organization scope.');
    }
    const { id } = await context.params;
    const org = getOrganization(id);
    if (!org) {
      return fail('NOT_FOUND', 404, 'Organization not found.');
    }
    return ok(org);
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to get organization.');
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return fail('FORBIDDEN', 403, 'Organization management requires default organization scope.');
    }
    const { id } = await context.params;
    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }
    const updated = updateOrganization(id, parsed.data);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'Organization not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'org.update',
      resource: 'organization',
      targetId: id,
      details: parsed.data,
    }, auth.orgSlug);
    return ok(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Organization slug already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update organization.');
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    if (auth.orgSlug !== DEFAULT_ORG) {
      return fail('FORBIDDEN', 403, 'Organization management requires default organization scope.');
    }
    const { id } = await context.params;
    const deleted = deleteOrganization(id);
    if (!deleted) {
      return fail('NOT_FOUND', 404, 'Organization not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'org.delete',
      resource: 'organization',
      targetId: id,
    }, auth.orgSlug);
    return noContent();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Cannot delete default organization') {
        return fail('BAD_REQUEST', 400, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to delete organization.');
  }
}
