// GET /api/my-due-dates
//
// The caller's due-date AND "available after" rows, grouped by the class they
// came from, plus a flat list of individual early-access grants:
//   { classes: [{ classId, className,
//                 rows:     [{ scope, scopeId, dueAt }],
//                 openRows: [{ scope, scopeId, openAt }] }],
//     overrides: [lessonId, ...] }
//
// All three live on this one endpoint rather than separate ones: they are
// read together by every list that renders a lesson, the payload is still a
// few hundred bytes, and a lesson's lock state must not flicker because one
// of several fetches landed first. `overrides` is flat (not grouped by
// class) because lib/due-dates.ts's lessonAvailability only ever asks "is
// this lesson id in my overrides at all" — which class granted it doesn't
// change the answer, unlike a due/open date where the earliest-wins
// resolution genuinely depends on it.
//
// Raw rows, not resolved dates. Two reasons:
//   1. There are 512 lessons and only a handful of rows — sending the rows is
//      a few hundred bytes, sending a resolved map is tens of kilobytes.
//   2. The client already knows each lesson's module id (it renders the
//      numbered title) and runs the SAME pure resolveDueAt from
//      lib/due-dates-core.ts, so there is one implementation, not two.
//
// Grouping by class rather than merging matters: resolution has to run per
// class and then take the earliest. Merged into one index, a lesson override
// in class A would mask an earlier module date in class B.

import { loadStudentDueRows, loadStudentLessonOverrides } from '../_shared/dueDates';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const [classes, overrides] = await Promise.all([
    loadStudentDueRows(env.DB, data.email),
    loadStudentLessonOverrides(env.DB, data.email),
  ]);
  // Drop classes that have no dates at all — the client only uses the class
  // name to label a date, so an empty class is pure payload. A class with an
  // open date but no due date is NOT empty: dropping it would silently unlock
  // every lesson that class gates.
  return json({
    classes: classes.filter((c) => c.rows.length > 0 || c.openRows.length > 0),
    overrides: [...overrides],
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
