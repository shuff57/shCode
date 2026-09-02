// Framework-free due-date core. Imported by BOTH the Pages Functions under
// functions/ and the React client under lib/due-dates.ts, so it must not
// touch React, fs, or any Worker-only global. Same shared-core pattern as
// lib/grade-written-core.ts.

// Every due date in the course resolves against one fixed timezone. Using
// the viewer's zone instead would move a deadline when a student opens the
// app on vacation, and would flip "due Sep 12" at 5pm Pacific for the
// teacher. Change this only if the whole course moves.
export const SCHOOL_TZ = 'America/Los_Angeles';

export type DueScope = 'unit' | 'module' | 'lesson';

export interface DueDateRow {
  scope: DueScope;
  scopeId: string;
  dueAt: number; // epoch ms
}

export interface DueIndex {
  lesson: Map<string, number>;
  module: Map<string, number>;
  unit: Map<string, number>;
}

// "Available after" rows, from class_open_dates (migrations/0023). Identical
// shape and identical inheritance to a due date, so everything below that
// takes a DueIndex works on an open index unchanged — buildOpenIndex,
// resolveDueAt and moduleDueSummary are all reused verbatim rather than
// written twice against the same three maps.
export interface OpenDateRow {
  scope: DueScope;
  scopeId: string;
  openAt: number; // epoch ms
}

// ---------------------------------------------------------------------------
// Timezone
// ---------------------------------------------------------------------------

// Offset (ms) that SCHOOL_TZ was running at the given instant. Positive west
// of UTC would be wrong-signed, so read it as: localWallClock = utc + offset.
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };

  // Intl renders midnight as hour 24 in some ICU versions.
  const hour = get('hour') % 24;
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asIfUtc - Math.floor(utcMs / 1000) * 1000;
}

// A SCHOOL_TZ wall-clock reading (already packed into a UTC-shaped number) ->
// the real instant it names. Two-pass so a time that straddles a DST
// transition still lands on the real local moment — a hardcoded -8/-7 offset
// is wrong twice a year.
function wallClockToInstant(wall: number, tz: string): number {
  const firstGuess = wall - tzOffsetMs(wall, tz);
  const offset = tzOffsetMs(firstGuess, tz);
  return wall - offset;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// <input type="time"> emits HH:MM, and HH:MM:SS when a step is set. We only
// ever store minutes, so seconds are parsed and ignored rather than rejected.
const TIME_ONLY = /^(\d{2}):(\d{2})(?::\d{2})?$/;

// The end-of-day time an <input type="time"> shows for a legacy due date.
// Round-tripping "23:59" back through schoolInstant would drop the stored
// 59.999s, so the write path special-cases it — see EOD_TIME's use in the
// due-dates route.
export const EOD_TIME = '23:59';

// Epoch ms for the last instant of `dateStr` (YYYY-MM-DD) in SCHOOL_TZ.
export function endOfSchoolDay(dateStr: string, tz: string = SCHOOL_TZ): number {
  const m = DATE_ONLY.exec(dateStr);
  if (!m) throw new Error(`endOfSchoolDay: expected YYYY-MM-DD, got ${JSON.stringify(dateStr)}`);
  const [, y, mo, d] = m;
  return wallClockToInstant(Date.UTC(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999), tz);
}

// Epoch ms for `dateStr` at `timeStr` (HH:MM) in SCHOOL_TZ. This is what an
// "opens Monday at 8:00 AM" row stores, and what a due date with an explicit
// time stores. Seconds are always :00 — the course has never needed finer,
// and a whole-minute boundary is what the teacher typed.
export function schoolInstant(dateStr: string, timeStr: string, tz: string = SCHOOL_TZ): number {
  const d = DATE_ONLY.exec(dateStr);
  if (!d) throw new Error(`schoolInstant: expected YYYY-MM-DD, got ${JSON.stringify(dateStr)}`);
  const t = TIME_ONLY.exec(timeStr);
  if (!t) throw new Error(`schoolInstant: expected HH:MM, got ${JSON.stringify(timeStr)}`);
  const hour = Number(t[1]);
  const minute = Number(t[2]);
  if (hour > 23 || minute > 59) throw new Error(`schoolInstant: out-of-range time ${JSON.stringify(timeStr)}`);
  return wallClockToInstant(
    Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hour, minute, 0, 0),
    tz,
  );
}

// Epoch ms for midnight at the START of `dateStr` in SCHOOL_TZ. The default
// an "available after" row gets when the teacher sets a date but no time.
export function startOfSchoolDay(dateStr: string, tz: string = SCHOOL_TZ): number {
  return schoolInstant(dateStr, '00:00', tz);
}

// The YYYY-MM-DD that an instant falls on in SCHOOL_TZ. Round-trips with
// endOfSchoolDay, which is what lets the teacher editor put a stored due_at
// back into an <input type="date"> unchanged.
export function schoolDateString(ms: number, tz: string = SCHOOL_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// The HH:MM that an instant falls on in SCHOOL_TZ. Round-trips with
// schoolInstant, which is what lets the teacher editor put a stored open_at
// or due_at straight back into an <input type="time">.
export function schoolTimeString(ms: number, tz: string = SCHOOL_TZ): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((x) => x.type === type)?.value ?? 0);
  // Intl renders midnight as hour 24 in some ICU versions — same guard as
  // tzOffsetMs above, and the reason this isn't a plain string slice.
  const hour = get('hour') % 24;
  return `${String(hour).padStart(2, '0')}:${String(get('minute')).padStart(2, '0')}`;
}

// "Fri Sep 12" — short enough to sit inline in a lesson row.
export function formatDue(ms: number, tz: string = SCHOOL_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
}

// "8:00 AM". Students read a clock, not a 24-hour string, so the storage
// format and the display format deliberately differ.
export function formatTime(ms: number, tz: string = SCHOOL_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}

// "Mon Sep 8 · 8:00 AM" — the full form a lock message needs, because
// "opens Monday" with no time is the question a student immediately asks.
// An end-of-day instant drops the time: "due Fri Sep 12 · 11:59 PM" is noise
// on the 200-odd rows that were written before times existed.
export function formatDueTime(ms: number, tz: string = SCHOOL_TZ): string {
  const date = formatDue(ms, tz);
  return schoolTimeString(ms, tz) === EOD_TIME ? date : `${date} · ${formatTime(ms, tz)}`;
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

// "1.1.4 What a Program Is" -> "1.1". This is the module a lesson belongs to,
// and matches the `id:` frontmatter of curriculum/modules/1.1_*.md. Lessons
// whose title carries no numbered prefix have no module and never inherit.
export function moduleIdFromTitle(title: string): string | null {
  const m = /^(\d+)\.(\d+)\.\d+/.exec(title);
  return m ? `${m[1]}.${m[2]}` : null;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function buildDueIndex(rows: readonly DueDateRow[]): DueIndex {
  const index: DueIndex = { lesson: new Map(), module: new Map(), unit: new Map() };
  for (const row of rows) {
    const bucket = index[row.scope];
    if (bucket) bucket.set(row.scopeId, row.dueAt);
  }
  return index;
}

// Same three maps, filled from class_open_dates. Kept as a separate function
// only because the row field is named openAt; every consumer downstream
// (resolveDueAt, moduleDueSummary) is shared with due dates.
export function buildOpenIndex(rows: readonly OpenDateRow[]): DueIndex {
  const index: DueIndex = { lesson: new Map(), module: new Map(), unit: new Map() };
  for (const row of rows) {
    const bucket = index[row.scope];
    if (bucket) bucket.set(row.scopeId, row.openAt);
  }
  return index;
}

export interface LessonScopeIds {
  lessonId: string;         // lesson FOLDER id
  moduleId?: string | null; // "1.1"
  unitId?: string | null;   // lesson.json `category`
}

// Most specific wins: lesson override, else module, else unit, else none.
export function resolveDueAt(index: DueIndex, ids: LessonScopeIds): number | null {
  const own = index.lesson.get(ids.lessonId);
  if (own !== undefined) return own;
  if (ids.moduleId) {
    const mod = index.module.get(ids.moduleId);
    if (mod !== undefined) return mod;
  }
  if (ids.unitId) {
    const unit = index.unit.get(ids.unitId);
    if (unit !== undefined) return unit;
  }
  return null;
}

export type ModuleDueKind = 'none' | 'single' | 'mixed';

export interface ModuleDueSummary {
  kind: ModuleDueKind;
  dueAt: number | null;  // set only when kind === 'single'
  min: number | null;    // earliest child date, when kind === 'mixed'
  max: number | null;    // latest child date, when kind === 'mixed'
  overrides: number;     // children carrying their own lesson row
  ownDueAt: number | null; // the module's own row, if any — what the editor edits
}

// A module header never stores its display value; it is derived from what its
// children actually resolve to. A module whose row says Sep 12 but which has
// one child overridden to Sep 19 reads "Mixed", and clearing that child
// restores "Sep 12" with no write to the module row.
export function moduleDueSummary(
  index: DueIndex,
  moduleId: string,
  lessonIds: readonly string[],
  unitId?: string | null,
): ModuleDueSummary {
  const ownDueAt = index.module.get(moduleId) ?? null;
  let overrides = 0;
  const resolved: (number | null)[] = [];

  for (const lessonId of lessonIds) {
    if (index.lesson.has(lessonId)) overrides++;
    resolved.push(resolveDueAt(index, { lessonId, moduleId, unitId }));
  }

  if (resolved.length === 0) {
    return ownDueAt === null
      ? { kind: 'none', dueAt: null, min: null, max: null, overrides, ownDueAt }
      : { kind: 'single', dueAt: ownDueAt, min: ownDueAt, max: ownDueAt, overrides, ownDueAt };
  }

  const dated = resolved.filter((v): v is number => v !== null);
  if (dated.length === 0) {
    return { kind: 'none', dueAt: null, min: null, max: null, overrides, ownDueAt };
  }

  const min = Math.min(...dated);
  const max = Math.max(...dated);
  // A module where some children have a date and others do not is mixed too.
  const uniform = dated.length === resolved.length && min === max;

  return uniform
    ? { kind: 'single', dueAt: min, min, max, overrides, ownDueAt }
    : { kind: 'mixed', dueAt: null, min, max, overrides, ownDueAt };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type DueStatus =
  | 'none'        // no due date set
  | 'upcoming'    // due later than today
  | 'today'       // due at the end of today
  | 'late'        // past due, not completed
  | 'done'        // completed on time
  | 'done-late';  // completed, but after the due date

export function dueStatus(
  dueAt: number | null,
  completedAt: number | null | undefined,
  now: number,
  tz: string = SCHOOL_TZ,
): DueStatus {
  if (dueAt === null) return 'none';
  if (completedAt != null) return completedAt > dueAt ? 'done-late' : 'done';
  if (now > dueAt) return 'late';
  return schoolDateString(now, tz) === schoolDateString(dueAt, tz) ? 'today' : 'upcoming';
}

// ---------------------------------------------------------------------------
// Availability ("available after")
// ---------------------------------------------------------------------------

// The one rule the lock is built on, written once so the card, the module
// row, the footer dot and the workspace gate cannot disagree about it.
//
// No row anywhere in the chain -> null -> available. That default is
// load-bearing: 512 lessons have no open date and must stay openable, and a
// failed fetch resolves to null too, so a network blip opens lessons rather
// than sealing the course shut.
export function isAvailable(openAt: number | null, now: number): boolean {
  return openAt === null || now >= openAt;
}

// Read-time late test for the teacher dashboard. Most lessons never write a
// lesson_submissions row — they only flip lesson_state — so "late" for the
// bulk of the course is computed here rather than stamped anywhere.
export function isPastDue(dueAt: number | null, completedAt: number | null | undefined, now: number): boolean {
  const status = dueStatus(dueAt, completedAt, now);
  return status === 'late' || status === 'done-late';
}
