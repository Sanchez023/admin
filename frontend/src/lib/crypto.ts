/**
 * AES-256-GCM encryption for sensitive fields (API keys, client_secret).
 * Key from ENCRYPTION_KEY (32 bytes hex or base64).
 */

const ALG = 'AES-GCM';
const KEY_LEN = 256;
const IV_LEN = 12;
const TAG_LEN = 128;

async function getKey(): Promise<CryptoKey | null> {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) return null;
  const hex = raw.slice(0, 64).replace(/[^0-9a-fA-F]/g, '');
  if (hex.length < 64) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return crypto.subtle.importKey('raw', bytes, { name: ALG, length: KEY_LEN }, false, ['encrypt', 'decrypt']);
}

let keyPromise: Promise<CryptoKey | null> | null = null;

function getKeyAsync(): Promise<CryptoKey | null> {
  if (!keyPromise) keyPromise = getKey();
  return keyPromise;
}

export async function encrypt(plain: string): Promise<{ cipher: string; iv: string } | null> {
  const key = await getKeyAsync();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plain);
  const cipher = await crypto.subtle.encrypt(
    { name: ALG, iv, tagLength: TAG_LEN },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return {
    cipher: Buffer.from(combined).toString('base64url'),
    iv: Buffer.from(iv).toString('base64url'),
  };
}

export async function decrypt(cipherBase64: string, ivBase64: string): Promise<string | null> {
  const key = await getKeyAsync();
  if (!key) return null;
  try {
    const iv = new Uint8Array(Buffer.from(ivBase64, 'base64url'));
    const cipher = new Uint8Array(Buffer.from(cipherBase64, 'base64url'));
    const dec = await crypto.subtle.decrypt(
      { name: ALG, iv, tagLength: TAG_LEN },
      key,
      cipher,
    );
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}
