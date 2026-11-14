// Messages (migration 0053): who is in a class, who may write to whom, and the public person ids.
// The rules are described in lib/messages-core.ts; this file is the only place they are decided.

import { ownerLabel } from './libraryShare';
import {
  MESSAGES_PER_DAY, MESSAGES_PER_MINUTE, MESSAGES_PER_THREAD, blockText, cleanMessage, cleanShareCode, cleanShareTitle,
  isShareLang,
  type MessageItem, type MessagePerson, type SendBlock, type ShareCard, type ShareKind, type ShareLang, type ThreadView,
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

export async function isMuted(db: D1Database, classId: string, email: string): Promise<boolean> {
  return !!(await db.prepare(`SELECT 1 AS x FROM class_message_mutes WHERE class_id = ? AND student_email = ?`).bind(classId, email).first());
}

/**
 * May `from` write to `to` in this class right now? kind is 'teacher' when either teaches the class.
 * Re-checked on every message, so a student who left, a class turned off or a mute takes effect at once.
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
  else if (fromRole === 'student' && toRole === 'student') {
    if (cls.student_messages_off) why = 'class-off';
    else if (await isMuted(db, cls.id, from)) why = 'muted';
  }
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
  id: string; class_id: string; kind: 'teacher' | 'students'; created_at: number; last_at: number; class_name: string;
}
export interface MemberRow { email: string; name: string; teacher: number; read_at: number }

export async function threadWithMembers(db: D1Database, id: string): Promise<{ thread: ThreadRow; members: MemberRow[] } | null> {
  const thread = await db.prepare(
    `SELECT t.id, t.class_id, t.kind, t.created_at, t.last_at, COALESCE(c.name, 'a class') AS class_name
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

export async function threadMessages(db: D1Database, threadId: string): Promise<MessageRow[]> {
  return (await db.prepare(
    `SELECT id, author_email, body, created_at, deleted_at FROM messages WHERE thread_id = ? ORDER BY created_at, rowid`,
  ).bind(threadId).all<MessageRow>()).results ?? [];
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
  db: D1Database, email: string, raw: { body?: unknown; share?: unknown }, now = Date.now(),
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

// ---- a conversation as one of its two people sees it, and sending into it ----------------------

/** The view for one of its two people, or null when the caller is not one of them. */
export async function memberView(db: D1Database, data: SessionData, threadId: string): Promise<ThreadView | null> {
  const t = await threadWithMembers(db, threadId);
  if (!t) return null;
  const me = t.members.find((m) => m.email === data.email);
  const other = t.members.find((m) => m.email !== data.email);
  if (!me || !other) return null;
  const cls = await classInfo(db, t.thread.class_id);
  let why: SendBlock = 'archived';
  if (cls) why = (await sendRule(db, cls, data.email, other.email)).why;
  const [rows, shares] = await Promise.all([threadMessages(db, threadId), threadShares(db, threadId)]);
  const names = new Map(t.members.map((m) => [m.email, m]));
  const messages: MessageItem[] = rows.map((r) => ({
    id: r.id,
    mine: r.author_email === data.email,
    author: names.get(r.author_email)?.name ?? 'Someone',
    teacher: !!names.get(r.author_email)?.teacher,
    body: r.deleted_at == null ? r.body : null,
    removed: r.deleted_at != null,
    at: r.created_at,
    // A removed message's program goes with it (GET /api/shares refuses it to the students too).
    share: r.deleted_at == null ? shares.get(r.id) ?? null : null,
  }));
  return {
    id: t.thread.id,
    classId: t.thread.class_id,
    className: t.thread.class_name,
    kind: t.thread.kind,
    other: { name: other.name, teacher: !!other.teacher },
    messages,
    canSend: why === null,
    why,
    whyText: blockText(why, other.name, t.thread.class_name),
  };
}

/** The caps on sending (a student only), or null when the message may go. */
export async function capRefusal(db: D1Database, data: SessionData, threadId: string | null, now = Date.now()): Promise<string | null> {
  if (threadId) {
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE thread_id = ?`).bind(threadId).first<{ n: number }>();
    if ((n?.n ?? 0) >= MESSAGES_PER_THREAD) return `This conversation has ${MESSAGES_PER_THREAD} messages, the most one can hold.`;
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
