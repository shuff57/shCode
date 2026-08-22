// DELETE /api/uploads/:id — remove one of the caller's images.
//
// Ownership is enforced in the DELETE's WHERE clause, not by reading the row
// first and comparing in JS: one statement, no window between the check and
// the write. `meta.changes` tells us whether it matched, which is also how a
// non-existent id and someone else's id produce the same 404 — a student
// should not be able to probe which ids exist.
//
// Admins can delete anything, for moderation. A teacher cannot: teachers own
// classes, not the images of students who may also be in someone else's.

import { isUploadId } from '../../_shared/uploads';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, params, data } = context;

  const id = decodeURIComponent(String(params.id || ''));
  if (!isUploadId(id)) return json({ error: 'Not found' }, 404);
  if (!env.UPLOADS) return json({ error: 'Uploads are not configured on this server' }, 500);

  const isAdmin = data.role === 'admin';
  const stmt = isAdmin
    ? env.DB.prepare(`DELETE FROM uploads WHERE id = ?`).bind(id)
    : env.DB.prepare(`DELETE FROM uploads WHERE id = ? AND owner_email = ?`).bind(id, data.email);

  const res = await stmt.run();
  if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);

  // The row is the ownership record, so it goes first: if this next call
  // fails we have an orphaned object nobody can list, rather than a live
  // image whose owner has already been forgotten.
  await env.UPLOADS.delete(id).catch(() => {});

  return json({ deleted: id });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
