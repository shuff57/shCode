// Every part of every Performance Assessment (Group and Individual) gets three
// tries, a recorded best score and, after the third try, the solution as
// pseudocode. Spec: .gauntlet/SPEC-attempt-caps.md.
//
// A PA lesson is one whose `unit` contains "Performance Assessment". Keying on the
// unit, not a folder pattern, is deliberate: Chapter 1's group parts are
// `1-6-*-ch1-pa-*` and a name regex missed them. A PA written later joins the
// check by being in a PA unit, which is what carries the rule forward.
//
// Per lesson this requires:
//   1. maxSubmissions === 3 in the config block its renderer reads
//      (quiz / aiGrader / diagram / grading). `summative` alone caps nothing.
//   2. pa-pseudocode/<id>.md, non-empty. A top-level folder rather than
//      lessons/<id>/solution/ on purpose: a lesson with both solution.js and a
//      solution/ directory fails the build, and lib/lessons.ts ships anything it
//      finds under lessons/. check-solution-leak must learn this folder in phase 3.
//      The block must be the one the part's renderer READS, because a cap anywhere
//      else is enforced by the server but invisible in the browser (no banner,
//      page navigates away): quiz -> quiz, chart -> diagram, console -> grading or
//      aiGrader, written -> aiGrader. A capped quiz must also be summative, or its
//      key is never baked and nothing scores it server-side.
//   3. A chart or demo part (design-chart, chart-it, demo) carries an aiGrader.
//      The coding parts (build, find-and-fix) keep their deterministic checks.
//
//   node scripts/check-pa-attempts.mjs          # exit 1 and list every gap
//   node scripts/check-pa-attempts.mjs --list   # print what it found, exit 0

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');
const PSEUDO = path.join(ROOT, 'pa-pseudocode');
const WANT = 3;
const listOnly = process.argv.includes('--list');

const BLOCKS = ['quiz', 'aiGrader', 'diagram', 'grading'];

// The block(s) each renderer reads maxSubmissions from, by lesson.preview.
const READS = { quiz: ['quiz'], diagram: ['diagram'], console: ['grading', 'aiGrader'] };
const readsFor = (lesson) => READS[lesson.preview] || ['aiGrader'];

function capOf(lesson) {
  const found = [];
  for (const b of BLOCKS) {
    const cfg = lesson[b];
    if (cfg && typeof cfg === 'object' && 'maxSubmissions' in cfg) {
      found.push({ block: b, value: cfg.maxSubmissions });
    }
  }
  // A chart's AI block lives under diagram.aiGrader.
  const d = lesson.diagram && lesson.diagram.aiGrader;
  if (d && 'maxSubmissions' in d) found.push({ block: 'diagram.aiGrader', value: d.maxSubmissions });
  return found;
}

const hasAi = (l) => !!(l.aiGrader || (l.diagram && l.diagram.aiGrader));
const needsAi = (id) => /design-chart|chart-it|-demo$/.test(id);

const problems = [];
const rows = [];

for (const id of fs.readdirSync(LESSONS).sort()) {
  const file = path.join(LESSONS, id, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let lesson;
  try { lesson = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  if (!/Performance Assessment/.test(lesson.unit || '')) continue;

  const gaps = [];
  const caps = capOf(lesson);
  if (caps.length === 0) gaps.push('no maxSubmissions');
  else {
    if (!caps.some((c) => c.value === WANT)) gaps.push(`maxSubmissions is ${caps.map((c) => c.value).join('/')}, want ${WANT}`);
    const reads = readsFor(lesson);
    const stray = caps.filter((c) => !reads.includes(c.block));
    if (stray.length) gaps.push(`maxSubmissions sits in ${stray.map((c) => c.block).join(', ')}, which the ${lesson.preview || 'written'} renderer does not read (it reads ${reads.join(' or ')})`);
    if (!caps.some((c) => reads.includes(c.block))) gaps.push(`maxSubmissions is not in ${reads.join(' or ')}`);
  }
  if (lesson.quiz && 'maxSubmissions' in lesson.quiz && lesson.quiz.summative !== true) gaps.push('a capped quiz must set quiz.summative');

  const pseudo = path.join(PSEUDO, `${id}.md`);
  if (!fs.existsSync(pseudo)) gaps.push('no pa-pseudocode/<id>.md');
  else if (fs.readFileSync(pseudo, 'utf8').trim().length < 40) gaps.push('pa-pseudocode/<id>.md is empty');

  if (needsAi(id) && !hasAi(lesson)) gaps.push('chart/demo part has no aiGrader');

  rows.push({ id, gaps });
  for (const g of gaps) problems.push(`${id}: ${g}`);
}

if (rows.length === 0) {
  console.error('[check-pa-attempts] FAILED: found no Performance Assessment lessons, so the check would pass vacuously');
  process.exit(1);
}

if (listOnly) {
  for (const r of rows) console.log(`${r.gaps.length ? 'GAP' : 'ok '}  ${r.id}${r.gaps.length ? '  -- ' + r.gaps.join('; ') : ''}`);
  process.exit(0);
}

if (problems.length) {
  console.error(`[check-pa-attempts] FAILED -- ${problems.length} gap(s) across ${rows.filter((r) => r.gaps.length).length} of ${rows.length} PA lessons`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`[check-pa-attempts] ok -- ${rows.length} PA lessons, ${WANT} tries and a pseudocode file each`);
