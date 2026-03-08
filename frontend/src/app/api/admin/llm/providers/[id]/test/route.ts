import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { listProviders } from '@/lib/store';

const REQUEST_TIMEOUT_MS = 8_000;

function normalizeModelsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/models`;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(req);
    requireAdmin(auth);
    const { id } = await context.params;
    const providers = listProviders(auth.orgSlug);
    const provider = providers.find((p) => p.id === id);
    if (!provider) {
      return fail('NOT_FOUND', 404, 'Provider not found.');
    }

    const baseUrl = provider.baseUrl?.trim();
    if (!baseUrl) {
      return fail('BAD_REQUEST', 400, 'Provider baseUrl is required.');
    }

    const apiKey = provider.apiKey?.trim();
    const providerId = provider.providerId.trim().toLowerCase();
    const isKeyRequired = providerId !== 'ollama';
    if (isKeyRequired && !apiKey) {
      return fail('BAD_REQUEST', 400, 'Provider apiKey is required.');
    }

    const url = normalizeModelsUrl(baseUrl);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      if (provider.apiType === 'anthropic' || providerId === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const start = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const latency = Date.now() - start;
    if (!response.ok) {
      return ok({
        ok: false,
        latency,
        status: response.status,
        message: `Provider responded with ${response.status}.`,
      });
    }
    return ok({ ok: true, latency, status: response.status, message: 'Connection check succeeded.' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return ok({ ok: false, latency: REQUEST_TIMEOUT_MS, message: 'Connection timeout.' });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return fail('FORBIDDEN', 403, 'Admin role required.');
    }
    return fail('INTERNAL_ERROR', 500, 'Failed to test provider.');
  }
}
