// Server side of the per-class solution release (migration 0032, spec "Release").
// The pure rules (resolution, HELD_BACK, wording) are lib/solution-release-core.ts;
// this file reads rows out of D1 and maps a lesson to its module through the
// lessons manifest, exactly as dueDates.ts does.
//
// A student may see a capped part's solution only when every try is spent AND at
// least one class they are CURRENTLY enrolled in (not expired, not archived) has
// released it. Teachers and admins are checked by the caller, not here.

import {
  isHeldBack,
  isReleased,
  resolveReleaseAt,
  type ReleaseRow,
} from '../../lib/solution-release-core';
import { loadLessonScopeMap } from './dueDates';

interface ReleaseDb {
  prepare(sql: string): {
    bind(...args: unknown[]): { all<T>(): Promise<{ results?: T[] }> };
  };
}

interface Env {
  DB: ReleaseDb;
  ASSETS?: Fetcher;
}

interface Row {
  class_id: string;
  scope: string;
  scope_id: string;
  release_at: number;
}

export async function loadClassReleaseRows(db: ReleaseDb, classId: string): Promise<ReleaseRow[]> {
  const res = await db
    .prepare('SELECT class_id, scope, scope_id, release_at FROM class_solution_releases WHERE class_id = ?')
    .bind(classId)
    .all<Row>();
  return (res.results ?? []).map((r) => ({
    scope: r.scope as ReleaseRow['scope'],
    scopeId: r.scope_id,
    releaseAt: r.release_at,
  }));
}

export interface ReleaseStatus {
  /** Some live class of the student has released this lesson at or before `now`. */
  released: boolean;
  /** When nothing is released: the soonest future release across their classes, else null. */
  scheduledAt: number | null;
}

/**
 * Is this lesson's solution released for this student right now? Resolution runs
 * PER CLASS (a lesson row overrides its module row inside that class) and then ANY
 * class that has released it is enough, so a student in two classes is not held
 * back by the one that has not got there yet. Throws on a DB error: the caller
 * must fail closed.
 */
export async function studentReleaseStatus(
  env: Env,
  request: Request,
  email: string,
  lessonId: string,
  now: number = Date.now(),
): Promise<ReleaseStatus> {
  const res = await env.DB
    .prepare(
      `SELECT r.class_id AS class_id, r.scope AS scope, r.scope_id AS scope_id, r.release_at AS release_at
         FROM class_solution_releases r
         JOIN enrollments e ON e.class_id = r.class_id
         JOIN classes c ON c.id = r.class_id
        WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
    )
    .bind(email, now)
    .all<Row>();
  const rows = res.results ?? [];
  if (rows.length === 0) return { released: false, scheduledAt: null };

  // A manifest that cannot be read leaves moduleId null, so only a row on this very
  // lesson applies: stricter, never looser.
  let ids = { lessonId, moduleId: null as string | null, unitId: null as string | null };
  try {
    const map = await loadLessonScopeMap(env as never, request);
    const scope = map?.get(lessonId);
    if (scope) ids = { lessonId, moduleId: scope.moduleId, unitId: null };
  } catch {
    /* keep the strict ids */
  }

  const byClass = new Map<string, ReleaseRow[]>();
  for (const r of rows) {
    const list = byClass.get(r.class_id) ?? [];
    list.push({ scope: r.scope as ReleaseRow['scope'], scopeId: r.scope_id, releaseAt: r.release_at });
    byClass.set(r.class_id, list);
  }

  let scheduledAt: number | null = null;
  for (const list of byClass.values()) {
    const at = resolveReleaseAt(list, ids);
    if (isReleased(at, now)) return { released: true, scheduledAt: null };
    if (at !== null && at > now && !isHeldBack(at) && (scheduledAt === null || at < scheduledAt)) scheduledAt = at;
  }
  return { released: false, scheduledAt };
}
