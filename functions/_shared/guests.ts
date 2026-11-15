// Guests (migration 0059; spec codehs-review/GUEST-COLLAB-SPEC.md): a student invites an account holder into their
// sandbox sessions, a teacher approves. Every rule is here, so a reader cannot forget one.
//
//   WHAT A GUEST IS. An existing account plus an APPROVED row in sandbox_guests. NOT an enrollment: they are on no roster,
//   in no gradebook, no classPeople(), no channel, no message. The sandbox itself was never gated on lessons; what a person
//   with no class lacks is the class-bound features, and a guest gets exactly two narrow bridges:
//     1. joining Code together sessions and game rooms their HOST starts (rooms.ts mayJoin asks isApprovedGuestOf), and
//     2. counting as a vetted viewer of Everyone (publicShare.ts viewerVetted asks isApprovedGuest).
//   They cannot host, message, share into a class, or make anything public.
//   WHO DECIDES. A teacher of the host's vouching class (owner, co-teacher) or an admin. A teacher of that class needs no
//   guest row at all: they already pass mayJoin.
//   WHEN IT HOLDS. Approved, not past ends_at (the school year's cutoff), the vouching class not archived and not switched
//   off (classes.guests_off), and the host still enrolled in it (a host who leaves the class takes their guests with them).
//   ENDING IT (the host, the guest or a teacher) also drops the guest's seats in running sessions at once
//   (guestSeats.ts closeGuestSeats: D1, then the live room's existing `leave` control), so a revoke is not just for next time.
//   This file imports neither rooms.ts nor live.ts (rooms.ts mayJoin imports THIS), so there is no import cycle.
//
// The page never gets an email except in the TEACHER's list, where it is the main thing an approval turns on: signup has no
// email verification, so who someone is rests on the teacher's judgement of the address and the host's own words.

import { ownerLabel, studentClassIds, teacherClassIds } from './libraryShare';
import { findPII } from '../../lib/pii-check';
import { piiWhat } from '../../lib/messages-core';
import type { GuestNotice } from '../../lib/game-notices-core';

export type GuestStatus = 'invited' | 'pending' | 'approved' | 'declined' | 'revoked';

/** Guests a student may have at once (invited, waiting or approved). */
export const MAX_GUESTS_PER_HOST = 3;
/** Guests waiting for a decision in one class. */
export const MAX_PENDING_PER_CLASS = 20;
/** How long an unused code works. */
export const INVITE_TTL_MS = 7 * 24 * 3600_000;
export const RELATION_MAX = 60;
export const CODE_LEN = 8;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };

export interface GuestRow {
  id: string; host_email: string; class_id: string; guest_email: string | null; code: string; relation: string;
  status: GuestStatus; invited_at: number; expires_at: number; redeemed_at: number | null;
  decided_by: string | null; decided_at: number | null; ends_at: number | null;
  // migration 0061 (a school email as proof)
  guest_name: string; guest_age: string; guest_org: string; guest_purpose: string; // migration 0062
  school_email: string | null; school_phrase: string | null; school_phrase_at: number | null; school_tries: number; school_verified_at: number | null;
}

// ---- a school email as proof (migration 0061) ------------------------------------------------------------------
//
// The site never sends mail. A class that requires it keeps a list of school domains; the guest names a school address on one of
// them; the TEACHER'S card shows a one-time phrase; the teacher emails it from their school account to that address; the guest types
// it back (POST /api/guests/verify). Only someone who can read that inbox has it. The teacher's approval is still the gate after.

/** How long a phrase lives, and how many wrong ones before it is cleared (a teacher makes a new one). */
export const SCHOOL_PHRASE_TTL_MS = 7 * 24 * 3600_000;
export const MAX_PHRASE_TRIES = 5;
export const MAX_SCHOOL_DOMAINS = 10;
export const SCHOOL_PHRASE_PREFIX = 'shcode-';
const PHRASE_LEN = 6;

/** Public mail services: a class listing one would let anyone in, so they are refused as school domains. */
const PUBLIC_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com',
  'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com',
]);
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** A teacher's list of school domains, typed as one box ("chicousd.net, student.chicousd.net"): tidied, or a plain reason. */
export function cleanSchoolDomains(raw: unknown): { domains: string[] } | { error: string } {
  const parts = (Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(/[\s,;]+/))
    .map((p) => p.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
  const domains = [...new Set(parts)];
  if (domains.length > MAX_SCHOOL_DOMAINS) return { error: `List at most ${MAX_SCHOOL_DOMAINS} school domains.` };
  for (const d of domains) {
    if (d.length > 100 || !DOMAIN_RE.test(d)) return { error: `"${d}" is not a domain. Type it like yourschool.org (no @, no spaces).` };
    if (PUBLIC_MAIL.has(d)) return { error: `${d} is a public mail service anyone can sign up for. List your school's own domain.` };
  }
  return { domains };
}

export const parseDomainList = (stored: string | null | undefined): string[] => (stored ?? '').split(',').map((d) => d.trim()).filter(Boolean);

/** Is this address on one of the domains (the domain itself or a subdomain of it)? */
export function onSchoolDomain(email: string, domains: string[]): boolean {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const host = email.slice(at + 1);
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** A school address as typed: lower case, one address, on a listed domain, or a plain reason. */
export function cleanSchoolEmail(raw: unknown, domains: string[]): { email: string } | { error: string } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'This class needs your school email. Type it in.' };
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/.test(email)) return { error: 'That does not look like an email address.' };
  if (!onSchoolDomain(email, domains)) {
    return { error: `That is not a school address this class accepts. It has to end in ${domains.map((d) => `@${d}`).join(' or ')}.` };
  }
  return { email };
}

const PHRASE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newSchoolPhrase(): string {
  const bytes = new Uint8Array(PHRASE_LEN);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PHRASE_ALPHABET[b % PHRASE_ALPHABET.length]).join('');
}

/** What the guest typed, as the 6 stored characters: any case, with or without "shcode-" and spaces; null if it cannot be one. */
export function normalizeSchoolPhrase(raw: unknown): string | null {
  let p = String(raw ?? '').toUpperCase().replace(/[\s_]/g, '');
  if (p.startsWith('SHCODE')) p = p.slice(6).replace(/^-/, '');
  p = p.replace(/-/g, '');
  return p.length === PHRASE_LEN && [...p].every((ch) => PHRASE_ALPHABET.includes(ch)) ? p : null;
}

export type SchoolState = 'none' | 'need-address' | 'need-phrase' | 'locked' | 'verified';

/**
 * Where a waiting request stands on the school-email proof. 'none' = this class does not ask for one. 'need-phrase' = the teacher's
 * card holds a live phrase for the guest to type back; 'locked' = the phrase ran out or was guessed at too often, and a teacher has to
 * make a new one.
 */
export function schoolState(required: boolean, row: Pick<GuestRow, 'school_email' | 'school_phrase' | 'school_phrase_at' | 'school_verified_at'>, now = Date.now()): SchoolState {
  if (row.school_verified_at) return 'verified';
  if (!required) return 'none';
  if (!row.school_email) return 'need-address';
  if (row.school_phrase && row.school_phrase_at != null && row.school_phrase_at + SCHOOL_PHRASE_TTL_MS > now) return 'need-phrase';
  return 'locked';
}

/** Backstop: a phrase older than its life is deleted wherever it is read, so none outlives 7 days sitting in the table. */
export async function clearOldPhrases(db: D1Database, now = Date.now()): Promise<void> {
  await db.prepare(`UPDATE sandbox_guests SET school_phrase = NULL WHERE school_phrase IS NOT NULL AND (school_phrase_at IS NULL OR school_phrase_at <= ?)`)
    .bind(now - SCHOOL_PHRASE_TTL_MS).run();
}

export function newGuestCode(): string {
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** A code as typed: upper-cased, spaces and dashes dropped; null unless it is CODE_LEN safe characters. */
export function normalizeGuestCode(raw: unknown): string | null {
  const c = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  return c.length === CODE_LEN && [...c].every((ch) => CODE_ALPHABET.includes(ch)) ? c : null;
}

export function newGuestId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(16).padStart(2, '0')).join('');
}

/** The host's own words for who this is: one line, at most RELATION_MAX characters, checked for personal details. */
export function cleanRelation(raw: unknown): { relation: string } | { error: string } {
  if (raw == null || raw === '') return { relation: '' };
  if (typeof raw !== 'string') return { error: 'Say who this is in a few words.' };
  const relation = raw.replace(/\s+/g, ' ').trim();
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(relation)) return { error: 'That has special characters in it. Type it again in plain words.' };
  if ([...relation].length > RELATION_MAX) return { error: `Say who this is in at most ${RELATION_MAX} characters.` };
  const pii = findPII(relation);
  if (pii) return { error: `That looks like it has ${piiWhat(pii)} in it. Say who they are without it (like "my cousin" or "a friend from robotics club").` };
  return { relation };
}

// ---- what the host says about their guest (migration 0062) ---------------------------------------------------

export const GUEST_NAME_MAX = 60;
export const GUEST_ORG_MAX = 80;
export const GUEST_PURPOSE_MAX = 120;
export type GuestAge = 'teen' | 'adult';
export const GUEST_AGE_LABEL: Record<GuestAge, string> = { teen: '13 to 17', adult: '18 or older' };

export interface GuestDetails { name: string; relation: string; age: GuestAge; org: string; purpose: string }

function oneLine(raw: unknown, ask: string, label: string, min: number, max: number, example: string): { text: string } | { error: string } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: `Tell your teacher ${ask}.` };
  const text = raw.replace(/\s+/g, ' ').trim();
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(text)) return { error: `The ${label} has special characters in it. Type it again in plain words.` };
  const len = [...text].length;
  if (len < min) return { error: `Say a little more for the ${label} (at least ${min} characters).` };
  if (len > max) return { error: `Keep the ${label} to ${max} characters or fewer.` };
  const pii = findPII(text);
  if (pii) return { error: `The ${label} looks like it has ${piiWhat(pii)} in it. Leave it out (${example}).` };
  return { text };
}

/**
 * Everything a teacher needs to decide on a guest, from the host: their full name (first and last), who they are to the host, an age
 * group, where they go to school or work, and what they will do together. All required, in the host's own words, none of it a
 * phone, email or street address (findPII). A guest has to be 13 or older: under 13 is refused with a reason, never stored.
 */
export function cleanGuestDetails(body: { name?: unknown; relation?: unknown; age?: unknown; org?: unknown; purpose?: unknown }): GuestDetails | { error: string } {
  const name = oneLine(body.name, 'their full name', 'name', 3, GUEST_NAME_MAX, 'just the name');
  if ('error' in name) return name;
  if (name.text.split(' ').filter((w) => /\p{L}/u.test(w)).length < 2) return { error: 'Type their first and last name, so your teacher can tell who it is.' };
  if (!/^[\p{L}][\p{L} .'’-]*$/u.test(name.text)) return { error: 'A name is letters, spaces and dashes only.' };
  const rel = oneLine(body.relation, 'who they are to you', 'relationship', 2, RELATION_MAX, 'like "my cousin" or "a friend from robotics club"');
  if ('error' in rel) return rel;
  if (body.age === 'under13') return { error: 'Guests have to be 13 or older.' };
  if (body.age !== 'teen' && body.age !== 'adult') return { error: 'Choose how old they are: 13 to 17, or 18 or older.' };
  const org = oneLine(body.org, 'where they go to school or work', 'school or work', 2, GUEST_ORG_MAX, 'just the name of the school or place');
  if ('error' in org) return org;
  const purpose = oneLine(body.purpose, 'what you will do together', 'plan', 5, GUEST_PURPOSE_MAX, 'just what you will build or practise');
  if ('error' in purpose) return purpose;
  return { name: name.text, relation: rel.text, age: body.age, org: org.text, purpose: purpose.text };
}

// ---- who holds an approved guest row now ---------------------------------------------------------------------

/** SQL: an approved, unexpired row whose vouching class is live, not switched off, and still holds its host. `n` is `now`. */
function liveGuestSql(n: number): string {
  return `g.status = 'approved' AND g.ends_at > ${Math.trunc(n)}
     AND EXISTS (SELECT 1 FROM classes c WHERE c.id = g.class_id AND c.archived_at IS NULL AND c.guests_off = 0)
     AND EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = g.class_id AND e.student_email = g.host_email AND e.expires_at > ${Math.trunc(n)})`;
}

/** Is `guest` an approved guest of this very host right now? (rooms.ts mayJoin) */
export async function isApprovedGuestOf(db: D1Database, host: string, guest: string, now = Date.now()): Promise<boolean> {
  const r = await db.prepare(
    `SELECT 1 AS x FROM sandbox_guests g WHERE g.host_email = ? AND g.guest_email = ? AND ${liveGuestSql(now)} LIMIT 1`,
  ).bind(host, guest).first();
  return !!r;
}

/** Is this account an approved guest of anyone right now? (publicShare.ts viewerVetted) */
export async function isApprovedGuest(db: D1Database, email: string, now = Date.now()): Promise<boolean> {
  const r = await db.prepare(`SELECT 1 AS x FROM sandbox_guests g WHERE g.guest_email = ? AND ${liveGuestSql(now)} LIMIT 1`).bind(email).first();
  return !!r;
}

/** The hosts this account is an approved guest of right now. */
export async function guestHostsOf(db: D1Database, email: string, now = Date.now()): Promise<Set<string>> {
  const rows = (await db.prepare(`SELECT DISTINCT g.host_email FROM sandbox_guests g WHERE g.guest_email = ? AND ${liveGuestSql(now)}`)
    .bind(email).all<{ host_email: string }>()).results ?? [];
  return new Set(rows.map((r) => r.host_email));
}

// ---- host and guest, for messaging (migration 0060) ----------------------------------------------------------

export interface GuestPair {
  host: string;
  guest: string;
  /** Approved and in force right now (see liveGuestSql); false once ended, expired, archived, switched off, or the host left. */
  live: boolean;
}

/**
 * Are these two a host and a guest THROUGH THIS CLASS (the class that vouched, whose teachers read their messages)?
 * Looks at approved and ended rows, never pending or declined: nobody a teacher has not said yes to is ever messaged.
 * Null when they are not. A conversation outlives the approval, so an ended pair is still found (live: false) and the
 * page says why it cannot send.
 */
export async function guestPair(db: D1Database, classId: string, a: string, b: string, now = Date.now()): Promise<GuestPair | null> {
  const rows = (await db.prepare(
    `SELECT g.host_email, g.guest_email, g.status FROM sandbox_guests g
      WHERE g.class_id = ?1 AND g.status IN ('approved', 'revoked')
        AND ((g.host_email = ?2 AND g.guest_email = ?3) OR (g.host_email = ?3 AND g.guest_email = ?2))
      ORDER BY g.decided_at DESC`,
  ).bind(classId, a, b).all<{ host_email: string; guest_email: string; status: string }>()).results ?? [];
  if (!rows.length) return null;
  for (const r of rows) {
    if (r.status === 'approved' && (await isApprovedGuestOf(db, r.host_email, r.guest_email, now))) {
      return { host: r.host_email, guest: r.guest_email, live: true };
    }
  }
  return { host: rows[0].host_email, guest: rows[0].guest_email, live: false };
}

/** The approved guests (in force now) this host can message through this class: [{ email, name }] with " (guest)" on the name. */
export async function liveGuestsOfHost(db: D1Database, host: string, classId: string, now = Date.now()): Promise<{ email: string }[]> {
  return (await db.prepare(
    `SELECT DISTINCT g.guest_email AS email FROM sandbox_guests g WHERE g.host_email = ? AND g.class_id = ? AND ${liveGuestSql(now)}`,
  ).bind(host, classId).all<{ email: string }>()).results ?? [];
}

/** The hosts (and the class that vouches for each) this person is an approved guest of right now. */
export async function liveHostsOfGuest(db: D1Database, guest: string, now = Date.now()): Promise<{ host: string; classId: string }[]> {
  const rows = (await db.prepare(
    `SELECT DISTINCT g.host_email AS host, g.class_id AS classId FROM sandbox_guests g WHERE g.guest_email = ? AND ${liveGuestSql(now)}`,
  ).bind(guest).all<{ host: string; classId: string }>()).results ?? [];
  return rows;
}

/** What a guest's name carries wherever a host sees it. */
export const GUEST_TAG = ' (guest)';

// ---- making and finding invites ------------------------------------------------------------------------------

/** Rows that count against a host's limit: a code not yet run out, someone waiting, someone approved. */
export async function activeGuestCount(db: D1Database, host: string, now = Date.now()): Promise<number> {
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM sandbox_guests
      WHERE host_email = ? AND (status IN ('pending', 'approved') OR (status = 'invited' AND expires_at > ?))`,
  ).bind(host, now).first<{ n: number }>();
  return r?.n ?? 0;
}

export async function pendingInClass(db: D1Database, classId: string): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM sandbox_guests WHERE class_id = ? AND status = 'pending'`).bind(classId).first<{ n: number }>();
  return r?.n ?? 0;
}

export interface InviteProblem { status: 403 | 404 | 409; error: string }

/** May this person invite a guest through this class right now? Null = yes. Students only; the class must be one they are in. */
export async function inviteProblem(db: D1Database, data: Session, classId: unknown, now = Date.now()): Promise<InviteProblem | null> {
  if (data.role !== 'student') {
    return { status: 403, error: 'Guests are for students. Students in your classes already join your sessions.' };
  }
  const mine = await studentClassIds(db, data.email, now);
  if (typeof classId !== 'string' || !mine.includes(classId)) return { status: 404, error: 'Choose one of your classes.' };
  const cls = await db.prepare(`SELECT name, guests_off FROM classes WHERE id = ?`).bind(classId).first<{ name: string; guests_off: number }>();
  if (cls?.guests_off) return { status: 403, error: `Your teacher has turned off guests in ${cls.name}.` };
  if ((await activeGuestCount(db, data.email, now)) >= MAX_GUESTS_PER_HOST) {
    return { status: 409, error: `You can have ${MAX_GUESTS_PER_HOST} guests at a time. End one before inviting another.` };
  }
  if ((await pendingInClass(db, classId)) >= MAX_PENDING_PER_CLASS) {
    return { status: 409, error: 'Your teacher has a lot of guests waiting. Try again once some are decided.' };
  }
  return null;
}

// ---- the Activity feed ---------------------------------------------------------------------------------------

export const GUEST_NOTICE_DAYS = 14;

async function labelOf(db: D1Database, email: string | null): Promise<string> {
  if (!email) return 'Someone';
  const s = await db.prepare(`SELECT first_name, last_name FROM students WHERE email = ?`).bind(email).first<{ first_name: string | null; last_name: string | null }>();
  return ownerLabel(s?.first_name ?? null, s?.last_name ?? null);
}

/**
 * Told in the app, no email: a teacher is asked to decide (until they do), a host hears the decision, a guest hears it too.
 * Pending ones never expire out of the list; decisions show for GUEST_NOTICE_DAYS.
 */
export async function guestNotices(db: D1Database, data: Session, now = Date.now()): Promise<GuestNotice[]> {
  const out: GuestNotice[] = [];
  const since = now - GUEST_NOTICE_DAYS * 86_400_000;

  if (data.role === 'teacher') {
    const classes = await teacherClassIds(db, data.email);
    if (classes.length) {
      const rows = (await db.prepare(
        `SELECT id, host_email, guest_email, class_id, redeemed_at FROM sandbox_guests
          WHERE status = 'pending' AND class_id IN (${classes.map(() => '?').join(',')}) ORDER BY redeemed_at DESC LIMIT 20`,
      ).bind(...classes).all<{ id: string; host_email: string; guest_email: string; class_id: string; redeemed_at: number }>()).results ?? [];
      for (const r of rows) {
        out.push({ kind: 'guest', key: `guest:${r.id}:ask`, state: 'pending', audience: 'teacher', who: await labelOf(db, r.host_email),
          title: await labelOf(db, r.guest_email), classId: r.class_id, snippet: '', at: r.redeemed_at });
      }
    }
  }

  const decided = (await db.prepare(
    `SELECT id, host_email, guest_email, status, decided_at FROM sandbox_guests
      WHERE (host_email = ?1 OR guest_email = ?1) AND status IN ('approved', 'declined', 'revoked') AND decided_at > ?2
        -- only a TEACHER's decision is "Your teacher ..."; a host or guest ending it themselves is not
        AND decided_by IS NOT NULL AND decided_by != host_email AND decided_by != COALESCE(guest_email, '')
      ORDER BY decided_at DESC LIMIT 20`,
  ).bind(data.email, since).all<{ id: string; host_email: string; guest_email: string | null; status: GuestStatus; decided_at: number }>()).results ?? [];
  for (const r of decided) {
    const asHost = r.host_email === data.email;
    // Someone who is both (hosts and was a guest elsewhere) gets the notice that fits THIS row's side.
    out.push({
      kind: 'guest', key: `guest:${r.id}:${r.status}:${asHost ? 'host' : 'guest'}`, state: r.status as 'approved' | 'declined' | 'revoked',
      audience: asHost ? 'host' : 'guest', who: 'Your teacher',
      title: asHost ? await labelOf(db, r.guest_email) : await labelOf(db, r.host_email), snippet: '', at: r.decided_at,
    });
  }
  return out.sort((a, b) => b.at - a.at);
}
