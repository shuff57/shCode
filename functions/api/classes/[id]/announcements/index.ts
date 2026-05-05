// GET  /api/classes/[id]/announcements
// POST /api/classes/[id]/announcements  body { content, pinned? }
// DELETE /api/classes/[id]/announcements  body { id }
//
// GET: enrolled students + teachers can view.
// POST/DELETE: only class owner or co-teachers can create/delete.

import { canManageClass } from '../../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);

  // Allow teachers/co-teachers/admins, and also enrolled students.
  if (!acl.canManage && data.role !== 'admin') {
    const enrollment = await env.DB
      .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?')
      .bind(classId, data.email, Date.now())
      .first();
    if (!enrollment) return json({ error: 'Not authorized' }, 403);
  }

  const announcements = await env.DB
    .prepare(
      'SELECT id, class_id, content, created_by, created_at, pinned FROM class_announcements WHERE class_id = ? ORDER BY pinned DESC, created_at DESC',
    )
    .bind(classId)
    .all();

  return json({ announcements: announcements.results ?? [] });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized' }, 403);
  }

  let body: { content?: string; pinned?: boolean };
  try {
    body = (await request.json()) as { content?: string; pinned?: boolean };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const content = (body.content ?? '').trim();
  if (!content) return json({ error: 'Content is required' }, 400);

  const pinned = body.pinned ? 1 : 0;
  const now = Date.now();

  const result = await env.DB
    .prepare(
      'INSERT INTO class_announcements (class_id, content, created_by, created_at, pinned) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(classId, content, data.email, now, pinned)
    .run();

  if (!result.meta.last_row_id && result.meta.last_row_id !== 0) {
    return json({ error: 'Failed to create announcement' }, 500);
  }

  const row = await env.DB
    .prepare('SELECT id, class_id, content, created_by, created_at, pinned FROM class_announcements WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ announcement: row }, 201);
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized' }, 403);
  }

  let body: { id?: number };
  try {
    body = (await request.json()) as { id?: number };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.id !== 'number' || !Number.isFinite(body.id)) {
    return json({ error: 'Announcement id required' }, 400);
  }

  const existing = await env.DB
    .prepare('SELECT 1 FROM class_announcements WHERE id = ? AND class_id = ?')
    .bind(body.id, classId)
    .first();
  if (!existing) return json({ error: 'Announcement not found' }, 404);

  await env.DB
    .prepare('DELETE FROM class_announcements WHERE id = ? AND class_id = ?')
    .bind(body.id, classId)
    .run();

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
