import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { failV1, okV1 } from '@/lib/http-v1';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';
const BodySchema = z.object({ refresh_token: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return failV1('VALIDATION_ERROR', 400, 'Missing refresh_token');
    }
    const payload = await verifyToken(parsed.data.refresh_token);
    if (payload.type !== 'refresh') {
      return failV1('UNAUTHORIZED', 401, 'Invalid token');
    }
    const prisma = getPrisma();
    if (prisma && payload.sub !== 'bootstrap') {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: { include: { organization: true } },
          organization: true,
        },
      });
      if (!user || !user.isActive) {
        return failV1('UNAUTHORIZED', 401, 'User not found or inactive');
      }
      const orgRole = user.userRoles[0];
      const orgSlug = orgRole?.organization?.slug ?? user.organization?.slug ?? DEFAULT_ORG;
      const orgId = orgRole?.organization?.id ?? user.organizationId ?? null;
      const role = orgRole?.role ?? 'member';
      const access_token = await signAccessToken({
        sub: user.id,
        email: user.email,
        orgId,
        orgSlug,
        role,
        isSuperAdmin: user.isSuperAdmin,
      });
      const refresh_token = await signRefreshToken({ sub: user.id, email: user.email });
      return okV1({ access_token, refresh_token, expires_in: 900 }, 200);
    }
    if (payload.sub === 'bootstrap') {
      const access_token = await signAccessToken({
        sub: 'bootstrap',
        email: payload.email,
        orgId: null,
        orgSlug: DEFAULT_ORG,
        role: 'admin',
        isSuperAdmin: true,
      });
      const refresh_token = await signRefreshToken({ sub: 'bootstrap', email: payload.email });
      return okV1({ access_token, refresh_token, expires_in: 900 }, 200);
    }
    return failV1('UNAUTHORIZED', 401, 'Invalid token');
  } catch {
    return failV1('UNAUTHORIZED', 401, 'Invalid or expired refresh token');
  }
}
