import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { getUser, updateUser, deleteUser } from '@/lib/store';

const UpdateSchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
});

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
    return okV1(user);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to get user');
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
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const updated = updateUser(id, parsed.data);
    if (!updated) return failV1('NOT_FOUND', 404, 'User not found');
    return okV1(updated);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to update user');
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
    const ok = deleteUser(id);
    if (!ok) return failV1('NOT_FOUND', 404, 'User not found');
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to delete user');
  }
}
