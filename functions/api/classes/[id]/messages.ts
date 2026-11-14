// GET  /api/classes/[id]/messages            — the class's switch, its students (muted or not) and every
//                                              conversation between two of its students, newest first
// GET  /api/classes/[id]/messages?thread=<id> — one of those conversations, removed messages included
//                                              (marked; their words stay readable to the class's teachers)
// POST /api/classes/[id]/messages  { action: 'messages-off' | 'messages-on' }
//                                  { action: 'mute' | 'unmute', student: <person key> }
//                                  { action: 'remove' | 'restore', messageId }
//
// Migration 0053. Owner, co-teacher or admin only. A teacher reads every conversation between two
// students of this class (students are told so above each one); a conversation between a student and
// a teacher is read by those two only, so it is not listed here. Reading here never marks anything read.
// A removed message keeps its row: students see "Removed by a teacher", never its words.
// Muting pauses one student's messages to classmates in this class; they can still message a teacher.
// No email in any answer.

import { canManageClass } from '../../../_shared/classAuth';
import {
  classPeople, emailForKey, json, personKeys, threadShares, threadWithMembers, threadMessages, type SessionData,
} from '../../../_shared/messages';
import { isPersonKey, isThreadId, shareSnippet, snippetOf, type ShareKind } from '../../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

async function allowed(env: Env, data: SessionData, classId: string): Promise<Response | null> {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  return null;
}

interface ThreadListRow {
  id: string; last_at: number; created_at: number; names: string | null; n: number;
  m_body: string | null; m_at: number | null; m_deleted: number | null; m_author: string | null;
  m_share_kind: ShareKind | null; m_share_title: string | null;
}

async function overview(env: Env, classId: string) {
  const cls = await env.DB.prepare(`SELECT student_messages_off FROM classes WHERE id = ?`).bind(classId).first<{ student_messages_off: number | null }>();
  const people = (await classPeople(env.DB, classId)).filter((p) => !p.teacher);
  const keys = await personKeys(env.DB, people.map((p) => p.email));
  const muted = new Set(((await env.DB.prepare(`SELECT student_email FROM class_message_mutes WHERE class_id = ?`).bind(classId)
    .all<{ student_email: string }>()).results ?? []).map((r) => r.student_email));
  const rows = (await env.DB.prepare(
    `SELECT t.id, t.last_at, t.created_at,
            (SELECT GROUP_CONCAT(name, '|') FROM (SELECT name FROM message_members WHERE thread_id = t.id ORDER BY name)) AS names,
            (SELECT COUNT(*) FROM messages WHERE thread_id = t.id) AS n,
            x.body AS m_body, x.created_at AS m_at, x.deleted_at AS m_deleted,
            (SELECT name FROM message_members WHERE thread_id = t.id AND email = x.author_email) AS m_author,
            xs.kind AS m_share_kind, xs.title AS m_share_title
       FROM message_threads t
       LEFT JOIN messages x ON x.id = (SELECT y.id FROM messages y WHERE y.thread_id = t.id ORDER BY y.created_at DESC, y.rowid DESC LIMIT 1)
       LEFT JOIN message_shares xs ON xs.message_id = x.id
      WHERE t.class_id = ? AND t.kind = 'students'
      ORDER BY t.last_at DESC LIMIT 200`,
  ).bind(classId).all<ThreadListRow>()).results ?? [];
  return {
    studentMessagesOn: !cls?.student_messages_off,
    students: people.flatMap((p) => (keys.has(p.email) ? [{ key: keys.get(p.email)!, name: p.name, muted: muted.has(p.email) }] : [])),
    threads: rows.map((r) => ({
      id: r.id,
      people: (r.names ?? '').split('|').filter(Boolean),
      count: r.n,
      lastAt: r.last_at,
      last: r.m_at == null ? null : {
        author: r.m_author ?? 'Someone',
        snippet: r.m_body || !r.m_share_kind ? snippetOf(r.m_body ?? '') : shareSnippet(r.m_share_kind, r.m_share_title ?? ''),
        at: r.m_at,
        removed: r.m_deleted != null,
      },
    })),
  };
}

/** A conversation this teacher may read on this page: in this class, and between two students (or the teacher is in it). */
async function readableThread(env: Env, data: SessionData, classId: string, threadId: string) {
  const t = await threadWithMembers(env.DB, threadId);
  if (!t || t.thread.class_id !== classId) return null;
  if (t.thread.kind !== 'students' && !t.members.some((m) => m.email === data.email)) return null;
  return t;
}

async function threadView(env: Env, data: SessionData, classId: string, threadId: string) {
  const t = await readableThread(env, data, classId, threadId);
  if (!t) return null;
  const names = new Map(t.members.map((m) => [m.email, m]));
  const [rows, shares] = await Promise.all([threadMessages(env.DB, threadId), threadShares(env.DB, threadId)]);
  return {
    id: t.thread.id,
    people: t.members.map((m) => ({ name: m.name, teacher: !!m.teacher })),
    messages: rows.map((r) => ({
      id: r.id,
      author: names.get(r.author_email)?.name ?? 'Someone',
      teacher: !!names.get(r.author_email)?.teacher,
      body: r.body,
      removed: r.deleted_at != null,
      at: r.created_at,
      // A teacher can still open a removed message's program (GET /api/shares/[id]).
      share: shares.get(r.id) ?? null,
    })),
  };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  const thread = new URL(request.url).searchParams.get('thread');
  if (thread != null) {
    if (!isThreadId(thread)) return json({ error: 'Not found' }, 404);
    const view = await threadView(env, data, classId, thread);
    return view ? json({ thread: view }) : json({ error: 'Not found' }, 404);
  }
  return json(await overview(env, classId));
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  let body: { action?: unknown; student?: unknown; messageId?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const now = Date.now();

  if (body.action === 'messages-off' || body.action === 'messages-on') {
    await env.DB.prepare(`UPDATE classes SET student_messages_off = ? WHERE id = ?`).bind(body.action === 'messages-off' ? 1 : 0, classId).run();
    return json(await overview(env, classId));
  }

  if (body.action === 'mute' || body.action === 'unmute') {
    if (!isPersonKey(body.student)) return json({ error: 'Choose a student.' }, 400);
    const email = await emailForKey(env.DB, body.student);
    const enrolled = email && (await classPeople(env.DB, classId)).some((p) => p.email === email && !p.teacher);
    if (!email || !enrolled) return json({ error: 'That student is not in this class.' }, 404);
    if (body.action === 'mute') {
      await env.DB.prepare(`INSERT OR IGNORE INTO class_message_mutes (class_id, student_email, muted_at, muted_by) VALUES (?, ?, ?, ?)`)
        .bind(classId, email, now, data.email).run();
    } else {
      await env.DB.prepare(`DELETE FROM class_message_mutes WHERE class_id = ? AND student_email = ?`).bind(classId, email).run();
    }
    return json(await overview(env, classId));
  }

  if (body.action === 'remove' || body.action === 'restore') {
    if (typeof body.messageId !== 'string' || !/^[0-9a-f]{32}$/.test(body.messageId)) return json({ error: 'Not found' }, 404);
    const m = await env.DB.prepare(`SELECT thread_id FROM messages WHERE id = ?`).bind(body.messageId).first<{ thread_id: string }>();
    if (!m || !(await readableThread(env, data, classId, m.thread_id))) return json({ error: 'Not found' }, 404);
    if (body.action === 'remove') {
      await env.DB.prepare(`UPDATE messages SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL`).bind(now, data.email, body.messageId).run();
    } else {
      await env.DB.prepare(`UPDATE messages SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`).bind(body.messageId).run();
    }
    return json({ thread: await threadView(env, data, classId, m.thread_id) });
  }

  return json({ error: 'Unknown action' }, 400);
};
