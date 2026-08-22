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

// Epoch ms for the last instant of `dateStr` (YYYY-MM-DD) in SCHOOL_TZ.
// Two-pass so a date that straddles a DST transition still lands on the real
// end of that local day — a hardcoded -8/-7 offset is wrong twice a year.
export function endOfSchoolDay(dateStr: string, tz: string = SCHOOL_TZ): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error(`endOfSchoolDay: expected YYYY-MM-DD, got ${JSON.stringify(dateStr)}`);
  const [, y, mo, d] = m;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999);

  const firstGuess = wall - tzOffsetMs(wall, tz);
  const offset = tzOffsetMs(firstGuess, tz);
  return wall - offset;
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

// "Fri Sep 12" — short enough to sit inline in a lesson row.
export function formatDue(ms: number, tz: string = SCHOOL_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
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

// Read-time late test for the teacher dashboard. Most lessons never write a
// lesson_submissions row — they only flip lesson_state — so "late" for the
// bulk of the course is computed here rather than stamped anywhere.
export function isPastDue(dueAt: number | null, completedAt: number | null | undefined, now: number): boolean {
  const status = dueStatus(dueAt, completedAt, now);
  return status === 'late' || status === 'done-late';
}
