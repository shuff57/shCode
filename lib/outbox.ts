// Work kept on this computer uploads by itself when the connection is back (stage 2 of
// "work kept in this browser, per account"; design .ui-hill-climb/ux1/option2-design.md §3).
//
//   w1:<owner>:outbox:<record key>   one entry per record, e.g. w1:<owner>:outbox:progress:3-9-1
//
// An entry says "this record has not reached the account yet". It holds NO copy of the work:
// a send reads the STORED record as it is at that moment (lib/lesson-sync.ts). A drain never
// writes an editor into storage itself: it only runs saves that are already pending in this tab
// (lib/draft-autosave.ts flushPendingSaves), so a tab with an older editor cannot overwrite a
// draft another tab wrote.
// Each entry has its own key, so two tabs of one student never rewrite each other's entries.
//
// The rules, each one a blocker if broken:
//  * It sends only when ALL hold: the browser says it is online; the owner cookie right now
//    names the owner this page loaded with; this page's GET /api/me answered as signed in;
//    the page is an account's (a `guest` page never uploads); the entry is not paused.
//  * An entry is removed ONLY when the record has not changed since that send began (the
//    record's envelope stamp `t`, lib/owned-storage.ts) and no tab has re-queued it since
//    (the entry's `q`). An edit typed during a send is sent by the next one. Removing the
//    entry is the only thing this module deletes; no record of work is ever moved, removed
//    or overwritten here.
//  * A 401 pauses the entry ("Sign in again to upload"); the next page load that /api/me
//    confirms lifts it. A 409 owner-mismatch stops this page from sending (the stage 1
//    notice, components/OwnerNotices.tsx, already says why).
//  * Two versions (a file changed here AND on another computer) pause the entry until the
//    student chooses. Nothing uploads for that record meanwhile.
//  * Loading this module starts no timer, listener or channel. startOutbox(), called from a
//    component effect (components/OutboxRunner.tsx via lib/outbox-page.ts), starts them; its
//    return value stops them.
//  * The account is confirmed, not assumed: a page whose /api/me failed (opened offline) asks
//    again, uncached, on `online` and when the tab becomes visible, and loads the senders again
//    if that failed too. Confirmed means: a user came back, the owner cookie still names this
//    page's owner, and the `wo` /api/me returns (when it returns one) is this page's owner.
//
// Three kinds: lab and sandbox code (`progress:<id>`, lib/lesson-sync.ts), and since stage 3
// written answers (`written:<id>`) and flowchart drafts (`diagram:<id>`), both in
// lib/draft-sync.ts. Hand-ins are never queued. Quiz picks before Check are NOT uploaded: six
// reviews each found a new way for that to disturb a handed-in quiz, so it was left out.
//
// Runs: when the page loads (once /api/me answers), on `online`, when the tab becomes visible,
// EDIT_DELAY after the last queued change, and when the tab is hidden or closed (fetch
// keepalive). A failed send backs off from 5 s to 5 min. navigator.locks, when present,
// keeps two tabs of one student from sending at the same time; without it a double send is
// still harmless (the revision check turns the second into a no-op).

import { GUEST, ownedLocal, pageIsAccount, pageOwner, readOwnerCookie } from './owned-storage';
import { flushPendingSaves } from './draft-autosave';

export type OutboxKind = 'lab' | 'written' | 'diagram';
export const OUTBOX_PREFIX = 'outbox:';
const RECORD_PREFIX: Record<OutboxKind, string> = { lab: 'progress:', written: 'written:', diagram: 'diagram:' };

function isKind(k: unknown): k is OutboxKind {
  return typeof k === 'string' && Object.prototype.hasOwnProperty.call(RECORD_PREFIX, k);
}

/** The record an entry stands for: `progress:<id>` (lab and sandbox code), `written:<id>`, `diagram:<id>`. */
export function recordKeyOf(kind: OutboxKind, id: string): string {
  return RECORD_PREFIX[kind] + id;
}
function entryKey(kind: OutboxKind, id: string): string {
  return OUTBOX_PREFIX + recordKeyOf(kind, id);
}

/** The other computer's version, kept in History while the entry is paused. */
export interface OtherVersion {
  revision: number;
  updatedAt: number | null;
  /** The History snapshot holding it (lib/local-history.ts), or null when it could not be kept. */
  snap: string | null;
  label: string;
  /** The server said this revision is a Saved version (has a Cloud history row). Absent = not known. */
  versioned?: boolean;
}

export interface OutboxEntry {
  kind: OutboxKind;
  id: string;
  /** Changes on every queueing, so a send never removes an entry another tab re-queued. */
  q: string;
  queuedAt: number;
  tries: number;
  nextAt: number;
  lastError: string | null;
  paused?: 'conflict' | 'auth';
  other?: OtherVersion;
  /** The student chose "Keep mine" over `other.revision`. */
  keep?: 'mine';
}

export type SendResult =
  | { kind: 'done'; wroteT?: number | null }
  | { kind: 'retry'; error: string }
  | { kind: 'skip' }
  | { kind: 'auth' }
  | { kind: 'owner' }
  | { kind: 'conflict'; other: OtherVersion };

export interface Sender {
  /**
   * Send the record as it is now. `done.wroteT` is the record's new stamp when the sender
   * itself wrote the record (a clean merge brought in another computer's files); null means
   * "I could not tell, keep the entry".
   */
  send(entry: OutboxEntry, opts: { keepalive: boolean }): Promise<SendResult>;
}

// ---- in-page state (plain values: nothing runs at import) ---------------------------

const senders = new Map<OutboxKind, Sender>();
const listeners = new Set<() => void>();
const sending = new Set<string>();
const uploadedAt = new Map<string, number>();
let started = false;
let meConfirmed = false;
let confirmingCount = 0;
let stopped: 'auth' | 'owner' | null = null;
let draining: Promise<void> | null = null;
let again = false;
let editTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAt = 0;

export const EDIT_DELAY_MS = 30_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 300_000;
let editDelay = EDIT_DELAY_MS;
let retryBase = RETRY_BASE_MS;
let clock: () => number = () => Date.now();

export function registerSender(kind: OutboxKind, s: Sender): () => void {
  senders.set(kind, s);
  return () => { if (senders.get(kind) === s) senders.delete(kind); };
}

/** Hear when an entry or an upload changed (the status chip re-reads). */
export function onOutboxChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function notify(): void {
  for (const fn of [...listeners]) { try { fn(); } catch { /* a listener's bug never breaks a send */ } }
}

function newQ(): string {
  try { return crypto.randomUUID(); } catch { return `${clock()}-${Math.random().toString(36).slice(2, 10)}`; }
}

function asEntry(v: unknown): OutboxEntry | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as OutboxEntry;
  if (!isKind(e.kind) || typeof e.id !== 'string' || typeof e.q !== 'string') return null;
  return {
    ...e,
    tries: Number(e.tries) || 0,
    nextAt: Number(e.nextAt) || 0,
    queuedAt: Number(e.queuedAt) || 0,
    lastError: typeof e.lastError === 'string' ? e.lastError : null,
  };
}

export function readEntry(kind: OutboxKind, id: string): OutboxEntry | null {
  if (!pageIsAccount()) return null;
  return asEntry(ownedLocal.getJSON(entryKey(kind, id)));
}
function writeEntry(e: OutboxEntry): void {
  const clean: OutboxEntry = { ...e };
  if (!clean.paused) delete clean.paused;
  if (!clean.other) delete clean.other;
  if (!clean.keep) delete clean.keep;
  ownedLocal.setJSON(entryKey(e.kind, e.id), clean);
}

/** Every entry of this page's owner (none on a guest page). */
export function listEntries(): OutboxEntry[] {
  if (!pageIsAccount()) return [];
  const out: OutboxEntry[] = [];
  for (const k of ownedLocal.keys(OUTBOX_PREFIX)) {
    const e = asEntry(ownedLocal.getJSON(k));
    if (e && OUTBOX_PREFIX + recordKeyOf(e.kind, e.id) === k) out.push(e);
  }
  return out;
}

/**
 * The record changed and has not reached the account: queue it. Keeps a pause (the student
 * still has to choose) and restarts the wait for an upload EDIT_DELAY from now.
 */
export function enqueue(kind: OutboxKind, id: string): void {
  if (!pageIsAccount() || !isKind(kind)) return;
  const prev = readEntry(kind, id);
  writeEntry({
    kind,
    id,
    q: newQ(),
    queuedAt: prev?.queuedAt ?? clock(),
    tries: 0,
    nextAt: 0,
    lastError: prev?.lastError ?? null,
    paused: prev?.paused,
    other: prev?.other,
    keep: prev?.keep,
  });
  notify();
  armEdit();
}

/** Pause an entry because there are two versions (creates it if needed). */
export function pauseForConflict(kind: OutboxKind, id: string, other: OtherVersion): void {
  if (!pageIsAccount() || !isKind(kind)) return;
  const prev = readEntry(kind, id);
  writeEntry({
    kind, id, q: newQ(), queuedAt: prev?.queuedAt ?? clock(), tries: 0, nextAt: 0, lastError: null,
    paused: 'conflict', other, keep: undefined,
  });
  notify();
}

/**
 * The student chose. 'mine': upload this computer's version over the other one (files the
 * other computer changed that this one did not still come in). 'resolved': nothing is
 * waiting any more (the other version was opened, or a Save went through); the next send
 * finds the record already uploaded and removes the entry under the usual rule.
 */
export function choose(kind: OutboxKind, id: string, choice: 'mine' | 'resolved'): void {
  const prev = readEntry(kind, id);
  if (!prev) return;
  writeEntry({
    ...prev,
    q: newQ(),
    tries: 0,
    nextAt: 0,
    lastError: null,
    paused: undefined,
    keep: choice === 'mine' ? 'mine' : undefined,
    other: choice === 'mine' ? prev.other : undefined,
  });
  notify();
  if (started) void drain({ force: true });
}

/** A Save or an upload outside the outbox reached the account (the chip shows the time). */
export function noteUploaded(kind: OutboxKind, id: string): void {
  uploadedAt.set(entryKey(kind, id), clock());
  notify();
}

// ---- when it may send ----------------------------------------------------------------

export type Blocked = 'guest' | 'owner' | 'auth' | 'me' | 'offline';

function browserOffline(): boolean {
  try {
    const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
    return nav?.onLine === false;
  } catch {
    return false;
  }
}

/** Why this page may not send right now, or null when it may. */
export function blockedReason(): Blocked | null {
  if (!pageIsAccount()) return 'guest';
  const cookie = readOwnerCookie();
  if (cookie !== pageOwner()) return cookie === GUEST ? 'auth' : 'owner';
  // The server refused this page as someone else's: the cookie names this page's owner again
  // (checked just above), so the account is back and owner-fetch will send again too.
  if (stopped === 'owner') stopped = null;
  if (stopped === 'auth') return 'auth';
  if (!meConfirmed) return 'me';
  if (browserOffline()) return 'offline';
  return null;
}

// ---- timers (armed only while started) ---------------------------------------------------

function armEdit(): void {
  if (!started) return;
  if (editTimer) clearTimeout(editTimer);
  editTimer = setTimeout(() => { editTimer = null; void drain(); }, editDelay);
}
function armRetry(at: number): void {
  if (!started) return;
  if (retryTimer && retryAt <= at) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryAt = at;
  retryTimer = setTimeout(() => { retryTimer = null; retryAt = 0; void drain(); }, Math.max(0, at - clock()));
}
function backoff(tries: number): number {
  return Math.min(RETRY_MAX_MS, retryBase * 2 ** Math.max(0, tries - 1));
}

// ---- sending ------------------------------------------------------------------------------

export interface DrainOptions {
  /** Ignore the backoff (the page loaded, the connection came back, the tab came back). */
  force?: boolean;
  /** The tab is being hidden or closed: send with fetch keepalive, without waiting for a lock. */
  keepalive?: boolean;
}

type LockManager = {
  request(name: string, opts: { ifAvailable?: boolean }, cb: (lock: unknown) => Promise<void>): Promise<void>;
};
function locks(): LockManager | null {
  try {
    const l = (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks;
    return l && typeof l.request === 'function' ? l : null;
  } catch {
    return null;
  }
}

/** Send what is waiting. One drain at a time per page; a second request runs once more after it. */
export function drain(opts: DrainOptions = {}): Promise<void> {
  if (opts.keepalive) return runOnce(opts).catch(() => {});
  if (draining) { again = true; return draining; }
  const lm = locks();
  const run = lm
    ? lm.request(`shcode-outbox:${pageOwner()}`, { ifAvailable: true }, async (lock) => {
      // Another tab of this student is sending: it will reach these entries, or we try soon.
      if (!lock) { armRetry(clock() + retryBase); return; }
      await runOnce(opts);
    })
    : runOnce(opts);
  draining = Promise.resolve(run).catch(() => {}).finally(() => {
    draining = null;
    if (again) { again = false; void drain(); }
  });
  return draining;
}

async function runOnce(opts: DrainOptions): Promise<void> {
  const keepalive = !!opts.keepalive;
  if (blockedReason()) return;
  // Only edits THIS tab has not written yet; never an editor that is merely open.
  flushPendingSaves();
  for (const listed of listEntries()) {
    if (blockedReason()) return;
    const ek = entryKey(listed.kind, listed.id);
    if (sending.has(ek)) continue;
    const sender = senders.get(listed.kind);
    if (!sender) continue;
    if (listed.paused) continue;
    if (!opts.force && listed.nextAt > clock()) { armRetry(listed.nextAt); continue; }
    const cur = readEntry(listed.kind, listed.id);
    if (!cur || cur.paused) continue;
    const rk = recordKeyOf(cur.kind, cur.id);
    const t0 = ownedLocal.stamp(rk);
    sending.add(ek);
    notify();
    let r: SendResult;
    try {
      r = await sender.send(cur, { keepalive });
    } catch (e) {
      r = { kind: 'retry', error: String((e as Error)?.message ?? e) };
    }
    sending.delete(ek);
    settle(cur, r, t0);
    notify();
  }
}

function settle(sent: OutboxEntry, r: SendResult, t0: number | null): void {
  const { kind, id } = sent;
  const ek = entryKey(kind, id);
  const rk = recordKeyOf(kind, id);
  switch (r.kind) {
    case 'done': {
      uploadedAt.set(ek, clock());
      const expect = r.wroteT === undefined ? t0 : r.wroteT;
      // null from the sender: it could not tell whether the record is what went up. Keep it.
      const unchanged = r.wroteT !== null && ownedLocal.stamp(rk) === expect;
      const fresh = readEntry(kind, id);
      // Rule 4: only when the record is exactly what was sent and nobody queued it again.
      if (fresh && fresh.q === sent.q && unchanged) {
        ownedLocal.removeItem(ek);
      } else if (fresh) {
        // Changed while it was being sent: the newer text goes next time. A choice is spent.
        writeEntry({ ...fresh, tries: 0, nextAt: 0, lastError: null, keep: undefined, other: fresh.paused ? fresh.other : undefined });
        armRetry(clock() + Math.min(editDelay, retryBase));
      }
      return;
    }
    case 'retry': {
      const fresh = readEntry(kind, id) ?? sent;
      const tries = fresh.tries + 1;
      const nextAt = clock() + backoff(tries);
      writeEntry({ ...fresh, tries, nextAt, lastError: r.error || 'error' });
      armRetry(nextAt);
      return;
    }
    case 'skip':
      armRetry(clock() + retryBase);
      return;
    case 'auth': {
      const fresh = readEntry(kind, id) ?? sent;
      writeEntry({ ...fresh, paused: 'auth', lastError: '401' });
      stopped = 'auth';
      return;
    }
    case 'owner':
      stopped = 'owner';
      return;
    case 'conflict': {
      const fresh = readEntry(kind, id) ?? sent;
      writeEntry({ ...fresh, paused: 'conflict', other: r.other, keep: undefined, tries: 0, nextAt: 0, lastError: null });
      return;
    }
  }
}

// ---- what the student sees ---------------------------------------------------------------

export type UploadState = 'none' | 'offline' | 'waiting' | 'sending' | 'uploaded' | 'conflict' | 'auth';
export interface UploadStatus {
  state: UploadState;
  /** When this page last uploaded the record (for "Uploaded 10:42"). */
  at: number | null;
  other: OtherVersion | null;
}

export function uploadStatus(kind: OutboxKind, id: string): UploadStatus {
  const ek = entryKey(kind, id);
  const at = uploadedAt.get(ek) ?? null;
  if (!pageIsAccount()) return { state: 'none', at: null, other: null };
  const e = readEntry(kind, id);
  if (sending.has(ek)) return { state: 'sending', at, other: null };
  if (e?.paused === 'conflict') return { state: 'conflict', at, other: e.other ?? null };
  if (e) {
    const why = blockedReason();
    if (e.paused === 'auth' || why === 'auth') return { state: 'auth', at, other: null };
    if (why === 'offline' || (e.lastError && e.lastError !== '401')) return { state: 'offline', at, other: null };
    return { state: 'waiting', at, other: null };
  }
  return { state: at !== null ? 'uploaded' : 'none', at, other: null };
}

/** The chip's words, in plain language for a 14-year-old. */
export function uploadText(s: UploadStatus, formatTime: (ms: number) => string = clockTime): string | null {
  switch (s.state) {
    case 'offline': return "Saved on this computer. Will upload when you're back online";
    case 'waiting': return 'Saved on this computer';
    case 'sending': return 'Uploading...';
    case 'uploaded': return s.at !== null ? `Uploaded ${formatTime(s.at)}` : 'Uploaded';
    case 'conflict': return 'Two versions. Choose';
    case 'auth': return 'Sign in again to upload';
    default: return null;
  }
}

export function clockTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    const d = new Date(ms);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/** "10:42 AM" today, "Nov 3, 10:42 AM" another day: the label of the other computer's version. */
export function whenText(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  if (sameDay) return clockTime(ms);
  try {
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${clockTime(ms)}`;
  } catch {
    return `${d.getMonth() + 1}/${d.getDate()}, ${clockTime(ms)}`;
  }
}

// ---- start / stop (from a component effect only) -----------------------------------------------

export interface StartOptions {
  /**
   * Who GET /api/me says is signed in, asked fresh each time (lib/auth.ts refreshCurrentUser),
   * or null. `wo`, when the server sends it, is that account's work owner.
   */
  me: () => Promise<{ email: string; wo?: string | null } | null>;
  /** Load and install the senders (a dynamic import); tried again until it works. Returns the undo. */
  loadSenders?: () => Promise<() => void>;
  /** Tests only. */
  editDelayMs?: number;
  retryBaseMs?: number;
  now?: () => number;
}

/** Start the triggers. Returns the stop. A second call while started does nothing. */
export function startOutbox(opts: StartOptions): () => void {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  editDelay = opts.editDelayMs ?? EDIT_DELAY_MS;
  retryBase = opts.retryBaseMs ?? RETRY_BASE_MS;
  if (opts.now) clock = opts.now;
  let live = true;
  let sendersReady = !opts.loadSenders;
  let uninstall: (() => void) | null = null;
  let confirming: Promise<void> | null = null;
  const doc = (globalThis as { document?: Document }).document;

  // Load the senders and confirm the ACCOUNT (not just "someone"): a user came back, the owner
  // cookie still names this page's owner, and so does the `wo` /api/me sent, when it sent one.
  // Asked again on `online` and on tab visible until both are done (a page opened offline).
  const confirm = (): Promise<void> => {
    if (confirming) return confirming;
    confirmingCount++;
    confirming = (async () => {
      if (!sendersReady && opts.loadSenders) {
        try {
          const off = await opts.loadSenders();
          if (!live) { off(); return; }
          uninstall = off;
          sendersReady = true;
        } catch { /* offline first visit: the chunk did not load; tried again later */ }
      }
      if (!meConfirmed) {
        let u: { email: string; wo?: string | null } | null = null;
        try { u = await opts.me(); } catch { u = null; }
        if (!live) return;
        const owner = pageOwner();
        if (u && u.email && readOwnerCookie() === owner && (u.wo === undefined || u.wo === null || u.wo === owner)) {
          meConfirmed = true;
          // A 401 pause is not the student's decision: a page that /api/me confirms lifts it.
          if (stopped === 'auth') stopped = null;
          for (const e of listEntries()) if (e.paused === 'auth') writeEntry({ ...e, paused: undefined, lastError: null });
        }
      }
      notify();
      if (meConfirmed && sendersReady) void drain({ force: true });
    })().finally(() => { confirming = null; confirmingCount--; });
    return confirming;
  };
  const resume = () => {
    notify();
    if (!meConfirmed || !sendersReady) void confirm();
    else void drain({ force: true });
  };
  const onOffline = () => notify();
  const leaving = () => {
    // Saves still counting down in THIS tab are written (and queued) first, so the last
    // seconds go too. Nothing that is merely open is written.
    flushPendingSaves();
    void drain({ force: true, keepalive: true });
  };
  const onVisibility = () => {
    if (doc?.visibilityState === 'hidden') leaving();
    else resume();
  };
  window.addEventListener('online', resume);
  window.addEventListener('offline', onOffline);
  window.addEventListener('pagehide', leaving);
  doc?.addEventListener('visibilitychange', onVisibility);
  if (pageIsAccount()) void confirm();
  return () => {
    live = false;
    started = false;
    window.removeEventListener('online', resume);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('pagehide', leaving);
    doc?.removeEventListener('visibilitychange', onVisibility);
    if (editTimer) clearTimeout(editTimer);
    if (retryTimer) clearTimeout(retryTimer);
    editTimer = null;
    retryTimer = null;
    retryAt = 0;
    uninstall?.();
    uninstall = null;
  };
}

/** True while a drain or a send is running on this page (tests wait for it to settle). */
export function outboxBusy(): boolean {
  return draining !== null || sending.size > 0 || confirmingCount > 0;
}

/** True once this page's /api/me answered as signed in (and the outbox is running). */
export function outboxConfirmed(): boolean {
  return meConfirmed;
}

/** Tests only: forget the page's state. */
export function __resetOutboxForTests(): void {
  meConfirmed = false;
  stopped = null;
  sending.clear();
  uploadedAt.clear();
  draining = null;
  again = false;
}
