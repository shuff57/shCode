// POST /api/games/[id]/share  { share: true | false, choice? }
//
// The owner shares one of their own games with every class they are in right
// now (enrolled; a teacher or admin also the classes they teach), or takes it
// back out. Same rules as POST /api/library/[id]/share: a share a teacher hid
// stays hidden when the owner shares again; only the teacher can unhide it.
//
// `audience` (with share: true; migration 0057, functions/_shared/audience.ts) says WHICH classes:
// { classes: [id, ...] } or { teacher: <person key> }. Left out: a game already shared KEEPS its audience (only
// the choice changes); a game not shared yet goes to every class the caller is in, as before.
//
// `audience: { public: true }` is "Everyone" (migration 0058, functions/_shared/publicShare.ts): live at once for
// vetted accounts; refused (403) when a class switched it off or a teacher pulled it, (400) when its title or code has
// personal details. It also keeps the game in every class the owner is in.
//
// `choice` (with share: true) sets who may do what with it (lib/share-choice.ts);
// left out, the game keeps its choice. A remix of a "keep remixes open" game can
// only be 'open' (400 otherwise). Unsharing keeps the choice for next time.

import { json, type SessionData } from '../../../_shared/games';
import { audienceMap, audienceStatements, currentAudience, ownClassIds, resolveAudience, unshareStatements } from '../../../_shared/audience';
import { publicShareProblem } from '../../../_shared/publicShare';
import { isGameId } from '../../../../lib/games-core';
import { PROVENANCE_COLUMNS, choiceOf, decideChoice, provenanceFromRow, type ProvenanceRow } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  let body: { share?: unknown; choice?: unknown; audience?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.share !== 'boolean') return json({ error: 'share must be true or false' }, 400);

  const game = await env.DB.prepare(
    `SELECT id, title, code, share_choice, ${PROVENANCE_COLUMNS} FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<ProvenanceRow & { id: string; title: string; code: string; share_choice: string | null }>();
  if (!game) return json({ error: 'Not found' }, 404);

  if (!body.share) {
    await env.DB.batch(unshareStatements(env.DB, 'game', id, data.email));
    return json({ ok: true, shared: false, classes: 0, choice: choiceOf(game.share_choice) });
  }
  const ch = decideChoice(body.choice ?? choiceOf(game.share_choice), provenanceFromRow(game));
  if ('error' in ch) return json(ch, 400);
  // No audience on a game already shared: keep it, change only the choice (see currentAudience).
  if (body.audience == null) {
    const own = await ownClassIds(env.DB, data);
    const keep = await currentAudience(env.DB, 'game', id, own);
    if (keep) {
      await env.DB.prepare(`UPDATE library_games SET share_choice = ? WHERE id = ? AND owner_email = ?`).bind(ch.choice, id, data.email).run();
      return json({ ok: true, shared: true, classes: keep.kind === 'classes' ? keep.classes.length : 0, choice: ch.choice, audience: keep });
    }
  }
  const r = await resolveAudience(env.DB, data, body.audience);
  if (!r.ok) return json({ error: r.error }, r.status);
  const now = Date.now();
  // "Everyone" (migration 0058): a class has not switched it off, a teacher has not pulled it, and its title and code
  // carry no personal details (the same check messages and published programs use).
  if (r.isPublic) {
    const bad = await publicShareProblem(env.DB, data.email, 'game', id, 'game', [game.title, game.code], now);
    if (bad) return json({ error: bad.error }, bad.status);
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE library_games SET share_choice = ? WHERE id = ? AND owner_email = ?`).bind(ch.choice, id, data.email),
    ...audienceStatements(env.DB, 'game', id, data.email, r, now),
  ]);
  const aud = (await audienceMap(env.DB, 'game', [{ id, audience_teacher: r.teacherEmail }], await ownClassIds(env.DB, data))).get(id) ?? null;
  return json({ ok: true, shared: true, classes: r.classIds.length, choice: ch.choice, audience: aud });
};
