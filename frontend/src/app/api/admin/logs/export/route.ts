import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail } from '@/lib/http';
import { listLogsFiltered } from '@/lib/store';

const MAX_EXPORT = 5000;

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const startTime = searchParams.get('startTime') ?? undefined;
    const endTime = searchParams.get('endTime') ?? undefined;
    const client = searchParams.get('client') as 'desktop' | 'web' | undefined;
    const level = searchParams.get('level') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const { items } = listLogsFiltered(auth.orgSlug, {
      startTime,
      endTime,
      client,
      level,
      action,
      limit: MAX_EXPORT,
      offset: 0,
    });
    if (format === 'csv') {
      const header = 'id,createdAt,client,level,message\n';
      const rows = items
        .map(
          (l) =>
            `${l.id},${l.createdAt},${l.client},${l.level},"${(l.message || '').replace(/"/g, '""')}"`
        )
        .join('\n');
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    return new Response(JSON.stringify({ items }, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to export logs.');
  }
}
