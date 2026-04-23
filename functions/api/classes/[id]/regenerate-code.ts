// POST /api/classes/[id]/regenerate-code
// Owner-only. Rotates the class.code to a fresh 6-char string.

import { canManageClass, generateClassCode } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can rotate the code' }, 403);
  }

  const code = await generateClassCode(env.DB);
  await env.DB.prepare('UPDATE classes SET code = ? WHERE id = ?').bind(code, classId).run();
  return json({ ok: true, code });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
