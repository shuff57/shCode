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

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
// Shortened from 30 days on 2026-09-22: verifySession only checks the JWT
// signature, never revocation, so a demoted/removed account keeps full
// access until its token expires naturally. Existing tokens already signed
// with the old 30-day expiry are unaffected -- this only shortens *new*
// logins, so no current student is signed out or has to reset a password.

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export type Role = 'admin' | 'teacher' | 'student';

export async function signSession(
  email: string,
  role: Role,
  secret: string,
  /** Epoch seconds. Given when an existing session is re-signed to add `wo`, so it keeps its end. */
  expiresAt?: number,
): Promise<string> {
  // `wo` is the account's work-owner id (lib/owned-storage.ts), so the middleware can
  // check X-Work-Owner without recomputing it. Always present on a new session.
  const wo = await workOwnerFor(email, secret);
  return new SignJWT({ email, role, wo })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? `${SESSION_TTL_SECONDS}s`)
    .sign(secretBytes(secret));
}

export interface Session {
  email: string;
  role: Role;
  /** The account's work-owner id; absent on a session signed before the claim existed (re-signed on the next page load). */
  wo?: string;
  /** Epoch seconds the session ends. */
  exp?: number;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes(secret));
    const email = String(payload.email || '').toLowerCase();
    if (!email) return null;
    const raw = payload.role;
    const role: Role = raw === 'admin' || raw === 'teacher' ? raw : 'student';
    const out: Session = { email, role };
    if (typeof payload.wo === 'string' && isWorkOwnerId(payload.wo)) out.wo = payload.wo;
    if (typeof payload.exp === 'number') out.exp = payload.exp;
    return out;
  } catch {
    return null;
  }
}

// ---- Work owner (browser storage namespace) ----
//
// The page keeps each account's work in this browser under `w1:<id>:...`
// (lib/owned-storage.ts) and reads <id> from the readable cookie below. The id is a
// KEYED HASH of the account's email: base32 of HMAC-SHA256(AUTH_SECRET,
// "work-owner:" + normalizeEmail(email)), first 16 characters. So it:
//  * never needs a database read, a table or a migration, and can never be missing
//    for a signed-in account (a failed lookup used to leave a signed-in page saving
//    under the shared `guest` space);
//  * is the same for an account on every request and every device;
//  * cannot be turned back into the email without AUTH_SECRET.
// Known limits: rotating AUTH_SECRET gives every account a new namespace (its old
// browser work stays on the computer, unseen); so does changing an account's email.
// The cookie is set and cleared in the same responses as the session cookie, with the
// same Path, SameSite, Max-Age and Secure. Not HttpOnly: the page has to read it.
// Not sensitive on its own: it grants nothing (the session cookie does).

export const OWNER_COOKIE = 'shcode_owner';
/** Header every page request to /api/* carries: the owner the page loaded with. */
export const WORK_OWNER_HEADER = 'X-Work-Owner';
const WORK_OWNER_RE = /^[a-z2-7]{16}$/;
const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

export function isWorkOwnerId(v: unknown): v is string {
  return typeof v === 'string' && WORK_OWNER_RE.test(v);
}

/** 16 base32 characters (80 bits) of HMAC-SHA256(secret, "work-owner:" + email). */
export async function workOwnerFor(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`work-owner:${normalizeEmail(email)}`)),
  );
  // 16 x 5 bits from the first 10 bytes, most significant bit first.
  let out = '';
  let bits = 0;
  let acc = 0;
  for (let i = 0; i < mac.length && out.length < 16; i++) {
    acc = (acc << 8) | mac[i];
    bits += 8;
    while (bits >= 5 && out.length < 16) {
      bits -= 5;
      out += BASE32[(acc >> bits) & 31];
    }
    acc &= (1 << bits) - 1;
  }
  return out;
}

// ---- Work key (lib/owned-storage.ts, lib/work-cipher.ts) ----
//
// The key an account's stored work is sealed with in the browser: 32 bytes,
// HMAC-SHA256(AUTH_SECRET, "work-key:" + normalized email), base64url. Like the owner id it
// needs no table. It lives in the readable `shcode_wk` cookie (value `<owner id>.<key>`), set on
// sign-in and on a page load with a valid session, ALWAYS together with the owner cookie, with the
// same Path, SameSite, Max-Age and Secure, and cleared at sign-out and on a page load with no
// session. It is never set by an /api answer: such an answer can arrive after the account signed
// out, and would hand a signed-out browser the key again.
// What that buys: once the account is signed out or its session has ended, this browser no
// longer holds the key, so that account's stored work cannot be read on the computer. While the
// account is signed in the key is in the browser, as the account itself is.
// Known limit, the same as the owner id's: rotating AUTH_SECRET or changing an account's email
// changes the key, and work on a computer that had not uploaded can no longer be opened.

export const WORK_KEY_COOKIE = 'shcode_wk';

export async function workKeyFor(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secretBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`work-key:${normalizeEmail(email)}`)),
  );
  let bin = '';
  for (const b of mac) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The cookie's value: `<owner id>.<key>`. The key names the account it belongs to, so a page never
 * takes a key that arrived for another account as its own (the browser applies Set-Cookie headers
 * one at a time, and a slow answer can land after someone else signed in).
 */
export function workKeyCookieValue(workOwner: string, workKey: string): string {
  return `${workOwner}.${workKey}`;
}

/** `value` is workKeyCookieValue(...), or '' with Max-Age 0 to clear. */
export function buildWorkKeyCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [`${WORK_KEY_COOKIE}=${value}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildOwnerCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [`${OWNER_COOKIE}=${value}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
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

/** The session cookie, the owner cookie and the work-key cookie, as Set-Cookie values, set together. */
export function sessionCookies(token: string, workOwner: string, maxAgeSeconds: number, secure: boolean, workKey?: string): string[] {
  return [
    buildSessionCookie(token, maxAgeSeconds, secure),
    buildOwnerCookie(workOwner, maxAgeSeconds, secure),
    ...(workKey ? [buildWorkKeyCookie(workKeyCookieValue(workOwner, workKey), maxAgeSeconds, secure)] : []),
  ];
}

export function readSessionCookie(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

// ---- Email normalization ----

export function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

// ---- Role resolution ----

/** True when the email appears in the given comma-separated allowlist
 *  env var (case-insensitive). */
function emailInAllowlist(email: string, allowlistVar: string | undefined): boolean {
  if (!allowlistVar) return false;
  const normalized = normalizeEmail(email);
  return allowlistVar
    .split(',')
    .map((s) => normalizeEmail(s))
    .filter(Boolean)
    .includes(normalized);
}

/** Used at signup time to decide a new user's role. */
export function isAdminEmail(email: string, adminEmailsVar: string | undefined): boolean {
  return emailInAllowlist(email, adminEmailsVar);
}

/** Used at signup time to auto-promote teachers from a TEACHER_EMAILS env var. */
export function isTeacherEmail(email: string, teacherEmailsVar: string | undefined): boolean {
  return emailInAllowlist(email, teacherEmailsVar);
}
