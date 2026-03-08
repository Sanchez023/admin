import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { failV1, okV1 } from '@/lib/http-v1';
import { getOrganization, getUserByEmail, getUserOrgRoles } from '@/lib/store';

const DEFAULT_ORG = process.env.DEFAULT_ORG_SLUG || 'default';
const BodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return failV1('VALIDATION_ERROR', 400, 'Invalid email or password');
    }
    const { email, password } = parsed.data;
    const prisma = getPrisma();

    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          userRoles: { include: { organization: true } },
          organization: true,
        },
      });
      if (!user || !user.passwordHash || !user.isActive) {
        return failV1('UNAUTHORIZED', 401, 'Invalid email or password');
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return failV1('UNAUTHORIZED', 401, 'Invalid email or password');
      }
      const orgRole = user.userRoles[0];
      const orgSlug = orgRole?.organization?.slug ?? user.organization?.slug ?? DEFAULT_ORG;
      const orgId = orgRole?.organization?.id ?? user.organizationId ?? null;
      const role = orgRole?.role ?? 'member';
      const access_token = await signAccessToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        orgId,
        orgSlug,
        role,
        isSuperAdmin: user.isSuperAdmin,
      });
      const refresh_token = await signRefreshToken({ sub: user.id, email: user.email });
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return okV1(
        { access_token, refresh_token, expires_in: 900 },
        200,
      );
    }

    const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@local';
    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
    if (bootstrapPassword && email.toLowerCase() === bootstrapEmail.toLowerCase() && password === bootstrapPassword) {
      const access_token = await signAccessToken({
        sub: 'bootstrap',
        email: bootstrapEmail,
        orgId: null,
        orgSlug: DEFAULT_ORG,
        role: 'admin',
        isSuperAdmin: true,
      });
      const refresh_token = await signRefreshToken({ sub: 'bootstrap', email: bootstrapEmail });
      return okV1(
        { access_token, refresh_token, expires_in: 900 },
        200,
      );
    }

    const storeUser = getUserByEmail(email);
    if (storeUser?.passwordHash && storeUser.isActive) {
      const valid = await verifyPassword(password, storeUser.passwordHash);
      if (valid) {
        const roles = getUserOrgRoles(storeUser.id);
        const firstRole = roles[0];
        const org = firstRole ? getOrganization(firstRole.orgId) : null;
        const orgSlug = org?.slug ?? DEFAULT_ORG;
        const orgId = org?.id ?? null;
        const role = firstRole?.role ?? 'member';
        const access_token = await signAccessToken({
          sub: storeUser.id,
          email: storeUser.email,
          name: storeUser.name,
          orgId,
          orgSlug,
          role,
          isSuperAdmin: storeUser.isSuperAdmin,
        });
        const refresh_token = await signRefreshToken({ sub: storeUser.id, email: storeUser.email });
        return okV1({ access_token, refresh_token, expires_in: 900 }, 200);
      }
    }

    return failV1('UNAUTHORIZED', 401, 'Invalid email or password');
  } catch {
    return failV1('INTERNAL_ERROR', 500, 'Login failed');
  }
}
