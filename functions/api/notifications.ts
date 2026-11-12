// GET /api/notifications  — the notification bell (#112): what classmates did that concerns the caller in the
// Games library, newest first, at most 30 (lib/game-notices-core.ts NoticeItem):
//   change   per proposed-change conversation the caller is in (their game, their proposal, or one they
//            commented in), the newest thing SOMEONE ELSE did there: proposed it, commented, accepted...
//   comment  a classmate's comment on the caller's game, or a reply in a comment thread they wrote in
// The caller's own actions are never items. What is unread is the browser's business (it remembers what
// it opened). Same visibility as the pages they open: a conversation the caller only joined, or a comment
// on someone else's game, is left out once the caller can no longer open that game or read its comments.
// No email in the answer; names are first name + last initial as written at the time.

import { json, type SessionData } from '../_shared/games';
import { gameAccess } from '../_shared/gameFlow';
import { feedbackState } from '../_shared/gameComments';
import { NOTICE_LIMIT, snippetOf, type NoticeItem } from '../../lib/game-notices-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

interface ChangeRow {
  id: string; title: string; game_id: string; game_title: string; status: string;
  my_game: number; mine: number;
  k_id: string; k_kind: 'comment' | 'event'; k_name: string; k_body: string; k_extra: number | null; k_at: number;
}
interface CommentRow {
  id: string; game_id: string; parent_id: string | null; author_name: string; body: string; created_at: number;
  game_title: string; my_game: number; to_me: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const me = data.email;

  const changeRows = (await env.DB.prepare(
    `SELECT c.id, c.title, c.game_id, g.title AS game_title, c.status,
            (g.owner_email = ?1) AS my_game, (c.from_email = ?1) AS mine,
            k.id AS k_id, k.kind AS k_kind, k.author_name AS k_name, k.body AS k_body, k.extra AS k_extra, k.created_at AS k_at
       FROM game_changes c
       JOIN library_games g ON g.id = c.game_id
       JOIN game_change_comments k ON k.id = (
              SELECT k2.id FROM game_change_comments k2
               WHERE k2.change_id = c.id AND k2.author_email != ?1 AND k2.deleted_at IS NULL
               ORDER BY k2.created_at DESC, k2.rowid DESC LIMIT 1)
      WHERE c.status != 'removed' AND g.deleted_at IS NULL
        AND (g.owner_email = ?1 OR c.from_email = ?1
             OR EXISTS (SELECT 1 FROM game_change_comments m WHERE m.change_id = c.id AND m.author_email = ?1 AND m.kind = 'comment'))
      ORDER BY k.created_at DESC LIMIT ?2`,
  ).bind(me, NOTICE_LIMIT).all<ChangeRow>()).results ?? [];

  const commentRows = (await env.DB.prepare(
    `SELECT c.id, c.game_id, c.parent_id, c.author_name, c.body, c.created_at, g.title AS game_title,
            (g.owner_email = ?1) AS my_game, (p.author_email = ?1) AS to_me
       FROM game_comments c
       JOIN library_games g ON g.id = c.game_id
       LEFT JOIN game_comments p ON p.id = c.parent_id
      WHERE c.deleted_at IS NULL AND c.author_email != ?1 AND g.deleted_at IS NULL
        AND (g.owner_email = ?1
             OR (c.parent_id IS NOT NULL AND c.parent_id IN (
                   SELECT COALESCE(m.parent_id, m.id) FROM game_comments m WHERE m.author_email = ?1 AND m.game_id = c.game_id)))
      ORDER BY c.created_at DESC LIMIT ?2`,
  ).bind(me, NOTICE_LIMIT).all<CommentRow>()).results ?? [];

  // Someone else's game: only while the caller can still open it (changes) or read its comments.
  const canSeeGame = new Map<string, boolean>();
  const canReadComments = new Map<string, boolean>();
  const items: NoticeItem[] = [];

  for (const r of changeRows) {
    if (!r.my_game && !r.mine) {
      if (!canSeeGame.has(r.game_id)) canSeeGame.set(r.game_id, !!(await gameAccess(env.DB, data, r.game_id)));
      if (!canSeeGame.get(r.game_id)) continue;
    }
    items.push({
      kind: 'change', key: `change:${r.id}`, changeId: r.id, targetId: r.k_id, gameId: r.game_id,
      game: r.game_title, title: r.title, who: r.k_name,
      event: r.k_kind === 'comment' ? 'comment' : r.k_body, extra: r.k_extra ?? null,
      snippet: r.k_kind === 'comment' ? snippetOf(r.k_body) : '',
      waiting: !!r.my_game && r.status === 'open', at: r.k_at,
    });
  }
  for (const r of commentRows) {
    if (!r.my_game) {
      if (!canReadComments.has(r.game_id)) canReadComments.set(r.game_id, !!(await feedbackState(env.DB, data, r.game_id))?.canRead);
      if (!canReadComments.get(r.game_id)) continue;
    }
    items.push({
      kind: 'comment', key: `comment:${r.id}`, commentId: r.id, gameId: r.game_id, game: r.game_title,
      who: r.author_name, reply: r.parent_id != null, toMe: !!r.to_me, myGame: !!r.my_game,
      snippet: snippetOf(r.body), at: r.created_at,
    });
  }

  items.sort((a, b) => b.at - a.at);
  return json({ items: items.slice(0, NOTICE_LIMIT) });
};
