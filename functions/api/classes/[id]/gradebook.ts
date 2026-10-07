// GET /api/classes/[id]/gradebook
// Returns a full per-student × per-lesson matrix for a class in one round-trip.
// Only the class owner, co-teachers, or an admin may call this endpoint.

import { canManageClass } from '../../../_shared/classAuth';
import { loadClassDueRows, loadClassDueWaivers, loadLessonScopeMap } from '../../../_shared/dueDates';
import { buildDueIndex, resolveDueAt } from '../../../../lib/due-dates-core';
import { buildCell } from '../../../../lib/gradebook-cell';

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
  submitted_at: number;
}

export interface GradebookCell {
  state: 'completed' | 'started' | null;
  score: number | null;
  submitted_score: number | null;
  possible: number | null;
  /** Past due and not completed, or completed after the due date. A waived due date is never late. */
  late: boolean;
  /**
   * The student's latest submission is an attempt the AI grader failed on, so
   * the score is NULL because nothing graded it — not because nothing was
   * handed in. Without this the cell is indistinguishable from an untouched
   * lesson, which is the same thing the gradebook shows for a student who
   * never opened it.
   */
  pending: boolean;
  completed_at: number | null;
  submitted_at: number | null;
  /** The teacher's override comment, same field the student's own gradebook shows. */
  teacher_feedback: string | null;
}

export interface GradebookStudent {
  email: string;
  firstName: string | null;
  lastName: string | null;
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

  const nameResult = await env.DB.prepare(
    `SELECT email, first_name, last_name FROM students WHERE email IN (
       SELECT student_email FROM enrollments WHERE class_id = ?1 AND expires_at > ?2
     )`,
  )
    .bind(classId, now)
    .all<{ email: string; first_name: string | null; last_name: string | null }>();
  const nameMap = new Map<string, { firstName: string | null; lastName: string | null }>(
    (nameResult.results ?? []).map((r) => [r.email, { firstName: r.first_name, lastName: r.last_name }]),
  );

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
    `SELECT student_email, lesson_id, score, possible, grade_json, submitted_at
       FROM (
         SELECT
           student_email, lesson_id, score, possible, grade_json, submitted_at,
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

  // A waived due date is no date at all for that student, exactly as in /api/my-gradebook.
  const waivers = await loadClassDueWaivers(env.DB, classId);

  // Assemble the response matrix.
  const students: GradebookStudent[] = roster.map((email) => {
    const stateByLesson = stateMap.get(email);
    const subByLesson = subMap.get(email);

    const waived = waivers.get(email);
    const cells: Record<string, GradebookCell> = {};

    // Merge all lesson ids from both state and submission maps for this
    // student, plus every already-past-due lesson — a student who never
    // opened an overdue lesson has no row anywhere, and that absence is
    // exactly what the teacher needs to see.
    const lessonIds = new Set<string>([
      ...(stateByLesson ? stateByLesson.keys() : []),
      ...(subByLesson ? subByLesson.keys() : []),
      ...Object.keys(dueDates).filter((id) => dueDates[id] < now && !waived?.has(id)),
    ]);

    for (const lessonId of lessonIds) {
      const sr = stateByLesson?.get(lessonId);
      const sub = subByLesson?.get(lessonId);
      // The ONE cell builder, shared with the student's own gradebook (lib/gradebook-cell.ts): late and
      // pending can no longer be decided two ways for the same student.
      const cell = buildCell({
        state: sr?.state ?? null,
        score: sr?.score ?? null,
        completedAt: sr?.completed_at ?? null,
        submittedScore: sub?.score ?? null,
        possible: sub?.possible ?? null,
        gradeJson: sub?.grade_json ?? null,
        submittedAt: sub?.submitted_at ?? null,
        dueAt: waived?.has(lessonId) ? null : (dueDates[lessonId] ?? null),
        now,
      });
      cells[lessonId] = {
        state: cell.state,
        score: cell.score,
        submitted_score: cell.submittedScore,
        possible: cell.possible,
        late: cell.late,
        pending: cell.pending,
        completed_at: cell.completedAt,
        submitted_at: cell.submittedAt,
        teacher_feedback: cell.teacherFeedback,
      };
    }

    const names = nameMap.get(email);
    return { email, firstName: names?.firstName ?? null, lastName: names?.lastName ?? null, cells };
  });

  return json({ students, dueDates });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
