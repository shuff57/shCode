// POST /api/issue-reports/[id]/status  — triage one report.
// Staff only. Body {status: 'open' | 'in-progress' | 'fixed' | 'deferred', note?: string | null}.
// The triage stamp (who, when) is overwritten on every change so the export
// always shows the latest decision. `note` is optional and independent of
// that stamp: omit the key to change status without touching the existing
// reply, or send it (including '' / null) to write or clear one.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const STATUSES = new Set(['open', 'in-progress', 'fixed', 'deferred']);
const MAX_NOTE = 2000;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params, request } = context;

  if (data.role === 'student') return json({ error: 'Staff only' }, 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  let body: { status?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const status = typeof body.status === 'string' ? body.status : '';
  if (!STATUSES.has(status)) {
    return json({ error: 'status must be one of: open, in-progress, fixed, deferred' }, 400);
  }

  // Presence of the key, not its value, decides whether to touch the note —
  // a plain status flip (the per-card dropdown) sends no `note` key at all
  // and must leave whatever reply is already there alone.
  const hasNote = Object.prototype.hasOwnProperty.call(body, 'note');
  let note: string | null = null;
  if (hasNote) {
    if (body.note !== null && typeof body.note !== 'string') {
      return json({ error: 'note must be a string or null' }, 400);
    }
    const trimmed = typeof body.note === 'string' ? body.note.trim() : '';
    if (trimmed.length > MAX_NOTE) {
      return json({ error: `That reply is too long. The limit is ${MAX_NOTE} characters.` }, 413);
    }
    note = trimmed.length ? trimmed : null;
  }

  const result = hasNote
    ? await env.DB.prepare(
        `UPDATE issue_reports
            SET status = ?, triaged_by = ?, triaged_at = ?, resolution_note = ?
          WHERE id = ?`,
      )
        .bind(status, data.email, Date.now(), note, id)
        .run()
    : await env.DB.prepare(
        `UPDATE issue_reports
            SET status = ?, triaged_by = ?, triaged_at = ?
          WHERE id = ?`,
      )
        .bind(status, data.email, Date.now(), id)
        .run();

  if (result.meta.changes === 0) return json({ error: 'Report not found' }, 404);

  return json(hasNote ? { ok: true, id, status, resolution_note: note } : { ok: true, id, status });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}