// POST /api/library/[id]/share  { share: true | false }
//
// The owner shares one of their own textures or sounds with every class they
// are in right now, or takes it back out. A student shares into the classes
// they are enrolled in; a teacher (or admin) also into the classes they teach,
// so a teacher can hand the class a texture or sound to use. Sharing is opt-in per item. A share
// a teacher hid stays hidden if the owner shares again; only the teacher can
// unhide it. See functions/_shared/libraryShare.ts.

import { isUploadId } from '../../../_shared/uploads';
import { studentClassIds, teacherClassIds } from '../../../_shared/libraryShare';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id)) return json({ error: 'Not found' }, 404);
  let body: { share?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.share !== 'boolean') return json({ error: 'share must be true or false' }, 400);

  const item = await env.DB.prepare(
    `SELECT id FROM library_items WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<{ id: string }>();
  if (!item) return json({ error: 'Not found' }, 404);

  if (!body.share) {
    await env.DB.prepare(`DELETE FROM library_shares WHERE item_id = ?`).bind(id).run();
    return json({ ok: true, shared: false, classes: 0 });
  }
  const enrolled = await studentClassIds(env.DB, data.email);
  const taught = data.role === 'student' ? [] : await teacherClassIds(env.DB, data.email);
  const classes = [...new Set([...enrolled, ...taught])];
  if (!classes.length) {
    return json({
      error: data.role === 'student'
        ? 'Join a class first: sharing puts this in your class' + "'" + 's Library.'
        : 'Make a class first: sharing puts this in the Library of every class you teach.',
    }, 409);
  }
  const now = Date.now();
  await env.DB.batch(classes.map((c) =>
    env.DB.prepare(`INSERT OR IGNORE INTO library_shares (item_id, class_id, shared_at) VALUES (?, ?, ?)`).bind(id, c, now),
  ));
  return json({ ok: true, shared: true, classes: classes.length });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
