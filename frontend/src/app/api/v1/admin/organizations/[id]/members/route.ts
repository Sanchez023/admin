import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { addMember, listMembers, removeMember, updateMemberRole } from '@/lib/store';
import { getOrganization } from '@/lib/store';

const AddSchema = z.object({ userId: z.string().min(1), role: z.enum(['owner', 'admin', 'member', 'viewer']) });
const UpdateSchema = z.object({ userId: z.string().min(1), role: z.enum(['owner', 'admin', 'member', 'viewer']) });
const RemoveSchema = z.object({ userId: z.string().min(1) });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const { id } = await params;
    const org = getOrganization(id);
    if (!org) return failV1('NOT_FOUND', 404, 'Organization not found');
    const items = listMembers(id);
    return okV1({ items }, 200, { total: items.length });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to list members');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const { id } = await params;
    const org = getOrganization(id);
    if (!org) return failV1('NOT_FOUND', 404, 'Organization not found');
    const parsed = AddSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const member = addMember(id, parsed.data.userId, parsed.data.role);
    if (!member) return failV1('NOT_FOUND', 404, 'User not found');
    return okV1(member, 201);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
      if (e.message === 'User already in organization') return failV1('CONFLICT', 409, e.message);
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to add member');
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
    const org = getOrganization(id);
    if (!org) return failV1('NOT_FOUND', 404, 'Organization not found');
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const ok = updateMemberRole(id, parsed.data.userId, parsed.data.role);
    if (!ok) return failV1('NOT_FOUND', 404, 'Member not found');
    return okV1({ updated: true });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to update member');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const { id } = await params;
    const org = getOrganization(id);
    if (!org) return failV1('NOT_FOUND', 404, 'Organization not found');
    const body = await req.json().catch(() => ({}));
    const parsed = RemoveSchema.safeParse(body);
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const ok = removeMember(id, parsed.data.userId);
    if (!ok) return failV1('NOT_FOUND', 404, 'Member not found');
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to remove member');
  }
}
