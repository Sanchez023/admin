import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG || 'default';
const SEED_SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@local';
const SEED_SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'admin123';

async function main() {
  let org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Default',
        slug: DEFAULT_ORG_SLUG,
        plan: 'free',
        isActive: true,
      },
    });
    console.log(`Created default organization: ${DEFAULT_ORG_SLUG}`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: SEED_SUPERADMIN_EMAIL },
  });
  if (!existingUser) {
    const passwordHash = await hash(SEED_SUPERADMIN_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: SEED_SUPERADMIN_EMAIL,
        passwordHash,
        name: 'Super Admin',
        isSuperAdmin: true,
        isActive: true,
        organizationId: org.id,
      },
    });
    await prisma.userRole.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: 'owner',
      },
    });
    console.log(`Created super admin user: ${SEED_SUPERADMIN_EMAIL}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
