// Acceptance gate for chapter-2 step hints (SPEC-ch2-hints.md).
//
// Two things it measures, and one it refuses to let drift:
//   1. every chapter-2 step carries 1-2 hints, of a sane length
//   2. no hint hands over the answer -- a hint must not be a line of the
//      lesson's own solution.js, modulo whitespace
//   3. NOTHING ELSE in those lesson.json files changed. The baseline in
//      scripts/step-hints-baseline.json hashes each lesson with `hints`
//      stripped out; if a title, requirement or step id moves, this fails.
//
// (3) is the point. An authoring pass that is free to edit the whole file
// will eventually "improve" a requirement regex to make its own work pass.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'scripts', 'step-hints-baseline.json');
const MIN_LEN = 15, MAX_LEN = 240, MAX_HINTS = 2;

const stripHints = (lesson) => {
  const c = JSON.parse(JSON.stringify(lesson));
  for (const s of c.steps ?? []) delete s.hints;
  return c;
};
const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

const dirs = fs.readdirSync(path.join(root, 'lessons'))
  .filter((d) => /^2-/.test(d))
  .filter((d) => fs.existsSync(path.join(root, 'lessons', d, 'lesson.json')));

if (process.argv.includes('--write-baseline')) {
  const out = {};
  for (const d of dirs) {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'lessons', d, 'lesson.json'), 'utf8'));
    if ((lesson.steps ?? []).length) out[d] = hash(stripHints(lesson));
  }
  fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + '\n');
  console.log(`[check-step-hints] baseline written: ${Object.keys(out).length} lessons`);
  process.exit(0);
}

const fail = [];
// Structural drift is a different class of problem from a missing hint: it
// means something OTHER than hints moved, which is the tamper signal this
// file exists for. Kept in its own list and never truncated -- when it lived
// in `fail`, a large hint backlog buried it past the 40-line print cap and
// the check silently looked clean.
const drift = [];
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
if (!baseline) {
  console.error('no baseline: run `node scripts/check-step-hints.mjs --write-baseline` first');
  process.exit(2);
}

let steps = 0, hinted = 0;
for (const d of dirs) {
  const file = path.join(root, 'lessons', d, 'lesson.json');
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!(lesson.steps ?? []).length) continue;

  // (3) everything but hints must be untouched
  const h = hash(stripHints(lesson));
  if (baseline[d] && baseline[d] !== h) drift.push(`${d}: lesson.json changed outside of step hints`);

  // the solution, for the "don't hand over the answer" check
  const solPath = path.join(root, 'lessons', d, 'solution.js');
  const solLines = fs.existsSync(solPath)
    ? fs.readFileSync(solPath, 'utf8').split('\n').map(norm).filter((l) => l.length > 12)
    : [];

  for (const s of lesson.steps) {
    steps++;
    const hs = s.hints;
    if (!Array.isArray(hs) || hs.length === 0) { fail.push(`${d} / "${s.title}": no hints`); continue; }
    hinted++;
    if (hs.length > MAX_HINTS) fail.push(`${d} / "${s.title}": ${hs.length} hints (max ${MAX_HINTS})`);
    for (const hint of hs) {
      if (typeof hint !== 'string') { fail.push(`${d} / "${s.title}": non-string hint`); continue; }
      if (hint.length < MIN_LEN || hint.length > MAX_LEN)
        fail.push(`${d} / "${s.title}": hint length ${hint.length} outside ${MIN_LEN}-${MAX_LEN}`);
      if (norm(hint) === norm(s.instructions ?? ''))
        fail.push(`${d} / "${s.title}": hint just restates the instructions`);
      if (solLines.some((l) => norm(hint).includes(l)))
        fail.push(`${d} / "${s.title}": hint contains a verbatim solution line`);
    }
  }
}

if (process.argv.includes('--write-baseline')) {
  const out = {};
  for (const d of dirs) {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'lessons', d, 'lesson.json'), 'utf8'));
    if ((lesson.steps ?? []).length) out[d] = hash(stripHints(lesson));
  }
  fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + '\n');
  console.log(`[check-step-hints] baseline written: ${Object.keys(out).length} lessons`);
  process.exit(0);
}

// Drift first, and in full: it is the finding you must not miss.
if (drift.length) {
  console.error(`\n[check-step-hints] ${drift.length} lesson(s) changed outside of step hints:`);
  for (const f of drift) console.error('  ' + f);
  console.error('  (if that change was intended, re-run with --write-baseline)');
}

if (fail.length) {
  console.error(`\n[check-step-hints] ${fail.length} hint problem(s):`);
  for (const f of fail.slice(0, 40)) console.error('  ' + f);
  if (fail.length > 40) console.error(`  ...and ${fail.length - 40} more`);
}

if (drift.length || fail.length) process.exit(1);
console.log(`[check-step-hints] ${hinted}/${steps} chapter-2 steps hinted, nothing else changed`);
