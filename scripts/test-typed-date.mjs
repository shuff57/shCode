// The Schedule's typed date and time fields (lib/typed-date.ts, ux2 T4): what a teacher types becomes the
// date the server is sent, or a sentence that says what is wrong. Never a guessed or half-read date.
// Run: node --import ./scripts/register-ts.mjs scripts/test-typed-date.mjs   (also part of `npm test`)
import { strict as assert } from 'node:assert';
import { draftsAfterSave, formatDateForField, formatTimeForField, parseTypedDate, parseTypedTime, planDateCommit } from '../lib/typed-date.ts';

const results = [];
function check(name, fn) {
  try { fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r)); return r.value; };
const bad = (r) => { assert.equal(r.ok, false, JSON.stringify(r)); return r.problem; };

check('the walker’s date, typed the usual ways, is 2026-12-15', () => {
  for (const t of ['12/15/2026', '12-15-2026', '12.15.2026', ' 12/15/2026 ', '12 / 15 / 2026', '2026-12-15', '12152026', '12/15/26']) {
    assert.equal(ok(parseTypedDate(t)), '2026-12-15', t);
  }
});
check('single-digit month and day', () => assert.equal(ok(parseTypedDate('1/5/2027')), '2027-01-05'));
check('empty text means the field was cleared', () => assert.equal(ok(parseTypedDate('   ')), ''));
check('the walker’s garbled year (11/04/152026) says the year has too many digits', () => {
  assert.match(bad(parseTypedDate('11/04/152026')), /year 152026 has too many digits/);
});
check('a month past 12 says there is no such month and to put the month first', () => {
  assert.match(bad(parseTypedDate('15/12/2026')), /no month 15.*month first/);
});
check('a day the month does not have says how many days it has', () => {
  assert.match(bad(parseTypedDate('11/31/2026')), /November 2026 has 30 days/);
  assert.match(bad(parseTypedDate('2/29/2027')), /February 2027 has 28 days/);
  assert.equal(ok(parseTypedDate('2/29/2028')), '2028-02-29');
});
check('no year: asks for it rather than guessing one', () => assert.match(bad(parseTypedDate('12/15')), /Add the year/));
check('a 3-digit year is refused', () => assert.match(bad(parseTypedDate('12/15/202')), /whole year/));
check('words are refused with an example', () => assert.match(bad(parseTypedDate('next friday')), /like 12\/15\/2026/));
check('no em dash in any message', () => {
  for (const t of ['11/04/152026', '15/12/2026', '11/31/2026', '12/15', 'x', '12/15/202']) assert.ok(!bad(parseTypedDate(t)).includes('—'), t);
  for (const t of ['25:00', '13pm', '3:75', 'noon']) assert.ok(!bad(parseTypedTime(t)).includes('—'), t);
});
check('the field shows MM/DD/YYYY', () => {
  assert.equal(formatDateForField('2026-12-05'), '12/05/2026');
  assert.equal(formatDateForField(''), '');
  assert.equal(ok(parseTypedDate(formatDateForField('2026-12-05'))), '2026-12-05');
});
check('times typed the usual ways', () => {
  const want = { '3:00 PM': '15:00', '3pm': '15:00', '3 p': '15:00', '0300P': '15:00', '03:00p.m.': '15:00', '15:00': '15:00', '1500': '15:00', '9:05am': '09:05', '12 am': '00:00', '12:30 PM': '12:30', '11:59 PM': '23:59', '0': '00:00' };
  for (const [t, v] of Object.entries(want)) assert.equal(ok(parseTypedTime(t)), v, t);
});
check('empty time is allowed (the server default applies)', () => assert.equal(ok(parseTypedTime('')), ''));
check('impossible times are refused', () => {
  assert.match(bad(parseTypedTime('25:00')), /no hour 25/);
  assert.match(bad(parseTypedTime('13pm')), /1 to 12/);
  assert.match(bad(parseTypedTime('3:75')), /no minute 75/);
  assert.match(bad(parseTypedTime('noon')), /like 3:00 PM/);
});
check('the field shows a 12-hour time and reads back the same', () => {
  for (const [hhmm, shown] of [['15:00', '3:00 PM'], ['00:05', '12:05 AM'], ['12:00', '12:00 PM'], ['23:59', '11:59 PM']]) {
    assert.equal(formatTimeForField(hhmm), shown);
    assert.equal(ok(parseTypedTime(shown)), hhmm);
  }
});

// ---- one edit at a time, and an edit made during a save is never lost (review fix) ----
const T = '2026-11-11';
const saved = { date: '2026-11-04', time: '13:55' };
check('nothing typed: idle (keep everything)', () => assert.deepEqual(planDateCommit({ saved, draftDate: null, draftTime: null, today: T }), { kind: 'idle' }));
check('typed date and time: send both, time in 24-hour form', () =>
  assert.deepEqual(planDateCommit({ saved, draftDate: '12/15/2026', draftTime: '3pm', today: T }), { kind: 'send', date: '2026-12-15', time: '15:00' }));
check('only the time typed: the saved date goes with it', () =>
  assert.deepEqual(planDateCommit({ saved, draftDate: null, draftTime: '8am', today: T }), { kind: 'send', date: '2026-11-04', time: '08:00' }));
check('a calendar pick wins over a typed date and keeps a typed time', () =>
  assert.deepEqual(planDateCommit({ saved, draftDate: '1/1/2027', draftTime: '9am', picked: '2026-12-01', today: T }), { kind: 'send', date: '2026-12-01', time: '09:00' }));
check('typed the same as saved: unchanged, nothing sent', () =>
  assert.deepEqual(planDateCommit({ saved, draftDate: '11/04/2026', draftTime: '1:55 PM', today: T }), { kind: 'unchanged' }));
check('cleared date: clears the row', () => assert.deepEqual(planDateCommit({ saved, draftDate: '', draftTime: null, today: T }), { kind: 'send', date: null, time: null }));
check('a time with no date anywhere: says a date is needed', () =>
  assert.equal(planDateCommit({ saved: { date: '', time: '' }, draftDate: null, draftTime: '3pm', today: T }).kind, 'needs-date'));
check('unreadable or out-of-window: refused with the reason', () => {
  assert.match(planDateCommit({ saved, draftDate: '11/04/152026', draftTime: null, today: T }).problem, /too many digits/);
  assert.match(planDateCommit({ saved, draftDate: '10/30/1906', draftTime: null, today: T }).problem, /more than a year ago/);
  assert.match(planDateCommit({ saved, draftDate: null, draftTime: '25:00', today: T }).problem, /no hour 25/);
});
check('after a save, the drafts that were sent are cleared', () =>
  assert.deepEqual(draftsAfterSave({ date: '12/15/2026', time: '3pm' }, { date: '12/15/2026', time: '3pm' }), { date: null, time: null }));
check('after a save, a correction typed during it stays (compared by value)', () => {
  assert.deepEqual(draftsAfterSave({ date: '12/15/2026', time: '3pm' }, { date: '12/16/2026', time: '3pm' }), { date: '12/16/2026', time: null });
  assert.deepEqual(draftsAfterSave({ date: '12/15/2026', time: null }, { date: '12/15/2026', time: '4pm' }), { date: null, time: '4pm' });
  assert.deepEqual(draftsAfterSave({ date: null, time: null }, { date: '1/2/2027', time: null }), { date: '1/2/2027', time: null });
});
check('the queued correction is planned against what was just saved, so the date sent first is not reverted', () => {
  const afterFirst = { date: '2026-12-15', time: '15:00' };
  assert.deepEqual(planDateCommit({ saved: afterFirst, draftDate: null, draftTime: '4pm', today: T }), { kind: 'send', date: '2026-12-15', time: '16:00' });
});

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('  ok')).length} of ${results.length} passed`);
