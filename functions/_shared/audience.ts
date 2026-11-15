// Who a student's shared picture, sound, font or game goes to (migration 0057; spec
// codehs-review/ASSET-AUDIENCE-SPEC.md). Used by POST /api/library/[id]/share, POST /api/games/[id]/share,
// GET /api/audiences, the owner's lists, and the two places a class gains a teacher.
//
// A share is still one row per (item, class) in library_shares / library_game_shares, so every reader and every
// teacher-side hide is unchanged. A student picks WHICH classes get a row:
//   { classes: [id, ...] }  the classes they tick, each one they are in now;
//   { teacher: <key> }      every live class that teacher owns or co-teaches, including ones the student is not
//                           in (their students see it, nobody else does). Only a student may, and only for a
//                           teacher whose class they are in. The teacher is remembered (audience_teacher), so a
//                           class that teacher creates or co-teaches later gets the item as well.
// Nothing here ever sends an email: a teacher is a person key and a name, a class other than the caller's own is
// only counted.

import { studentClassIds, teacherClassIds } from './libraryShare';
import { emailForKey, personKeys, personLabel } from './messages';
import { ownerStatus, ownerStatusText, publishStatement, publicStates, unpublishStatement } from './publicShare';

import type { AudienceOptions, ItemAudience } from '../../lib/audience';
export type { AudienceOptions, AudienceSpec, ItemAudience } from '../../lib/audience';

export type AudienceKind = 'item' | 'game';

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };

const TABLES: Record<AudienceKind, { share: string; key: string; items: string }> = {
  item: { share: 'library_shares', key: 'item_id', items: 'library_items' },
  game: { share: 'library_game_shares', key: 'game_id', items: 'library_games' },
};

/** The live classes the caller may put something into: enrolled (a student) and, for a teacher or admin, taught too. */
export async function ownClassIds(db: D1Database, data: Session): Promise<string[]> {
  const enrolled = await studentClassIds(db, data.email);
  const taught = data.role === 'student' ? [] : await teacherClassIds(db, data.email);
  return [...new Set([...enrolled, ...taught])];
}

interface ClassRow { id: string; name: string; owner_email: string }

async function classRows(db: D1Database, ids: string[]): Promise<ClassRow[]> {
  const out: ClassRow[] = [];
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    out.push(...((await db.prepare(`SELECT id, name, owner_email FROM classes WHERE id IN (${part.map(() => '?').join(',')})`)
      .bind(...part).all<ClassRow>()).results ?? []));
  }
  return out;
}

async function teacherName(db: D1Database, email: string): Promise<string> {
  const st = await db.prepare(`SELECT first_name, last_name FROM students WHERE email = ?`)
    .bind(email).first<{ first_name: string | null; last_name: string | null }>();
  return personLabel(st?.first_name ?? null, st?.last_name ?? null, true);
}

/** What the picker offers this caller. */
export async function audienceOptions(db: D1Database, data: Session): Promise<AudienceOptions> {
  const ids = await ownClassIds(db, data);
  const rows = (await classRows(db, ids)).sort((a, b) => a.name.localeCompare(b.name));
  const owners = [...new Set(rows.map((r) => r.owner_email))];
  const keys = await personKeys(db, owners);
  const names = new Map<string, string>();
  for (const o of owners) names.set(o, await teacherName(db, o));
  const classes = rows.map((r) => ({ id: r.id, name: r.name, teacherKey: keys.get(r.owner_email) ?? '', teacherName: names.get(r.owner_email) ?? 'Teacher' }));
  // "Everyone" (migration 0058): open to someone in a class, unless a class switched it off.
  const own = await ownerStatus(db, data.email);
  const pub = own.ok ? { allowed: true } : { allowed: false, why: ownerStatusText(own) };
  if (data.role !== 'student') return { classes, teachers: [], public: pub };
  const teachers = [];
  for (const o of owners) {
    teachers.push({ key: keys.get(o) ?? '', name: names.get(o) ?? 'Teacher', classCount: (await teacherClassIds(db, o)).length });
  }
  return { classes, teachers: teachers.filter((t) => t.key), public: pub };
}

export type Resolved = { ok: true; classIds: string[]; teacherEmail: string | null; isPublic: boolean } | { ok: false; error: string; status: 400 | 409 };

/**
 * The classes a share request means. `spec` undefined or null is the old behaviour (every class the caller is
 * in), so a page from before this change still works. Anything else is checked: nobody shares into a class they
 * are not in, and "all of a teacher's classes" needs a class of that teacher.
 */
export async function resolveAudience(db: D1Database, data: Session, spec: unknown): Promise<Resolved> {
  const own = await ownClassIds(db, data);
  if (!own.length) {
    return {
      ok: false,
      status: 409,
      error: data.role === 'student'
        ? 'Join a class first: sharing puts this in your class' + "'" + 's Library.'
        : 'Make a class first: sharing puts this in the Library of every class you teach.',
    };
  }
  if (spec == null) return { ok: true, classIds: own, teacherEmail: null, isPublic: false };
  if (typeof spec !== 'object') return { ok: false, status: 400, error: 'Choose who to share with.' };
  const s = spec as { classes?: unknown; teacher?: unknown; public?: unknown };

  // "Everyone": live at once, and it also stays in ALL the owner's classes, which is where a pulled item falls back to.
  // The route checks the rest (a class switched it off, a teacher pulled it, the safety check) because it needs the item.
  if (s.public !== undefined) {
    if (s.public !== true) return { ok: false, status: 400, error: 'Choose who to share with.' };
    return { ok: true, classIds: own, teacherEmail: null, isPublic: true };
  }

  if (s.teacher !== undefined) {
    if (data.role !== 'student') return { ok: false, status: 400, error: 'Choose the classes to share with.' };
    if (typeof s.teacher !== 'string' || !/^p[0-9a-f]{20}$/.test(s.teacher)) return { ok: false, status: 400, error: 'Choose a teacher from the list.' };
    const email = await emailForKey(db, s.teacher);
    const mine = new Set((await classRows(db, own)).map((r) => r.owner_email));
    // Someone else's teacher, a made-up key and a missing one all read the same.
    if (!email || !mine.has(email)) return { ok: false, status: 400, error: 'You can only share with the classes of a teacher you have a class with.' };
    const ids = await teacherClassIds(db, email);
    if (!ids.length) return { ok: false, status: 400, error: 'That teacher has no classes to share with right now.' };
    return { ok: true, classIds: ids, teacherEmail: email, isPublic: false };
  }

  if (!Array.isArray(s.classes) || !s.classes.length || s.classes.length > 60 || !s.classes.every((c) => typeof c === 'string')) {
    return { ok: false, status: 400, error: 'Tick at least one class.' };
  }
  const want = [...new Set(s.classes as string[])];
  const ok = new Set(own);
  if (!want.every((c) => ok.has(c))) return { ok: false, status: 400, error: 'You can only share into classes you are in.' };
  return { ok: true, classIds: want, teacherEmail: null, isPublic: false };
}

/**
 * The writes that make an item's share rows exactly `r.classIds`: rows for other classes go, missing ones are
 * added, rows already there are left alone (so a share a teacher hid stays hidden), and the remembered teacher is
 * set or cleared. Sharing into several classes is one batch, so a half-changed audience cannot be left behind.
 */
export function audienceStatements(
  db: D1Database, kind: AudienceKind, id: string, owner: string, r: { classIds: string[]; teacherEmail: string | null; isPublic: boolean }, now = Date.now(),
): D1PreparedStatement[] {
  const t = TABLES[kind];
  const marks = r.classIds.map(() => '?').join(',');
  return [
    db.prepare(`DELETE FROM ${t.share} WHERE ${t.key} = ? AND class_id NOT IN (${marks})`).bind(id, ...r.classIds),
    ...r.classIds.map((c) => db.prepare(`INSERT OR IGNORE INTO ${t.share} (${t.key}, class_id, shared_at) VALUES (?, ?, ?)`).bind(id, c, now)),
    db.prepare(`UPDATE ${t.items} SET audience_teacher = ? WHERE id = ? AND owner_email = ?`).bind(r.teacherEmail, id, owner),
    // Public (migration 0058): on, or any live public row off; a PULLED row stays either way (the pull is sticky).
    r.isPublic ? publishStatement(db, kind, id, owner, now) : unpublishStatement(db, kind, id),
  ];
}

/** Stop sharing: every row goes and no teacher is remembered. */
export function unshareStatements(db: D1Database, kind: AudienceKind, id: string, owner: string): D1PreparedStatement[] {
  const t = TABLES[kind];
  return [
    db.prepare(`DELETE FROM ${t.share} WHERE ${t.key} = ?`).bind(id),
    db.prepare(`UPDATE ${t.items} SET audience_teacher = NULL WHERE id = ? AND owner_email = ?`).bind(id, owner),
    unpublishStatement(db, kind, id),
  ];
}

/**
 * How one item is shared right now, or null when it is not shared. A share request with no `audience` for an item
 * that already has one KEEPS it (a page that only changes "who may do what", or a tab open from before 0057, must
 * never widen a share the student narrowed); only an item with no share yet means "every class I am in".
 */
export async function currentAudience(db: D1Database, kind: AudienceKind, id: string, ownerClassIds: string[]): Promise<ItemAudience | null> {
  const t = await db.prepare(`SELECT audience_teacher FROM ${TABLES[kind].items} WHERE id = ?`).bind(id).first<{ audience_teacher: string | null }>();
  return (await audienceMap(db, kind, [{ id, audience_teacher: t?.audience_teacher ?? null }], ownerClassIds)).get(id) ?? null;
}

/**
 * How each of the owner's shared items reads: a teacher-wide one by that teacher's key, any other by the classes
 * the owner is in that hold it. `items` carry the stored `audience_teacher`. An item with no rows is not in the map.
 */
export async function audienceMap(
  db: D1Database, kind: AudienceKind, items: { id: string; audience_teacher: string | null }[], ownerClassIds: string[],
): Promise<Map<string, ItemAudience>> {
  const out = new Map<string, ItemAudience>();
  if (!items.length) return out;
  const t = TABLES[kind];
  const byItem = new Map<string, string[]>();
  for (let i = 0; i < items.length; i += 90) {
    const part = items.slice(i, i + 90).map((x) => x.id);
    const rows = (await db.prepare(`SELECT ${t.key} AS id, class_id FROM ${t.share} WHERE ${t.key} IN (${part.map(() => '?').join(',')})`)
      .bind(...part).all<{ id: string; class_id: string }>()).results ?? [];
    for (const r of rows) byItem.set(r.id, [...(byItem.get(r.id) ?? []), r.class_id]);
  }
  const teachers = [...new Set(items.map((x) => x.audience_teacher).filter((x): x is string => !!x))];
  const keys = teachers.length ? await personKeys(db, teachers) : new Map<string, string>();
  const mine = new Set(ownerClassIds);
  const pub = await publicStates(db, kind, items.map((x) => x.id));
  for (const it of items) {
    if (pub.get(it.id)?.live) { out.set(it.id, { kind: 'public' }); continue; }
    const rows = byItem.get(it.id);
    if (!rows?.length) continue;
    const key = it.audience_teacher ? keys.get(it.audience_teacher) : undefined;
    out.set(it.id, key
      ? { kind: 'teacher', teacher: key }
      : { kind: 'classes', classes: rows.filter((c) => mine.has(c)) });
  }
  return out;
}

/**
 * A class gained a teacher (it was just created, or a co-teacher was added): every item and game whose owner
 * chose "all of <that teacher>'s classes" joins it. Idempotent. The class's own teachers can hide any of them
 * as with any share.
 */
export function joinTeacherAudiences(db: D1Database, classId: string, teacherEmail: string, now = Date.now()): D1PreparedStatement[] {
  return [
    db.prepare(`INSERT OR IGNORE INTO library_shares (item_id, class_id, shared_at)
                SELECT id, ?1, ?2 FROM library_items WHERE audience_teacher = ?3 AND deleted_at IS NULL`).bind(classId, now, teacherEmail),
    db.prepare(`INSERT OR IGNORE INTO library_game_shares (game_id, class_id, shared_at)
                SELECT id, ?1, ?2 FROM library_games WHERE audience_teacher = ?3 AND deleted_at IS NULL`).bind(classId, now, teacherEmail),
  ];
}
