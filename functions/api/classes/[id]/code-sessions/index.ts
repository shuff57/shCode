// GET /api/classes/[id]/code-sessions          -- Code together sessions for this class, newest first
// GET /api/classes/[id]/code-sessions?id=<id>  -- one of them, with its text
//
// Owner, co-teacher or admin only. A Code together program is free text (it
// could carry messages in comments), so the LiveDoc Durable Object keeps its own
// copy in code_sessions (migration 0044) and the class's teachers can read it.
// A session is this class's when its host or anyone who joined it is enrolled
// (unexpired) in the class. The list carries names and sizes; the text comes
// one session at a time. Rows are kept 30 days.

import { canManageClass } from '../../../../_shared/classAuth';
import { json, type SessionData } from '../../../../_shared/games';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

/** How many sessions the list shows. */
export const LIST_MAX = 50;
const ID_RE = /^[A-Z0-9]{4,6}-\d{1,16}$/;
/** D1 binds at most 100 parameters per statement. */
const NAME_CHUNK = 90;

interface SessionRow {
  id: string;
  code: string;
  host_email: string;
  kind: string;
  participants: string;
  started_at: number;
  updated_at: number;
  closed_at: number | null;
  chars: number;
  text?: string;
}

// The class's sessions: host or any participant enrolled (unexpired) in ?1.
const IN_CLASS = `(cs.host_email IN (SELECT e.student_email FROM enrollments e WHERE e.class_id = ?1 AND e.expires_at > ?2)
  OR EXISTS (SELECT 1 FROM json_each(cs.participants) j JOIN enrollments e ON e.student_email = j.value
              WHERE e.class_id = ?1 AND e.expires_at > ?2))`;

function emailsOf(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** A teacher sees full names (the roster shows them too); an account with no name shows its email. */
async function namesFor(db: D1Database, emails: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const list = [...new Set(emails)];
  for (let i = 0; i < list.length; i += NAME_CHUNK) {
    const part = list.slice(i, i + NAME_CHUNK);
    const r = await db.prepare(`SELECT email, first_name, last_name FROM students WHERE email IN (${part.map(() => '?').join(',')})`)
      .bind(...part).all<{ email: string; first_name: string | null; last_name: string | null }>();
    for (const s of r.results ?? []) {
      const name = [s.first_name, s.last_name].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
      if (name) out.set(s.email, name);
    }
  }
  for (const e of list) if (!out.has(e)) out.set(e, e);
  return out;
}

function shape(r: SessionRow, names: Map<string, string>) {
  const people = emailsOf(r.participants);
  if (!people.includes(r.host_email)) people.unshift(r.host_email);
  return {
    id: r.id,
    code: r.code,
    kind: r.kind === 'moshion' ? 'moshion' : 'js',
    host: names.get(r.host_email) ?? r.host_email,
    people: people.map((e) => names.get(e) ?? e),
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
    chars: r.chars,
    ...(r.text !== undefined ? { text: r.text } : {}),
  };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const classId = String(params.id);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  const now = Date.now();
  const one = new URL(request.url).searchParams.get('id');

  if (one !== null) {
    if (!ID_RE.test(one)) return json({ error: 'No such session.' }, 404);
    const r = await env.DB.prepare(
      `SELECT cs.id, cs.code, cs.host_email, cs.kind, cs.participants, cs.started_at, cs.updated_at, cs.closed_at,
              length(cs.text) AS chars, cs.text
         FROM code_sessions cs WHERE cs.id = ?3 AND ${IN_CLASS}`,
    ).bind(classId, now, one).first<SessionRow>();
    if (!r) return json({ error: 'No such session.' }, 404);
    const names = await namesFor(env.DB, [r.host_email, ...emailsOf(r.participants)]);
    return json({ session: shape(r, names) });
  }

  const res = await env.DB.prepare(
    `SELECT cs.id, cs.code, cs.host_email, cs.kind, cs.participants, cs.started_at, cs.updated_at, cs.closed_at,
            length(cs.text) AS chars
       FROM code_sessions cs WHERE ${IN_CLASS}
      ORDER BY cs.updated_at DESC LIMIT ${LIST_MAX}`,
  ).bind(classId, now).all<SessionRow>();
  const rows = res.results ?? [];
  const names = await namesFor(env.DB, rows.flatMap((r) => [r.host_email, ...emailsOf(r.participants)]));
  return json({ sessions: rows.map((r) => shape(r, names)) });
};
