// Pins lib/outcome-words.ts: the "Checked just now" clock, the out-of-date rule,
// the "Submitted on" day, and the quiz score line.
import assert from 'node:assert/strict';
import { ranWhen, submittedOn, isOutOfDate, latestSubmittedAt, quizScoreLine } from '../lib/outcome-words.ts';

const t0 = new Date(2026, 10, 11, 15, 4, 0).getTime();

assert.equal(ranWhen(t0, t0), 'just now');
assert.equal(ranWhen(t0, t0 + 59_000), 'just now');
assert.match(ranWhen(t0, t0 + 61_000, 'en-US'), /^at 3:04\sPM$/);

assert.equal(submittedOn(t0, t0, 'en-US'), 'Wed, Nov 11');
assert.match(submittedOn(new Date(2025, 0, 2).getTime(), t0, 'en-US'), /2025/);

assert.equal(isOutOfDate(null, 'x'), false, 'nothing ran yet is not out of date');
assert.equal(isOutOfDate('a', 'a'), false);
assert.equal(isOutOfDate('a', 'b'), true);

assert.equal(latestSubmittedAt([]), null);
assert.equal(latestSubmittedAt([{ submittedAt: 5 }, { submittedAt: 9 }, { submittedAt: null }, {}]), 9);

assert.equal(quizScoreLine(5, 5, 4), 'Passed: 5 of 5 right');
assert.equal(quizScoreLine(4, 5, 4), 'Passed: 4 of 5 right');
assert.equal(quizScoreLine(3, 5, 4), '3 of 5 right. You need 4.');

console.log('test-outcome-words: ok');
