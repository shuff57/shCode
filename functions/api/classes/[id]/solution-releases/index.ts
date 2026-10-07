// GET /api/classes/[id]/solution-releases
//   -> { now, parts: [{ lessonId, cap, moduleId, usedAll }], enrolled,
//        releases: [{ scope, scopeId, releaseAt, held, date, time, setBy, setAt }] }
// PUT /api/classes/[id]/solution-releases
//   body { entries: [{ scope: 'module'|'lesson', scopeId, ...one action }] }
//   actions (exactly one per entry):
//     { now: true }                       release at the server's clock
//     { date: 'YYYY-MM-DD', time?: 'HH:MM' }  release at that school-timezone instant
//     { hold: true }                      an explicit "not released" that beats an
//                                         inherited module date (a lesson row at HELD_BACK)
//     { date: null }                      DELETE the row: the part goes back to
//                                         inheriting its module's release, or to none
//
// Controls when a student who has spent every try on a capped performance-
// assessment part may see how it is solved (spec "Release"). The sibling of
// ../open-dates/index.ts and takes its shape from it: same auth, same batching,
// same school-timezone handling, same optional `time`. Two differences:
//   * only capped lessons (functions/_shared/pa-pseudocode.generated.ts
//     ATTEMPT_CAPS) and the modules that contain them can be released -- this is
//     not a general gate, and an unknown id would be a row that does nothing;
//   * a missing row means NOT released, the opposite of an open date.
// The instant is computed on the server so a teacher's device clock cannot move it.

import { canManageClass } from '../../../../_shared/classAuth';
import { ATTEMPT_CAPS } from '../../../../_shared/pa-pseudocode.generated';
import { loadLessonScopeMap } from '../../../../_shared/dueDates';
import { COUNT_SINCE } from '../../../../../lib/attempt-cap';
import {
  schoolDateString,
  schoolInstant,
  schoolTimeString,
  startOfSchoolDay,
} from '../../../../../lib/due-dates-core';
import { HELD_BACK, isHeldBack, isRealDate } from '../../../../../lib/solution-release-core';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
// Six test modules, up to five parts each, plus their module rows.
const MAX_ENTRIES = 100;

interface Entry {
  scope?: unknown;
  scopeId?: unknown;
  now?: unknown;
  hold?: unknown;
  date?: unknown;
  time?: unknown;
}

interface Row {
  scope: string;
  scope_id: string;
  release_at: number;
  set_by: string;
  set_at: number;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  const now = Date.now();
  const rows = await env.DB
    .prepare(
      'SELECT scope, scope_id, release_at, set_by, set_at FROM class_solution_releases WHERE class_id = ? ORDER BY scope, scope_id',
    )
    .bind(classId)
    .all<Row>();

  // How many enrolled students have spent every try on each capped part. Same
  // counting rule as insertCounted (functions/_shared/attempts.ts): rows since
  // COUNT_SINCE, minus the grading-failure marker.
  const lessonIds = Object.keys(ATTEMPT_CAPS);
  const enrolledRow = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM enrollments WHERE class_id = ? AND expires_at > ?')
    .bind(classId, now)
    .first<{ n: number }>();
  const usedAll: Record<string, number> = {};
  if (lessonIds.length > 0) {
    const marks = lessonIds.map(() => '?').join(',');
    const counts = await env.DB
      .prepare(
        `SELECT s.lesson_id AS lesson_id, s.student_email AS email, COUNT(*) AS n
           FROM lesson_submissions s
           JOIN enrollments e ON e.student_email = s.student_email AND e.class_id = ? AND e.expires_at > ?
          WHERE s.submitted_at >= ? AND s.lesson_id IN (${marks})
            AND (s.grade_json IS NULL
                 OR CASE WHEN json_valid(s.grade_json)
                         THEN json_type(s.grade_json, '$.gradingFailed') IS NOT 'true'
                         ELSE 1 END)
          GROUP BY s.lesson_id, s.student_email`,
      )
      .bind(classId, now, COUNT_SINCE, ...lessonIds)
      .all<{ lesson_id: string; email: string; n: number }>();
    for (const c of counts.results ?? []) {
      if (c.n >= ATTEMPT_CAPS[c.lesson_id]) usedAll[c.lesson_id] = (usedAll[c.lesson_id] ?? 0) + 1;
    }
  }

  const scopeMap = await loadLessonScopeMap(env, request).catch(() => null);

  return json({
    now,
    enrolled: enrolledRow?.n ?? 0,
    parts: lessonIds.map((lessonId) => ({
      lessonId,
      cap: ATTEMPT_CAPS[lessonId],
      moduleId: scopeMap?.get(lessonId)?.moduleId ?? null,
      usedAll: usedAll[lessonId] ?? 0,
    })),
    releases: (rows.results ?? []).map((r) => ({
      scope: r.scope,
      scopeId: r.scope_id,
      releaseAt: r.release_at,
      held: isHeldBack(r.release_at),
      date: isHeldBack(r.release_at) ? null : schoolDateString(r.release_at),
      time: isHeldBack(r.release_at) ? null : schoolTimeString(r.release_at),
      setBy: r.set_by,
      setAt: r.set_at,
    })),
  });
};

export const onRequestPut: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { entries?: Entry[] };
  try {
    body = (await request.json()) as { entries?: Entry[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const entries = body.entries;
  if (!Array.isArray(entries)) return json({ error: 'entries array required' }, 400);
  if (entries.length === 0) return json({ ok: true, written: 0, cleared: 0 });
  if (entries.length > MAX_ENTRIES) return json({ error: `At most ${MAX_ENTRIES} entries per request` }, 400);

  // A module id is valid only if a capped lesson belongs to it. Needs the manifest;
  // without it a module write is refused rather than guessed at.
  let cappedModules: Set<string> | null = null;
  if (entries.some((e) => e && typeof e === 'object' && e.scope === 'module')) {
    const map = await loadLessonScopeMap(env, request).catch(() => null);
    if (!map) return json({ error: 'The lesson list is unavailable, so a whole test cannot be released right now. Try again.' }, 503);
    cappedModules = new Set<string>();
    for (const id of Object.keys(ATTEMPT_CAPS)) {
      const m = map.get(id)?.moduleId;
      if (m) cappedModules.add(m);
    }
  }

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  let written = 0;
  let cleared = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') return json({ error: 'Malformed entry' }, 400);
    const { scope, scopeId } = entry;
    if (scope !== 'module' && scope !== 'lesson') return json({ error: `Unknown scope ${JSON.stringify(scope)}` }, 400);
    if (typeof scopeId !== 'string' || scopeId.length === 0 || scopeId.length > 200) {
      return json({ error: 'scopeId must be a non-empty string' }, 400);
    }
    if (scope === 'lesson' && !has(ATTEMPT_CAPS, scopeId)) {
      return json({ error: `${JSON.stringify(scopeId)} is not a part with a solution to release` }, 400);
    }
    if (scope === 'module' && !(cappedModules && cappedModules.has(scopeId))) {
      return json({ error: `${JSON.stringify(scopeId)} is not a test module` }, 400);
    }

    const actions = [entry.now === true, entry.hold === true, 'date' in entry].filter(Boolean).length;
    if (actions !== 1) return json({ error: 'Each entry needs exactly one of now, hold or date' }, 400);

    if ('date' in entry && entry.date === null) {
      statements.push(
        env.DB
          .prepare('DELETE FROM class_solution_releases WHERE class_id = ? AND scope = ? AND scope_id = ?')
          .bind(classId, scope, scopeId),
      );
      cleared++;
      continue;
    }

    let releaseAt: number;
    if (entry.now === true) {
      releaseAt = now;
    } else if (entry.hold === true) {
      releaseAt = HELD_BACK;
    } else {
      if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date) || !isRealDate(entry.date)) {
        return json({ error: `date must be YYYY-MM-DD or null, got ${JSON.stringify(entry.date)}` }, 400);
      }
      // A release DATE needs an explicit TIME. Without one the instant defaulted to 00:00
      // school time, so a teacher who picked the test day meaning "after the test" opened the
      // solution at midnight and period 1's finishers could pass it on before period 3 sat.
      // (Unlike due and open dates, where a bare date is the start/end of a day for good reason,
      // a release is a one-way door.) 'Release now' needs no time.
      if (typeof entry.time !== 'string' || !TIME_RE.test(entry.time)) {
        return json({ error: `A release date needs a time (HH:MM, school time); got ${JSON.stringify(entry.time ?? null)}`, needsTime: true }, 400);
      }
      const time = entry.time;
      try {
        releaseAt = schoolInstant(entry.date, time);
      } catch {
        return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);
      }
      if (!Number.isFinite(releaseAt) || releaseAt >= HELD_BACK) {
        return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);
      }
    }

    statements.push(
      env.DB
        .prepare(
          `INSERT INTO class_solution_releases (class_id, scope, scope_id, release_at, set_by, set_at)
             VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (class_id, scope, scope_id)
             DO UPDATE SET release_at = excluded.release_at, set_by = excluded.set_by, set_at = excluded.set_at`,
        )
        .bind(classId, scope, scopeId, releaseAt, data.email, now),
    );
    written++;
  }

  // One batch, like the date routes: "release the test and clear its part overrides"
  // lands whole or not at all.
  await env.DB.batch(statements);
  return json({ ok: true, written, cleared });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
