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
  // A summative grader of either kind, and EVERY chart grader (formative too): a chart's
  // rubric describes the correct structure, so it is an answer key whatever the flag says
  // (measured 2026-10-06 on 3-2-8, 3-2-18, 3-3-11, 2-2-12).
  for (const g of [lesson.aiGrader, lesson.diagram && lesson.diagram.aiGrader]) {
    if (!g) continue;
    if (!g.summative && g !== (lesson.diagram && lesson.diagram.aiGrader)) continue;
    if (typeof g.prompt === 'string' && g.prompt.length >= 60) {
      probes.push({ id, what: 'prompt', text: g.prompt.slice(0, 70) });
    }
    for (const r of g.rubric || []) {
      if (typeof r.description === 'string' && r.description.length >= 60) {
        probes.push({ id, what: `rubric ${r.id}`, text: r.description.slice(0, 70) });
      }
      // Hybrid chart items (lib/diagram-score.ts): the `check` is the answer key in machine form.
      // The whole serialised check, and every regex / student-line inside it, must stay server-only.
      if (r.check) {
        probes.push({ id, what: `check ${r.id}`, text: JSON.stringify(r.check).slice(0, 70) });
        const walkCheck = (v) => {
          if (Array.isArray(v)) return v.forEach(walkCheck);
          if (!v || typeof v !== 'object') return;
          for (const [k, x] of Object.entries(v)) {
            if (k === 're') for (const t of [].concat(x)) if (typeof t === 'string' && t.length >= 12) probes.push({ id, what: `check ${r.id} regex`, text: t.slice(0, 70) });
            if ((k === 'fail' || k === 'pass') && typeof x === 'string' && x.length >= 40) probes.push({ id, what: `check ${r.id} ${k} line`, text: x.slice(0, 70) });
            walkCheck(x);
          }
        };
        walkCheck(r.check);
      }
    }
    // The relevance gate: each token group is a list of words that buy the cap off.
    if (g.gate) {
      for (const t of g.gate.anyOf || []) if (typeof t === 'string' && t.length >= 12) probes.push({ id, what: 'gate group', text: t.slice(0, 70) });
      if (typeof g.gate.fail === 'string' && g.gate.fail.length >= 40) probes.push({ id, what: 'gate line', text: g.gate.fail.slice(0, 70) });
    }
  }
}
// 2b. The solution pseudocode shown after the last try (pa-pseudocode/<id>.md) is
// the answer to a graded part. It is baked into the worker and must never be a
// static file. EVERY line of 25 characters or more is a probe: pseudocode lines
// are short ("SET total TO 0"), so probing only a first line of 40+ left a file
// with no such line, and a leak of it, silently unprobed. A file that yields no
// probe at all (empty, or nothing but short lines) is probed as a whole instead,
// and an empty one FAILS rather than skips: a check that finds nothing to look
// for must say so, not pass. README.md is the folder's tracked how-to, not a
// solution.
//
// A line the lesson's OWN published prose already says (content.md is rendered into
// every student's page) is not a leak of the solution when it turns up in out/: it
// was public before the pseudocode existed. Pseudocode written from a problem
// statement repeats that statement's sentences, and probing them made the build
// fail on the lesson page itself. Such a line is not probed. The rest still are.
const PROSE = [];
for (const id of fs.readdirSync(LESSONS)) {
  const f = path.join(LESSONS, id, 'content.md');
  if (fs.existsSync(f)) PROSE.push(fs.readFileSync(f, 'utf8'));
  // The lesson's steps, description and requirement titles/hints are drawn on the page too
  // (the group builds have no content.md: their instructions are the steps). Never the
  // grader, the quiz key or a requirement's pattern: those are the secrets.
  const lj = path.join(LESSONS, id, 'lesson.json');
  if (fs.existsSync(lj)) {
    try {
      const l = JSON.parse(fs.readFileSync(lj, 'utf8'));
      PROSE.push(l.description || '', JSON.stringify(l.steps || []));
      for (const r of l.requirements || []) PROSE.push(r.title || '', r.description || '', r.hint || '');
    } catch { /* check-lesson-numbers owns malformed JSON */ }
  }
}
const publicProse = PROSE.join('\n');
const PSEUDO = path.join(ROOT, 'pa-pseudocode');
if (fs.existsSync(PSEUDO)) {
  for (const f of fs.readdirSync(PSEUDO)) {
    if (!f.endsWith('.md') || f === 'README.md') continue;
    const id = f.slice(0, -3);
    const lines = fs.readFileSync(path.join(PSEUDO, f), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    // Probe the first 70 characters (what is searched for); skip it when the lesson's
    // own prose already contains that text.
    const long = lines.filter((l) => l.length >= 25 && !publicProse.includes(l.slice(0, 70)));
    if (long.length) {
      for (const l of long) probes.push({ id, what: 'pseudocode', text: l.slice(0, 70) });
    } else if (lines.length) {
      probes.push({ id, what: 'pseudocode', text: lines.join('\n').slice(0, 70) });
    } else {
      problems.push(`pa-pseudocode/${f} is empty: nothing to probe for`);
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
        problems.push(`${path.relative(ROOT, f)} contains the ${p.what} of grader ${p.id}`);
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
console.log(`[check-ai-grader-leak] ok -- ${probes.length} probe(s) from summative and chart graders; ${publicFiles} file(s) in public/, ${outNote}`);
