// Server-side due-date helpers for the Pages Functions. The pure resolution
// logic lives in lib/due-dates-core.ts and is shared verbatim with the
// client, same as lib/grade-written-core.ts. This file only adds the two
// things a Worker needs: reading rows out of D1, and mapping a lesson folder
// id to its module/unit via the static lessons manifest.

import {
  buildDueIndex,
  buildOpenIndex,
  isAvailable,
  moduleIdFromTitle,
  resolveDueAt,
  type DueDateRow,
  type DueScope,
  type OpenDateRow,
} from '../../lib/due-dates-core';

export type { DueDateRow, DueScope, OpenDateRow } from '../../lib/due-dates-core';

interface ManifestLesson {
  id: string;
  title: string;
  category?: string | null;
}

interface Manifest {
  lessons: ManifestLesson[];
}

interface DueEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
}

export interface LessonScope {
  title: string;
  moduleId: string | null;
  unitId: string | null;
}

// lessonFolderId -> { title, moduleId, unitId }. Cached in module scope for
// the life of the isolate, exactly like lessonAccess.ts's sibling map. A
// manifest fetch failure returns null and every caller degrades to "no due
// date" rather than erroring — a due date is advisory here, never a gate.
let scopeMapCache: Map<string, LessonScope> | null = null;

async function fetchManifest(env: DueEnv, request: Request): Promise<Manifest | null> {
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

export async function loadLessonScopeMap(
  env: DueEnv,
  request: Request,
): Promise<Map<string, LessonScope> | null> {
  if (scopeMapCache) return scopeMapCache;
  const manifest = await fetchManifest(env, request);
  if (!manifest) return null;

  const map = new Map<string, LessonScope>();
  for (const lesson of manifest.lessons) {
    map.set(lesson.id, {
      title: lesson.title ?? lesson.id,
      moduleId: moduleIdFromTitle(lesson.title ?? ''),
      unitId: lesson.category ?? null,
    });
  }
  scopeMapCache = map;
  return map;
}

interface DueRow {
  scope: string;
  scope_id: string;
  due_at: number;
}

export async function loadClassDueRows(db: D1Database, classId: string): Promise<DueDateRow[]> {
  const result = await db
    .prepare('SELECT scope, scope_id, due_at FROM class_due_dates WHERE class_id = ?')
    .bind(classId)
    .all<DueRow>();
  return (result.results ?? []).map((r) => ({
    scope: r.scope as DueScope,
    scopeId: r.scope_id,
    dueAt: r.due_at,
  }));
}

interface OpenRow {
  scope: string;
  scope_id: string;
  open_at: number;
}

export async function loadClassOpenRows(db: D1Database, classId: string): Promise<OpenDateRow[]> {
  const result = await db
    .prepare('SELECT scope, scope_id, open_at FROM class_open_dates WHERE class_id = ?')
    .bind(classId)
    .all<OpenRow>();
  return (result.results ?? []).map((r) => ({
    scope: r.scope as DueScope,
    scopeId: r.scope_id,
    openAt: r.open_at,
  }));
}

// Every class the student is currently enrolled in, with that class's rows.
export interface ClassDueRows {
  classId: string;
  className: string;
  rows: DueDateRow[];
  /** class_open_dates rows for the same class. Usually empty. */
  openRows: OpenDateRow[];
}

interface EnrollmentDueRow {
  class_id: string;
  class_name: string;
  scope: string | null;
  scope_id: string | null;
  due_at: number | null;
}

interface EnrollmentOpenRow {
  class_id: string;
  scope: string | null;
  scope_id: string | null;
  open_at: number | null;
}

export async function loadStudentDueRows(db: D1Database, email: string): Promise<ClassDueRows[]> {
  const now = Date.now();

  // Two queries, not one. A second LEFT JOIN onto class_open_dates would
  // cross-product with the due rows — a class with 8 due rows and 3 open rows
  // would come back as 24, and every due date would be reported three times.
  //
  // LEFT JOIN so a class with no due dates still comes back — the client uses
  // the class list to label which date belongs to which class.
  const [dueResult, openResult] = await Promise.all([
    db
      .prepare(
        `SELECT c.id AS class_id, c.name AS class_name, d.scope AS scope, d.scope_id AS scope_id, d.due_at AS due_at
           FROM enrollments e
           JOIN classes c ON c.id = e.class_id
           LEFT JOIN class_due_dates d ON d.class_id = c.id
          WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
      )
      .bind(email, now)
      .all<EnrollmentDueRow>(),
    db
      .prepare(
        `SELECT c.id AS class_id, o.scope AS scope, o.scope_id AS scope_id, o.open_at AS open_at
           FROM enrollments e
           JOIN classes c ON c.id = e.class_id
           JOIN class_open_dates o ON o.class_id = c.id
          WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
      )
      .bind(email, now)
      .all<EnrollmentOpenRow>(),
  ]);

  const byClass = new Map<string, ClassDueRows>();
  for (const row of dueResult.results ?? []) {
    let entry = byClass.get(row.class_id);
    if (!entry) {
      entry = { classId: row.class_id, className: row.class_name, rows: [], openRows: [] };
      byClass.set(row.class_id, entry);
    }
    if (row.scope && row.scope_id && row.due_at !== null) {
      entry.rows.push({ scope: row.scope as DueScope, scopeId: row.scope_id, dueAt: row.due_at });
    }
  }
  for (const row of openResult.results ?? []) {
    // The due query is a LEFT JOIN over the same enrollments, so every class
    // here already has an entry. Guard anyway rather than drop a row that
    // gates access.
    const entry = byClass.get(row.class_id);
    if (!entry || !row.scope || !row.scope_id || row.open_at === null) continue;
    entry.openRows.push({ scope: row.scope as DueScope, scopeId: row.scope_id, openAt: row.open_at });
  }
  return [...byClass.values()];
}

// The due date in force for one student on one lesson, across every class they
// are in. Resolution runs PER CLASS and then takes the earliest — merging all
// classes into one index first would let class A's lesson override mask class
// B's earlier module date. Returns null when nothing applies.
export async function resolveDueForStudent(
  env: DueEnv,
  request: Request,
  email: string,
  lessonId: string,
): Promise<number | null> {
  const scopeMap = await loadLessonScopeMap(env, request);
  if (!scopeMap) return null;
  const scope = scopeMap.get(lessonId) ?? { title: lessonId, moduleId: null, unitId: null };

  const classes = await loadStudentDueRows(env.DB, email);
  let earliest: number | null = null;
  for (const cls of classes) {
    if (cls.rows.length === 0) continue;
    const resolved = resolveDueAt(buildDueIndex(cls.rows), {
      lessonId,
      moduleId: scope.moduleId,
      unitId: scope.unitId,
    });
    if (resolved !== null && (earliest === null || resolved < earliest)) earliest = resolved;
  }
  return earliest;
}

// The "available after" instant in force for one student on one lesson.
// Resolved per class and then EARLIEST wins, exactly like the due date —
// which for a gate means the least restrictive class that actually sets a
// date. Classes with no open row at all are skipped rather than treated as
// "open now": most students sit in two classes (the Legacy class plus their
// real one), and letting an ungated class veto a gated one would mean this
// feature never locked anything for anybody.
export async function resolveOpenForStudent(
  env: DueEnv,
  request: Request,
  email: string,
  lessonId: string,
): Promise<number | null> {
  const scopeMap = await loadLessonScopeMap(env, request);
  if (!scopeMap) return null;
  const scope = scopeMap.get(lessonId) ?? { title: lessonId, moduleId: null, unitId: null };

  const classes = await loadStudentDueRows(env.DB, email);
  let earliest: number | null = null;
  for (const cls of classes) {
    if (cls.openRows.length === 0) continue;
    const resolved = resolveDueAt(buildOpenIndex(cls.openRows), {
      lessonId,
      moduleId: scope.moduleId,
      unitId: scope.unitId,
    });
    if (resolved !== null && (earliest === null || resolved < earliest)) earliest = resolved;
  }
  return earliest;
}

// Every lesson id this student has a standing early-access grant for
// (lesson_access_overrides, 0024), across every class they are CURRENTLY
// enrolled in. Joined against enrollments the same way loadStudentDueRows
// scopes by e.expires_at — a grant made by a class the student has since
// left (or that expired at the school-year rollover) stops applying rather
// than lingering as an orphaned bypass.
export async function loadStudentLessonOverrides(db: D1Database, email: string): Promise<Set<string>> {
  const result = await db
    .prepare(
      `SELECT DISTINCT o.lesson_id AS lesson_id
         FROM lesson_access_overrides o
         JOIN enrollments e ON e.class_id = o.class_id AND e.student_email = o.student_email
        WHERE o.student_email = ? AND e.expires_at > ?`,
    )
    .bind(email, Date.now())
    .all<{ lesson_id: string }>();
  return new Set((result.results ?? []).map((r) => r.lesson_id));
}

// True when the student may open this lesson right now, as far as the
// "available after" gate is concerned. An override grant short-circuits the
// open-date check entirely. The sequential green-to-advance rule is a
// separate, independent gate — both must pass.
export async function isLessonAvailableForStudent(
  env: DueEnv,
  request: Request,
  email: string,
  lessonId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const overrides = await loadStudentLessonOverrides(env.DB, email);
  if (overrides.has(lessonId)) return true;
  return isAvailable(await resolveOpenForStudent(env, request, email, lessonId), now);
}
