'use client';

// The browser side of the Games library (functions/api/games/*): the calls the
// publish button, the Library's Games section and /play make, plus Remix,
// which copies a game's code into the student's own moSHion sandbox draft.
//
// The sandbox holds several projects (lib/sandbox-projects.ts), each its own
// draft. Remix makes a NEW moSHion project holding the game's code, so it never
// writes over anything. Opening one of your own games opens the project it is
// published from when there is one (asking before replacing code that differs,
// and keeping the old code as a History snapshot), else a new project.
//
// Which game a moSHion project is "published as" lives in localStorage, one
// record per project (sandboxGameKey): re-publishing updates that game.
// "The sandbox" in the functions below is the moSHion project open now, or the
// one opened last (moshionLessonId).
//
// Sharing choices (lib/share-choice.ts, migration 0045): the record also keeps
// `from`, where the sandbox code was remixed from (the original's id, title,
// author and choice as /play showed them). Publishing a NEW game sends only
// `from.id`; the server reads the credit from the original's own row. A "just
// play" game is refused here with a plain sentence (and by the server on
// publish), and a remix of a "keep remixes open" game can only be shared 'open'.

import type { GameCommentsView } from './game-comments-core';
import { useLessonStore } from './store';
import { loadProgress, normalizeEol, saveProgress } from './version-control';
import { addLocalSnapshot } from './local-history';
import { getMode } from './sandbox-modes';
import { createProject, moshionLessonId, openProject, getProjectsState, startProjects } from './sandbox-projects';
import { parseProjectLessonId, projectLessonId } from './sandbox-projects-core';
import { errorText } from './http-error';
import type { GameMode } from './games-core';
import type { GameAssetsResponse } from './game-assets';
import { canRemix, parseProvenance, provenanceOf, remixRefusal, type Provenance, type ShareChoice } from './share-choice';

export const SANDBOX_GAME_KEY = 'shCode:sandbox-game';
export const GAMES_CHANGED = 'shcode:games-changed';

/** Where a moSHion project's published-as record lives. The old moSHion sandbox keeps the key it always had. */
export function sandboxGameKey(lessonId: string): string {
  return lessonId === 'sandbox-moshion' ? SANDBOX_GAME_KEY : `${SANDBOX_GAME_KEY}:${lessonId}`;
}

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
  /** Migration 0051: the creator's "Let classmates give feedback" switch. Absent from an older answer: on. */
  feedbackOn?: boolean;
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

export function readSandboxGame(lessonId: string = moshionLessonId()): SandboxGame {
  try {
    const v = JSON.parse(localStorage.getItem(sandboxGameKey(lessonId)) || 'null');
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

export function writeSandboxGame(g: SandboxGame, lessonId: string = moshionLessonId()): void {
  // A caller that does not know about versions keeps the one already recorded for the same original.
  let rec = g;
  if (g.fromVersion === undefined || g.version === undefined) {
    const old = readSandboxGame(lessonId);
    rec = {
      ...g,
      fromVersion: g.fromVersion !== undefined ? g.fromVersion : old.from && g.from && old.from.id === g.from.id ? old.fromVersion ?? null : null,
      version: g.version !== undefined ? g.version : old.id && old.id === g.id ? old.version ?? null : null,
    };
  }
  try { localStorage.setItem(sandboxGameKey(lessonId), JSON.stringify(rec)); } catch { /* private mode */ }
}

/** Every moSHion project on this browser whose record says it is published as game `id`. */
function projectsPublishedAs(id: string): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || (k !== SANDBOX_GAME_KEY && !k.startsWith(`${SANDBOX_GAME_KEY}:`))) continue;
      const lessonId = k === SANDBOX_GAME_KEY ? 'sandbox-moshion' : k.slice(SANDBOX_GAME_KEY.length + 1);
      if (readSandboxGame(lessonId).id === id) out.push(lessonId);
    }
  } catch { /* private mode */ }
  return out;
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

// ---- comments and the feedback switch (migration 0051) ----------------------

const commentsUrl = (id: string) => `/api/games/${encodeURIComponent(id)}/comments`;

export function getGameComments(id: string) {
  return call<GameCommentsView>(commentsUrl(id));
}

/** Add a comment, or a reply when `parentId` is given. Answers the whole list again. */
export function postGameComment(id: string, body: string, parentId?: string) {
  return call<GameCommentsView>(commentsUrl(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parentId ? { body, parentId } : { body }),
  });
}

export function deleteGameComment(id: string, commentId: string) {
  return call<GameCommentsView>(`${commentsUrl(id)}?comment=${encodeURIComponent(commentId)}`, { method: 'DELETE' });
}

/** The creator's switch: on lets classmates comment and suggest; off closes both. */
export async function setGameFeedback(id: string, on: boolean) {
  const r = await call<{ ok: true; feedbackOn: boolean }>(`/api/games/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on }),
  });
  if (r.ok) announce();
  return r;
}

export async function deleteGame(id: string) {
  const r = await call<{ ok: true }>(`/api/games/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (r.ok) {
    for (const lessonId of projectsPublishedAs(id)) writeSandboxGame({ ...readSandboxGame(lessonId), id: null }, lessonId);
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
 * Open a game in the sandbox as a moSHion project, and go to the sandbox. Someone else's game becomes
 * a NEW project (named "<title> remix"), so nothing is ever written over. One of your own games opens
 * the project it is published from on this browser (asking first if that project's code differs, and
 * keeping it in History), else a new project named after it. Resolves false when the student said no,
 * when the game is someone else's "just play" game, or when no project could be made (`refused` gets
 * the plain reason: the 30-project limit, or no connection). `ask` is the confirm (window.confirm by default).
 */
export async function remixIntoSandbox(
  game: RemixSource,
  ask: (message: string) => boolean = (m) => window.confirm(m),
  refused: (message: string) => void = (m) => window.alert(m),
): Promise<boolean> {
  if (!game.mine && !canRemix(game.choice)) {
    refused(remixRefusal('game', game.title, game.owner ?? 'Its maker'));
    return false;
  }
  await startProjects();
  // Your own game keeps the credit it already has; someone else's becomes the credit.
  const record: SandboxGame = game.mine
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
    };

  const home = game.mine
    ? getProjectsState().projects.find((p) => p.mode === 'moshion' && projectsPublishedAs(game.id).includes(projectLessonId(p)))
    : undefined;
  let lessonId: string;
  if (home) {
    lessonId = projectLessonId(home);
    if (!writeSandboxCode(game.code, `Before opening "${game.title}"`, () => ask(
      `Replace the code in your project "${home.name}" with "${game.title}" as it is published now?\n\n`
      + 'The code there now is kept in that project\'s History, so you can get it back from there.',
    ), lessonId)) return false;
    openProject(home);
  } else {
    const made = await createProject('moshion', game.mine ? game.title : remixTitle(game.title), { 'script.js': normalizeEol(game.code) });
    if (!made.ok) { refused(made.error); return false; }
    lessonId = projectLessonId(made.project);
  }
  writeSandboxGame(record, lessonId);
  announce();
  // On the sandbox already (the Library drawer tab), it follows the open project by itself.
  if (!parseProjectLessonId(useLessonStore.getState().lesson?.id ?? '')) window.location.assign('/sandbox/');
  return true;
}

/**
 * Put `code` into the moSHion sandbox draft (the open editor too, when the sandbox is on screen). When the
 * draft holds work that differs from the starter and from `code`, `confirm` is asked first (false = leave
 * it alone) and the old draft is kept as a History snapshot labelled `snapshotLabel`. Used by Remix and by
 * "Bring in the newest version" (lib/game-flow-client.ts). Returns false when the student said no.
 */
export function writeSandboxCode(
  code: string,
  snapshotLabel: string,
  confirm: (current: string) => boolean,
  lessonId: string = moshionLessonId(),
): boolean {
  const mode = getMode('moshion');
  const starter = normalizeEol(mode.starter);
  const next = normalizeEol(code);
  const store = useLessonStore.getState();
  const live = store.lesson?.id === lessonId;
  const saved = loadProgress(lessonId);
  const files: Record<string, string> = live ? { ...store.fileContents } : { ...(saved?.fileContents ?? {}) };
  const current = normalizeEol(files['script.js'] ?? starter);

  if (current.trim() && current !== starter && current !== next) {
    if (!confirm(current)) return false;
    addLocalSnapshot(lessonId, files, snapshotLabel);
  }

  files['script.js'] = next;
  saveProgress(lessonId, {
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
export function readSandboxCode(lessonId: string = moshionLessonId()): string {
  const store = useLessonStore.getState();
  if (store.lesson?.id === lessonId) return store.fileContents['script.js'] ?? '';
  return loadProgress(lessonId)?.fileContents?.['script.js'] ?? normalizeEol(getMode('moshion').starter);
}

function remixTitle(title: string): string {
  const t = `${title} remix`;
  return [...t].length <= 60 ? t : [...title].slice(0, 54).join('') + ' remix';
}

