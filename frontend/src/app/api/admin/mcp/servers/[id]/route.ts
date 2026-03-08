import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, noContent, ok } from '@/lib/http';
import { appendAuditLog, deleteMcp, updateMcp } from '@/lib/store';

const PatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  transportType: z.enum(['stdio', 'http', 'sse']).optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().optional(),
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

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const { id } = await context.params;
    const updated = updateMcp(id, parsed.data, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'MCP server not found.');
    }

    appendAuditLog({
      actorRole: 'admin',
      action: 'mcp.updateServer',
      resource: 'mcp.server',
      targetId: id,
      details: parsed.data,
    }, auth.orgSlug);
    return ok(toAdminMcp(updated));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return fail('FORBIDDEN', 403, 'Admin role required.');
      }
      if (error.message === 'MCP server already exists') {
        return fail('CONFLICT', 409, error.message);
      }
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to update MCP server.');
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const { id } = await context.params;
    const deleted = deleteMcp(id, auth.orgSlug);
    if (!deleted) {
      return fail('NOT_FOUND', 404, 'MCP server not found.');
    }
    appendAuditLog({
      actorRole: 'admin',
      action: 'mcp.deleteServer',
      resource: 'mcp.server',
      targetId: id,
    }, auth.orgSlug);
    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to delete MCP server.');
  }
}
