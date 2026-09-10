// GET /api/my-gradebook
//
// The signed-in student's own gradebook row: one cell per assignment they
// have touched, plus every assignment already past due that they have not.
//
// This is the student-facing mirror of classes/[id]/gradebook.ts. It exists
// as its own endpoint rather than a widened /api/lesson-state because the
// two answer different questions: lesson-state is read on EVERY lesson page
// to drive green-to-advance and must stay small, while this is read once, on
// /progress, and carries the heavier fields (points possible, late, teacher
// feedback) that make a score explainable.
//
// Directive: everything here is scoped by `data.email` from the session
// cookie. There is no email parameter and there must never be one — a
// student reading another student's row is exactly the hole this endpoint
// would open. Teachers use classes/[id]/gradebook.ts, which has its own ACL.

import { loadLessonScopeMap, loadStudentDueRows } from '../_shared/dueDates';
import { buildDueIndex, resolveDueAt } from '../../lib/due-dates-core';
import { buildCell, type GradebookCell } from '../../lib/gradebook-cell';

export type { GradebookCell } from '../../lib/gradebook-cell';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface StateRow {
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
  completed_at: number | null;
}

interface SubRow {
  lesson_id: string;
  score: number | null;
  possible: number | null;
  grade_json: string | null;
  submitted_at: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  const email = data.email;
  const now = Date.now();

  const stateResult = await env.DB.prepare(
    `SELECT lesson_id, state, score, completed_at
       FROM lesson_state WHERE student_email = ?`,
  )
    .bind(email)
    .all<StateRow>();

  // Latest submission per lesson, same window function as the teacher view.
  const subResult = await env.DB.prepare(
    `SELECT lesson_id, score, possible, grade_json, submitted_at
       FROM (
         SELECT lesson_id, score, possible, grade_json, submitted_at,
                ROW_NUMBER() OVER (
                  PARTITION BY lesson_id ORDER BY submitted_at DESC
                ) AS rn
           FROM lesson_submissions
          WHERE student_email = ?
       )
      WHERE rn = 1`,
  )
    .bind(email)
    .all<SubRow>();

  const stateByLesson = new Map<string, StateRow>();
  for (const r of stateResult.results ?? []) stateByLesson.set(r.lesson_id, r);

  const subByLesson = new Map<string, SubRow>();
  for (const r of subResult.results ?? []) subByLesson.set(r.lesson_id, r);

  // Due dates resolve PER CLASS and then take the earliest. Merging every
  // class's rows into one index first would let class A's lesson override
  // mask class B's earlier module date — see functions/api/my-due-dates.ts.
  const dueDates: Record<string, number> = {};
  const classes = await loadStudentDueRows(env.DB, email);
  const withRows = classes.filter((c) => c.rows.length > 0);
  if (withRows.length > 0) {
    const scopeMap = await loadLessonScopeMap(env, request);
    if (scopeMap) {
      const indexes = withRows.map((c) => buildDueIndex(c.rows));
      for (const [lessonId, scope] of scopeMap) {
        let earliest: number | null = null;
        for (const index of indexes) {
          const at = resolveDueAt(index, {
            lessonId,
            moduleId: scope.moduleId,
            unitId: scope.unitId,
          });
          if (at !== null && (earliest === null || at < earliest)) earliest = at;
        }
        if (earliest !== null) dueDates[lessonId] = earliest;
      }
    }
  }

  // A past-due lesson with no row anywhere is the one the student most needs
  // to see, so it earns a cell exactly like a touched one.
  const lessonIds = new Set<string>([
    ...stateByLesson.keys(),
    ...subByLesson.keys(),
    ...Object.keys(dueDates).filter((id) => dueDates[id] < now),
  ]);

  const cells: Record<string, GradebookCell> = {};
  for (const lessonId of lessonIds) {
    const sr = stateByLesson.get(lessonId);
    const sub = subByLesson.get(lessonId);
    cells[lessonId] = buildCell({
      state: sr?.state ?? null,
      score: sr?.score ?? null,
      completedAt: sr?.completed_at ?? null,
      submittedScore: sub?.score ?? null,
      possible: sub?.possible ?? null,
      gradeJson: sub?.grade_json ?? null,
      submittedAt: sub?.submitted_at ?? null,
      dueAt: dueDates[lessonId] ?? null,
      now,
    });
  }

  return json({ cells, dueDates });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
