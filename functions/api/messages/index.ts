// GET  /api/messages            — the caller's conversations, newest first, plus `unread` (lib/messages-core.ts)
// GET  /api/messages?count=1    — only `unread`: how many conversations have a message the caller has not opened
// GET  /api/messages?people=1   — whom the caller may start a conversation with, per class they are in now
// POST /api/messages            { classId, to, body, share? } — send to a person (`to` is their public key);
//                                 reuses the conversation the two already have in that class, else starts one.
//                                 `share` (migration 0054) sends a sandbox program with it: { kind: 'copy', lang,
//                                 title, code } or { kind: 'together', lang, title, room }; `body` may then be empty
//
// Migration 0053 (owner's decision 2026-11-13). The rules are functions/_shared/messages.ts sendRule():
// a student and a teacher of the class always; two students of the class unless a teacher turned it off
// for the class or paused the writer. Every message goes through cleanMessage(), which refuses personal
// details (findPII) in plain words. No email is ever in an answer.

import {
  appendMessage, capRefusal, classInfo, classPeople, emailForKey, isMuted, json, memberView, nameOf,
  newId, personKeys, prepareSend, sendRefusal, sendRule, toPeople, type SessionData,
} from '../../_shared/messages';
import { studentClassIds, teacherClassIds } from '../../_shared/libraryShare';
import {
  THREAD_LIST_LIMIT, isPersonKey, pairKey, shareSnippet, snippetOf, type ShareKind,
  type PeopleClass, type SendBlock, type ThreadSummary,
} from '../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

async function unreadCount(db: D1Database, email: string): Promise<number> {
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM message_members m
      WHERE m.email = ?1 AND EXISTS (
        SELECT 1 FROM messages x WHERE x.thread_id = m.thread_id AND x.author_email != ?1
           AND x.created_at > m.read_at AND x.deleted_at IS NULL)`,
  ).bind(email).first<{ n: number }>();
  return r?.n ?? 0;
}

interface ListRow {
  id: string; class_id: string; class_name: string | null; kind: 'teacher' | 'students'; last_at: number; read_at: number;
  other_name: string; other_teacher: number;
  m_author: string | null; m_body: string | null; m_at: number | null; m_deleted: number | null; unread: number;
  m_share_kind: ShareKind | null; m_share_title: string | null;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  const url = new URL(request.url);
  const me = data.email;
  if (url.searchParams.get('count')) return json({ unread: await unreadCount(env.DB, me) });

  if (url.searchParams.get('people')) {
    const [asStudent, asTeacher] = await Promise.all([
      studentClassIds(env.DB, me),
      data.role === 'student' ? Promise.resolve([]) : teacherClassIds(env.DB, me),
    ]);
    const teaches = new Set(asTeacher);
    const ids = [...new Set([...asTeacher, ...asStudent])];
    const classes: PeopleClass[] = [];
    for (const id of ids) {
      const cls = await classInfo(env.DB, id);
      if (!cls || cls.archived_at != null) continue;
      const everyone = (await classPeople(env.DB, id)).filter((p) => p.email !== me);
      const t = teaches.has(id);
      let blocked: SendBlock = null;
      if (!t) {
        if (cls.student_messages_off) blocked = 'class-off';
        else if (await isMuted(env.DB, id, me)) blocked = 'muted';
      }
      const listed = t || !blocked ? everyone : everyone.filter((p) => p.teacher);
      const keys = await personKeys(env.DB, listed.map((p) => p.email));
      classes.push({ id, name: cls.name, teaches: t, people: toPeople(listed, keys), classmatesBlocked: blocked });
    }
    classes.sort((a, b) => a.name.localeCompare(b.name));
    return json({ classes });
  }

  const rows = (await env.DB.prepare(
    `SELECT t.id, t.class_id, c.name AS class_name, t.kind, t.last_at, m.read_at,
            o.name AS other_name, o.teacher AS other_teacher,
            x.author_email AS m_author, x.body AS m_body, x.created_at AS m_at, x.deleted_at AS m_deleted,
            xs.kind AS m_share_kind, xs.title AS m_share_title,
            EXISTS (SELECT 1 FROM messages u WHERE u.thread_id = t.id AND u.author_email != ?1
                       AND u.created_at > m.read_at AND u.deleted_at IS NULL) AS unread
       FROM message_members m
       JOIN message_threads t ON t.id = m.thread_id
       JOIN message_members o ON o.thread_id = t.id AND o.email != ?1
       LEFT JOIN classes c ON c.id = t.class_id
       LEFT JOIN messages x ON x.id = (SELECT y.id FROM messages y WHERE y.thread_id = t.id ORDER BY y.created_at DESC, y.rowid DESC LIMIT 1)
       LEFT JOIN message_shares xs ON xs.message_id = x.id
      WHERE m.email = ?1
      ORDER BY t.last_at DESC LIMIT ?2`,
  ).bind(me, THREAD_LIST_LIMIT).all<ListRow>()).results ?? [];
  const threads: ThreadSummary[] = rows.map((r) => ({
    id: r.id,
    classId: r.class_id,
    className: r.class_name ?? 'a class',
    kind: r.kind,
    other: { name: r.other_name, teacher: !!r.other_teacher },
    last: r.m_at == null ? null : {
      snippet: r.m_deleted != null ? '' : r.m_body || !r.m_share_kind ? snippetOf(r.m_body ?? '') : shareSnippet(r.m_share_kind, r.m_share_title ?? ''),
      mine: r.m_author === me,
      at: r.m_at,
      removed: r.m_deleted != null,
    },
    unread: !!r.unread,
  }));
  return json({ threads, unread: await unreadCount(env.DB, me) });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { classId?: unknown; to?: unknown; body?: unknown; share?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (typeof body.classId !== 'string' || !isPersonKey(body.to)) return json({ error: 'Choose who the message is for.' }, 400);
  const cls = await classInfo(env.DB, body.classId);
  const to = await emailForKey(env.DB, body.to);
  if (!cls || !to || to === data.email) return json({ error: 'That person is not in this class.' }, 404);

  const rule = await sendRule(env.DB, cls, data.email, to);
  // Someone who is not in the class learns nothing about who is.
  if (!rule.fromRole) return json({ error: 'That person is not in this class.' }, 404);
  if (rule.why === 'other-left') return json({ error: 'That person is not in this class.' }, 404);
  const toName = await nameOf(env.DB, to, rule.toRole === 'teacher');
  if (rule.why) return json(sendRefusal(rule.why, toName, cls.name), 403);

  const c = await prepareSend(env.DB, data.email, body);
  if (!c.ok) return json(c.body, c.status);

  const key = pairKey(cls.id, data.email, to);
  const existing = await env.DB.prepare(`SELECT id FROM message_threads WHERE pair_key = ?`).bind(key).first<{ id: string }>();
  const capped = await capRefusal(env.DB, data, existing?.id ?? null);
  if (capped) return json({ error: capped }, 429);

  let threadId = existing?.id;
  const now = Date.now();
  if (!threadId) {
    const id = newId();
    const myName = await nameOf(env.DB, data.email, rule.fromRole === 'teacher');
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO message_threads (id, class_id, pair_key, kind, created_by, created_at, last_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, cls.id, key, rule.kind, data.email, now, now),
    ]);
    // Two people starting the same conversation at once: both land in the one that won.
    threadId = (await env.DB.prepare(`SELECT id FROM message_threads WHERE pair_key = ?`).bind(key).first<{ id: string }>())!.id;
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, 0)`)
        .bind(threadId, data.email, myName, rule.fromRole === 'teacher' ? 1 : 0),
      env.DB.prepare(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, 0)`)
        .bind(threadId, to, toName, rule.toRole === 'teacher' ? 1 : 0),
    ]);
  }
  await appendMessage(env.DB, data.email, threadId, c.body, now, c.share);
  return json(await memberView(env.DB, data, threadId), 201);
};
