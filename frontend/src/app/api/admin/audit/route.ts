import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { listAuditLogsFiltered } from '@/lib/store';

const parsePositiveInt = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { searchParams } = new URL(req.url);
    const startTime = searchParams.get('startTime') ?? undefined;
    const endTime = searchParams.get('endTime') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const limit = parsePositiveInt(searchParams.get('limit'));
    const offset = parsePositiveInt(searchParams.get('offset'));
    const { items, total } = listAuditLogsFiltered(auth.orgSlug, {
      startTime,
      endTime,
      action,
      limit,
      offset,
    });
    return ok({ total, items });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to query audit logs.');
  }
}
