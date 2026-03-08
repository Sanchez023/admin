import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireClientAccess } from '@/lib/auth';
import { accepted, fail } from '@/lib/http';
import { appendAuditLog, appendLogs } from '@/lib/store';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const rateBuckets = new Map<string, { count: number; startMs: number }>();

const ItemSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string().min(1).max(2000),
  action: z.string().optional(),
  resource: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

const PayloadSchema = z.object({
  client: z.enum(['desktop', 'web']),
  items: z.array(ItemSchema).min(1).max(100),
});

function isRateLimited(bucketKey: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || now - bucket.startMs >= WINDOW_MS) {
    rateBuckets.set(bucketKey, { count: 1, startMs: now });
    return false;
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireClientAccess(auth);

    const parsed = PayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid request payload.');
    }

    const limiterKey = `${auth.role}:${auth.orgSlug}:${parsed.data.client}`;
    if (isRateLimited(limiterKey)) {
      return fail('RATE_LIMITED', 429, 'Too many log ingestion requests.');
    }

    appendLogs(parsed.data.client, parsed.data.items, auth.orgSlug);
    appendAuditLog({
      actorRole: auth.role === 'admin' ? 'admin' : 'service',
      action: 'logs.ingest',
      resource: 'system.log',
      details: {
        client: parsed.data.client,
        count: parsed.data.items.length,
      },
    }, auth.orgSlug);
    return accepted();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return fail('UNAUTHORIZED', 401, 'Token or API key is required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to accept logs.');
  }
}
