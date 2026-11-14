// GET /api/shares/[id] — a sandbox program sent in a message (migration 0054; lib/messages-core.ts ShareView).
//
// Opened by exactly the people who may read the message it came with: the conversation's two people, and,
// for a conversation between two students, the class's teachers (owner, co-teacher) and admins. Anyone
// else, a bad id and a missing one all get the same 404. Once a teacher removed the message, only those
// teachers can still open it. A copy carries its code (run on /shared, never here); an invitation to
// Code together carries the session's code only while that same session is open. No email in the answer.

import { classInfo, json, roleIn, shareCard, threadWithMembers, type SessionData, type ShareRow } from '../../_shared/messages';
import { isShareId, type ShareView } from '../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

const missing = () => json({ error: 'That program is not there any more, or it was not sent to you.' }, 404);

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isShareId(id)) return missing();
  const row = await env.DB.prepare(`SELECT * FROM message_shares WHERE id = ?`).bind(id).first<ShareRow>();
  if (!row) return missing();
  const t = await threadWithMembers(env.DB, row.thread_id);
  const msg = await env.DB.prepare(`SELECT deleted_at FROM messages WHERE id = ?`).bind(row.message_id).first<{ deleted_at: number | null }>();
  if (!t || !msg) return missing();

  const member = t.members.some((m) => m.email === data.email);
  let teacherView = false;
  if (t.thread.kind === 'students') {
    if (data.role === 'admin') teacherView = true;
    else if (data.role !== 'student') {
      const cls = await classInfo(env.DB, t.thread.class_id);
      teacherView = !!cls && (await roleIn(env.DB, cls, data.email)) === 'teacher';
    }
  }
  if (!member && !teacherView) return missing();
  if (msg.deleted_at != null && !teacherView) return missing();

  const author = t.members.find((m) => m.email === row.author_email);
  const view: ShareView = {
    ...(await shareCard(env.DB, row)),
    author: author?.name ?? 'Someone',
    mine: row.author_email === data.email,
    at: row.created_at,
  };
  if (row.kind === 'copy') view.code = row.code ?? '';
  return json(view);
};
