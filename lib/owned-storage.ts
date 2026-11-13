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
// SEALED RECORDS. An account's records are sealed (lib/work-cipher.ts) with the account's work
// key, which the server puts in the readable `shcode_wk` cookie as `<owner id>.<key>`, always
// together with the owner cookie (sign-in, a page load with a session) and removes at sign-out
// (functions/_shared/auth.ts workKeyFor, functions/_middleware.ts):
//
//   s1:<owner>:<base key>   JSON { v: 1, t: <ms written>, e: <sealed text> }
//
// CLAUDE.md, "An account's records are sealed", states what this protects and what it does not,
// and the reason for each rule below. In short:
//  * The owner and the key are read ONCE, in one reading of the cookies, and a key is taken only
//    if it names this page's owner.
//  * Sealed records have their own prefix, so a page from before sealing never sees (and never
//    overwrites) one. It writes plain `w1:` records; where both exist the SEALED one is the record
//    and the plain one is set aside. Sealing new records is switched on in a later deploy
//    (SEAL_NEW_RECORDS), after tabs from before this code are gone.
//  * A page with no key works in plain records as before, except that a record with a sealed
//    copy is LOCKED to it: reads answer nothing, writes and removes are refused.
//  * A page keeps the key it loaded with until it is closed: a tab left open after sign-out goes
//    on reading and saving its own account's work, as it did before sealing. (An attempt to make
//    such a tab read nothing but still save let a blank screen overwrite real drafts.)
//  * Nothing here deletes work: an older version is set aside, an unopenable record is moved whole.

import { fromBase64, openText, sealText } from './work-cipher';

export const OWNER_COOKIE = 'shcode_owner';
export const GUEST = 'guest';
export const LEGACY = 'legacy';
const OWNER_RE = /^[a-z2-7]{16}$/;
const PREFIX = 'w1:';
const SEALED_PREFIX = 's1:';
export const WORK_KEY_COOKIE = 'shcode_wk';

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
/** A sealed record as stored: `e` opens to the JSON text of `d`. */
interface SealedEnvelope {
  v: 1;
  t: number;
  e: string;
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
let PAGE_KEY: Uint8Array | null | undefined;
let PAGE_KEY_RAW: string | null = null;

/**
 * The owner this page loaded with. Fixed by the first call in a browser and never
 * reassigned. (With no document, during the static render or in a test before it
 * sets one, the answer is `guest` and nothing is fixed yet.)
 */
export function pageOwner(): string {
  if (PAGE_OWNER !== null) return PAGE_OWNER;
  const doc = (globalThis as { document?: { cookie?: string } }).document;
  if (typeof doc === 'undefined') return GUEST;
  // The owner and the key are taken from ONE reading of the cookies, at the same instant: read
  // at different moments, a page could end up as one account holding another account's key.
  let cookie = '';
  try { cookie = String(doc.cookie ?? ''); } catch { cookie = ''; }
  PAGE_OWNER = parseOwnerCookie(cookie);
  const k = PAGE_OWNER === GUEST ? null : parseWorkKeyCookie(cookie, PAGE_OWNER);
  PAGE_KEY = k ? k.bytes : null;
  PAGE_KEY_RAW = k ? k.raw : null;
  return PAGE_OWNER;
}

/** True while this page is someone's, not a signed-out guest's. */
export function pageIsAccount(): boolean {
  return pageOwner() !== GUEST;
}

// ---- the work key ---------------------------------------------------------------

/**
 * The work key in a cookie header string, for `owner`, or null. The cookie's value is
 * `<owner id>.<key>`: the key names the account it belongs to, so a key that arrived for another
 * account (the browser applies Set-Cookie headers one at a time, and a slow answer can land after
 * someone else signed in) is never taken as this page's. `raw` is the value as it stands.
 */
export function parseWorkKeyCookie(cookie: string | null | undefined, owner: string): { bytes: Uint8Array; raw: string } | null {
  for (const part of String(cookie ?? '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i <= 0 || part.slice(0, i).trim() !== WORK_KEY_COOKIE) continue;
    const raw = part.slice(i + 1).trim();
    const m = /^([a-z2-7]{16})\.([A-Za-z0-9_-]{43})$/.exec(raw);
    if (!m || m[1] !== owner) return null;
    const bytes = fromBase64(m[2].replace(/-/g, '+').replace(/_/g, '/') + '=');
    return bytes && bytes.length === 32 ? { bytes, raw } : null;
  }
  return null;
}

/**
 * The key this page loaded with: fixed by the first call in a browser, in the same reading of the
 * cookies as the owner, and only ever that owner's. Null = this page works in plain records.
 * It stays in the page's memory, and the page keeps reading and saving with it, until the page is
 * closed or reloaded: a tab left open works as it did before sealing (stated in CLAUDE.md).
 */
export function pageWorkKey(): Uint8Array | null {
  if (PAGE_KEY !== undefined) return PAGE_KEY;
  if (typeof (globalThis as { document?: unknown }).document === 'undefined') return null;
  pageOwner(); // fixes both, from one reading of the cookies
  return PAGE_KEY ?? null;
}

/**
 * The session is known to be gone (GET /api/me answered "not signed in"): take the key cookie out
 * of the browser so the NEXT page that loads has no key. This page keeps the key it loaded with
 * until it is closed, so what is being typed here can still be saved (never lost for the sake of
 * locking). Only this page's own key is removed: another account's is not this page's to touch.
 */
export function dropWorkKeyCookie(): void {
  if (PAGE_KEY_RAW === null) return;
  try {
    const doc = (globalThis as { document?: { cookie?: string } }).document;
    if (!doc || parseWorkKeyCookie(doc.cookie, pageOwner())?.raw !== PAGE_KEY_RAW) return;
    doc.cookie = `${WORK_KEY_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  } catch { /* the server clears it on the next page load anyway */ }
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

// ---- problems (a full store, or a store that refuses writes) -----------------------

export interface StorageProblem {
  /**
   * full: out of space. blocked: storage unavailable, or any other refused write.
   * locked: the record has a sealed copy and this page has no key for it (nothing was changed).
   */
  kind: 'full' | 'blocked' | 'locked';
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
let lockedReported = false;
function report(p: StorageProblem): void {
  // A blocked store refuses every write: tell the page once, not on every keystroke.
  if (p.kind === 'blocked') {
    if (blockedReported) return;
    blockedReported = true;
  }
  if (p.kind === 'locked') {
    if (lockedReported) return;
    lockedReported = true;
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

/** What sealPlainRecords did, for the tests and for a later "this computer" panel. */
export interface SealReport {
  sealed: number;
  setAside: number;
  unreadable: number;
  failed: number;
}

export interface OwnedStorage {
  readonly owner: string;
  /** The real key a base key is stored under. */
  fullKey(key: string): string;
  /**
   * Every real key a base key can be stored under: the plain name and the sealed one. Match a
   * `storage` event against these, not `fullKey` alone, or a sealed record's change goes unseen.
   */
  storedKeys(key: string): string[];
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
  /**
   * With a key: seal every plain record of this owner (keeping its stamp), settle a record
   * that exists both plain and sealed, and move sealed records the key cannot open out of the
   * way. Without a key: nothing. Run once when a page starts (components/OwnerNotices.tsx).
   */
  sealPlainRecords(): SealReport;
  /** True when this owner has sealed records and this page has no key: its stored work is locked. */
  locked(): boolean;
}

export interface OwnedStorageOptions {
  owner: string;
  storage: () => KV | null;
  now?: () => number;
  /** The account's work key, or null. Absent = this storage never seals (guest, legacy). */
  key?: () => Uint8Array | null;
  /** Base keys that are never sealed (rewritten too often to seal each time). */
  plain?: (key: string) => boolean;
  /** Tests only. */
  random?: (n: number) => Uint8Array;
}

let lastStamp = 0;

/**
 * THE ROLLOUT SWITCH (owner's decision 2026-11-13: two steps). While false, a page with a key
 * reads sealed records and keeps a record sealed once it IS sealed, but saves NEW records as plain
 * text exactly as before, and the page-start sweep does nothing. So nothing is sealed yet, and a
 * tab still running the bundle from before sealing (which cannot see sealed records and would
 * write plain copies beside them) meets none. Set to true in a LATER deploy, once tabs from before
 * this code have died out (a week or two): every open tab then understands sealed records.
 * Three reviews found a new way for a pre-sealing tab to disturb sealed work each time; this
 * removes the situation instead of handling each case.
 */
let SEAL_NEW_RECORDS = false;
/** Tests only: scripts/owned-storage-tab.cjs turns sealing on for the step-two runs. */
export function __setSealNewRecordsForTests(on: boolean): void {
  SEAL_NEW_RECORDS = on;
}

/**
 * Called after a version has been set aside (stored under `aside:`), so it can also be put where
 * the student can find it: lib/local-history.ts shows a lab's set-aside code in History. The
 * `aside:` copy is the guarantee; this is the visibility. A plain in-page list, nothing global.
 */
type SetAsideListener = (key: string, d: unknown, t: number) => void;
const setAsideListeners = new Set<SetAsideListener>();
export function onSetAside(fn: SetAsideListener): () => void {
  setAsideListeners.add(fn);
  return () => { setAsideListeners.delete(fn); };
}

export function createOwnedStorage(opts: OwnedStorageOptions): OwnedStorage {
  const owner = opts.owner;
  const head = `${PREFIX}${owner}:`;
  const sealedHead = `${SEALED_PREFIX}${owner}:`;
  const now = opts.now ?? (() => Date.now());
  const random = opts.random ?? randomBytes;
  const kv = (): KV | null => {
    try { return opts.storage(); } catch { return null; }
  };
  const fullKey = (key: string) => head + key;
  const sealedKey = (key: string) => sealedHead + key;
  const workKey = (): Uint8Array | null => {
    try { return opts.key ? opts.key() : null; } catch { return null; }
  };

  function rawOf(s: KV, name: string): string | null {
    try { return s.getItem(name); } catch { return null; }
  }
  function parsePlain(raw: string | null): Envelope | null {
    if (raw === null) return null;
    try {
      const v = JSON.parse(raw) as Envelope;
      return v && typeof v === 'object' && v.v === 1 && 'd' in v ? v : null;
    } catch {
      return null;
    }
  }
  function parseSealed(raw: string | null): SealedEnvelope | null {
    if (raw === null) return null;
    try {
      const v = JSON.parse(raw) as SealedEnvelope;
      return v && typeof v === 'object' && v.v === 1 && typeof v.e === 'string' ? v : null;
    } catch {
      return null;
    }
  }
  const sealing = (key: string): boolean => !!opts.key && !(opts.plain && opts.plain(key));
  const openKey = workKey;

  // Opening is the costly part and pages read the same record many times: remember the last
  // opened TEXT per key, valid only while the stored text is exactly the same. Text, not the
  // parsed object: every read gets its own object, so a caller that changes what it was handed
  // (and then fails to save) cannot change what the next read sees.
  const opened = new Map<string, { raw: string; text: string; t: number }>();
  function openSealed(key: string, raw: string, k: Uint8Array): Envelope | null {
    let hit = opened.get(key);
    if (!hit || hit.raw !== raw) {
      const sealed = parseSealed(raw);
      if (!sealed) return null;
      const text = openText(k, sealed.e, sealedKey(key));
      if (text === null) return null;
      hit = { raw, text, t: sealed.t };
      opened.set(key, hit);
    }
    try {
      return { v: 1, d: JSON.parse(hit.text), t: hit.t, up: null };
    } catch {
      return null;
    }
  }

  type Read =
    | { state: 'none'; plainRaw: string | null }
    | { state: 'open'; env: Envelope; plainRaw: string | null; sealedRaw: string | null }
    /** A sealed copy exists and this page cannot open it. `t` is still readable. */
    | { state: 'locked'; t: number | null; plainRaw: string | null; sealedRaw: string };

  function read(key: string): Read {
    const s = kv();
    if (!s) return { state: 'none', plainRaw: null };
    const plainRaw = rawOf(s, fullKey(key));
    const plain = parsePlain(plainRaw);
    if (!sealing(key)) return plain ? { state: 'open', env: plain, plainRaw, sealedRaw: null } : { state: 'none', plainRaw };
    const sealedRaw = rawOf(s, sealedKey(key));
    if (sealedRaw === null) return plain ? { state: 'open', env: plain, plainRaw, sealedRaw: null } : { state: 'none', plainRaw };
    const k = openKey();
    const env = k ? openSealed(key, sealedRaw, k) : null;
    if (!env) return { state: 'locked', t: parseSealed(sealedRaw)?.t ?? null, plainRaw, sealedRaw };
    // Both exist (a page from before sealing wrote the plain one): the SEALED one is the record,
    // whatever the stamps say. An older page cannot see the sealed draft, so what it saves plain
    // may be a blank starter with a newer stamp; if "newer wins", that starter would become the
    // record and upload over the account's copy. The plain one is never dropped: the next save or
    // page start sets it aside first (see setAsidePlain), in History for lab code.
    return { state: 'open', env, plainRaw, sealedRaw };
  }

  function sealedText(key: string, d: unknown, t: number, k: Uint8Array): string | null {
    try {
      const env: SealedEnvelope = { v: 1, t, e: sealText(k, JSON.stringify(d === undefined ? null : d), sealedKey(key), random) };
      return JSON.stringify(env);
    } catch {
      return null;
    }
  }

  function put(s: KV, name: string, text: string, key: string): WriteResult {
    try {
      s.setItem(name, text);
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

  function freshId(): string {
    try { return crypto.randomUUID().slice(0, 8); } catch { return Math.random().toString(36).slice(2, 10); }
  }
  /** Store `text` under a name nothing occupies, and read it back. Never overwrites. */
  function keepUnder(s: KV, name: () => string, text: string): boolean {
    for (let i = 0; i < 4; i++) {
      const n = name();
      try {
        if (s.getItem(n) !== null) continue;
        s.setItem(n, text);
        if (s.getItem(n) === text) return true;
      } catch { return false; }
    }
    return false;
  }
  /**
   * A plain copy exists beside the sealed record and says something different: keep it (sealed,
   * under a name of its own, read back), tell whoever shows such things, and only then may the
   * caller remove it. False = it is NOT kept; the caller must leave everything as it is.
   */
  function setAsidePlain(s: KV, key: string, plain: Envelope, k: Uint8Array): boolean {
    const t = typeof plain.t === 'number' ? plain.t : 0;
    let kept = false;
    for (let i = 0; i < 4 && !kept; i++) {
      const asideKey = `aside:${t}:${freshId()}:${key}`;
      const text = sealedText(asideKey, plain.d, t, k);
      if (text === null) return false;
      kept = keepUnder(s, () => sealedKey(asideKey), text);
    }
    if (!kept) return false;
    for (const fn of [...setAsideListeners]) { try { fn(key, plain.d, t); } catch { /* the aside copy is the guarantee */ } }
    return true;
  }
  /** The plain and the sealed copy hold the same thing. */
  function sameContent(a: unknown, b: unknown): boolean {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }

  function write(key: string, d: unknown): WriteResult {
    const s = kv();
    if (!s) {
      report({ kind: 'blocked', key, at: now() });
      return 'blocked';
    }
    const before = read(key);
    if (before.state === 'locked') {
      // Never write over, or beside, work this page cannot read.
      report({ kind: 'locked', key, at: now() });
      return 'blocked';
    }
    // `t` never repeats on this page, so two writes in one millisecond still read as two
    // changes to the outbox (lib/outbox.ts compares it). It is also above the stamp of the
    // record it replaces, so two TABS writing one key never leave the same stamp on different
    // contents (each tab counts for itself; a review reproduced that collision).
    const pageKey = sealing(key) ? workKey() : null;
    // Seal when sealing is on, or when this record is already sealed (it stays sealed).
    const k = pageKey && (SEAL_NEW_RECORDS || (before.state === 'open' && before.sealedRaw !== null)) ? pageKey : null;
    const plainBefore = k ? parsePlain(before.plainRaw) : null;
    // A plain copy an older page left beside the sealed record: set it aside BEFORE this save, so
    // nothing an older page wrote is ever dropped unseen. If it cannot be kept, nothing is saved.
    if (k && plainBefore && before.state === 'open' && before.sealedRaw !== null && !sameContent(plainBefore.d, before.env.d)) {
      if (!setAsidePlain(s, key, plainBefore, k)) {
        report({ kind: 'full', key, at: now() });
        return 'full';
      }
    }
    const plainT = plainBefore && typeof plainBefore.t === 'number' ? plainBefore.t : 0;
    const prevT = Math.max(before.state === 'open' && typeof before.env.t === 'number' ? before.env.t : 0, plainT);
    const t = Math.max(now(), lastStamp + 1, prevT + 1);
    lastStamp = t;
    if (k) {
      const text = sealedText(key, d, t, k);
      if (text === null) return 'blocked';
      const res = put(s, sealedKey(key), text, key);
      if (res !== 'ok') return res;
      // The plain copy this save READ (and has kept, or which was the record itself) goes. A plain
      // copy that is NOT the one it read (an older page saved in between) stays for the next time.
      if (before.plainRaw !== null) {
        try { if (s.getItem(fullKey(key)) === before.plainRaw) s.removeItem(fullKey(key)); } catch { /* handled at the next save or page start */ }
      }
      return 'ok';
    }
    const env: Envelope = { v: 1, d, t, up: null };
    let text: string;
    try { text = JSON.stringify(env); } catch { return 'blocked'; }
    return put(s, fullKey(key), text, key);
  }

  function baseKeys(s: KV, prefix: string): string[] {
    const out = new Set<string>();
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (!k) continue;
        if (k.startsWith(head) && k.slice(head.length).startsWith(prefix)) out.add(k.slice(head.length));
        else if (opts.key && k.startsWith(sealedHead) && k.slice(sealedHead.length).startsWith(prefix)) {
          const base = k.slice(sealedHead.length);
          // Kept-aside and unreadable copies are not records a page lists.
          if (!base.startsWith('aside:') && !base.startsWith('unreadable:')) out.add(base);
        }
      }
    } catch { /* blocked */ }
    return [...out];
  }

  return {
    owner,
    fullKey,
    storedKeys: (key) => [fullKey(key), sealedKey(key)],
    getItem(key) {
      const r = read(key);
      if (r.state !== 'open') return null;
      const d = r.env.d;
      if (d === null || d === undefined) return null;
      return typeof d === 'string' ? d : JSON.stringify(d);
    },
    getJSON<T = unknown>(key: string): T | null {
      const r = read(key);
      return r.state === 'open' && r.env.d !== undefined ? (r.env.d as T) : null;
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
      // A record this page cannot read is not this page's to remove.
      const cur = read(key);
      if (cur.state === 'locked') { report({ kind: 'locked', key, at: now() }); return; }
      // A plain copy an older page left beside the sealed record is not what the caller saw: keep
      // it before it goes with the record (Reset would otherwise delete typing nobody was shown).
      const k = sealing(key) ? workKey() : null;
      const plain = k ? parsePlain(cur.plainRaw) : null;
      if (k && plain && cur.state === 'open' && cur.sealedRaw !== null && !sameContent(plain.d, cur.env.d)) {
        if (!setAsidePlain(s, key, plain, k)) { report({ kind: 'full', key, at: now() }); return; }
      }
      try { s.removeItem(fullKey(key)); } catch { /* blocked: nothing to remove */ }
      if (sealing(key)) {
        try { s.removeItem(sealedKey(key)); } catch { /* blocked */ }
        opened.delete(key);
      }
    },
    stamp(key) {
      const r = read(key);
      if (r.state === 'open') return typeof r.env.t === 'number' ? r.env.t : null;
      return r.state === 'locked' ? r.t : null;
    },
    keys(prefix = '') {
      const s = kv();
      return s ? baseKeys(s, prefix) : [];
    },
    locked() {
      if (!opts.key || openKey()) return false;
      const s = kv();
      if (!s) return false;
      try {
        for (let i = 0; i < s.length; i++) if (s.key(i)?.startsWith(sealedHead)) return true;
      } catch { /* blocked */ }
      return false;
    },
    sealPlainRecords() {
      const out: SealReport = { sealed: 0, setAside: 0, unreadable: 0, failed: 0 };
      // Decided BEFORE storage is touched: while sealing is off this call does nothing at all (not
      // even the first-use quarantine of older keys, which other code triggers when it needs to).
      if (!SEAL_NEW_RECORDS || !opts.key) return out;
      const s = kv();
      const k = openKey();
      if (!s || !k) return out;
      const names: string[] = [];
      try { for (let i = 0; i < s.length; i++) { const n = s.key(i); if (n) names.push(n); } } catch { return out; }

      // 1. Sealed records this key cannot open: out of the way, as they are, so the lesson can
      //    be saved again. (Not the set-aside or unreadable records themselves.)
      for (const name of names) {
        if (!name.startsWith(sealedHead)) continue;
        const key = name.slice(sealedHead.length);
        if (key.startsWith('unreadable:') || key.startsWith('aside:')) continue;
        const raw = rawOf(s, name);
        if (raw === null || openSealed(key, raw, k)) continue;
        const t = parseSealed(raw)?.t ?? now();
        if (!keepUnder(s, () => `${sealedHead}unreadable:${t}:${freshId()}:${key}`, raw)) { out.failed++; continue; }
        // Only if it is still the record that was moved (another tab may have saved meanwhile).
        try { if (s.getItem(name) === raw) s.removeItem(name); } catch { /* stays; tried again next start */ }
        out.unreadable++;
      }

      // 2. Plain records. No sealed copy: seal it, keeping its stamp (the outbox compares stamps).
      //    A sealed copy exists: that one is the record; a plain copy that says something else is
      //    set aside first (never dropped), and the sealed record is never rewritten here.
      for (const name of names) {
        if (!name.startsWith(head)) continue;
        const key = name.slice(head.length);
        if (!sealing(key)) continue;
        const raw = rawOf(s, name);
        const plain = parsePlain(raw);
        if (raw === null || !plain) continue;
        const sealedRaw = rawOf(s, sealedKey(key));
        if (sealedRaw !== null) {
          const cur = openSealed(key, sealedRaw, k);
          if (!cur) { out.failed++; continue; }
          if (!sameContent(cur.d, plain.d)) {
            if (!setAsidePlain(s, key, plain, k)) { out.failed++; continue; }
            out.setAside++;
          }
        } else {
          const t = typeof plain.t === 'number' ? plain.t : now();
          const text = sealedText(key, plain.d, t, k);
          if (text === null) { out.failed++; continue; }
          try {
            // Only if NOTHING moved since this pass read them: the plain record is still what was
            // read, and the sealed place is still empty. (The text is already built: nothing runs
            // between these checks and the write. What is left is the instant between two adjacent
            // storage calls, the same instant in which any two tabs saving one record can cross;
            // see CLAUDE.md.)
            if (s.getItem(name) !== raw || s.getItem(sealedKey(key)) !== null) continue;
            s.setItem(sealedKey(key), text);
            if (s.getItem(sealedKey(key)) !== text) { out.failed++; continue; }
          } catch { out.failed++; continue; }
          out.sealed++;
        }
        // The sealed record holds it, or it is kept aside: the plain copy goes, unless it changed
        // since it was read.
        try { if (s.getItem(name) === raw) s.removeItem(name); } catch { /* handled next time */ }
      }
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
    storedKeys: (k) => get().storedKeys(k),
    getItem: (k) => get().getItem(k),
    getJSON: <T = unknown>(k: string) => get().getJSON<T>(k),
    setItem: (k, v) => get().setItem(k, v),
    setJSON: (k, v) => get().setJSON(k, v),
    removeItem: (k) => get().removeItem(k),
    keys: (p) => get().keys(p),
    stamp: (k) => get().stamp(k),
    sealPlainRecords: () => get().sealPlainRecords(),
    locked: () => get().locked(),
  };
}

/**
 * The one record that is not sealed: the picture, sound and saved-game store a running sketch can
 * rewrite on every frame (lib/moshion-storage.ts). Sealing megabytes sixty times a second would
 * freeze the sketch. Pictures and sounds also live in the account (lib/library-sync.ts).
 */
function neverSealed(key: string): boolean {
  return key === 'moshion-store';
}

/** This page's owner's records in localStorage. Every personal key goes through here. */
export const ownedLocal: OwnedStorage = lazyOwned(() =>
  createOwnedStorage({
    owner: pageOwner(),
    storage: localWithQuarantine,
    ...(pageIsAccount() ? { key: pageWorkKey, plain: neverSealed } : {}),
  }));

/** This page's owner's records in sessionStorage (lasts only as long as the tab). */
export const ownedSession: OwnedStorage = lazyOwned(() =>
  createOwnedStorage({ owner: pageOwner(), storage: browserSession, ...(pageIsAccount() ? { key: pageWorkKey } : {}) }));

/**
 * The guest namespace (work done while signed out on this computer), so a page that
 * is an account's can OFFER it (components/GuestWorkOffer.tsx). Never written into by
 * an account's page except to remove a record the student chose to bring in.
 */
export const guestLocal: OwnedStorage = createOwnedStorage({ owner: GUEST, storage: localWithQuarantine });
