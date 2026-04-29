// Server-side enforcement of the same green-to-advance lesson lock the
// client UI shows. Used by every write endpoint that mutates per-lesson
// state so a curl-only attacker can't skip ahead by hitting the API.
//
// Sibling resolution is driven by the static `public/lessons-manifest.json`
// the build step produces. We fetch it through `env.ASSETS` once per
// isolate and cache the derived `lessonId -> ordered-sibling-ids` map in
// module scope. A manifest fetch failure fails *open* (request is
// allowed) — the client-side gate is still in place, and we don't want
// transient asset-route hiccups to lock students out of legitimate work.

export type Role = 'admin' | 'teacher' | 'student';
export interface SessionData {
  email: string;
  role: Role;
}

interface ManifestLesson {
  id: string;
  title: string;
  category?: string | null;
}

interface Manifest {
  lessons: ManifestLesson[];
}

interface GateEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
}

let siblingMapCache: Map<string, string[]> | null = null;

function parseModuleId(title: string): string | null {
  const m = title.match(/^(\d+)\.(\d+)\.\d+/);
  return m ? `${m[1]}.${m[2]}` : null;
}

function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+[a-zA-Z]?)/);
  return m ? m[1] : null;
}

async function fetchManifest(env: GateEnv, request: Request): Promise<Manifest | null> {
  const url = new URL(request.url);
  url.pathname = '/lessons-manifest.json';
  url.search = '';
  try {
    const res = env.ASSETS
      ? await env.ASSETS.fetch(new Request(url.toString()))
      : await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as Manifest;
  } catch {
    return null;
  }
}

async function loadSiblingMap(env: GateEnv, request: Request): Promise<Map<string, string[]> | null> {
  if (siblingMapCache) return siblingMapCache;

  const manifest = await fetchManifest(env, request);
  if (!manifest) return null;

  // Group by (category, X.Y module id), then sort each group by the
  // numbered title prefix using the same comparator the UI uses.
  const groups = new Map<string, ManifestLesson[]>();
  for (const l of manifest.lessons) {
    const moduleId = parseModuleId(l.title);
    if (!moduleId) continue;
    const key = `${l.category ?? ''}::${moduleId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  const map = new Map<string, string[]>();
  for (const lessons of groups.values()) {
    const sorted = lessons.slice().sort((a, b) => {
      const an = parseNumberedId(a.title) ?? '';
      const bn = parseNumberedId(b.title) ?? '';
      return an.localeCompare(bn, undefined, { numeric: true });
    });
    const ids = sorted.map((l) => l.id);
    for (const l of lessons) {
      map.set(l.id, ids);
    }
  }

  siblingMapCache = map;
  return map;
}

// Returns true iff the student is allowed to mutate state for lessonId.
// - admins/teachers: always.
// - lessons with no module prefix: always (no siblings to gate against).
// - first lesson in module: always.
// - otherwise: every prior sibling must be `state = 'completed'` in lesson_state.
export async function isLessonAccessible(
  env: GateEnv,
  request: Request,
  role: Role,
  email: string,
  lessonId: string,
): Promise<boolean> {
  if (role === 'admin' || role === 'teacher') return true;

  const map = await loadSiblingMap(env, request);
  if (!map) return true; // fail open on manifest unreachable

  const siblings = map.get(lessonId);
  if (!siblings || siblings.length === 0) return true;

  const idx = siblings.indexOf(lessonId);
  if (idx <= 0) return true;

  const priorIds = siblings.slice(0, idx);
  const placeholders = priorIds.map(() => '?').join(',');
  const result = await env.DB
    .prepare(
      `SELECT lesson_id FROM lesson_state WHERE student_email = ? AND state = 'completed' AND lesson_id IN (${placeholders})`,
    )
    .bind(email, ...priorIds)
    .all<{ lesson_id: string }>();

  const completed = new Set((result.results ?? []).map((r) => r.lesson_id));
  return priorIds.every((id) => completed.has(id));
}

export function lockedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Lesson is locked. Complete the prior lessons in this module first.' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}
