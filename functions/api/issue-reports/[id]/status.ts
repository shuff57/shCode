// POST /api/issue-reports/[id]/status  — triage one report.
// Staff only. Body {status: 'open' | 'in-progress' | 'fixed' | 'deferred'}.
// The triage stamp (who, when) is overwritten on every change so the export
// always shows the latest decision.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const STATUSES = new Set(['open', 'in-progress', 'fixed', 'deferred']);

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params, request } = context;

  if (data.role === 'student') return json({ error: 'Staff only' }, 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const status = typeof body.status === 'string' ? body.status : '';
  if (!STATUSES.has(status)) {
    return json({ error: 'status must be one of: open, in-progress, fixed, deferred' }, 400);
  }

  const result = await env.DB.prepare(
    `UPDATE issue_reports
        SET status = ?, triaged_by = ?, triaged_at = ?
      WHERE id = ?`,
  )
    .bind(status, data.email, Date.now(), id)
    .run();

  if (result.meta.changes === 0) return json({ error: 'Report not found' }, 404);

  return json({ ok: true, id, status });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}