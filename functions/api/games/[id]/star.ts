// GET  /api/games/[id]/star          — { count, starred, canStar, by }
// POST /api/games/[id]/star { on }   — star or unstar the game
//
// Migration 0052. GitHub's starring in plain words: one star per person, a
// toggle, and the game shows in that person's Starred list (GET /api/games/starred).
// Access is visibleGame()'s: whoever may open the game sees its stars and may
// star it (the maker too, as on GitHub); anyone else gets 404. Nobody stars a
// hidden game. `by` is who starred it, newest first, as first name + last
// initial (classmates already see each other's names on comments), never an email.

import { json, visibleGame, type SessionData } from '../../../_shared/games';
import { ownerLabel } from '../../../_shared/libraryShare';
import { isGameId } from '../../../../lib/games-core';
import type { StarView } from '../../../../lib/game-stars';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

/** At most this many names come back; the count is always the whole number. */
const NAMES_MAX = 50;

async function view(env: Env, data: SessionData, gameId: string, hidden: boolean): Promise<StarView> {
  const rows = (await env.DB.prepare(
    `SELECT s.from_email, st.first_name, st.last_name FROM game_stars s
       LEFT JOIN students st ON st.email = s.from_email
      WHERE s.game_id = ? ORDER BY s.created_at DESC`,
  ).bind(gameId).all<{ from_email: string; first_name: string | null; last_name: string | null }>()).results ?? [];
  return {
    count: rows.length,
    starred: rows.some((r) => r.from_email === data.email),
    canStar: !hidden,
    by: rows.slice(0, NAMES_MAX).map((r) => (r.from_email === data.email ? 'You' : ownerLabel(r.first_name, r.last_name))),
  };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, gameId);
  if (!seen) return json({ error: 'Not found' }, 404);
  return json(await view(env, data, gameId, seen.hidden));
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, gameId);
  if (!seen) return json({ error: 'Not found' }, 404);
  if (seen.hidden) return json({ error: 'This game is hidden from the class.' }, 403);
  let body: { on?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (typeof body.on !== 'boolean') return json({ error: 'on must be true or false' }, 400);
  if (body.on) {
    await env.DB.prepare(`INSERT OR IGNORE INTO game_stars (game_id, from_email, created_at) VALUES (?, ?, ?)`)
      .bind(gameId, data.email, Date.now()).run();
  } else {
    await env.DB.prepare(`DELETE FROM game_stars WHERE game_id = ? AND from_email = ?`).bind(gameId, data.email).run();
  }
  return json(await view(env, data, gameId, false));
};
