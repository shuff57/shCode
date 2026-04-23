// POST /api/classes/[id]/archive  body { archived: boolean }
// Owner-only. Flips classes.archived_at between a timestamp and NULL.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can archive or unarchive' }, 403);
  }

  let body: { archived?: boolean };
  try {
    body = (await request.json()) as { archived?: boolean };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const archivedAt = body.archived === false ? null : Date.now();
  await env.DB.prepare('UPDATE classes SET archived_at = ? WHERE id = ?')
    .bind(archivedAt, classId)
    .run();

  return json({ ok: true, archived_at: archivedAt });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
