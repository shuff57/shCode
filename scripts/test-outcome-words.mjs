// Pins lib/outcome-words.ts: the "Checked just now" clock, the out-of-date rule,
// the "Submitted on" day, and the quiz score line.
import assert from 'node:assert/strict';
import { ranWhen, submittedOn, isOutOfDate, latestSubmittedAt, quizScoreLine, writtenAnswerStatus } from '../lib/outcome-words.ts';
import { changedSinceCheck, restoreQuizState } from '../lib/quiz-grade.ts';

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

// ---- quiz on return: marks and score only from the server's saved copy (ux2) ----
// The browser's own copy may be another student's on a shared computer, so it restores the answers
// and never "Passed N of M" or marked answers on its own.
const saved = { answers: { q1: 0, q2: 1 }, graded: true };
assert.deepEqual(restoreQuizState(saved, true), { answers: saved.answers, checked: saved.answers }, 'server copy: marks back');
assert.deepEqual(restoreQuizState(saved, false), { answers: saved.answers, checked: null },
  'this browser only: the answers come back, the marks do not');
assert.deepEqual(restoreQuizState({ answers: { q1: 2 }, graded: true, checked: { q1: 0 } }, true).checked, { q1: 0 });
assert.deepEqual(restoreQuizState({ answers: { q1: 2 }, graded: false }, true).checked, null, 'never checked: no marks');
assert.deepEqual(restoreQuizState(null, false), { answers: {}, checked: null });

// ---- quiz S2: changing one answer after a Check clears that question's mark only ----
const qs = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
assert.deepEqual(changedSinceCheck(qs, { q1: 0, q2: 1, q3: 2 }, null), [], 'never checked: nothing changed since');
assert.deepEqual(changedSinceCheck(qs, { q1: 0, q2: 1, q3: 2 }, { q1: 0, q2: 1, q3: 2 }), []);
assert.deepEqual(changedSinceCheck(qs, { q1: 0, q2: 3, q3: 2 }, { q1: 0, q2: 1, q3: 2 }), ['q2'], 'only the changed one');

// ---- written S4: a result for an earlier answer, and "Draft saved" only while true ----
assert.deepEqual(writtenAnswerStatus({ response: 'abc', resultFor: 'abc', savedText: 'abc' }), { resultStale: false, showDraftSaved: false },
  'saved text identical to what was submitted: no draft line beside the result');
assert.deepEqual(writtenAnswerStatus({ response: 'new', resultFor: 'abc', savedText: null }), { resultStale: true, showDraftSaved: false });
assert.deepEqual(writtenAnswerStatus({ response: 'new', resultFor: 'abc', savedText: 'new' }), { resultStale: true, showDraftSaved: true });
assert.deepEqual(writtenAnswerStatus({ response: 'newer', resultFor: null, savedText: 'new' }), { resultStale: false, showDraftSaved: false },
  'typed after saving: "Draft saved" is no longer true');
assert.equal(writtenAnswerStatus({ response: ' abc\n', resultFor: 'abc', savedText: null }).resultStale, false, 'end spaces do not count');

console.log('test-outcome-words: ok');
