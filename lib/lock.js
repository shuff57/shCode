import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Lesson locking.
 *
 * A locked lesson still appears on the home page, but the workspace is never
 * rendered until the visitor proves they know the lesson's unlock code. The
 * check runs on the server, so a locked lesson's files and questions are never
 * sent to the browser.
 *
 * Lock state is read from lesson.json on every request rather than from the
 * loadLessons() cache, so flipping "locked" or rotating "unlockCode" takes
 * effect immediately without restarting the server.
 */

/** Lesson ids come from the URL, so never let one wander outside lessons/. */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** @param {string} lessonId */
export function isSafeLessonId(lessonId) {
  return typeof lessonId === 'string' && SAFE_ID.test(lessonId) && !lessonId.includes('..');
}

/** @param {string} lessonId */
export function cookieName(lessonId) {
  return `shcode_unlock_${lessonId}`;
}

/**
 * @param {string} lessonId
 * @returns {Promise<{ locked: boolean, unlockCode: string }>}
 */
export async function readLock(lessonId) {
  if (!isSafeLessonId(lessonId)) return { locked: false, unlockCode: '' };
  try {
    const file = path.join(process.cwd(), 'lessons', lessonId, 'lesson.json');
    const meta = JSON.parse(await fs.readFile(file, 'utf8'));
    return {
      locked: Boolean(meta.locked),
      unlockCode: typeof meta.unlockCode === 'string' ? meta.unlockCode : '',
    };
  } catch {
    return { locked: false, unlockCode: '' };
  }
}

/**
 * Proof-of-code cookie value. Derived from the code itself, so it survives a
 * restart but stops working the moment the teacher changes the code.
 *
 * @param {string} lessonId
 * @param {string} unlockCode
 */
export function unlockToken(lessonId, unlockCode) {
  return crypto
    .createHmac('sha256', String(unlockCode))
    .update(`unlock:${lessonId}`)
    .digest('hex');
}

/**
 * @param {string} a
 * @param {string} b
 */
function equals(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Codes are read off the board, so ignore case and stray spaces. */
function normalize(code) {
  return String(code == null ? '' : code).trim().toUpperCase();
}

/**
 * May this request open the lesson?
 *
 * @param {string} lessonId
 * @param {string | undefined} cookieValue
 */
export async function isUnlocked(lessonId, cookieValue) {
  const { locked, unlockCode } = await readLock(lessonId);
  if (!locked) return true;
  // Locked with no code set is a hard lock: nobody gets in until the teacher
  // adds a code or clears the flag.
  if (!unlockCode) return false;
  if (!cookieValue) return false;
  return equals(cookieValue, unlockToken(lessonId, unlockCode));
}

/**
 * @param {string} lessonId
 * @param {unknown} submitted
 * @returns {Promise<{ ok: boolean, token: string }>}
 */
export async function checkCode(lessonId, submitted) {
  const { locked, unlockCode } = await readLock(lessonId);
  if (!locked) return { ok: true, token: '' };
  if (!unlockCode) return { ok: false, token: '' };
  if (!equals(normalize(submitted), normalize(unlockCode))) {
    return { ok: false, token: '' };
  }
  return { ok: true, token: unlockToken(lessonId, unlockCode) };
}

/**
 * Minimal Cookie header parser, so server.js needs no extra dependency.
 *
 * @param {string | undefined} header
 * @returns {Record<string, string>}
 */
export function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}
