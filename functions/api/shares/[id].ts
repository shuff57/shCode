// GET /api/shares/[id] — a sandbox program sent in a message (migration 0054; lib/messages-core.ts ShareView).
//
// Opened by exactly the people who may read the message it came with (functions/_shared/messages.ts
// threadAccess: two people, a group's people, a channel's class, and the class's teachers for everything
// between students). Anyone else, a bad id and a missing one all get the same 404. Once a teacher removed
// the message, only the class's teachers can still open it. A copy carries its code (run on /shared, never here); an invitation to
// Code together carries the session's code only while that same session is open. No email in the answer.

import { json, shareCard, threadAccess, type SessionData, type ShareRow } from '../../_shared/messages';
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
  const a = await threadAccess(env.DB, data, row.thread_id);
  const msg = await env.DB.prepare(`SELECT deleted_at FROM messages WHERE id = ?`).bind(row.message_id).first<{ deleted_at: number | null }>();
  if (!a || !a.read || !msg) return missing();
  if (msg.deleted_at != null && !a.moderate) return missing();

  const author = a.members.find((m) => m.email === row.author_email);
  const view: ShareView = {
    ...(await shareCard(env.DB, row)),
    author: author?.name ?? 'Someone',
    mine: row.author_email === data.email,
    at: row.created_at,
  };
  if (row.kind === 'copy') view.code = row.code ?? '';
  return json(view);
};
