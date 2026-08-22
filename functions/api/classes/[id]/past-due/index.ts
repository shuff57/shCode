// GET /api/classes/[id]/past-due
//   -> { asOf, lessonCount, students: [{ email, pastDue, lessons: [...] }] }
//
// Teacher-only. Which students are behind, and on what.
//
// This CANNOT be one SQL query. Due dates inherit (lesson -> module -> unit)
// and the lesson/module relationship lives in the lesson TITLE prefix, which
// D1 knows nothing about. So: resolve every lesson's due date in JS from the
// class's rows plus the static manifest, keep the ones already past, then ask
// D1 once which of those each student has NOT completed.
//
// Note this is a read-time computation over lesson_state, not a stored flag.
// Most lessons never write a lesson_submissions row — readings, videos, labs
// and quizzes only ever flip lesson_state — so there is nowhere to stamp.
// lesson_submissions.due_at_submit covers the graded subset for history; this
// endpoint is the live picture.

import { canManageClass } from '../../../../_shared/classAuth';
import { loadClassDueRows, loadLessonScopeMap } from '../../../../_shared/dueDates';
import { buildDueIndex, resolveDueAt } from '../../../../../lib/due-dates-core';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

// Per student, in the response body. The full list can be long when a class
// falls behind; the count is always exact, the list is the first N by due date.
const MAX_LESSONS_LISTED = 12;

interface StateRow {
  student_email: string;
  lesson_id: string | null;
  state: string | null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized for this class' }, 403);

  const now = Date.now();
  const rows = await loadClassDueRows(env.DB, classId);
  if (rows.length === 0) return json({ asOf: now, lessonCount: 0, students: [] });

  const scopeMap = await loadLessonScopeMap(env, request);
  if (!scopeMap) return json({ asOf: now, lessonCount: 0, students: [], warning: 'Lesson manifest unavailable' });

  const index = buildDueIndex(rows);

  // Every lesson whose deadline has already passed, earliest first.
  const overdue: { lessonId: string; title: string; dueAt: number }[] = [];
  for (const [lessonId, scope] of scopeMap) {
    const dueAt = resolveDueAt(index, { lessonId, moduleId: scope.moduleId, unitId: scope.unitId });
    if (dueAt !== null && dueAt < now) overdue.push({ lessonId, title: scope.title, dueAt });
  }
  overdue.sort((a, b) => a.dueAt - b.dueAt);

  if (overdue.length === 0) return json({ asOf: now, lessonCount: 0, students: [] });

  // One query for the whole roster. LEFT JOIN so a student with no
  // lesson_state rows at all still appears — they are the most behind.
  const result = await env.DB
    .prepare(
      `SELECT e.student_email, ls.lesson_id, ls.state
         FROM enrollments e
         LEFT JOIN lesson_state ls ON ls.student_email = e.student_email
        WHERE e.class_id = ? AND e.expires_at > ?`,
    )
    .bind(classId, now)
    .all<StateRow>();

  const completedBy = new Map<string, Set<string>>();
  const roster = new Set<string>();
  for (const row of result.results ?? []) {
    roster.add(row.student_email);
    if (row.state === 'completed' && row.lesson_id) {
      let set = completedBy.get(row.student_email);
      if (!set) { set = new Set(); completedBy.set(row.student_email, set); }
      set.add(row.lesson_id);
    }
  }

  const students = [...roster].map((email) => {
    const done = completedBy.get(email) ?? new Set<string>();
    const missing = overdue.filter((l) => !done.has(l.lessonId));
    return {
      email,
      pastDue: missing.length,
      lessons: missing.slice(0, MAX_LESSONS_LISTED),
      truncated: missing.length > MAX_LESSONS_LISTED,
    };
  });

  // Most behind first; ties alphabetical so the order is stable between loads.
  students.sort((a, b) => (b.pastDue - a.pastDue) || a.email.localeCompare(b.email));

  return json({ asOf: now, lessonCount: overdue.length, students });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
