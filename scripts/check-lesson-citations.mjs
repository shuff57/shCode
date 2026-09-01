// Every lesson number written in prose must name a lesson that exists, and one
// the student has already reached.
//
// Two failures this catches, both of which shipped:
//
//   UNRESOLVED  Units 6.6-6.8 carried 40 citations still written in the old
//               2.6/2.7 numbering from before chapter 6 was renumbered. "See
//               2.7.14 (HingeJoint)" pointed at nothing at all. Nothing noticed
//               for as long as those units have existed, because prose is not
//               compiled and a dead cross-reference renders as ordinary text.
//
//   FORWARD     A citation pointing at a lesson the student has not reached.
//               Sends them to material that assumes what they are trying to
//               learn. There are none today; a reorder is what creates them.
//
// What it deliberately does NOT check is whether a resolvable citation names
// the RIGHT lesson. That needs a human -- 2.4.20 cited 2.4.10 for something the
// student wrote in 2.4.12, and every mechanical check here passes it. Use
// scripts/audit-quiz-citations.mjs for the quiz half of that question.
//
// Numbering that is not a citation -- "Definition 1.5.5", "Figure 2.2.3" -- is
// skipped by the label in front of it.
//
// Run: node scripts/check-lesson-citations.mjs   (also part of `npm test`)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');

// A number is a citation unless one of these words introduces it.
const LABELLED = /(?:definition|figure|fig\.?|table|example|section|appendix|version|v)\s*$/i;

// Only a citation phrased as a BACK-reference is checked for direction.
//
// Pointing forward is not a defect on its own -- every reading in chapters 5-7
// opens with "**Read before `6.7.4 ...`**", which is the whole point of that
// line. Treating those as errors flagged 77 of them and would have made the
// gate useless. What is a defect is prose telling the student they have
// ALREADY covered something they have not reached yet.
const BACKWARD = /\b(?:from|in lesson|back in|earlier in|you (?:wrote|saw|built|made|used|learned|met)|composes?|composing|learned|practi[cs]ed|covered|met|introduced in|shown in)\b[^.]{0,60}$/i;

const lessons = [];
for (const d of fs.readdirSync(lessonsDir).sort()) {
  const p = path.join(lessonsDir, d, 'lesson.json');
  if (!fs.existsSync(p)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  const m = /^(\d+)\.(\d+)\.(\d+)\s+(.*)/.exec(j.title ?? '');
  if (!m) continue;
  lessons.push({ dir: d, num: `${+m[1]}.${+m[2]}.${+m[3]}`, title: j.title, quiz: j.quiz,
    key: [+m[1], +m[2], +m[3]] });
}
lessons.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2]);

const byNum = new Map(lessons.map((l) => [l.num, l]));
const rankOf = new Map(lessons.map((l, i) => [l.num, i]));
const rankOfDir = new Map(lessons.map((l, i) => [l.dir, i]));

let unresolved = 0;
let forward = 0;

// ------------------------------------------------------------ prose
for (const l of lessons) {
  const md = path.join(lessonsDir, l.dir, 'content.md');
  if (!fs.existsSync(md)) continue;
  const text = fs.readFileSync(md, 'utf8');
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/\b(\d+\.\d+\.\d+)\b/g)) {
      if (LABELLED.test(line.slice(Math.max(0, m.index - 14), m.index))) continue;
      const cited = m[1];
      if (!byNum.has(cited)) {
        unresolved++;
        console.error(`UNRESOLVED  ${l.dir}:${i + 1} cites ${cited} — no lesson has that number`);
        console.error(`            ${line.trim().slice(0, 110)}`);
        continue;
      }
      if (rankOf.get(cited) > rankOf.get(l.num)
          && BACKWARD.test(line.slice(0, m.index))) {
        forward++;
        console.error(`FORWARD     ${l.dir}:${i + 1} (${l.num}) claims ${cited} as prior`
          + ` material, but it comes later: ${byNum.get(cited).title}`);
        console.error(`            ${line.trim().slice(0, 110)}`);
      }
    }
  });
}

// ------------------------------------------------------------ quiz sourceIds
// The number/id agreement is checked by check-lesson-numbers.mjs. What is
// checked here is direction: a quiz may not send a student forward.
for (const l of lessons) {
  for (const [i, q] of (l.quiz?.questions ?? []).entries()) {
    for (const id of q.sourceIds ?? []) {
      if (!rankOfDir.has(id)) {
        unresolved++;
        console.error(`UNRESOLVED  ${l.dir} q${i + 1} sourceIds names ${id}, which is not a lesson`);
        continue;
      }
      if (rankOfDir.get(id) > rankOfDir.get(l.dir)) {
        forward++;
        console.error(`FORWARD     ${l.dir} q${i + 1} cites ${id}, which comes later in the course`);
      }
    }
  }
}

// Only UNRESOLVED fails the build. Whether a number resolves is a fact; whether
// a sentence CLAIMS the lesson as already-covered is a reading of English, and
// this file reads it with a word list. Three of the first four it flagged were
// "(see 1.4.13)" and "and again from 1.5.18" -- forward pointers whose nearest
// preceding word happened to be on the back-reference list. A gate that cries
// wolf gets switched off, taking the 40 real dead citations with it.
if (forward) {
  console.log(`\n[check-lesson-citations] ${forward} citation(s) above read as`
    + ' back-references to later material. Not a build failure — read them.');
}
if (unresolved) {
  console.error(`\n[check-lesson-citations] ${unresolved} citation(s) name no lesson`);
  process.exit(1);
}
console.log(`[check-lesson-citations] ${lessons.length} lessons — every cited lesson`
  + ' number resolves');
