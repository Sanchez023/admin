import { NextRequest } from 'next/server';
import { getAuthFromV1Request, requireClientAccessV1 } from '@/lib/auth-v1';
import { failV1, okV1 } from '@/lib/http-v1';
import { getActiveModel, listProviders } from '@/lib/store';

function maskProvider<T extends { apiKey?: string }>(p: T) {
  const { apiKey, ...rest } = p;
  return rest;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromV1Request(req);
    requireClientAccessV1(auth);
    const providers = listProviders(auth.orgSlug).map(maskProvider);
    const active = getActiveModel(auth.orgSlug);
    return okV1({ providers, active });
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return failV1('UNAUTHORIZED', 401, 'Token or API key required');
    }
    return failV1('INTERNAL_ERROR', 500, 'Failed to load config');
  }
}
