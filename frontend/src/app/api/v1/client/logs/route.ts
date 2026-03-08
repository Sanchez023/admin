import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireClientAccessV1 } from '@/lib/auth-v1';
import { failV1 } from '@/lib/http-v1';
import { checkRateLimit } from '@/lib/rate-limit';
import { appendLogs, appendAuditLog } from '@/lib/store';

const BodySchema = z.object({
  client: z.enum(['desktop', 'web']),
  items: z.array(
    z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      message: z.string(),
      meta: z.record(z.unknown()).optional(),
    }),
  ),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireClientAccessV1(auth);
    const limitKey = `${auth.orgSlug}:${auth.sub}`;
    if (!checkRateLimit(limitKey)) {
      return failV1('RATE_LIMITED', 429, 'Too many requests');
    }
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const items = parsed.data.items.map((item) => ({
      level: item.level ?? 'info',
      message: item.message,
      meta: item.meta,
    }));
    appendLogs(parsed.data.client, items, auth.orgSlug);
    appendAuditLog(
      {
        actorRole: auth.role === 'admin' ? 'admin' : 'service',
        action: 'client.logs.batch',
        resource: 'logs',
        details: { count: parsed.data.items.length, client: parsed.data.client },
      },
      auth.orgSlug,
    );
    return new Response(JSON.stringify({ success: true, data: { accepted: true } }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return failV1('UNAUTHORIZED', 401, 'Token or API key required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to submit logs');
  }
}
