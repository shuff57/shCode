#!/usr/bin/env node
// Generate the course's 8-bit sound palette from the vendored engines.
//
// This replaces the stand-in tones that used to be in public/moshion/assets/
// (see VENDORED.md). Music loops and designed effects (a `def`) are exact and
// re-render byte for byte; a jsfxr PRESET is random, so its committed file is
// kept unless you pass --force. Commit the WAVs. Nothing loads jsfxr or ZzFXM at sketch time — the games get plain
// WAV files, which is exactly what loadSound() already understands.
//
// The mixer offers the same palette live (app/sound) and saves a student's own
// version into the browser store, so these files are the shared starting
// point, not the only sounds.
//
// Run: node --import ./scripts/register-ts.mjs scripts/make-moshion-sounds.mjs

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESIGN_BASE, PALETTE } from '../lib/sound/presets.ts';
import { renderMusic, renderSfx, renderSfxDef } from '../lib/sound/render.ts';
import { dataUriBytes } from '../lib/sound/wav.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'moshion', 'assets');

// The course's music.wav has been 5.33 s of stereo since it was written, and
// 6.11.10's challenge slices it at [0, 1.3, 2.6, 4, 5.3]. Keep that file at
// full rate and stereo; the shorter menu cues can be half-rate mono.
function render(entry) {
  if (entry.kind === 'sfx' && entry.def) {
    return renderSfxDef({ ...DESIGN_BASE, ...entry.def, sample_rate: 22050 }, 22050);
  }
  if (entry.kind === 'sfx') {
    return renderSfx(entry.source, '', 22050);
  }
  const full = entry.name === 'music';
  return renderMusic(entry.source, full ? { saveRate: 44100, mono: false } : { saveRate: 22050, mono: true });
}

// A jsfxr PRESET is random every time it is generated, so re-running this
// script used to replace the course's committed coin/jump/hit/... with new,
// different sounds (found 2026-11-07). Those files are now kept as they are;
// pass --force to regenerate them on purpose. Designed effects (a `def`) and
// the music loops are exact, so they are always written.
const force = process.argv.includes('--force');
let wrote = 0;
let kept = 0;
const rows = [];
for (const entry of PALETTE) {
  const target = path.join(outDir, `${entry.name}.wav`);
  if (entry.kind === 'sfx' && !entry.def && existsSync(target) && !force) {
    kept += 1;
    continue;
  }
  const rendered = render(entry);
  const bytes = dataUriBytes(rendered.dataUri);
  writeFileSync(path.join(outDir, `${entry.name}.wav`), bytes);
  wrote += 1;
  rows.push({
    file: `${entry.name}.wav`,
    kind: entry.kind,
    seconds: rendered.duration.toFixed(3),
    kb: (bytes.length / 1024).toFixed(1),
  });
}

console.log(`Wrote ${wrote} files to public/moshion/assets/` + (kept ? ` (kept ${kept} existing preset sounds; --force regenerates them)` : ''));
for (const row of rows) {
  console.log(`  ${row.file.padEnd(14)} ${row.kind.padEnd(5)} ${row.seconds.padStart(7)}s ${row.kb.padStart(7)} KB`);
}
