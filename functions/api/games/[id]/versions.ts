// GET  /api/games/[id]/versions        — the game's history: version, what changed, who, when (no code)
// GET  /api/games/[id]/versions?v=3    — one kept version, with its code and the one before it (for a diff)
// POST /api/games/[id]/versions { revertTo: 3, message? }  — the maker goes back to version 3
//
// Versions are migration 0048 (lib/game-flow-core.ts). Who may read them is gameAccess's rule
// (functions/_shared/gameFlow.ts): the maker, a teacher of a class the game is shared into, or a
// classmate who can see the game AND its code (not a "just play" game). Anything else is 404.
// Going back never deletes: it saves version 3's code as a NEW version ("Went back to version 3"),
// so going back is itself undoable.

import { json, type SessionData } from '../../../_shared/games';
import { gameAccess, saveVersionStmts, savedAs, nameOf } from '../../../_shared/gameFlow';
import { declaredMode, isGameId } from '../../../../lib/games-core';
import { cleanMessage, sameCode } from '../../../../lib/game-flow-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

interface VersionRow {
  version: number;
  message: string;
  author_name: string;
  change_id: string | null;
  created_at: number;
  bytes: number;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const access = await gameAccess(env.DB, data, id);
  if (!access) return json({ error: 'Not found' }, 404);
  const { game } = access;
  const v = new URL(request.url).searchParams.get('v');

  if (v !== null) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) return json({ error: 'Not found' }, 404);
    // A game from before versions has no rows yet: its current code is version 1.
    const rows = (await env.DB.prepare(
      `SELECT version, code, message, author_name, change_id, created_at FROM library_game_versions
        WHERE game_id = ? AND version IN (?, ?)`,
    ).bind(id, n, n - 1).all<{ version: number; code: string; message: string; author_name: string; change_id: string | null; created_at: number }>()).results ?? [];
    let row = rows.find((r) => r.version === n);
    if (!row && n === game.version) {
      row = { version: n, code: game.code, message: 'First version', author_name: '', change_id: null, created_at: game.created_at };
    }
    if (!row) return json({ error: 'That version is no longer kept. Only the newest 20 are.' }, 404);
    const before = rows.find((r) => r.version === n - 1);
    return json({
      version: {
        version: row.version, code: row.code, message: row.message, author: row.author_name || null,
        byChange: !!row.change_id, changeId: row.change_id, createdAt: row.created_at,
        // The code just before it, so the page can show what this version changed. null = the first kept one.
        previous: before ? { version: before.version, code: before.code } : null,
      },
      current: game.version,
    });
  }

  const r = await env.DB.prepare(
    `SELECT version, message, author_name, change_id, created_at, LENGTH(code) AS bytes FROM library_game_versions
      WHERE game_id = ? ORDER BY version DESC`,
  ).bind(id).all<VersionRow>();
  let versions = (r.results ?? []).map((x) => ({
    version: x.version, message: x.message, author: x.author_name, byChange: !!x.change_id,
    changeId: x.change_id, createdAt: x.created_at, bytes: x.bytes,
  }));
  if (!versions.length) {
    versions = [{
      version: game.version, message: 'First version', author: await nameOf(env.DB, game.owner_email),
      byChange: false, changeId: null, createdAt: game.created_at, bytes: game.code.length,
    }];
  }
  return json({
    game: { id: game.id, title: game.title, version: game.version, maker: await nameOf(env.DB, game.owner_email) },
    mine: access.maker,
    versions,
  });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const access = await gameAccess(env.DB, data, id);
  if (!access) return json({ error: 'Not found' }, 404);
  if (!access.maker) return json({ error: 'Only the person who made this game can go back to an older version.' }, 403);
  let body: { revertTo?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const n = Number(body.revertTo);
  const { game } = access;
  if (!Number.isInteger(n) || n < 1) return json({ error: 'Pick a version to go back to.' }, 400);
  if (n === game.version) return json({ error: `Version ${n} is the one your game has now.` }, 400);
  const row = await env.DB.prepare(`SELECT code FROM library_game_versions WHERE game_id = ? AND version = ?`)
    .bind(id, n).first<{ code: string }>();
  if (!row) return json({ error: 'That version is no longer kept. Only the newest 20 are.' }, 404);
  if (sameCode(row.code, game.code)) return json({ error: `Your game's code is already the same as version ${n}.` }, 400);
  const m = body.message === undefined || body.message === null ? { message: `Went back to version ${n}` } : cleanMessage(body.message);
  if ('error' in m) return json({ error: m.error }, 400);
  const me = await nameOf(env.DB, data.email);
  const now = Date.now();
  const { mode, players } = declaredMode(row.code);
  try {
    await env.DB.batch(saveVersionStmts(env.DB, {
      gameId: id, expectVersion: game.version, code: row.code, mode, players, message: m.message,
      authorEmail: data.email, authorName: me, ownerName: me, now,
    }));
  } catch {
    return json({ error: 'Your game was saved somewhere else a moment ago. Try again.' }, 409);
  }
  if (!(await savedAs(env.DB, id, game.version, row.code))) {
    return json({ error: 'Your game was saved somewhere else a moment ago. Try again.' }, 409);
  }
  return json({ ok: true, version: game.version + 1, message: m.message });
};
