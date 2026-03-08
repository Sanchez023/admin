import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { appendAuditLog, updateMcp } from '@/lib/store';

const PayloadSchema = z.object({
  enabled: z.boolean(),
});

function maskMap(input?: Record<string, string>): Record<string, string> | undefined {
  if (!input || Object.keys(input).length === 0) {
    return undefined;
  }
  return Object.fromEntries(Object.keys(input).map((key) => [key, '***']));
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);

    const parsed = PayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid payload.');
    }

    const { id } = await context.params;
    const updated = updateMcp(id, { enabled: parsed.data.enabled }, auth.orgSlug);
    if (!updated) {
      return fail('NOT_FOUND', 404, 'MCP server not found.');
    }

    appendAuditLog({
      actorRole: 'admin',
      action: 'mcp.setEnabled',
      resource: 'mcp.server',
      targetId: id,
      details: { enabled: parsed.data.enabled },
    }, auth.orgSlug);
    return ok({
      ...updated,
      env: maskMap(updated.env),
      headers: maskMap(updated.headers),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to toggle MCP server.');
  }
}
