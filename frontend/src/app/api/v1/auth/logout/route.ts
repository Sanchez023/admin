import { NextRequest } from 'next/server';
import { getAuthFromV1Request } from '@/lib/auth-v1';
import { failV1, noContent } from '@/lib/http-v1';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromV1Request(req);
  if (!auth) {
    return failV1('UNAUTHORIZED', 401, 'Not authenticated');
  }
  if (auth.jti && auth.exp) {
    const { addToBlacklistAsync } = await import('@/lib/blacklist');
    await addToBlacklistAsync(auth.jti, new Date(auth.exp * 1000));
  }
  return noContent();
}
