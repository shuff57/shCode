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
  loadModeling, apiNames, documentedNames, docText,
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
// EVERY DOCUMENTED EXAMPLE RUNS
// ---------------------------------------------------------------------------
//
// Compile lib/reshape-docs.ts to CommonJS in a temp dir and require the real
// `sections` array. Reading the docs as data is what gives every result a
// section slug and a page title instead of a line number.

section('documented examples');

const outDir = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-docs-'));
let sections = null;

try {
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        'lib/docs-core.ts',
        'lib/reshape-docs.ts',
        '--outDir', outDir,
        '--module', 'commonjs',
        '--target', 'es2022',
        '--skipLibCheck',
      ],
      { cwd: root, stdio: 'inherit' },
    );
    // tsc emits bare .js; mark the temp dir CommonJS so an ancestor
    // package.json with "type": "module" can't reinterpret them as ESM.
    writeFileSync(path.join(outDir, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(path.join(outDir, 'noop.cjs'));
    sections = require(path.join(outDir, 'reshape-docs.js')).sections;
  } catch (e) {
    ok('lib/reshape-docs.ts compiles and exports `sections`', false, e.message);
  }

  if (sections) {
    ok('lib/reshape-docs.ts compiles and exports `sections`', Array.isArray(sections) && sections.length > 0,
      `got ${JSON.stringify(sections)?.slice(0, 80)}`);

    const pages = [];
    for (const s of sections) {
      for (const p of s.pages || []) {
        pages.push({ slug: s.slug, sectionTitle: s.title, title: p.title, code: p.code });
      }
    }
    const withCode = pages.filter((p) => typeof p.code === 'string' && p.code.trim());
    note(`${sections.length} sections, ${pages.length} pages, ${withCode.length} carrying a code example`);
    ok('the docs still carry examples', withCode.length > 0, 'no page has a `code` field');

    // Every example runs in the SAME scope the runner gives a student: the
    // vendored bundle, the additive shim cut live out of runner.html, AND
    // reshape.js. That last one is not optional any more -- these examples are
    // written in reSHape words, so a shim-only context reports every one of
    // them as "box is not defined" while the page they came from renders fine.
    // One fresh context per example — module.exports persists otherwise, and a
    // page with no main() would inherit the previous page's.
    for (const p of withCode) {
      const label = `${p.slug} / ${p.title}`;
      const cap = captureConsole();
      let r;
      try {
        const { ctx } = createSimpleContext({ consoleImpl: cap.console });
        r = runProgram(ctx, p.code, `lib/reshape-docs.ts<${label}>`);
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
} finally {
  rmSync(outDir, { recursive: true, force: true });
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

section('doc drift (warnings)');

const { jscad: bundleApi } = loadModeling();
const exportNames = [...apiNames(bundleApi).keys()].sort();

const inAppDocumented = documentedNames(docText.inApp(), exportNames);
const refDocumented = documentedNames(docText.reference(), exportNames);

const onlyInApp = exportNames.filter((n) => inAppDocumented.has(n) && !refDocumented.has(n));
const onlyRef = exportNames.filter((n) => refDocumented.has(n) && !inAppDocumented.has(n));

if (onlyInApp.length === 0) ok('nothing in lib/reshape-docs.ts is missing from reference.md', true);
else warn(`${onlyInApp.length} function(s) in lib/reshape-docs.ts but not in reference.md`, onlyInApp.join(', '));

if (onlyRef.length === 0) ok('nothing in reference.md is missing from lib/reshape-docs.ts', true);
else warn(`${onlyRef.length} function(s) in reference.md but not in lib/reshape-docs.ts`, onlyRef.join(', '));

note(`drift total: ${onlyInApp.length + onlyRef.length} name(s)`);

// ---------------------------------------------------------------------------
// COVERAGE
// ---------------------------------------------------------------------------

section('coverage');

{
  const documented = new Set([...inAppDocumented, ...refDocumented]);
  const y = exportNames.length;
  const x = documented.size;
  const z = y === 0 ? 0 : Math.round((x / y) * 1000) / 10;
  console.log(`  ----  documented ${x} / ${y} exports (${z}%)`);
  console.log(`  ----    lib/reshape-docs.ts: ${inAppDocumented.size}   reference.md: ${refDocumented.size}`);
  // 94 uniquely-named exported functions across the 15 modules as of
  // @jscad/modeling@2.13.0. The floor only has to catch a bundle that failed to
  // load and reported 0/0 as "100%".
  ok('the bundle exposes a real API surface to measure against', y > 50, `only ${y} exported functions`);
  ok('the docs cover something', x > 0);
}

// ---------------------------------------------------------------------------

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails === 0 ? 0 : 1);
