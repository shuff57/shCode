// GET  /api/messages/[id]          — one conversation (lib/messages-core.ts ThreadView); marks it read for the caller
// POST /api/messages/[id]  { body } — send a message in it
//
// Only the conversation's two people use these; anyone else gets 404 (a teacher reads a conversation
// between two of their students through GET /api/classes/[id]/messages?thread=, which never marks it
// read). Sending is re-checked every time (functions/_shared/messages.ts sendRule).

import {
  appendMessage, capRefusal, classInfo, json, memberView, sendRefusal, sendRule, threadWithMembers,
  type SessionData,
} from '../../_shared/messages';
import { cleanMessage, isThreadId } from '../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isThreadId(id)) return json({ error: 'Not found' }, 404);
  const view = await memberView(env.DB, data, id);
  if (!view) return json({ error: 'Not found' }, 404);
  const newest = view.messages.reduce((n, m) => Math.max(n, m.at), 0);
  if (newest) {
    await env.DB.prepare(`UPDATE message_members SET read_at = MAX(read_at, ?) WHERE thread_id = ? AND email = ?`)
      .bind(newest, id, data.email).run();
  }
  return json(view);
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isThreadId(id)) return json({ error: 'Not found' }, 404);
  const t = await threadWithMembers(env.DB, id);
  const other = t?.members.find((m) => m.email !== data.email);
  if (!t || !other || !t.members.some((m) => m.email === data.email)) return json({ error: 'Not found' }, 404);

  let body: { body?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const cls = await classInfo(env.DB, t.thread.class_id);
  if (!cls) return json(sendRefusal('archived', other.name, t.thread.class_name), 403);
  const rule = await sendRule(env.DB, cls, data.email, other.email);
  if (rule.why) return json(sendRefusal(rule.why, other.name, cls.name), 403);

  const c = cleanMessage(body.body);
  if ('error' in c) return json(c, 400);
  const capped = await capRefusal(env.DB, data, id);
  if (capped) return json({ error: capped }, 429);

  await appendMessage(env.DB, data.email, id, c.body);
  return json(await memberView(env.DB, data, id), 201);
};
