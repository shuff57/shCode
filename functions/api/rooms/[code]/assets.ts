// POST /api/rooms/[code]/assets  { code: <the shared program> }
//
// Code together's pictures, sounds and fonts. A sketch loads saved art by name from the RUNNER's own library, so in a
// session the others' previews had none of the art the host (or anyone else seated) drew: "No texture named ..." on
// every computer but the one that made it. This hands a seated person the OTHER seated people's live items the
// program uses (lib/games-core.ts usedItems: a whole string literal, or a name put together from them), shared with a
// class or not (owner's decision 2026-11-17: starting or joining a session to code one program together is the
// consent, and the art goes only to the people in it). The sandbox lays them over its store for that run only
// (lib/game-assets.ts mergeAssets with ownWins, so the runner's own same-named item still wins) and never saves them.
//
// Rules: a Code together room (kind 'code'), open, and the caller holds a seat in it now (not left). Anything else is
// 404, so a code cannot be probed. The program comes from the caller: they can type a name to fetch an item of
// someone in the session, but only into the shared program, which everyone in the session (the item's owner
// included) sees, and the class's teachers can read afterwards (code_sessions). When two people have an item of the
// same name, the lower seat's (the host's first) is sent. No email in the answer.

import { getRoom, json, normalizeCode, roomKind } from '../../../_shared/rooms';
import { isKind } from '../../../_shared/library';
import { loadItemAssets, type AssetItemRow } from '../../../_shared/itemAssets';
import { usedItems } from '../../../../lib/games-core';
import { MAX_DOC_BYTES } from '../../../../lib/live-doc-protocol';

interface Env { DB: D1Database; UPLOADS: R2Bucket }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

const NOT_FOUND = { error: 'You are not in that session.' };

export const onRequestPost: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  const code = normalizeCode(params.code);
  if (!code) return json(NOT_FOUND, 404);
  let body: { code?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const program = typeof body?.code === 'string' ? body.code : '';
  // Twice the room's own cap: a few characters of slack for a doc the room is about to refuse, never megabytes.
  if (program.length > 2 * MAX_DOC_BYTES) return json({ error: 'That program is too long to share.' }, 413);

  const now = Date.now();
  const room = await getRoom(env.DB, code);
  if (!room || roomKind(room) !== 'code' || room.closed_at || room.expires_at <= now) return json(NOT_FOUND, 404);
  const seats = (await env.DB.prepare(
    'SELECT seat, email, left_at FROM game_room_players WHERE code = ? ORDER BY seat',
  ).bind(code).all<{ seat: number; email: string; left_at: number | null }>()).results ?? [];
  const here = seats.filter((s) => s.left_at === null);
  if (!here.some((s) => s.email === data.email)) return json(NOT_FOUND, 404);

  // The others, lowest seat first (an account seated twice, in two tabs, counts once).
  const others: string[] = [];
  for (const s of here) if (s.email !== data.email && !others.includes(s.email)) others.push(s.email);
  if (!others.length || !program) return json({ assets: [] });

  const marks = others.map(() => '?').join(',');
  const rows = ((await env.DB.prepare(
    `SELECT id, kind, name, mime, meta, owner_email FROM library_items WHERE owner_email IN (${marks}) AND deleted_at IS NULL`,
  ).bind(...others).all<AssetItemRow & { owner_email: string }>()).results ?? []).filter((r) => isKind(r.kind));
  rows.sort((a, b) => others.indexOf(a.owner_email) - others.indexOf(b.owner_email));
  const seen = new Set<string>();
  const serve: AssetItemRow[] = [];
  for (const r of usedItems(program, rows)) {
    const k = `${r.kind}:${r.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    serve.push({ id: r.id, kind: r.kind, name: r.name, mime: r.mime, meta: r.meta });
  }
  return json({ assets: await loadItemAssets(env.UPLOADS, serve) });
};
