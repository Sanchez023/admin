import { NextRequest } from 'next/server';
import { getAuthContext, requireClientAccess } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { listSkills } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireClientAccess(auth);
    return ok({ items: listSkills(auth.orgSlug) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return fail('UNAUTHORIZED', 401, 'Token or API key is required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load skills config.');
  }
}
