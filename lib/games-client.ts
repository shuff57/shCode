'use client';

// The browser side of the Games library (functions/api/games/*): the calls the
// publish button, the Library's Games section and /play make, plus Remix,
// which copies a game's code into the student's own moSHion sandbox draft.
//
// The sandbox keeps ONE moSHion draft (lesson id 'sandbox-moshion' in
// shCode:progress, lib/version-control.ts). Remix never overwrites a draft that
// differs from the starter without asking, and keeps the old draft as a
// History snapshot first, so a mis-click can be undone from the sandbox's
// History button.
//
// Which game the sandbox draft is "published as" lives in localStorage
// (shCode:sandbox-game): re-publishing updates that game. Remixing someone
// else's game clears it, so publishing a remix makes a new game of your own;
// opening one of your own games sets it, so publishing again updates it.
//
// Sharing choices (lib/share-choice.ts, migration 0045): the record also keeps
// `from`, where the sandbox code was remixed from (the original's id, title,
// author and choice as /play showed them). Publishing a NEW game sends only
// `from.id`; the server reads the credit from the original's own row. A "just
// play" game is refused here with a plain sentence (and by the server on
// publish), and a remix of a "keep remixes open" game can only be shared 'open'.

import { useLessonStore } from './store';
import { loadProgress, normalizeEol, saveProgress } from './version-control';
import { addLocalSnapshot } from './local-history';
import { SANDBOX_MODE_KEY, getMode } from './sandbox-modes';
import { errorText } from './http-error';
import type { GameMode } from './games-core';
import type { GameAssetsResponse } from './game-assets';
import { canRemix, parseProvenance, provenanceOf, remixRefusal, type Provenance, type ShareChoice } from './share-choice';

export const SANDBOX_GAME_KEY = 'shCode:sandbox-game';
export const GAMES_CHANGED = 'shcode:games-changed';
const SANDBOX_MOSHION = 'sandbox-moshion';

export interface MyGame {
  id: string;
  title: string;
  mode: GameMode;
  players: number;
  bytes: number;
  createdAt: number;
  updatedAt: number;
  shared: boolean;
  choice: ShareChoice;
  remixedFrom: Provenance | null;
  /** The game's version (migration 0048) and how many proposed changes wait for it. */
  version?: number;
  openChanges?: number;
}

export interface SharedGame {
  id: string;
  title: string;
  mode: GameMode;
  players: number;
  modeLabel: string;
  bytes: number;
  owner: string;
  mine: boolean;
  className: string;
  sharedAt: number;
  updatedAt: number;
  hidden: boolean;
  choice: ShareChoice;
  remixedFrom: Provenance | null;
}

export interface FullGame {
  id: string;
  title: string;
  code: string;
  mode: GameMode;
  players: number;
  modeLabel: string;
  owner: string;
  mine: boolean;
  hidden: boolean;
  shared?: boolean;
  updatedAt: number;
  choice: ShareChoice;
  /** False for someone else's "just play" game: no View code, no Remix. */
  canRemix: boolean;
  remixedFrom: Provenance | null;
  /** Migration 0048: the current version, classmates whose proposed changes were accepted, open proposals. */
  version?: number;
  contributors?: string[];
  openChanges?: number;
}

export function playHref(id: string): string {
  return `/play/?game=${encodeURIComponent(id)}`;
}

function announce() {
  try { window.dispatchEvent(new Event(GAMES_CHANGED)); } catch { /* no window */ }
}

// ---- the sandbox's published-as record ------------------------------------

/**
 * `from`: where the sandbox code was remixed from, or null for the student's
 * own work. Kept after publishing, so "Publish as a new game" credits it too.
 * `fromVersion`: the version of `from` the sandbox code started at (migration
 * 0048), the base a proposed change and "Bring in the newest version" diff
 * against. Moves forward when the newest version is brought in.
 */
export interface SandboxGame {
  id: string | null; title: string; from?: Provenance | null; fromVersion?: number | null;
  /** For the student's OWN game (`id`): the version the sandbox code is based on, so Update can say when the game has moved on (an accepted change). */
  version?: number | null;
}

export function readSandboxGame(): SandboxGame {
  try {
    const v = JSON.parse(localStorage.getItem(SANDBOX_GAME_KEY) || 'null');
    if (v && typeof v.title === 'string') {
      return {
        id: typeof v.id === 'string' ? v.id : null, title: v.title, from: parseProvenance(v.from),
        fromVersion: Number.isInteger(v.fromVersion) && v.fromVersion > 0 ? v.fromVersion : null,
        version: Number.isInteger(v.version) && v.version > 0 ? v.version : null,
      };
    }
  } catch { /* private mode or junk */ }
  return { id: null, title: '', from: null };
}

export function writeSandboxGame(g: SandboxGame): void {
  // A caller that does not know about versions keeps the one already recorded for the same original.
  let rec = g;
  if (g.fromVersion === undefined || g.version === undefined) {
    const old = readSandboxGame();
    rec = {
      ...g,
      fromVersion: g.fromVersion !== undefined ? g.fromVersion : old.from && g.from && old.from.id === g.from.id ? old.fromVersion ?? null : null,
      version: g.version !== undefined ? g.version : old.id && old.id === g.id ? old.version ?? null : null,
    };
  }
  try { localStorage.setItem(SANDBOX_GAME_KEY, JSON.stringify(rec)); } catch { /* private mode */ }
}

// ---- calls -----------------------------------------------------------------

type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

async function call<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...init });
    if (!res.ok) return { ok: false, error: await errorText(res), status: res.status };
    return { ok: true, value: (await res.json()) as T };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.', status: 0 };
  }
}

export function listMyGames() {
  return call<{ games: MyGame[] }>('/api/games');
}

export function listSharedGames() {
  return call<{ games: SharedGame[] }>('/api/games/shared');
}

export function getGame(id: string) {
  return call<{ game: FullGame }>(`/api/games/${encodeURIComponent(id)}`);
}

/** The publisher's pictures and sounds the game uses (see lib/game-assets.ts). */
export function getGameAssets(id: string) {
  return call<GameAssetsResponse>(`/api/games/${encodeURIComponent(id)}/assets`);
}

/**
 * Publish the code, updating `id` when given. An id this account does not own
 * (another student signed in on this browser, or the game was deleted) is
 * published as a new game rather than failing, unless `retryAsNew: false`
 * (the publish panel then asks the student first). `choice` is who may do
 * what with it; `remixedFrom` the original game's id (only read for a new game).
 */
export async function publishGame(
  title: string,
  code: string,
  id: string | null,
  opts: { choice?: ShareChoice; remixedFrom?: string | null; retryAsNew?: boolean; message?: string } = {},
) {
  const post = (body: Record<string, unknown>) => call<{
    created: boolean;
    game: { id: string; title: string; mode: GameMode; players: number; choice: ShareChoice; remixedFrom: Provenance | null; version?: number };
  }>('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const extra: Record<string, unknown> = {};
  if (opts.choice) extra.choice = opts.choice;
  if (opts.remixedFrom) extra.remixedFrom = opts.remixedFrom;
  let r = await post(id ? { id, title, code, ...extra, ...(opts.message ? { message: opts.message } : {}) } : { title, code, ...extra });
  if (!r.ok && r.status === 404 && id && opts.retryAsNew !== false) r = await post({ title, code, ...extra });
  if (r.ok) announce();
  return r;
}

export async function setGameShared(id: string, share: boolean, choice?: ShareChoice) {
  const r = await call<{ shared: boolean; classes: number; choice: ShareChoice }>(`/api/games/${encodeURIComponent(id)}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(choice && share ? { share, choice } : { share }),
  });
  if (r.ok) announce();
  return r;
}

export async function deleteGame(id: string) {
  const r = await call<{ ok: true }>(`/api/games/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (r.ok) {
    if (readSandboxGame().id === id) writeSandboxGame({ ...readSandboxGame(), id: null });
    announce();
  }
  return r;
}

// ---- Remix -----------------------------------------------------------------

/** What remixIntoSandbox needs to know about a game (FullGame has all of it). */
export interface RemixSource {
  id: string;
  title: string;
  code: string;
  mine: boolean;
  /** The publisher's name as shown (first name + last initial); for the credit. */
  owner?: string;
  choice?: ShareChoice;
  remixedFrom?: Provenance | null;
  /** The game's version now (0048): what a proposed change from this remix starts from. */
  version?: number;
}

/**
 * Put a game's code into this student's moSHion sandbox draft and open the
 * sandbox. Returns false when the student said no to replacing their draft, or
 * when the game is someone else's "just play" game (`refused` gets the plain
 * reason; the server would refuse to publish the remix anyway).
 * `ask` is the confirm (window.confirm by default).
 */
export function remixIntoSandbox(
  game: RemixSource,
  ask: (message: string) => boolean = (m) => window.confirm(m),
  refused: (message: string) => void = (m) => window.alert(m),
): boolean {
  if (!game.mine && !canRemix(game.choice)) {
    refused(remixRefusal('game', game.title, game.owner ?? 'Its maker'));
    return false;
  }
  if (!writeSandboxCode(game.code, `Before opening "${game.title}"`, () => ask(
    `Replace the code in your moSHion sandbox with "${game.title}"?\n\n`
    + 'Your sandbox code now is kept in the sandbox\'s History, so you can get it back from there.',
  ))) return false;
  const live = useLessonStore.getState().lesson?.id === SANDBOX_MOSHION;

  // Your own game keeps the credit it already has; someone else's becomes the credit.
  writeSandboxGame(game.mine
    ? { id: game.id, title: game.title, from: game.remixedFrom ?? null, fromVersion: null, version: game.version ?? null }
    : {
      id: null,
      title: remixTitle(game.title),
      fromVersion: game.version ?? null,
      version: null,
      from: provenanceOf({
        id: game.id, title: game.title, author: game.owner ?? 'A classmate',
        choice: game.choice, provenance: game.remixedFrom ?? null,
      }),
    });
  try { localStorage.setItem(SANDBOX_MODE_KEY, 'moshion'); } catch { /* private mode */ }
  announce();
  if (!live) window.location.assign('/sandbox/');
  return true;
}

/**
 * Put `code` into the moSHion sandbox draft (the open editor too, when the sandbox is on screen). When the
 * draft holds work that differs from the starter and from `code`, `confirm` is asked first (false = leave
 * it alone) and the old draft is kept as a History snapshot labelled `snapshotLabel`. Used by Remix and by
 * "Bring in the newest version" (lib/game-flow-client.ts). Returns false when the student said no.
 */
export function writeSandboxCode(code: string, snapshotLabel: string, confirm: (current: string) => boolean): boolean {
  const mode = getMode('moshion');
  const starter = normalizeEol(mode.starter);
  const next = normalizeEol(code);
  const store = useLessonStore.getState();
  const live = store.lesson?.id === SANDBOX_MOSHION;
  const saved = loadProgress(SANDBOX_MOSHION);
  const files: Record<string, string> = live ? { ...store.fileContents } : { ...(saved?.fileContents ?? {}) };
  const current = normalizeEol(files['script.js'] ?? starter);

  if (current.trim() && current !== starter && current !== next) {
    if (!confirm(current)) return false;
    addLocalSnapshot(SANDBOX_MOSHION, files, snapshotLabel);
  }

  files['script.js'] = next;
  saveProgress(SANDBOX_MOSHION, {
    fileContents: files,
    commits: saved?.commits ?? [],
    lastCommittedFileContents: saved?.lastCommittedFileContents ?? { 'script.js': starter },
    completedSteps: [],
  });
  // The sandbox may be open behind this panel (the Library drawer tab): its
  // in-memory draft is written back on page hide, so update it too.
  if (live) store.updateFile('script.js', next);
  return true;
}

/** The moSHion sandbox draft's code as it is now (the open editor when the sandbox is on screen). */
export function readSandboxCode(): string {
  const store = useLessonStore.getState();
  if (store.lesson?.id === SANDBOX_MOSHION) return store.fileContents['script.js'] ?? '';
  return loadProgress(SANDBOX_MOSHION)?.fileContents?.['script.js'] ?? normalizeEol(getMode('moshion').starter);
}

function remixTitle(title: string): string {
  const t = `${title} remix`;
  return [...t].length <= 60 ? t : [...title].slice(0, 54).join('') + ' remix';
}

