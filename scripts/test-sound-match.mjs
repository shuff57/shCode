#!/usr/bin/env node
// Pin the mouth-sound matcher against synthetic signals whose answer is
// known. This is the part of the mic feature that can be wrong in a way the
// eye cannot see: a decaying sine misread as a saw, a slide misread as
// vibrato, or a quiet recording turned into a confident wrong guess.
//
// The signals are generated here, so the test spends no model credits and
// runs in `npm test` with everything else.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-sound-match.mjs

import { matchRecording, paramToFreq } from '../lib/sound/match.ts';
import { PARAM_SPECS } from '../lib/sound/params.ts';

const RATE = 44100;
const fail = [];
const note = (m) => fail.push(m);
const close = (actual, expected, tolerance, label) => {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    note(`${label}: expected ${expected} +/- ${tolerance}, got ${actual.toFixed(3)}`);
  }
};

function tone(freq, seconds, tau = 0) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = tau ? Math.exp(-t / tau) : 1;
    out[i] = 0.7 * env * Math.sin(2 * Math.PI * freq * t);
  }
  return out;
}

function sweep(from, to, seconds) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = from + (to - from) * (t / seconds);
    phase += (2 * Math.PI * f) / RATE;
    out[i] = 0.7 * Math.sin(phase);
  }
  return out;
}

function square(freq, seconds, duty = 0.5) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = 0.7 * (((t * freq) % 1) < duty ? 1 : -1);
  }
  return out;
}

function saw(freq, seconds) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = 0.7 * (2 * ((t * freq) % 1) - 1);
  }
  return out;
}

function wobble(freq, seconds) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = freq * (1 + 0.08 * Math.sin(2 * Math.PI * 6 * t));
    phase += (2 * Math.PI * f) / RATE;
    out[i] = 0.7 * Math.sin(phase);
  }
  return out;
}

function noise(seconds) {
  // Deterministic LCG: a failing test must fail the same way next run.
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  let seed = 123456789;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out[i] = 0.7 * ((seed / 0xffffffff) * 2 - 1);
  }
  return out;
}

function checkSpecRange(def, label) {
  for (const spec of PARAM_SPECS) {
    const v = Number(def[spec.key]);
    if (!Number.isFinite(v) || v < spec.min || v > spec.max) {
      note(`${label}: ${spec.key}=${v} is outside ${spec.min}..${spec.max}`);
    }
  }
}

function run(name, signal, expect) {
  const match = matchRecording(signal, RATE);
  if (!match) {
    note(`${name}: returned null, expected a match`);
    return;
  }
  checkSpecRange(match.def, name);
  if (expect.wave !== undefined && match.def.wave_type !== expect.wave) {
    note(`${name}: wave_type=${match.def.wave_type}, expected ${expect.wave}`);
  }
  if (expect.freq !== undefined) {
    const freq = paramToFreq(Number(match.def.p_base_freq));
    close(freq, expect.freq, expect.freq * 0.12, `${name} frequency`);
  }
  if (expect.ramp !== undefined && !(Number(match.def.p_freq_ramp) * expect.ramp > 0.2)) {
    note(`${name}: p_freq_ramp=${match.def.p_freq_ramp}, expected sign ${expect.ramp}`);
  }
  if (expect.vibrato === false && !(Number(match.def.p_vib_strength) < 0.1)) {
    note(`${name}: reported vibrato ${match.def.p_vib_strength} on a steady sound`);
  }
  if (expect.vibrato === true && !(Number(match.def.p_vib_strength) > 0.1)) {
    note(`${name}: no vibrato reported on a wobbling sound`);
  }
}

// A steady, decaying sine reads as a sine at the right pitch, with no slide.
run('sine 440', tone(440, 0.4, 0.12), { wave: 2, freq: 440, vibrato: false });

// Waveform identity comes from harmonic ratios.
run('square 440', square(440, 0.4), { wave: 0, freq: 440, vibrato: false });
run('saw 440', saw(440, 0.4), { wave: 1, freq: 440, vibrato: false });

// A slide is a slide, not vibrato.
run('rising 200-800', sweep(200, 800, 0.4), { ramp: 1, vibrato: false });
run('falling 800-200', sweep(800, 200, 0.4), { ramp: -1, vibrato: false });

// A 6 Hz wobble is vibrato.
run('wobble 440', wobble(440, 1.2), { vibrato: true });

// Noise is noise.
run('noise', noise(0.4), { wave: 3 });

// Silence is not a sound.
if (matchRecording(new Float32Array(RATE * 0.4), RATE) !== null) {
  note('silence should return null');
}

// A pitch too short to fit is refused rather than guessed.
if (matchRecording(tone(440, 0.01), RATE) !== null) {
  note('a 10 ms click should return null');
}

if (fail.length) {
  console.error('\nFAIL  sound match');
  for (const m of fail) console.error(`  - ${m}`);
  console.error('');
  process.exit(1);
}

console.log('OK  sound match: sine/square/saw/noise, rising/falling, wobble, silence refused');
