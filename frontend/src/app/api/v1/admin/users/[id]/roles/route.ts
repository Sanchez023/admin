import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { getUser, getUserOrgRoles } from '@/lib/store';
import { getOrganization } from '@/lib/store';
import { addMember, updateMemberRole } from '@/lib/store';

const PutSchema = z.object({ orgId: z.string().min(1), role: z.enum(['owner', 'admin', 'member', 'viewer']) });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const { id } = await params;
    const user = getUser(id);
    if (!user) return failV1('NOT_FOUND', 404, 'User not found');
    const roles = getUserOrgRoles(id).map((r) => {
      const org = getOrganization(r.orgId);
      return { orgId: r.orgId, orgSlug: org?.slug ?? r.orgId, role: r.role };
    });
    return okV1({ items: roles });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to get roles');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const { id } = await params;
    const parsed = PutSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const user = getUser(id);
    if (!user) return failV1('NOT_FOUND', 404, 'User not found');
    const org = getOrganization(parsed.data.orgId);
    if (!org) return failV1('NOT_FOUND', 404, 'Organization not found');
    const updated = updateMemberRole(parsed.data.orgId, id, parsed.data.role);
    if (!updated) {
      addMember(parsed.data.orgId, id, parsed.data.role);
    }
    return okV1({ orgId: parsed.data.orgId, role: parsed.data.role });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to set role');
  }
}
