import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { createUser, listUsers } from '@/lib/store';
import { hashPassword } from '@/lib/password';

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().optional(),
  organizationId: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId') ?? undefined;
    const role = url.searchParams.get('role') as 'owner' | 'admin' | 'member' | 'viewer' | undefined;
    const isActive = url.searchParams.get('isActive');
    const q = url.searchParams.get('q') ?? undefined;
    const filter = {
      orgId,
      role,
      isActive: isActive === null ? undefined : isActive === 'true',
      q,
    };
    const { items, total } = listUsers(filter);
    return okV1({ items }, 200, { total });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to list users');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const passwordHash = await hashPassword(parsed.data.password);
    const created = createUser({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name ?? null,
      organizationId: parsed.data.organizationId ?? undefined,
      role: parsed.data.role,
    });
    return okV1(created, 201);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
      if (e.message === 'Email already exists') return failV1('CONFLICT', 409, e.message);
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to create user');
  }
}
