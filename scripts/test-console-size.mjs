#!/usr/bin/env node
// Tests lib/console-size.ts: the rules behind the resizable console box (sandbox, lessons, /play and
// shared programs all use components/ResizableConsole.tsx). What has to hold:
//   1. a dragged height stays between the minimum and the ceiling;
//   2. a short window (ceiling below the minimum) still leaves the minimum: the console never vanishes;
//   3. a height or ceiling that is not a number cannot produce NaN, which would be an invalid CSS height;
//   4. the arrow keys: up taller, down shorter, Shift for a bigger step, other keys ignored.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-console-size.mjs

import assert from 'node:assert/strict';
import { CONSOLE_MIN, clampConsoleHeight, consoleKeyDelta, windowShare } from '../lib/console-size.ts';

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}

check('a height inside the range is kept', () => {
  assert.equal(clampConsoleHeight(200, 500), 200);
});
check('too tall is cut to the ceiling', () => {
  assert.equal(clampConsoleHeight(900, 500), 500);
});
check('too short is raised to the minimum', () => {
  assert.equal(clampConsoleHeight(10, 500), CONSOLE_MIN);
  assert.equal(clampConsoleHeight(-50, 500), CONSOLE_MIN);
});
check('a ceiling below the minimum still leaves the minimum', () => {
  assert.equal(clampConsoleHeight(300, 40), CONSOLE_MIN);
  assert.equal(clampConsoleHeight(300, 0), CONSOLE_MIN);
});
check('a fraction is rounded to whole pixels', () => {
  assert.equal(clampConsoleHeight(200.6, 500), 201);
});
check('NaN or Infinity never reaches the page as a height', () => {
  assert.equal(clampConsoleHeight(NaN, 500), CONSOLE_MIN);
  assert.equal(clampConsoleHeight(Infinity, 500), 500);
  assert.equal(clampConsoleHeight(200, NaN), 200);
  assert.equal(clampConsoleHeight(200, Infinity), 200);
});
check('a custom minimum is honoured', () => {
  assert.equal(clampConsoleHeight(50, 500, 120), 120);
});
check('arrow keys: up taller, down shorter, Shift is a bigger step', () => {
  assert.equal(consoleKeyDelta('ArrowUp', false), 24);
  assert.equal(consoleKeyDelta('ArrowDown', false), -24);
  assert.equal(consoleKeyDelta('ArrowUp', true), 80);
  assert.equal(consoleKeyDelta('ArrowDown', true), -80);
});
check('other keys are not the console\'s', () => {
  for (const k of ['ArrowLeft', 'ArrowRight', 'Enter', ' ', 'a', 'Tab']) assert.equal(consoleKeyDelta(k, false), null);
});
check('a window share is a whole number and never negative', () => {
  assert.equal(windowShare(800), 480);
  assert.equal(windowShare(-5), 0);
});

console.log(`\n${passed} passing`);
