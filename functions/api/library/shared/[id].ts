// GET /api/library/shared/[id]  — the content of one item in the caller's class library
//
// Same visibility as the list (functions/api/library/shared/index.ts): shared
// into a class the caller is in, and not hidden unless the caller teaches that
// class. Anything else is 404, the same answer as an id that does not exist.
//
// A "just use" item (share_choice 'play', lib/share-choice.ts) is not for
// copying: a student who is not its owner gets 403 with a plain sentence, so
// Copy to mine and Remix cannot take it. `?preview=1` still answers with the
// bytes, marked `canCopy: false`, because the class library shows the picture
// or plays the sound (like a game's code, it reaches the browser to be shown,
// so the choice is a request, not a lock). A teacher of a class it is shared
// into, and an admin, always get it (moderation). The author's games still get
// it through GET /api/games/[id]/assets.

import { isUploadId } from '../../../_shared/uploads';
import { r2Key } from '../../../_shared/library';
import { ownerLabel, sharedInto, studentClassIds, teacherClassIds } from '../../../_shared/libraryShare';
import { PROVENANCE_COLUMNS, canRemix, choiceOf, provenanceFromRow, remixRefusal, type ProvenanceRow } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id) || !env.UPLOADS) return json({ error: 'Not found' }, 404);
  const asStudent = await studentClassIds(env.DB, data.email);
  const asTeacher = data.role === 'student' ? [] : await teacherClassIds(env.DB, data.email);
  const teaches = new Set(asTeacher);
  const rows = (await sharedInto(env.DB, [...new Set([...asStudent, ...asTeacher])])).filter((r) => r.id === id);
  const visible = rows.find((r) => r.hidden_at == null || teaches.has(r.class_id) || data.role === 'admin');
  if (!visible) return json({ error: 'Not found' }, 404);
  const meta = await env.DB.prepare(`SELECT meta, share_choice, ${PROVENANCE_COLUMNS} FROM library_items WHERE id = ?`)
    .bind(id).first<ProvenanceRow & { meta: string | null; share_choice: string | null }>();
  const owner = ownerLabel(visible.first_name, visible.last_name);
  const choice = choiceOf(meta?.share_choice);
  const mine = visible.owner_email === data.email;
  const moderates = data.role === 'admin' || rows.some((r) => teaches.has(r.class_id));
  const canCopy = mine || canRemix(choice);
  const preview = new URL(request.url).searchParams.get('preview') === '1';
  if (!canCopy && !moderates && !preview) {
    return json({ error: remixRefusal('art', visible.name, owner), justUse: true }, 403);
  }
  const obj = await env.UPLOADS.get(r2Key(id));
  if (!obj) return json({ error: 'Not found' }, 404);
  return json({
    id, kind: visible.kind, name: visible.name, owner,
    meta: meta?.meta ?? null, dataUri: await obj.text(),
    choice, canCopy, remixedFrom: provenanceFromRow(meta),
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
