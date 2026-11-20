#!/usr/bin/env node
// public/moshion/extras.js holds only what needs shCode's server (rooms,
// multiplayer(), account saves; tested in test-moshion-multiplayer.mjs and
// test-sketch-saves.mjs). These checks pin the boundary: the colour helpers
// that used to live here are the engine's now, a sketch still gets them with
// extras loaded on top, and extras.js does not define them again (a second
// copy would silently replace the engine's after every sync).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createSandbox } from './moshion-harness.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

const box = createSandbox();
const g = box.sandbox ?? box.context ?? globalThis;
const run = (expr) => { assert.ok(box.run(`globalThis.__out = (${expr});`), String(box.errors[0])); return box.sandbox ? box.sandbox.__out : g.__out; };

ok('rgba() comes from the engine and builds a CSS string', () => {
  assert.equal(run('rgba(255, 99, 71, 0.5)'), 'rgba(255, 99, 71, 0.5)');
  assert.equal(run('rgba(300, -5, 12.6, 2)'), 'rgba(255, 0, 13, 1)');
  assert.equal(run('rgba([10, 20, 30], 0.25)'), 'rgba(10, 20, 30, 0.25)');
});
ok('randomColor() gives an rgba string with the alpha asked for', () => {
  assert.match(run('randomColor(0.3)'), /^rgba\(\d+, \d+, \d+, 0\.3\)$/);
});
ok('extras.js does not define the engine colour helpers again', () => {
  const src = readFileSync(join(repo, 'public', 'moshion', 'extras.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /function\s+(rgba|randomColor)\s*\(|\.(rgba|randomColor)\s*=/);
});

console.log(`\n[test-moshion-extras] ${n} checks passed`);
