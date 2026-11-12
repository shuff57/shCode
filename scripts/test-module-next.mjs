// "The lesson to do next" (lib/module-next.ts): home's Continue card, the module page's Continue button and
// its "Next up" row all use this one rule.
import assert from 'node:assert/strict';
import { pickNextLesson } from '../lib/module-next.ts';
import { isSequenceLocked } from '../lib/lesson-lock.ts';

const ids = ['a', 'b', 'c', 'd'];
const base = { loaded: true, isAvailable: () => true, bypass: false };
const pick = (states, extra = {}) => pickNextLesson(ids, { ...base, state: (id) => states[id], ...extra });

assert.equal(pick({}, { loaded: false }), null, 'nothing before progress loads');
assert.equal(pickNextLesson([], { ...base, state: () => undefined }), null, 'an empty module has nothing');
assert.deepEqual(pick({}), { kind: 'next', index: 0, id: 'a', started: false, reason: 'first-unfinished' }, 'a fresh module starts at the first lesson');
assert.deepEqual(pick({ a: 'completed', b: 'started' }), { kind: 'next', index: 1, id: 'b', started: true, reason: 'in-progress' });
assert.deepEqual(pick({ a: 'completed', b: 'completed' }), { kind: 'next', index: 2, id: 'c', started: false, reason: 'first-unfinished' });
// A later lesson started but locked (b is not done) cannot be opened, so it does not jump the queue.
assert.equal(pick({ a: 'completed', c: 'started' }).id, 'b');
assert.deepEqual(pick({ a: 'completed', b: 'completed', c: 'completed', d: 'completed' }), { kind: 'done' });
// A teacher's open date holding the next lesson shut: nowhere to continue to (a student),
// but a teacher previewing bypasses it as the list does.
assert.equal(pick({ a: 'completed' }, { isAvailable: (id) => id !== 'b' }), null);
assert.equal(pick({ a: 'completed' }, { isAvailable: (id) => id !== 'b', bypass: true }).id, 'b');

// --- The whole course (home's card): two modules, the in-order lock is per module (ux3). ---
const course = ['m1-a', 'm1-b', 'm1-c', 'm2-a', 'm2-b'];
const mod = (id) => course.filter((x) => x.slice(0, 2) === id.slice(0, 2));
const coursePick = (states, extra = {}) => pickNextLesson(course, {
  ...base,
  state: (id) => states[id],
  locked: (id) => isSequenceLocked(mod(id), id, states, extra.role ?? 'student'),
  ...extra,
});
// rewalk2 S6: lessons finished out of order (possible for a teacher-bypassed account, or after a module was
// moved) and one lesson in progress: the lesson in progress wins over the first unfinished one.
assert.deepEqual(
  coursePick({ 'm1-a': 'completed', 'm1-b': 'started', 'm2-a': 'completed' }),
  { kind: 'next', index: 1, id: 'm1-b', started: true, reason: 'in-progress' },
);
// Two lessons in progress (one per module): the one worked on most recently wins.
const two = { 'm1-a': 'completed', 'm1-b': 'started', 'm2-a': 'started' };
assert.equal(coursePick(two, { workedAt: (id) => ({ 'm1-b': 100, 'm2-a': 200 })[id] }).id, 'm2-a');
assert.equal(coursePick(two, { workedAt: (id) => ({ 'm1-b': 300, 'm2-a': 200 })[id] }).id, 'm1-b');
// No recency known (an old server): the earlier one in course order.
assert.equal(coursePick(two).id, 'm1-b');
// A lesson in progress behind an open date the teacher set later is not offered.
assert.equal(coursePick(two, { workedAt: (id) => ({ 'm1-b': 100, 'm2-a': 200 })[id], isAvailable: (id) => id !== 'm2-a' }).id, 'm1-b');
// Nothing in progress: the first unfinished lesson in course order.
assert.deepEqual(coursePick({ 'm1-a': 'completed', 'm2-a': 'completed' }), { kind: 'next', index: 1, id: 'm1-b', started: false, reason: 'first-unfinished' });
// The first unfinished lesson is held shut by an open date: the next one the student MAY open (the next
// module's first lesson; m1-c is locked behind m1-b).
assert.equal(coursePick({ 'm1-a': 'completed' }, { isAvailable: (id) => id !== 'm1-b' }).id, 'm2-a');
// Every unfinished lesson held shut: no card.
assert.equal(coursePick({ 'm1-a': 'completed' }, { isAvailable: (id) => id === 'm1-a' }), null);
console.log('test-module-next: all checks passed');
