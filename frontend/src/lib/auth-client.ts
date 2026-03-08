export const STORAGE_KEYS = {
  token: 'claw-admin-token',
  apiKey: 'claw-admin-api-key',
  org: 'claw-admin-org',
  theme: 'claw-admin-theme',
} as const;

export function getStoredAuth(): { token: string; apiKey: string; org: string } {
  if (typeof window === 'undefined') {
    return { token: '', apiKey: '', org: 'default' };
  }
  return {
    token: localStorage.getItem(STORAGE_KEYS.token) || '',
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
    org: localStorage.getItem(STORAGE_KEYS.org) || 'default',
  };
}

export function setStoredAuth(params: { token?: string; apiKey?: string; org?: string }) {
  if (typeof window === 'undefined') return;
  if (params.token !== undefined) localStorage.setItem(STORAGE_KEYS.token, params.token);
  if (params.apiKey !== undefined) localStorage.setItem(STORAGE_KEYS.apiKey, params.apiKey);
  if (params.org !== undefined) localStorage.setItem(STORAGE_KEYS.org, params.org);
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  localStorage.removeItem(STORAGE_KEYS.org);
}

export function isAuthenticated(): boolean {
  const { token, apiKey } = getStoredAuth();
  return Boolean(token?.trim() || apiKey?.trim());
}

export function getAuthHeaders(org?: string): Record<string, string> {
  const { token, apiKey, org: storedOrg } = getStoredAuth();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Org-Id': org ?? storedOrg ?? 'default',
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  } else if (apiKey?.trim()) {
    headers['X-Api-Key'] = apiKey.trim();
  }
  return headers;
}

export async function request<T = unknown>(
  path: string,
  options: RequestInit & { org?: string } = {}
): Promise<T> {
  const { org, ...init } = options;
  const headers = getAuthHeaders(org);
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string>) },
  });
  if (response.status === 204) return {} as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `${response.status} ${response.statusText}`);
  }
  return body as T;
}
