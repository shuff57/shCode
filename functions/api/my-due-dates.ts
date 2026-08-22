// GET /api/my-due-dates
//
// The caller's due-date rows, grouped by the class they came from:
//   { classes: [{ classId, className, rows: [{ scope, scopeId, dueAt }] }] }
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

import { loadStudentDueRows } from '../_shared/dueDates';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const classes = await loadStudentDueRows(env.DB, data.email);
  // Drop classes that have no dates at all — the client only uses the class
  // name to label a date, so an empty class is pure payload.
  return json({ classes: classes.filter((c) => c.rows.length > 0) });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
