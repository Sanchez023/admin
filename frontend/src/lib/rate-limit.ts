/**
 * In-memory sliding window rate limit for client log ingestion.
 * Key format: `${orgSlug}:${client}`. Limit: 100 requests per minute per key.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;
const store = new Map<string, number[]>();

function prune(key: string, now: number): void {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - WINDOW_MS;
  const kept = timestamps.filter((t) => t > cutoff);
  if (kept.length === 0) store.delete(key);
  else store.set(key, kept);
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  prune(key, now);
  const timestamps = store.get(key) ?? [];
  if (timestamps.length >= MAX_REQUESTS) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
