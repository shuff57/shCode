// GET /api/library/shared/[id]  — the content of one item in the caller's class library
//
// Same visibility as the list (functions/api/library/shared/index.ts): shared
// into a class the caller is in, and not hidden unless the caller teaches that
// class. Anything else is 404, the same answer as an id that does not exist.

import { isUploadId } from '../../../_shared/uploads';
import { r2Key } from '../../../_shared/library';
import { ownerLabel, sharedInto, studentClassIds, teacherClassIds } from '../../../_shared/libraryShare';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id) || !env.UPLOADS) return json({ error: 'Not found' }, 404);
  const asStudent = await studentClassIds(env.DB, data.email);
  const asTeacher = data.role === 'student' ? [] : await teacherClassIds(env.DB, data.email);
  const teaches = new Set(asTeacher);
  const rows = (await sharedInto(env.DB, [...new Set([...asStudent, ...asTeacher])])).filter((r) => r.id === id);
  const visible = rows.find((r) => r.hidden_at == null || teaches.has(r.class_id) || data.role === 'admin');
  if (!visible) return json({ error: 'Not found' }, 404);
  const meta = await env.DB.prepare(`SELECT meta FROM library_items WHERE id = ?`).bind(id).first<{ meta: string | null }>();
  const obj = await env.UPLOADS.get(r2Key(id));
  if (!obj) return json({ error: 'Not found' }, 404);
  return json({
    id, kind: visible.kind, name: visible.name, owner: ownerLabel(visible.first_name, visible.last_name),
    meta: meta?.meta ?? null, dataUri: await obj.text(),
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
