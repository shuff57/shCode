// POST /api/issue-reports/[id]/withdraw — pull a report out of the
// student-visible queue without deleting it.
//
// Body {withdrawn: boolean}. Allowed for the report's own reporter, or any
// staff member. This is deliberately not DELETE: [id]/index.ts already
// refuses student deletes as a flood guard (self-delete would let a student
// clear the open-report counter and file without limit), and staff still
// need to see a withdrawn report and its triage status -- withdrawing only
// hides it from other students. See visibleToStudent() in
// functions/_shared/issue-reports.ts for the read-side half of this rule.
//
// Existing reports were filed when the queue was staff-only and all of them
// stay visible now that students can see it; this route is how their
// authors get a way out.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params, request } = context;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  // request.json() parses a literal `null` (or a bare number/string/array)
  // without throwing -- only an object has a `.withdrawn` to read off it.
  if (!parsed || typeof parsed !== 'object') {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const body = parsed as { withdrawn?: unknown };
  if (typeof body.withdrawn !== 'boolean') {
    return json({ error: 'withdrawn must be a boolean' }, 400);
  }

  const report = await env.DB.prepare(`SELECT reporter_email FROM issue_reports WHERE id = ?`)
    .bind(id)
    .first<{ reporter_email: string }>();
  if (!report) return json({ error: 'Report not found' }, 404);

  const isOwner = report.reporter_email === data.email;
  const isStaff = data.role === 'admin' || data.role === 'teacher';
  if (!isOwner && !isStaff) return json({ error: 'Not your report' }, 403);

  await env.DB.prepare(`UPDATE issue_reports SET withdrawn_at = ? WHERE id = ?`)
    .bind(body.withdrawn ? Date.now() : null, id)
    .run();

  return json({ ok: true, id, withdrawn: body.withdrawn });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
