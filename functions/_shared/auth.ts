// Password hashing (PBKDF2-SHA256) and session JWT (HS256) helpers shared
// by the auth endpoints and the request middleware.

import { SignJWT, jwtVerify } from 'jose';

// Cloudflare Workers cap PBKDF2 iterations at 100_000 — anything higher
// throws NotSupportedError. Use the cap; students aren't a high-value
// target and PBKDF2-SHA256 at 100k is still well above trivial brute-force.
const PBKDF2_ITERATIONS = 100_000;
const KEY_BITS = 256;

// ---- Hex encoding ----

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Constant-time comparison to avoid timing oracles during password verify.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---- Password ----

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return `${toHex(salt)}:${PBKDF2_ITERATIONS}:${toHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [saltHex, iterStr, hashHex] = parts;
  const salt = fromHex(saltHex);
  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return timingSafeEqual(new Uint8Array(bits), fromHex(hashHex));
}

// ---- Session JWT ----

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(email: string, secret: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretBytes(secret));
}

export async function verifySession(token: string, secret: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes(secret));
    const email = String(payload.email || '').toLowerCase();
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}

// ---- Session cookie ----

export const SESSION_COOKIE = 'shcode_session';

export function buildSessionCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split('=');
    if (k === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

// ---- Email normalization ----

export function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}
