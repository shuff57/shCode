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

import { useLessonStore } from './store';
import { loadProgress, normalizeEol, saveProgress } from './version-control';
import { addLocalSnapshot } from './local-history';
import { SANDBOX_MODE_KEY, getMode } from './sandbox-modes';
import { errorText } from './http-error';
import type { GameMode } from './games-core';

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
}

export function playHref(id: string): string {
  return `/play/?game=${encodeURIComponent(id)}`;
}

function announce() {
  try { window.dispatchEvent(new Event(GAMES_CHANGED)); } catch { /* no window */ }
}

// ---- the sandbox's published-as record ------------------------------------

export interface SandboxGame { id: string | null; title: string }

export function readSandboxGame(): SandboxGame {
  try {
    const v = JSON.parse(localStorage.getItem(SANDBOX_GAME_KEY) || 'null');
    if (v && typeof v.title === 'string') return { id: typeof v.id === 'string' ? v.id : null, title: v.title };
  } catch { /* private mode or junk */ }
  return { id: null, title: '' };
}

export function writeSandboxGame(g: SandboxGame): void {
  try { localStorage.setItem(SANDBOX_GAME_KEY, JSON.stringify(g)); } catch { /* private mode */ }
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

/**
 * Publish the code, updating `id` when given. An id this account does not own
 * (another student signed in on this browser, or the game was deleted) is
 * published as a new game rather than failing.
 */
export async function publishGame(title: string, code: string, id: string | null) {
  const post = (body: Record<string, unknown>) => call<{ created: boolean; game: { id: string; title: string; mode: GameMode; players: number } }>('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let r = await post(id ? { id, title, code } : { title, code });
  if (!r.ok && r.status === 404 && id) r = await post({ title, code });
  if (r.ok) announce();
  return r;
}

export async function setGameShared(id: string, share: boolean) {
  const r = await call<{ shared: boolean; classes: number }>(`/api/games/${encodeURIComponent(id)}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ share }),
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

/**
 * Put a game's code into this student's moSHion sandbox draft and open the
 * sandbox. Returns false when the student said no to replacing their draft.
 * `ask` is the confirm (window.confirm by default).
 */
export function remixIntoSandbox(
  game: { id: string; title: string; code: string; mine: boolean },
  ask: (message: string) => boolean = (m) => window.confirm(m),
): boolean {
  const mode = getMode('moshion');
  const starter = normalizeEol(mode.starter);
  const code = normalizeEol(game.code);
  const store = useLessonStore.getState();
  const live = store.lesson?.id === SANDBOX_MOSHION;
  const saved = loadProgress(SANDBOX_MOSHION);
  const files: Record<string, string> = live ? { ...store.fileContents } : { ...(saved?.fileContents ?? {}) };
  const current = normalizeEol(files['script.js'] ?? starter);

  if (current.trim() && current !== starter && current !== code) {
    const yes = ask(
      `Replace the code in your moSHion sandbox with "${game.title}"?\n\n`
      + 'Your sandbox code now is kept in the sandbox\'s History, so you can get it back from there.',
    );
    if (!yes) return false;
    addLocalSnapshot(SANDBOX_MOSHION, files, `Before opening "${game.title}"`);
  }

  files['script.js'] = code;
  saveProgress(SANDBOX_MOSHION, {
    fileContents: files,
    commits: saved?.commits ?? [],
    lastCommittedFileContents: saved?.lastCommittedFileContents ?? { 'script.js': starter },
    completedSteps: [],
  });
  // The sandbox may be open behind this panel (the Library drawer tab): its
  // in-memory draft is written back on page hide, so update it too.
  if (live) store.updateFile('script.js', code);

  writeSandboxGame(game.mine ? { id: game.id, title: game.title } : { id: null, title: remixTitle(game.title) });
  try { localStorage.setItem(SANDBOX_MODE_KEY, 'moshion'); } catch { /* private mode */ }
  announce();
  if (!live) window.location.assign('/sandbox/');
  return true;
}

function remixTitle(title: string): string {
  const t = `${title} remix`;
  return [...t].length <= 60 ? t : [...title].slice(0, 54).join('') + ' remix';
}

