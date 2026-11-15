// "Everyone": the Public rung (migration 0058; spec codehs-review/ASSET-AUDIENCE-SPEC.md). Every rule about it is
// here and nowhere else, so a new reader cannot forget one.
//
//   WHO MAY SEE IT. A VETTED viewer: a student in a live class on this site, or a teacher or admin. NOT "any signed-in
//   account": signup is open (an email and a password), so that would be the open web. An approved sandbox guest (migration
//   0059, guests.ts) also counts: a teacher vouched for them. That is the one place the gate is decided (`viewerVetted`).
//   WHO MAY MAKE IT. A student in a live class, and only while no live class of theirs has public_sharing_off. It is
//   live at once. The same safety check messages use runs on its name (a game: its title and code too).
//   PULLING. A teacher of ANY class the owner is in takes it down (hidden_at, an optional short reason the student
//   reads). Sticky: the row stays, so the owner cannot make it public again until a teacher puts it back. The class
//   shares are untouched, so a pulled item falls back to the owner's classes. PUTTING BACK deletes the row: the owner
//   may choose Everyone again, but it is not public until they do.
//   WHAT A PUBLIC VIEWER GETS. Play, copy or remix if its choice allows, star. NOT comments, suggestions, proposed
//   changes or versions: those stay class-only (gameAccess refuses `viaPublic`, feedbackState finds no class).
//
// No email ever leaves this file: owners are first name + last initial.

import { studentClassIds, teacherClassIds, ownerLabel } from './libraryShare';
import { isApprovedGuest } from './guests';
import { findPII } from '../../lib/pii-check';
import { piiWhat } from '../../lib/messages-core';
import { pulledText } from '../../lib/audience';
import { PROVENANCE_COLUMNS, type ProvenanceRow } from '../../lib/share-choice';
import type { PublicNotice } from '../../lib/game-notices-core';

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
export type PublicKind = 'item' | 'game';
export const PUBLIC_REASON_MAX = 140;

// ---- the gate --------------------------------------------------------------------------------------------

/**
 * May this person see Public? Teachers and admins; a student in at least one live class; an approved sandbox guest
 * (migration 0059: a teacher already vouched for them, which is what "vetted" means here).
 */
export async function viewerVetted(db: D1Database, data: Session, now = Date.now()): Promise<boolean> {
  if (data.role === 'admin' || data.role === 'teacher') return true;
  if ((await studentClassIds(db, data.email, now)).length > 0) return true;
  return isApprovedGuest(db, data.email, now);
}

/**
 * SQL: the email in `col` may have public things right now. A teacher or admin always; a student needs a live class
 * (enrolled, not expired, not archived) and NONE of their live classes with public_sharing_off. `now` is interpolated as
 * an integer (it is never user input).
 */
export function ownerOkSql(col: string, now: number): string {
  const n = Math.trunc(now);
  return `((EXISTS (SELECT 1 FROM students po_s WHERE po_s.email = ${col} AND po_s.role IN ('teacher', 'admin'))
           OR EXISTS (SELECT 1 FROM enrollments po_e JOIN classes po_c ON po_c.id = po_e.class_id
                       WHERE po_e.student_email = ${col} AND po_e.expires_at > ${n} AND po_c.archived_at IS NULL))
          AND NOT EXISTS (SELECT 1 FROM enrollments po_e2 JOIN classes po_c2 ON po_c2.id = po_e2.class_id
                           WHERE po_e2.student_email = ${col} AND po_e2.expires_at > ${n} AND po_c2.archived_at IS NULL
                             AND po_c2.public_sharing_off = 1))`;
}

export type OwnerStatus = { ok: true } | { ok: false; why: 'no-class' } | { ok: false; why: 'class-off'; className: string };

/** May this owner make something public now, and if not, why (for the sentence they read). */
export async function ownerStatus(db: D1Database, email: string, now = Date.now()): Promise<OwnerStatus> {
  const st = await db.prepare(`SELECT role FROM students WHERE email = ?`).bind(email).first<{ role: string }>();
  if (st?.role === 'teacher' || st?.role === 'admin') return { ok: true };
  const rows = (await db.prepare(
    `SELECT c.name, c.public_sharing_off AS off FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
  ).bind(email, now).all<{ name: string; off: number }>()).results ?? [];
  if (!rows.length) return { ok: false, why: 'no-class' };
  const off = rows.find((r) => r.off);
  return off ? { ok: false, why: 'class-off', className: off.name } : { ok: true };
}

export function ownerStatusText(s: Exclude<OwnerStatus, { ok: true }>): string {
  return s.why === 'no-class'
    ? 'Everyone sharing is for people in a class. Join a class first.'
    : `Your teacher has turned off sharing with everyone in ${s.className}.`;
}

// ---- one item's public state -----------------------------------------------------------------------------

export interface PublicState {
  /** Live now: not pulled. (It may still be dark if the owner is blocked; that is ownerOkSql's business.) */
  live: boolean;
  pulled: { reason: string | null; at: number } | null;
}

export async function publicState(db: D1Database, kind: PublicKind, id: string): Promise<PublicState | null> {
  const r = await db.prepare(`SELECT hidden_at, hidden_reason FROM public_shares WHERE kind = ? AND id = ?`)
    .bind(kind, id).first<{ hidden_at: number | null; hidden_reason: string | null }>();
  if (!r) return null;
  return r.hidden_at == null ? { live: true, pulled: null } : { live: false, pulled: { reason: r.hidden_reason, at: r.hidden_at } };
}

/** States for many ids at once (the owner's lists). */
export async function publicStates(db: D1Database, kind: PublicKind, ids: string[]): Promise<Map<string, PublicState>> {
  const out = new Map<string, PublicState>();
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    if (!part.length) continue;
    const rows = (await db.prepare(
      `SELECT id, hidden_at, hidden_reason FROM public_shares WHERE kind = ? AND id IN (${part.map(() => '?').join(',')})`,
    ).bind(kind, ...part).all<{ id: string; hidden_at: number | null; hidden_reason: string | null }>()).results ?? [];
    for (const r of rows) {
      out.set(r.id, r.hidden_at == null ? { live: true, pulled: null } : { live: false, pulled: { reason: r.hidden_reason, at: r.hidden_at } });
    }
  }
  return out;
}

/** Make it public; a row that already exists (live, or pulled) is left exactly as it is. */
export function publishStatement(db: D1Database, kind: PublicKind, id: string, owner: string, now = Date.now()): D1PreparedStatement {
  return db.prepare(`INSERT INTO public_shares (kind, id, owner_email, shared_at) VALUES (?, ?, ?, ?) ON CONFLICT (kind, id) DO NOTHING`)
    .bind(kind, id, owner, now);
}

/** The owner narrows or stops: a live row goes; a PULLED row stays, so the pull cannot be undone by narrowing. */
export function unpublishStatement(db: D1Database, kind: PublicKind, id: string): D1PreparedStatement {
  return db.prepare(`DELETE FROM public_shares WHERE kind = ? AND id = ? AND hidden_at IS NULL`).bind(kind, id);
}

// ---- the safety check ------------------------------------------------------------------------------------

/** Plain-words refusal when a thing about to go public carries personal details, else null. */
export function publicSafetyProblem(what: 'picture' | 'sound' | 'font' | 'game', texts: string[]): string | null {
  for (const t of texts) {
    const label = t ? findPII(t) : null;
    if (label) {
      return `This ${what} looks like it has ${piiWhat(label)} in it, so it was not shared with everyone. Take it out first, or share it with your classes only.`;
    }
  }
  return null;
}

/** A pull's reason: one line, at most PUBLIC_REASON_MAX characters, or empty. */
export function cleanReason(raw: unknown): { reason: string | null } | { error: string } {
  if (raw == null || raw === '') return { reason: null };
  if (typeof raw !== 'string') return { error: 'The reason has to be words.' };
  const reason = raw.replace(/\s+/g, ' ').trim();
  if (!reason) return { reason: null };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(reason)) return { error: 'That reason has special characters in it. Type it again in plain words.' };
  if ([...reason].length > PUBLIC_REASON_MAX) return { error: `A reason is at most ${PUBLIC_REASON_MAX} characters.` };
  return { reason };
}

/**
 * Everything that must hold before something is made public, for the two share routes: the owner is in a class and no
 * class switched it off, a teacher has not pulled it (sticky), and the safety check on its words. Null = go ahead.
 */
export async function publicShareProblem(
  db: D1Database, owner: string, kind: PublicKind, id: string, what: 'picture' | 'sound' | 'font' | 'game', texts: string[], now = Date.now(),
): Promise<{ status: 400 | 403; error: string } | null> {
  const own = await ownerStatus(db, owner, now);
  if (!own.ok) return { status: 403, error: ownerStatusText(own) };
  const st = await publicState(db, kind, id);
  if (st?.pulled) return { status: 403, error: pulledText(st.pulled) + ' It stays with your classes until a teacher puts it back.' };
  const pii = publicSafetyProblem(what, texts);
  if (pii) return { status: 400, error: pii };
  return null;
}

// ---- what the page lists ---------------------------------------------------------------------------------

export interface PublicItemRow {
  id: string; kind: 'texture' | 'sound' | 'font'; name: string; bytes: number; owner_email: string;
  first_name: string | null; last_name: string | null; shared_at: number; share_choice: string | null;
}
export interface PublicGameRow extends ProvenanceRow {
  id: string; title: string; mode: string; players: number; bytes: number; owner_email: string;
  first_name: string | null; last_name: string | null; shared_at: number; updated_at: number; share_choice: string | null;
}

export async function publicItems(db: D1Database, now = Date.now()): Promise<PublicItemRow[]> {
  return (await db.prepare(
    `SELECT i.id, i.kind, i.name, i.bytes, i.owner_email, st.first_name, st.last_name, p.shared_at, i.share_choice
       FROM public_shares p JOIN library_items i ON i.id = p.id AND i.deleted_at IS NULL
       LEFT JOIN students st ON st.email = i.owner_email
      WHERE p.kind = 'item' AND p.hidden_at IS NULL AND ${ownerOkSql('p.owner_email', now)}
      ORDER BY p.shared_at DESC LIMIT 300`,
  ).all<PublicItemRow>()).results ?? [];
}

export async function publicGames(db: D1Database, now = Date.now()): Promise<PublicGameRow[]> {
  return (await db.prepare(
    `SELECT g.id, g.title, g.mode, g.players, LENGTH(g.code) AS bytes, g.owner_email, st.first_name, st.last_name,
            p.shared_at, g.updated_at, g.share_choice, ${PROVENANCE_COLUMNS.split(', ').map((c) => 'g.' + c).join(', ')}
       FROM public_shares p JOIN library_games g ON g.id = p.id AND g.deleted_at IS NULL
       LEFT JOIN students st ON st.email = g.owner_email
      WHERE p.kind = 'game' AND p.hidden_at IS NULL AND ${ownerOkSql('p.owner_email', now)}
      ORDER BY p.shared_at DESC LIMIT 300`,
  ).all<PublicGameRow>()).results ?? [];
}

/** One public item a vetted viewer may open (null = not public, pulled, owner blocked, or deleted). */
export async function publicItemRow(db: D1Database, id: string, now = Date.now()): Promise<PublicItemRow | null> {
  return db.prepare(
    `SELECT i.id, i.kind, i.name, i.bytes, i.owner_email, st.first_name, st.last_name, p.shared_at, i.share_choice
       FROM public_shares p JOIN library_items i ON i.id = p.id AND i.deleted_at IS NULL
       LEFT JOIN students st ON st.email = i.owner_email
      WHERE p.kind = 'item' AND p.id = ? AND p.hidden_at IS NULL AND ${ownerOkSql('p.owner_email', now)}`,
  ).bind(id).first<PublicItemRow>();
}

/** Is this game public and open to a vetted viewer right now (live row, owner allowed, not deleted)? */
export async function gameIsPublic(db: D1Database, gameId: string, now = Date.now()): Promise<boolean> {
  const r = await db.prepare(
    `SELECT 1 AS x FROM public_shares p JOIN library_games g ON g.id = p.id AND g.deleted_at IS NULL
      WHERE p.kind = 'game' AND p.id = ? AND p.hidden_at IS NULL AND ${ownerOkSql('p.owner_email', now)}`,
  ).bind(gameId).first();
  return !!r;
}

/** The ids of the author's items that are public now (what a public game may bring with it). */
export async function publicItemIdsOf(db: D1Database, owner: string, now = Date.now()): Promise<Set<string>> {
  const rows = (await db.prepare(
    `SELECT p.id FROM public_shares p JOIN library_items i ON i.id = p.id AND i.deleted_at IS NULL
      WHERE p.kind = 'item' AND p.owner_email = ? AND p.hidden_at IS NULL AND ${ownerOkSql('p.owner_email', now)}`,
  ).bind(owner).all<{ id: string }>()).results ?? [];
  return new Set(rows.map((r) => r.id));
}

// ---- teachers --------------------------------------------------------------------------------------------

/** The class (one the caller manages) that holds this owner now, or null: that is what lets a teacher pull their work. */
export async function classManagingOwner(db: D1Database, data: Session, owner: string, now = Date.now()): Promise<string | null> {
  if (data.role === 'student') return null;
  const mine = data.role === 'admin'
    ? null
    : await teacherClassIds(db, data.email);
  const rows = (await db.prepare(
    `SELECT e.class_id FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
  ).bind(owner, now).all<{ class_id: string }>()).results ?? [];
  const hit = rows.find((r) => mine === null || mine.includes(r.class_id));
  return hit ? hit.class_id : null;
}

export interface ClassPublicRow {
  kind: PublicKind; id: string; what: 'picture' | 'sound' | 'font' | 'game'; name: string; owner: string;
  sharedAt: number; pulled: { reason: string | null; at: number } | null;
}

const WHAT: Record<string, ClassPublicRow['what']> = { texture: 'picture', sound: 'sound', font: 'font' };

/** What this class's students have made public (live and pulled), newest first. */
export async function classPublicRows(db: D1Database, classId: string, now = Date.now()): Promise<ClassPublicRow[]> {
  const rows = (await db.prepare(
    `SELECT p.kind, p.id, p.shared_at, p.hidden_at, p.hidden_reason, i.kind AS item_kind,
            CASE p.kind WHEN 'item' THEN i.name ELSE g.title END AS name, st.first_name, st.last_name
       FROM public_shares p
       JOIN enrollments e ON e.class_id = ?1 AND e.student_email = p.owner_email AND e.expires_at > ?2
       LEFT JOIN library_items i ON p.kind = 'item' AND i.id = p.id AND i.deleted_at IS NULL
       LEFT JOIN library_games g ON p.kind = 'game' AND g.id = p.id AND g.deleted_at IS NULL
       LEFT JOIN students st ON st.email = p.owner_email
      WHERE i.id IS NOT NULL OR g.id IS NOT NULL
      ORDER BY p.shared_at DESC LIMIT 100`,
  ).bind(classId, now).all<{
    kind: PublicKind; id: string; shared_at: number; hidden_at: number | null; hidden_reason: string | null; item_kind: string | null;
    name: string; first_name: string | null; last_name: string | null;
  }>()).results ?? [];
  return rows.map((r) => ({
    kind: r.kind, id: r.id, what: r.kind === 'game' ? 'game' : WHAT[r.item_kind ?? ''] ?? 'picture', name: r.name,
    owner: ownerLabel(r.first_name, r.last_name), sharedAt: r.shared_at,
    pulled: r.hidden_at == null ? null : { reason: r.hidden_reason, at: r.hidden_at },
  }));
}

export async function pullPublic(db: D1Database, kind: PublicKind, id: string, by: string, reason: string | null, now = Date.now()): Promise<boolean> {
  const r = await db.prepare(`UPDATE public_shares SET hidden_at = ?, hidden_by = ?, hidden_reason = ? WHERE kind = ? AND id = ? AND hidden_at IS NULL`)
    .bind(now, by, reason, kind, id).run();
  return !!r.meta.changes;
}

/**
 * A teacher puts a pulled thing back. This gives back the PERMISSION, not the publication: the row is deleted, so it is
 * not public until the owner chooses Everyone again. (Flipping hidden_at back would republish something the owner may
 * have narrowed to their classes since the pull, against their current choice.)
 */
export async function restorePublic(db: D1Database, kind: PublicKind, id: string): Promise<boolean> {
  const r = await db.prepare(`DELETE FROM public_shares WHERE kind = ? AND id = ? AND hidden_at IS NOT NULL`).bind(kind, id).run();
  return !!r.meta.changes;
}

// ---- the Activity feed (components/NotificationBell.tsx) -------------------------------------------------

export const PUBLIC_NOTICE_DAYS = 14;
export const PUBLIC_NOTICE_LIMIT = 20;

/**
 * Teachers: what their classes' students made public in the last two weeks ("Ana L. made Maze Runner public", opens
 * the class list). Anyone who owns something a teacher pulled: "Your teacher took it down" with the reason.
 */
export async function publicNotices(db: D1Database, data: Session, now = Date.now()): Promise<PublicNotice[]> {
  const out: PublicNotice[] = [];
  const since = now - PUBLIC_NOTICE_DAYS * 86_400_000;

  if (data.role === 'teacher') {
    const classes = await teacherClassIds(db, data.email);
    if (classes.length) {
      const marks = classes.map((_, i) => `?${i + 3}`).join(',');
      const rows = (await db.prepare(
        `SELECT p.kind, p.id, p.shared_at, MIN(e.class_id) AS class_id, i.kind AS item_kind,
                CASE p.kind WHEN 'item' THEN i.name ELSE g.title END AS name, st.first_name, st.last_name
           FROM public_shares p
           JOIN enrollments e ON e.student_email = p.owner_email AND e.expires_at > ?1 AND e.class_id IN (${marks})
           LEFT JOIN library_items i ON p.kind = 'item' AND i.id = p.id AND i.deleted_at IS NULL
           LEFT JOIN library_games g ON p.kind = 'game' AND g.id = p.id AND g.deleted_at IS NULL
           LEFT JOIN students st ON st.email = p.owner_email
          WHERE p.hidden_at IS NULL AND p.shared_at > ?2 AND (i.id IS NOT NULL OR g.id IS NOT NULL)
          GROUP BY p.kind, p.id
          ORDER BY p.shared_at DESC LIMIT ${PUBLIC_NOTICE_LIMIT}`,
      ).bind(now, since, ...classes).all<{
        kind: PublicKind; id: string; shared_at: number; class_id: string; item_kind: string | null; name: string;
        first_name: string | null; last_name: string | null;
      }>()).results ?? [];
      for (const r of rows) {
        out.push({
          kind: 'public', key: `public:${r.kind}:${r.id}`, what: r.kind === 'game' ? 'game' : WHAT[r.item_kind ?? ''] ?? 'picture',
          title: r.name, who: ownerLabel(r.first_name, r.last_name), pulled: false, classId: r.class_id, snippet: '', at: r.shared_at,
        });
      }
    }
  }

  // Mine that a teacher pulled, so the student is told in the app (no email service).
  const mine = (await db.prepare(
    `SELECT p.kind, p.id, p.hidden_at, p.hidden_reason, i.kind AS item_kind,
            CASE p.kind WHEN 'item' THEN i.name ELSE g.title END AS name
       FROM public_shares p
       LEFT JOIN library_items i ON p.kind = 'item' AND i.id = p.id AND i.deleted_at IS NULL
       LEFT JOIN library_games g ON p.kind = 'game' AND g.id = p.id AND g.deleted_at IS NULL
      WHERE p.owner_email = ? AND p.hidden_at IS NOT NULL AND p.hidden_at > ? AND (i.id IS NOT NULL OR g.id IS NOT NULL)
      ORDER BY p.hidden_at DESC LIMIT ${PUBLIC_NOTICE_LIMIT}`,
  ).bind(data.email, now - 30 * 86_400_000).all<{
    kind: PublicKind; id: string; hidden_at: number; hidden_reason: string | null; item_kind: string | null; name: string;
  }>()).results ?? [];
  for (const r of mine) {
    out.push({
      kind: 'public', key: `public:${r.kind}:${r.id}:pulled`, what: r.kind === 'game' ? 'game' : WHAT[r.item_kind ?? ''] ?? 'picture',
      title: r.name, who: 'Your teacher', pulled: true, snippet: r.hidden_reason ?? '', at: r.hidden_at,
    });
  }
  return out.sort((a, b) => b.at - a.at);
}
