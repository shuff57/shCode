// GET  /api/classes/[id]/public-shares  — what this class's students made public ("Newly public") and the class switch
// POST /api/classes/[id]/public-shares  { action: 'pull', kind: 'item' | 'game', id, reason? }   take it down
//                                       { action: 'restore', kind, id }                           put it back
//                                       { action: 'class-off' | 'class-on' }                      the switch
//
// Migration 0058; the rules are in functions/_shared/publicShare.ts. Owner, co-teacher or admin of the class. A teacher
// pulls anything made public by a student who is IN THIS CLASS now (a student in two classes has two teachers; either
// may pull it). A pull is sticky (the student cannot make it public again until a teacher puts it back), leaves the
// class shares alone so it falls back to the student's classes, and carries an optional short reason the student reads
// in their Activity. "class-off" stops Everyone for every student of this class: nothing new, and what they had public
// goes dark until it is switched back on. Names are first name + last initial; no email in any answer.

import { canManageClass } from '../../../../_shared/classAuth';
import { classPublicRows, cleanReason, pullPublic, restorePublic, type PublicKind } from '../../../../_shared/publicShare';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

async function allowed(env: Env, data: SessionData, classId: string): Promise<Response | null> {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  return null;
}

async function view(env: Env, classId: string) {
  const cls = await env.DB.prepare(`SELECT public_sharing_off FROM classes WHERE id = ?`).bind(classId).first<{ public_sharing_off: number | null }>();
  return { publicSharingOff: !!cls?.public_sharing_off, items: await classPublicRows(env.DB, classId) };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  return json(await view(env, classId));
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  let body: { action?: unknown; kind?: unknown; id?: unknown; reason?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  if (body.action === 'class-off' || body.action === 'class-on') {
    await env.DB.prepare(`UPDATE classes SET public_sharing_off = ? WHERE id = ?`).bind(body.action === 'class-off' ? 1 : 0, classId).run();
    return json(await view(env, classId));
  }

  if (body.action === 'pull' || body.action === 'restore') {
    if ((body.kind !== 'item' && body.kind !== 'game') || typeof body.id !== 'string' || !/^[0-9a-f]{32}$/.test(body.id)) {
      return json({ error: 'Not found' }, 404);
    }
    const kind = body.kind as PublicKind;
    // Only something a student of THIS class made public: anything else (another class's, a missing one) is a 404.
    const row = await env.DB.prepare(
      `SELECT p.owner_email FROM public_shares p
         JOIN enrollments e ON e.class_id = ? AND e.student_email = p.owner_email AND e.expires_at > ?
        WHERE p.kind = ? AND p.id = ?`,
    ).bind(classId, Date.now(), kind, body.id).first<{ owner_email: string }>();
    if (!row) return json({ error: 'Not found' }, 404);

    if (body.action === 'pull') {
      const r = cleanReason(body.reason);
      if ('error' in r) return json({ error: r.error }, 400);
      if (!(await pullPublic(env.DB, kind, body.id, data.email, r.reason))) return json({ error: 'That was already taken down.' }, 409);
    } else if (!(await restorePublic(env.DB, kind, body.id))) {
      return json({ error: 'That is not taken down.' }, 409);
    }
    return json(await view(env, classId));
  }

  return json({ error: 'Unknown action' }, 400);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
