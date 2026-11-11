// GET /api/game-changes  — the caller's proposed-change conversations, for the Library's Games tab:
//   received  proposals on the caller's own games (open first)
//   sent      proposals the caller made
//   joined    conversations the caller commented in that are neither
// Each row: id, title, the game's title, who proposed it, status, comment count, last activity. The
// browser compares `updatedAt` with what it last opened to show "new". No code and no email in here.

import { json, type SessionData } from '../../_shared/games';
import { CHANGE_COLUMNS, gameAccess, statusFor, type ChangeRow } from '../../_shared/gameFlow';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

type Row = ChangeRow & { game_title: string | null; game_live: number | null; comments: number };

const SELECT = `SELECT ${CHANGE_COLUMNS.split(', ').map((c) => 'c.' + c).join(', ')},
       g.title AS game_title, (g.deleted_at IS NULL) AS game_live,
       (SELECT COUNT(*) FROM game_change_comments k WHERE k.change_id = c.id AND k.kind = 'comment' AND k.deleted_at IS NULL) AS comments
  FROM game_changes c LEFT JOIN library_games g ON g.id = c.game_id`;

function shape(r: Row, viewer: string) {
  return {
    id: r.id, title: r.title, gameId: r.game_id, gameTitle: r.game_title ?? 'A deleted game',
    from: r.from_name, mine: r.from_email === viewer,
    status: statusFor(r, r.game_live ? {} : null), locked: r.locked_at != null,
    comments: r.comments, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const received = (await env.DB.prepare(
    `${SELECT} WHERE g.owner_email = ? AND g.deleted_at IS NULL AND c.status != 'removed'
      ORDER BY (c.status = 'open') DESC, c.updated_at DESC LIMIT 40`,
  ).bind(data.email).all<Row>()).results ?? [];
  const sent = (await env.DB.prepare(
    `${SELECT} WHERE c.from_email = ? ORDER BY (c.status = 'open') DESC, c.updated_at DESC LIMIT 40`,
  ).bind(data.email).all<Row>()).results ?? [];
  const joinedRows = (await env.DB.prepare(
    `${SELECT} WHERE c.from_email != ? AND (g.owner_email IS NULL OR g.owner_email != ?) AND c.status != 'removed'
        AND EXISTS (SELECT 1 FROM game_change_comments k WHERE k.change_id = c.id AND k.author_email = ? AND k.kind = 'comment')
      ORDER BY c.updated_at DESC LIMIT 30`,
  ).bind(data.email, data.email, data.email).all<Row>()).results ?? [];
  // Joined only while the caller can still see the game (a class ended, a game hidden or made "just play").
  const can = new Map<string, boolean>();
  const joined: Row[] = [];
  for (const r of joinedRows) {
    if (!can.has(r.game_id)) can.set(r.game_id, !!(await gameAccess(env.DB, data, r.game_id)));
    if (can.get(r.game_id)) joined.push(r);
  }
  return json({
    received: received.map((r) => shape(r, data.email)),
    sent: sent.map((r) => shape(r, data.email)),
    joined: joined.map((r) => shape(r, data.email)),
  });
};
