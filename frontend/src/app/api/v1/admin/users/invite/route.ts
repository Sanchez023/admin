import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { createUser, getOrganization } from '@/lib/store';
import { hashPassword } from '@/lib/password';

const InviteSchema = z.object({
  email: z.string().email(),
  organizationId: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const parsed = InviteSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const targetOrg = getOrganization(parsed.data.organizationId);
    if (!targetOrg) return failV1('NOT_FOUND', 404, 'Organization not found');
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);
    const created = createUser({
      email: parsed.data.email,
      passwordHash,
      organizationId: targetOrg.id,
      role: parsed.data.role,
    });
    return okV1(
      { userId: created.id, email: created.email, role: parsed.data.role, tempPassword },
      201,
    );
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
      if (e.message === 'Email already exists') return failV1('CONFLICT', 409, e.message);
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to invite user');
  }
}
