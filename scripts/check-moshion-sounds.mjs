#!/usr/bin/env node
// The sound mixer has four seams, and a finished pipeline with nothing at the
// top of it is this repo's most-repeated bug (see check-moshion-textures.mjs).
// This checks all four:
//
//   1. every palette WAV exists, is a real 8-bit PCM WAV, actually contains
//      samples, and is long enough to hear
//   2. music.wav keeps the ~5.33 s length 6.11.10 slices at [0, 1.3, 2.6, 4, 5.3]
//   3. moshion.js resolves `loadSound('<name>')` from the `sound:` store
//   4. the mixer page is reachable and the storage bridge can save sounds
//
// It cannot tell whether a tune is good. It can tell a silent file, a broken
// header, a renamed preset and an unlinked page, which are the failures that
// have actually shipped here before.
//
// Run: node --import ./scripts/register-ts.mjs scripts/check-moshion-sounds.mjs

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUSIC_LOOPS } from '../lib/sound/loops.ts';
import { PALETTE, SFX_PRESETS } from '../lib/sound/presets.ts';
import { PARAM_SPECS, defKey, mutateDef, paramsFromPreset } from '../lib/sound/params.ts';
import { renderSfxDef } from '../lib/sound/render.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const fail = [];
const note = (m) => fail.push(m);

function readWav(file) {
  const b = readFileSync(file);
  if (b.length < 44) throw new Error('shorter than a WAV header');
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not RIFF/WAVE');
  }
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      fmt = {
        format: b.readUInt16LE(body),
        channels: b.readUInt16LE(body + 2),
        sampleRate: b.readUInt32LE(body + 4),
        bits: b.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = { offset: body, size: Math.min(size, b.length - body) };
      break;
    }
    off = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('missing fmt or data chunk');
  const bytesPerFrame = fmt.channels * (fmt.bits / 8);
  return {
    ...fmt,
    data,
    duration: data.size / bytesPerFrame / fmt.sampleRate,
  };
}

function silentBytes(b, wav) {
  const { offset, size } = wav.data;
  let silent = 0;
  if (wav.bits === 8) {
    // 8-bit PCM is unsigned; 128 is the zero line.
    for (let i = 0; i < size; i++) if (b[offset + i] === 128) silent++;
  } else {
    for (let i = 0; i + 1 < size; i += 2) {
      if (b[offset + i] === 0 && b[offset + i + 1] === 0) silent++;
    }
  }
  return silent;
}

const assetDir = 'public/moshion/assets';

// ---- 1. every palette entry is a real, audible WAV ----------------------

const sfxNames = new Set(SFX_PRESETS.map((p) => p.preset));
const loopNames = new Set(MUSIC_LOOPS.map((l) => l.id));

for (const entry of PALETTE) {
  const file = path.join(root, assetDir, `${entry.name}.wav`);
  if (!existsSync(file)) {
    note(`${assetDir}/${entry.name}.wav is missing (run scripts/make-moshion-sounds.mjs)`);
    continue;
  }
  if (entry.kind === 'sfx' && !sfxNames.has(entry.source)) {
    note(`${entry.name}.wav names preset "${entry.source}", which is not in SFX_PRESETS`);
  }
  if (entry.kind === 'music' && !loopNames.has(entry.source)) {
    note(`${entry.name}.wav names loop "${entry.source}", which is not in MUSIC_LOOPS`);
  }
  let wav;
  try {
    wav = readWav(file);
  } catch (e) {
    note(`${entry.name}.wav: ${e.message}`);
    continue;
  }
  if (wav.format !== 1) note(`${entry.name}.wav is not PCM (format ${wav.format})`);
  if (wav.bits !== 8 && wav.bits !== 16) note(`${entry.name}.wav is ${wav.bits}-bit`);
  if (wav.duration < 0.03) note(`${entry.name}.wav is only ${wav.duration.toFixed(3)}s`);
  const b = readFileSync(file);
  if (silentBytes(b, wav) === wav.data.size / (wav.bits / 8)) {
    note(`${entry.name}.wav is silent (every sample is the zero line)`);
  }
}

// ---- 2. music.wav still fits 6.11.10's clip slices -----------------------

const musicFile = path.join(root, assetDir, 'music.wav');
if (existsSync(musicFile)) {
  try {
    const wav = readWav(musicFile);
    if (wav.duration < 5.2 || wav.duration > 5.6) {
      note(`music.wav is ${wav.duration.toFixed(3)}s; 6.11.10 slices it up to 5.3s`);
    }
  } catch { /* already reported above */ }
}

// ---- 3. the engine resolves a saved name --------------------------------

const engine = read('public/moshion/moshion.js');
if (!engine.includes("const SOUND_PREFIX_ = 'sound:'")) {
  note('moshion.js has no sound: prefix, so a saved sound can never load');
}
if (!engine.includes('function _savedSoundSrc(')) {
  note('moshion.js has no _savedSoundSrc()');
}
if (!engine.includes('_savedSoundSrc(this.url)')) {
  note('moshion.js _load() never calls _savedSoundSrc(this.url)');
}

// ---- 4. the page, the links and the storage bridge ----------------------

if (!existsSync(path.join(root, 'app/sound/page.tsx'))) {
  note('app/sound/page.tsx is missing');
}
const page = read('app/sound/page.tsx');
if (!page.includes('SoundMixer')) note('app/sound/page.tsx does not mount SoundMixer');

const nav = read('components/HeaderNav.tsx');
if (!nav.includes('href="/sound"')) note('HeaderNav does not link /sound (check-reachable will fail)');

const lesson = read('components/LessonWorkspace.tsx');
if (!lesson.includes("key: 'sounds'")) note('LessonWorkspace has no Sounds tab');

const sandbox = read('components/SandboxWorkspace.tsx');
if (!sandbox.includes("key: 'sounds'")) note('SandboxWorkspace has no Sounds tab');

const storage = read('lib/moshion-storage.ts');
for (const name of ['SOUND_PREFIX', 'saveSound', 'listSavedSounds', 'deleteSavedSound']) {
  if (!storage.includes(name)) note(`lib/moshion-storage.ts has no ${name}`);
}

// The mic path has two halves that must stay connected. The matcher has its
// own signal tests (scripts/test-sound-match.mjs); this is the wiring check.
const mixer = read('components/SoundMixer.tsx');
if (!mixer.includes('matchRecording')) note('the mixer does not call matchRecording');
if (!mixer.includes('getUserMedia')) note('the mixer has no microphone capture');

// ---- 5. the vendored engines and their licences --------------------------

for (const f of [
  'lib/sound/vendor/jsfxr/sfxr.cjs',
  'lib/sound/vendor/jsfxr/riffwave.cjs',
  'lib/sound/vendor/jsfxr/UNLICENSE',
  'lib/sound/vendor/zzfxm/zzfxm.js',
  'lib/sound/vendor/zzfxm/LICENSE',
]) {
  if (!existsSync(path.join(root, f))) note(`${f} is missing`);
}
// `.cjs` is load-bearing. Next's dev React Refresh loader injects
// `import.meta.webpackHot` into the modules it treats as ESM. A subdirectory
// package.json with "type": "commonjs" made webpack parse these UMD files as
// CJS while the loader still injected import.meta, and /sound answered 500
// with "Cannot use 'import.meta' outside a module". The extension keeps them
// out of that loader in both dev and build.
const sfxrWrapper = read('lib/sound/vendor/jsfxr/sfxr.mjs');
if (!sfxrWrapper.includes("'./riffwave.cjs'") || !sfxrWrapper.includes("'./sfxr.cjs'")) {
  note('sfxr.mjs must import the vendored engines as .cjs');
}

// ---- 6. the tweak model is the sound -------------------------------------

const coinDef = paramsFromPreset('pickupCoin');
if (Number(coinDef.p_env_decay) !== 0.3) {
  note('paramsFromPreset does not pin the coin envelope (p_env_decay should be 0.3)');
}
const tweaked = { ...coinDef, p_base_freq: 0.9 };
if (defKey(tweaked) === defKey(coinDef)) note('defKey ignores a changed parameter');

let mutated = coinDef;
for (let i = 0; i < 10 && defKey(mutated) === defKey(coinDef); i++) mutated = mutateDef(coinDef);
if (defKey(mutated) === defKey(coinDef)) note('mutateDef changed no parameter after 10 tries');
for (const spec of PARAM_SPECS) {
  const v = Number(mutated[spec.key]);
  if (!Number.isFinite(v) || v < spec.min || v > spec.max) {
    note(`mutateDef put ${spec.key} outside ${spec.min}..${spec.max}`);
  }
}

const custom = renderSfxDef(tweaked);
if (!custom.dataUri.startsWith('data:audio/wav;base64,')) {
  note('renderSfxDef did not produce a WAV data URI');
}
if (!(custom.samples.length > 0)) note('renderSfxDef produced no samples');
if (!(custom.duration > 0)) note('renderSfxDef reports no duration');

if (fail.length) {
  console.error('\nFAIL  sound mixer');
  for (const m of fail) console.error(`  - ${m}`);
  console.error('');
  process.exit(1);
}

console.log(`OK  sound mixer: ${PALETTE.length} palette WAVs, engine lookup, storage bridge, page links`);
