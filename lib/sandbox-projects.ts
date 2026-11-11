'use client';

// Sandbox projects, the browser side: which projects this student has, which one
// is open, and making, renaming and deleting them. Rules: lib/sandbox-projects-core.ts.
// API: functions/api/sandbox-projects/* (migration 0049).
//
// Signed in, the account's list (GET /api/sandbox-projects) is the truth and a
// copy is kept in this browser so the sandbox opens on the last project at once,
// before the list arrives. Signed out, the list lives only in this browser.
// Each account on a browser has its own list and its own open project (the key
// carries a hash of the email, never the email), so two students sharing a
// computer do not see each other's projects.
//
// A project's code is a sandbox draft under the project's lesson id, so Save,
// History, Code together and the draft autosave work on it unchanged.
//
// One small store, read with useSyncExternalStore: Remix can make a project
// from the Library drawer while the sandbox is on screen, and the sandbox must
// switch to it.

import { useEffect, useSyncExternalStore } from 'react';
import { getCurrentUser } from './auth';
import { accountHash } from './whats-new-state';
import { clearProgress, loadProgress, normalizeEol, saveProgress } from './version-control';
import { clearLocalHistory } from './local-history';
import { forgetSavedCopy, pushWorkspace, recordSavedCopy } from './lesson-sync';
import { errorText } from './http-error';
import { SANDBOX_MODE_KEY, getMode, type SandboxModeId } from './sandbox-modes';
import {
  LEGACY_NAMES,
  MAX_PROJECTS,
  MODE_IDS,
  cleanName,
  isLegacy,
  limitText,
  newProjectId,
  parseProject,
  parseProjectLessonId,
  projectLessonId,
  sortProjects,
  type SandboxProject,
} from './sandbox-projects-core';

export type { SandboxProject } from './sandbox-projects-core';

const LIST_PREFIX = 'shCode:sandbox-projects:';
const CURRENT_KEY = 'shCode:sandbox-current';
const OPENED_KEY = 'shCode:sandbox-opened';
const ACCOUNT_KEY = 'shCode:sandbox-account';
const GUEST = 'guest';

export interface ProjectsState {
  /** 'guest' or a hash of the email; null until the page knows who is signed in. */
  account: string | null;
  signedIn: boolean;
  /** Newest first. */
  projects: SandboxProject[];
  /** The open project; null only when the student has deleted every project. */
  current: SandboxProject | null;
  /** True once the account's own list has been read (or failed to be). */
  loaded: boolean;
  /** Plain words, when the list could not be read from the account. */
  note: string | null;
}

// The old moSHion sandbox: what the page shows before it knows anything else,
// exactly what /sandbox opened on before projects.
const FALLBACK: SandboxProject = { id: 'moshion', mode: 'moshion', name: LEGACY_NAMES.moshion, createdAt: 0, updatedAt: 0 };

let state: ProjectsState = { account: null, signedIn: false, projects: [], current: null, loaded: false, note: null };
const listeners = new Set<() => void>();
function emit(next: Partial<ProjectsState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
const serverState: ProjectsState = { ...state, current: FALLBACK };

// ---- this browser's copies --------------------------------------------------

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota, private mode */ }
}

function cachedList(account: string): { projects: SandboxProject[]; seeded: boolean } {
  const raw = read<{ projects?: unknown[]; seeded?: boolean } | null>(LIST_PREFIX + account, null);
  const projects = (raw?.projects ?? []).map(parseProject).filter((p): p is SandboxProject => p !== null);
  return { projects, seeded: raw?.seeded === true || projects.length > 0 };
}
function cacheList(account: string, projects: SandboxProject[]): void {
  write(LIST_PREFIX + account, { projects, seeded: true });
}

function opened(): Record<string, number> {
  const o = read<Record<string, number>>(OPENED_KEY, {});
  return o && typeof o === 'object' ? o : {};
}
function markOpened(lessonId: string): void {
  const o = opened();
  o[lessonId] = Date.now();
  // Bounded: only the newest 200 lesson ids are worth remembering.
  const keep = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 200);
  write(OPENED_KEY, Object.fromEntries(keep));
}

function currentIdFor(account: string): string | null {
  const m = read<Record<string, string>>(CURRENT_KEY, {});
  return m && typeof m[account] === 'string' ? m[account] : null;
}
function setCurrentIdFor(account: string, lessonId: string | null): void {
  const m = read<Record<string, string>>(CURRENT_KEY, {});
  const next = m && typeof m === 'object' ? { ...m } : {};
  if (lessonId) next[account] = lessonId; else delete next[account];
  write(CURRENT_KEY, next);
}

function lastAccount(): string {
  try { return localStorage.getItem(ACCOUNT_KEY) || GUEST; } catch { return GUEST; }
}

/** A sandbox this browser has a draft of that differs from its starter (code written before projects existed). */
function hasLegacyDraft(mode: SandboxModeId): boolean {
  try {
    const saved = loadProgress(`sandbox-${mode}`);
    const text = saved?.fileContents?.[getMode(mode).file];
    return typeof text === 'string' && normalizeEol(text).trim() !== normalizeEol(getMode(mode).starter).trim();
  } catch {
    return false;
  }
}

/** Which project to open: the one open last time, else the old sandbox of the type used last, else the newest. */
function pickCurrent(account: string, projects: SandboxProject[]): SandboxProject | null {
  const want = currentIdFor(account);
  const byLesson = want ? projects.find((p) => projectLessonId(p) === want) : undefined;
  if (byLesson) return byLesson;
  let mode: string | null = null;
  try { mode = localStorage.getItem(SANDBOX_MODE_KEY); } catch { /* private mode */ }
  const legacy = projects.find((p) => isLegacy(p) && p.mode === mode);
  return legacy ?? sortProjects(projects, opened())[0] ?? null;
}

function settle(account: string, projects: SandboxProject[], extra: Partial<ProjectsState> = {}): void {
  const sorted = sortProjects(projects, opened());
  // The project on screen stays open if this account has it; a guess made for another account does not count.
  const sameAccount = state.account === account;
  const keep = !sameAccount || !state.current ? null : sorted.find((p) => p.id === state.current!.id && p.mode === state.current!.mode);
  const current = keep ?? pickCurrent(account, sorted);
  if (current) setCurrentIdFor(account, projectLessonId(current));
  emit({ account, projects: sorted, current, ...extra });
}

// ---- the account ----------------------------------------------------------------

type Call<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
async function call<T>(url: string, init?: RequestInit): Promise<Call<T>> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...init });
    if (!res.ok) return { ok: false, error: await errorText(res), status: res.status };
    return { ok: true, value: (await res.json()) as T };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.', status: 0 };
  }
}
const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

let started: Promise<void> | null = null;

/** Read who is signed in and their list. Runs once per page; later calls wait for the same run. */
export function startProjects(): Promise<void> {
  if (started) return started;
  // First paint: the last account's copy, so the sandbox opens on the last project straight away.
  const guess = lastAccount();
  const cached = cachedList(guess).projects;
  emit({ account: guess, projects: sortProjects(cached, opened()), current: pickCurrent(guess, cached) ?? FALLBACK });

  started = (async () => {
    const user = await getCurrentUser().catch(() => null);
    const account = user ? accountHash(user.email) : GUEST;
    try { localStorage.setItem(ACCOUNT_KEY, account); } catch { /* private mode */ }

    if (!user) {
      const { projects, seeded } = cachedList(GUEST);
      let list = projects;
      if (!seeded) {
        const modes = MODE_IDS.filter(hasLegacyDraft);
        if (!modes.includes('moshion')) modes.unshift('moshion');
        const now = Date.now();
        list = modes.map((m, i) => ({ id: m, mode: m, name: LEGACY_NAMES[m], createdAt: now - i, updatedAt: now - i }));
        cacheList(GUEST, list);
      }
      settle(GUEST, list, { signedIn: false, loaded: true, note: null });
      return;
    }

    const r = await call<{ projects: unknown[]; deleted: { id: string; mode: string }[] }>('/api/sandbox-projects');
    if (!r.ok) {
      // Offline or the server is down: keep this browser's copy of the list, and say so.
      const list = cachedList(account).projects;
      settle(account, list.length ? list : [FALLBACK], {
        signedIn: true, loaded: true,
        note: 'Could not load your project list, so this shows the one this computer remembers.',
      });
      return;
    }
    let list = (r.value.projects ?? []).map(parseProject).filter((p): p is SandboxProject => p !== null);
    const deleted = r.value.deleted ?? [];
    // A project deleted on another computer: drop this browser's draft of it too.
    for (const d of deleted) {
      const p = parseProject({ ...d, name: 'x' });
      if (p && !isLegacy(p)) forgetLocal(projectLessonId(p));
    }
    // A sandbox this browser has old code in, that the account has never had: make it a project.
    const known = new Set([...list.map((p) => p.id), ...deleted.map((d) => d.id)]);
    for (const m of MODE_IDS) {
      if (known.has(m) || !hasLegacyDraft(m) || list.length >= MAX_PROJECTS) continue;
      const add = await call<{ project: unknown }>('/api/sandbox-projects', jsonBody('POST', { id: m, mode: m, name: LEGACY_NAMES[m] }));
      const p = add.ok ? parseProject(add.value.project) : null;
      if (p) list = [...list, p];
    }
    cacheList(account, list);
    settle(account, list, { signedIn: true, loaded: true, note: null });
  })();
  return started;
}

/** For tests and sign-out: forget everything read so far. */
export function resetProjectsForTest(): void {
  started = null;
  state = { account: null, signedIn: false, projects: [], current: null, loaded: false, note: null };
}

// ---- actions ----------------------------------------------------------------------

export type ActionResult = { ok: true; project: SandboxProject } | { ok: false; error: string };

function forgetLocal(lessonId: string): void {
  try { clearProgress(lessonId); } catch { /* private mode */ }
  clearLocalHistory(lessonId);
  forgetSavedCopy(lessonId);
  try { localStorage.removeItem(`shCode:sandbox-game:${lessonId}`); } catch { /* private mode */ }
}

function storeList(projects: SandboxProject[]): void {
  if (state.account) cacheList(state.account, projects);
}

/** Open a project. The sandbox follows `current`. */
export function openProject(p: SandboxProject): void {
  const lessonId = projectLessonId(p);
  markOpened(lessonId);
  if (state.account) setCurrentIdFor(state.account, lessonId);
  try { localStorage.setItem(SANDBOX_MODE_KEY, p.mode); } catch { /* private mode */ }
  emit({ current: p, projects: sortProjects(state.projects, opened()) });
}

/**
 * Make a project and open it. `files` is its first code (a copy or a remix); left out, it opens at
 * the type's starter. A first code is also saved to the account straight away, so the project has
 * it on every computer, and is the first version in its Cloud history.
 */
export async function createProject(mode: SandboxModeId, name: string, files?: Record<string, string>): Promise<ActionResult> {
  await startProjects();
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'Give the project a name.' };
  if (state.projects.length >= MAX_PROJECTS) return { ok: false, error: limitText() };
  const id = newProjectId();
  let project: SandboxProject = { id, mode, name: clean, createdAt: Date.now(), updatedAt: Date.now() };
  if (state.signedIn) {
    const r = await call<{ project: unknown }>('/api/sandbox-projects', jsonBody('POST', { id, mode, name: clean }));
    if (!r.ok) return { ok: false, error: r.error };
    project = parseProject(r.value.project) ?? project;
  }
  const lessonId = projectLessonId(project);
  if (files) {
    const starter = { [getMode(mode).file]: normalizeEol(getMode(mode).starter) };
    saveProgress(lessonId, { fileContents: { ...files }, commits: [], lastCommittedFileContents: starter, completedSteps: [] });
    if (state.signedIn) {
      const pushed = await pushWorkspace(lessonId, files, 0);
      if (pushed.ok) recordSavedCopy(lessonId, files, pushed.revision);
    }
  }
  const projects = [...state.projects, project];
  storeList(projects);
  emit({ projects });
  openProject(project);
  return { ok: true, project };
}

export async function renameProject(p: SandboxProject, name: string): Promise<ActionResult> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'Give the project a name.' };
  if (clean === p.name) return { ok: true, project: p };
  let next: SandboxProject = { ...p, name: clean, updatedAt: Date.now() };
  if (state.signedIn) {
    const r = await call<{ project: unknown }>(`/api/sandbox-projects/${encodeURIComponent(p.id)}`, jsonBody('PATCH', { name: clean }));
    if (!r.ok) return { ok: false, error: r.error };
    next = parseProject(r.value.project) ?? next;
  }
  const projects = state.projects.map((x) => (x.id === p.id ? next : x));
  storeList(projects);
  emit({ projects, current: state.current?.id === p.id ? next : state.current });
  return { ok: true, project: next };
}

/** Delete a project and its code: the account's saved copy and Cloud history, and this browser's draft and history. */
export async function deleteProject(p: SandboxProject): Promise<{ ok: true } | { ok: false; error: string }> {
  if (state.signedIn) {
    const r = await call<{ ok: true }>(`/api/sandbox-projects/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    // Already gone (another computer deleted it) is what was asked for.
    if (!r.ok && r.status !== 404) return { ok: false, error: r.error };
  }
  forgetLocal(projectLessonId(p));
  const projects = state.projects.filter((x) => x.id !== p.id);
  storeList(projects);
  const wasOpen = state.current?.id === p.id;
  emit({ projects, current: wasOpen ? null : state.current });
  if (wasOpen) {
    const next = sortProjects(projects, opened())[0];
    if (next) openProject(next);
    else if (state.account) setCurrentIdFor(state.account, null);
  }
  return { ok: true };
}

// ---- for other pages (Remix, the Games flow) -----------------------------------------

/** The current project's lesson id if it is a moSHion project, else the moSHion project opened last, else the old moSHion sandbox. */
export function moshionLessonId(): string {
  const account = state.account ?? lastAccount();
  const cur = state.current ?? null;
  if (cur && cur.mode === 'moshion') return projectLessonId(cur);
  const want = currentIdFor(account);
  if (want && parseProjectLessonId(want)?.mode === 'moshion') return want;
  const list = state.projects.length ? state.projects : cachedList(account).projects;
  const o = opened();
  const best = list
    .filter((p) => p.mode === 'moshion')
    .sort((a, b) => (o[projectLessonId(b)] ?? b.createdAt) - (o[projectLessonId(a)] ?? a.createdAt))[0];
  return best ? projectLessonId(best) : 'sandbox-moshion';
}

export function getProjectsState(): ProjectsState {
  return state;
}

// ---- hook -----------------------------------------------------------------------------

export function useSandboxProjects(): ProjectsState {
  const s = useSyncExternalStore(subscribe, () => state, () => serverState);
  useEffect(() => { void startProjects(); }, []);
  return s;
}
