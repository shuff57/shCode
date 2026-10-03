// Pure rules for releasing a capped part's solution to a class. Shared verbatim
// by the Pages Functions and the teacher panel, like lib/due-dates-core.ts, whose
// resolver and school-timezone helpers this reuses instead of inventing a second
// set. Spec: .gauntlet/SPEC-attempt-caps.md, "Release".
//
// The model is one instant per (class, scope, scope_id): the solution is released
// once `release_at <= now`, compared with the server clock on every request.
//   release now      release_at = now
//   release on a day release_at = that school-timezone day and time
//   take back        delete the row, OR (to override an inherited module date for
//                    one part) a lesson row at HELD_BACK
// No row at all means NOT released.

import {
  buildOpenIndex,
  formatTime,
  SCHOOL_TZ,
  resolveDueAt,
  type LessonScopeIds,
  type OpenDateRow,
} from './due-dates-core';

/**
 * 9999-12-31T00:00Z. A row at (or past) this instant is an explicit "held back":
 * it wins over an inherited module date and never opens. Chosen over NULL so the
 * column stays NOT NULL and the resolver keeps one number type.
 */
export const HELD_BACK = 253402214400000;

export interface ReleaseRow {
  scope: 'module' | 'lesson';
  scopeId: string;
  releaseAt: number;
}

/** The release instant in force for one lesson in one class, or null (not released). */
export function resolveReleaseAt(rows: readonly ReleaseRow[], ids: LessonScopeIds): number | null {
  if (rows.length === 0) return null;
  const asOpen: OpenDateRow[] = rows.map((r) => ({ scope: r.scope, scopeId: r.scopeId, openAt: r.releaseAt }));
  // Only lesson and module rows exist, so a lesson with no module (an unnumbered
  // title) simply never inherits; fail closed.
  return resolveDueAt(buildOpenIndex(asOpen), { ...ids, unitId: null });
}

export function isHeldBack(releaseAt: number | null): boolean {
  return releaseAt !== null && releaseAt >= HELD_BACK;
}

/** Released exactly at the instant, and from then on. Held-back and absent are never released. */
export function isReleased(releaseAt: number | null, now: number): boolean {
  return releaseAt !== null && !isHeldBack(releaseAt) && releaseAt <= now;
}

export type ReleaseState =
  | { state: 'released'; at: number }
  | { state: 'scheduled'; at: number }
  | { state: 'none' };

export function releaseState(releaseAt: number | null, now: number): ReleaseState {
  if (releaseAt === null || isHeldBack(releaseAt)) return { state: 'none' };
  return releaseAt <= now ? { state: 'released', at: releaseAt } : { state: 'scheduled', at: releaseAt };
}

/**
 * "Fri Nov 6, 3:00 PM": always with the time, unlike formatDueTime, because a release has
 * one. Built from parts: Intl's own short form puts a comma after the weekday.
 */
export function formatRelease(ms: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
  return `${get('weekday')} ${get('month')} ${get('day')}, ${formatTime(ms)}`;
}

/** True for a real calendar day: schoolInstant would roll '2026-13-45' over into another year. */
export function isRealDate(dateStr: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** Plain words for the teacher panel. */
export function describeRelease(releaseAt: number | null, now: number): string {
  const s = releaseState(releaseAt, now);
  if (s.state === 'released') return 'Released';
  if (s.state === 'scheduled') return `Releases ${formatRelease(s.at)}`;
  return 'Not released';
}

/** What a student whose tries are spent is told while the solution is still closed. */
export function studentWaitMessage(releaseAt: number | null, now: number, cap: number): string {
  const s = releaseState(releaseAt, now);
  const used = `You have used all ${cap} tries.`;
  return s.state === 'scheduled'
    ? `${used} Your teacher releases the solution on ${formatRelease(s.at)}.`
    : `${used} Your teacher will release the solution.`;
}
