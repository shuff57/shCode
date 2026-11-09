// POST /api/classes/[id]/library-delete  { itemId }
//
// A teacher deletes a student's shared picture or sound outright (not just
// hides it). Owner, co-teacher or admin of the class only, and only for an item
// shared into THIS class by a student enrolled in it now; a teacher's or an
// admin's item is refused. The delete is the student's own delete done for
// them: a tombstone, so the student's other computers drop it on their next
// sync; every share of it removed; its bytes removed from R2.
// Rules: functions/_shared/libraryDelete.ts.

import { deleteLibraryItemFor, json, refuseUnlessClassTeacher, studentStanding, type SessionData } from '../../../_shared/libraryDelete';
import { isUploadId } from '../../../_shared/uploads';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await refuseUnlessClassTeacher(env.DB, data, classId);
  if (refused) return refused;
  let body: { itemId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const itemId = String(body.itemId ?? '');
  if (!isUploadId(itemId)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(
    `SELECT i.id, i.kind, i.name, i.owner_email FROM library_shares s
       JOIN library_items i ON i.id = s.item_id AND i.deleted_at IS NULL
      WHERE s.item_id = ? AND s.class_id = ?`,
  ).bind(itemId, classId).first<{ id: string; kind: string; name: string; owner_email: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  if ((await studentStanding(env.DB, classId, row.owner_email)) !== 'ok') {
    return json({ error: 'Only something shared by a student in this class can be deleted here.' }, 403);
  }
  await deleteLibraryItemFor(env.DB, env.UPLOADS, row.owner_email, row.id);
  return json({ ok: true, id: row.id, kind: row.kind, name: row.name });
};
