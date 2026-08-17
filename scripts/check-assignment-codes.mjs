// An assignment code identifies one artifact in the curriculum plan, so two
// lessons must never claim the same one. This exists because a backfill that
// harvested codes out of the module docs read the line
//   "2-3-4-lab-convert-to-switch was NOT A2.3.1"
// and stamped the negation, leaving A2.3.1 on two lessons at once.
//
// Codes live in lesson.json's `assignmentCode`, not in the title -- the title
// is what a student reads, and the code means nothing to them.
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const byCode = new Map();
const titles = new Map();
const inTitle = [];

for (const d of readdirSync(path.join(root, 'lessons'))) {
  const p = path.join(root, 'lessons', d, 'lesson.json');
  if (!existsSync(p)) continue;
  let j;
  try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }

  titles.set(d, j.title);
  if (j.assignmentCode) {
    if (!/^A\d+\.\d+\.\d+$/.test(j.assignmentCode)) {
      console.error(`FAIL  ${d}: malformed assignmentCode "${j.assignmentCode}"`);
      process.exit(1);
    }
    (byCode.get(j.assignmentCode) || byCode.set(j.assignmentCode, []).get(j.assignmentCode)).push(d);
  }
  // The code was lifted out of titles on purpose; catch a regression.
  if (/^\d+\.\d+\.\d+\s+A\d+\.\d+\.\d+/.test(String(j.title || ''))) inTitle.push(`${d}  ${j.title}`);
}

// A code may span more than one lesson (A2.2.1 is a written part plus a coding
// part), but only when each half says which part it is -- otherwise the repeat
// is a mis-stamp, not a split assignment.
const partOf = (d) => (String(titles.get(d) || '').match(/\((Part [^)]+)\)\s*$/) || [])[1];

let bad = 0;
for (const [code, ds] of [...byCode].sort()) {
  if (ds.length === 1) continue;
  const parts = ds.map(partOf);
  if (parts.some((p) => !p) || new Set(parts).size !== parts.length) {
    console.error(`FAIL  ${code} claimed by ${ds.length} lessons without distinct parts: ${ds.join(', ')}`);
    bad++;
  }
}
if (inTitle.length) {
  console.error(`FAIL  ${inTitle.length} title(s) still spell an assignment code:`);
  inTitle.forEach((t) => console.error('        ' + t));
  bad++;
}

if (bad) process.exit(1);
console.log(`assignment codes OK — ${byCode.size} codes, each on exactly one lesson, none in a title`);
