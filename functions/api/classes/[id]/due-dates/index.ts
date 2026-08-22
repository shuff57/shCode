// GET /api/classes/[id]/due-dates
//   -> { dueDates: [{ scope, scopeId, dueAt, date, setBy, setAt }] }
// PUT /api/classes/[id]/due-dates
//   body { entries: [{ scope, scopeId, date: 'YYYY-MM-DD' | null }] }
//   `date: null` DELETES that row, which is how a lesson override is cleared
//   and the lesson goes back to inheriting its module.
//
// Both are teacher-only (owner, co-teacher, or admin) via canManageClass.
//
// The client sends a plain calendar date, never a timestamp — the server owns
// the conversion to an instant so every class shares one school timezone and a
// student's device clock can never move a deadline. See lib/due-dates-core.ts.

import { canManageClass } from '../../../../_shared/classAuth';
import { endOfSchoolDay, schoolDateString } from '../../../../../lib/due-dates-core';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const SCOPES = new Set(['unit', 'module', 'lesson']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// One PUT covers at most a whole module's worth of lessons plus the module
// row. The largest module in the course is ~25 lessons; 600 is far above any
// legitimate write and still bounds a hostile one.
const MAX_ENTRIES = 600;

interface Entry {
  scope: string;
  scopeId: string;
  date: string | null;
}

interface Row {
  scope: string;
  scope_id: string;
  due_at: number;
  set_by: string;
  set_at: number;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  const result = await env.DB
    .prepare(
      'SELECT scope, scope_id, due_at, set_by, set_at FROM class_due_dates WHERE class_id = ? ORDER BY scope, scope_id',
    )
    .bind(classId)
    .all<Row>();

  return json({
    dueDates: (result.results ?? []).map((r) => ({
      scope: r.scope,
      scopeId: r.scope_id,
      dueAt: r.due_at,
      // Echo the calendar date back so the editor can put it straight into an
      // <input type="date"> without redoing the timezone math client-side.
      date: schoolDateString(r.due_at),
      setBy: r.set_by,
      setAt: r.set_at,
    })),
  });
};

export const onRequestPut: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { entries?: Entry[] };
  try {
    body = (await request.json()) as { entries?: Entry[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const entries = body.entries;
  if (!Array.isArray(entries)) return json({ error: 'entries array required' }, 400);
  if (entries.length === 0) return json({ ok: true, written: 0, cleared: 0 });
  if (entries.length > MAX_ENTRIES) return json({ error: `At most ${MAX_ENTRIES} entries per request` }, 400);

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  let written = 0;
  let cleared = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') return json({ error: 'Malformed entry' }, 400);
    if (!SCOPES.has(entry.scope)) return json({ error: `Unknown scope ${JSON.stringify(entry.scope)}` }, 400);
    if (typeof entry.scopeId !== 'string' || entry.scopeId.length === 0 || entry.scopeId.length > 200) {
      return json({ error: 'scopeId must be a non-empty string' }, 400);
    }

    if (entry.date === null) {
      statements.push(
        env.DB
          .prepare('DELETE FROM class_due_dates WHERE class_id = ? AND scope = ? AND scope_id = ?')
          .bind(classId, entry.scope, entry.scopeId),
      );
      cleared++;
      continue;
    }

    if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date)) {
      return json({ error: `date must be YYYY-MM-DD or null, got ${JSON.stringify(entry.date)}` }, 400);
    }

    let dueAt: number;
    try {
      dueAt = endOfSchoolDay(entry.date);
    } catch {
      return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);
    }
    if (!Number.isFinite(dueAt)) return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);

    statements.push(
      env.DB
        .prepare(
          `INSERT INTO class_due_dates (class_id, scope, scope_id, due_at, set_by, set_at)
             VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (class_id, scope, scope_id)
             DO UPDATE SET due_at = excluded.due_at, set_by = excluded.set_by, set_at = excluded.set_at`,
        )
        .bind(classId, entry.scope, entry.scopeId, dueAt, data.email, now),
    );
    written++;
  }

  // One batch so "set the module date and clear its 3 overrides" either all
  // lands or none of it does — a half-applied write would leave the module
  // header reading Mixed for no visible reason.
  await env.DB.batch(statements);

  return json({ ok: true, written, cleared });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
