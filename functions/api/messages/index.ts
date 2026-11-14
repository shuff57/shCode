// GET  /api/messages            — the caller's conversations: channels of their classes, then two-person
//                                 conversations and groups, newest first, plus `unread` (lib/messages-core.ts)
// GET  /api/messages?count=1    — only `unread`: two-person conversations and groups with a message the caller
//                                 has not opened (a channel is shown bold in the list instead)
// GET  /api/messages?people=1   — whom the caller may write to, per class they are in now
// POST /api/messages            { classId, to, body, share? } — send to a person (`to` is their public key);
//                                 reuses the conversation the two already have in that class, else starts one.
//                                 `share` (migration 0054) sends a sandbox program with it: { kind: 'copy', lang,
//                                 title, code } or { kind: 'together' | 'watch', lang, title, room }; `body` may then be empty
// POST /api/messages            { classId, create: 'group', people: [keys], title? } — a group of 2-8 people of the class
// POST /api/messages            { classId, create: 'channel', name } — a channel for the whole class
//
// Migrations 0053-0055 (owner's decisions 2026-11-13 and 2026-11-14). The rules are in
// functions/_shared/messages.ts (sendRule, postBlock, threadAccess): a student's level per class and per
// student (On, Teacher only, Off; the stricter wins) decides what they may send. Every message goes through
// cleanMessage(), which refuses personal details (findPII) in plain words. No email is ever in an answer.

import {
  appendMessage, capRefusal, channelKey, classInfo, classPeople, emailForKey, json, levelsOf, listThreads, liveClasses,
  memberView, nameOf, newId, personKeys, postBlock, prepareSend, roleIn, sendRefusal, sendRule, toPeople, unreadCount,
  type SessionData,
} from '../../_shared/messages';
import {
  CHANNELS_PER_CLASS, GROUP_MAX_PEOPLE, MADE_PER_DAY, cleanChannelName, cleanGroupTitle, isPersonKey, pairKey,
  type PeopleClass, type SendBlock,
} from '../../../lib/messages-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  const url = new URL(request.url);
  const me = data.email;
  if (url.searchParams.get('count')) return json({ unread: await unreadCount(env.DB, me) });

  if (url.searchParams.get('people')) {
    const classes: PeopleClass[] = [];
    for (const { id, teaches } of await liveClasses(env.DB, data)) {
      const cls = await classInfo(env.DB, id);
      if (!cls) continue;
      const everyone = (await classPeople(env.DB, id)).filter((p) => p.email !== me);
      let blocked: SendBlock = null;
      let allBlocked: SendBlock = null;
      if (!teaches) {
        const l = await levelsOf(env.DB, cls, me);
        if (l.cls >= 2) allBlocked = 'class-all-off';
        else if (l.own >= 2) allBlocked = 'all-off';
        else if (l.cls >= 1) blocked = 'class-off';
        else if (l.own >= 1) blocked = 'muted';
      }
      const listed = allBlocked ? [] : teaches || !blocked ? everyone : everyone.filter((p) => p.teacher);
      const keys = await personKeys(env.DB, listed.map((p) => p.email));
      classes.push({
        id, name: cls.name, teaches, people: toPeople(listed, keys),
        classmatesBlocked: allBlocked ?? blocked, ...(allBlocked ? { allBlocked } : {}),
      });
    }
    classes.sort((a, b) => a.name.localeCompare(b.name));
    return json({ classes });
  }

  return json({ threads: await listThreads(env.DB, data), unread: await unreadCount(env.DB, me) });
};

/** Groups and channels a student made today: a cap so a class is not flooded. */
async function madeToday(db: D1Database, email: string, now: number): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM message_threads WHERE created_by = ? AND kind IN ('group', 'channel') AND created_at > ?`)
    .bind(email, now - 86_400_000).first<{ n: number }>();
  return r?.n ?? 0;
}

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { classId?: unknown; to?: unknown; body?: unknown; share?: unknown; create?: unknown; people?: unknown; title?: unknown; name?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (typeof body.classId !== 'string') return json({ error: 'Choose who the message is for.' }, 400);
  const cls = await classInfo(env.DB, body.classId);
  const now = Date.now();

  if (body.create === 'group' || body.create === 'channel') {
    const role = cls ? await roleIn(env.DB, cls, data.email) : null;
    // Someone not in the class learns nothing about it.
    if (!cls || !role) return json({ error: 'That class is not there.' }, 404);
    const why = await postBlock(env.DB, cls, data.email, role, 'peers');
    if (why) return json(sendRefusal(why, '', cls.name), 403);
    if (role === 'student' && (await madeToday(env.DB, data.email, now)) >= MADE_PER_DAY) {
      return json({ error: `You have made ${MADE_PER_DAY} groups and channels today, the most for one day.` }, 429);
    }
    const me = await nameOf(env.DB, data.email, role === 'teacher');
    const id = newId();

    if (body.create === 'channel') {
      const c = cleanChannelName(body.name);
      if ('error' in c) return json(c, 400);
      const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM message_threads WHERE class_id = ? AND kind = 'channel'`).bind(cls.id).first<{ n: number }>();
      if ((n?.n ?? 0) >= CHANNELS_PER_CLASS) return json({ error: `${cls.name} has ${CHANNELS_PER_CLASS} channels, the most a class can have.` }, 409);
      const r = await env.DB.prepare(
        `INSERT OR IGNORE INTO message_threads (id, class_id, pair_key, kind, created_by, created_at, last_at, title) VALUES (?, ?, ?, 'channel', ?, ?, ?, ?)`,
      ).bind(id, cls.id, channelKey(cls.id, c.name), data.email, now, now, c.name).run();
      if (!r.meta.changes) return json({ error: `${cls.name} already has a channel called #${c.name}.` }, 409);
      await env.DB.prepare(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(id, data.email, me, role === 'teacher' ? 1 : 0, now).run();
      return json(await memberView(env.DB, data, id), 201);
    }

    const t = cleanGroupTitle(body.title);
    if ('error' in t) return json(t, 400);
    const keys = Array.isArray(body.people) ? [...new Set(body.people)] : [];
    if (!keys.length || !keys.every(isPersonKey)) return json({ error: 'Choose the people for the group.' }, 400);
    if (keys.length + 1 > GROUP_MAX_PEOPLE) return json({ error: `A group is at most ${GROUP_MAX_PEOPLE} people, you included.` }, 400);
    const inClass = new Map((await classPeople(env.DB, cls.id)).map((p) => [p.email, p]));
    const people = [];
    for (const k of keys) {
      const email = await emailForKey(env.DB, k as string);
      const p = email ? inClass.get(email) : undefined;
      if (!p || email === data.email) return json({ error: 'Everyone in a group has to be in this class.' }, 400);
      people.push(p);
    }
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO message_threads (id, class_id, pair_key, kind, created_by, created_at, last_at, title) VALUES (?, ?, ?, 'group', ?, ?, ?, ?)`,
      ).bind(id, cls.id, `group|${id}`, data.email, now, now, t.title),
      env.DB.prepare(`INSERT INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(id, data.email, me, role === 'teacher' ? 1 : 0, now),
      ...people.map((p) => env.DB.prepare(`INSERT INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, 0)`)
        .bind(id, p.email, p.name, p.teacher ? 1 : 0)),
    ]);
    return json(await memberView(env.DB, data, id), 201);
  }

  if (!isPersonKey(body.to)) return json({ error: 'Choose who the message is for.' }, 400);
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
