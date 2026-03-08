import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, createMcp, listMcpServers } from '@/lib/store';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';

const CreateSchema = z.object({
  orgId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  transportType: z.enum(['stdio', 'http', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
});

function maskMap(input?: Record<string, string>): Record<string, string> | undefined {
  if (!input || Object.keys(input).length === 0) {
    return undefined;
  }
  return Object.fromEntries(Object.keys(input).map((key) => [key, '***']));
}

function toAdminMcp<T extends { env?: Record<string, string>; headers?: Record<string, string> }>(
  row: T,
): Omit<T, 'env' | 'headers'> & { env?: Record<string, string>; headers?: Record<string, string> } {
  return {
    ...row,
    env: maskMap(row.env),
    headers: maskMap(row.headers),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    return ok({ items: listMcpServers(auth.orgSlug).map(toAdminMcp) });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to load MCP servers.');
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

    const created = createMcp({
      orgId: auth.orgSlug === DEFAULT_ORG ? (parsed.data.orgId ?? null) : auth.orgSlug,
      name: parsed.data.name,
      description: parsed.data.description,
      transportType: parsed.data.transportType,
      command: parsed.data.command,
      args: parsed.data.args,
      env: parsed.data.env,
      url: parsed.data.url,
      headers: parsed.data.headers,
      enabled: parsed.data.enabled,
    });
    appendAuditLog({
      actorRole: 'admin',
      action: 'mcp.createServer',
      resource: 'mcp.server',
      targetId: created.id,
      details: { name: created.name, transportType: created.transportType },
    }, auth.orgSlug);
    return ok(toAdminMcp(created), 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'MCP server already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to create MCP server.');
  }
}
