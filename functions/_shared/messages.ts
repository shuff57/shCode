// Messages (migrations 0053-0055): who is in a class, who may write to whom and read what, the public
// person ids, groups and channels. The rules are described in lib/messages-core.ts; this file is the only
// place they are decided.

import { ownerLabel, studentClassIds, teacherClassIds } from './libraryShare';
import {
  GENERAL, GROUP_NOTE, MESSAGES_PER_CHANNEL, MESSAGES_PER_DAY, MESSAGES_PER_MINUTE, MESSAGES_PER_THREAD, THREAD_LIST_LIMIT,
  THREAD_VIEW_LIMIT, WATCHED_NOTE, blockText, channelNote, cleanMessage, cleanShareCode, cleanShareTitle, groupLabel,
  isShareLang, shareSnippet, snippetOf,
  type MessageItem, type MessageLevel, type MessagePerson, type SendBlock, type ShareCard, type ShareKind, type ShareLang,
  type ThreadKind, type ThreadSummary, type ThreadView,
} from '../../lib/messages-core';
import { CODE_ROOM_GAMES } from '../../lib/live-protocol';
import { getRoom, normalizeCode, roomKind } from './rooms';

export type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

interface ClassInfo { id: string; name: string; owner_email: string; archived_at: number | null; student_messages_off: number | null }

export async function classInfo(db: D1Database, classId: string): Promise<ClassInfo | null> {
  return db.prepare(`SELECT id, name, owner_email, archived_at, student_messages_off FROM classes WHERE id = ?`)
    .bind(classId).first<ClassInfo>();
}

/** 'teacher' (owner or co-teacher), 'student' (enrolled, unexpired) or null. Ignores archiving. */
export async function roleIn(db: D1Database, cls: ClassInfo, email: string, now = Date.now()): Promise<'teacher' | 'student' | null> {
  if (cls.owner_email === email) return 'teacher';
  const t = await db.prepare(`SELECT 1 AS x FROM class_teachers WHERE class_id = ? AND teacher_email = ?`).bind(cls.id, email).first();
  if (t) return 'teacher';
  const e = await db.prepare(`SELECT 1 AS x FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?`)
    .bind(cls.id, email, now).first();
  return e ? 'student' : null;
}

const asLevel = (n: unknown): MessageLevel => (n === 2 || Number(n) >= 2 ? 2 : Number(n) >= 1 ? 1 : 0);

/** A student's two levels in a class (0 On, 1 Teacher only, 2 Off): the class's and their own. */
export async function levelsOf(db: D1Database, cls: ClassInfo, email: string): Promise<{ cls: MessageLevel; own: MessageLevel }> {
  const r = await db.prepare(`SELECT level FROM class_message_mutes WHERE class_id = ? AND student_email = ?`).bind(cls.id, email).first<{ level: number }>();
  return { cls: asLevel(cls.student_messages_off), own: r ? asLevel(r.level) : 0 };
}

/** Paused (Teacher only) or Off: anything but On. */
export async function isMuted(db: D1Database, classId: string, email: string): Promise<boolean> {
  return !!(await db.prepare(`SELECT 1 AS x FROM class_message_mutes WHERE class_id = ? AND level >= 1 AND student_email = ?`).bind(classId, email).first());
}

/**
 * May someone with this role in the class post to a teacher ('teacher') or to classmates ('peers': a
 * classmate, a group, a channel)? Teachers always may; a student by the stricter of the two levels.
 */
export async function postBlock(
  db: D1Database, cls: ClassInfo, email: string, role: 'teacher' | 'student' | null, to: 'teacher' | 'peers',
): Promise<SendBlock> {
  if (cls.archived_at != null) return 'archived';
  if (!role) return 'left';
  if (role === 'teacher') return null;
  const l = await levelsOf(db, cls, email);
  if (l.cls >= 2) return 'class-all-off';
  if (l.own >= 2) return 'all-off';
  if (to === 'teacher') return null;
  if (l.cls >= 1) return 'class-off';
  if (l.own >= 1) return 'muted';
  return null;
}

/**
 * May `from` write to `to` (two people) in this class right now? kind is 'teacher' when either teaches
 * the class. Re-checked on every message, so leaving, a level or a pause takes effect at once.
 */
export async function sendRule(
  db: D1Database, cls: ClassInfo, from: string, to: string,
): Promise<{ why: SendBlock; kind: 'teacher' | 'students' | null; fromRole: 'teacher' | 'student' | null; toRole: 'teacher' | 'student' | null }> {
  const [fromRole, toRole] = await Promise.all([roleIn(db, cls, from), roleIn(db, cls, to)]);
  const kind = fromRole === 'teacher' || toRole === 'teacher' ? 'teacher' : fromRole && toRole ? 'students' : null;
  let why: SendBlock = null;
  if (cls.archived_at != null) why = 'archived';
  else if (!fromRole) why = 'left';
  else if (!toRole) why = 'other-left';
  else why = await postBlock(db, cls, from, fromRole, toRole === 'teacher' ? 'teacher' : 'peers');
  return { why, kind, fromRole, toRole };
}

export function sendRefusal(why: SendBlock, other: string, className: string): { error: string; why: SendBlock } {
  return { error: blockText(why, other, className), why };
}

function randomKey(): string {
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  return 'p' + Array.from(buf, (n) => n.toString(16).padStart(2, '0')).join('');
}

/** The public id of each account, made the first time it is needed. */
export async function personKeys(db: D1Database, emails: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Set(emails)];
  for (let i = 0; i < uniq.length; i += 90) {
    const part = uniq.slice(i, i + 90);
    const rows = (await db.prepare(`SELECT email, key FROM person_keys WHERE email IN (${part.map(() => '?').join(',')})`)
      .bind(...part).all<{ email: string; key: string }>()).results ?? [];
    for (const r of rows) out.set(r.email, r.key);
  }
  const missing = uniq.filter((e) => !out.has(e));
  if (missing.length) {
    await db.batch(missing.map((e) => db.prepare(`INSERT OR IGNORE INTO person_keys (email, key) VALUES (?, ?)`).bind(e, randomKey())));
    for (let i = 0; i < missing.length; i += 90) {
      const part = missing.slice(i, i + 90);
      const rows = (await db.prepare(`SELECT email, key FROM person_keys WHERE email IN (${part.map(() => '?').join(',')})`)
        .bind(...part).all<{ email: string; key: string }>()).results ?? [];
      for (const r of rows) out.set(r.email, r.key);
    }
  }
  return out;
}

export async function emailForKey(db: D1Database, key: string): Promise<string | null> {
  const r = await db.prepare(`SELECT email FROM person_keys WHERE key = ?`).bind(key).first<{ email: string }>();
  return r?.email ?? null;
}

/** First name + last initial; a teacher with no name on file shows as "Teacher", never "A classmate". */
export function personLabel(first: string | null, last: string | null, teacher: boolean): string {
  if (teacher && !(first ?? '').trim() && !(last ?? '').trim()) return 'Teacher';
  return ownerLabel(first, last);
}

export async function nameOf(db: D1Database, email: string, teacher = false): Promise<string> {
  const st = await db.prepare(`SELECT first_name, last_name FROM students WHERE email = ?`)
    .bind(email).first<{ first_name: string | null; last_name: string | null }>();
  return personLabel(st?.first_name ?? null, st?.last_name ?? null, teacher);
}

interface PersonRow { email: string; first_name: string | null; last_name: string | null; teacher: number }

/** Everyone in a class now: its teachers, and students enrolled (unexpired). */
export async function classPeople(db: D1Database, classId: string, now = Date.now()): Promise<{ email: string; name: string; teacher: boolean }[]> {
  const rows = (await db.prepare(
    `SELECT p.email, st.first_name, st.last_name, p.teacher FROM (
        SELECT owner_email AS email, 1 AS teacher FROM classes WHERE id = ?1
        UNION SELECT teacher_email AS email, 1 AS teacher FROM class_teachers WHERE class_id = ?1
        UNION SELECT student_email AS email, 0 AS teacher FROM enrollments WHERE class_id = ?1 AND expires_at > ?2
      ) p LEFT JOIN students st ON st.email = p.email`,
  ).bind(classId, now).all<PersonRow>()).results ?? [];
  const byEmail = new Map<string, { email: string; name: string; teacher: boolean }>();
  for (const r of rows) {
    const prev = byEmail.get(r.email);
    // Someone listed as both (a teacher enrolled in their own class) counts as a teacher.
    if (prev && prev.teacher) continue;
    byEmail.set(r.email, { email: r.email, name: personLabel(r.first_name, r.last_name, !!r.teacher), teacher: !!r.teacher });
  }
  return [...byEmail.values()].sort((a, b) => Number(b.teacher) - Number(a.teacher) || a.name.localeCompare(b.name));
}

export function toPeople(rows: { email: string; name: string; teacher: boolean }[], keys: Map<string, string>): MessagePerson[] {
  return rows.flatMap((r) => (keys.has(r.email) ? [{ key: keys.get(r.email)!, name: r.name, teacher: r.teacher }] : []));
}

export interface ThreadRow {
  id: string; class_id: string; kind: ThreadKind; created_at: number; last_at: number; class_name: string;
  title: string; locked: number; created_by: string;
}
export interface MemberRow { email: string; name: string; teacher: number; read_at: number }

export async function threadWithMembers(db: D1Database, id: string): Promise<{ thread: ThreadRow; members: MemberRow[] } | null> {
  const thread = await db.prepare(
    `SELECT t.id, t.class_id, t.kind, t.created_at, t.last_at, COALESCE(c.name, 'a class') AS class_name,
            t.title, t.locked, t.created_by
       FROM message_threads t LEFT JOIN classes c ON c.id = t.class_id WHERE t.id = ?`,
  ).bind(id).first<ThreadRow>();
  if (!thread) return null;
  const members = (await db.prepare(`SELECT email, name, teacher, read_at FROM message_members WHERE thread_id = ?`)
    .bind(id).all<MemberRow>()).results ?? [];
  return { thread, members };
}

export interface MessageRow {
  id: string; author_email: string; body: string; created_at: number; deleted_at: number | null;
}

/** The newest `limit` messages, oldest first. */
export async function threadMessages(db: D1Database, threadId: string, limit = THREAD_VIEW_LIMIT): Promise<MessageRow[]> {
  const rows = (await db.prepare(
    `SELECT id, author_email, body, created_at, deleted_at FROM messages WHERE thread_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`,
  ).bind(threadId, limit).all<MessageRow>()).results ?? [];
  return rows.reverse();
}

// ---- a sandbox program sent in a message (migration 0054) ----------------------------------------

export interface ShareRow {
  id: string; message_id: string; thread_id: string; author_email: string; kind: ShareKind; lang: ShareLang;
  title: string; code: string | null; room_code: string | null; room_created_at: number | null; created_at: number;
}

/** Is the Code together session a share points at still open (the same session, not a reused code)? */
export async function shareRoomOpen(db: D1Database, row: Pick<ShareRow, 'room_code' | 'room_created_at'>, now = Date.now()): Promise<boolean> {
  if (!row.room_code) return false;
  const room = await getRoom(db, row.room_code);
  return !!room && room.created_at === row.room_created_at && room.closed_at == null && room.expires_at > now;
}

export async function shareCard(db: D1Database, row: ShareRow, now = Date.now()): Promise<ShareCard> {
  const card: ShareCard = { id: row.id, kind: row.kind, lang: row.lang, title: row.title };
  if (row.kind === 'together' || row.kind === 'watch') {
    card.open = await shareRoomOpen(db, row, now);
    if (card.open) card.room = row.room_code!;
  }
  return card;
}

/** The cards of a conversation's messages, by message id. */
export async function threadShares(db: D1Database, threadId: string, now = Date.now()): Promise<Map<string, ShareCard>> {
  const rows = (await db.prepare(`SELECT * FROM message_shares WHERE thread_id = ?`).bind(threadId).all<ShareRow>()).results ?? [];
  const out = new Map<string, ShareCard>();
  for (const r of rows) out.set(r.message_id, await shareCard(db, r, now));
  return out;
}

/** A share checked and ready to store with its message. */
export interface PendingShare {
  kind: ShareKind; lang: ShareLang; title: string; code: string | null; roomCode: string | null; roomCreatedAt: number | null;
}

/**
 * The `share` of a send, checked: a copy's code (64 KB, personal details), or the Code together session
 * the sender is in now. `body` may be empty when a share comes with it. null `share` = an ordinary message.
 */
export async function prepareSend(
  db: D1Database, email: string, raw: { body?: unknown; share?: unknown }, now = Date.now(), kind: ThreadKind = 'students',
): Promise<{ ok: true; body: string; share: PendingShare | null } | { ok: false; status: number; body: Record<string, unknown> }> {
  if (raw.share == null) {
    const c = cleanMessage(raw.body);
    return 'error' in c ? { ok: false, status: 400, body: c } : { ok: true, body: c.body, share: null };
  }
  const sh = raw.share as Record<string, unknown>;
  if (typeof sh !== 'object' || (sh.kind !== 'copy' && sh.kind !== 'together' && sh.kind !== 'watch') || !isShareLang(sh.lang)) {
    return { ok: false, status: 400, body: { error: 'That program could not be sent.' } };
  }
  let body = '';
  if (typeof raw.body === 'string' && raw.body.trim()) {
    const c = cleanMessage(raw.body);
    if ('error' in c) return { ok: false, status: 400, body: c };
    body = c.body;
  }
  const t = cleanShareTitle(sh.title);
  if ('error' in t) return { ok: false, status: 400, body: t };
  if (sh.kind === 'copy') {
    const c = cleanShareCode(sh.code);
    if ('error' in c) return { ok: false, status: 400, body: c };
    return { ok: true, body, share: { kind: 'copy', lang: sh.lang, title: t.title, code: c.code, roomCode: null, roomCreatedAt: null } };
  }
  // An invitation goes to people, not to a whole class: a direct message or a group.
  if (kind === 'channel') return { ok: false, status: 400, body: { error: 'Invite people to a session in a direct message or a group, not in a channel. A copy can go anywhere.' } };
  const code = normalizeCode(sh.room);
  const room = code ? await getRoom(db, code) : null;
  const ended = { ok: false as const, status: 409, body: { error: 'That Code together session has ended, so it cannot be shared. Start a new one first.' } };
  if (!room || roomKind(room) !== 'code' || room.closed_at != null || room.expires_at <= now) return ended;
  if (room.game !== CODE_ROOM_GAMES[sh.lang]) return { ok: false, status: 400, body: { error: 'That session is for a different kind of program.' } };
  const seated = await db.prepare(`SELECT 1 AS x FROM game_room_players WHERE code = ? AND email = ? AND left_at IS NULL`)
    .bind(room.code, email).first();
  if (!seated) return { ok: false, status: 403, body: { error: 'You can only invite people to a Code together session you are in.' } };
  return { ok: true, body, share: { kind: sh.kind, lang: sh.lang, title: t.title, code: null, roomCode: room.code, roomCreatedAt: room.created_at } };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// ---- who may read a conversation, and the conversation as they see it -------------------------------

export interface Access {
  thread: ThreadRow;
  members: MemberRow[];
  cls: ClassInfo | null;
  /** The reader's role in the class now. */
  role: 'teacher' | 'student' | null;
  me: MemberRow | undefined;
  read: boolean;
  /** A teacher of the class (or an admin), on a conversation that is not a teacher's own two-person one. */
  moderate: boolean;
  /** Reading as a teacher of the class, not as one of its people (never for a channel). */
  onlooker: boolean;
}

/**
 * Who may read: a two-person conversation's two people (and, between two students, the class's
 * teachers); a group's members and the class's teachers; a channel, everyone in the class now.
 */
export async function threadAccess(db: D1Database, data: SessionData, id: string): Promise<Access | null> {
  const t = await threadWithMembers(db, id);
  if (!t) return null;
  const cls = await classInfo(db, t.thread.class_id);
  const role = cls ? await roleIn(db, cls, data.email) : null;
  const teacherOf = data.role === 'admin' || role === 'teacher';
  const me = t.members.find((m) => m.email === data.email);
  const kind = t.thread.kind;
  let read = false;
  let onlooker = false;
  if (kind === 'teacher') read = !!me;
  else if (kind === 'students' || kind === 'group') { read = !!me || teacherOf; onlooker = !me && teacherOf; }
  else if (kind === 'channel') read = !!role || data.role === 'admin';
  return { ...t, cls, role, me, read, moderate: teacherOf && kind !== 'teacher', onlooker };
}

/** A reader's row in a channel (it only holds what they have read), made the first time it is needed. */
export async function touchMember(db: D1Database, threadId: string, email: string, teacher: boolean): Promise<void> {
  const has = await db.prepare(`SELECT 1 AS x FROM message_members WHERE thread_id = ? AND email = ?`).bind(threadId, email).first();
  if (has) return;
  const name = await nameOf(db, email, teacher);
  await db.prepare(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, ?, ?, 0)`)
    .bind(threadId, email, name, teacher ? 1 : 0).run();
}

/** Why this reader may not post in it now, or null. */
export async function threadBlock(db: D1Database, a: Access, email: string): Promise<SendBlock> {
  const kind = a.thread.kind;
  if (!a.cls) return 'archived';
  if (kind === 'teacher' || kind === 'students') {
    const other = a.members.find((m) => m.email !== email);
    if (!a.me || !other) return 'not-member';
    return (await sendRule(db, a.cls, email, other.email)).why;
  }
  if (kind === 'group' && !a.me) return 'not-member';
  if (kind === 'channel' && a.thread.locked && a.role !== 'teacher') {
    if (a.cls.archived_at != null) return 'archived';
    return a.role ? 'locked' : 'left';
  }
  return postBlock(db, a.cls, email, a.role, 'peers');
}

/** How a conversation is named for this reader. */
function titleFor(a: Access, email: string): string {
  const kind = a.thread.kind;
  if (kind === 'channel') return a.thread.title;
  if (kind === 'group') return groupLabel(a.thread.title, a.members.filter((m) => m.email !== email).map((m) => m.name));
  if (a.onlooker) return a.members.map((m) => m.name).sort().join(' and ');
  return a.members.find((m) => m.email !== email)?.name ?? 'Someone';
}

/** The conversation as this reader sees it, or null when they may not read it. */
export async function threadView(db: D1Database, data: SessionData, threadId: string, given?: Access | null): Promise<ThreadView | null> {
  const a = given ?? await threadAccess(db, data, threadId);
  if (!a || !a.read) return null;
  const kind = a.thread.kind;
  const why = a.onlooker ? null : await threadBlock(db, a, data.email);
  const [rows, shares] = await Promise.all([threadMessages(db, threadId, THREAD_VIEW_LIMIT + 1), threadShares(db, threadId)]);
  const more = rows.length > THREAD_VIEW_LIMIT;
  const shown = more ? rows.slice(rows.length - THREAD_VIEW_LIMIT) : rows;
  const names = new Map(a.members.map((m) => [m.email, m]));
  // An author with no row (a channel poster before 0055 made rows on post): name them once.
  for (const r of shown) {
    if (!names.has(r.author_email)) names.set(r.author_email, { email: r.author_email, name: await nameOf(db, r.author_email), teacher: 0, read_at: 0 });
  }
  const messages: MessageItem[] = shown.map((r) => {
    const removed = r.deleted_at != null;
    return {
      id: r.id,
      mine: r.author_email === data.email,
      author: names.get(r.author_email)?.name ?? 'Someone',
      teacher: !!names.get(r.author_email)?.teacher,
      // A removed message's words and program go to the class's teachers only.
      body: removed && !a.moderate ? null : r.body,
      removed,
      at: r.created_at,
      share: removed && !a.moderate ? null : shares.get(r.id) ?? null,
    };
  });
  const title = titleFor(a, data.email);
  const other = kind === 'teacher' || kind === 'students'
    ? (() => { const o = a.members.find((m) => m.email !== data.email); return a.onlooker || !o ? { name: title, teacher: false } : { name: o.name, teacher: !!o.teacher }; })()
    : { name: title, teacher: false };
  let note: string | null = null;
  if (kind === 'students') note = WATCHED_NOTE;
  else if (kind === 'group') note = GROUP_NOTE;
  else if (kind === 'channel') note = channelNote(a.thread.class_name);
  const canSend = !a.onlooker && why === null;
  const isTeacher = a.role === 'teacher' || data.role === 'admin';
  const manage = kind === 'group' ? !!a.me && canSend
    : kind === 'channel' ? isTeacher || (a.thread.created_by === data.email && canSend)
    : false;
  let members: ThreadView['members'];
  if (kind === 'group') {
    const keys = await personKeys(db, a.members.map((m) => m.email));
    members = a.members.map((m) => ({ key: keys.get(m.email) ?? '', name: m.name, teacher: !!m.teacher, me: m.email === data.email }))
      .sort((x, y) => Number(y.teacher) - Number(x.teacher) || x.name.localeCompare(y.name));
  }
  const whyName = kind === 'channel' ? `#${a.thread.title}` : kind === 'group' ? title : other.name;
  return {
    id: a.thread.id,
    classId: a.thread.class_id,
    className: a.thread.class_name,
    kind,
    title,
    other,
    ...(members ? { members } : {}),
    ...(kind === 'channel' ? { locked: !!a.thread.locked } : {}),
    messages,
    more,
    canSend,
    why,
    whyText: a.onlooker ? 'You are reading this as a teacher of the class.' : blockText(why, whyName, a.thread.class_name),
    note,
    moderate: a.moderate,
    manage,
    onlooker: a.onlooker,
  };
}

/** The view after sending (the sender may always read what they just sent). */
export const memberView = (db: D1Database, data: SessionData, threadId: string) => threadView(db, data, threadId);

/** The caps on sending (a student only), or null when the message may go. */
export async function capRefusal(
  db: D1Database, data: SessionData, threadId: string | null, now = Date.now(), kind: ThreadKind = 'students',
): Promise<string | null> {
  if (threadId) {
    const cap = kind === 'channel' ? MESSAGES_PER_CHANNEL : MESSAGES_PER_THREAD;
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE thread_id = ?`).bind(threadId).first<{ n: number }>();
    if ((n?.n ?? 0) >= cap) {
      return kind === 'channel'
        ? `This channel has ${cap} messages, the most one can hold. Ask your teacher to start a new channel.`
        : `This conversation has ${cap} messages, the most one can hold.`;
    }
  }
  if (data.role !== 'student') return null;
  const [minute, day] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE author_email = ? AND created_at > ?`).bind(data.email, now - 60_000).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE author_email = ? AND created_at > ?`).bind(data.email, now - 86_400_000).first<{ n: number }>(),
  ]);
  if ((minute?.n ?? 0) >= MESSAGES_PER_MINUTE) return `You have sent ${MESSAGES_PER_MINUTE} messages in the last minute, the most for one minute. Wait a moment and try again.`;
  if ((day?.n ?? 0) >= MESSAGES_PER_DAY) return `You have sent ${MESSAGES_PER_DAY} messages today, the most for one day. You can send more tomorrow.`;
  return null;
}

export function newId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(16).padStart(2, '0')).join('');
}

/** Add a message (already cleaned and allowed), with its program if any, and mark the conversation read for its writer. */
export async function appendMessage(
  db: D1Database, email: string, threadId: string, body: string, now = Date.now(), share: PendingShare | null = null,
): Promise<void> {
  const id = newId();
  const steps = [
    db.prepare(`INSERT INTO messages (id, thread_id, author_email, body, created_at) VALUES (?, ?, ?, ?, ?)`).bind(id, threadId, email, body, now),
    db.prepare(`UPDATE message_threads SET last_at = MAX(last_at, ?) WHERE id = ?`).bind(now, threadId),
    db.prepare(`UPDATE message_members SET read_at = MAX(read_at, ?) WHERE thread_id = ? AND email = ?`).bind(now, threadId, email),
  ];
  if (share) {
    steps.push(db.prepare(
      `INSERT INTO message_shares (id, message_id, thread_id, author_email, kind, lang, title, code, room_code, room_created_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(newId(), id, threadId, email, share.kind, share.lang, share.title, share.code, share.roomCode, share.roomCreatedAt, now));
  }
  await db.batch(steps);
}

// ---- the mailbox list, groups and channels (migration 0055) -----------------------------------------

/** The live (not archived) classes a person is in now, as a student or a teacher. */
export async function liveClasses(db: D1Database, data: SessionData): Promise<{ id: string; teaches: boolean }[]> {
  const [asStudent, asTeacher] = await Promise.all([
    studentClassIds(db, data.email),
    data.role === 'student' ? Promise.resolve([] as string[]) : teacherClassIds(db, data.email),
  ]);
  const teaches = new Set(asTeacher);
  const ids = [...new Set([...asTeacher, ...asStudent])];
  if (!ids.length) return [];
  const live = new Set(((await db.prepare(`SELECT id FROM classes WHERE archived_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids).all<{ id: string }>()).results ?? []).map((r) => r.id));
  return ids.filter((id) => live.has(id)).map((id) => ({ id, teaches: teaches.has(id) }));
}

export const channelKey = (classId: string, name: string) => `channel|${classId}|${name}`;

/** Every class has #general: made the first time anyone in it looks. */
export async function ensureGeneral(db: D1Database, classIds: string[], now = Date.now()): Promise<void> {
  if (!classIds.length) return;
  await db.batch(classIds.map((c) => db.prepare(
    `INSERT OR IGNORE INTO message_threads (id, class_id, pair_key, kind, created_by, created_at, last_at, title) VALUES (?, ?, ?, 'channel', '', ?, 0, ?)`,
  ).bind(newId(), c, channelKey(c, GENERAL), now, GENERAL)));
}

/** How many conversations with something the person has not opened (two-person ones and groups; a channel is shown bold instead). */
export async function unreadCount(db: D1Database, email: string): Promise<number> {
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM message_members m JOIN message_threads t ON t.id = m.thread_id AND t.kind != 'channel'
      WHERE m.email = ?1 AND EXISTS (
        SELECT 1 FROM messages x WHERE x.thread_id = m.thread_id AND x.author_email != ?1
           AND x.created_at > m.read_at AND x.deleted_at IS NULL)`,
  ).bind(email).first<{ n: number }>();
  return r?.n ?? 0;
}

interface ListRow {
  id: string; class_id: string; class_name: string | null; kind: ThreadKind; title: string; locked: number; last_at: number;
  others: string | null; n: number;
  m_author: string | null; m_author_name: string | null; m_body: string | null; m_at: number | null; m_deleted: number | null;
  m_share_kind: ShareKind | null; m_share_title: string | null; unread: number;
}

const LAST = `x.author_email AS m_author,
            (SELECT a.name FROM message_members a WHERE a.thread_id = t.id AND a.email = x.author_email) AS m_author_name,
            x.body AS m_body, x.created_at AS m_at, x.deleted_at AS m_deleted, xs.kind AS m_share_kind, xs.title AS m_share_title`;
const LAST_JOIN = `LEFT JOIN messages x ON x.id = (SELECT y.id FROM messages y WHERE y.thread_id = t.id ORDER BY y.created_at DESC, y.rowid DESC LIMIT 1)
       LEFT JOIN message_shares xs ON xs.message_id = x.id`;

function summarize(r: ListRow, me: string): ThreadSummary {
  const others = (r.others ?? '').split('|').filter(Boolean).map((o) => { const i = o.lastIndexOf('~'); return { name: o.slice(0, i), teacher: o.slice(i + 1) === '1' }; });
  let title = r.title;
  let other = { name: r.title, teacher: false };
  if (r.kind === 'teacher' || r.kind === 'students') { other = others[0] ?? { name: 'Someone', teacher: false }; title = other.name; }
  else if (r.kind === 'group') { title = groupLabel(r.title, others.map((o) => o.name)); other = { name: title, teacher: false }; }
  return {
    id: r.id,
    classId: r.class_id,
    className: r.class_name ?? 'a class',
    kind: r.kind,
    title,
    other,
    ...(r.kind === 'group' ? { people: r.n } : {}),
    ...(r.kind === 'channel' ? { locked: !!r.locked } : {}),
    last: r.m_at == null ? null : {
      snippet: r.m_deleted != null ? '' : r.m_body || !r.m_share_kind ? snippetOf(r.m_body ?? '') : shareSnippet(r.m_share_kind, r.m_share_title ?? ''),
      mine: r.m_author === me,
      at: r.m_at,
      removed: r.m_deleted != null,
      ...(r.kind === 'group' || r.kind === 'channel' ? { author: r.m_author_name ?? 'Someone' } : {}),
    },
    unread: !!r.unread,
  };
}

/** The mailbox: two-person conversations and groups the person is in (newest first), and every channel of their live classes. */
export async function listThreads(db: D1Database, data: SessionData): Promise<ThreadSummary[]> {
  const me = data.email;
  const own = (await db.prepare(
    `SELECT t.id, t.class_id, c.name AS class_name, t.kind, t.title, t.locked, t.last_at,
            (SELECT GROUP_CONCAT(o.name || '~' || o.teacher, '|') FROM message_members o WHERE o.thread_id = t.id AND o.email != ?1) AS others,
            (SELECT COUNT(*) FROM message_members o WHERE o.thread_id = t.id) AS n,
            ${LAST},
            EXISTS (SELECT 1 FROM messages u WHERE u.thread_id = t.id AND u.author_email != ?1
                       AND u.created_at > m.read_at AND u.deleted_at IS NULL) AS unread
       FROM message_members m
       JOIN message_threads t ON t.id = m.thread_id AND t.kind != 'channel'
       LEFT JOIN classes c ON c.id = t.class_id
       ${LAST_JOIN}
      WHERE m.email = ?1
      ORDER BY t.last_at DESC LIMIT ?2`,
  ).bind(me, THREAD_LIST_LIMIT).all<ListRow>()).results ?? [];
  const classes = await liveClasses(db, data);
  let channels: ListRow[] = [];
  if (classes.length) {
    const ids = classes.map((c) => c.id);
    await ensureGeneral(db, ids);
    channels = (await db.prepare(
      `SELECT t.id, t.class_id, c.name AS class_name, t.kind, t.title, t.locked, t.last_at, NULL AS others, 0 AS n,
              ${LAST},
              EXISTS (SELECT 1 FROM messages u WHERE u.thread_id = t.id AND u.author_email != ?1
                         AND u.created_at > COALESCE(m.read_at, 0) AND u.deleted_at IS NULL) AS unread
         FROM message_threads t
         JOIN classes c ON c.id = t.class_id
         LEFT JOIN message_members m ON m.thread_id = t.id AND m.email = ?1
         ${LAST_JOIN}
        WHERE t.kind = 'channel' AND t.class_id IN (${ids.map((_, i) => `?${i + 2}`).join(',')})
        ORDER BY c.name, CASE WHEN t.title = 'general' THEN 0 ELSE 1 END, t.title`,
    ).bind(me, ...ids).all<ListRow>()).results ?? [];
  }
  return [...channels, ...own].map((r) => summarize(r, me));
}

/** Delete a conversation and everything in it (a channel or group a teacher deletes, a group nobody is left in). */
export async function deleteThread(db: D1Database, threadId: string): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM message_shares WHERE thread_id = ?`).bind(threadId),
    db.prepare(`DELETE FROM messages WHERE thread_id = ?`).bind(threadId),
    db.prepare(`DELETE FROM message_members WHERE thread_id = ?`).bind(threadId),
    db.prepare(`DELETE FROM message_threads WHERE id = ?`).bind(threadId),
  ]);
}
