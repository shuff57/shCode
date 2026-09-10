// GET /api/classes/[id]/open-dates
//   -> { openDates: [{ scope, scopeId, openAt, date, time, setBy, setAt }] }
// PUT /api/classes/[id]/open-dates
//   body { entries: [{ scope, scopeId, date: 'YYYY-MM-DD' | null, time?: 'HH:MM' | null }] }
//   `date: null` DELETES that row, which is how a lesson override is cleared
//   and the lesson goes back to inheriting its module's open date.
//   `time` is optional and defaults to midnight — the start of that school day.
//
// The deliberate sibling of ../due-dates/index.ts. Same auth, same batching,
// same entry shape, same MAX_ENTRIES. It is a separate route rather than a
// mode flag on that one because the two write different tables and a partly
// applied cross-table batch would be a worse failure than two round-trips.
//
// UNLIKE a due date, this one LOCKS. A lesson whose resolved open instant is
// in the future is not openable by a student, so a bad write here is the one
// thing in this file with real blast radius: getting the timezone wrong shuts
// a class out of its work. The instant is computed server-side from a wall
// clock in SCHOOL_TZ for exactly that reason — a student's device clock can
// never move it, in either direction.

import { canManageClass } from '../../../../_shared/classAuth';
import {
  schoolDateString,
  schoolInstant,
  schoolTimeString,
  startOfSchoolDay,
} from '../../../../../lib/due-dates-core';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const SCOPES = new Set(['unit', 'module', 'lesson']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
// Matches the due-dates route: one PUT covers at most a module's worth of
// lessons plus the module row.
const MAX_ENTRIES = 600;

interface Entry {
  scope: string;
  scopeId: string;
  date: string | null;
  time?: string | null;
}

interface Row {
  scope: string;
  scope_id: string;
  open_at: number;
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
      'SELECT scope, scope_id, open_at, set_by, set_at FROM class_open_dates WHERE class_id = ? ORDER BY scope, scope_id',
    )
    .bind(classId)
    .all<Row>();

  return json({
    openDates: (result.results ?? []).map((r) => ({
      scope: r.scope,
      scopeId: r.scope_id,
      openAt: r.open_at,
      date: schoolDateString(r.open_at),
      time: schoolTimeString(r.open_at),
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
          .prepare('DELETE FROM class_open_dates WHERE class_id = ? AND scope = ? AND scope_id = ?')
          .bind(classId, entry.scope, entry.scopeId),
      );
      cleared++;
      continue;
    }

    if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date)) {
      return json({ error: `date must be YYYY-MM-DD or null, got ${JSON.stringify(entry.date)}` }, 400);
    }
    if (entry.time != null && (typeof entry.time !== 'string' || !TIME_RE.test(entry.time))) {
      return json({ error: `time must be HH:MM or null, got ${JSON.stringify(entry.time)}` }, 400);
    }

    let openAt: number;
    try {
      // A date with no time opens at midnight. That is the least surprising
      // default: "available after Sep 8" reads as all of Sep 8, not from
      // whatever hour the teacher happened to be editing.
      openAt = entry.time == null ? startOfSchoolDay(entry.date) : schoolInstant(entry.date, entry.time);
    } catch {
      return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);
    }
    if (!Number.isFinite(openAt)) return json({ error: `Invalid date ${JSON.stringify(entry.date)}` }, 400);

    statements.push(
      env.DB
        .prepare(
          `INSERT INTO class_open_dates (class_id, scope, scope_id, open_at, set_by, set_at)
             VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (class_id, scope, scope_id)
             DO UPDATE SET open_at = excluded.open_at, set_by = excluded.set_by, set_at = excluded.set_at`,
        )
        .bind(classId, entry.scope, entry.scopeId, openAt, data.email, now),
    );
    written++;
  }

  // One batch, same reason as the due-dates route: "set the module date and
  // clear its overrides" either all lands or none of it does.
  await env.DB.batch(statements);

  return json({ ok: true, written, cleared });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
