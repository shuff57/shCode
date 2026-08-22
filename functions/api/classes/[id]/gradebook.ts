// GET /api/classes/[id]/gradebook
// Returns a full per-student × per-lesson matrix for a class in one round-trip.
// Only the class owner, co-teachers, or an admin may call this endpoint.

import { canManageClass } from '../../../_shared/classAuth';
import { loadClassDueRows, loadLessonScopeMap } from '../../../_shared/dueDates';
import { buildDueIndex, isPastDue, resolveDueAt } from '../../../../lib/due-dates-core';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface StateRow {
  student_email: string;
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
  completed_at: number | null;
}

interface SubRow {
  student_email: string;
  lesson_id: string;
  score: number | null;
  possible: number | null;
  grade_json: string | null;
}

export interface GradebookCell {
  state: 'completed' | 'started' | null;
  score: number | null;
  submitted_score: number | null;
  possible: number | null;
  /** Past due and not completed, or completed after the due date. */
  late: boolean;
  /**
   * The student's latest submission is an attempt the AI grader failed on, so
   * the score is NULL because nothing graded it — not because nothing was
   * handed in. Without this the cell is indistinguishable from an untouched
   * lesson, which is the same thing the gradebook shows for a student who
   * never opened it.
   */
  pending: boolean;
}

/** True when a submission's grade_json carries the WrittenGrader outage marker. */
function isGradingFailed(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as { gradingFailed?: unknown })?.gradingFailed === true;
  } catch {
    return false;
  }
}

export interface GradebookStudent {
  email: string;
  cells: Record<string, GradebookCell>;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;

  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  const now = Date.now();

  // Active roster — include ALL enrolled students even if they have no lesson rows.
  const rosterResult = await env.DB.prepare(
    `SELECT student_email FROM enrollments
      WHERE class_id = ?1 AND expires_at > ?2
      ORDER BY student_email ASC`,
  )
    .bind(classId, now)
    .all<{ student_email: string }>();

  const roster: string[] = (rosterResult.results ?? []).map((r) => r.student_email);

  if (roster.length === 0) {
    return json({ students: [], dueDates: {} });
  }

  // lesson_state rows for all students in this class.
  const stateResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, state, score, completed_at
       FROM lesson_state
      WHERE student_email IN (
        SELECT student_email FROM enrollments
         WHERE class_id = ?1 AND expires_at > ?2
      )`,
  )
    .bind(classId, now)
    .all<StateRow>();

  // Latest submission per (student_email, lesson_id) using ROW_NUMBER window function.
  const subResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, score, possible, grade_json
       FROM (
         SELECT
           student_email, lesson_id, score, possible, grade_json,
           ROW_NUMBER() OVER (
             PARTITION BY student_email, lesson_id
             ORDER BY submitted_at DESC
           ) AS rn
         FROM lesson_submissions
         WHERE student_email IN (
           SELECT student_email FROM enrollments
            WHERE class_id = ?1 AND expires_at > ?2
         )
       )
      WHERE rn = 1`,
  )
    .bind(classId, now)
    .all<SubRow>();

  // Build lookup maps: email → lesson_id → row.
  const stateMap = new Map<string, Map<string, StateRow>>();
  for (const row of stateResult.results ?? []) {
    let inner = stateMap.get(row.student_email);
    if (!inner) {
      inner = new Map();
      stateMap.set(row.student_email, inner);
    }
    inner.set(row.lesson_id, row);
  }

  const subMap = new Map<string, Map<string, SubRow>>();
  for (const row of subResult.results ?? []) {
    let inner = subMap.get(row.student_email);
    if (!inner) {
      inner = new Map();
      subMap.set(row.student_email, inner);
    }
    inner.set(row.lesson_id, row);
  }

  // Resolve every lesson's due date for this class once, up front. The
  // lesson -> module inheritance lives in the lesson title prefix, which D1
  // cannot see, so this is a JS pass over the static manifest rather than a
  // join. No due dates set -> an empty map and every cell is late:false.
  const dueRows = await loadClassDueRows(env.DB, classId);
  const dueDates: Record<string, number> = {};
  if (dueRows.length > 0) {
    const scopeMap = await loadLessonScopeMap(env, request);
    if (scopeMap) {
      const index = buildDueIndex(dueRows);
      for (const [lessonId, scope] of scopeMap) {
        const dueAt = resolveDueAt(index, { lessonId, moduleId: scope.moduleId, unitId: scope.unitId });
        if (dueAt !== null) dueDates[lessonId] = dueAt;
      }
    }
  }

  // Assemble the response matrix.
  const students: GradebookStudent[] = roster.map((email) => {
    const stateByLesson = stateMap.get(email);
    const subByLesson = subMap.get(email);

    const cells: Record<string, GradebookCell> = {};

    // Merge all lesson ids from both state and submission maps for this
    // student, plus every already-past-due lesson — a student who never
    // opened an overdue lesson has no row anywhere, and that absence is
    // exactly what the teacher needs to see.
    const lessonIds = new Set<string>([
      ...(stateByLesson ? stateByLesson.keys() : []),
      ...(subByLesson ? subByLesson.keys() : []),
      ...Object.keys(dueDates).filter((id) => dueDates[id] < now),
    ]);

    for (const lessonId of lessonIds) {
      const sr = stateByLesson?.get(lessonId);
      const sub = subByLesson?.get(lessonId);
      const dueAt = dueDates[lessonId] ?? null;
      cells[lessonId] = {
        state: sr?.state ?? null,
        score: sr?.score ?? null,
        submitted_score: sub?.score ?? null,
        possible: sub?.possible ?? null,
        // A completed row with a NULL completed_at (legacy data) counts as on
        // time rather than late — `?? dueAt` reads as "finished by the
        // deadline". Guessing late on missing data would accuse a student.
        late: isPastDue(dueAt, sr?.state === 'completed' ? (sr.completed_at ?? dueAt) : null, now),
        // Only the LATEST submission votes, and only while it still has no
        // score. A regrade that succeeded replaces the row; a teacher override
        // writes a score onto this one but leaves the gradingFailed marker in
        // place, so the marker alone would keep claiming "pending" forever.
        pending: sub?.score == null && isGradingFailed(sub?.grade_json ?? null),
      };
    }

    return { email, cells };
  });

  return json({ students, dueDates });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
