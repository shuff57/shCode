// Each account's work lives in this browser under its own key prefix.
// Design: .ui-hill-climb/ux1/option2-design.md, stage 1. THE ONLY MODULE THAT
// TOUCHES A PERSONAL KEY: scripts/test-owned-storage-keys.mjs fails the build when
// a personal key is read or written with raw localStorage anywhere else.
//
//   w1:<owner>:<base key>        e.g. w1:k3m9q2x7a1b4c8d2:progress:3-9-1
//   owner = the 16 base32 characters of the readable `shcode_owner` cookie, which
//           the server sets and clears in the same responses as the session cookie
//           (functions/_shared/auth.ts), or the literal `guest` when there is none.
//   value = JSON { v: 1, d: <the record>, t: <ms written>, up: null }
//           (`up` is reserved for the uploaded-copy hash of a later stage; always null now).
//
// The rules that make this safe, each one a lesson from an attempt that failed:
//  * A page reads the owner ONCE, the first time anything asks, and never changes it.
//    There is no stored "current owner" marker for data to depend on. A tab opened as
//    A writes A's keys until it reloads, even after B signs in in another tab: the
//    worst it can do is put A's work in A's place. Sign-in and sign-out reload the page.
//  * Nothing is moved, stashed or cleared when the person changes, and loading this
//    module opens no listener, timer or channel (the Node tests exit by themselves).
//  * Reads and writes stay synchronous, so the lesson store still hydrates a draft in
//    the same tick as before. A write never throws: it answers 'ok' | 'full' | 'blocked',
//    and a failed write leaves the old value exactly where it was.
//
// Work saved before this module existed (unprefixed keys such as `shCode:progress`)
// belongs to nobody we can name, so it is never handed to anyone: on the first page
// load it is copied into `w1:legacy:<old key>` (copy, check, then remove the original),
// where no page reads it. It waits there for a teacher export (a later stage). Nothing
// gives it back automatically: matching a server copy is not proof of who typed it
// (two students can both be at revision 1 of the same starter).
//
// WHAT THIS IS NOT: the namespaces stop the APP from showing, handing in or uploading
// another account's work. They are not encryption and not a lock. Every namespace sits
// in this browser's localStorage as plain text, and anyone who opens the browser's
// developer tools on this computer can read all of them. Signing out (and a later
// stage's "remove my work from this computer") is what limits that.

export const OWNER_COOKIE = 'shcode_owner';
export const GUEST = 'guest';
export const LEGACY = 'legacy';
const OWNER_RE = /^[a-z2-7]{16}$/;
const PREFIX = 'w1:';

export type WriteResult = 'ok' | 'full' | 'blocked';

/** The part of Storage this module uses (localStorage, sessionStorage, a test fake). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

interface Envelope {
  v: 1;
  d: unknown;
  t: number;
  up: string | null;
}

// ---- owner ------------------------------------------------------------------

/** The owner named by a cookie header string; `guest` when it is missing or malformed. */
export function parseOwnerCookie(cookie: string | null | undefined): string {
  for (const part of String(cookie ?? '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    if (part.slice(0, i).trim() !== OWNER_COOKIE) continue;
    const v = part.slice(i + 1).trim();
    return OWNER_RE.test(v) ? v : GUEST;
  }
  return GUEST;
}

/** What the cookie says RIGHT NOW. Only for noticing a change; data never follows it. */
export function readOwnerCookie(): string {
  try {
    const doc = (globalThis as { document?: { cookie?: string } }).document;
    return parseOwnerCookie(doc?.cookie);
  } catch {
    return GUEST;
  }
}

let PAGE_OWNER: string | null = null;

/**
 * The owner this page loaded with. Fixed by the first call in a browser and never
 * reassigned. (With no document, during the static render or in a test before it
 * sets one, the answer is `guest` and nothing is fixed yet.)
 */
export function pageOwner(): string {
  if (PAGE_OWNER !== null) return PAGE_OWNER;
  if (typeof (globalThis as { document?: unknown }).document === 'undefined') return GUEST;
  PAGE_OWNER = readOwnerCookie();
  return PAGE_OWNER;
}

/** True while this page is someone's, not a signed-out guest's. */
export function pageIsAccount(): boolean {
  return pageOwner() !== GUEST;
}

// ---- problems (a full store, or a store that refuses writes) -----------------------

export interface StorageProblem {
  /** full: out of space. blocked: storage unavailable, or any other refused write. */
  kind: 'full' | 'blocked';
  key: string;
  at: number;
}
type ProblemListener = (p: StorageProblem) => void;
// A plain in-page list: no DOM listener, no storage event, no channel.
const problemListeners = new Set<ProblemListener>();
let lastProblem: StorageProblem | null = null;

/** Hear about a write that failed: storage full, or storage refusing writes. */
export function onStorageProblem(fn: ProblemListener): () => void {
  problemListeners.add(fn);
  return () => { problemListeners.delete(fn); };
}
export function lastStorageProblem(): StorageProblem | null {
  return lastProblem;
}
let blockedReported = false;
function report(p: StorageProblem): void {
  // A blocked store refuses every write: tell the page once, not on every keystroke.
  if (p.kind === 'blocked') {
    if (blockedReported) return;
    blockedReported = true;
  }
  lastProblem = p;
  for (const fn of [...problemListeners]) {
    try { fn(p); } catch { /* a listener's bug never breaks a save */ }
  }
}

function isQuota(e: unknown): boolean {
  const err = e as { name?: string; code?: number; message?: string } | null;
  if (!err) return false;
  return err.name === 'QuotaExceededError'
    || err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || err.code === 22
    || err.code === 1014
    || /quota/i.test(String(err.message ?? ''));
}

// ---- one owner's view of one Storage ---------------------------------------------

export interface OwnedStorage {
  readonly owner: string;
  /** The real key a base key is stored under. */
  fullKey(key: string): string;
  /** The record as a string (what a raw getItem used to return). */
  getItem(key: string): string | null;
  /** The record as stored with setJSON. */
  getJSON<T = unknown>(key: string): T | null;
  setItem(key: string, value: string): WriteResult;
  setJSON(key: string, value: unknown): WriteResult;
  removeItem(key: string): void;
  /** This owner's base keys that start with `prefix`. */
  keys(prefix?: string): string[];
  /**
   * When the record was last written (the envelope's `t`), or null when there is none.
   * The outbox (lib/outbox.ts) compares it to tell whether a record changed while it was
   * being uploaded.
   */
  stamp(key: string): number | null;
}

export interface OwnedStorageOptions {
  owner: string;
  storage: () => KV | null;
  now?: () => number;
}

let lastStamp = 0;

export function createOwnedStorage(opts: OwnedStorageOptions): OwnedStorage {
  const owner = opts.owner;
  const head = `${PREFIX}${owner}:`;
  const now = opts.now ?? (() => Date.now());
  const kv = (): KV | null => {
    try { return opts.storage(); } catch { return null; }
  };
  const fullKey = (key: string) => head + key;

  function readEnvelope(key: string): Envelope | null {
    const s = kv();
    if (!s) return null;
    let raw: string | null;
    try { raw = s.getItem(fullKey(key)); } catch { return null; }
    if (raw === null) return null;
    try {
      const v = JSON.parse(raw) as Envelope;
      return v && typeof v === 'object' && v.v === 1 && 'd' in v ? v : null;
    } catch {
      return null;
    }
  }

  function write(key: string, d: unknown): WriteResult {
    const s = kv();
    if (!s) {
      report({ kind: 'blocked', key, at: now() });
      return 'blocked';
    }
    // `t` never repeats on this page, so two writes in one millisecond still read as two
    // changes to the outbox (lib/outbox.ts compares it). It is also above the stamp of the
    // record it replaces, so two TABS writing one key never leave the same stamp on different
    // contents (each tab counts for itself; a review reproduced that collision).
    const before = readEnvelope(key);
    const t = Math.max(now(), lastStamp + 1, before && typeof before.t === 'number' ? before.t + 1 : 0);
    lastStamp = t;
    const env: Envelope = { v: 1, d, t, up: null };
    let text: string;
    try { text = JSON.stringify(env); } catch { return 'blocked'; }
    try {
      s.setItem(fullKey(key), text);
      return 'ok';
    } catch (e) {
      if (isQuota(e)) {
        report({ kind: 'full', key, at: now() });
        return 'full';
      }
      report({ kind: 'blocked', key, at: now() });
      return 'blocked';
    }
  }

  return {
    owner,
    fullKey,
    getItem(key) {
      const e = readEnvelope(key);
      if (!e || e.d === null || e.d === undefined) return null;
      return typeof e.d === 'string' ? e.d : JSON.stringify(e.d);
    },
    getJSON<T = unknown>(key: string): T | null {
      const e = readEnvelope(key);
      return e && e.d !== undefined ? (e.d as T) : null;
    },
    setItem(key, value) {
      return write(key, String(value));
    },
    setJSON(key, value) {
      return write(key, value);
    },
    removeItem(key) {
      const s = kv();
      if (!s) return;
      try { s.removeItem(fullKey(key)); } catch { /* blocked: nothing to remove */ }
    },
    stamp(key) {
      const e = readEnvelope(key);
      return e && typeof e.t === 'number' ? e.t : null;
    },
    keys(prefix = '') {
      const s = kv();
      if (!s) return [];
      const out: string[] = [];
      try {
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && k.startsWith(head) && k.slice(head.length).startsWith(prefix)) out.push(k.slice(head.length));
        }
      } catch { /* blocked */ }
      return out;
    },
  };
}

// ---- legacy (unowned) keys ---------------------------------------------------------

/** Every personal key written before the prefix existed, and the key prefixes. */
export const LEGACY_EXACT = [
  'shCode:progress',
  'shCode_progress',
  'shCode:sync',
  'shCode:local-history',
  'shCode:sandbox-game',
  'moshion.store.v1',
  'moshion.library.deleted.v1',
  'moshion.library.origin.v1',
  'moshion.library.base.v1',
] as const;
export const LEGACY_PREFIXES = [
  'shCode:quiz:',
  'shCode:written:',
  'shCode_writtenGrader:',
  'shCode:diagram:',
  'shCode:flowblock:',
  'shCode:liveBlock:',
  'liveCodeBlock:',
  'shCode:starter:',
  'shCode:carry-dismissed:',
] as const;

export function isLegacyPersonalKey(k: string): boolean {
  return (LEGACY_EXACT as readonly string[]).includes(k) || LEGACY_PREFIXES.some((p) => k.startsWith(p));
}

const LEGACY_HEAD = `${PREFIX}${LEGACY}:`;
const STUCK_HEAD = `${PREFIX}${LEGACY}-stuck:`;

/**
 * Copy every legacy personal key into `w1:legacy:<key>` (or `<key>@<ms>` when an
 * earlier copy is already there), check the copy, then remove the original. Lossless:
 * a copy that fails (a full store) leaves the original in place, where no account
 * reads it either, and is tried again once a day (not on every page load).
 * Safe to run again after a failure halfway. Returns the keys moved.
 */
export function quarantineLegacy(s: KV, now: () => number = () => Date.now()): string[] {
  const found: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && !k.startsWith(PREFIX) && isLegacyPersonalKey(k)) found.push(k);
    }
  } catch {
    return [];
  }
  const moved: string[] = [];
  for (const k of found) {
    let raw: string | null;
    try { raw = s.getItem(k); } catch { continue; }
    if (raw === null) continue;
    // A copy that failed (a full store) is tried again once a day, or when the value changes.
    const stuck = STUCK_HEAD + k;
    const mark = `${raw.length}@${Math.floor(now() / 86_400_000)}`;
    try { if (s.getItem(stuck) === mark) continue; } catch { /* go on */ }
    let target = LEGACY_HEAD + k;
    try {
      if (s.getItem(target) !== null) {
        let n = 0;
        do { target = `${LEGACY_HEAD}${k}@${now()}${n ? `.${n}` : ''}`; n++; } while (s.getItem(target) !== null);
      }
      s.setItem(target, raw);
      if (s.getItem(target) !== raw) throw new Error('copy did not read back');
      s.removeItem(k);
      try { s.removeItem(stuck); } catch { /* fine */ }
      moved.push(k);
    } catch {
      try { if (s.getItem(target) !== raw) s.removeItem(target); } catch { /* fine */ }
      try { s.setItem(stuck, mark); } catch { /* fine */ }
    }
  }
  return moved;
}

/**
 * The set-aside copies of one legacy key (for the later teacher export and the tests;
 * nothing in the app reads them now), oldest name first: `[suffix, raw]`, where
 * suffix is '' or '@<ms>'. Includes the original key (suffix '!') when its copy is stuck.
 */
export function readLegacy(s: KV | null, key: string): [string, string][] {
  if (!s) return [];
  const out: [string, string][] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k || !k.startsWith(LEGACY_HEAD + key)) continue;
      const rest = k.slice((LEGACY_HEAD + key).length);
      if (rest !== '' && !rest.startsWith('@')) continue;
      const v = s.getItem(k);
      if (v !== null) out.push([rest, v]);
    }
    const orig = s.getItem(key);
    if (orig !== null) out.push(['!', orig]);
  } catch { /* blocked */ }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

// ---- the page's instances ----------------------------------------------------------

function browserLocal(): KV | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // an opaque origin throws on the READ of window.localStorage
  }
}
function browserSession(): KV | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

let quarantined = false;
function localWithQuarantine(): KV | null {
  const s = browserLocal();
  if (s && !quarantined) {
    quarantined = true;
    try { quarantineLegacy(s); } catch { /* lossless either way */ }
  }
  return s;
}

function lazyOwned(make: () => OwnedStorage): OwnedStorage {
  // Bound to the page's owner the first time it is used in a browser.
  let inst: OwnedStorage | null = null;
  const get = () => {
    if (inst) return inst;
    const o = make();
    if (typeof (globalThis as { document?: unknown }).document !== 'undefined') inst = o;
    return o;
  };
  return {
    get owner() { return get().owner; },
    fullKey: (k) => get().fullKey(k),
    getItem: (k) => get().getItem(k),
    getJSON: <T = unknown>(k: string) => get().getJSON<T>(k),
    setItem: (k, v) => get().setItem(k, v),
    setJSON: (k, v) => get().setJSON(k, v),
    removeItem: (k) => get().removeItem(k),
    keys: (p) => get().keys(p),
    stamp: (k) => get().stamp(k),
  };
}

/** This page's owner's records in localStorage. Every personal key goes through here. */
export const ownedLocal: OwnedStorage = lazyOwned(() =>
  createOwnedStorage({ owner: pageOwner(), storage: localWithQuarantine }));

/** This page's owner's records in sessionStorage (lasts only as long as the tab). */
export const ownedSession: OwnedStorage = lazyOwned(() =>
  createOwnedStorage({ owner: pageOwner(), storage: browserSession }));

/**
 * The guest namespace (work done while signed out on this computer), so a page that
 * is an account's can OFFER it (components/GuestWorkOffer.tsx). Never written into by
 * an account's page except to remove a record the student chose to bring in.
 */
export const guestLocal: OwnedStorage = createOwnedStorage({ owner: GUEST, storage: localWithQuarantine });
