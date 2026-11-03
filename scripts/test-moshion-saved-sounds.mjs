#!/usr/bin/env node
// The mixer's save path is only useful if a sketch can actually load it.
// check-moshion-sounds.mjs proves the seams exist; this proves they carry
// bytes, by running the real engine in the corpus harness with a seeded
// `sound:<name>` entry.
//
// Three things are asserted:
//   1. loadSound('zap') fetches the saved data: URI, not the bare name
//   2. a path still bypasses the store (`/moshion/assets/coin.wav` is the file)
//   3. the Sound reports loaded/duration, so the decode really happened
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-moshion-saved-sounds.mjs

import { createSandbox } from './moshion-harness.mjs';
import { renderMusic, renderSfx } from '../lib/sound/render.ts';

const fail = [];
const note = (m) => fail.push(m);

const sfx = renderSfx('pickupCoin');
const music = renderMusic('won');
if (!sfx.dataUri.startsWith('data:audio/wav;base64,')) note('renderSfx did not produce a WAV data URI');
if (!music.dataUri.startsWith('data:audio/wav;base64,')) note('renderMusic did not produce a WAV data URI');

function makeBox() {
  const box = createSandbox({ width: 200, height: 200 });
  // The harness's fetch returns plausible bytes; wrap it to see WHAT was asked
  // for. That is the whole assertion.
  const asked = [];
  const original = box.sandbox.fetch;
  box.sandbox.fetch = (url) => {
    asked.push(String(url));
    return original(url);
  };
  box.sandbox.localStorage.setItem('sound:zap', JSON.stringify(sfx.dataUri));
  box.sandbox.localStorage.setItem('sound:tune', JSON.stringify(music.dataUri));
  box.sandbox.localStorage.setItem('sound:coin', JSON.stringify(music.dataUri));
  return { box, asked };
}

async function settle(box) {
  // _load() is two awaits deep (fetch, then decodeAudioData). Await the Sound's
  // own ready promise when it is there; that is the engine's contract, and it
  // is cheaper than guessing how many microtask turns the decode takes.
  for (const s of [box.sandbox.zap, box.sandbox.tune, box.sandbox.coin]) {
    if (s && s.ready) {
      try { await s.ready; } catch { /* reported below as not loaded */ }
    }
  }
  box.drainTimers();
  await Promise.resolve();
}

// ---- 1. a saved name resolves to its data URI ----------------------------
{
  const { box, asked } = makeBox();
  const ok = box.run(`
    var zap, tune;
    function setup() {
      new Canvas(200, 200);
      zap = loadSound('zap');
      tune = loadSound('sound:tune');
    }
    function draw() { background('black'); }
  `);
  if (!ok || box.errors.length) {
    note(`saved-name sketch did not boot: ${box.errors[0]?.message ?? 'unknown error'}`);
  } else {
    await settle(box);
    if (asked[0] !== sfx.dataUri) {
      note(`loadSound('zap') fetched ${JSON.stringify(String(asked[0]).slice(0, 40))}, not the saved data URI`);
    }
    if (asked[1] !== music.dataUri) {
      note(`loadSound('sound:tune') fetched ${JSON.stringify(String(asked[1]).slice(0, 40))}, not the saved data URI`);
    }
    const zap = box.sandbox.zap;
    const tune = box.sandbox.tune;
    if (!zap || !zap.loaded) note('the saved sound did not report loaded');
    if (!tune || !tune.loaded) note('the saved music did not report loaded');
    if (zap && !(zap.duration > 0)) note('the saved sound reports no duration');
    if (tune && !(tune.duration > 0)) note('the saved music reports no duration');
  }
}

// ---- 2. a path is never looked up in the store --------------------------
{
  const { box, asked } = makeBox();
  const ok = box.run(`
    var coin;
    function setup() {
      new Canvas(200, 200);
      coin = loadSound('/moshion/assets/coin.wav');
    }
    function draw() { background('black'); }
  `);
  if (!ok || box.errors.length) {
    note(`path sketch did not boot: ${box.errors[0]?.message ?? 'unknown error'}`);
  } else {
    await settle(box);
    if (asked[0] !== '/moshion/assets/coin.wav') {
      note(`a path was resolved through the store: fetched ${String(asked[0]).slice(0, 40)}`);
    }
  }
}

if (fail.length) {
  console.error('\nFAIL  moSHion saved sounds');
  for (const m of fail) console.error(`  - ${m}`);
  console.error('');
  process.exit(1);
}

console.log('OK  moSHion saved sounds: loadSound(name) fetches the saved WAV; a path still bypasses the store');
