#!/usr/bin/env node
// test-shplay.mjs — the shPlay acceptance gate.
//
// Two halves, matching the two halves of the bar:
//   CORPUS  every runnable piece of shPlay code in the course must execute
//           for 60 frames without throwing, and must actually draw something.
//   SEMANTIC named behaviour checks derived from real p5play semantics —
//           each one exists because a critic found the engine getting it wrong.
//
// Engine builders MUST NOT edit this file. A gap gets closed by fixing
// public/shplay/shplay.js, never by loosening a check here.
//
//   node scripts/test-shplay.mjs            # everything
//   node scripts/test-shplay.mjs --corpus   # course corpus only
//   node scripts/test-shplay.mjs --semantic # behaviour checks only
//   node scripts/test-shplay.mjs --json     # machine-readable, for critics

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { runSketch, createSandbox } from './shplay-harness.mjs';
import { SEMANTIC_CHECKS } from './shplay-checks.mjs';

// Parity checks are written by critics and land in their own file so a critic
// and a builder can never collide on one. Optional: absent file = no parity run.
// An optional checks file may be ABSENT — that is the whole point of it being
// optional. It may not be BROKEN. A bare try/catch treats those identically,
// and a syntax error in a checks file then removes every check it holds while
// the gate still prints PASS. That happened: a stray backtick inside a comment
// silently dropped 20 checks and the run went green.
async function optionalChecks(spec, name) {
  const path = join(dirname(fileURLToPath(import.meta.url)), spec.slice(2));
  if (!existsSync(path)) return [];
  try {
    const mod = await import(spec);
    const list = mod[name];
    if (!Array.isArray(list)) {
      console.error(`\n${spec} loaded but exports no ${name} array — refusing to run a gate with missing checks.`);
      process.exit(1);
    }
    return list;
  } catch (e) {
    console.error(`\n${spec} exists but failed to load: ${e.message}`);
    console.error('Refusing to report a result with its checks silently skipped.');
    process.exit(1);
  }
}

const PARITY_CHECKS = await optionalChecks('./shplay-checks-parity.mjs', 'PARITY_CHECKS');
// Same arrangement for the surface build-out: the lead writes these while a
// builder works, in a file the builder may not touch, and they are wired in
// only once the build lands.
const SURFACE_CHECKS = await optionalChecks('./shplay-checks-surface.mjs', 'SURFACE_CHECKS');

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = join(REPO, 'lessons');

const argv = process.argv.slice(2);
const WANT_JSON = argv.includes('--json');
const ONLY = argv.includes('--corpus') ? 'corpus'
  : argv.includes('--semantic') ? 'semantic'
  : 'all';
const FILTER = (argv.find((a) => a.startsWith('--only=')) || '').slice(7);

// ---- corpus discovery -----------------------------------------------------

// A snippet only counts as shPlay code if it actually touches the engine.
// Plain-JS lessons run in a different runner and are not this gate's business.
const SHPLAY_MARKER = /\b(new\s+Canvas|new\s+Sprite|new\s+Group|allSprites|world\s*\.\s*gravity|kb\s*\.|mouse\s*\.\s*(pressing|presses|released)|new\s+\w*Joint)\b/;

// `// STEP 1:` breadcrumbs mark a graded starter the student is meant to fill in.
const SCAFFOLD_MARKER = /^\s*\/\/\s*STEP\s*\d/m;

function lessonDirs() {
  return readdirSync(LESSONS)
    .filter((d) => !d.startsWith('_'))
    .filter((d) => statSync(join(LESSONS, d)).isDirectory())
    .sort();
}

// ```js live ... ``` blocks are the runnable figures inside readings.
// Only `plain` opts out of shPlay: LiveCodeBlock renders the shPlay iframe
// whenever `!plain`, and `console` merely bolts a REPL panel onto that same
// iframe. Excluding `console` too (as this did at first) dropped a real block.
function liveBlocks(md) {
  const out = [];
  const rx = /^```js live([^\n]*)\n([\s\S]*?)^```/gm;
  let m;
  let n = 0;
  while ((m = rx.exec(md)) !== null) {
    n++;
    const flags = (m[1] || '').trim();
    if (/\bplain\b/.test(flags)) continue;
    out.push({ index: n, code: m[2] });
  }
  return out;
}

function collectCorpus() {
  const items = [];
  for (const id of lessonDirs()) {
    const dir = join(LESSONS, id);

    for (const file of ['solution.js', 'script.js']) {
      const p = join(dir, file);
      if (!existsSync(p)) continue;
      const code = readFileSync(p, 'utf8');
      if (!SHPLAY_MARKER.test(code)) continue;
      // A graded starter is a scaffold: `// STEP N:` breadcrumbs inside empty
      // setup()/draw() bodies, by course convention. It CANNOT run — there is
      // no `new Canvas` yet, that is the student's job — so holding it to the
      // run-60-frames bar would fail the engine for the curriculum working as
      // designed. Scaffolds are held to the bar that applies: it must parse,
      // and it must hand the student the hooks the lesson talks about.
      const scaffold = file === 'script.js' && SCAFFOLD_MARKER.test(code);
      items.push({
        kind: scaffold ? 'scaffold' : file === 'solution.js' ? 'solution' : 'starter',
        lesson: id,
        path: relative(REPO, p),
        code,
        expectDraw: file === 'solution.js',
      });
    }

    const mdPath = join(dir, 'content.md');
    if (existsSync(mdPath)) {
      for (const b of liveBlocks(readFileSync(mdPath, 'utf8'))) {
        if (!SHPLAY_MARKER.test(b.code)) continue;
        items.push({
          kind: 'live-block',
          lesson: id,
          path: `${relative(REPO, mdPath)}#block${b.index}`,
          code: b.code,
          expectDraw: true,
        });
      }
    }
  }
  return items;
}

// ---- corpus run -----------------------------------------------------------

// Anything that puts pixels on the canvas. A sketch that boots but paints
// nothing is a failure dressed as a pass.
const DRAW_OPS = new Set(['fillRect', 'strokeRect', 'fill', 'stroke', 'fillText', 'drawImage', 'arc']);

function runCorpusItem(item) {
  if (item.kind === 'scaffold') return runScaffoldItem(item);
  const r = runSketch(item.code, { frames: 60, filename: `${item.lesson}.js` });
  if (!r.ok) {
    return {
      ...meta(item), pass: false, reason: `${r.phase}: ${r.error?.message || 'unknown error'}`,
      stack: firstUserFrame(r.error),
    };
  }
  if (r.frames < 60) {
    // noLoop() is a legitimate early stop; a silent death is not.
    const stopped = /noLoop\s*\(/.test(item.code);
    if (!stopped) return { ...meta(item), pass: false, reason: `loop died after ${r.frames}/60 frames` };
  }
  if (item.expectDraw) {
    const drew = r.ops.some((o) => DRAW_OPS.has(o.op));
    if (!drew) return { ...meta(item), pass: false, reason: 'ran 60 frames but never drew anything' };
  }
  const errs = r.console.filter((c) => c.type === 'error');
  if (errs.length) return { ...meta(item), pass: false, reason: `console.error: ${errs[0].text.slice(0, 120)}` };
  return { ...meta(item), pass: true, ops: r.ops.length };
}

// A scaffold is judged on what a scaffold can be judged on: it parses, and it
// defines the hooks the student is told to fill in.
function runScaffoldItem(item) {
  try {
    new Script(item.code, { filename: item.path });
  } catch (e) {
    return { ...meta(item), pass: false, reason: `syntax error: ${e.message}` };
  }
  if (!/function\s+setup\s*\(/.test(item.code)) {
    return { ...meta(item), pass: false, reason: 'scaffold defines no setup() for the student to fill in' };
  }
  return { ...meta(item), pass: true, scaffold: true };
}

const meta = (i) => ({ kind: i.kind, lesson: i.lesson, path: i.path });

function firstUserFrame(err) {
  if (!err?.stack) return '';
  const line = String(err.stack).split('\n').find((l) => /\.js:\d+/.test(l) && !/shplay\.js|planck/.test(l));
  return (line || '').trim().slice(0, 160);
}

// ---- semantic run ---------------------------------------------------------

// `informational: true` marks a check that measures a deliberate divergence
// from p5play rather than a defect (see _workspace/gauntlet/DECISIONS.md, D1).
// It still runs and still reports — it just never fails the gate. Keeping the
// measurement while dropping the verdict is the point: deleting it would hide
// the delta, and gating on it would force a change that breaks the course.
// `await` on a non-promise is a no-op, so sync checks are unaffected. Without
// it an async check "failed" with the reason "[object Promise]" and its body
// never ran — a check that cannot pass is nearly as bad as one that cannot
// fail. Async is needed by anything that has to let fetch/decode microtasks
// settle, e.g. the Web Audio graph.
async function runSemantic(check) {
  const base = { name: check.name, area: check.area, informational: !!check.informational };
  try {
    const res = await check.run({ runSketch, createSandbox });
    if (res === true || res === undefined) return { ...base, pass: true };
    return { ...base, pass: false, reason: String(res) };
  } catch (e) {
    return { ...base, pass: false, reason: `threw: ${e.message}` };
  }
}

// ---- report ---------------------------------------------------------------

const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

async function main() {
  const report = { corpus: [], semantic: [], summary: {} };

  if (ONLY !== 'semantic') {
    let corpus = collectCorpus();
    if (FILTER) corpus = corpus.filter((i) => i.lesson.includes(FILTER));
    report.corpus = corpus.map(runCorpusItem);
  }
  if (ONLY !== 'corpus') {
    let checks = [...SEMANTIC_CHECKS, ...PARITY_CHECKS, ...SURFACE_CHECKS];
    if (FILTER) checks = checks.filter((c) => c.name.includes(FILTER) || c.area.includes(FILTER));
        // Sequential, not Promise.all: several checks build a sandbox and pump
    // frames, and interleaving those would make one check''s timers land
    // inside another''s run.
    report.semantic = [];
    for (const c of checks) report.semantic.push(await runSemantic(c));
  }

  const cPass = report.corpus.filter((r) => r.pass).length;
  const gating = report.semantic.filter((r) => !r.informational);
  const info = report.semantic.filter((r) => r.informational);
  const sPass = gating.filter((r) => r.pass).length;
  report.summary = {
    corpusPass: cPass, corpusTotal: report.corpus.length,
    semanticPass: sPass, semanticTotal: gating.length,
    infoDeltas: info.filter((r) => !r.pass).length, infoTotal: info.length,
    ok: cPass === report.corpus.length && sPass === gating.length,
  };

  if (WANT_JSON) {
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(report.summary.ok ? 0 : 1);
  }

  const cFail = report.corpus.filter((r) => !r.pass);
  const sFail = report.semantic.filter((r) => !r.pass && !r.informational);
  const iFail = report.semantic.filter((r) => !r.pass && r.informational);

  if (report.corpus.length) {
    console.log(`\n${C.b}CORPUS${C.x} — every runnable shPlay sketch in the course`);
    if (!cFail.length) console.log(`  ${C.g}all ${cPass} pass${C.x}`);
    for (const f of cFail) {
      console.log(`  ${C.r}FAIL${C.x} ${f.path}`);
      console.log(`       ${C.d}${f.reason}${C.x}`);
      if (f.stack) console.log(`       ${C.d}${f.stack}${C.x}`);
    }
    console.log(`  ${cPass}/${report.corpus.length} passing`);
  }

  if (report.semantic.length) {
    console.log(`\n${C.b}SEMANTIC${C.x} — behaviour checks against real p5play semantics`);
    if (!sFail.length) console.log(`  ${C.g}all ${sPass} pass${C.x}`);
    const byArea = {};
    for (const f of sFail) (byArea[f.area] ||= []).push(f);
    for (const [area, fails] of Object.entries(byArea)) {
      console.log(`  ${C.y}${area}${C.x}`);
      for (const f of fails) console.log(`    ${C.r}FAIL${C.x} ${f.name}\n         ${C.d}${f.reason}${C.x}`);
    }
    console.log(`  ${sPass}/${gating.length} passing`);
  }

  if (iFail.length) {
    console.log(`
${C.b}DELTAS vs p5play${C.x} ${C.d}(deliberate — see _workspace/gauntlet/DECISIONS.md D1; these never gate)${C.x}`);
    for (const f of iFail) console.log(`  ${C.y}~${C.x} ${f.name}
       ${C.d}${f.reason}${C.x}`);
  }

  const ok = report.summary.ok;
  console.log(`\n${ok ? C.g + 'shPlay gate: PASS' : C.r + 'shPlay gate: FAIL'}${C.x}\n`);
  process.exit(ok ? 0 : 1);
}

await main();
