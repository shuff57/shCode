// Every requirement of a console lab in Units 3.1-3.8 must carry a `hint`.
// lib/grader.ts shows the hint under a failing requirement; a requirement
// without one leaves the student with only the title. Hints are a nudge toward
// the idea, never the answer, and about 140 characters.
//
// Run: node scripts/check-hints.mjs   (also part of `npm test`)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
// New hints aim for 140; the drills' test hints run to ~245, so the gate is a sanity cap.
const MAX = 250;

const problems = [];
let checked = 0;
for (const dir of fs.readdirSync(lessonsDir)) {
  if (!/^3-[1-8]-/.test(dir)) continue;
  const p = path.join(lessonsDir, dir, 'lesson.json');
  if (!fs.existsSync(p)) continue;
  const lesson = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (lesson.type !== 'assignment' || lesson.preview !== 'console') continue;
  for (const r of lesson.requirements || []) {
    checked++;
    const h = typeof r.hint === 'string' ? r.hint.trim() : '';
    if (!h) problems.push(`${dir} ${r.id}: no hint`);
    else if (h.length > MAX) problems.push(`${dir} ${r.id}: hint is ${h.length} chars (max ${MAX})`);
  }
}
if (problems.length) {
  console.error(`check-hints: ${problems.length} problem(s)\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`check-hints: ${checked} requirements all carry a hint`);
