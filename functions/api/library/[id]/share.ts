// POST /api/library/[id]/share  { share: true | false, choice? }
//
// The owner shares one of their own textures or sounds with every class they
// are in right now, or takes it back out. A student shares into the classes
// they are enrolled in; a teacher (or admin) also into the classes they teach,
// so a teacher can hand the class a texture or sound to use. Sharing is opt-in per item. A share
// a teacher hid stays hidden if the owner shares again; only the teacher can
// unhide it. See functions/_shared/libraryShare.ts.
//
// `audience` (with share: true; migration 0057, functions/_shared/audience.ts) says WHICH classes:
// { classes: [id, ...] } the ones the caller is in and ticked, or { teacher: <person key> } every class of a
// teacher the student has a class with. Left out: an item already shared KEEPS its audience (only the choice
// changes, so a stale tab or a chooser with no picker never widens a share); one not shared yet goes to every
// class the caller is in, as before. The answer carries `audience` as the owner's lists do.
//
// `audience: { public: true }` is "Everyone" (migration 0058, functions/_shared/publicShare.ts): live at once for
// vetted accounts; refused (403) when a class switched it off or a teacher pulled it, (400) when its name has personal
// details. It also keeps the item in every class the owner is in.
//
// `choice` (with share: true) sets who may do what with it (lib/share-choice.ts):
// 'play' ("Just use": classmates see it in the owner's games but cannot copy
// it), 'credit', 'open' or 'free'. Left out, the item keeps its choice. A copy of
// a "keep remixes open" item can only be 'open' (400 otherwise). Unsharing keeps
// the choice for next time.

import { isUploadId } from '../../../_shared/uploads';
import { audienceMap, audienceStatements, currentAudience, ownClassIds, resolveAudience, unshareStatements } from '../../../_shared/audience';
import { publicShareProblem } from '../../../_shared/publicShare';
import { PROVENANCE_COLUMNS, choiceOf, decideChoice, provenanceFromRow, type ProvenanceRow } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isUploadId(id)) return json({ error: 'Not found' }, 404);
  let body: { share?: unknown; choice?: unknown; audience?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.share !== 'boolean') return json({ error: 'share must be true or false' }, 400);

  const item = await env.DB.prepare(
    `SELECT id, kind, name, share_choice, ${PROVENANCE_COLUMNS} FROM library_items WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<ProvenanceRow & { id: string; kind: string; name: string; share_choice: string | null }>();
  if (!item) return json({ error: 'Not found' }, 404);

  if (!body.share) {
    await env.DB.batch(unshareStatements(env.DB, 'item', id, data.email));
    return json({ ok: true, shared: false, classes: 0, choice: choiceOf(item.share_choice) });
  }
  const ch = decideChoice(body.choice ?? choiceOf(item.share_choice), provenanceFromRow(item));
  if ('error' in ch) return json(ch, 400);
  // No audience on something already shared: keep it, change only the choice (see currentAudience).
  if (body.audience == null) {
    const own = await ownClassIds(env.DB, data);
    const keep = await currentAudience(env.DB, 'item', id, own);
    if (keep) {
      await env.DB.prepare(`UPDATE library_items SET share_choice = ? WHERE id = ? AND owner_email = ?`).bind(ch.choice, id, data.email).run();
      return json({ ok: true, shared: true, classes: keep.kind === 'classes' ? keep.classes.length : 0, choice: ch.choice, audience: keep });
    }
  }
  const r = await resolveAudience(env.DB, data, body.audience);
  if (!r.ok) return json({ error: r.error }, r.status);
  const now = Date.now();
  // "Everyone" (migration 0058): a class has not switched it off, a teacher has not pulled it, and no personal details.
  if (r.isPublic) {
    const what = item.kind === 'sound' ? 'sound' : item.kind === 'font' ? 'font' : 'picture';
    const bad = await publicShareProblem(env.DB, data.email, 'item', id, what, [item.name], now);
    if (bad) return json({ error: bad.error }, bad.status);
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE library_items SET share_choice = ? WHERE id = ? AND owner_email = ?`).bind(ch.choice, id, data.email),
    ...audienceStatements(env.DB, 'item', id, data.email, r, now),
  ]);
  const aud = (await audienceMap(env.DB, 'item', [{ id, audience_teacher: r.teacherEmail }], await ownClassIds(env.DB, data))).get(id) ?? null;
  return json({ ok: true, shared: true, classes: r.classIds.length, choice: ch.choice, audience: aud });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
