import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthFromV1Request, requireAdminV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { appendAuditLog, createProvider, listProviders } from '@/lib/store';

const CreateSchema = z.object({
  orgId: z.string().nullable().optional(),
  providerId: z.string().min(1),
  apiType: z.enum(['anthropic', 'openai']).optional(),
  displayName: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  apiKey: z.string().optional(),
  extraModels: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  isActive: z.boolean().optional(),
  activeModel: z.string().nullable().optional(),
});

function toAdminProvider<T extends { apiKey?: string }>(p: T) {
  const { apiKey, ...safe } = p;
  return { ...safe, apiKeyMasked: apiKey ? '***' : undefined };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const items = listProviders(auth.orgSlug).map(toAdminProvider);
    return okV1({ items });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to load providers');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireAdminV1(auth);
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return failV1('VALIDATION_ERROR', 400, 'Invalid payload');
    const created = createProvider(parsed.data, auth.orgSlug);
    appendAuditLog(
      { actorRole: 'admin', action: 'llm.createProvider', resource: 'llm.provider', targetId: created.id, details: { providerId: created.providerId } },
      auth.orgSlug,
    );
    return okV1(toAdminProvider(created), 201);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return failV1('UNAUTHORIZED', 401, 'Not authenticated');
      if (e.message === 'FORBIDDEN') return failV1('FORBIDDEN', 403, 'Admin role required');
      if (e.message === 'Provider already exists') return failV1('CONFLICT', 409, e.message);
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to create provider');
  }
}
