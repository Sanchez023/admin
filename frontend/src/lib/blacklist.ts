const inMemory = new Map<string, number>();

export function addToBlacklist(jti: string, exp: number): void {
  inMemory.set(jti, exp);
}

export function isBlacklisted(jti: string): boolean {
  return inMemory.has(jti);
}

export async function isBlacklistedAsync(jti: string): Promise<boolean> {
  if (inMemory.has(jti)) return true;
  const prisma = (await import('@/lib/db')).getPrisma();
  if (!prisma) return false;
  const entry = await prisma.tokenBlacklist.findUnique({ where: { jti } });
  if (entry && entry.exp > new Date()) return true;
  return false;
}

export async function addToBlacklistAsync(jti: string, exp: Date): Promise<void> {
  inMemory.set(jti, exp.getTime());
  const prisma = (await import('@/lib/db')).getPrisma();
  if (prisma) {
    await prisma.tokenBlacklist.upsert({
      where: { jti },
      create: { jti, exp },
      update: { exp },
    });
  }
}
