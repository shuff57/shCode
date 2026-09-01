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

// ...unless the sentence says outright that it is pointing ahead. "is covered
// in the next reading (6.5.6)" contains "covered" and is not a back-reference.
const FORWARD_WORDS = /\b(?:next|upcoming|later|coming up|you'll|you will)\b/i;

const lessons = [];
for (const d of fs.readdirSync(lessonsDir).sort()) {
  const p = path.join(lessonsDir, d, 'lesson.json');
  if (!fs.existsSync(p)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  const m = /^(\d+)\.(\d+)\.(\d+)\s+(.*)/.exec(j.title ?? '');
  if (!m) continue;
  lessons.push({ dir: d, num: `${+m[1]}.${+m[2]}.${+m[3]}`, title: j.title, quiz: j.quiz,
    key: [+m[1], +m[2], +m[3]], meta: j });
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
      const lead = line.slice(0, m.index);
      if (rankOf.get(cited) > rankOf.get(l.num)
          && BACKWARD.test(lead) && !FORWARD_WORDS.test(lead.slice(-70))) {
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

// --------------------------------------------------------------- dead links
//
// A markdown link in lesson prose has to resolve to something the static export
// actually serves. Two lessons linked module packets by bare filename --
// `[overview](2.1.1_overview.md)` -- and those files are real, in `assignments/`,
// which is not a route. getModule() does try to surface that directory as
// "module artifacts", but it matches on `${moduleId}_` and module ids have been
// two-part since the renumber while every file there is named for a three-part
// one, so it has found zero files for as long as both have existed. The links
// rendered as ordinary blue text that goes nowhere.
//
// Lesson prose cites lessons by number, not by link, so the rule is simply:
// off-site links are fine, absolute paths must exist under public/, and a bare
// relative path is a defect.
let deadLinks = 0;
for (const l of lessons) {
  const md = path.join(lessonsDir, l.dir, 'content.md');
  if (!fs.existsSync(md)) continue;
  const text = fs.readFileSync(md, 'utf8');
  for (const m of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)/g)) {
    const href = m[1];
    if (/^(?:https?:|mailto:|#)/i.test(href)) continue;
    if (href.startsWith('/')) {
      if (fs.existsSync(path.join(root, 'public', href.replace(/^\//, '').split(/[?#]/)[0]))) continue;
      deadLinks++;
      console.error(`DEADLINK    ${l.dir} links ${href}, which is not in public/`);
      continue;
    }
    deadLinks++;
    console.error(`DEADLINK    ${l.dir} links ${href} by relative path —`
      + ' nothing serves that. Cite the lesson by number instead.');
  }
}

// ------------------------------------------------------- renumber-rot report
//
// Everything above reads THREE-PART numbers in content.md prose and in quiz
// sourceIds. That surface was chosen when the check was written and it has two
// holes, both of which were hiding real defects on 2026-09-01:
//
//   * `description`, `steps` and `requirements` are prose too, and shipped to
//     the student, and NOTHING has ever read them. 38 dead citations there.
//   * the `\b`-anchored number regex cannot match a letter-suffixed number:
//     in `2.4.3b` there is no word boundary between `3` and `b`, so the whole
//     citation is invisible. The old moSHion numbering used letters heavily.
//
// The second population below is nastier than a dead link. When chapter 2 was
// the moSHion chapter, 2.4 was Animated Sprites; today it is Loop Control. So
// unit 6.4's animation readings still cite "2.4.5", that number RESOLVES, and
// the student is sent to `2.4.5 Reading: The do...while Loop`. A citation that
// resolves and lies passes every mechanical check there is.
//
// There were 140 of them: 10 dead three-part numbers in description or steps,
// 59 letter-suffixed numbers the old regex could not see, and 71 that resolved
// to the wrong lesson. All 140 were resolved against the folder-rename map
// recorded in the renumber commit itself (d2e9950) rather than by guessing at
// topics, so the baseline is 0 and this is an ordinary gate. It may never rise.
const STALE_BASELINE = Number(process.env.STALE_BASELINE ?? 0);
const stale = [];
const CITE = /\b(\d+\.\d+\.\d+)([a-z])?\b/g;
for (const l of lessons) {
  const md = path.join(lessonsDir, l.dir, 'content.md');
  const surfaces = [
    ['description', l.meta.description ?? ''],
    ['steps', JSON.stringify(l.meta.steps ?? '')],
    ['requirements', JSON.stringify(l.meta.requirements ?? '')],
    ['content.md', fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : ''],
  ];
  for (const [where, text] of surfaces) {
    for (const m of String(text).matchAll(CITE)) {
      const at = m.index;
      if (LABELLED.test(String(text).slice(Math.max(0, at - 14), at))) continue;
      const cited = m[0];
      // A letter-suffixed number never names a lesson today: no title carries
      // one. Anything else is judged on whether it resolves.
      if (m[2]) {
        stale.push(`${l.dir} [${where}] ${cited} — no lesson has a lettered number`);
      } else if (!byNum.has(cited)) {
        // content.md three-part misses are already reported as UNRESOLVED.
        if (where !== 'content.md') {
          stale.push(`${l.dir} [${where}] ${cited} — names no lesson`);
        }
      } else if (l.key[0] >= 5 && Number(cited.split('.')[0]) <= 2) {
        // The moSHion units were chapter 2 before the renumber. A chapter-5+
        // lesson pointing into chapter 1-2 is that rot until a human says
        // otherwise -- and it resolves, so nothing else will ever flag it.
        stale.push(`${l.dir} (${l.num}) [${where}] ${cited} RESOLVES TO`
          + ` "${byNum.get(cited).title.slice(0, 52)}"`);
      }
    }
  }
}
if (stale.length) {
  console.log(`\n[check-lesson-citations] ${stale.length} stale-numbering finding(s)`
    + ` (baseline ${STALE_BASELINE}):`);
  for (const s of stale) console.log(`  STALE  ${s}`);
}
if (stale.length > STALE_BASELINE) {
  console.error(`\n[check-lesson-citations] stale citations rose from`
    + ` ${STALE_BASELINE} to ${stale.length}. Resolve the new one by topic against`
    + ' the current titles — an offset lands on a real but unrelated lesson.');
  process.exit(1);
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
if (unresolved || deadLinks) {
  if (unresolved) console.error(`\n[check-lesson-citations] ${unresolved} citation(s) name no lesson`);
  if (deadLinks) console.error(`[check-lesson-citations] ${deadLinks} link(s) resolve to nothing`);
  process.exit(1);
}
console.log(`[check-lesson-citations] ${lessons.length} lessons — every cited lesson`
  + ' number resolves');
