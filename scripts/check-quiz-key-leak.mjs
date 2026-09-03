// A summative quiz's answer key, or a summative written item's grading
// rubric, must not appear in the page it is asked on.
//
// WHY THIS EXISTS. Every "don't reveal it yet" rule in QuizView and
// WrittenGrader governs what is DRAWN. None of them governs what is SHIPPED,
// and /lesson/[lessonId]/ is a static export whose body is a client component
// -- so the whole lesson object was serialised into the page's RSC payload.
// Measured 2026-09-02 on the Chapter 1 individual PA: View Source on the built
// quiz page returned all three forms, all 18 answer indices and every
// explanation, before a single question had been answered. Measured again
// 2026-09-03 on the same PA's written items: even after WrittenGrader stopped
// RENDERING `aiGrader.prompt` as on-page instructions, the raw grading rubric
// -- naming every accepted answer -- was still sitting in the built page,
// because the `config` prop still carried the untouched object.
// lib/quiz-redact.ts strips both now; this measures that they stayed stripped.
//
// The check reads the BUILT output, not the source, because the source was
// never the thing that was wrong.
//
//   node scripts/check-quiz-key-leak.mjs                  # after a build
//   node scripts/check-quiz-key-leak.mjs --allow-missing  # skip if out/ absent
//
// --allow-missing exists for `npm test` on a tree that has not been built. It
// prints NOT CHECKED rather than passing quietly: a skip that reads like a pass
// is how this class of hole survives.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');
// BOTH routes, not just /lesson/. generateStaticParams() exports every lesson
// id under both prefixes, so a summative item has two built pages, and only
// one of them is the one students are actually sent to: lib/lesson-href.ts
// routes `type: "assignment"` -- which every part of a chapter PA is -- to
// /assignment/. Measured 2026-09-03 on the Chapter 1 PA: /lesson/ redacted,
// /assignment/ did not, and this check reported OK because it only ever
// opened the page nobody visits. Check every built page there is.
const OUT_ROOTS = [
  path.join(ROOT, 'out', 'lesson'),
  path.join(ROOT, 'out', 'assignment'),
];

const allowMissing = process.argv.includes('--allow-missing');

const summative = [];
for (const dir of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, dir, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let lesson;
  try { lesson = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  if (lesson.quiz?.summative) summative.push({ dir, lesson, kind: 'quiz' });
  if (lesson.aiGrader?.summative) summative.push({ dir, lesson, kind: 'aiGrader' });
}

if (summative.length === 0) {
  console.log('[check-quiz-key-leak] no summative quiz or written item authored — nothing to check');
  process.exit(0);
}

if (!OUT_ROOTS.some((d) => fs.existsSync(d))) {
  const msg = `[check-quiz-key-leak] NOT CHECKED — no built pages under out/. `
    + `${summative.length} summative quiz(zes) unverified. Run \`npm run build\` first.`;
  console.log(msg);
  process.exit(allowMissing ? 0 : 1);
}

let failures = 0;
let checked = 0;
let unchecked = 0;

for (const { dir, lesson, kind } of summative) {
  const id = lesson.id ?? dir;
  const pages = OUT_ROOTS
    .map((root) => path.join(root, id, 'index.html'))
    .filter((f) => fs.existsSync(f));
  if (pages.length === 0) {
    // out/ exists but predates this lesson -- a stale build, not a leak. Same
    // rule as a missing out/: unverified, and it says so rather than passing.
    console.log(`NOT CHECKED ${dir}: no built page at out/lesson/${id}/ nor `
      + `out/assignment/${id}/ -- the build predates this lesson. Run npm run build.`);
    if (!allowMissing) failures++;
    unchecked++;
    continue;
  }

  // Every built page, because the leak was on the one that was not read.
  for (const page of pages) {
  const route = path.relative(path.join(ROOT, 'out'), page).split(path.sep)[0];
  checked++;
  const html = fs.readFileSync(page, 'utf8');

  const hits = [];

  if (kind === 'quiz') {
    // Three separate tells, because one of them alone is easy to dodge by
    // accident: the field name, the prose, and the correct option's own text.
    if (/\\?"answer\\?":\s*\d/.test(html)) hits.push('an "answer" index');
    if (/\\?"explanation\\?":/.test(html)) hits.push('an "explanation" field');
    for (const q of lesson.quiz.questions ?? []) {
      if (q.explanation && html.includes(q.explanation.slice(0, 40))) {
        hits.push(`the explanation text of ${q.id}`);
        break;
      }
    }
  } else {
    // The grading prompt names every accepted answer; a substring of it in
    // the built page means the whole rubric rode along. 60 chars is enough to
    // rule out a coincidental match against unrelated page text.
    const prompt = lesson.aiGrader?.prompt ?? '';
    if (prompt.length >= 60 && html.includes(prompt.slice(0, 60))) {
      hits.push('the aiGrader.prompt grading brief');
    }
    for (const r of lesson.aiGrader?.rubric ?? []) {
      if (r.description && r.description.length >= 40 && html.includes(r.description.slice(0, 40))) {
        hits.push(`the rubric description of "${r.id}"`);
      }
    }
  }

  if (hits.length) {
    console.log(`FAIL ${dir} (${kind}): the built /${route}/ page contains `
      + `${hits.join(', ')} — the answer key ships to the student. `
      + 'See lib/quiz-redact.ts, and check that THIS route redacts before the `use client` boundary.');
    failures++;
  }
  }
}

console.log(
  failures
    ? `\n[check-quiz-key-leak] ${failures} FAILURE(S) across ${summative.length} summative item(s)`
    : `\n[check-quiz-key-leak] OK - ${checked} summative page(s) ship no answer key`
      + (unchecked ? ` (${unchecked} NOT CHECKED - stale build)` : ''),
);
process.exit(failures ? 1 : 0);
