#!/usr/bin/env node
// Unit tests for public/moshion/extras.js — the local rgba()/randomColor() layer.
import assert from 'assert';
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(repo, 'public', 'moshion', 'extras.js'), 'utf8');

let n = 0;
const sandbox = { __roll: 0, random: () => sandbox.__roll };
createContext(sandbox);
runInContext(source, sandbox, { filename: 'extras.js' });

const ok = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };
const { rgba, randomColor } = sandbox;

ok('rgba builds a CSS string', () => {
  assert.strictEqual(rgba(255, 99, 71, 0.5), 'rgba(255, 99, 71, 0.5)');
});
ok('alpha defaults to 1', () => {
  assert.strictEqual(rgba(1, 2, 3), 'rgba(1, 2, 3, 1)');
});
ok('channels are rounded and clamped', () => {
  assert.strictEqual(rgba(300, -5, 12.6, 0.4), 'rgba(255, 0, 13, 0.4)');
});
ok('alpha is clamped to 0..1', () => {
  assert.strictEqual(rgba(0, 0, 0, 2), 'rgba(0, 0, 0, 1)');
  assert.strictEqual(rgba(0, 0, 0, -1), 'rgba(0, 0, 0, 0)');
});
ok('an array works as the colour', () => {
  assert.strictEqual(rgba([10, 20, 30], 0.25), 'rgba(10, 20, 30, 0.25)');
});
ok('random alpha comes from the engine random()', () => {
  sandbox.__roll = 0.5;
  assert.strictEqual(rgba(0, 0, 0, sandbox.random()), 'rgba(0, 0, 0, 0.5)');
});
ok('randomColor uses the seeded random', () => {
  sandbox.__roll = 0;      // channel roll -> 0
  const c = randomColor();
  assert.strictEqual(c, 'rgba(0, 0, 0, 1)');
});
ok('randomColor(a) fixes the alpha', () => {
  sandbox.__roll = 0.999;
  const c = randomColor(0.4);
  assert.match(c, /^rgba\(\d+, \d+, \d+, 0\.4\)$/);
});
ok('randomColor(min, max) keeps alpha in range', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    sandbox.__roll = r;
    const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(randomColor(0.2, 0.8));
    assert.ok(m, 'shape');
    const a = Number(m[4]);
    assert.ok(a >= 0.2 && a <= 0.8, `alpha ${a} in range`);
  }
});
ok('swapped alpha bounds are tolerated', () => {
  sandbox.__roll = 0.5;
  const m = /^rgba\(.*, ([\d.]+)\)$/.exec(randomColor(0.9, 0.1));
  assert.ok(Number(m[1]) >= 0.1 && Number(m[1]) <= 0.9);
});

console.log(`\n[test-moshion-extras] ${n} checks passed`);
