// GET  /api/game-changes/[cid]  — one proposed change: its code, the code it started from, the game now,
//                                 what Accept would save, the conversation, and what the caller may do
// POST /api/game-changes/[cid]  { action, ... }
//        comment        { body }                 anyone who can see it, while open and not locked (teachers always)
//        delete-comment { commentId }            the comment's author, or a teacher
//        accept         { expectVersion }        the maker; merges (lib/game-merge.ts) and saves a new version
//        decline        { reply? }               the maker ("No thanks"), with an optional last comment
//        withdraw                                the proposer ("Take it back")
//        reopen                                  the proposer (taken back) or the maker (said no to)
//        lock | unlock                           the maker or a teacher: close or open the conversation
//        remove                                  a teacher: take the proposal out of students' view
//
// Who sees it and as whom is changeAccess's rule (functions/_shared/gameFlow.ts); the actions follow
// changeCan (lib/game-flow-core.ts), which the page also uses, so the buttons shown are the ones allowed.
// Comments are free text (owner decision 2026-11-10), shown as plain text, and every one is readable by
// the class's teachers. No answer ever carries an email.
//
// Accept saves exactly what GET showed as `after`: the client sends the game version it looked at, and a
// game that moved on since answers 409 ("look again"), so a merge nobody saw is never stored.

import { json, type SessionData } from '../../_shared/games';
import {
  changeAccess, commentStmt, eventStmt, gameAccess, nameOf, saveVersionStmts, savedAs, statusFor,
} from '../../_shared/gameFlow';
import { declaredMode, utf8Bytes, GAME_CODE_MAX } from '../../../lib/games-core';
import {
  COMMENTS_PER_CHANGE, COMMENTS_PER_HOUR, OPEN_CHANGES_PER_GAME, canDeleteComment, changeCan, cleanComment,
  conflictText, isChangeEvent, isChangeId,
} from '../../../lib/game-flow-core';
import { changeSize, mergeChange } from '../../../lib/game-merge';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'cid', SessionData>;

interface CommentRow {
  id: string;
  kind: 'comment' | 'event';
  author_email: string;
  author_name: string;
  body: string;
  extra: number | null;
  created_at: number;
  deleted_at: number | null;
  deleted_by: string | null;
}

export const onRequestGet: PagesFunction<Env, 'cid', SessionData> = async ({ params, env, data }: Ctx) => {
  const cid = String(params.cid);
  if (!isChangeId(cid)) return json({ error: 'Not found' }, 404);
  const a = await changeAccess(env.DB, data, cid);
  if (!a) return json({ error: 'Not found' }, 404);
  const { change, game, role } = a;
  const status = statusFor(change, game);
  const locked = change.locked_at != null;
  // The proposer who can no longer see the game (left the class, or it became "just play") still sees
  // their own proposal, but not the game's code as it is now.
  const seesGame = !!game && (role.maker || role.teacher || !!(await gameAccess(env.DB, data, game.id)));

  const rows = (await env.DB.prepare(
    `SELECT id, kind, author_email, author_name, body, extra, created_at, deleted_at, deleted_by
       FROM game_change_comments WHERE change_id = ? ORDER BY created_at, rowid`,
  ).bind(cid).all<CommentRow>()).results ?? [];
  const emails = [...new Set(rows.map((r) => r.author_email).filter(Boolean))];
  const roles = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 90) {
    const part = emails.slice(i, i + 90);
    const r = await env.DB.prepare(`SELECT email, role FROM students WHERE email IN (${part.map(() => '?').join(',')})`)
      .bind(...part).all<{ email: string; role: string }>();
    for (const x of r.results ?? []) roles.set(x.email, x.role);
  }
  const makerEmail = game?.owner_email ?? null;
  const conversation = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    author: r.author_name,
    // Who they are in this conversation, for the small badge beside the name.
    badge: !r.author_email ? null
      : r.author_email === makerEmail ? 'maker'
      : r.author_email === change.from_email ? 'proposer'
      : roles.get(r.author_email) === 'teacher' || roles.get(r.author_email) === 'admin' ? 'teacher' : null,
    body: r.deleted_at ? '' : r.body,
    extra: r.extra,
    createdAt: r.created_at,
    deleted: r.deleted_at ? (r.deleted_by === 'teacher' ? 'teacher' : 'author') : null,
    canDelete: r.kind === 'comment' && !r.deleted_at && canDeleteComment(r.author_email === data.email, role.teacher),
  })).filter((r) => r.kind === 'comment' || isChangeEvent(r.body));

  let after: { ok: true; code: string } | { ok: false; lines: number[]; text: string } | null = null;
  if (status === 'open' && game && seesGame) {
    const m = mergeChange(change.base_code, change.code, game.code);
    after = m.ok ? { ok: true, code: m.text }
      : { ok: false, lines: m.lines, text: conflictText(game.title, await nameOf(env.DB, game.owner_email), role.maker ? 'maker' : 'proposer', m.lines) };
  }

  return json({
    change: {
      id: change.id, title: change.title, from: change.from_name, status, locked,
      baseVersion: change.base_version, baseCode: change.base_code, code: change.code,
      createdAt: change.created_at, updatedAt: change.updated_at, decidedAt: change.decided_at,
      acceptedVersion: change.accepted_version, size: changeSize(change.base_code, change.code),
    },
    game: game ? {
      id: game.id, title: game.title, maker: await nameOf(env.DB, game.owner_email), version: game.version,
      ...(seesGame ? { code: game.code } : {}),
    } : null,
    after,
    conversation,
    role,
    can: changeCan(role, status, locked),
  });
};

export const onRequestPost: PagesFunction<Env, 'cid', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const cid = String(params.cid);
  if (!isChangeId(cid)) return json({ error: 'Not found' }, 404);
  const a = await changeAccess(env.DB, data, cid);
  if (!a) return json({ error: 'Not found' }, 404);
  const { change, game, role } = a;
  let body: { action?: unknown; body?: unknown; commentId?: unknown; reply?: unknown; expectVersion?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const status = statusFor(change, game);
  const locked = change.locked_at != null;
  const can = changeCan(role, status, locked);
  const now = Date.now();
  const me = await nameOf(env.DB, data.email);
  const no = (why: string) => json({ error: why }, 403);

  switch (body.action) {
    case 'comment': {
      if (!can.comment) return no(locked ? 'This conversation is closed to new comments.' : 'This change was removed or its game was deleted, so the conversation is closed.');
      const c = cleanComment(body.body);
      if ('error' in c) return json({ error: c.error }, 400);
      const inChange = await env.DB.prepare(`SELECT COUNT(*) AS n FROM game_change_comments WHERE change_id = ? AND kind = 'comment'`)
        .bind(cid).first<{ n: number }>();
      if ((inChange?.n ?? 0) >= COMMENTS_PER_CHANGE) return json({ error: 'This conversation is full. Start a new one with a new proposal.' }, 429);
      if (!role.teacher) {
        const lastHour = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM game_change_comments WHERE author_email = ? AND kind = 'comment' AND created_at > ?`,
        ).bind(data.email, now - 3600 * 1000).first<{ n: number }>();
        if ((lastHour?.n ?? 0) >= COMMENTS_PER_HOUR) return json({ error: `You have posted ${COMMENTS_PER_HOUR} comments in the last hour, the most for one hour. Take a break and come back.` }, 429);
      }
      await env.DB.batch([
        commentStmt(env.DB, cid, data.email, me, c.body, now),
        env.DB.prepare(`UPDATE game_changes SET updated_at = ? WHERE id = ?`).bind(now, cid),
      ]);
      return json({ ok: true });
    }

    case 'delete-comment': {
      const id = String(body.commentId ?? '');
      const row = await env.DB.prepare(
        `SELECT author_email FROM game_change_comments WHERE id = ? AND change_id = ? AND kind = 'comment' AND deleted_at IS NULL`,
      ).bind(id, cid).first<{ author_email: string }>();
      if (!row) return json({ error: 'Not found' }, 404);
      const isAuthor = row.author_email === data.email;
      if (!canDeleteComment(isAuthor, role.teacher)) return no('Only the person who wrote a comment, or a teacher, can delete it.');
      await env.DB.prepare(`UPDATE game_change_comments SET deleted_at = ?, deleted_by = ?, body = '' WHERE id = ?`)
        .bind(now, isAuthor ? 'author' : 'teacher', id).run();
      return json({ ok: true });
    }

    case 'accept': {
      if (!can.accept || !game) return no('Only the person who made the game can accept a change, while it is open.');
      if (Number(body.expectVersion) !== game.version) {
        return json({ error: `"${game.title}" changed while you were looking at this. Look at the changes again, then accept.`, moved: true }, 409);
      }
      const m = mergeChange(change.base_code, change.code, game.code);
      if (!m.ok) return json({ error: conflictText(game.title, me, 'maker', m.lines), conflict: true, lines: m.lines }, 409);
      if (utf8Bytes(m.text) > GAME_CODE_MAX) return json({ error: `Together that is more than ${GAME_CODE_MAX / 1024} KB of code, the most a game can be.` }, 413);
      const { mode, players } = declaredMode(m.text);
      const next = game.version + 1;
      const message = `${change.from_name}'s change: ${change.title}`.slice(0, 120);
      const landed = `EXISTS (SELECT 1 FROM library_game_versions WHERE game_id = ? AND version = ? AND change_id = ?)`;
      try {
        await env.DB.batch([
          ...saveVersionStmts(env.DB, {
            gameId: game.id, expectVersion: game.version, code: m.text, mode, players, message,
            authorEmail: change.from_email, authorName: change.from_name, ownerName: me, changeId: cid, now,
          }),
          env.DB.prepare(
            `UPDATE game_changes SET status = 'accepted', decided_at = ?, updated_at = ?, accepted_version = ?
              WHERE id = ? AND status = 'open' AND ${landed}`,
          ).bind(now, now, next, cid, game.id, next, cid),
          env.DB.prepare(
            `INSERT INTO game_change_comments (id, change_id, kind, author_email, author_name, body, extra, created_at)
             SELECT lower(hex(randomblob(16))), ?, 'event', ?, ?, 'accepted', ?, ? WHERE ${landed}`,
          ).bind(cid, data.email, me, next, now, game.id, next, cid),
        ]);
      } catch {
        return json({ error: `"${game.title}" was saved somewhere else a moment ago. Look again, then accept.`, moved: true }, 409);
      }
      if (!(await savedAs(env.DB, game.id, game.version, m.text))) {
        return json({ error: `"${game.title}" was saved somewhere else a moment ago. Look again, then accept.`, moved: true }, 409);
      }
      return json({ ok: true, version: next });
    }

    case 'decline': {
      if (!can.decline) return no('Only the person who made the game can say no thanks, while the change is open.');
      const stmts = [];
      if (body.reply !== undefined && body.reply !== null && String(body.reply).trim()) {
        const c = cleanComment(body.reply);
        if ('error' in c) return json({ error: c.error }, 400);
        stmts.push(commentStmt(env.DB, cid, data.email, me, c.body, now));
      }
      stmts.push(
        env.DB.prepare(`UPDATE game_changes SET status = 'declined', decided_at = ?, updated_at = ? WHERE id = ? AND status = 'open'`).bind(now, now, cid),
        eventStmt(env.DB, cid, 'declined', data.email, me, now),
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    }

    case 'withdraw': {
      if (!can.withdraw) return no('Only the person who proposed a change can take it back, while it is open.');
      await env.DB.batch([
        env.DB.prepare(`UPDATE game_changes SET status = 'withdrawn', decided_at = ?, updated_at = ? WHERE id = ? AND status = 'open'`).bind(now, now, cid),
        eventStmt(env.DB, cid, 'withdrawn', data.email, me, now),
      ]);
      return json({ ok: true });
    }

    case 'reopen': {
      if (!can.reopen || !game) return no('This change cannot be opened again.');
      const other = await env.DB.prepare(
        `SELECT 1 AS x FROM game_changes WHERE game_id = ? AND from_email = ? AND status = 'open' AND id != ?`,
      ).bind(game.id, change.from_email, cid).first();
      if (other) return json({ error: `${change.from_name} already has another change open for "${game.title}". One at a time.` }, 409);
      const openN = await env.DB.prepare(`SELECT COUNT(*) AS n FROM game_changes WHERE game_id = ? AND status = 'open'`)
        .bind(game.id).first<{ n: number }>();
      if ((openN?.n ?? 0) >= OPEN_CHANGES_PER_GAME) return json({ error: `"${game.title}" already has ${OPEN_CHANGES_PER_GAME} changes waiting.` }, 429);
      await env.DB.batch([
        env.DB.prepare(`UPDATE game_changes SET status = 'open', decided_at = NULL, updated_at = ? WHERE id = ? AND status IN ('declined', 'withdrawn')`).bind(now, cid),
        eventStmt(env.DB, cid, 'reopened', data.email, me, now),
      ]);
      return json({ ok: true });
    }

    case 'lock':
    case 'unlock': {
      const lock = body.action === 'lock';
      if (lock ? !can.lock : !can.unlock) return no('Only the game’s maker or a teacher can close or open the conversation.');
      await env.DB.batch([
        env.DB.prepare(`UPDATE game_changes SET locked_at = ?, updated_at = ? WHERE id = ?`).bind(lock ? now : null, now, cid),
        eventStmt(env.DB, cid, lock ? 'locked' : 'unlocked', data.email, me, now),
      ]);
      return json({ ok: true });
    }

    case 'remove': {
      if (!can.remove) return no('Teachers only.');
      await env.DB.batch([
        env.DB.prepare(`UPDATE game_changes SET status = 'removed', decided_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, cid),
        eventStmt(env.DB, cid, 'removed', data.email, me, now),
      ]);
      return json({ ok: true });
    }

    default:
      return json({ error: 'Unknown action' }, 400);
  }
};
