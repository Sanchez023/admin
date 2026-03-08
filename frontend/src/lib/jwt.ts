import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_BOOTSTRAP_TOKEN || 'dev-secret-change-in-production';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export type JwtPayload = {
  sub: string;
  email: string;
  name?: string | null;
  orgId?: string | null;
  orgSlug?: string;
  role: string;
  isSuperAdmin?: boolean;
  jti: string;
  type: 'access' | 'refresh';
  exp: number;
  iat: number;
};

function getSecret(): Uint8Array {
  const raw = JWT_SECRET.slice(0, 32).padEnd(32, '0');
  return new TextEncoder().encode(raw);
}

export async function signAccessToken(payload: Omit<JwtPayload, 'jti' | 'type' | 'exp' | 'iat'>): Promise<string> {
  const jti = crypto.randomUUID();
  const secret = getSecret();
  return new jose.SignJWT({
    ...payload,
    jti,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setSubject(payload.sub)
    .sign(secret);
}

export async function signRefreshToken(payload: { sub: string; email: string; jti?: string }): Promise<string> {
  const jti = payload.jti ?? crypto.randomUUID();
  const secret = getSecret();
  return new jose.SignJWT({ jti, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .setSubject(payload.sub)
    .setJti(jti)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = jose.decodeJwt(token) as unknown as JwtPayload;
    return payload ?? null;
  } catch {
    return null;
  }
}
