// GET  /api/messages/[id]          — one conversation (lib/messages-core.ts ThreadView); marks it read for the caller
// POST /api/messages/[id]  { body, share? } — send a message in it (`share`: a sandbox program, see index.ts)
// POST /api/messages/[id]  { action, ... }  — manage it (migration 0055):
//      'rename'  { title }    a group (its people) or a channel (its maker, or a teacher of the class); not #general
//      'add'     { people }   a group: add people of the class (8 at most)
//      'leave'                a group: leave it (a group nobody is left in is deleted)
//      'lock' | 'unlock'      a channel: only teachers post / everyone posts (a teacher of the class)
//      'delete'               a channel (not #general) or a group (a teacher of the class)
//      'remove' | 'restore' { messageId }  a teacher of the class, in any conversation of it but a teacher's own
//
// Who may read is functions/_shared/messages.ts threadAccess (anyone else gets 404): two people, a group's
// people, a channel's class, and the class's teachers for everything between students. Sending is re-checked
// every time (threadBlock: leaving, the levels, a locked channel).

import {
  appendMessage, capRefusal, channelKey, classPeople, deleteThread, emailForKey, json, prepareSend, sendRefusal,
  threadAccess, threadBlock, threadView, touchMember, type SessionData,
} from '../../_shared/messages';
import { GENERAL, GROUP_MAX_PEOPLE, cleanChannelName, cleanGroupTitle, isPersonKey, isThreadId } from '../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

const missing = () => json({ error: 'Not found' }, 404);

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isThreadId(id)) return missing();
  const a = await threadAccess(env.DB, data, id);
  if (!a || !a.read) return missing();
  const view = await threadView(env.DB, data, id, a);
  if (!view) return missing();
  // Only a reader who belongs to it has a read mark (a teacher looking on does not).
  if (!a.onlooker) {
    if (a.thread.kind === 'channel') await touchMember(env.DB, id, data.email, a.role === 'teacher');
    const newest = view.messages.reduce((n, m) => Math.max(n, m.at), 0);
    if (newest) {
      await env.DB.prepare(`UPDATE message_members SET read_at = MAX(read_at, ?) WHERE thread_id = ? AND email = ?`)
        .bind(newest, id, data.email).run();
    }
  }
  return json(view);
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isThreadId(id)) return missing();
  const a = await threadAccess(env.DB, data, id);
  if (!a || !a.read) return missing();

  let body: { body?: unknown; share?: unknown; action?: unknown; title?: unknown; people?: unknown; messageId?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const kind = a.thread.kind;
  const view = () => threadView(env.DB, data, id);

  if (body.action != null) {
    const v = await threadView(env.DB, data, id, a);
    const act = body.action;

    if (act === 'remove' || act === 'restore') {
      if (!a.moderate) return json({ error: 'Only a teacher of the class can do that.' }, 403);
      if (typeof body.messageId !== 'string' || !/^[0-9a-f]{32}$/.test(body.messageId)) return missing();
      const m = await env.DB.prepare(`SELECT thread_id FROM messages WHERE id = ?`).bind(body.messageId).first<{ thread_id: string }>();
      if (!m || m.thread_id !== id) return missing();
      if (act === 'remove') {
        await env.DB.prepare(`UPDATE messages SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL`).bind(Date.now(), data.email, body.messageId).run();
      } else {
        await env.DB.prepare(`UPDATE messages SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`).bind(body.messageId).run();
      }
      return json(await view());
    }

    if (act === 'rename') {
      if (!v?.manage) return json({ error: 'You cannot rename this.' }, 403);
      if (kind === 'group') {
        const t = cleanGroupTitle(body.title);
        if ('error' in t) return json(t, 400);
        await env.DB.prepare(`UPDATE message_threads SET title = ? WHERE id = ?`).bind(t.title, id).run();
        return json(await view());
      }
      if (kind === 'channel') {
        if (a.thread.title === GENERAL) return json({ error: '#general keeps its name.' }, 400);
        const c = cleanChannelName(body.title);
        if ('error' in c) return json(c, 400);
        try {
          await env.DB.prepare(`UPDATE message_threads SET title = ?, pair_key = ? WHERE id = ?`).bind(c.name, channelKey(a.thread.class_id, c.name), id).run();
        } catch {
          return json({ error: `${a.thread.class_name} already has a channel called #${c.name}.` }, 409);
        }
        return json(await view());
      }
      return json({ error: 'You cannot rename this.' }, 400);
    }

    if (act === 'add') {
      if (kind !== 'group' || !v?.manage) return json({ error: 'You cannot add people here.' }, 403);
      const keys = Array.isArray(body.people) ? [...new Set(body.people)] : [];
      if (!keys.length || !keys.every(isPersonKey)) return json({ error: 'Choose who to add.' }, 400);
      const inClass = new Map((await classPeople(env.DB, a.thread.class_id)).map((p) => [p.email, p]));
      const have = new Set(a.members.map((m) => m.email));
      const add = [];
      for (const k of keys) {
        const email = await emailForKey(env.DB, k as string);
        const p = email ? inClass.get(email) : undefined;
        if (!p) return json({ error: 'Everyone in a group has to be in this class.' }, 400);
        if (!have.has(p.email)) add.push(p);
      }
      if (have.size + add.length > GROUP_MAX_PEOPLE) return json({ error: `A group is at most ${GROUP_MAX_PEOPLE} people.` }, 400);
      if (add.length) {
        await env.DB.batch(add.map((p) => env.DB.prepare(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, 0)`)
          .bind(id, p.email, p.name, p.teacher ? 1 : 0)));
      }
      return json(await view());
    }

    if (act === 'leave') {
      if (kind !== 'group' || !a.me) return json({ error: 'You are not in this group.' }, 400);
      await env.DB.prepare(`DELETE FROM message_members WHERE thread_id = ? AND email = ?`).bind(id, data.email).run();
      const left = await env.DB.prepare(`SELECT COUNT(*) AS n FROM message_members WHERE thread_id = ?`).bind(id).first<{ n: number }>();
      if (!left?.n) await deleteThread(env.DB, id);
      return json({ ok: true, left: true });
    }

    if (act === 'lock' || act === 'unlock') {
      if (kind !== 'channel' || !a.moderate) return json({ error: 'Only a teacher of the class can lock a channel.' }, 403);
      await env.DB.prepare(`UPDATE message_threads SET locked = ? WHERE id = ?`).bind(act === 'lock' ? 1 : 0, id).run();
      return json(await view());
    }

    if (act === 'delete') {
      if ((kind !== 'channel' && kind !== 'group') || !a.moderate) return json({ error: 'Only a teacher of the class can delete this.' }, 403);
      if (kind === 'channel' && a.thread.title === GENERAL) return json({ error: '#general cannot be deleted. You can lock it instead.' }, 400);
      await deleteThread(env.DB, id);
      return json({ ok: true, deleted: true });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  if (a.onlooker) return json({ error: 'You are reading this as a teacher of the class, so you cannot write in it.' }, 403);
  const why = await threadBlock(env.DB, a, data.email);
  if (why) {
    const other = a.members.find((m) => m.email !== data.email)?.name ?? 'They';
    const name = kind === 'channel' ? `#${a.thread.title}` : other;
    return json(sendRefusal(why, name, a.thread.class_name), 403);
  }
  const c = await prepareSend(env.DB, data.email, body, Date.now(), kind);
  if (!c.ok) return json(c.body, c.status);
  const capped = await capRefusal(env.DB, data, id, Date.now(), kind);
  if (capped) return json({ error: capped }, 429);

  if (kind === 'channel') await touchMember(env.DB, id, data.email, a.role === 'teacher');
  await appendMessage(env.DB, data.email, id, c.body, Date.now(), c.share);
  return json(await view(), 201);
};
