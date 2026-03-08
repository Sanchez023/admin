import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
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

function toAdminProvider<T extends { apiKey?: string }>(provider: T): Omit<T, 'apiKey'> {
  const { apiKey, ...safe } = provider;
  return safe;
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok({ items: listProviders(auth.orgSlug).map(toAdminProvider) });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load providers.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const created = createProvider(parsed.data, auth.orgSlug);
    appendAuditLog({
      actorRole: 'admin',
      action: 'llm.createProvider',
      resource: 'llm.provider',
      targetId: created.id,
      details: { providerId: created.providerId },
    }, auth.orgSlug);
    return ok(toAdminProvider(created), 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'Provider already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to create provider.');
  }
}
