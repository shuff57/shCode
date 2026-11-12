// GET /api/classes/[id]/past-due
//   -> { asOf, lessonCount, scope: 'graded', students: [{ email, firstName, lastName, pastDue, lessons: [...] }] }
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
import { classStaffEmails, withoutStaff } from '../../../../_shared/classStaff';
import { loadClassDueRows, loadClassDueWaivers, loadLessonScopeMap } from '../../../../_shared/dueDates';
import { loadClassWeights, studentGrading } from '../../../../_shared/grading';
import { buildDueIndex, resolveDueAt } from '../../../../../lib/due-dates-core';
import { lessonGradeCategory } from '../../../../../lib/grading-weights';

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
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
}

// ux2 T6: "past due" means ONE thing on every teacher screen: GRADED lessons whose due date has passed and
// that the student has not finished, minus waived ones. That is studentGrading()'s missingIds, the number the
// roster, the drawer, the gradebook and the class card already show, so this list is read from the same call
// instead of a second rule. (It used to count every lesson, readings and slides included: "97 lessons past
// due" here against "6 past due" on the roster for the same student.) Staff accounts on the roster (the
// owner, a co-teacher, a non-student role) are left out (functions/_shared/classStaff.ts).
export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized for this class' }, 403);

  const now = Date.now();
  const rows = await loadClassDueRows(env.DB, classId);
  if (rows.length === 0) return json({ asOf: now, lessonCount: 0, scope: 'graded', students: [] });

  const scopeMap = await loadLessonScopeMap(env, request);
  if (!scopeMap) return json({ asOf: now, lessonCount: 0, scope: 'graded', students: [], warning: 'Lesson manifest unavailable' });

  const index = buildDueIndex(rows);

  // Every GRADED lesson whose deadline has already passed (class-wide, before waivers), earliest first.
  const overdue = new Map<string, { lessonId: string; title: string; dueAt: number }>();
  for (const [lessonId, scope] of scopeMap) {
    if (lessonGradeCategory({ title: scope.title, preview: scope.preview, scoreKind: scope.scoreKind, assignmentCode: scope.assignmentCode }) === null) continue;
    const dueAt = resolveDueAt(index, { lessonId, moduleId: scope.moduleId, unitId: scope.unitId });
    if (dueAt !== null && dueAt <= now) overdue.set(lessonId, { lessonId, title: scope.title, dueAt });
  }
  if (overdue.size === 0) return json({ asOf: now, lessonCount: 0, scope: 'graded', students: [] });

  const roster = await env.DB
    .prepare('SELECT student_email FROM enrollments WHERE class_id = ? AND expires_at > ?')
    .bind(classId, now)
    .all<{ student_email: string }>();
  const staff = await classStaffEmails(env.DB, classId);
  const emails = withoutStaff(roster.results ?? [], staff).map((r) => r.student_email);

  const stateResult = await env.DB
    .prepare(
      `SELECT ls.student_email, ls.lesson_id, ls.state, ls.score
         FROM lesson_state ls
         JOIN enrollments e ON e.student_email = ls.student_email
        WHERE e.class_id = ? AND e.expires_at > ?`,
    )
    .bind(classId, now)
    .all<StateRow>();
  const statesBy = new Map<string, StateRow[]>();
  for (const r of stateResult.results ?? []) {
    const list = statesBy.get(r.student_email);
    if (list) list.push(r);
    else statesBy.set(r.student_email, [r]);
  }
  const names = await env.DB
    .prepare(
      `SELECT email, first_name, last_name FROM students WHERE email IN (
         SELECT student_email FROM enrollments WHERE class_id = ? AND expires_at > ?)`,
    )
    .bind(classId, now)
    .all<{ email: string; first_name: string | null; last_name: string | null }>();
  const nameOf = new Map((names.results ?? []).map((n) => [n.email, n]));
  const weights = await loadClassWeights(env.DB, classId);
  const waivers = await loadClassDueWaivers(env.DB, classId);

  const students = emails.map((email) => {
    const g = studentGrading(scopeMap, statesBy.get(email) ?? [], weights, {
      index,
      waived: waivers.get(email) ?? new Set<string>(),
      now,
    });
    const missing = g.missingIds
      .map((id) => overdue.get(id))
      .filter((l): l is { lessonId: string; title: string; dueAt: number } => !!l)
      .sort((a, b) => a.dueAt - b.dueAt);
    return {
      email,
      firstName: nameOf.get(email)?.first_name ?? null,
      lastName: nameOf.get(email)?.last_name ?? null,
      pastDue: g.missingCount,
      lessons: missing.slice(0, MAX_LESSONS_LISTED),
      truncated: g.missingCount > MAX_LESSONS_LISTED,
    };
  });

  // Most behind first; ties alphabetical so the order is stable between loads.
  students.sort((a, b) => (b.pastDue - a.pastDue) || a.email.localeCompare(b.email));

  return json({ asOf: now, lessonCount: overdue.size, scope: 'graded', students });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
