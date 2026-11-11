// GET  /api/games/[id]/suggestions  — the game's suggestions (lib/game-suggestions.ts SuggestionsView)
// POST /api/games/[id]/suggestions  { suggestion, on }  — pick or unpick one
//
// #96. Classmates help the author by picking from a FIXED list; nothing typed
// is stored (games carry game data, not chat). Access is visibleGame()'s rule:
// whoever may open the game may read its suggestions, anyone else gets 404.
// The author reads them and cannot suggest on their own game; nobody suggests
// on a hidden game. Counts are for everyone; names (first name + last initial,
// never an email) only for the author, the teachers of a class the game is
// shared into, and an admin.
//
// Feedback switches (migration 0051): suggestions are feedback, so they follow
// feedbackState() exactly as comments do. Closed, a classmate gets no counts and
// cannot pick (403); the author and the class's teachers still read.

import { callerClasses, gameClassesFor, json, visibleGame, type SessionData } from '../../../_shared/games';
import { feedbackState } from '../../../_shared/gameComments';
import { ownerLabel } from '../../../_shared/libraryShare';
import { isGameId } from '../../../../lib/games-core';
import { SUGGESTIONS, isSuggestionId, type SuggestionsView } from '../../../../lib/game-suggestions';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

async function view(env: Env, data: SessionData, gameId: string, mine: boolean, hidden: boolean): Promise<SuggestionsView> {
  const rows = (await env.DB.prepare(
    `SELECT gs.suggestion_id, gs.from_email, st.first_name, st.last_name
       FROM game_suggestions gs LEFT JOIN students st ON st.email = gs.from_email
      WHERE gs.game_id = ? ORDER BY gs.created_at`,
  ).bind(gameId).all<{ suggestion_id: string; from_email: string; first_name: string | null; last_name: string | null }>()).results ?? [];

  let seesNames = mine || data.role === 'admin';
  if (!seesNames && data.role !== 'student') {
    const [{ teaches }, through] = await Promise.all([callerClasses(env.DB, data), gameClassesFor(env.DB, data, gameId)]);
    seesNames = through.some((c) => teaches.has(c));
  }

  const counts: Record<string, number> = {};
  const who: Record<string, string[]> = {};
  const picked: string[] = [];
  for (const r of rows) {
    if (!isSuggestionId(r.suggestion_id)) continue; // an id since retired
    counts[r.suggestion_id] = (counts[r.suggestion_id] ?? 0) + 1;
    if (r.from_email === data.email) picked.push(r.suggestion_id);
    if (seesNames) (who[r.suggestion_id] ??= []).push(ownerLabel(r.first_name, r.last_name));
  }
  return { options: SUGGESTIONS, counts, mine: picked, ...(seesNames ? { who } : {}), canSuggest: !mine && !hidden };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, gameId);
  if (!seen) return json({ error: 'Not found' }, 404);
  const st = await feedbackState(env.DB, data, gameId);
  if (st && !st.canRead) {
    const closed: SuggestionsView = { options: SUGGESTIONS, counts: {}, mine: [], canSuggest: false, closed: st.closed };
    return json(closed);
  }
  const v = await view(env, data, gameId, seen.mine, seen.hidden);
  return json({ ...v, canSuggest: v.canSuggest && !!st?.canWrite, closed: st?.closed ?? null });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, gameId);
  if (!seen) return json({ error: 'Not found' }, 404);
  if (seen.mine) return json({ error: 'This is your game. Your classmates suggest; you read them here.' }, 403);
  if (seen.hidden) return json({ error: 'This game is hidden from the class.' }, 403);
  const st = await feedbackState(env.DB, data, gameId);
  if (!st?.canWrite) return json({ error: 'Feedback is turned off for this game.', closed: st?.closed ?? null }, 403);
  let body: { suggestion?: unknown; on?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!isSuggestionId(body.suggestion)) return json({ error: 'Pick a suggestion from the list.' }, 400);
  if (typeof body.on !== 'boolean') return json({ error: 'on must be true or false' }, 400);
  if (body.on) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO game_suggestions (game_id, from_email, suggestion_id, created_at) VALUES (?, ?, ?, ?)`,
    ).bind(gameId, data.email, body.suggestion, Date.now()).run();
  } else {
    await env.DB.prepare(`DELETE FROM game_suggestions WHERE game_id = ? AND from_email = ? AND suggestion_id = ?`)
      .bind(gameId, data.email, body.suggestion).run();
  }
  return json({ ...(await view(env, data, gameId, false, false)), closed: null });
};
