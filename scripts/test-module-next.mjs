// The module page's Continue button and its "Next up" row (lib/module-next.ts).
import assert from 'node:assert/strict';
import { pickNextLesson } from '../lib/module-next.ts';

const ids = ['a', 'b', 'c', 'd'];
const base = { loaded: true, isAvailable: () => true, bypass: false };
const pick = (states, extra = {}) => pickNextLesson(ids, { ...base, state: (id) => states[id], ...extra });

assert.equal(pick({}, { loaded: false }), null, 'nothing before progress loads');
assert.equal(pickNextLesson([], { ...base, state: () => undefined }), null, 'an empty module has nothing');
assert.deepEqual(pick({}), { kind: 'next', index: 0, id: 'a', started: false }, 'a fresh module starts at the first lesson');
assert.deepEqual(pick({ a: 'completed', b: 'started' }), { kind: 'next', index: 1, id: 'b', started: true });
assert.deepEqual(pick({ a: 'completed', b: 'completed' }), { kind: 'next', index: 2, id: 'c', started: false });
// A later lesson already started does not jump the queue: the list's lock is "every earlier one done".
assert.equal(pick({ a: 'completed', c: 'started' }).id, 'b');
assert.deepEqual(pick({ a: 'completed', b: 'completed', c: 'completed', d: 'completed' }), { kind: 'done' });
// A teacher's open date holding the next lesson shut: nowhere to continue to (a student),
// but a teacher previewing bypasses it as the list does.
assert.equal(pick({ a: 'completed' }, { isAvailable: (id) => id !== 'b' }), null);
assert.equal(pick({ a: 'completed' }, { isAvailable: (id) => id !== 'b', bypass: true }).id, 'b');
console.log('test-module-next: all checks passed');
