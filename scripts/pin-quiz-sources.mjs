// Pins every quiz question's `source` citation to a stable folder id.
//
// `source` is prose the student sees resolved into a "review this" link --
// QuizView looks it up LIVE by display number. Display numbers move on every
// insert or reorder, and no tool rewrites this field, so it rots into pointing
// at a real but unrelated lesson. That shipped: unit 2.1 was renumbered and
// three questions kept their old numbers.
//
// `sourceIds` records the folder id each number resolved to. Ids do not move.
// check-lesson-numbers.mjs then verifies the pair still agrees, which is the
// check that actually catches drift -- verifying the number merely EXISTS does
// not, because a drifted number still names a real lesson.
//
// Run this only when you deliberately change which lesson a question cites.
// A renumber should rewrite `source` (see the unit move tooling), not re-pin.
//
//   node scripts/pin-quiz-sources.mjs           # report what would change
//   node scripts/pin-quiz-sources.mjs --apply   # write it
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const lessonsDir = path.join(root, 'lessons');
const APPLY = process.argv.includes('--apply');

const byNumber = new Map();
const dirs = fs.readdirSync(lessonsDir).filter((d) =>
  fs.existsSync(path.join(lessonsDir, d, 'lesson.json')));

for (const d of dirs) {
  const j = JSON.parse(fs.readFileSync(path.join(lessonsDir, d, 'lesson.json'), 'utf8'));
  const m = /^(\d+\.\d+\.\d+)\s/.exec(j.title ?? '');
  if (m) byNumber.set(m[1], d);
}

let pinned = 0, unresolved = 0;
for (const d of dirs) {
  const p = path.join(lessonsDir, d, 'lesson.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const questions = j.quiz?.questions;
  if (!Array.isArray(questions)) continue;

  let touched = false;
  questions.forEach((q, i) => {
    if (!q.source) return;
    const cited = String(q.source).match(/\d+\.\d+\.\d+/g) ?? [];
    const ids = [];
    for (const n of cited) {
      const fid = byNumber.get(n);
      if (!fid) {
        console.error(`  UNRESOLVED ${d} q${i + 1} cites ${n} — no lesson has that number`);
        unresolved++;
        return;
      }
      ids.push(fid);
    }
    if (JSON.stringify(q.sourceIds) !== JSON.stringify(ids)) {
      console.log(`  ${d} q${i + 1}: ${JSON.stringify(q.sourceIds ?? null)} -> ${JSON.stringify(ids)}`);
      q.sourceIds = ids;
      touched = true;
      pinned++;
    }
  });

  if (touched && APPLY) fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}

console.log(`[pin-quiz-sources] ${pinned} question(s) ${APPLY ? 'pinned' : 'would change'}`
  + `, ${unresolved} unresolved`);
if (unresolved) process.exit(1);
