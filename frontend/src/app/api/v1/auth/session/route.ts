import { NextRequest } from 'next/server';
import { getAuthFromV1Request } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromV1Request(req);
  if (!auth) {
    return failV1('UNAUTHORIZED', 401, 'Not authenticated');
  }
  return okV1({
    user: {
      id: auth.sub,
      email: auth.email,
      name: auth.name ?? null,
      isSuperAdmin: auth.isSuperAdmin ?? false,
    },
    orgId: auth.orgId ?? null,
    orgSlug: auth.orgSlug ?? 'default',
    role: auth.role,
  });
}
