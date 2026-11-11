// Sandbox projects: the rules, shared by the API (functions/api/sandbox-projects/*)
// and the browser (lib/sandbox-projects.ts). No DOM, no D1.
//
// A project is one sandbox program with a name and a type (the four sandbox
// modes). Its code lives where every sandbox draft already lives: the lesson-sync
// row, Cloud history and this browser's draft, all keyed by a lesson id. The four
// sandboxes that existed before projects keep their old lesson ids
// (`sandbox-<mode>`, project id = the mode's own id), so nobody's code moves; a
// new project is `sandbox-<mode>-<id>` with a random id of 10 lowercase letters
// and digits. The mode is in the lesson id on purpose: CODY's sandbox rules
// (functions/api/ai-help.ts) read the type from it.

import type { SandboxModeId } from './sandbox-modes';

export const MODE_IDS: readonly SandboxModeId[] = ['js', 'moshion', 'reshape', 'flow'];

/** Projects one account may keep (owner's decision 2026-11-11). Deleted ones do not count. */
export const MAX_PROJECTS = 30;
export const MAX_NAME_CHARS = 40;

export interface SandboxProject {
  id: string;
  mode: SandboxModeId;
  name: string;
  createdAt: number;
  updatedAt: number;
}

/** What each of the four pre-project sandboxes is called once it is a project. */
export const LEGACY_NAMES: Record<SandboxModeId, string> = {
  js: 'JavaScript sandbox',
  moshion: 'moSHion sandbox',
  reshape: 'reSHape sandbox',
  flow: 'Flowchart sandbox',
};

const NEW_ID_RE = /^[a-z0-9]{8,16}$/;
const LESSON_ID_RE = /^sandbox-(js|moshion|reshape|flow)(?:-([a-z0-9]{8,16}))?$/;

export function isModeId(v: unknown): v is SandboxModeId {
  return typeof v === 'string' && (MODE_IDS as readonly string[]).includes(v);
}

/** A project id that may go with `mode`: the mode's own id (the old sandbox), or a new random one. */
export function isProjectId(id: unknown, mode: SandboxModeId): id is string {
  return typeof id === 'string' && (id === mode || NEW_ID_RE.test(id));
}

export function isLegacy(p: Pick<SandboxProject, 'id' | 'mode'>): boolean {
  return p.id === p.mode;
}

/** The lesson id a project's code is saved under. */
export function projectLessonId(p: Pick<SandboxProject, 'id' | 'mode'>): string {
  return isLegacy(p) ? `sandbox-${p.mode}` : `sandbox-${p.mode}-${p.id}`;
}

/** The project a sandbox lesson id belongs to, or null when it is not one. */
export function parseProjectLessonId(lessonId: string): { mode: SandboxModeId; id: string } | null {
  const m = LESSON_ID_RE.exec(lessonId);
  if (!m) return null;
  const mode = m[1] as SandboxModeId;
  return { mode, id: m[2] ?? mode };
}

export function newProjectId(rand: () => number = Math.random): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  // crypto when there is one; the fallback is only for old test runtimes.
  try {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    for (const b of bytes) out += abc[b % abc.length];
    return out;
  } catch {
    for (let i = 0; i < 10; i++) out += abc[Math.floor(rand() * abc.length)];
    return out;
  }
}

/**
 * A name as typed, made safe to store and show: control characters out, runs of
 * spaces as one, trimmed, at most MAX_NAME_CHARS characters. Null when nothing is left.
 */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const t = raw.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return [...t].slice(0, MAX_NAME_CHARS).join('').trim();
}

/** "moSHion project 3": the first number not already used for that type. */
export function defaultName(mode: SandboxModeId, label: string, taken: readonly Pick<SandboxProject, 'name'>[]): string {
  const names = new Set(taken.map((p) => p.name.toLowerCase()));
  for (let i = 1; ; i++) {
    const n = `${label} project ${i}`;
    if (!names.has(n.toLowerCase())) return n;
  }
}

/** "Space game copy", "Space game copy 2", ... within the name limit. */
export function copyName(name: string, taken: readonly Pick<SandboxProject, 'name'>[]): string {
  const names = new Set(taken.map((p) => p.name.toLowerCase()));
  for (let i = 1; ; i++) {
    const tail = i === 1 ? ' copy' : ` copy ${i}`;
    const head = [...name].slice(0, MAX_NAME_CHARS - tail.length).join('').trimEnd();
    const n = head + tail;
    if (!names.has(n.toLowerCase())) return n;
  }
}

/** Newest first by the time the project was last opened here, then last changed, then made. */
export function sortProjects(list: SandboxProject[], opened: Record<string, number> = {}): SandboxProject[] {
  const key = (p: SandboxProject) => Math.max(opened[projectLessonId(p)] ?? 0, p.updatedAt, p.createdAt);
  return [...list].sort((a, b) => key(b) - key(a) || a.name.localeCompare(b.name));
}

/** Parse one project from untrusted JSON (the API's answer, or this browser's cached copy). */
export function parseProject(v: unknown): SandboxProject | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!isModeId(o.mode) || !isProjectId(o.id, o.mode)) return null;
  const name = cleanName(o.name);
  if (!name) return null;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  return { id: o.id, mode: o.mode, name, createdAt: num(o.createdAt), updatedAt: num(o.updatedAt) };
}

export function limitText(): string {
  return `You have ${MAX_PROJECTS} projects, the most you can keep. Delete one you no longer need to make room.`;
}
