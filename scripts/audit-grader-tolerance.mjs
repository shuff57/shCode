// Sweeps every regex-graded lesson for graders that refuse a correct answer.
//
// The defect class: a requirement written while looking at the reference
// solution matches the SHAPE OF THAT SOLUTION rather than the shape of a
// correct answer, so a student who did the work loses the mark. It showed up
// independently in units 1.2, 1.3 and 1.4 -- three for three -- and there are
// 121 regex-graded lessons in the course.
//
// Rather than hand-write cases for all of them, this takes each lesson's own
// reference solution, applies mutations that a student could plausibly make
// and that DO NOT change whether the answer is correct, and reports every
// requirement that flips to failed.
//
// THIS IS A TRIAGE LIST, NOT A FIX LIST. Some mutations legitimately fail:
// swapping quote style in a lesson teaching quote styles is a wrong answer,
// not a grader bug. Hits whose lesson looks like it teaches the very thing
// being mutated are tagged `maybe-intentional` -- that is a hint to read them
// first, not permission to skip them. Every hit needs a human to check it
// against what the lesson is actually teaching.
//
// This is deliberately NOT part of `npm test`. It reports; it does not gate.
// Cases that must hold forever belong in test-grader-tolerance.mjs instead.
//
//   node scripts/audit-grader-tolerance.mjs              # whole course
//   node scripts/audit-grader-tolerance.mjs 2-1 2-3      # only these units

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsDir = path.join(root, 'lessons');

const BT = String.fromCharCode(96);
const AP = String.fromCharCode(39);
const nl = '\n';

const unitFilter = process.argv.slice(2);

// ---------------------------------------------------------------- loading

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');

function referenceFiles(id) {
  const dir = path.join(lessonsDir, id);
  const asDir = path.join(dir, 'solution');
  if (existsSync(asDir)) {
    const files = {};
    const walk = (abs, rel) => {
      for (const e of readdirSync(abs, { withFileTypes: true })) {
        const next = path.join(abs, e.name);
        const key = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(next, key);
        else files[key] = read(next);
      }
    };
    walk(asDir, '');
    return files;
  }
  const asFile = path.join(dir, 'solution.js');
  if (existsSync(asFile)) return { 'script.js': read(asFile) };
  return null;
}

// ---------------------------------------------------------------- mutations
//
// Each returns new source, or null when it does not apply. Every one of these
// is an axis that produced a REAL defect in units 1.2-1.4; none of them change
// whether the answer is right.

const MUTATIONS = [
  {
    name: 'backtick strings',
    teaches: /quote|string|template|literal/i,
    fn: (s) => {
      const out = s.replace(/"([^"\\\n]*)"/g, (m, inner) =>
        inner.includes(BT) || inner.includes('${') ? m : BT + inner + BT);
      return out === s ? null : out;
    },
  },
  {
    name: 'single-quoted strings',
    teaches: /quote|string/i,
    fn: (s) => {
      const out = s.replace(/"([^"'\\\n]*)"/g, (m, inner) => AP + inner + AP);
      return out === s ? null : out;
    },
  },
  {
    name: 'var instead of let',
    teaches: /\blet\b|\bconst\b|declar|scope|hoist/i,
    fn: (s) => (/\blet\b/.test(s) ? s.replace(/\blet\b/g, 'var') : null),
  },
  {
    name: 'no semicolons',
    teaches: /semicolon|syntax|format|style|convention/i,
    fn: (s) => (/;\s*$/m.test(s) ? s.replace(/;[ \t]*$/gm, '') : null),
  },
  {
    name: 'declare first, assign after',
    teaches: /declar|assign|undefined|initiali/i,
    fn: (s) => {
      let hit = false;
      const out = s.replace(
        /^([ \t]*)(let|var)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*([^;\n]+);[ \t]*$/gm,
        (m, pad, kw, name, val) => {
          hit = true;
          return `${pad}${kw} ${name};${nl}${pad}${name} = ${val};`;
        });
      return hit ? out : null;
    },
  },
  {
    name: 'block comments instead of //',
    teaches: /comment|document|readme/i,
    fn: (s) => {
      const out = s.replace(/\/\/ ?([^\n]+)/g, (m, text) => `/* ${text.trim()} */`);
      return out === s ? null : out;
    },
  },
  {
    name: 'operands swapped in a product',
    teaches: /order|operator|precedence|express/i,
    fn: (s) => {
      let hit = false;
      const out = s.replace(
        /=[ \t]*([A-Za-z_$][\w$]*)[ \t]*\*[ \t]*([A-Za-z_$][\w$]*)/g,
        (m, a, b) => { hit = true; return `= ${b} * ${a}`; });
      return hit ? out : null;
    },
  },
  {
    name: 'extra blank line between statements',
    teaches: /format|layout|blank|spacing|style/i,
    fn: (s) => (s.includes(nl) ? s.replace(/\n(?=[a-zA-Z])/g, nl + nl) : null),
  },
];

// ---------------------------------------------------------------- run

const out = mkdtempSync(path.join(tmpdir(), 'shcode-audit-'));
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/grader.ts', '--outDir', out, '--module', 'commonjs',
      '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { grade } = createRequire(import.meta.url)(
    path.join(out, 'grader.js').replace(/\\/g, '/'));

  const failedIds = (reqs, files) =>
    grade(reqs, files, 0).results.filter((r) => r.status === 'failed').map((r) => r.id);

  const audited = [];
  const noReference = [];
  const brokenReference = [];
  const findings = [];

  for (const id of readdirSync(lessonsDir).sort()) {
    const cfgPath = path.join(lessonsDir, id, 'lesson.json');
    if (!existsSync(cfgPath)) continue;
    if (unitFilter.length && !unitFilter.some((u) => id.startsWith(u + '-'))) continue;

    let cfg;
    try { cfg = JSON.parse(read(cfgPath)); } catch { continue; }
    const reqs = (cfg.requirements ?? []).filter((r) => (r.type ?? 'regex') !== 'manual');
    if (!reqs.length) continue;

    const ref = referenceFiles(id);
    if (!ref) { noReference.push(id); continue; }

    // A lesson whose own reference answer does not score full marks is a
    // finding in its own right, and makes every mutation below meaningless.
    const baseline = failedIds(reqs, ref);
    if (baseline.length) {
      brokenReference.push({ id, failed: baseline, title: cfg.title ?? id });
      continue;
    }
    audited.push(id);

    // Requirement titles and step instructions carry the giveaway more often
    // than the lesson title does: 1.2.5 is called "Change the Type", but its
    // r1 is titled "thing is declared with let", which is what makes a `var`
    // mutation a wrong answer there rather than a grader bug.
    const teachText = [
      id, cfg.title, cfg.unit, cfg.description,
      ...reqs.map((r) => `${r.title ?? ''} ${r.description ?? ''}`),
      ...(cfg.steps ?? []).map((s) => `${s.title ?? ''} ${s.instructions ?? ''}`),
    ].filter(Boolean).join(' ');

    for (const mut of MUTATIONS) {
      const mutated = {};
      let applied = false;
      for (const [name, text] of Object.entries(ref)) {
        if (!name.endsWith('.js')) { mutated[name] = text; continue; }
        const next = mut.fn(text);
        if (next === null) { mutated[name] = text; continue; }
        mutated[name] = next;
        applied = true;
      }
      if (!applied) continue;

      const broke = failedIds(reqs, mutated);
      if (!broke.length) continue;

      findings.push({
        id,
        title: cfg.title ?? id,
        axis: mut.name,
        reqs: broke.map((rid) => {
          const r = reqs.find((x) => x.id === rid);
          return `${rid} (${r?.title ?? '?'})`;
        }),
        maybeIntentional: mut.teaches.test(teachText),
      });
    }
  }

  // ---------------------------------------------------------------- report

  const byLesson = new Map();
  for (const f of findings) {
    if (!byLesson.has(f.id)) byLesson.set(f.id, []);
    byLesson.get(f.id).push(f);
  }
  const ordered = [...byLesson.entries()].sort((a, b) => b[1].length - a[1].length);

  const lines = [];
  const say = (s = '') => { lines.push(s); console.log(s); };

  say(`audited ${audited.length} lesson(s) with a reference solution`);
  say(`${byLesson.size} lesson(s) refuse at least one plausible correct answer`);
  say();

  for (const [id, hits] of ordered) {
    say(`${id}   ${hits[0].title}`);
    for (const h of hits) {
      const tag = h.maybeIntentional ? '  [maybe-intentional]' : '';
      say(`    ${h.axis.padEnd(34)} breaks ${h.reqs.join(', ')}${tag}`);
    }
    say();
  }

  if (brokenReference.length) {
    say('REFERENCE SOLUTION DOES NOT PASS ITS OWN GRADER');
    say('  (nothing below was audited -- fix these first)');
    for (const b of brokenReference) say(`    ${b.id}  fails ${b.failed.join(', ')}`);
    say();
  }
  if (noReference.length) {
    say(`NO REFERENCE SOLUTION, could not audit (${noReference.length}):`);
    for (const id of noReference) say(`    ${id}`);
    say();
  }

  const real = findings.filter((f) => !f.maybeIntentional).length;
  say(`${findings.length} hit(s); ${real} not tagged maybe-intentional`);

  const reportPath = path.join(root, 'grader-tolerance-audit.txt');
  writeFileSync(reportPath, lines.join(nl) + nl);
  console.log(`\nwritten to ${path.relative(root, reportPath)}`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
