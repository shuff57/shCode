// Assertions for lib/due-dates-core.ts. Run via `npm run test:duedates`,
// which compiles the TypeScript to CommonJS in a temp dir first and passes
// that dir in.

const LIB = process.env.DUE_DATES_LIB_DIR;
if (!LIB) {
  console.error('Set DUE_DATES_LIB_DIR, or run `npm run test:duedates`.');
  process.exit(2);
}

const {
  SCHOOL_TZ,
  endOfSchoolDay,
  schoolDateString,
  formatDue,
  moduleIdFromTitle,
  buildDueIndex,
  resolveDueAt,
  moduleDueSummary,
  dueStatus,
  isPastDue,
} = require(LIB + '/due-dates-core.js');

let fails = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------------------------------------------------------------------------
section('endOfSchoolDay — timezone');

eq('school tz is Pacific', SCHOOL_TZ, 'America/Los_Angeles');

// Winter, standard time (UTC-8): local 23:59:59.999 is 07:59:59.999Z next day.
eq(
  'PST date lands on end of local day',
  new Date(endOfSchoolDay('2026-01-15')).toISOString(),
  '2026-01-16T07:59:59.999Z',
);

// Summer, daylight time (UTC-7): 06:59:59.999Z next day.
eq(
  'PDT date lands on end of local day',
  new Date(endOfSchoolDay('2026-06-15')).toISOString(),
  '2026-06-16T06:59:59.999Z',
);

// Spring forward is 2026-03-08. The END of that day is already PDT, so a
// naive fixed -8 offset would be an hour off here.
eq(
  'spring-forward day ends in PDT',
  new Date(endOfSchoolDay('2026-03-08')).toISOString(),
  '2026-03-09T06:59:59.999Z',
);
eq(
  'day before spring forward ends in PST',
  new Date(endOfSchoolDay('2026-03-07')).toISOString(),
  '2026-03-08T07:59:59.999Z',
);

// Fall back is 2026-11-01; the end of that day is back on PST.
eq(
  'fall-back day ends in PST',
  new Date(endOfSchoolDay('2026-11-01')).toISOString(),
  '2026-11-02T07:59:59.999Z',
);
eq(
  'day before fall back ends in PDT',
  new Date(endOfSchoolDay('2026-10-31')).toISOString(),
  '2026-11-01T06:59:59.999Z',
);

ok('rejects a non-ISO date string', (() => {
  try { endOfSchoolDay('9/12/2026'); return false; } catch { return true; }
})());

section('schoolDateString — round trip');
for (const d of ['2026-01-15', '2026-03-07', '2026-03-08', '2026-06-15', '2026-10-31', '2026-11-01', '2026-12-31']) {
  eq(`round trips ${d}`, schoolDateString(endOfSchoolDay(d)), d);
}

// The stored instant is the NEXT UTC day for every Pacific date. Formatting
// in UTC instead of SCHOOL_TZ would show the wrong day for every due date.
eq('formats in school tz, not UTC', formatDue(endOfSchoolDay('2026-09-11')), 'Fri, Sep 11');

section('moduleIdFromTitle');
eq('three-part title', moduleIdFromTitle('1.1.4 What a Program Is'), '1.1');
eq('two-digit lesson slot', moduleIdFromTitle('1.3.21 Module 1.3 Quiz'), '1.3');
eq('double-digit module', moduleIdFromTitle('6.10.2 Something'), '6.10');
eq('unnumbered title has no module', moduleIdFromTitle('Sandbox'), null);
eq('two-part title is not a lesson', moduleIdFromTitle('1.1 Software Lifecycle'), null);

// ---------------------------------------------------------------------------
section('resolveDueAt — most specific wins');

const UNIT = 'Unit 1: JavaScript Fundamentals';
const SEP12 = endOfSchoolDay('2026-09-12');
const SEP19 = endOfSchoolDay('2026-09-19');
const SEP30 = endOfSchoolDay('2026-09-30');

{
  const index = buildDueIndex([
    { scope: 'unit', scopeId: UNIT, dueAt: SEP30 },
    { scope: 'module', scopeId: '1.1', dueAt: SEP12 },
    { scope: 'lesson', scopeId: '1-1-23-a1-2-describe-lifecycle', dueAt: SEP19 },
  ]);

  eq('lesson override beats module',
    resolveDueAt(index, { lessonId: '1-1-23-a1-2-describe-lifecycle', moduleId: '1.1', unitId: UNIT }), SEP19);
  eq('unoverridden lesson inherits module',
    resolveDueAt(index, { lessonId: '1-1-4-sdlc-overview', moduleId: '1.1', unitId: UNIT }), SEP12);
  eq('module with no row inherits unit',
    resolveDueAt(index, { lessonId: '1-2-10-reading-number', moduleId: '1.2', unitId: UNIT }), SEP30);
  eq('nothing set anywhere resolves to null',
    resolveDueAt(index, { lessonId: '9-9-9-nope', moduleId: '9.9', unitId: 'Unit 9' }), null);
  eq('missing moduleId falls through to unit',
    resolveDueAt(index, { lessonId: 'x', moduleId: null, unitId: UNIT }), SEP30);
}

// ---------------------------------------------------------------------------
section('moduleDueSummary');

const LESSONS = ['1-1-1-slides', '1-1-4-sdlc-overview', '1-1-23-a1-2-describe-lifecycle'];

{
  const index = buildDueIndex([]);
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('no rows -> none', s.kind, 'none');
  eq('no rows -> no own date', s.ownDueAt, null);
  eq('no rows -> no overrides', s.overrides, 0);
}

{
  const index = buildDueIndex([{ scope: 'module', scopeId: '1.1', dueAt: SEP12 }]);
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('module row only -> single', s.kind, 'single');
  eq('module row only -> that date', s.dueAt, SEP12);
  eq('module row only -> no overrides', s.overrides, 0);
  eq('module row is editable as ownDueAt', s.ownDueAt, SEP12);
}

{
  const index = buildDueIndex([
    { scope: 'module', scopeId: '1.1', dueAt: SEP12 },
    { scope: 'lesson', scopeId: '1-1-23-a1-2-describe-lifecycle', dueAt: SEP19 },
  ]);
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('one override -> mixed', s.kind, 'mixed');
  eq('mixed has no single date', s.dueAt, null);
  eq('mixed reports earliest', s.min, SEP12);
  eq('mixed reports latest', s.max, SEP19);
  eq('mixed counts the override', s.overrides, 1);
  eq('mixed still exposes the module row for editing', s.ownDueAt, SEP12);
}

{
  // Clearing the override must restore "single" with no write to the module.
  const index = buildDueIndex([{ scope: 'module', scopeId: '1.1', dueAt: SEP12 }]);
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('clearing the override restores single', s.kind, 'single');
  eq('clearing the override restores the module date', s.dueAt, SEP12);
}

{
  // Every child overridden to the same day reads as single, not mixed.
  const index = buildDueIndex(LESSONS.map((id) => ({ scope: 'lesson', scopeId: id, dueAt: SEP19 })));
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('uniform overrides -> single', s.kind, 'single');
  eq('uniform overrides -> that date', s.dueAt, SEP19);
  eq('uniform overrides still counted', s.overrides, 3);
  eq('no module row means nothing to edit', s.ownDueAt, null);
}

{
  // Some children dated, others not, is mixed — not "single".
  const index = buildDueIndex([{ scope: 'lesson', scopeId: '1-1-1-slides', dueAt: SEP12 }]);
  const s = moduleDueSummary(index, '1.1', LESSONS, UNIT);
  eq('partial coverage -> mixed', s.kind, 'mixed');
}

{
  // A module with no lessons yet still shows its own date.
  const index = buildDueIndex([{ scope: 'module', scopeId: '1.9', dueAt: SEP12 }]);
  const s = moduleDueSummary(index, '1.9', [], UNIT);
  eq('empty module with a row -> single', s.kind, 'single');
  eq('empty module with no row -> none', moduleDueSummary(buildDueIndex([]), '1.9', [], UNIT).kind, 'none');
}

// ---------------------------------------------------------------------------
section('dueStatus');

const NOON_SEP12 = Date.parse('2026-09-12T19:00:00.000Z'); // noon Pacific
const NOON_SEP10 = Date.parse('2026-09-10T19:00:00.000Z');
const NOON_SEP15 = Date.parse('2026-09-15T19:00:00.000Z');

eq('no due date', dueStatus(null, null, NOON_SEP12), 'none');
eq('due later this week', dueStatus(SEP12, null, NOON_SEP10), 'upcoming');
eq('due at end of today', dueStatus(SEP12, null, NOON_SEP12), 'today');
eq('past due, untouched', dueStatus(SEP12, null, NOON_SEP15), 'late');
eq('completed before due', dueStatus(SEP12, NOON_SEP10, NOON_SEP15), 'done');
eq('completed after due', dueStatus(SEP12, NOON_SEP15, NOON_SEP15), 'done-late');
eq('completed exactly at the deadline is on time', dueStatus(SEP12, SEP12, NOON_SEP15), 'done');
eq('one ms past the deadline is late', dueStatus(SEP12, SEP12 + 1, NOON_SEP15), 'done-late');

// The last minute of the due day is still "today", not "late" — the deadline
// is the END of the local day, which is the whole point of endOfSchoolDay.
eq('one ms before the deadline is still today', dueStatus(SEP12, null, SEP12 - 1), 'today');
eq('one ms after the deadline is late', dueStatus(SEP12, null, SEP12 + 1), 'late');

section('isPastDue');
ok('untouched past-due counts', isPastDue(SEP12, null, NOON_SEP15));
ok('late completion counts', isPastDue(SEP12, NOON_SEP15, NOON_SEP15));
ok('on-time completion does not count', !isPastDue(SEP12, NOON_SEP10, NOON_SEP15));
ok('not-yet-due does not count', !isPastDue(SEP12, null, NOON_SEP10));
ok('no due date never counts', !isPastDue(null, null, NOON_SEP15));

// ---------------------------------------------------------------------------
console.log('');
if (fails > 0) {
  console.error(`due-dates: ${fails} assertion(s) FAILED`);
  process.exit(1);
}
console.log('due-dates: all assertions passed');
