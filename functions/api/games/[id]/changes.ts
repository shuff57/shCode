// GET  /api/games/[id]/changes  — the game's proposed changes (GitHub's "Pull requests" tab), newest first
// POST /api/games/[id]/changes  { title, code, baseVersion, note? }  — propose a change, or update mine
//
// A classmate who remixed a game proposes their sandbox code back to its maker (migration 0048,
// lib/game-flow-core.ts). Who may see or propose is gameAccess's rule (functions/_shared/gameFlow.ts):
// anyone who can see the game and its code, except its maker (they just Update). One open proposal per
// person per game: proposing again updates it, as pushing to a pull request's branch does.
//
// `baseVersion` is the version the remix started from (the sandbox remembers it). The server reads that
// version's code itself and stores it with the proposal, so the diff survives pruning. A base that is no
// longer kept (or never existed) falls back to the game as it is now, which only makes the proposer's own
// diff look bigger. `note` is the optional first comment (GitHub's description).

import { json, type SessionData } from '../../../_shared/games';
import {
  CHANGE_COLUMNS, commentStmt, eventStmt, gameAccess, nameOf, newId, statusFor, versionCode, type ChangeRow,
} from '../../../_shared/gameFlow';
import { GAME_CODE_MAX, isGameId } from '../../../../lib/games-core';
import {
  CHANGES_PER_DAY, OPEN_CHANGES_PER_GAME, checkProposedCode, cleanComment, cleanMessage, sameCode,
} from '../../../../lib/game-flow-core';
import { changeSize } from '../../../../lib/game-merge';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

const MAX_BODY = GAME_CODE_MAX * 2 + 8192;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const access = await gameAccess(env.DB, data, id);
  if (!access) return json({ error: 'Not found' }, 404);
  const rows = (await env.DB.prepare(
    `SELECT ${CHANGE_COLUMNS},
            (SELECT COUNT(*) FROM game_change_comments k WHERE k.change_id = game_changes.id AND k.kind = 'comment' AND k.deleted_at IS NULL) AS comments
       FROM game_changes WHERE game_id = ? ORDER BY (status = 'open') DESC, updated_at DESC LIMIT 60`,
  ).bind(id).all<ChangeRow & { comments: number }>()).results ?? [];
  const changes = rows
    .filter((c) => c.status !== 'removed' || access.teacher || c.from_email === data.email)
    .map((c) => ({
      id: c.id, title: c.title, from: c.from_name, mine: c.from_email === data.email,
      status: statusFor(c, access.game), baseVersion: c.base_version, locked: c.locked_at != null,
      createdAt: c.created_at, updatedAt: c.updated_at, comments: c.comments,
      size: changeSize(c.base_code, c.code), acceptedVersion: c.accepted_version,
    }));
  return json({
    game: { id: access.game.id, title: access.game.title, version: access.game.version, maker: await nameOf(env.DB, access.game.owner_email), mine: access.maker },
    changes,
  });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) {
    return json({ error: `That is more than ${GAME_CODE_MAX / 1024} KB of code, the most a game can be.` }, 413);
  }
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const access = await gameAccess(env.DB, data, id);
  if (!access) return json({ error: 'Not found' }, 404);
  const { game } = access;
  if (access.maker) return json({ error: 'This is your own game. Update game in the sandbox saves your change to it.' }, 400);

  let body: { title?: unknown; code?: unknown; baseVersion?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const t = cleanMessage(body.title, 'proposal');
  if ('error' in t) return json({ error: t.error }, 400);
  const c = checkProposedCode(body.code);
  if ('error' in c) return json({ error: c.error }, c.tooLarge ? 413 : 400);
  let note: string | null = null;
  if (body.note !== undefined && body.note !== null && String(body.note).trim()) {
    const n = cleanComment(body.note);
    if ('error' in n) return json({ error: n.error }, 400);
    note = n.body;
  }

  // The code it started from, read on the server.
  let baseVersion = Number(body.baseVersion);
  let baseCode: string | null = null;
  if (Number.isInteger(baseVersion) && baseVersion >= 1 && baseVersion <= game.version) {
    baseCode = await versionCode(env.DB, id, baseVersion);
    if (baseCode == null && baseVersion === game.version) baseCode = game.code;
  }
  const rebased = baseCode == null;
  if (baseCode == null) { baseVersion = game.version; baseCode = game.code; }
  if (sameCode(c.code, baseCode)) {
    return json({ error: 'Nothing has changed yet: your code is the same as the version you started from. Change something, Run it, then propose it.' }, 400);
  }
  if (sameCode(c.code, game.code)) {
    return json({ error: `"${game.title}" already has exactly this code.` }, 400);
  }

  const me = await nameOf(env.DB, data.email);
  const now = Date.now();
  const mineOpen = await env.DB.prepare(
    `SELECT id FROM game_changes WHERE game_id = ? AND from_email = ? AND status = 'open'`,
  ).bind(id, data.email).first<{ id: string }>();

  if (mineOpen) {
    const stmts = [
      env.DB.prepare(
        `UPDATE game_changes SET title = ?, code = ?, base_version = ?, base_code = ?, updated_at = ? WHERE id = ? AND status = 'open'`,
      ).bind(t.message, c.code, baseVersion, baseCode, now, mineOpen.id),
      eventStmt(env.DB, mineOpen.id, 'updated', data.email, me, now),
    ];
    if (note) stmts.push(commentStmt(env.DB, mineOpen.id, data.email, me, note, now));
    await env.DB.batch(stmts);
    return json({ ok: true, created: false, id: mineOpen.id, baseVersion, rebased });
  }

  const openN = await env.DB.prepare(`SELECT COUNT(*) AS n FROM game_changes WHERE game_id = ? AND status = 'open'`)
    .bind(id).first<{ n: number }>();
  if ((openN?.n ?? 0) >= OPEN_CHANGES_PER_GAME) {
    return json({ error: `"${game.title}" already has ${OPEN_CHANGES_PER_GAME} changes waiting for its maker. Try again once some are answered.` }, 429);
  }
  const todayN = await env.DB.prepare(`SELECT COUNT(*) AS n FROM game_changes WHERE from_email = ? AND created_at > ?`)
    .bind(data.email, now - 24 * 3600 * 1000).first<{ n: number }>();
  if ((todayN?.n ?? 0) >= CHANGES_PER_DAY) {
    return json({ error: `You have proposed ${CHANGES_PER_DAY} changes today, the most for one day. Try again tomorrow.` }, 429);
  }

  const cid = newId();
  const stmts = [
    env.DB.prepare(
      `INSERT INTO game_changes (id, game_id, from_email, from_name, title, base_version, base_code, code, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    ).bind(cid, id, data.email, me, t.message, baseVersion, baseCode, c.code, now, now),
    eventStmt(env.DB, cid, 'opened', data.email, me, now),
  ];
  if (note) stmts.push(commentStmt(env.DB, cid, data.email, me, note, now));
  await env.DB.batch(stmts);
  return json({ ok: true, created: true, id: cid, baseVersion, rebased }, 201);
};
