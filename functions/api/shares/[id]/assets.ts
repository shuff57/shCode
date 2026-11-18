// POST /api/shares/[id]/assets  { code?: <the program being watched> }
//
// The sender's pictures, sounds and fonts for a moSHion program sent in a message, so it looks on /shared as it does
// on the sender's computer (a sketch loads saved art from the RUNNER's library, so without this every picture was
// missing). Same rule as Code together (owner's decision 2026-11-17): sending the program is the consent, so the
// sender's live items the program uses are sent whether or not they are shared with a class, to exactly the people
// who may open the share (functions/_shared/shareAccess.ts; anyone else 404).
//
// Which program: a `copy` is the code stored with the message, never the request's. A `watch` is the session as it
// is typed, so the request carries the text the watcher is running; only while that very session is open
// (room_code + room_created_at), and only the sender's items. A `together` invitation runs nothing here. The sender
// gets nothing (their own library already has it). No email in the answer.

import { json, type SessionData } from '../../../_shared/messages';
import { openShare } from '../../../_shared/shareAccess';
import { getRoom, roomKind } from '../../../_shared/rooms';
import { isKind } from '../../../_shared/library';
import { loadItemAssets, type AssetItemRow } from '../../../_shared/itemAssets';
import { usedItems } from '../../../../lib/games-core';
import { MAX_DOC_BYTES } from '../../../../lib/live-doc-protocol';

interface Env { DB: D1Database; UPLOADS: R2Bucket }
type Ctx = EventContext<Env, 'id', SessionData>;

const missing = () => json({ error: 'That program is not there any more, or it was not sent to you.' }, 404);

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const opened = await openShare(env.DB, data, String(params.id));
  if (!opened) return missing();
  const { row } = opened;
  if (row.lang !== 'moshion' || row.author_email === data.email) return json({ assets: [] });

  let program = '';
  if (row.kind === 'copy') {
    program = row.code ?? '';
  } else if (row.kind === 'watch') {
    let body: { code?: unknown } = {};
    try { body = await request.json(); } catch { /* no body: nothing to look for */ }
    program = typeof body?.code === 'string' ? body.code : '';
    if (program.length > 2 * MAX_DOC_BYTES) return json({ error: 'That program is too long.' }, 413);
    const room = row.room_code ? await getRoom(env.DB, row.room_code) : null;
    const open = !!room && roomKind(room) === 'code' && room.created_at === row.room_created_at
      && !room.closed_at && room.expires_at > Date.now();
    if (!open) return json({ assets: [] });
  }
  if (!program) return json({ assets: [] });

  const rows = ((await env.DB.prepare(
    `SELECT id, kind, name, mime, meta FROM library_items WHERE owner_email = ? AND deleted_at IS NULL`,
  ).bind(row.author_email).all<AssetItemRow>()).results ?? []).filter((r) => isKind(r.kind));
  return json({ assets: await loadItemAssets(env.UPLOADS, usedItems(program, rows)) });
};
