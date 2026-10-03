// A summative written item's grading prompt and rubric must not be a file
// anyone can download.
//
// WHY THIS EXISTS. The server grades written answers against a prompt and
// rubric it looks up by lesson id (functions/_shared/aiGraders.ts). For a long
// time that config was baked into public/ai-graders.json -- and everything in
// public/ is fetchable with no login. Measured 2026-10-03:
// https://shcode.pages.dev/ai-graders.json answered 200 to a request with no
// cookie and returned the prompt and rubric for every graded written item,
// including the six chapter-test parts (1.7.2, 1.7.5, 2.7.2, 2.7.5, 3.10.2,
// 3.10.5), whose rubrics name the answers ("z is WRONG: ... x * x instead of
// x * y ..."). lib/quiz-redact.ts had been stripping those rubrics from the
// lesson PAGES the whole time; the raw file beside them was the hole.
//
// The config is a server-only module now (ai-graders.generated.ts, bundled
// into the Function worker). This guards that it stays that way: it fails if
// public/ai-graders.json exists, or if a probe taken from a summative grader's
// own prompt or rubric appears in ANY file under public/ or in the built out/.
//
//   node scripts/check-ai-grader-leak.mjs                  # public/ always, out/ if built
//   node scripts/check-ai-grader-leak.mjs --require-build  # fail if out/ is absent
//
// out/ is checked when it exists. When it does not, this says NOT CHECKED for
// out/ rather than passing quietly: a skip that reads like a pass is how this
// class of hole survives.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'out');
const requireBuild = process.argv.includes('--require-build');

const problems = [];

// 1. The file that was the hole.
for (const dir of [PUBLIC, OUT]) {
  const f = path.join(dir, 'ai-graders.json');
  if (fs.existsSync(f)) {
    problems.push(`${path.relative(ROOT, f)} exists: every grader prompt and rubric is downloadable without logging in`);
  }
}

// 2. Probes from the summative graders' own text.
const probes = [];
for (const id of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, id, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let lesson;
  try { lesson = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  for (const g of [lesson.aiGrader, lesson.diagram && lesson.diagram.aiGrader]) {
    if (!g || !g.summative) continue;
    if (typeof g.prompt === 'string' && g.prompt.length >= 60) {
      probes.push({ id, what: 'prompt', text: g.prompt.slice(0, 70) });
    }
    for (const r of g.rubric || []) {
      if (typeof r.description === 'string' && r.description.length >= 60) {
        probes.push({ id, what: `rubric ${r.id}`, text: r.description.slice(0, 70) });
      }
    }
  }
}
if (probes.length === 0) problems.push('found no summative grader to probe for -- the check would pass vacuously');

const TEXT = /\.(json|js|mjs|html|txt|md|css|ts|map|xml|csv)$/i;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (TEXT.test(e.name)) yield p;
  }
}
// A string inside a built page is JSON-escaped, so probe both spellings.
const spellings = (t) => [t, JSON.stringify(t).slice(1, -1)];

function scan(dir) {
  let files = 0;
  for (const f of walk(dir)) {
    const size = fs.statSync(f).size;
    if (size > 40 * 1024 * 1024) continue;
    files++;
    const body = fs.readFileSync(f, 'utf8');
    for (const p of probes) {
      if (spellings(p.text).some((s) => body.includes(s))) {
        problems.push(`${path.relative(ROOT, f)} contains the ${p.what} of summative ${p.id}`);
      }
    }
  }
  return files;
}

const publicFiles = scan(PUBLIC);
let outNote;
if (fs.existsSync(OUT)) {
  outNote = `${scan(OUT)} file(s) in out/`;
} else if (requireBuild) {
  problems.push('out/ is absent but --require-build was given');
} else {
  outNote = 'out/ NOT CHECKED (no build)';
}

if (problems.length) {
  console.error('[check-ai-grader-leak] FAILED');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`[check-ai-grader-leak] ok -- ${probes.length} probe(s) from summative graders; ${publicFiles} file(s) in public/, ${outNote}`);
