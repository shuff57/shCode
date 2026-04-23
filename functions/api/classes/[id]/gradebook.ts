// GET /api/classes/[id]/gradebook
// Returns a full per-student × per-lesson matrix for a class in one round-trip.
// Only the class owner, co-teachers, or an admin may call this endpoint.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface StateRow {
  student_email: string;
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
}

interface SubRow {
  student_email: string;
  lesson_id: string;
  score: number | null;
  possible: number | null;
}

export interface GradebookCell {
  state: 'completed' | 'started' | null;
  score: number | null;
  submitted_score: number | null;
  possible: number | null;
}

export interface GradebookStudent {
  email: string;
  cells: Record<string, GradebookCell>;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
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
    return json({ students: [] });
  }

  // lesson_state rows for all students in this class.
  const stateResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, state, score
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
    `SELECT student_email, lesson_id, score, possible
       FROM (
         SELECT
           student_email, lesson_id, score, possible,
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

  // Assemble the response matrix.
  const students: GradebookStudent[] = roster.map((email) => {
    const stateByLesson = stateMap.get(email);
    const subByLesson = subMap.get(email);

    const cells: Record<string, GradebookCell> = {};

    // Merge all lesson ids from both state and submission maps for this student.
    const lessonIds = new Set<string>([
      ...(stateByLesson ? stateByLesson.keys() : []),
      ...(subByLesson ? subByLesson.keys() : []),
    ]);

    for (const lessonId of lessonIds) {
      const sr = stateByLesson?.get(lessonId);
      const sub = subByLesson?.get(lessonId);
      cells[lessonId] = {
        state: sr?.state ?? null,
        score: sr?.score ?? null,
        submitted_score: sub?.score ?? null,
        possible: sub?.possible ?? null,
      };
    }

    return { email, cells };
  });

  return json({ students });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
