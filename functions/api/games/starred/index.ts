// GET /api/games/starred — the games the caller starred (migration 0052), newest star first
//
// GitHub's "Stars" list in plain words: the Library's Games tab shows it as
// "Starred". Only games the caller may still open are listed (their own, or
// shared into a class they are in now and not hidden from them: visibleGame()'s
// rule, for the whole list at once); a star on a game since deleted, unshared or
// hidden simply does not show, and comes back if the game does. No code, no emails.

import { callerClasses, json, type SessionData } from '../../../_shared/games';
import { ownerLabel } from '../../../_shared/libraryShare';
import { starsFor } from '../../../_shared/gameStars';
import { modeLabel, type GameMode } from '../../../../lib/games-core';
import { PROVENANCE_COLUMNS, choiceOf, provenanceFromRow, type ProvenanceRow } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

interface Row extends ProvenanceRow {
  id: string;
  title: string;
  mode: string;
  players: number;
  owner_email: string;
  first_name: string | null;
  last_name: string | null;
  updated_at: number;
  share_choice: string | null;
  starred_at: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const rows = (await env.DB.prepare(
    `SELECT g.id, g.title, g.mode, g.players, g.owner_email, st.first_name, st.last_name, g.updated_at, g.share_choice,
            ${PROVENANCE_COLUMNS.split(', ').map((c) => 'g.' + c).join(', ')}, s.created_at AS starred_at
       FROM game_stars s
       JOIN library_games g ON g.id = s.game_id AND g.deleted_at IS NULL
       LEFT JOIN students st ON st.email = g.owner_email
      WHERE s.from_email = ? ORDER BY s.created_at DESC LIMIT 200`,
  ).bind(data.email).all<Row>()).results ?? [];

  const { all, teaches } = await callerClasses(env.DB, data);
  const open = new Set(rows.filter((r) => r.owner_email === data.email).map((r) => r.id));
  const others = rows.filter((r) => !open.has(r.id)).map((r) => r.id);
  if (all.length && others.length) {
    for (let i = 0; i < others.length; i += 60) {
      const chunk = others.slice(i, i + 60);
      const shares = (await env.DB.prepare(
        `SELECT game_id, class_id, hidden_at FROM library_game_shares
          WHERE game_id IN (${chunk.map(() => '?').join(',')}) AND class_id IN (${all.map(() => '?').join(',')})`,
      ).bind(...chunk, ...all).all<{ game_id: string; class_id: string; hidden_at: number | null }>()).results ?? [];
      for (const s of shares) {
        if (s.hidden_at == null || teaches.has(s.class_id) || data.role === 'admin') open.add(s.game_id);
      }
    }
  }
  const listed = rows.filter((r) => open.has(r.id));
  const { counts } = await starsFor(env.DB, listed.map((r) => r.id), data.email);
  return json({
    games: listed.map((r) => ({
      id: r.id, title: r.title, mode: r.mode, players: r.players,
      modeLabel: modeLabel(r.mode as GameMode, r.players),
      owner: ownerLabel(r.first_name, r.last_name), mine: r.owner_email === data.email,
      updatedAt: r.updated_at, starredAt: r.starred_at,
      choice: choiceOf(r.share_choice), remixedFrom: provenanceFromRow(r),
      stars: counts.get(r.id) ?? 0, starred: true,
    })),
  });
};
