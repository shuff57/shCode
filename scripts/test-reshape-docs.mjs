#!/usr/bin/env node
// test-reshape-docs.mjs — the verification gate for the JSCAD docs stack.
//
// Six groups. Each one closes a claim the stack currently makes only in prose:
//
//   NETWORK    nothing under public/reshape/ or on the preview path pulls a
//              resource off the network. A CDN reference works fine at a desk
//              and dies in a classroom behind a filter.
//   BUNDLE     the two vendored libraries are present and full-size.
//   EXAMPLES   every `code` field on every page of lib/reshape-docs.ts is
//              executed against the VENDORED bundle inside the SAME shim scope
//              public/reshape/runner.html gives a student, and must hand back
//              real geometry. Reported per page, by section slug + page title.
//   STYLES     bare `cube(...)` and qualified `primitives.cube(...)` both work
//              and are the same reference — the check that stops a future shim
//              from wrapping geometry and breaking paste-into-jscad.app.
//   DRIFT      lib/reshape-docs.ts and public/reshape/docs/reference.md document
//              the same API surface. Reported as a WARNING with a count so the
//              two references cannot silently diverge.
//   COVERAGE   documented X / Y exports (Z%). Printed every run. This is the
//              measurable half of the bar.
//
// lib/reshape-docs.ts is TypeScript that imports without a file extension, which
// neither Node's ESM resolver nor its type stripping will load. So compile it
// to CommonJS in a temp dir first and require the real `sections` array out of
// it — the docs are read as DATA, never re-parsed with a regex. Same trick
// scripts/test-diagram.mjs uses on lib/diagram-*.ts.
//
// The runtime itself is never reimplemented here: the bundle is the vendored
// file evaluated as-is, and the scope shim is cut out of runner.html at run
// time by scripts/reshape-harness.mjs. Edit the shim and this gate tests the edit.
//
// A red check is closed by fixing runner.html, the vendored bundles, or the
// docs — never by loosening an assertion here. Do not edit lib/reshape-docs.ts
// to make an example pass; a failing example is a finding.
//
//   node scripts/test-reshape-docs.mjs

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PATHS, createShimContext, runProgram, isGeometry, captureConsole,
  documentedNames, docText,
} from './reshape-harness.mjs';
import { createSimpleContext } from './reshape-simple-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

// ---- the recorder, in the shape scripts/diagram-assertions.cjs uses ---------

let fails = 0;
let warns = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
}
function warn(name, extra) {
  warns++;
  console.log('  WARN  ' + name + (extra !== undefined ? '\n        ' + extra : ''));
}
function note(text) { console.log('  ----  ' + text); }
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------------------------------------------------------------------------
// NETWORK PURITY
// ---------------------------------------------------------------------------
//
// Two tiers, because "any http(s):// reference" and "any network fetch" are not
// the same set. An <a href> to openjscad.xyz in a docs page is a dead link
// offline and nothing worse; a <script src> to unpkg is a blank viewport for a
// whole class. So:
//
//   FAIL  any CDN host anywhere, and any construct that LOADS from the network.
//   WARN  a plain http(s):// URL in prose or an <a href>, listed so a real one
//         can never hide inside the noise.

section('network purity');

const CDN = /unpkg\.com|jsdelivr|cdnjs|cdn\.skypack|esm\.sh|unpkg\.io|\/\/cdn\./i;

// Anything that makes the browser go and get a resource.
const REMOTE_LOAD = [
  [/\bsrc\s*=\s*["'`]\s*(?:https?:)?\/\//i, 'src= to an absolute URL'],
  [/<link[^>]+href\s*=\s*["'`]\s*(?:https?:)?\/\//i, '<link href> to an absolute URL'],
  [/@import\s+(?:url\()?["'`]?\s*(?:https?:)?\/\//i, 'CSS @import from a URL'],
  [/\bfetch\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'fetch() to an absolute URL'],
  [/\bimportScripts\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'importScripts() from a URL'],
  [/\bnew\s+Worker\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'new Worker() from a URL'],
  [/\bXMLHttpRequest\b[\s\S]{0,120}?open\s*\([^)]*["'`]\s*https?:\/\//i, 'XHR to an absolute URL'],
  [/\bfrom\s+["'`]\s*https?:\/\//i, 'ESM import from a URL'],
  [/\bimport\s*\(\s*["'`]\s*https?:\/\//i, 'dynamic import() from a URL'],
];

// The preview path: the component that mounts the iframe, and the builder that
// assembles preview HTML. Both are outside public/reshape but are what actually
// reaches a student.
const PREVIEW_PATH = [
  path.join(root, 'components/ReshapePreview.tsx'),
  path.join(root, 'components/MoshionPreview.tsx'),
  path.join(root, 'lib/preview-builder.ts'),
];

const SCANNABLE = /\.(html|js|mjs|cjs|md|ts|tsx|json|css)$/;
const VENDORED = new Set([PATHS.modeling, PATHS.regl]);

function scanTargets() {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (VENDORED.has(p)) continue;          // the libraries themselves carry license URLs
      if (!SCANNABLE.test(e.name)) continue;
      files.push(p);
    }
  };
  walk(path.join(root, 'public/reshape'));
  for (const p of PREVIEW_PATH) if (existsSync(p)) files.push(p);
  return files;
}

const scanned = scanTargets();
note(`scanned ${scanned.length} files under public/reshape/ + the preview path`);

{
  const hits = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (CDN.test(line)) hits.push(`${rel(p)}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  ok('no CDN host referenced anywhere', hits.length === 0, hits.join('\n        '));
}

{
  const hits = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    for (const [rx, what] of REMOTE_LOAD) {
      const m = rx.exec(src);
      if (m) {
        const line = src.slice(0, m.index).split('\n').length;
        hits.push(`${rel(p)}:${line}  ${what}`);
      }
    }
  }
  ok('nothing loads a resource off the network', hits.length === 0, hits.join('\n        '));
}

{
  // The vendored libraries must be reached by relative path, or the whole
  // exercise was pointless.
  const html = readFileSync(PATHS.runner, 'utf8');
  const missing = ['./lib/jscad-modeling.min.js', './lib/jscad-regl-renderer.min.js']
    .filter((s) => !html.includes(`src="${s}"`));
  ok('runner.html loads both bundles by relative path', missing.length === 0, `missing: ${missing.join(', ')}`);
}

{
  // Not a failure — but every one gets listed, so a real offender can never
  // hide behind "there are always some URLs in there".
  const urls = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    src.split('\n').forEach((line, i) => {
      const m = /https?:\/\/[^\s"'`)<>\]]+/.exec(line);
      if (m) urls.push(`${rel(p)}:${i + 1}  ${m[0]}`);
    });
  }
  if (urls.length === 0) ok('no http(s):// text references at all', true);
  else warn(`${urls.length} http(s):// text reference(s) — prose/attribution links, nothing is fetched`,
    urls.join('\n        '));
}

// ---------------------------------------------------------------------------
// VENDORED LIBS PRESENT
// ---------------------------------------------------------------------------

section('vendored libs');

const MIN_BYTES = 100 * 1024;

for (const [label, p, globalName] of [
  ['jscad-modeling.min.js', PATHS.modeling, 'jscadModeling'],
  ['jscad-regl-renderer.min.js', PATHS.regl, 'jscadReglRenderer'],
]) {
  ok(`${label} exists`, existsSync(p), `missing ${rel(p)}`);
  if (!existsSync(p)) continue;
  const bytes = statSync(p).size;
  ok(`${label} is > 100KB`, bytes > MIN_BYTES, `${bytes} bytes — too small to be the real library`);
  ok(`${label} exports window.${globalName}`, readFileSync(p, 'utf8').includes(globalName));
}

{
  const dir = path.join(root, 'public/reshape/lib');
  const mins = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.min.js')) : [];
  ok('public/reshape/lib/*.min.js is non-empty', mins.length >= 2, `found ${JSON.stringify(mins)}`);
}

// ---------------------------------------------------------------------------
// EVERY DOCUMENTED EXAMPLE RUNS -- THE LEGACY JSCAD REFERENCE ONLY
// ---------------------------------------------------------------------------
//
// lib/reshape-docs.ts's `code` fields are reSHape SCRIPT now (the DSL
// scripts/reshape-script.ts runs, tested against a real kernel by
// scripts/test-reshape-script.mjs, in the very same ownership as this file).
// Feeding them to the JSCAD shim below would be testing the wrong language
// against the wrong runtime -- every one of them would report "box is not
// defined" or worse, silently return whatever @jscad/modeling's OWN box()
// means, and neither result says anything about whether the DSL script is
// correct. So this group's material moved: public/reshape/docs/jscad-legacy.md
// is now the JSCAD reference (the page the DSL rewrite displaced), and it is
// this group's job for as long as that page still ships behind ?engine=jscad
// (see .gauntlet/SPEC-reshape-script.md's migration step 3).
//
// Read as markdown, not as data -- unlike lib/reshape-docs.ts, jscad-legacy.md
// has no compiled `sections` array to require, so its ```js fences are parsed
// the same way scripts/reshape-harness.mjs's own referenceExamples() parses
// reference.md's (an optional slug after `js`, everything up to the matching
// closing fence). Untagged fences (jscad-legacy.md has several -- a
// require()-form counterpart shown right after a `shcode-only` shortcut, for
// instance) are labelled by line number instead of a slug, so nothing is
// silently skipped for lacking a name.

section('documented examples (JSCAD legacy reference)');

const LEGACY_PATH = path.join(root, 'public/reshape/docs/jscad-legacy.md');

function parseLegacyExamples(mdPath) {
  const src = readFileSync(mdPath, 'utf8');
  const rx = /^```js([^\n]*)\n([\s\S]*?)^```$/gm;
  const out = [];
  let m;
  while ((m = rx.exec(src)) !== null) {
    const tag = (m[1] || '').trim();
    const line = src.slice(0, m.index).split('\n').length + 1;
    out.push({ label: tag || `line ${line}`, code: m[2] });
  }
  return out;
}

const legacyExamples = existsSync(LEGACY_PATH) ? parseLegacyExamples(LEGACY_PATH) : null;
ok('public/reshape/docs/jscad-legacy.md exists', legacyExamples !== null, `missing ${rel(LEGACY_PATH)}`);

if (legacyExamples) {
  note(`${legacyExamples.length} fenced examples in jscad-legacy.md`);
  ok('the legacy reference still carries examples', legacyExamples.length > 0, 'no ```js fence found');

  // Every example runs in the SAME scope the JSCAD runner gives a student:
  // the vendored bundle, the additive shim cut live out of runner.html, AND
  // reshape.js -- this file predates the DSL and some of its examples still
  // use the eleven-name sugar layer (box, ball, tube, ...), not only bare
  // @jscad/modeling calls. One fresh context per example — module.exports
  // persists otherwise, and an example with no main() would inherit the
  // previous one's.
  for (const ex of legacyExamples) {
    // 'skeleton' is the program template with main() left empty on purpose:
    // it does not build a shape, so 'main() returned undefined' is its
    // correct behaviour, not an example that broke.
    if (ex.label === 'skeleton') continue;
    const label = `jscad-legacy.md: ${ex.label}`;
    const cap = captureConsole();
    let r;
    try {
      const { ctx } = createSimpleContext({ consoleImpl: cap.console });
      r = runProgram(ctx, ex.code, `jscad-legacy.md<${ex.label}>`);
    } catch (e) {
      ok(label, false, `context build threw: ${e.message}`);
      continue;
    }
    if (!r.ok) { ok(label, false, `${r.phase}: ${r.error.message}`); continue; }
    if (!r.main) { ok(label, false, 'no main() to call'); continue; }
    if (r.geometry === undefined) { ok(label, false, 'main() returned undefined'); continue; }
    const errs = cap.lines.filter((l) => l.type === 'error');
    if (errs.length) { ok(label, false, `console.error: ${errs[0].text.slice(0, 140)}`); continue; }
    ok(label, isGeometry(r.geometry),
      `main() returned ${Array.isArray(r.geometry) ? `an array of ${r.geometry.length}` : typeof r.geometry} the renderer could not draw`);
  }
}

// ---------------------------------------------------------------------------
// BOTH CALL STYLES
// ---------------------------------------------------------------------------
//
// The shim is additive: it must ADD `cube` without replacing `primitives.cube`,
// and the two must be the same function object. A shim that wrapped geometry in
// something friendlier would still pass a "does it render" check and would
// quietly stop the student's file from running on jscad.app.

section('both call styles');

{
  const SPOT = [
    ['primitives', 'cube'],
    ['primitives', 'sphere'],
    ['transforms', 'translate'],
    ['booleans', 'union'],
  ];
  const { ctx, jscad } = createShimContext();

  for (const [mod, name] of SPOT) {
    const qualified = jscad?.[mod]?.[name];
    const bare = ctx[name];
    ok(`${mod}.${name} exists on the bundle`, typeof qualified === 'function', typeof qualified);
    ok(`bare ${name} is installed by the shim`, typeof bare === 'function', typeof bare);
    ok(`bare ${name} IS ${mod}.${name} (same reference)`, bare === qualified);
  }

  // And run both forms end to end, since "same reference" is only half of it.
  const bareRun = runProgram(
    createShimContext().ctx,
    'function main() { return cube({ size: 10 }) }\nmodule.exports = { main }',
    'spot-check<bare>',
  );
  ok('a bare-style program returns geometry',
    bareRun.ok && isGeometry(bareRun.geometry),
    bareRun.ok ? 'ran but returned nothing drawable' : `${bareRun.phase}: ${bareRun.error.message}`);

  const qualRun = runProgram(
    createShimContext().ctx,
    "const { primitives } = require('@jscad/modeling')\n" +
    'function main() { return primitives.cube({ size: 10 }) }\nmodule.exports = { main }',
    'spot-check<qualified>',
  );
  ok('a qualified-style program returns geometry',
    qualRun.ok && isGeometry(qualRun.geometry),
    qualRun.ok ? 'ran but returned nothing drawable' : `${qualRun.phase}: ${qualRun.error.message}`);
}

// ---------------------------------------------------------------------------
// DRIFT between lib/reshape-docs.ts and public/reshape/docs/reference.md
// ---------------------------------------------------------------------------
//
// Warnings, not failures: the two references are allowed to differ on purpose
// (reference.md is the offline copy, the in-app docs are the taught path). What
// is NOT allowed is differing without anyone noticing, so the count is printed
// every run.
//
// Candidates used to be every @jscad/modeling export; both references are DSL
// now, so the candidate list is the DSL's own vocabulary instead --
// lib/reshape-script.ts's VOCABULARY constant, the same array runScript()
// builds its `globals` object from (see that file's own comment on why it is
// exported: this gate is exactly the reader that constant exists for). Read
// as compiled data rather than grepped for a hand-copied list, so a DSL call
// added there and never mentioned here is measured, not assumed.

section('doc drift (warnings)');

const vocabOutDir = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-vocab-'));
let VOCABULARY = null;
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/reshape-script.ts', 'lib/model-types.ts', 'lib/model-codegen.ts',
      'lib/sketch-arc.ts', 'lib/sketch-solve.ts', 'lib/topo-name.ts',
      '--outDir', vocabOutDir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(vocabOutDir, 'package.json'), '{"type":"commonjs"}');
  const requireVocab = createRequire(path.join(vocabOutDir, 'noop.cjs'));
  VOCABULARY = requireVocab(path.join(vocabOutDir, 'reshape-script.js')).VOCABULARY;
} catch (e) {
  ok('lib/reshape-script.ts compiles and exports `VOCABULARY`', false, e.message);
} finally {
  rmSync(vocabOutDir, { recursive: true, force: true });
}

ok(
  'lib/reshape-script.ts compiles and exports `VOCABULARY`',
  Array.isArray(VOCABULARY) && VOCABULARY.length > 0,
  `got ${JSON.stringify(VOCABULARY)?.slice(0, 80)}`
);

const dslNames = Array.isArray(VOCABULARY) ? [...VOCABULARY].sort() : [];

const inAppDocumented = documentedNames(docText.inApp(), dslNames);
const refDocumented = documentedNames(docText.reference(), dslNames);

const onlyInApp = dslNames.filter((n) => inAppDocumented.has(n) && !refDocumented.has(n));
const onlyRef = dslNames.filter((n) => refDocumented.has(n) && !inAppDocumented.has(n));

if (onlyInApp.length === 0) ok('nothing in lib/reshape-docs.ts is missing from reference.md', true);
else warn(`${onlyInApp.length} call(s) in lib/reshape-docs.ts but not in reference.md`, onlyInApp.join(', '));

if (onlyRef.length === 0) ok('nothing in reference.md is missing from lib/reshape-docs.ts', true);
else warn(`${onlyRef.length} call(s) in reference.md but not in lib/reshape-docs.ts`, onlyRef.join(', '));

note(`drift total: ${onlyInApp.length + onlyRef.length} name(s)`);

// ---------------------------------------------------------------------------
// COVERAGE
// ---------------------------------------------------------------------------

section('refusal sentences are the runtime\'s own');
{
  // reference.md's "When a step is refused" section and the in-app Refusals
  // page quote what the app says. On 2026-09-03 a student lens hit two real
  // sentences and found neither in the doc, which quoted four invented ones.
  // So: every quoted sentence that reads like a refusal must be an instance of
  // a string template in the runtime. `${...}` in a template matches anything;
  // `a -- ` + `b` continuations are joined before extraction.
  const SOURCES = ['lib/occt-build.ts', 'lib/model-types.ts', 'lib/reshape-script.ts'];
  const templates = [];
  for (const f of SOURCES) {
    let s = readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
    s = s.replace(/`\s*\n\s*\+\s*`/g, '');
    for (const m of s.matchAll(/`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'/g)) {
      const lit = m[1] ?? m[2];
      if (!lit || lit.length < 25 || !lit.includes(' ')) continue;
      const rx = '^' + lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\$\\\{.*?\\\}/g, '.+?') + '$';
      templates.push(new RegExp(rx));
    }
  }
  ok('the runtime yields refusal templates to compare against', templates.length >= 20, `${templates.length} templates`);
  const looksLikeRefusal = (q) => / -- /.test(q) || /Round the shape before/.test(q);
  const DOCS = [
    ['public/reshape/docs/reference.md', readFileSync(PATHS.reference, 'utf8')],
    ['lib/reshape-docs.ts', readFileSync(PATHS.inAppDocs, 'utf8')],
  ];
  let quotes = 0;
  for (const [where, text] of DOCS) {
    for (const m of text.matchAll(/"([^"\n]{20,})"/g)) {
      const q = m[1];
      if (!looksLikeRefusal(q)) continue;
      quotes++;
      const line = text.slice(0, m.index).split('\n').length;
      ok(`${where}:${line} quotes a sentence the runtime can say`, templates.some((rx) => rx.test(q)), q);
    }
  }
  ok('the quote scan found the refusal sentences', quotes >= 8, `${quotes} quoted refusals across both documents`);
}

section('coverage');

{
  const documented = new Set([...inAppDocumented, ...refDocumented]);
  const y = dslNames.length;
  const x = documented.size;
  const z = y === 0 ? 0 : Math.round((x / y) * 1000) / 10;
  console.log(`  ----  documented ${x} / ${y} DSL calls (${z}%)`);
  console.log(`  ----    lib/reshape-docs.ts: ${inAppDocumented.size}   reference.md: ${refDocumented.size}`);
  console.log(`  ----    undocumented: ${dslNames.filter((n) => !documented.has(n)).join(', ') || '(none)'}`);
  // 24 DSL calls as of this pass (see VOCABULARY in lib/reshape-script.ts).
  // The floor only has to catch VOCABULARY failing to load and reporting
  // 0/0 as "100%" -- it is not a claim that the DSL will always have at
  // least 20 calls, only that a healthy load has noticeably more than zero.
  ok('the DSL exposes a real vocabulary to measure against', y >= 20, `only ${y} DSL calls`);
  ok('the docs cover something', x > 0);
}

// ---------------------------------------------------------------------------

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails === 0 ? 0 : 1);
