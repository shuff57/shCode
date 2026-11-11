'use client';

// The browser side of the Games library's change flow (lib/game-flow-core.ts, migration 0048): the calls
// the History list, the proposal panel, the conversation page and the teacher panel make, plus "Bring in
// the newest version", which merges the newest version of the game a sandbox draft was remixed from into
// that draft (lib/game-merge.ts) and moves the draft's base forward.
//
// "New" in a list is decided here: the browser remembers when it last opened each conversation
// (localStorage, per account) and a row whose updatedAt is later reads as new.

import { isBuiltinRef } from './builtin-games';
import { errorText } from './http-error';
import { mergeChange } from './game-merge';
import { conflictText, type ChangeCan, type ChangeRole, type ChangeStatus } from './game-flow-core';
import { GAMES_CHANGED, getGame, readSandboxCode, readSandboxGame, writeSandboxCode, writeSandboxGame } from './games-client';

export const CHANGES_CHANGED = 'shcode:game-changes-changed';

type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number; body?: Record<string, unknown> };

async function call<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...init });
    if (!res.ok) {
      let body: Record<string, unknown> | undefined;
      try { body = await res.clone().json(); } catch { /* not JSON */ }
      return { ok: false, error: await errorText(res), status: res.status, body };
    }
    return { ok: true, value: (await res.json()) as T };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.', status: 0 };
  }
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function announce() {
  try { window.dispatchEvent(new Event(CHANGES_CHANGED)); window.dispatchEvent(new Event(GAMES_CHANGED)); } catch { /* no window */ }
}

export function changeHref(id: string): string {
  return `/changes/?id=${encodeURIComponent(id)}`;
}
export function gameChangesHref(gameId: string, tab: 'changes' | 'history' = 'changes'): string {
  return `/changes/?game=${encodeURIComponent(gameId)}${tab === 'history' ? '&tab=history' : ''}`;
}
export function tryChangeHref(gameId: string, changeId: string): string {
  return `/play/?game=${encodeURIComponent(gameId)}&change=${encodeURIComponent(changeId)}`;
}

// ---- versions ----------------------------------------------------------------

export interface VersionInfo {
  version: number; message: string; author: string; byChange: boolean; changeId: string | null; createdAt: number; bytes: number;
}
export interface VersionList {
  game: { id: string; title: string; version: number; maker: string };
  mine: boolean;
  versions: VersionInfo[];
}
export interface VersionCode {
  version: { version: number; code: string; message: string; author: string | null; byChange: boolean; changeId: string | null; createdAt: number; previous: { version: number; code: string } | null };
  current: number;
}

export function listVersions(gameId: string) {
  return call<VersionList>(`/api/games/${encodeURIComponent(gameId)}/versions`);
}
export function getVersion(gameId: string, version: number) {
  return call<VersionCode>(`/api/games/${encodeURIComponent(gameId)}/versions?v=${version}`);
}
export async function revertTo(gameId: string, version: number) {
  const r = await call<{ ok: true; version: number; message: string }>(`/api/games/${encodeURIComponent(gameId)}/versions`, post({ revertTo: version }));
  if (r.ok) announce();
  return r;
}

// ---- proposed changes ----------------------------------------------------------

export interface ChangeSummary {
  id: string; title: string; from: string; mine: boolean; status: ChangeStatus; baseVersion: number; locked: boolean;
  createdAt: number; updatedAt: number; comments: number; size: { added: number; removed: number }; acceptedVersion: number | null;
}
export interface GameChanges {
  game: { id: string; title: string; version: number; maker: string; mine: boolean };
  changes: ChangeSummary[];
}

export function listGameChanges(gameId: string) {
  return call<GameChanges>(`/api/games/${encodeURIComponent(gameId)}/changes`);
}

export async function proposeChange(gameId: string, body: { title: string; code: string; baseVersion: number | null; note?: string }) {
  const r = await call<{ ok: true; created: boolean; id: string; baseVersion: number; rebased: boolean }>(
    `/api/games/${encodeURIComponent(gameId)}/changes`, post(body),
  );
  if (r.ok) announce();
  return r;
}

export interface ConversationItem {
  id: string;
  kind: 'comment' | 'event';
  author: string;
  badge: 'maker' | 'proposer' | 'teacher' | null;
  /** A comment's text (plain text, never markup), or an event's id. '' when deleted. */
  body: string;
  extra: number | null;
  createdAt: number;
  deleted: 'author' | 'teacher' | null;
  canDelete: boolean;
}
export interface ChangeDetail {
  change: {
    id: string; title: string; from: string; status: ChangeStatus; locked: boolean; baseVersion: number;
    baseCode: string; code: string; createdAt: number; updatedAt: number; decidedAt: number | null;
    acceptedVersion: number | null; size: { added: number; removed: number };
  };
  game: { id: string; title: string; maker: string; version: number; code?: string } | null;
  /** What Accept would save (open proposals only): the merged code, or why it cannot merge. */
  after: { ok: true; code: string } | { ok: false; lines: number[]; text: string } | null;
  conversation: ConversationItem[];
  role: ChangeRole;
  can: ChangeCan;
}

export function getChange(id: string) {
  return call<ChangeDetail>(`/api/game-changes/${encodeURIComponent(id)}`);
}

export type ChangeAction =
  | { action: 'comment'; body: string }
  | { action: 'delete-comment'; commentId: string }
  | { action: 'accept'; expectVersion: number }
  | { action: 'decline'; reply?: string }
  | { action: 'withdraw' | 'reopen' | 'lock' | 'unlock' | 'remove' };

export async function actOnChange(id: string, a: ChangeAction) {
  const r = await call<{ ok: true; version?: number }>(`/api/game-changes/${encodeURIComponent(id)}`, post(a));
  if (r.ok) announce();
  return r;
}

export interface InboxRow {
  id: string; title: string; gameId: string; gameTitle: string; from: string; mine: boolean; status: ChangeStatus;
  locked: boolean; comments: number; createdAt: number; updatedAt: number;
}
export function getInbox() {
  return call<{ received: InboxRow[]; sent: InboxRow[]; joined: InboxRow[] }>('/api/game-changes');
}

export interface ClassChangesView {
  changes: (InboxRow & { gameId: string })[];
  recentComments: { id: string; changeId: string; author: string; body: string; deleted: 'author' | 'teacher' | null; createdAt: number; changeTitle: string; gameTitle: string }[];
}
export function getClassChanges(classId: string) {
  return call<ClassChangesView>(`/api/classes/${encodeURIComponent(classId)}/game-changes`);
}

// ---- seen state ("new" badges) ------------------------------------------------------

const SEEN_KEY = 'shcode.gameChanges.seen';

function seenMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') ?? {}; } catch { return {}; }
}
export function markSeen(id: string, at = Date.now()): void {
  const m = seenMap();
  m[id] = at;
  // Keep the newest 300.
  const keep = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 300);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(keep))); } catch { /* private mode */ }
}
export function isNew(row: { id: string; updatedAt: number }): boolean {
  const at = seenMap()[row.id];
  return at === undefined || row.updatedAt > at;
}

// ---- words ----------------------------------------------------------------------------

export { eventText } from './game-flow-core';

export function when(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)} d ago`;
  return new Date(ms).toLocaleDateString();
}

// ---- Bring in the newest version (sync fork) ------------------------------------------

export type SyncCheck =
  | { kind: 'none' }                                   // not a remix of someone else's game
  | { kind: 'gone' }                                    // the original is gone or no longer visible
  | { kind: 'current'; version: number }                // nothing new
  | { kind: 'behind'; from: number; newest: number; title: string; maker: string; gameId: string };

/** Is there a newer version of the game the sandbox draft came from? */
export async function checkForNewer(): Promise<SyncCheck> {
  const rec = readSandboxGame();
  // A remix of a built-in game (Paddle Rally) has nothing to send a change to: no Propose change.
  if (!rec.from || isBuiltinRef(rec.from.id)) return { kind: 'none' };
  const r = await getGame(rec.from.id);
  if (!r.ok) return { kind: 'gone' };
  const g = r.value.game;
  if (g.mine || !g.canRemix) return g.mine ? { kind: 'none' } : { kind: 'gone' };
  const newest = g.version ?? 1;
  const from = rec.fromVersion ?? null;
  // A remix from before versions existed has no base: say so as "behind" from version 1, if newer.
  if (from == null) return newest > 1 ? { kind: 'behind', from: 1, newest, title: g.title, maker: g.owner, gameId: g.id } : { kind: 'current', version: newest };
  return newest > from ? { kind: 'behind', from, newest, title: g.title, maker: g.owner, gameId: g.id } : { kind: 'current', version: newest };
}

export type SyncResult =
  | { kind: 'merged'; version: number; same: boolean }
  | { kind: 'conflict'; text: string; newestCode: string; mine: string; version: number }
  | { kind: 'error'; text: string }
  | { kind: 'cancelled' };

/**
 * Merge the newest version into the sandbox draft. On a conflict nothing changes and the caller shows the
 * two side by side with startFromNewest() or "Keep mine for now" (which changes nothing). The draft before the merge goes to History.
 */
export async function bringInNewest(): Promise<SyncResult> {
  const rec = readSandboxGame();
  if (!rec.from || isBuiltinRef(rec.from.id)) return { kind: 'error', text: 'This sandbox code is not a remix of a classmate’s game.' };
  const g = await getGame(rec.from.id);
  if (!g.ok) return { kind: 'error', text: g.error };
  const newest = g.value.game.version ?? 1;
  const baseVersion = rec.fromVersion ?? 1;
  const base = await getVersion(rec.from.id, baseVersion);
  const mine = readSandboxCode();
  // The version you started from is no longer kept (only the newest 20 are): there is nothing to merge
  // against, so it is the same choice as a conflict.
  if (!base.ok) {
    return { kind: 'conflict', text: 'The version you started from is too old to compare with (only the newest 20 are kept). Keep your code for now, or start from the newest version: your code is saved in History first.', newestCode: g.value.game.code, mine, version: newest };
  }
  const m = mergeChange(base.value.version.code, g.value.game.code, mine);
  if (!m.ok) {
    return { kind: 'conflict', text: conflictText(g.value.game.title, g.value.game.owner, 'sync', m.lines), newestCode: g.value.game.code, mine, version: newest };
  }
  const same = m.text === mine.replace(/\r\n?/g, '\n');
  if (!same && !writeSandboxCode(m.text, `Before bringing in "${g.value.game.title}" version ${newest}`, () => true)) return { kind: 'cancelled' };
  writeSandboxGame({ ...rec, fromVersion: newest });
  announce();
  return { kind: 'merged', version: newest, same };
}

/** After a conflict: start from the newest version; the student's code goes to History first. */
export function startFromNewest(newestCode: string, version: number, title: string): void {
  const rec = readSandboxGame();
  writeSandboxCode(newestCode, `My code before taking "${title}" version ${version}`, () => true);
  writeSandboxGame({ ...rec, fromVersion: version });
  announce();
}

/**
 * The maker's side of the same step: the sandbox holds version `rec.version` of the student's OWN game,
 * and the game has moved on (they accepted a classmate's change, or updated from another computer).
 * Merge the game as it is now into the sandbox code, as bringInNewest does for a remix.
 */
export async function bringInOwnNewest(): Promise<SyncResult> {
  const rec = readSandboxGame();
  if (!rec.id) return { kind: 'error', text: 'This sandbox code is not published as your game yet.' };
  const g = await getGame(rec.id);
  if (!g.ok) return { kind: 'error', text: g.error };
  const newest = g.value.game.version ?? 1;
  const mine = readSandboxCode();
  const base = rec.version ? await getVersion(rec.id, rec.version) : null;
  if (!base || !base.ok) {
    return { kind: 'conflict', text: 'Your sandbox code is too old to compare with the game. Keep your sandbox code, or take the game as it is now: your sandbox code is saved in History first.', newestCode: g.value.game.code, mine, version: newest };
  }
  const m = mergeChange(base.value.version.code, g.value.game.code, mine);
  if (!m.ok) {
    const at = m.lines.length ? ` (around line ${m.lines[0]})` : '';
    return {
      kind: 'conflict',
      text: `Your sandbox and "${g.value.game.title}" version ${newest} both changed the same lines${at}. Keep your sandbox code, or take version ${newest}: your sandbox code is saved in History first, so you can copy a change back in by hand.`,
      newestCode: g.value.game.code, mine, version: newest,
    };
  }
  const same = m.text === mine.replace(/\r\n?/g, '\n');
  if (!same) writeSandboxCode(m.text, `Before bringing in "${g.value.game.title}" version ${newest}`, () => true);
  writeSandboxGame({ ...rec, version: newest });
  announce();
  return { kind: 'merged', version: newest, same };
}

/** After a conflict on your own game: take the game as it is now; the sandbox code goes to History. */
export function startFromOwnNewest(newestCode: string, version: number, title: string): void {
  const rec = readSandboxGame();
  writeSandboxCode(newestCode, `My code before taking "${title}" version ${version}`, () => true);
  writeSandboxGame({ ...rec, version });
  announce();
}

