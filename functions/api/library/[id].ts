// GET    /api/library/[id]  — one of the caller's items, with its content
// DELETE /api/library/[id]  — delete one (?baseHash=<hash> refuses if it changed elsewhere)
//
// Owner only, and the owner is in every WHERE: an id that does not exist and
// someone else's id both answer 404, so ids cannot be probed. A delete leaves
// a tombstone row (so other devices learn about it) and removes the bytes.

import { isUploadId } from '../../_shared/uploads';
import { r2Key } from '../../_shared/library';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface Row {
  id: string;
  kind: string;
  name: string;
  meta: string | null;
  hash: string;
  updated_at: number;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id) || !env.UPLOADS) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(
    `SELECT id, kind, name, meta, hash, updated_at FROM library_items
      WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<Row>();
  if (!row) return json({ error: 'Not found' }, 404);
  const obj = await env.UPLOADS.get(r2Key(id));
  if (!obj) return json({ error: 'Not found' }, 404);
  const dataUri = await obj.text();
  return json({ id: row.id, kind: row.kind, name: row.name, meta: row.meta, hash: row.hash, updatedAt: row.updated_at, dataUri });
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id)) return json({ error: 'Not found' }, 404);
  const baseHash = new URL(request.url).searchParams.get('baseHash');
  const row = await env.DB.prepare(
    `SELECT id, kind, name, meta, hash, updated_at FROM library_items
      WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<Row>();
  if (!row) return json({ error: 'Not found' }, 404);
  if (baseHash && row.hash !== baseHash) {
    return json({ error: 'This was changed on another device.', conflict: true }, 409);
  }
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE library_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_email = ?`)
      .bind(now, now, id, data.email),
    // Unsharing is part of deleting: a class must not keep a picture its owner removed.
    env.DB.prepare(`DELETE FROM library_shares WHERE item_id = ?`).bind(id),
  ]);
  if (env.UPLOADS) await env.UPLOADS.delete(r2Key(id));
  return json({ ok: true, id, deletedAt: now });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
