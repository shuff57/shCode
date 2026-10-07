// Fill the gap left by batches 8-11.
//
// THE BUG: those batches listed criteria in SKIP_TITLE with the reason "covered
// by the default pointer on this lesson". That reads like a note but it is a
// SKIP -- it stops the default from being applied. So on any lesson where every
// criterion was listed that way, the lesson got NO pointers at all, even though
// its default was correct. 198 criteria across 60-odd lessons sat on cards with
// no link anywhere.
//
// Batch 7 had the same bug and was fixed by deleting those entries; batches 8-11
// reintroduced it. This is the single pass that repairs all of them, and it
// works from the SAME default tables the batches used, so it cannot invent a
// target that was not already reviewed.
//
// A criterion is filled only when:
//   - its description still carries no lesson number, and
//   - its lesson has a reviewed default, and
//   - it is not explicitly declined (the SEQUENCING and tool-surface skips).
// Re-running adds nothing.

import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

// Pull the reviewed default for every folder out of the batch scripts, so this
// pass and the batches can never disagree about what a lesson's target is.
const BATCHES = [
  'apply-criterion-pointers-2-1.mjs',
  'apply-criterion-pointers-3-1.mjs',
  'apply-criterion-pointers-batch3.mjs',
  'apply-criterion-pointers-batch4.mjs',
  'apply-criterion-pointers-batch5.mjs',
  'apply-criterion-pointers-batch6.mjs',
  'apply-criterion-pointers-batch7.mjs',
  'apply-criterion-pointers-batch8.mjs',
  'apply-criterion-pointers-batch9.mjs',
  'apply-criterion-pointers-batch10.mjs',
  'apply-criterion-pointers-batch11.mjs',
];

const DEFAULTS = new Map();
for (const b of BATCHES) {
  const src = readFileSync(`scripts/${b}`, 'utf8');
  // "'<folder>': { target: 'X.Y.Z', note: '...' }," inside the POINTERS block
  const block = src.match(/const POINTERS = \{([\s\S]*?)\n\};/);
  if (!block) continue;
  for (const m of block[1].matchAll(/'([^']+)':\s*\{\s*target:\s*'([\d.]+)',\s*note:\s*'([^']*)'\s*\}/g)) {
    DEFAULTS.set(m[1], { target: m[2], note: m[3] });
  }
}

// Explicit declines, gathered from every batch's SKIP_TITLE: anything whose
// reason mentions SEQUENCING or the tool surface stays unpointed on purpose.
const DECLINED = new Map();
for (const b of BATCHES) {
  const src = readFileSync(`scripts/${b}`, 'utf8');
  const block = src.match(/const SKIP_TITLE = \{([\s\S]*?)\n\};/);
  if (!block) continue;
  for (const m of block[1].matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
    const why = m[2];
    if (/SEQUENCING|tool surface|named in content\.md|no earlier reading|nothing to link/i.test(why)) {
      if (!DECLINED.has(m[1])) DECLINED.set(m[1], why);
    }
  }
}

const DRY = process.argv.includes('--dry-run');
let filled = 0;
let touched = 0;
let declinedSkipped = 0;

for (const [folder, def] of DEFAULTS) {
  const file = `lessons/${folder}/lesson.json`;
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  let changed = false;
  for (const req of lesson.requirements ?? []) {
    const title = String(req.title ?? '');
    const desc = String(req.description ?? '');
    if (/\d+\.\d+\.\d+/.test(desc)) continue;
    if (DECLINED.has(title)) {
      declinedSkipped++;
      continue;
    }
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${def.target} (${def.note})`;
    filled++;
    changed = true;
    console.log(`  ${DRY ? 'would fill' : 'fill   '}  ${folder} -> ${def.target}  "${title.slice(0, 50)}"`);
  }
  if (changed && !DRY) {
    writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
    touched++;
  }
}

console.log(
  `\n${DRY ? 'DRY RUN: ' : ''}${filled} criterion/criteria filled across ${touched} lesson(s). ` +
  `${declinedSkipped} left unpointed by explicit decision.`,
);
