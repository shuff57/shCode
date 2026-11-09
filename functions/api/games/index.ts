// GET  /api/games  — the caller's own published games (no code, newest first)
// POST /api/games  { id?, title, code, choice?, remixedFrom? }  — publish a game, or update one of yours
//
// Publishing stores a moSHion sketch so classmates can play and remix it once
// it is shared (POST /api/games/[id]/share). With an `id`, it updates that game
// if the caller owns it; someone else's id and an id that does not exist both
// answer 404, so ids cannot be probed. `mode` and `players` are read from the
// code (multiplayer('versus', 2)), never taken from the body. The code only
// ever runs inside the sandboxed moSHion iframe on /play. See
// functions/_shared/games.ts for who sees what.
//
// `choice` is who may do what with it (lib/share-choice.ts: 'play' | 'credit' |
// 'open' | 'free'); left out, a new game is 'credit' and an update keeps its
// choice. `remixedFrom` is the id of the game this one was remixed from (the
// sandbox remembers it, lib/games-client.ts). It is read only when a NEW game
// is made: the server takes the original's title, author (first name + last
// initial) and choice from the original's own row, refuses a remix of a "just
// play" game (403), and holds a remix of a "keep remixes open" game to 'open'
// (any other choice is 400, now and on every later update).

import { json, type SessionData } from '../../_shared/games';
import { GAME_CODE_MAX, GAME_MAX_PER_OWNER, checkCode, cleanTitle, declaredMode, isGameId } from '../../../lib/games-core';
import { newUploadId } from '../../_shared/uploads';
import { originalGame } from '../../_shared/shareChoice';
import {
  PROVENANCE_COLUMNS,
  canRemix,
  choiceOf,
  decideChoice,
  provenanceFromRow,
  provenanceToRow,
  remixRefusal,
  type Provenance,
  type ProvenanceRow,
} from '../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

// The code plus the title and JSON quoting. A body this large is refused unread.
const MAX_BODY = GAME_CODE_MAX * 2 + 4096;

interface MineRow extends ProvenanceRow {
  id: string;
  title: string;
  mode: string;
  players: number;
  bytes: number;
  created_at: number;
  updated_at: number;
  shared: number;
  share_choice: string | null;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const r = await env.DB.prepare(
    `SELECT id, title, mode, players, LENGTH(code) AS bytes, created_at, updated_at, share_choice, ${PROVENANCE_COLUMNS},
            EXISTS (SELECT 1 FROM library_game_shares s WHERE s.game_id = library_games.id) AS shared
       FROM library_games WHERE owner_email = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC`,
  ).bind(data.email).all<MineRow>();
  return json({
    games: (r.results ?? []).map((g) => ({
      id: g.id, title: g.title, mode: g.mode, players: g.players, bytes: g.bytes,
      createdAt: g.created_at, updatedAt: g.updated_at, shared: !!g.shared,
      choice: choiceOf(g.share_choice), remixedFrom: provenanceFromRow(g),
    })),
    limits: { maxBytes: GAME_CODE_MAX, maxGames: GAME_MAX_PER_OWNER },
  });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ request, env, data }: Ctx) => {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) {
    return json({ error: `That is too large to publish; the most a game can be is ${GAME_CODE_MAX / 1024} KB of code.` }, 413);
  }
  let body: { id?: unknown; title?: unknown; code?: unknown; choice?: unknown; remixedFrom?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const t = cleanTitle(body.title);
  if ('error' in t) return json({ error: t.error }, 400);
  const c = checkCode(body.code);
  if ('error' in c) return json({ error: c.error }, c.tooLarge ? 413 : 400);
  const { mode, players } = declaredMode(c.code);
  const now = Date.now();

  if (body.id !== undefined && body.id !== null) {
    if (!isGameId(body.id)) return json({ error: 'Not found' }, 404);
    const existing = await env.DB.prepare(
      `SELECT share_choice, ${PROVENANCE_COLUMNS} FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
    ).bind(body.id, data.email).first<ProvenanceRow & { share_choice: string | null }>();
    if (!existing) return json({ error: 'Not found' }, 404);
    // Where it came from was fixed when it was first published; an update never moves it.
    const remixedFrom = provenanceFromRow(existing);
    const ch = decideChoice(body.choice ?? choiceOf(existing.share_choice), remixedFrom);
    if ('error' in ch) return json(ch, 400);
    const res = await env.DB.prepare(
      `UPDATE library_games SET title = ?, code = ?, mode = ?, players = ?, share_choice = ?, updated_at = ?
        WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
    ).bind(t.title, c.code, mode, players, ch.choice, now, body.id, data.email).run();
    if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);
    return json({ ok: true, created: false, game: { id: body.id, title: t.title, mode, players, updatedAt: now, choice: ch.choice, remixedFrom } });
  }

  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM library_games WHERE owner_email = ? AND deleted_at IS NULL`,
  ).bind(data.email).first<{ n: number }>();
  if ((count?.n ?? 0) >= GAME_MAX_PER_OWNER) {
    return json({ error: `You have ${GAME_MAX_PER_OWNER} published games, the most you can have. Delete one in the Library to publish another.` }, 409);
  }
  let remixedFrom: Provenance | null = null;
  if (isGameId(body.remixedFrom)) {
    const original = await originalGame(env.DB, body.remixedFrom, data.email);
    if (original) {
      if (!canRemix(original.choice)) {
        return json({ error: remixRefusal('game', original.provenance.title, original.provenance.author), justPlay: true }, 403);
      }
      remixedFrom = original.provenance;
    }
  }
  const ch = decideChoice(body.choice, remixedFrom);
  if ('error' in ch) return json(ch, 400);
  const p = provenanceToRow(remixedFrom);
  const id = newUploadId();
  await env.DB.prepare(
    `INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at, share_choice, ${PROVENANCE_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, data.email, t.title, c.code, mode, players, now, now, ch.choice,
    p.remixed_from_id, p.remixed_from_title, p.remixed_from_author, p.remixed_from_choice,
    p.origin_id, p.origin_title, p.origin_author).run();
  return json({ ok: true, created: true, game: { id, title: t.title, mode, players, updatedAt: now, choice: ch.choice, remixedFrom } }, 201);
};
