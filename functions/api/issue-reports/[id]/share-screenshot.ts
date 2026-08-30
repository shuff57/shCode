// POST /api/issue-reports/[id]/share-screenshot — staff opt-in for exposing
// a report's screenshot to students.
//
// Staff only. Body {shared: boolean}. functions/uploads/[name].ts is
// deliberately unauthenticated -- the upload id IS the access control -- so
// ticking this on publishes the image to the entire internet, permanently,
// with no way to recall it. Defaults to off (migration 0022); this route is
// the only way it ever becomes on. See publicReport() in
// functions/_shared/issue-reports.ts for where screenshot_shared gates
// screenshot_id out of a student's payload.
//
// 400, not a silent no-op, when the report has no screenshot: there is
// nothing to share, and a checkbox that appears to work but does nothing is
// worse than an error.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params, request } = context;

  if (data.role === 'student') return json({ error: 'Staff only' }, 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  // request.json() parses a literal `null` (or a bare number/string/array)
  // without throwing -- only an object has a `.shared` to read off it.
  if (!parsed || typeof parsed !== 'object') {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const body = parsed as { shared?: unknown };
  if (typeof body.shared !== 'boolean') {
    return json({ error: 'shared must be a boolean' }, 400);
  }

  const report = await env.DB.prepare(`SELECT screenshot_id FROM issue_reports WHERE id = ?`)
    .bind(id)
    .first<{ screenshot_id: string | null }>();
  if (!report) return json({ error: 'Report not found' }, 404);
  if (!report.screenshot_id) return json({ error: 'This report has no screenshot to share.' }, 400);

  await env.DB.prepare(`UPDATE issue_reports SET screenshot_shared = ? WHERE id = ?`)
    .bind(body.shared ? 1 : 0, id)
    .run();

  return json({ ok: true, id, shared: body.shared });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
