#!/usr/bin/env node
// Unit tests for lib/carry-forward.ts — the pure rules behind the strip.
import assert from 'assert';
import {
  carryMessage,
  carryDismissKey,
  dismissCarry,
  isCarryDismissed,
  mergeCarriedFiles,
  carryWouldChange,
  starterContents,
  isAuthoredStarter,
} from '../lib/carry-forward.ts';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

ok('commit message names the source', () => {
  assert.strictEqual(
    carryMessage('5.3.14 Lab: A chime on every bumper hit'),
    'Brought forward from 5.3.14 Lab: A chime on every bumper hit',
  );
});
ok('empty title still produces a sentence', () => {
  assert.strictEqual(carryMessage(''), 'Brought forward from your last lesson');
});

ok('merge takes only paths the target already has', () => {
  const target = { 'script.js': 'starter', 'README.md': 'readme' };
  const carried = { 'script.js': 'student code', 'extra.js': 'not mine' };
  assert.deepStrictEqual(mergeCarriedFiles(target, carried), {
    'script.js': 'student code',
    'README.md': 'readme',
  });
});
ok('merge leaves a path alone the source lacks', () => {
  const target = { 'script.js': 'a', 'README.md': 'b' };
  const carried = { 'script.js': 'c' };
  assert.deepStrictEqual(mergeCarriedFiles(target, carried), { 'script.js': 'c', 'README.md': 'b' });
});
ok('merge does not mutate its inputs', () => {
  const target = { 'script.js': 'a' };
  const carried = { 'script.js': 'b' };
  mergeCarriedFiles(target, carried);
  assert.strictEqual(target['script.js'], 'a');
});

ok('carryWouldChange is false for an identical file', () => {
  assert.strictEqual(carryWouldChange({ 'script.js': 'same' }, { 'script.js': 'same' }), false);
});
ok('carryWouldChange is true for different code', () => {
  assert.strictEqual(carryWouldChange({ 'script.js': 'a' }, { 'script.js': 'b' }), true);
});

const store = new Map();
const fake = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, v); },
};

ok('dismissal is keyed per target and source', () => {
  const key = carryDismissKey('lesson-b', 'lesson-a');
  assert.ok(key.includes('lesson-b') && key.includes('lesson-a'));
  assert.strictEqual(isCarryDismissed('lesson-b', 'lesson-a', fake), false);
  dismissCarry('lesson-b', 'lesson-a', fake);
  assert.strictEqual(isCarryDismissed('lesson-b', 'lesson-a', fake), true);
  assert.strictEqual(isCarryDismissed('lesson-c', 'lesson-a', fake), false);
  assert.strictEqual(isCarryDismissed('lesson-b', 'lesson-x', fake), false);
});

ok('a throwing storage never blocks the lab', () => {
  const broken = { getItem: () => { throw new Error('blocked'); } };
  assert.strictEqual(isCarryDismissed('a', 'b', broken), false);
});

ok('starterContents normalises CRLF', () => {
  assert.deepStrictEqual(
    starterContents([{ path: 'script.js', content: 'a\r\nb' }, { path: 'README.md' }]),
    { 'script.js': 'a\nb', 'README.md': '' },
  );
});
ok('an untouched lesson is its authored starter', () => {
  const starter = starterContents([{ path: 'script.js', content: 'a\r\nb' }]);
  assert.strictEqual(isAuthoredStarter(starter, { 'script.js': 'a\nb' }), true);
});
ok('an edited lesson is not its authored starter', () => {
  const starter = starterContents([{ path: 'script.js', content: 'a\nb' }]);
  assert.strictEqual(isAuthoredStarter(starter, { 'script.js': 'a\nc' }), false);
});
ok('a lesson with an extra file is not its authored starter', () => {
  const starter = starterContents([{ path: 'script.js', content: 'a' }]);
  assert.strictEqual(isAuthoredStarter(starter, { 'script.js': 'a', 'x.js': '' }), false);
});

console.log(`\n[test-carry-forward] ${n} checks passed`);
