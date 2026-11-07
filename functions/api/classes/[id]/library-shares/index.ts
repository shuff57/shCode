// GET  /api/classes/[id]/library-shares  — every item shared into this class, hidden ones too
// POST /api/classes/[id]/library-shares  { itemId, action: 'hide' | 'unhide' | 'remove' }
//
// Owner, co-teacher or admin only. Hide keeps the share but takes it out of
// every student's view; remove takes it out of this class's library. Neither
// touches the student's own copy, which stays in their account.

import { canManageClass } from '../../../../_shared/classAuth';
import { ownerLabel, sharedInto } from '../../../../_shared/libraryShare';
import { isUploadId } from '../../../../_shared/uploads';

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

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  const rows = await sharedInto(env.DB, [classId]);
  return json({
    items: rows.map((r) => ({
      id: r.id, kind: r.kind, name: r.name, bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name), ownerEmail: r.owner_email,
      sharedAt: r.shared_at, hidden: r.hidden_at != null,
    })),
  });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  let body: { itemId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const itemId = String(body.itemId ?? '');
  if (!isUploadId(itemId)) return json({ error: 'Not found' }, 404);
  const now = Date.now();
  let res: D1Result;
  if (body.action === 'hide') {
    res = await env.DB.prepare(`UPDATE library_shares SET hidden_at = ?, hidden_by = ? WHERE item_id = ? AND class_id = ?`)
      .bind(now, data.email, itemId, classId).run();
  } else if (body.action === 'unhide') {
    res = await env.DB.prepare(`UPDATE library_shares SET hidden_at = NULL, hidden_by = NULL WHERE item_id = ? AND class_id = ?`)
      .bind(itemId, classId).run();
  } else if (body.action === 'remove') {
    res = await env.DB.prepare(`DELETE FROM library_shares WHERE item_id = ? AND class_id = ?`).bind(itemId, classId).run();
  } else {
    return json({ error: "action must be 'hide', 'unhide' or 'remove'" }, 400);
  }
  if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
