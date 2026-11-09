// What's New state and the auto-open rule. Pure helpers: every input is a
// parameter (storage, clock, role, path), so scripts/test-whats-new.mjs can
// run them without a browser. The popup itself is components/WhatsNewModal.tsx.
//
// Seen-state lives in this browser's localStorage, one key PER ACCOUNT
// (`shcode.whatsNew.seen:<hash of the email>`), so two students sharing a
// computer each see the news once. The key carries a hash, not the email: the
// email has no business sitting in storage a classmate can read on that machine.
// "Shown this session" is the same idea in sessionStorage: the popup opens on
// its own at most once per browser session per account, even if it was closed
// by a reload rather than by Close.

import { AUTO_SHOW_DAYS, type WhatsNewEntry } from './whats-new';

export const SEEN_PREFIX = 'shcode.whatsNew.seen:';
export const SHOWN_PREFIX = 'shcode.whatsNew.shown:';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Ids kept per account: far more than the list will ever hold, small enough to cap a corrupted value. */
const MAX_SEEN = 500;

export type Role = 'admin' | 'teacher' | 'student';

/** A storage shape both localStorage and the tests' in-memory map satisfy. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** cyrb53: a fast 53-bit string hash, as 14 hex digits. Not secret, just not the email itself. */
export function accountHash(email: string): string {
  const s = email.trim().toLowerCase();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function seenKey(email: string): string {
  return SEEN_PREFIX + accountHash(email);
}

export function shownKey(email: string): string {
  return SHOWN_PREFIX + accountHash(email);
}

/** The ids this account has seen. Missing, unreadable or malformed storage reads as "none seen". */
export function readSeen(email: string, storage: KeyValueStore | null | undefined): Set<string> {
  try {
    const raw = storage?.getItem(seenKey(email));
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 120).slice(0, MAX_SEEN));
  } catch {
    return new Set();
  }
}

/** Adds `ids` to this account's seen list and returns the new set. A storage that throws just means it shows again. */
export function markSeen(ids: string[], email: string, storage: KeyValueStore | null | undefined): Set<string> {
  const seen = readSeen(email, storage);
  for (const id of ids) seen.add(id);
  try {
    storage?.setItem(seenKey(email), JSON.stringify([...seen].slice(-MAX_SEEN)));
  } catch {
    /* private mode or full: the popup simply opens again next time */
  }
  return seen;
}

export function wasShownThisSession(email: string, session: KeyValueStore | null | undefined): boolean {
  try {
    return session?.getItem(shownKey(email)) === '1';
  } catch {
    return false;
  }
}

export function markShownThisSession(email: string, session: KeyValueStore | null | undefined): void {
  try {
    session?.setItem(shownKey(email), '1');
  } catch {
    /* no session storage: the seen list still stops it after Close */
  }
}

/** Admins read teacher news: they run classes too. */
export function audienceOf(role: Role): 'student' | 'teacher' {
  return role === 'student' ? 'student' : 'teacher';
}

/** Every entry this role may see, newest first (the list keeps the file's order). */
export function entriesFor(entries: WhatsNewEntry[], role: Role): WhatsNewEntry[] {
  const mine = audienceOf(role);
  // Teachers (and admins) also read the student news, so they know what their students just got.
  if (mine === 'teacher') return entries.filter(Boolean);
  return entries.filter((e) => e && (e.audience === 'all' || e.audience === mine));
}

/** Milliseconds since the epoch for a 'YYYY-MM-DD' ship date, or NaN. */
export function shippedAt(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  return Date.parse(`${date}T00:00:00Z`);
}

/**
 * The entries that may open the popup by themselves: for this role, not yet
 * seen, and shipped within the last `days` days (an old feature is not news to
 * a new student). A date in the future (more than a day out) does not count.
 */
export function entriesToAutoShow(
  entries: WhatsNewEntry[],
  seen: Set<string>,
  role: Role,
  now: number = Date.now(),
  days: number = AUTO_SHOW_DAYS,
): WhatsNewEntry[] {
  return entriesFor(entries, role).filter((e) => {
    if (seen.has(e.id)) return false;
    const t = shippedAt(e.date);
    if (!Number.isFinite(t)) return false;
    return now - t <= days * DAY_MS && t <= now + DAY_MS;
  });
}

/**
 * The pages the popup may open on by itself: the home page (the lessons list),
 * a module's lessons list, the Sandbox and the Library. Never a lesson (a quiz
 * or a timed part could be running), never /play, never a teacher page.
 * `trailingSlash: true` means paths arrive as '/sandbox/'.
 */
export function isAutoOpenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return p === '/' || p === '/sandbox' || p === '/library' || /^\/module\/[^/]+$/.test(p);
}

export interface AutoOpenInput {
  /** The signed-in user, or null when signed out. */
  user: { email: string; role: Role } | null;
  pathname: string | null;
  /** This page is inside an iframe (a sketch, a preview): never. */
  inFrame: boolean;
  /** navigator.webdriver: automated browsers do not get it by themselves, so it never blocks a test's clicks. */
  automated: boolean;
  /** `?whats-new` in the URL: open with every entry for this role, whatever else holds. */
  forced: boolean;
  shownThisSession: boolean;
  seen: Set<string>;
  now: number;
  entries: WhatsNewEntry[];
}

/** What to show on this page load: [] means do not open. */
export function decideAutoOpen(input: AutoOpenInput): WhatsNewEntry[] {
  const { user, pathname, inFrame, automated, forced, shownThisSession, seen, now, entries } = input;
  if (!user || inFrame) return [];
  if (forced) return entriesFor(entries, user.role);
  if (automated || shownThisSession || !isAutoOpenPath(pathname)) return [];
  return entriesToAutoShow(entries, seen, user.role, now);
}
