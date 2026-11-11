// GET    /api/games/[id]/comments            — the game's comments and replies (lib/game-comments-core.ts GameCommentsView)
// POST   /api/games/[id]/comments            { body, parentId? }  — add a comment, or a reply to one
// DELETE /api/games/[id]/comments?comment=<cid>                 — remove one
//
// Migration 0051 (owner's decision 2026-11-12): classmates write about a game
// in their own words and reply to each other, under the proposed-change
// conversations' rules. Who may read and write is feedbackState()
// (functions/_shared/gameComments.ts): anyone who may open the game, while the
// creator's switch, the teacher's per-game switch and the class switch are on;
// with feedback off the creator and the class's teachers still read. Anyone else
// gets 404, so ids cannot be probed.
//
// A reply hangs off a TOP-LEVEL comment (one level); replying to a reply hangs
// it off the same top comment. A deleted comment keeps its row so its replies
// keep their place, and its words are never sent again. A comment's own writer,
// a teacher of a class the game is shared into, and an admin may delete it.
// Names are first name + last initial, written down when the comment is; never
// an email.

import { json, ownerName, type SessionData } from '../../../_shared/games';
import { feedbackState } from '../../../_shared/gameComments';
import { newUploadId } from '../../../_shared/uploads';
import { isGameId } from '../../../../lib/games-core';
import {
  GAME_COMMENTS_PER_GAME,
  GAME_COMMENTS_PER_HOUR,
  cleanComment,
  type GameComment,
  type GameCommentsView,
} from '../../../../lib/game-comments-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

interface Row {
  id: string;
  parent_id: string | null;
  author_email: string;
  author_name: string;
  body: string;
  created_at: number;
  deleted_at: number | null;
}

const isCommentId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);

async function view(env: Env, data: SessionData, st: NonNullable<Awaited<ReturnType<typeof feedbackState>>>): Promise<GameCommentsView> {
  let comments: GameComment[] = [];
  if (st.canRead) {
    const rows = (await env.DB.prepare(
      `SELECT id, parent_id, author_email, author_name, body, created_at, deleted_at
         FROM game_comments WHERE game_id = ? ORDER BY created_at, id`,
    ).bind(st.gameId).all<Row>()).results ?? [];
    // A deleted comment is shown (as deleted) only while it still has a live reply.
    const liveReplyTo = new Set(rows.filter((r) => r.parent_id && r.deleted_at == null).map((r) => r.parent_id));
    comments = rows
      .filter((r) => r.deleted_at == null || (!r.parent_id && liveReplyTo.has(r.id)))
      .map((r) => ({
        id: r.id,
        parentId: r.parent_id,
        author: r.author_name,
        mine: r.author_email === data.email,
        byMaker: r.author_email === st.ownerEmail,
        body: r.deleted_at == null ? r.body : null,
        createdAt: r.created_at,
        deleted: r.deleted_at != null,
      }));
  }
  return {
    comments,
    canWrite: st.canWrite,
    canModerate: st.canModerate,
    isMaker: st.isMaker,
    feedbackOn: st.feedbackOn,
    closed: st.closed,
  };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const st = await feedbackState(env.DB, data, gameId);
  if (!st) return json({ error: 'Not found' }, 404);
  return json(await view(env, data, st));
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const st = await feedbackState(env.DB, data, gameId);
  if (!st) return json({ error: 'Not found' }, 404);
  if (!st.canWrite) return json({ error: 'Feedback is turned off for this game.', closed: st.closed }, 403);

  let body: { body?: unknown; parentId?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const c = cleanComment(body.body);
  if ('error' in c) return json({ error: c.error }, 400);

  let parentId: string | null = null;
  if (body.parentId != null) {
    if (!isCommentId(body.parentId)) return json({ error: 'That comment is not here any more.' }, 404);
    const parent = await env.DB.prepare(`SELECT id, parent_id, deleted_at FROM game_comments WHERE id = ? AND game_id = ?`)
      .bind(body.parentId, gameId).first<{ id: string; parent_id: string | null; deleted_at: number | null }>();
    if (!parent) return json({ error: 'That comment is not here any more.' }, 404);
    // One level: a reply to a reply belongs to the same top comment.
    parentId = parent.parent_id ?? parent.id;
    const top = parent.parent_id
      ? await env.DB.prepare(`SELECT deleted_at FROM game_comments WHERE id = ? AND game_id = ?`).bind(parentId, gameId).first<{ deleted_at: number | null }>()
      : parent;
    if (!top || top.deleted_at != null) return json({ error: 'That comment was deleted, so it cannot be replied to.' }, 409);
  }

  const now = Date.now();
  const [inGame, lastHour] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM game_comments WHERE game_id = ? AND deleted_at IS NULL`).bind(gameId).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM game_comments WHERE author_email = ? AND created_at > ?`).bind(data.email, now - 3600_000).first<{ n: number }>(),
  ]);
  if ((inGame?.n ?? 0) >= GAME_COMMENTS_PER_GAME) {
    return json({ error: `This game has ${GAME_COMMENTS_PER_GAME} comments, the most it can hold. Its maker or a teacher can delete some.` }, 429);
  }
  if ((lastHour?.n ?? 0) >= GAME_COMMENTS_PER_HOUR) {
    return json({ error: `You have posted ${GAME_COMMENTS_PER_HOUR} comments in the last hour, the most for one hour. Take a break and come back.` }, 429);
  }

  const id = newUploadId();
  const name = await ownerName(env.DB, data.email);
  await env.DB.prepare(
    `INSERT INTO game_comments (id, game_id, parent_id, author_email, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, gameId, parentId, data.email, name, c.body, now).run();
  return json(await view(env, data, st), 201);
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const st = await feedbackState(env.DB, data, gameId);
  if (!st || !st.canRead) return json({ error: 'Not found' }, 404);
  const cid = new URL(request.url).searchParams.get('comment');
  if (!isCommentId(cid)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(`SELECT author_email, deleted_at FROM game_comments WHERE id = ? AND game_id = ?`)
    .bind(cid, gameId).first<{ author_email: string; deleted_at: number | null }>();
  if (!row || row.deleted_at != null) return json({ error: 'Not found' }, 404);
  if (row.author_email !== data.email && !st.canModerate) {
    return json({ error: 'Only the person who wrote it, or a teacher, can delete a comment.' }, 403);
  }
  await env.DB.prepare(`UPDATE game_comments SET deleted_at = ?, deleted_by = ? WHERE id = ?`).bind(Date.now(), data.email, cid).run();
  return json(await view(env, data, st));
};
