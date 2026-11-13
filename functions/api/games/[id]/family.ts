// GET /api/games/[id]/family — the game's family tree (lib/game-family.ts FamilyView)
//
// Who remixed what, when, and from which version, back to the original (a
// classmate's game or a built-in course game), plus every accepted change a
// remix sent back. Access is visibleGame()'s: whoever may open the game reads
// its tree, anyone else gets 404. What the reader sees of OTHER games in the
// family follows the same rule game by game (assembleFamily's privacy rule): a
// game they cannot open is a plain box, named only by a visible remix's credit.
// No email ever leaves here; makers show as first name + last initial.

import { callerClasses, json, visibleGame, type SessionData } from '../../../_shared/games';
import { ownerLabel } from '../../../_shared/libraryShare';
import { isGameId } from '../../../../lib/games-core';
import { BUILTIN_GAMES, builtinRef, isBuiltinRef } from '../../../../lib/builtin-games';
import { assembleFamily, type FamilyMergeRow, type FamilyRow } from '../../../../lib/game-family';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

/** At most this many games in one family are read; a bigger one is cut, oldest kept. */
const FAMILY_MAX = 400;

interface MemberRow {
  id: string;
  owner_email: string;
  title: string;
  created_at: number;
  deleted_at: number | null;
  remixed_from_id: string | null;
  remixed_from_title: string | null;
  remixed_from_author: string | null;
  remixed_from_version: number | null;
  origin_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, gameId);
  if (!seen) return json({ error: 'Not found' }, 404);
  const root = seen.row.origin_id || seen.row.remixed_from_id || gameId;

  const members = (await env.DB.prepare(
    `SELECT g.id, g.owner_email, g.title, g.created_at, g.deleted_at, g.remixed_from_id, g.remixed_from_title,
            g.remixed_from_author, g.remixed_from_version, g.origin_id, st.first_name, st.last_name
       FROM library_games g LEFT JOIN students st ON st.email = g.owner_email
      WHERE g.id = ? OR g.remixed_from_id = ? OR g.origin_id = ?
      ORDER BY g.created_at LIMIT ${FAMILY_MAX}`,
  ).bind(root, root, root).all<MemberRow>()).results ?? [];
  // The current game is always in its own tree, even in a family cut at FAMILY_MAX.
  if (!members.some((m) => m.id === gameId)) {
    const self = await env.DB.prepare(
      `SELECT g.id, g.owner_email, g.title, g.created_at, g.deleted_at, g.remixed_from_id, g.remixed_from_title,
              g.remixed_from_author, g.remixed_from_version, g.origin_id, st.first_name, st.last_name
         FROM library_games g LEFT JOIN students st ON st.email = g.owner_email WHERE g.id = ?`,
    ).bind(gameId).first<MemberRow>();
    if (self) members.push(self);
  }

  // Which members this reader may open: visibleGame()'s rule, for the whole family at once.
  const { all, teaches } = await callerClasses(env.DB, data);
  const open = new Set<string>();
  const others = members.filter((m) => m.owner_email !== data.email && m.deleted_at == null).map((m) => m.id);
  if (all.length && others.length) {
    for (let i = 0; i < others.length; i += 60) {
      const chunk = others.slice(i, i + 60);
      const rows = (await env.DB.prepare(
        `SELECT game_id, class_id, hidden_at FROM library_game_shares
          WHERE game_id IN (${chunk.map(() => '?').join(',')}) AND class_id IN (${all.map(() => '?').join(',')})`,
      ).bind(...chunk, ...all).all<{ game_id: string; class_id: string; hidden_at: number | null }>()).results ?? [];
      for (const s of rows) {
        if (s.hidden_at == null || teaches.has(s.class_id) || data.role === 'admin') open.add(s.game_id);
      }
    }
  }

  const rows: FamilyRow[] = members.map((m) => ({
    id: m.id,
    title: m.title,
    author: ownerLabel(m.first_name, m.last_name),
    createdAt: m.created_at,
    parent: m.id === root ? null : m.remixed_from_id,
    fromVersion: m.remixed_from_version ?? null,
    parentTitle: m.remixed_from_title,
    parentAuthor: m.remixed_from_author,
    visible: m.deleted_at == null && (m.owner_email === data.email || open.has(m.id)),
    mine: m.owner_email === data.email,
    deleted: m.deleted_at != null,
    builtin: false,
  }));
  if (isBuiltinRef(root)) {
    const b = BUILTIN_GAMES.find((g) => builtinRef(g.id) === root);
    rows.unshift({
      id: root, title: b?.title ?? 'A course game', author: b?.author ?? 'shCode', createdAt: null, parent: null,
      fromVersion: null, parentTitle: null, parentAuthor: null, visible: true, mine: false, deleted: false, builtin: true,
    });
  }

  // Accepted changes: the remix a change came from is the proposer's game in this
  // family that was remixed from the game which accepted it.
  const visibleIds = rows.filter((r) => r.visible && !r.builtin).map((r) => r.id);
  const merges: FamilyMergeRow[] = [];
  if (visibleIds.length) {
    const byOwnerParent = new Map<string, string>();
    for (const m of members) if (m.remixed_from_id) byOwnerParent.set(`${m.owner_email}\n${m.remixed_from_id}`, m.id);
    for (let i = 0; i < visibleIds.length; i += 90) {
      const chunk = visibleIds.slice(i, i + 90);
      const ch = (await env.DB.prepare(
        `SELECT game_id, from_email, from_name, accepted_version, decided_at FROM game_changes
          WHERE status = 'accepted' AND game_id IN (${chunk.map(() => '?').join(',')}) ORDER BY decided_at`,
      ).bind(...chunk).all<{ game_id: string; from_email: string; from_name: string; accepted_version: number | null; decided_at: number | null }>()).results ?? [];
      for (const c of ch) {
        const from = byOwnerParent.get(`${c.from_email}\n${c.game_id}`);
        if (from) merges.push({ from, to: c.game_id, version: c.accepted_version, at: c.decided_at, by: c.from_name });
      }
    }
  }

  return json(assembleFamily(rows, merges, gameId));
};
