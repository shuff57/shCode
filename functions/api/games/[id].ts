// GET    /api/games/[id]  — one game with its code, to play or remix
// DELETE /api/games/[id]  — delete one of your own games (a tombstone)
//
// GET answers the owner, or a classmate in a class the game is shared into and
// not hidden; a teacher of that class also gets a hidden one, marked. Anything
// else is 404, the same as an id that does not exist. The publisher shows as
// first name + last initial, never an email. DELETE is owner only, keeps the
// row with deleted_at set, and takes the game out of every class at once.
//
// The code is returned to everyone who may play, even for a "just play" game
// (it has to run in their browser). `canRemix` is false for a "just play" game
// that is not the caller's, and the UI then hides View code and Remix; the
// server refuses to publish a remix of it (POST /api/games).
//
// Versions and proposed changes (migration 0048): GET also carries `version`, `contributors` (the
// classmates whose proposed changes were accepted, first name + last initial) and `openChanges`.
// DELETE closes the game's open proposals.

import { json, ownerName, visibleGame, type SessionData } from '../../_shared/games';
import { isGameId, modeLabel, type GameMode } from '../../../lib/games-core';
import { canRemix, choiceOf, provenanceFromRow } from '../../../lib/share-choice';
import { closeChangesStmts, contributorsOf, openChangeCounts } from '../../_shared/gameFlow';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, id);
  if (!seen) return json({ error: 'Not found' }, 404);
  const { row } = seen;
  let shared = false;
  if (seen.mine) {
    shared = !!(await env.DB.prepare(`SELECT 1 AS x FROM library_game_shares WHERE game_id = ? LIMIT 1`).bind(id).first());
  }
  const vrow = await env.DB.prepare(`SELECT version, feedback_on FROM library_games WHERE id = ?`).bind(id).first<{ version: number; feedback_on: number | null }>();
  const contributors = await contributorsOf(env.DB, id);
  const openChanges = (await openChangeCounts(env.DB, [id])).get(id) ?? 0;
  return json({
    game: {
      version: vrow?.version ?? 1, contributors, openChanges,
      id: row.id, title: row.title, code: row.code, mode: row.mode, players: row.players,
      modeLabel: modeLabel(row.mode as GameMode, row.players),
      owner: await ownerName(env.DB, row.owner_email), mine: seen.mine, hidden: seen.hidden,
      ...(seen.mine ? { shared } : {}),
      // The creator's "Let classmates give feedback" switch (migration 0051).
      feedbackOn: (vrow?.feedback_on ?? 1) !== 0,
      choice: choiceOf(row.share_choice),
      canRemix: seen.mine || canRemix(row.share_choice),
      remixedFrom: provenanceFromRow(row),
      createdAt: row.created_at, updatedAt: row.updated_at,
    },
  });
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(
    `SELECT id FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<{ id: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE library_games SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_email = ?`)
      .bind(now, now, id, data.email),
    // A class must not keep a game its publisher deleted.
    env.DB.prepare(`DELETE FROM library_game_shares WHERE game_id = ?`).bind(id),
    ...closeChangesStmts(env.DB, 'g.id = ?', [id], now),
  ]);
  return json({ ok: true, id, deletedAt: now });
};
