// Written answers and flowchart drafts upload by themselves (per-account storage, stage 3). The
// rules are lib/draft-sync-core.ts; this is the browser half: what this computer remembers about
// the account's copy, the outbox senders (lib/outbox.ts), and the two choices.
//
//   w1:<owner>:draft-sync:<kind>:<lessonId>           TextSync   (kind: written | diagram)
//   w1:<owner>:draft-kept:<kind>:<lessonId>:<random>  a version the student did NOT choose
//
// Quiz picks before Check are NOT uploaded (they stay on the computer until Check, as before).
//
// Rules, each one a blocker if broken:
//  * A send reads the STORED record and never writes it or an editor. What this computer
//    remembers about the account moves only to what really went up or came down.
//  * Text is never merged. The same row changed here and in the account: both are kept, the
//    entry pauses, and the student chooses. The one not chosen is stored here FIRST (read
//    back); if that cannot be done nothing changes.
//  * "Could not ask the account" is not "the account has nothing": an arrival that failed
//    changes nothing this computer remembers.
//  * Hand-ins (Check, Submit) are not sent from here. They stay online only (lib/offline.ts).

import { ownedLocal, pageIsAccount } from './owned-storage';
import {
  choose, enqueue, noteUploaded, pauseForConflict, readEntry, whenText,
  type OtherVersion, type OutboxEntry, type Sender, type SendResult,
} from './outbox';
import { isOwnerMismatchResponse } from './owner-fetch';
import { putDraft } from './written-grader-store';
import { DIAGRAM_KEY, WRITTEN_KEY, loadWrittenRecord, saveDiagramText, saveWrittenRecord } from './work-records';
import { NO_TEXT_SYNC, conflictWith, textArrival, type OtherText, type TextArrival, type TextSync } from './draft-sync-core';

export type TextKind = 'written' | 'diagram';

const TEXT_SYNC = 'draft-sync:';
const TEXT_KEPT = 'draft-kept:';

// ---- what the account has (a failure is NOT "nothing") ------------------------------------

export type Asked<T> = { ok: true; row: T | null } | { ok: false };

async function ask<T>(url: string, pick: (body: Record<string, unknown>) => T | null): Promise<Asked<T>> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as Record<string, unknown>;
    return { ok: true, row: pick(body) };
  } catch {
    return { ok: false };
  }
}

/** The account's lesson_drafts row. `ok: false` when it could not be asked. */
export function askDraft(lessonId: string): Promise<Asked<{ text: string; updatedAt: number }>> {
  return ask(`/api/lesson-drafts/${encodeURIComponent(lessonId)}`, (b) =>
    typeof b.response === 'string' && typeof b.updatedAt === 'number' ? { text: b.response, updatedAt: b.updatedAt } : null);
}

// ---- stored records -------------------------------------------------------------------------

function textSyncKey(kind: TextKind, lessonId: string): string {
  return `${TEXT_SYNC}${kind}:${lessonId}`;
}
export function loadTextSync(kind: TextKind, lessonId: string): TextSync | null {
  const v = ownedLocal.getJSON<TextSync>(textSyncKey(kind, lessonId));
  if (!v || typeof v !== 'object') return null;
  const other = v.other && typeof v.other.text === 'string' && typeof v.other.updatedAt === 'number'
    ? { text: v.other.text, updatedAt: v.other.updatedAt } : undefined;
  return {
    base: typeof v.base === 'number' ? v.base : null,
    text: typeof v.text === 'string' ? v.text : null,
    ...(other ? { other } : {}),
  };
}
function saveTextSync(kind: TextKind, lessonId: string, s: TextSync): boolean {
  const clean: TextSync = { base: s.base, text: s.text, ...(s.other ? { other: s.other } : {}) };
  return ownedLocal.setJSON(textSyncKey(kind, lessonId), clean) === 'ok';
}

/** The stored text for a lesson, or null when this computer has no record of it. */
export function storedText(kind: TextKind, lessonId: string): string | null {
  if (kind === 'diagram') return ownedLocal.getItem(DIAGRAM_KEY + lessonId);
  if (ownedLocal.getItem(WRITTEN_KEY + lessonId) === null) return null;
  return loadWrittenRecord(lessonId).response;
}
function writeStoredText(kind: TextKind, lessonId: string, text: string): boolean {
  if (kind === 'diagram') saveDiagramText(lessonId, text);
  else saveWrittenRecord(lessonId, { ...loadWrittenRecord(lessonId), response: text });
  return storedText(kind, lessonId) === text;
}

/** A version the student did not choose, kept on this computer until they remove it. */
export interface KeptText {
  text: string;
  /** Whose it was: this computer's ('mine') or the account's from another computer ('other'). */
  which: 'mine' | 'other';
  at: number;
}
function keptKey(kind: TextKind, lessonId: string): string {
  // The id is encoded so no lesson id can be a key prefix of another's (`part` vs `part:child`).
  return `${TEXT_KEPT}${kind}:${encodeURIComponent(lessonId)}`;
}
/**
 * Every kept version, oldest first. Each has its OWN key (`draft-kept:<kind>:<id>:<random>`), so
 * two tabs keeping at the same moment never rewrite each other: nothing kept is ever replaced.
 */
function keptEntries(kind: TextKind, lessonId: string): { key: string; kept: KeptText }[] {
  const out: { key: string; kept: KeptText }[] = [];
  for (const key of ownedLocal.keys(keptKey(kind, lessonId) + ':')) {
    const k = ownedLocal.getJSON<KeptText>(key);
    if (!k || typeof k !== 'object' || typeof k.text !== 'string') continue;
    out.push({ key, kept: { text: k.text, which: k.which === 'mine' ? 'mine' : 'other', at: Number(k.at) || 0 } });
  }
  return out.sort((a, b) => (ownedLocal.stamp(a.key) ?? 0) - (ownedLocal.stamp(b.key) ?? 0));
}
export function loadKeptList(kind: TextKind, lessonId: string): KeptText[] {
  return keptEntries(kind, lessonId).map((e) => e.kept);
}
/** The newest kept version (tests and simple callers). */
export function loadKept(kind: TextKind, lessonId: string): KeptText | null {
  const list = loadKeptList(kind, lessonId);
  return list.length ? list[list.length - 1] : null;
}
/** Add a version under a new key and read it back. False = it is NOT kept; the caller changes nothing. */
export function keepText(kind: TextKind, lessonId: string, kept: KeptText): boolean {
  if (loadKeptList(kind, lessonId).some((k) => k.text === kept.text)) return true;
  let id: string;
  try { id = crypto.randomUUID(); } catch { id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
  const key = `${keptKey(kind, lessonId)}:${id}`;
  ownedLocal.setJSON(key, kept);
  const back = ownedLocal.getJSON<KeptText>(key);
  return !!back && back.text === kept.text;
}
/** The student removed one kept version (after confirming): only keys holding exactly that text. */
export function dismissKept(kind: TextKind, lessonId: string, text: string): void {
  for (const e of keptEntries(kind, lessonId)) if (e.kept.text === text) ownedLocal.removeItem(e.key);
  notifyKept();
}

const keptListeners = new Set<() => void>();
export function onKeptChange(fn: () => void): () => void {
  keptListeners.add(fn);
  return () => { keptListeners.delete(fn); };
}
function notifyKept(): void {
  for (const fn of [...keptListeners]) { try { fn(); } catch { /* a listener's bug changes nothing */ } }
}

function otherVersion(o: OtherText): OtherVersion {
  return { revision: o.updatedAt, updatedAt: o.updatedAt, snap: null, label: `From another computer, ${whenText(o.updatedAt)}` };
}

// ---- arrival (a page opening signed in) ----------------------------------------------------

/**
 * What this computer remembered when a page STARTED asking the account. If it is different when
 * the answer comes back (an upload, a Save draft, a Check or a choice finished meanwhile), the
 * answer describes an older account and is not applied. No clocks or stamp ordering involved.
 */
export function textToken(kind: TextKind, lessonId: string): string {
  return JSON.stringify(loadTextSync(kind, lessonId));
}

/**
 * Decide what a written answer or flowchart opens with, record it, and queue or pause as
 * needed. `server` is what askDraft returned; a failed ask opens this computer's copy and
 * changes nothing remembered.
 */
export function arriveText(
  kind: TextKind,
  lessonId: string,
  server: Asked<{ text: string; updatedAt: number }>,
  blank?: string,
  /** textToken() taken before the account was asked. */
  token?: string,
): TextArrival {
  const local = storedText(kind, lessonId);
  const sync = loadTextSync(kind, lessonId);
  if (!server.ok || !pageIsAccount() || (token !== undefined && token !== textToken(kind, lessonId))) {
    noteTextSaved(kind, lessonId, blank);
    return { use: 'local', upload: false, sync: sync ?? NO_TEXT_SYNC };
  }
  let a = textArrival({ local, blank, sync, server: server.row });
  if (a.keepLocal && server.row && local !== null) {
    // The account's text opens over this computer's: this computer's is stored first. If that
    // cannot be done, nothing is replaced and the student chooses instead.
    if (keepText(kind, lessonId, { text: local, which: 'mine', at: Date.now() })) notifyKept();
    else a = conflictWith(sync ?? NO_TEXT_SYNC, server.row);
  }
  if (a.use === 'server' && server.row && local !== server.row.text) {
    // The stored record becomes the account's text BEFORE this computer remembers that it
    // agrees with the account. If the record cannot be written, the old record would otherwise
    // look like a newer edit and upload over the text just fetched: so nothing is remembered
    // and this computer's copy opens as it is.
    if (!writeStoredText(kind, lessonId, server.row.text)) {
      return { use: 'local', upload: false, sync: sync ?? NO_TEXT_SYNC };
    }
  }
  if (!saveTextSync(kind, lessonId, a.sync) && a.use === 'conflict') {
    // The waiting version could not be recorded: nothing uploads from this page for this lesson.
  }
  if (a.use === 'conflict' && a.sync.other) {
    pauseForConflict(kind, lessonId, otherVersion(a.sync.other));
  } else {
    // A choice that was waiting is moot once the two copies agree again.
    if (readEntry(kind, lessonId)?.paused === 'conflict') choose(kind, lessonId, 'resolved');
    if (a.upload) enqueue(kind, lessonId);
  }
  return a;
}

// ---- a component just wrote its record ----------------------------------------------------

function textIsUploaded(text: string, sync: TextSync): boolean {
  return sync.text === text || (sync.text === null && text === '');
}

/** The stored text changed: queue it when it is not what the account has. */
export function noteTextSaved(kind: TextKind, lessonId: string, blank?: string): void {
  if (!pageIsAccount()) return;
  const text = storedText(kind, lessonId);
  if (text === null) return;
  const sync = loadTextSync(kind, lessonId) ?? NO_TEXT_SYNC;
  if (sync.other || textIsUploaded(text, sync)) return;
  // An untouched starter with nothing in the account is not work to upload.
  if (blank !== undefined && text === blank && sync.text === null) return;
  enqueue(kind, lessonId);
}

// ---- sending -------------------------------------------------------------------------------

type Reply =
  | { kind: 'ok'; updatedAt: number }
  | { kind: 'conflict'; body: Record<string, unknown> }
  | { kind: 'fail'; result: SendResult };

async function send(url: string, method: 'POST' | 'PUT', body: unknown, keepalive: boolean): Promise<Reply> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: 'fail', result: { kind: 'retry', error: 'network' } };
  }
  if (isOwnerMismatchResponse(res)) return { kind: 'fail', result: { kind: 'owner' } };
  if (res.status === 401) return { kind: 'fail', result: { kind: 'auth' } };
  let data: Record<string, unknown> | null = null;
  try { data = (await res.json()) as Record<string, unknown>; } catch { data = null; }
  if (res.status === 409 && data && data.conflict === true) return { kind: 'conflict', body: data };
  if (!res.ok || !data || typeof data.updatedAt !== 'number') {
    return { kind: 'fail', result: { kind: 'retry', error: String(res.status) } };
  }
  return { kind: 'ok', updatedAt: data.updatedAt };
}

/** Send the stored text when the account does not have it. Never writes the record. */
export async function sendText(kind: TextKind, lessonId: string, keepalive = false): Promise<SendResult> {
  const text = storedText(kind, lessonId);
  if (text === null) return { kind: 'done' };
  const sync = loadTextSync(kind, lessonId) ?? NO_TEXT_SYNC;
  if (sync.other) return { kind: 'conflict', other: otherVersion(sync.other) };
  if (textIsUploaded(text, sync)) return { kind: 'done' };
  const r = await send(`/api/lesson-drafts/${encodeURIComponent(lessonId)}`, 'POST', { response: text, baseUpdatedAt: sync.base }, keepalive);
  if (r.kind === 'fail') return r.result;
  if (r.kind === 'ok') {
    saveTextSync(kind, lessonId, { base: r.updatedAt, text });
    return { kind: 'done' };
  }
  const theirs = r.body.response;
  const at = r.body.updatedAt;
  if (typeof theirs !== 'string' || typeof at !== 'number') {
    // The row this computer remembered is gone (a class was deleted): nothing of anyone's to lose.
    saveTextSync(kind, lessonId, { base: null, text: null });
    return { kind: 'retry', error: 'gone' };
  }
  if (theirs === text) {
    // The account already has exactly this (an earlier answer was lost on the way back).
    saveTextSync(kind, lessonId, { base: at, text });
    return { kind: 'done' };
  }
  const other = { text: theirs, updatedAt: at };
  saveTextSync(kind, lessonId, { base: sync.base, text: sync.text, other });
  return { kind: 'conflict', other: otherVersion(other) };
}

export const writtenSender: Sender = { send: (e: OutboxEntry, o) => sendText('written', e.id, o.keepalive) };
export const diagramSender: Sender = { send: (e: OutboxEntry, o) => sendText('diagram', e.id, o.keepalive) };

// ---- the buttons ---------------------------------------------------------------------------

export type SaveNow = 'saved' | 'two-versions' | 'sign-in' | 'error';

/** "Save draft": the same send as an upload by itself, now. */
export async function saveTextNow(kind: TextKind, lessonId: string): Promise<SaveNow> {
  const r = await sendText(kind, lessonId);
  if (r.kind === 'done') { noteUploaded(kind, lessonId); return 'saved'; }
  if (r.kind === 'conflict') { pauseForConflict(kind, lessonId, r.other); return 'two-versions'; }
  if (r.kind === 'auth') return 'sign-in';
  return 'error';
}

export type ChoiceResult = { ok: true; text: string } | { ok: false; why: 'none' | 'not-kept' | 'not-written' };

/**
 * "Keep mine": the account's other version is stored on this computer first (read back),
 * then this computer's uploads over exactly that version. A third version is a new choice.
 */
export function keepMineText(kind: TextKind, lessonId: string): ChoiceResult {
  const sync = loadTextSync(kind, lessonId);
  const mine = storedText(kind, lessonId);
  if (!sync?.other || mine === null) return { ok: false, why: 'none' };
  if (!keepText(kind, lessonId, { text: sync.other.text, which: 'other', at: sync.other.updatedAt })) {
    return { ok: false, why: 'not-kept' };
  }
  if (!saveTextSync(kind, lessonId, { base: sync.other.updatedAt, text: sync.other.text })) return { ok: false, why: 'not-written' };
  notifyKept();
  if (readEntry(kind, lessonId)) choose(kind, lessonId, 'resolved');
  else enqueue(kind, lessonId);
  return { ok: true, text: mine };
}

/**
 * "Use the other one": this computer's version is stored first (read back), then the stored
 * record becomes the account's version. The caller puts the returned text in its editor.
 */
export function useOtherText(kind: TextKind, lessonId: string): ChoiceResult {
  const sync = loadTextSync(kind, lessonId);
  if (!sync?.other) return { ok: false, why: 'none' };
  const mine = storedText(kind, lessonId) ?? '';
  if (!keepText(kind, lessonId, { text: mine, which: 'mine', at: Date.now() })) return { ok: false, why: 'not-kept' };
  // The record first: a send between these two lines must find nothing of this computer's to upload.
  if (!writeStoredText(kind, lessonId, sync.other.text)) return { ok: false, why: 'not-written' };
  saveTextSync(kind, lessonId, { base: sync.other.updatedAt, text: sync.other.text });
  notifyKept();
  choose(kind, lessonId, 'resolved');
  return { ok: true, text: sync.other.text };
}

/**
 * Open a kept version instead (the student changed their mind). The text going out is added to
 * the kept ones first (read back) and the stored record is written (read back); only then does
 * the chosen one leave the kept list. False = nothing changed.
 */
export function swapWithKept(kind: TextKind, lessonId: string, current: string, chosen: string): ChoiceResult {
  const kept = loadKeptList(kind, lessonId).find((k) => k.text === chosen);
  if (!kept) return { ok: false, why: 'none' };
  if (current !== chosen && !keepText(kind, lessonId, { text: current, which: kept.which === 'mine' ? 'other' : 'mine', at: Date.now() })) {
    return { ok: false, why: 'not-kept' };
  }
  if (!writeStoredText(kind, lessonId, chosen)) { notifyKept(); return { ok: false, why: 'not-written' }; }
  dismissKept(kind, lessonId, chosen);
  return { ok: true, text: chosen };
}

// ---- hand-ins (Check, Submit): the account's row is written whatever is there ---------------

/**
 * A written answer or flowchart was handed in: the account's draft row becomes this text. A
 * version from another computer is never overwritten unseen: one already waiting for a choice,
 * or one the guarded write finds, is kept on this computer FIRST (read back). If it cannot be
 * kept the row is left alone, the choice stays (or starts) waiting, and this returns false. The
 * hand-in itself (the submission row) is not this function's and is unaffected.
 */
export async function handInText(kind: TextKind, lessonId: string, text: string): Promise<boolean> {
  if (!pageIsAccount()) return (await putDraft(lessonId, text)) !== null;
  const sync = loadTextSync(kind, lessonId) ?? NO_TEXT_SYNC;
  const settle = (updatedAt: number) => {
    saveTextSync(kind, lessonId, { base: updatedAt, text });
    if (readEntry(kind, lessonId)?.paused === 'conflict') choose(kind, lessonId, 'resolved');
    return true;
  };
  if (sync.other && sync.other.text !== text) {
    if (!keepText(kind, lessonId, { text: sync.other.text, which: 'other', at: sync.other.updatedAt })) return false;
    notifyKept();
  }
  const url = `/api/lesson-drafts/${encodeURIComponent(lessonId)}`;
  let base = sync.other ? sync.other.updatedAt : sync.base;
  // Twice at most: a version found by the first try is kept, then written over knowingly.
  for (let i = 0; i < 2; i++) {
    const r = await send(url, 'POST', { response: text, baseUpdatedAt: base }, false);
    if (r.kind === 'ok') return settle(r.updatedAt);
    if (r.kind === 'fail') return false;
    const theirs = r.body.response;
    const at = typeof r.body.updatedAt === 'number' ? r.body.updatedAt : null;
    if (typeof theirs === 'string' && at !== null && theirs !== text) {
      if (!keepText(kind, lessonId, { text: theirs, which: 'other', at })) {
        const other = { text: theirs, updatedAt: at };
        if (saveTextSync(kind, lessonId, { base: sync.base, text: sync.text, other })) pauseForConflict(kind, lessonId, otherVersion(other));
        return false;
      }
      notifyKept();
    } else if (typeof theirs === 'string' && at !== null) {
      return settle(at);
    }
    base = at;
  }
  return false;
}
