#!/usr/bin/env node
// test-reshape.mjs — the JSCAD acceptance gate.
//
// Six groups, each one closing a claim the stack currently makes only in prose:
//
//   BUNDLE    the two vendored files really are the libraries they claim to be,
//             and nothing in public/reshape/ reaches for a CDN.
//   SHIM      the scope shim cut live out of runner.html behaves the way its
//             own banner says — including the two-name collision list, which
//             until now was observable only by a human opening the preview
//             console.
//   API       every taught function is the SAME REFERENCE bare as it is
//             namespaced. This is the check that stops a future shim from
//             wrapping geometry and breaking paste-into-jscad.app.
//   RENDERER  every regl symbol runner.html reaches resolves, and the camera /
//             orbit / entity wiring runs. 160 lines of renderer code that no
//             test touches is 160 lines that are correct by assertion only.
//   DOCS      every example in public/reshape/docs/jscad-legacy.md runs in a
//             require-only context — the jscad.app environment, with the shim
//             subtracted back out. (reference.md and lib/reshape-docs.ts teach
//             reSHape Script since 2026-09-03; test-reshape-script.mjs runs
//             every one of those examples on the B-rep kernel.)
//   SYNC      the in-app docs and reference.md document the same reSHape
//             Script vocabulary. public/reshape/docs/CLAUDE.md states this
//             rule; this enforces it.
//   REACH     something a student can actually click loads this runtime. The
//             other six groups all measure whether the runtime is CORRECT;
//             none of them noticed that for the whole of the first build
//             nothing rendered ReshapePreview at all, and /docs/reshape fed JSCAD
//             source to the moSHion runner. A gate that cannot fail on "nobody
//             can load it" is measuring the wrong thing.
//
// Runtime builders MUST NOT edit this file or reshape-checks.mjs. A red check is
// closed by fixing public/reshape/runner.html, the vendored bundles, or the docs
// — never by loosening a check here.
//
//   node scripts/test-reshape.mjs                # everything
//   node scripts/test-reshape.mjs --only=docs    # one group
//   node scripts/test-reshape.mjs --json         # machine-readable, for critics

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  REPO, PATHS, extractShim, runnerSource, loadModeling, loadRenderer,
  createShimContext, createRequireOnlyContext, runProgram, isGeometry,
  legacyExamples, referenceExamples, inAppExamples, dslVocabulary, apiNames, documentedNames, docText, captureConsole,
} from './reshape-harness.mjs';
import {
  EXPECTED_BUNDLES,
  EXPECTED_MODULE_ORDER, DOCUMENTED_COLLISIONS, EXPECTED_BARE_NAME_COUNT,
  CORE_TAUGHT, taughtFromReference, REGL_ALIASES, MIN_REGL_SYMBOLS,
  ENTITY_GEOMETRY_KEYS, DOC_SYNC_EXCEPTIONS, MIN_DOC_EXAMPLES, FENCE_TAGS,
  REACH_CHAIN, REACH_LESSON, REACH_MOSHION,
} from './reshape-checks.mjs';
import {
  SIMPLE_PATH, RESHAPE_NAMES, EXPECTED_RESHAPE_NAME_COUNT, RESHAPE_REPORT_GLOBALS,
  RESHAPE_OPTION_KEYS, RESHAPE_HOST_GLOBALS, MEASURE_WRAPPERS, EQUIVALENTS, TURN_IN_PLACE, POSITIONAL_CONTRACT, GUARDS,
  NO_OPTIONS_CONTRACT, ARITY_GUARDS, RING_ARITHMETIC, POLY_BARE_ARRAY, WRAPS_BOX,
  SILENTLY_DROPPED, REFUSALS_OVERTURNED, ASSIGNMENT_POOL, INTEROP, SEEDED_COLLISION,
  OWNED_NAMES, OWNED_FORMS,
  GRADUATION, GRADUATION_TRIPWIRES, TURN_COMPOSITION, REFUSALS_NAME_THE_REAL_CALL,
  REVERSE_LOOKUP, readReverseTable, BORROWED_ASSERTIONS, createSvgContext, SVG_CASES,
  SVG_MARGIN, readGraduationTable, createGraduationContext, createSimpleContext,
  sameGeometry, sameModel, BOOK_CENSUS, BRIDGE, readBridgeTable, BRIDGE_WARNINGS,
  SIT_VS_BOOK_ALIGN, BOOK_IDENTIFIERS, REFUSAL_CALLS, evaluateInShcad, BOOK_OPTION_KEYS,
  OBJECT_DEPTH, PARAM_DEFAULTS, reshapeSection, liveObjectLiterals, PARAM_TYPES,
  readFirstColumn, paramProgram, BOOK_OPTION_WORDS,
} from './reshape-simple-checks.mjs';

const argv = process.argv.slice(2);
const WANT_JSON = argv.includes('--json');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7);

// ---- tiny assertion recorder ----------------------------------------------

const results = [];
let group = '';

const at = (g) => { group = g; };
function check(name, fn) {
  if (ONLY && ONLY !== group) return;
  try {
    const r = fn();
    if (r === true || r === undefined) results.push({ group, name, pass: true });
    else results.push({ group, name, pass: false, reason: String(r) });
  } catch (e) {
    results.push({ group, name, pass: false, reason: `threw: ${e.message}` });
  }
}
const eq = (a, b, what) => (a === b ? true : `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ===========================================================================
// BUNDLE
// ===========================================================================

at('bundle');

// The check that stops the rest of this gate being self-referential. Every
// other BUNDLE/API/DOCS check measures the vendored file against itself, so a
// swapped bundle would pass them all. This one pins identity.
check('vendored bundles match their recorded hashes', () => {
  const bad = [];
  for (const b of EXPECTED_BUNDLES) {
    const p = join(REPO, 'public/reshape/lib', b.file);
    if (!existsSync(p)) { bad.push(`${b.file}: missing`); continue; }
    const buf = readFileSync(p);
    if (buf.length !== b.bytes) bad.push(`${b.file}: ${buf.length} bytes, expected ${b.bytes}`);
    const got = createHash('sha256').update(buf).digest('hex');
    if (got !== b.sha256) {
      const who = b.version ? `${b.pkg}@${b.version}` : b.pkg;
      bad.push(`${b.file}: sha256 ${got.slice(0, 16)}… but ${who} is recorded as ${b.sha256.slice(0, 16)}… — if this is a deliberate upgrade, update version AND sha256 in reshape-checks.mjs together, never the hash alone`);
    }
  }
  return bad.length ? bad.join(' | ') : true;
});

// Reported, never gating: two of the three are byte-verified against their
// published artifact; @jscad/io is not, because upstream publishes no such
// file. Saying so on every run beats it living only in a comment.
check('bundle provenance is recorded', () => {
  const unverified = EXPECTED_BUNDLES.filter((b) => !b.verified).map((b) => b.file);
  if (unverified.length) {
    console.log(`       note: hash-pinned but upstream-unverified: ${unverified.join(', ')}`);
  }
  return EXPECTED_BUNDLES.every((b) => /^[0-9a-f]{64}$/.test(b.sha256))
    || 'every bundle needs a recorded sha256';
});

check('modeling bundle is vendored and full-size', () => {
  if (!existsSync(PATHS.modeling)) return `missing ${relative(REPO, PATHS.modeling)}`;
  const bytes = statSync(PATHS.modeling).size;
  if (bytes < 100 * 1024) return `${bytes} bytes — too small to be @jscad/modeling`;
  if (!readFileSync(PATHS.modeling, 'utf8').includes('jscadModeling')) return 'no jscadModeling global in the bundle';
  return true;
});

check('regl-renderer bundle is vendored and full-size', () => {
  if (!existsSync(PATHS.regl)) return `missing ${relative(REPO, PATHS.regl)}`;
  const bytes = statSync(PATHS.regl).size;
  if (bytes < 100 * 1024) return `${bytes} bytes — too small to be @jscad/regl-renderer`;
  if (!readFileSync(PATHS.regl, 'utf8').includes('jscadReglRenderer')) return 'no jscadReglRenderer global in the bundle';
  return true;
});

// The whole point of vendoring. A CDN reference that creeps back in works fine
// on a fast connection at a desk and fails in a classroom behind a filter.
check('nothing under public/reshape or its wiring loads from a CDN', () => {
  const CDN = /unpkg\.com|jsdelivr|cdnjs|cdn\.skypack|esm\.sh|\/\/cdn\./i;
  const skip = new Set([PATHS.modeling, PATHS.regl]);
  const offenders = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (skip.has(p)) continue;
      if (!/\.(html|js|mjs|md|ts|tsx|json|css)$/.test(e.name)) continue;
      if (CDN.test(readFileSync(p, 'utf8'))) offenders.push(relative(REPO, p));
    }
  };
  walk(join(REPO, 'public/reshape'));
  for (const p of [join(REPO, 'lib/preview-builder.ts'), join(REPO, 'components/ReshapePreview.tsx')]) {
    if (existsSync(p) && CDN.test(readFileSync(p, 'utf8'))) offenders.push(relative(REPO, p));
  }
  return offenders.length ? `CDN reference in ${offenders.join(', ')}` : true;
});

check('runner loads both bundles by relative path', () => {
  const html = runnerSource();
  for (const src of ['./lib/jscad-modeling.min.js', './lib/jscad-regl-renderer.min.js']) {
    if (!html.includes(`src="${src}"`)) return `runner.html does not load ${src}`;
  }
  // UMD order matters: the bundles must load before the shim declares
  // window.module, or they export into it instead of onto window.
  const bundleAt = html.indexOf('jscad-regl-renderer.min.js');
  const moduleAt = html.indexOf('window.module = { exports: {} }');
  return bundleAt < moduleAt ? true : 'the shim declares window.module before the UMD bundles load';
});

check('the bundle exposes all 15 modules', () => {
  const { jscad } = loadModeling();
  const got = Object.keys(jscad).sort();
  const want = [...EXPECTED_MODULE_ORDER].sort();
  return same(got, want) ? true : `modules differ: ${JSON.stringify(got)}`;
});

// ===========================================================================
// SHIM  (cut live out of runner.html — never reimplemented here)
// ===========================================================================

at('shim');

check('the shim can be located in runner.html', () => {
  const shim = extractShim();
  return shim.code.length > 500 ? true : 'extracted shim is implausibly short';
});

check("the shim's MODULE_ORDER matches the library", () => {
  const m = /var MODULE_ORDER = \[([\s\S]*?)\];/.exec(extractShim().code);
  if (!m) return 'no MODULE_ORDER array in the shim';
  const got = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return same(got, EXPECTED_MODULE_ORDER) ? true : `MODULE_ORDER drifted: ${JSON.stringify(got)}`;
});

// The tripwire. runner.html's banner claims exactly two names collide; before
// this line the only way to know was to open the preview console and read
// window.__jscadBareNamesSkipped by hand.
check('__jscadBareNamesSkipped is exactly the two documented collisions', () => {
  const { skipped } = createShimContext();
  const want = DOCUMENTED_COLLISIONS.map((c) => c.name);
  return same(skipped, want)
    ? true
    : `expected ${JSON.stringify(want)}, got ${JSON.stringify(skipped)} — a library upgrade changed the collision set; update the shim banner, then reshape-checks.mjs`;
});

// A node vm global is a far smaller surface than a browser `window`, so the
// check above can only see collisions that survive that difference. This one
// audits the library on its own terms and is the same answer in any host.
check('the library itself collides on exactly the documented names', () => {
  const { jscad } = loadModeling();
  const owner = new Map();
  const found = [];
  for (const m of EXPECTED_MODULE_ORDER) if (jscad[m] !== undefined) owner.set(m, '<module>');
  for (const m of EXPECTED_MODULE_ORDER) {
    for (const k of Object.keys(jscad[m] || {})) {
      if (owner.has(k)) found.push({ name: k, winner: owner.get(k), loser: m });
      else owner.set(k, m);
    }
  }
  return same(found, DOCUMENTED_COLLISIONS)
    ? true
    : `collision set changed: ${JSON.stringify(found)}`;
});

check('the shim installs the expected number of bare names', () => {
  const { window } = createShimContext();
  let n = 0;
  const { jscad } = loadModeling();
  for (const m of EXPECTED_MODULE_ORDER) {
    if (window[m] !== undefined) n++;
    for (const k of Object.keys(jscad[m] || {})) if (window[k] !== undefined) n++;
  }
  // Each collision is counted once, not twice.
  n -= DOCUMENTED_COLLISIONS.length;
  return eq(n, EXPECTED_BARE_NAME_COUNT, 'bare names');
});

check('collisions resolve to the top-level module, both halves still reachable', () => {
  const { window, jscad } = createShimContext();
  for (const c of DOCUMENTED_COLLISIONS) {
    if (window[c.name] !== jscad[c.name]) return `bare ${c.name} is not the top-level ${c.name} module`;
    if (jscad[c.loser][c.name] === undefined) return `${c.loser}.${c.name} stopped being reachable`;
  }
  return true;
});

// The skip in install() used to be silent: a name that could not be installed
// landed in a global and nothing said so. A library upgrade that collided with
// a browser built-in would have taken a bare name away with no error anywhere.
check('a bare name that cannot be installed is reported, not swallowed', () => {
  const cap = captureConsole();
  // Seed a collision the library does not have today, so the path is exercised
  // rather than assumed. `cube` is the most-taught name in the course.
  const { window: w, lost } = createShimContext({
    preSeed: { cube: 'something else owns this' },
    consoleImpl: cap.console,
  });
  if (!Array.isArray(lost)) return 'the shim publishes no __jscadBareNamesLost';
  if (!lost.includes('cube')) return `expected 'cube' in the lost list, got ${JSON.stringify(lost)}`;
  // The documented collisions are expected, so they must NOT be reported.
  for (const known of DOCUMENTED_COLLISIONS.map((c) => c.name)) {
    if (lost.includes(known)) return `${known} is a documented collision and must not be reported as lost`;
  }
  const warned = cap.lines.filter((l) => l.type === 'warn' && /cube/.test(l.text));
  if (!warned.length) return 'nothing was written to the console about the lost name';
  // And the namespaced call still works, which is the whole promise.
  if (typeof w.jscadModeling.primitives.cube !== 'function') return 'primitives.cube stopped resolving';
  return true;
});

check("require('@jscad/modeling') returns the module object", () => {
  const { window, jscad } = createShimContext();
  return window.require('@jscad/modeling') === jscad ? true : 'require returned something else';
});

check('require resolves the real submodule paths', () => {
  const { window, jscad } = createShimContext();
  const cases = [
    ['@jscad/modeling/src/primitives', jscad.primitives],
    ['@jscad/modeling/primitives', jscad.primitives],
    ['@jscad/modeling/src/operations/booleans', jscad.booleans],
    ['@jscad/modeling/src/operations/transforms', jscad.transforms],
  ];
  for (const [path, want] of cases) {
    if (window.require(path) !== want) return `require('${path}') did not resolve`;
  }
  return true;
});

check('require of anything else throws a named error', () => {
  const { window } = createShimContext();
  try { window.require('three'); } catch (e) {
    return /Cannot find module 'three'/.test(e.message) ? true : `wrong message: ${e.message}`;
  }
  return "require('three') did not throw";
});

check('module.exports is the real CommonJS surface', () => {
  const { window } = createShimContext();
  if (!window.module || typeof window.module.exports !== 'object') return 'no window.module.exports';
  return window.exports === window.module.exports ? true : 'exports is not aliased to module.exports';
});

// ===========================================================================
// API  (bare === namespaced, by reference)
// ===========================================================================

at('api');

const taught = (() => {
  const derived = taughtFromReference(docText.legacy());
  const seen = new Set(derived.map((t) => `${t.module}.${t.name}`));
  return [...derived, ...CORE_TAUGHT.filter((t) => !seen.has(`${t.module}.${t.name}`))];
})();

check('the reference still documents the core taught API', () => {
  const derived = new Set(taughtFromReference(docText.legacy()).map((t) => `${t.module}.${t.name}`));
  const missing = CORE_TAUGHT.filter((t) => !derived.has(`${t.module}.${t.name}`));
  return missing.length
    ? `jscad-legacy.md no longer documents ${missing.map((t) => `${t.module}.${t.name}`).join(', ')}`
    : true;
});

check('every documented function exists on its module', () => {
  const { jscad } = loadModeling();
  const missing = taught.filter((t) => typeof (jscad[t.module] || {})[t.name] !== 'function');
  return missing.length
    ? `documented but not in the library: ${missing.map((t) => `${t.module}.${t.name}`).join(', ')}`
    : true;
});

// The decisive additive-ness check. Not "the bare name works" — "the bare name
// IS the library's function". A wrapper would pass the first and fail this.
check('every taught function is the same reference bare as namespaced', () => {
  const { window, jscad } = createShimContext();
  const collisions = new Set(DOCUMENTED_COLLISIONS.map((c) => c.name));
  const bad = [];
  for (const t of taught) {
    const real = (jscad[t.module] || {})[t.name];
    if (typeof real !== 'function') continue;      // reported by the check above
    if (collisions.has(t.name)) continue;          // documented, checked in SHIM
    if (window[t.name] !== real) bad.push(`${t.module}.${t.name}`);
  }
  return bad.length ? `bare name is not the library function: ${bad.join(', ')}` : true;
});

check('the taught surface is not silently shrinking', () => {
  return taught.length >= CORE_TAUGHT.length ? true : `only ${taught.length} taught names found`;
});

check('bare and namespaced calls build identical geometry', () => {
  const { window, jscad } = createShimContext();
  const bareCube = window.cube({ size: 10 });
  const nsCube = jscad.primitives.cube({ size: 10 });
  if (bareCube.polygons.length !== nsCube.polygons.length) return 'polygon counts differ';
  const bareCut = window.subtract(window.cube({ size: 10 }), window.sphere({ radius: 6 }));
  const nsCut = jscad.booleans.subtract(
    jscad.primitives.cube({ size: 10 }), jscad.primitives.sphere({ radius: 6 })
  );
  return eq(bareCut.polygons.length, nsCut.polygons.length, 'subtract polygon count');
});

// ===========================================================================
// RENDERER
// ===========================================================================

at('renderer');

// Derived from the runner source rather than listed here, so adding a renderer
// call to runner.html starts asserting it on the very next run.
function reglSymbolsUsedByRunner() {
  const html = runnerSource();
  const aliases = Object.keys(REGL_ALIASES).join('|');
  const found = new Set();
  for (const m of html.matchAll(new RegExp(`\\b(${aliases})\\.([A-Za-z_$][\\w$]*)`, 'g'))) {
    const base = REGL_ALIASES[m[1]];
    found.add(base ? `${base}.${m[2]}` : m[2]);
  }
  return [...found].sort();
}

check('the runner still reaches a plausible amount of the renderer', () => {
  const n = reglSymbolsUsedByRunner().length;
  return n >= MIN_REGL_SYMBOLS ? true : `only ${n} regl symbols found in runner.html — the scan has broken`;
});

check('every regl symbol the runner reaches resolves', () => {
  const { regl } = loadRenderer();
  const missing = reglSymbolsUsedByRunner().filter((path) => {
    let cur = regl;
    for (const part of path.split('.')) {
      if (cur == null || cur[part] === undefined) return true;
      cur = cur[part];
    }
    return false;
  });
  return missing.length ? `unresolved: ${missing.join(', ')}` : true;
});

check('the camera setup in render() runs', () => {
  const { regl } = loadRenderer();
  const p = regl.cameras.perspective;
  const camera = Object.assign({}, p.defaults);
  camera.position = [450, 550, 700];
  camera.target = [0, 0, 0];
  camera.up = [0, 0, 1];
  p.setProjection(camera, camera, { width: 800, height: 600 });
  p.update(camera, camera);
  for (const k of ['projection', 'view']) {
    const m = camera[k];
    if (!m || m.length !== 16) return `camera.${k} is not a 4x4 matrix`;
    if (![...m].every(Number.isFinite)) return `camera.${k} contains a non-finite value`;
  }
  return true;
});

check('the orbit controls in the render loop run', () => {
  const { regl } = loadRenderer();
  const p = regl.cameras.perspective;
  const orbit = regl.controls.orbit;
  const camera = Object.assign({}, p.defaults);
  camera.position = [450, 550, 700];
  camera.target = [0, 0, 0];
  camera.up = [0, 0, 1];
  p.setProjection(camera, camera, { width: 800, height: 600 });
  p.update(camera, camera);

  let controls = Object.assign({}, orbit.defaults);
  const rotated = orbit.rotate({ controls, camera, speed: 0.002 }, [12, -8]);
  if (!rotated || !rotated.controls) return 'rotate returned no controls';
  controls = Object.assign({}, controls, rotated.controls);

  const panned = orbit.pan({ controls, camera, speed: 1 }, [5, 5]);
  if (!panned || !panned.camera || panned.camera.position.length !== 3) return 'pan returned no camera position';
  if (![...panned.camera.position].every(Number.isFinite)) return 'pan produced a non-finite camera position';
  controls = Object.assign({}, controls, panned.controls);

  const zoomed = orbit.zoom({ controls, camera, speed: 0.08 }, 40);
  if (!zoomed || !zoomed.controls) return 'zoom returned no controls';
  controls = Object.assign({}, controls, zoomed.controls);

  const updated = orbit.update({ controls, camera });
  if (!updated || !updated.camera || ![...updated.camera.position].every(Number.isFinite)) {
    return 'update produced a non-finite camera position';
  }
  return true;
});

check('entitiesFromSolids turns a solid into a drawable entity', () => {
  const { regl, jscad } = loadRenderer();
  const solid = jscad.primitives.cube({ size: 10 });
  const entities = regl.entitiesFromSolids({ color: [1, 0.4, 0, 1] }, [solid]);
  if (!Array.isArray(entities) || entities.length !== 1) return `expected 1 entity, got ${entities && entities.length}`;
  const g = entities[0].geometry;
  if (!g) return 'entity has no geometry';
  const missing = ENTITY_GEOMETRY_KEYS.filter((k) => g[k] === undefined);
  if (missing.length) return `entity geometry is missing ${missing.join(', ')}`;
  if (!g.positions.length) return 'entity geometry has no vertices';
  return true;
});

check('the grid and axis draw commands the runner names exist', () => {
  const { regl } = loadRenderer();
  for (const cmd of ['drawGrid', 'drawAxis', 'drawLines', 'drawMesh']) {
    if (typeof regl.drawCommands[cmd] !== 'function') return `drawCommands.${cmd} is not a function`;
  }
  // The runner passes drawCmd: 'drawGrid' / 'drawAxis' by name; a rename in the
  // bundle would leave the grid silently absent rather than throwing.
  const html = runnerSource();
  for (const name of ['drawGrid', 'drawAxis']) {
    if (!html.includes(`drawCmd: '${name}'`)) return `runner.html no longer requests drawCmd '${name}'`;
  }
  return true;
});

// ===========================================================================
// DOCS  (the jscad.app portability bar)
// ===========================================================================

at('docs');

const examples = legacyExamples();

check('the doc example extractors still find the examples', () => {
  return examples.length >= MIN_DOC_EXAMPLES
    ? true
    : `only ${examples.length} examples extracted — an extractor has broken`;
});

check('every fence tag in jscad-legacy.md is one the gate understands', () => {
  const known = new Set(['js', ...Object.keys(FENCE_TAGS)]);
  const bad = [];
  for (const e of examples) for (const t of e.tags) if (!known.has(t)) bad.push(`${e.source}:${e.line} "${t}"`);
  return bad.length ? `unknown fence tag: ${bad.join(', ')}` : true;
});

// jscad-legacy.md is the bridge document -- it carries the graduation tables
// and has to show the real API working -- so every fence there stays portable
// unless it is tagged shcode-only, and a tag on a fence that would run
// portably is still a failure. The reSHape Script documents (reference.md,
// lib/reshape-docs.ts) cannot run on jscad.app by construction and are held to
// their own bar in test-reshape-script.mjs: every example builds on the kernel.
for (const e of examples) {
  const label = `${e.source}:${e.line}`;

  check(`runs on jscad.app — ${label}`, () => {
    const cap = captureConsole();
    const ctx = createRequireOnlyContext(cap.console);
    const r = runProgram(ctx, e.code, label, { lineOffset: e.line - 1 });
    const shcodeOnly = e.tags.includes('shcode-only');
    const skeleton = e.tags.includes('skeleton');

    if (shcodeOnly) {
      // Tagged as depending on the shim, so it MUST fail portably. A tag on a
      // portable example would be hiding a working example behind an excuse.
      return r.ok
        ? 'tagged shcode-only but it runs portably — drop the tag'
        : true;
    }
    if (!r.ok) {
      const hint = /is not defined/.test(r.error.message)
        ? ' (a bare shim name — write the require()/module.exports form, or tag the fence shcode-only)'
        : '';
      return `${r.phase}: ${r.error.message}${hint}`;
    }
    if (!r.main) return 'no main() to call';
    if (skeleton) {
      return r.geometry === undefined ? true : 'tagged skeleton but main() returned something — drop the tag';
    }
    const errs = cap.lines.filter((l) => l.type === 'error');
    if (errs.length) return `console.error: ${errs[0].text.slice(0, 120)}`;
    return isGeometry(r.geometry)
      ? true
      : 'main() ran but returned nothing the renderer could draw';
  });
}

// ===========================================================================
// SYNC  (public/reshape/docs/CLAUDE.md's unenforced rule)
// ===========================================================================

at('sync');

check('the in-app docs and reference.md document the same reSHape Script vocabulary', () => {
  const candidates = dslVocabulary();
  const inApp = documentedNames(docText.inApp(), candidates);
  const ref = documentedNames(docText.reference(), candidates);
  const allow = new Map(DOC_SYNC_EXCEPTIONS.map((x) => [x.name, x.only]));

  const onlyInApp = [...inApp].filter((n) => !ref.has(n) && allow.get(n) !== 'in-app').sort();
  const onlyRef = [...ref].filter((n) => !inApp.has(n) && allow.get(n) !== 'reference').sort();
  if (!onlyInApp.length && !onlyRef.length) return true;
  const parts = [];
  if (onlyInApp.length) parts.push(`only in lib/reshape-docs.ts: ${onlyInApp.join(', ')}`);
  if (onlyRef.length) parts.push(`only in reference.md: ${onlyRef.join(', ')}`);
  return `${parts.join(' | ')} — document it in both, or add a reviewed entry to DOC_SYNC_EXCEPTIONS`;
});

check('the sync check is actually looking at both files', () => {
  const candidates = dslVocabulary();
  if (candidates.length < 20) return `only ${candidates.length} names read from lib/reshape-script.ts — the vocabulary scan has broken`;
  const inApp = documentedNames(docText.inApp(), candidates).size;
  const ref = documentedNames(docText.reference(), candidates).size;
  return inApp >= 20 && ref >= 20 ? true : `in-app ${inApp}, reference ${ref} — a doc scan has broken`;
});

// ===========================================================================
// REACH  (the wire, not the runtime)
// ===========================================================================

at('reach');

// Resolve a relative import the way the bundler does, so a moved file breaks
// the walk instead of leaving a stale hard-coded path in this gate.
function resolveImport(fromFile, localName) {
  const src = readFileSync(join(REPO, fromFile), 'utf8');
  const m = new RegExp(`import\\s+${localName}\\s+from\\s+['"]([^'"]+)['"]`).exec(src);
  if (!m) throw new Error(`${fromFile} does not import ${localName}`);
  const spec = m[1];
  if (!spec.startsWith('.')) throw new Error(`${fromFile} imports ${localName} from a package, not a repo file`);
  const base = join(REPO, fromFile, '..', spec);
  for (const cand of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) {
    if (existsSync(cand)) return relative(REPO, cand).split('\\').join('/');
  }
  throw new Error(`${fromFile} imports ${localName} from '${spec}', which resolves to nothing on disk`);
}

function assertHop(hop, file) {
  const abs = join(REPO, file);
  if (!existsSync(abs)) return `missing ${file}`;
  const src = readFileSync(abs, 'utf8');
  for (const r of hop.requires || []) {
    if (!r.pattern.test(src)) return `${file}: ${r.what} — not found`;
  }
  for (const f of hop.forbids || []) {
    if (f.pattern.test(src)) return `${file}: ${f.what} — present, and it breaks the chain`;
  }
  if (hop.asset && !existsSync(join(REPO, hop.asset))) return `${file} points at ${hop.asset}, which does not exist`;
  return true;
}

// The walk. Each hop is asserted where the previous hop's import says it lives.
{
  let file = REACH_CHAIN[0].file;
  for (let i = 0; i < REACH_CHAIN.length; i++) {
    const hop = REACH_CHAIN[i];
    const here = file;
    check(`${i + 1}. ${hop.role}`, () => {
      if (hop.file && hop.file !== here) {
        return `chain expected ${hop.file}, but the previous hop's import resolved to ${here}`;
      }
      return assertHop(hop, here);
    });
    if (hop.nextRoute) {
      // Next.js filesystem routing: /docs/reshape -> app/docs/reshape/…
      const src = readFileSync(join(REPO, here), 'utf8');
      const m = hop.nextRoute.hrefPattern.exec(src);
      const derived = m ? `app${m[1]}/${hop.nextRoute.page}` : null;
      check(`${i + 1}b. the nav href resolves to a real page`, () =>
        derived && existsSync(join(REPO, derived)) ? true : `${here} links somewhere with no page file (${derived})`);
      if (!derived || !existsSync(join(REPO, derived))) break;
      file = derived;
    } else if (hop.next) {
      try { file = resolveImport(here, hop.next); }
      catch (e) {
        check(`${i + 1}b. ${here} imports ${hop.next}`, () => e.message);
        break;
      }
    }
  }
}

// A default on `preview` is what killed this the first time. Nothing may
// render either docs component without saying which runtime it is for.
check('every DocsSandbox and DocsClient call site names its runtime', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
      if (!/\.tsx$/.test(e.name)) continue;
      const src = readFileSync(p, 'utf8');
      for (const tag of ['DocsSandbox', 'DocsClient']) {
        for (const use of src.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?/>`, 'g'))) {
          if (!/\bpreview=/.test(use[0])) offenders.push(`${relative(REPO, p).split('\\').join('/')} <${tag}>`);
        }
      }
    }
  };
  walk(join(REPO, 'app'));
  walk(join(REPO, 'components'));
  return offenders.length ? `no preview prop: ${offenders.join(', ')}` : true;
});

check('the moSHion docs still load the moSHion runner', () => assertHop(REACH_MOSHION, REACH_MOSHION.file));

check('a lesson with preview:"reshape" mounts ReshapeStudio, not the retired runner', () => assertHop(REACH_LESSON, REACH_LESSON.file));

// ===========================================================================
// SIMPLE  (reSHape — public/reshape/reshape.js, the layer Q3 actually teaches)
// ===========================================================================
//
// The six groups above all measure the REAL API. reSHape is a second, simplified
// vocabulary sitting on top of it, and the whole reason it is safe is three
// claims that were previously only prose:
//
//   ADDITIVE  none of its nine names exists before reshape.js runs, and no real
//             JSCAD name is a different value afterwards. The API group's
//             "same reference bare as namespaced" check is re-run downstream
//             of reshape.js here, so a reSHape name that shadowed a real one
//             would fail loudly instead of quietly.
//   REAL      every call returns byte-identical geometry to the real API call
//             it stands for — compared the same way the API group compares
//             bare and namespaced construction, only stricter, because a
//             polygon count alone would not notice a synthesised center.
//   OBJECTS   required values are positional and every named extra rides in an
//             optional trailing { }. box(40,20,10) has no punctuation in it;
//             box(40,20,10,{center:…}) is the first object literal a student
//             writes, and it arrives because the model needed it.
//
// turn() is the one name deliberately EXEMPT from the identity bar, because it
// rotates in place rather than about the world origin. It is asserted against
// the opposite expectation instead — including a counter-case that fails if it
// ever silently becomes a pure rename of transforms.rotate.
//
// Expectations live in scripts/reshape-simple-checks.mjs. A red check here is
// closed by fixing public/reshape/reshape.js, never by loosening one of them.

at('simple');

check('reshape.js is vendored in public/reshape and loaded by the runner', () => {
  if (!existsSync(SIMPLE_PATH)) return `missing ${relative(REPO, SIMPLE_PATH)}`;
  const html = runnerSource();
  const tag = html.indexOf('src="./reshape.js"');
  if (tag === -1) return 'runner.html does not load ./reshape.js';
  // Order is the whole contract: after the shim, so reSHape can see every real
  // name and refuse to overwrite one; before the ?code= injection, so a
  // student's own declaration still wins over a reSHape name.
  const shimEnds = html.indexOf('window.__jscadBareNamesLost = lost;');
  const codeInjection = html.indexOf("params.get('code')");
  if (!(shimEnds < tag)) return 'reshape.js is loaded before the shim has finished installing';
  if (!(tag < codeInjection)) return 'reshape.js is loaded after the student code is injected';
  return true;
});

// reSHape used to require that every one of its names was a NEW word. Ten of
// them are now the library's own words on purpose, so the rule splits: an owned
// name MUST already be there (it is the thing being replaced, and if it is
// absent the replacement is standing on nothing), and every other name must
// still be new.
// A DOC EXAMPLE MAY NOT NAME A VARIABLE AFTER A SHAPE FUNCTION.
//
// This became a real defect the moment reSHape took the library's own words.
// The docs were full of `const sphere = ball(10)` -- a perfectly good name for
// a ball -- and renaming the call to sphere() turned every one of them into
// `const sphere = sphere(10)`, which is a TDZ error, or worse a later
// `sphere is not a function` several lines from the declaration that caused it.
//
// The examples do get run, so a shadow that breaks is already caught. This
// exists for the message: "cuboid is not a function" on line 40 of an example
// does not point at the `const cuboid` on line 12, and the first pass at this
// rename lost real time to exactly that. It also catches a shadow that happens
// NOT to break yet, which is the one that breaks later.
check('no doc example names a variable after a shape function', () => {
  // The JSCAD reference owns the shim's names; the reSHape Script documents
  // own the script vocabulary (a `const holes = …` there is the same TDZ trap).
  const shimOwned = new Set([...OWNED_NAMES, ...RESHAPE_NAMES.map((n) => n.name)]);
  const dslOwned = new Set(dslVocabulary());
  const all = [
    ...legacyExamples().map((ex) => ({ ex, owned: shimOwned })),
    ...referenceExamples().map((ex) => ({ ex, owned: dslOwned })),
    ...inAppExamples().map((ex) => ({ ex, owned: dslOwned })),
  ];
  const bad = [];
  for (const { ex, owned } of all) {
    // Fresh regex per example: one shared /g regex carries lastIndex between
    // examples and can scan a later one from the wrong offset.
    const rx = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = rx.exec(ex.code)) !== null) {
      if (owned.has(m[1])) bad.push(`${ex.source}:${ex.line} declares \`${m[1]}\`, shadowing the function of that name`);
    }
  }
  return bad.length ? bad.join('; ') : true;
}, 'docs');

check('reSHape replaces names that exist and adds names that do not', () => {
  const { before } = createSimpleContext();
  const owned = new Set(OWNED_NAMES);
  const missing = OWNED_NAMES.filter((n) => !before.includes(n));
  if (missing.length) {
    return `${missing.join(', ')} is claimed as a replaced library name but was not there to replace`;
  }
  const already = RESHAPE_NAMES
    .filter((n) => !owned.has(n.name) && before.includes(n.name)).map((n) => n.name);
  return already.length
    ? `${already.join(', ')} already existed — a name reSHape does not own must be a NEW word`
    : true;
});

check('reshape.js adds exactly the reSHape names, its report global, and the host hook', () => {
  const { added } = createSimpleContext();
  // An owned name is a replacement, not an addition, so it is absent here by
  // definition — what this measures is that nothing ELSE crept in.
  const owned = new Set(OWNED_NAMES);
  const want = [...RESHAPE_NAMES.map((n) => n.name).filter((n) => !owned.has(n)),
    ...RESHAPE_REPORT_GLOBALS, ...RESHAPE_HOST_GLOBALS].sort();
  const got = [...added].sort();
  return same(got, want) ? true : `globals added: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`;
});

check('the reSHape surface is the expected size', () => {
  const { window: w } = createSimpleContext();
  const installed = RESHAPE_NAMES.filter((n) => typeof w[n.name] === 'function');
  if (installed.length !== RESHAPE_NAMES.length) {
    const missing = RESHAPE_NAMES.filter((n) => typeof w[n.name] !== 'function').map((n) => n.name);
    return `not installed as functions: ${missing.join(', ')}`;
  }
  return eq(installed.length, EXPECTED_RESHAPE_NAME_COUNT, 'reSHape names');
});

// The decisive additive-ness check, run on the far side of reshape.js. The API
// group asserts bare === namespaced with only the shim loaded; this asserts
// that loading reSHape on top changed none of those answers.
check('no real JSCAD name was overwritten by reSHape, except the ones named', () => {
  const { window: w, jscad } = createSimpleContext();
  const collisions = new Set(DOCUMENTED_COLLISIONS.map((c) => c.name));
  // The eight measure wrappers, plus the ten names reSHape now owns. This list
  // is a CEILING and it is not self-certifying: every owned name is separately
  // required to still reach the library through its { } form, by the check
  // below. Widen this set without that one passing and the guarantee is gone.
  const allowed = new Set([...MEASURE_WRAPPERS, ...OWNED_NAMES]);
  const bad = [];
  const wrapped = [];
  for (const mod of EXPECTED_MODULE_ORDER) {
    if (jscad[mod] !== undefined && w[mod] !== jscad[mod]) bad.push(mod);
    for (const k of Object.keys(jscad[mod] || {})) {
      if (collisions.has(k)) continue;
      if (w[k] === undefined || w[k] === jscad[mod][k]) continue;
      if (allowed.has(k)) { wrapped.push(k); continue; }
      bad.push(`${mod}.${k}`);
    }
  }
  if (bad.length) return `reSHape changed what these names resolve to: ${bad.join(', ')}`;
  // The exception list is a CEILING, not a target: a name that stopped being
  // wrapped is as much a defect as one that started, because the staleness it
  // exists to close would be back with nothing to say so.
  const expected = [...MEASURE_WRAPPERS, ...OWNED_NAMES].sort();
  return same(wrapped.sort(), expected)
    ? true
    : `the names replaced are ${JSON.stringify(wrapped.sort())}, `
      + `MEASURE_WRAPPERS + OWNED_NAMES says ${JSON.stringify(expected)}`;
});

// A wrapper may exist. It may not change an answer. For anything that is not a
// live handle these must be indistinguishable from the functions they replaced,
// or the exception above has quietly become a behaviour change.
check('each measure wrapper returns exactly what the library returns', () => {
  const { window: w, jscad } = createSimpleContext();
  const solid = jscad.primitives.cuboid({ size: [40, 20, 10] });
  const flat = jscad.primitives.rectangle({ size: [40, 20] });
  for (const m of MEASURE_WRAPPERS) {
    const orig = jscad.measurements[m];
    if (typeof orig !== 'function') continue;
    for (const [what, g] of [['a solid', solid], ['a flat shape', flat]]) {
      let mine; let theirs;
      try { mine = JSON.stringify(w[m](g)); } catch (e) { mine = `threw ${e.message}`; }
      try { theirs = JSON.stringify(orig(g)); } catch (e) { theirs = `threw ${e.message}`; }
      if (mine !== theirs) return `${m} on ${what}: wrapper gave ${mine}, the library gives ${theirs}`;
    }
  }
  return true;
});

// The /sandbox mode labelled reSHape must actually BE reSHape. It was not,
// once: the starter shipped `require('@jscad/modeling')` plus
// primitives.cuboid and booleans.subtract, so a student clicking the reSHape
// tab met not one reSHape name. Nothing gated it, which is how it drifted --
// so this asserts both halves: the vocabulary, and that the thing still runs.
// Since 2026-09-03 the starter is reSHape Script, and "runs" means the compiled
// runtime that script-runner.html loads turns it into a document with steps.
const SCRIPT_RUNTIME = join(REPO, 'public/reshape/kernel/reshape-script.js');
const scriptRuntime = existsSync(SCRIPT_RUNTIME) ? await import(pathToFileURL(SCRIPT_RUNTIME).href) : null;

check('the sandbox reSHape starter is written in reSHape Script', () => {
  const src = readFileSync(join(REPO, 'lib/sandbox-modes.ts'), 'utf8');
  const m = src.match(/const RESHAPE_STARTER = `([\s\S]*?)`;/);
  if (!m) return 'RESHAPE_STARTER is gone from lib/sandbox-modes.ts';
  const code = m[1];
  const leaked = ['require(', 'primitives.', 'booleans.', 'transforms.', 'extrusions.', 'cuboid(', 'main(', 'getParameterDefinitions']
    .filter((t) => code.includes(t));
  if (leaked.length) return `the starter still speaks JSCAD: ${leaked.join(', ')}`;
  const names = dslVocabulary().filter((n) => code.includes(`${n}(`));
  if (!names.length) return 'the starter calls no reSHape Script name at all';

  // And it runs, in the runtime a student actually has.
  if (!scriptRuntime) return `${relative(REPO, SCRIPT_RUNTIME)} is not built — run node scripts/build-brep-kernel.mjs`;
  const r = scriptRuntime.runScript(code);
  const errs = Array.isArray(r && r.errors) ? r.errors : [];
  if (errs.length) return `the starter does not run: ${String(errs[0].message || errs[0]).slice(0, 160)}`;
  const n = r && r.doc && Array.isArray(r.doc.features) ? r.doc.features.length : 0;
  return n >= 2 ? true : `the starter produced ${n} step(s); a starter shows at least a shape and one step on it`;
});

// extrude takes a path2, because extrudeLinear does. §8.1 turns a vectorText
// glyph into a solid letter that way, and a layer that refused it would put the
// two out of step for no reason a student could see.
check('extrude takes a path2, exactly as extrudeLinear does', () => {
  const { window: w, jscad } = createSimpleContext();
  const pts = w.vectorText({ height: 8, inputText: 'J' })[0].reverse();
  const path = jscad.geometries.path2.fromPoints({ closed: true }, pts);
  let mine;
  try { mine = w.extrudeLinear(3, path); } catch (e) { return `extrude refused a path2: ${e.message}`; }
  if (!jscad.geometries.geom3.isA(mine)) return 'extrude(3, path2) built nothing solid';
  return sameGeometry(mine, w.extrudeLinear({ height: 3 }, path));
});

// The refusal that used to refute itself. describe() answered 'a shape' for all
// three geometry kinds, so handing extrude a path2 produced 'that is not a
// shape, it is a shape.' -- in the layer whose whole claim is better messages.
check('a refusal never contradicts itself about what it was given', () => {
  const { window: w, jscad } = createSimpleContext();
  const cases = [
    ['a number', 42],
    ['a solid', jscad.primitives.sphere({ radius: 2 })],
    ['text', 'hello'],
  ];
  for (const [what, value] of cases) {
    try {
      w.extrudeLinear(3, value);
      return `extrude accepted ${what}`;
    } catch (e) {
      if (/is not a (flat shape|shape), it is a? ?shape\./.test(e.message)) {
        return `given ${what}, extrude says: "${e.message}" -- which refutes itself`;
      }
    }
  }
  return true;
});

// And the reason the wrappers exist at all, asserted the way the defect fails:
// measure, change a parameter, measure again, and the second answer must be the
// new shape's. Without the unwrap this returns the FIRST answer forever.
check('a measurement follows a live shape when it is changed', () => {
  const { window: w, jscad } = createSimpleContext();
  const b = w.sphere(5);
  const before = w.measureVolume(b);
  b.radius = 9;
  const after = w.measureVolume(b);
  const truth = jscad.measurements.measureVolume(jscad.primitives.sphere({ radius: 9 }));
  if (Math.abs(before - after) < 1e-9) {
    return `measureVolume still reports ${before.toFixed(2)} after radius went 5 -> 9. `
      + 'The WeakMap cache is keyed on the handle again — see MEASURE_WRAPPERS.';
  }
  return Math.abs(after - truth) < 1e-6
    ? true
    : `after the change measureVolume says ${after.toFixed(2)}, a real ball(9) is ${truth.toFixed(2)}`;
});

// A name reSHape does NOT own still may not collide with the library — that is
// the original rule, still live for turn, sit and anything added later.
check('a name reSHape does not own is not a real JSCAD name in disguise', () => {
  const { jscad } = loadModeling();
  const owned = new Set(OWNED_NAMES);
  const clashes = [];
  for (const n of RESHAPE_NAMES) {
    if (owned.has(n.name)) continue;
    if (jscad[n.name] !== undefined) clashes.push(`<module> ${n.name}`);
    for (const mod of EXPECTED_MODULE_ORDER) {
      if ((jscad[mod] || {})[n.name] !== undefined) clashes.push(`${mod}.${n.name}`);
    }
  }
  return clashes.length
    ? `reSHape name shadows the library: ${clashes.join(', ')} — a name reSHape does not own must be a NEW word`
    : true;
});

// THE CHECK THAT MAKES REPLACING A LIBRARY NAME SAFE, and the reason the two
// ceilings above are not blank cheques. reSHape owns ten of @jscad/modeling's
// own words. That is only a widening -- rather than a shadowing that silently
// breaks pasted code -- for exactly as long as the library's own calling
// convention still reaches the library and hands back the same geometry it
// always did. Measured against the untouched module, not against reSHape's
// idea of itself.
check('every name reSHape owns still reaches the library through its { } form', () => {
  const { window: w } = createSimpleContext();
  const { jscad } = loadModeling();
  const wrong = [];
  for (const { name, args } of OWNED_FORMS) {
    const real = args(jscad);
    const mine = w[name];
    if (typeof mine !== 'function') { wrong.push(`${name}: not installed`); continue; }
    const realFn = (jscad.primitives || {})[name] || (jscad.extrusions || {})[name];
    if (typeof realFn !== 'function') { wrong.push(`${name}: no library function to compare`); continue; }
    let ours; let theirs;
    try { ours = mine(...real); } catch (e) { wrong.push(`${name}: object form refused — ${e.message}`); continue; }
    try { theirs = realFn(...real); } catch (e) { wrong.push(`${name}: library itself refused — ${e.message}`); continue; }
    if (JSON.stringify(ours) !== JSON.stringify(theirs)) wrong.push(`${name}: object form returns different geometry`);
  }
  return wrong.length ? wrong.join('; ') : true;
});

check('reSHape does not move the shim tripwires', () => {
  const { window: w, jscad, skipped } = createSimpleContext();
  if (!same(skipped, DOCUMENTED_COLLISIONS.map((c) => c.name))) {
    return `__jscadBareNamesSkipped changed to ${JSON.stringify(skipped)}`;
  }
  let n = 0;
  for (const m of EXPECTED_MODULE_ORDER) {
    if (w[m] !== undefined) n++;
    for (const k of Object.keys(jscad[m] || {})) if (w[k] !== undefined) n++;
  }
  n -= DOCUMENTED_COLLISIONS.length;
  return eq(n, EXPECTED_BARE_NAME_COUNT, 'bare names after reshape.js');
});

check('a reSHape name that cannot be installed is reported, not swallowed', () => {
  const cap = captureConsole();
  const { window: w } = createSimpleContext({
    preSeed: { [SEEDED_COLLISION.name]: SEEDED_COLLISION.value },
    consoleImpl: cap.console,
  });
  const report = w.__reshapeNamesSkipped;
  if (!Array.isArray(report)) return 'reshape.js publishes no __reshapeNamesSkipped';
  if (!report.includes(SEEDED_COLLISION.name)) {
    return `expected '${SEEDED_COLLISION.name}' in the skipped list, got ${JSON.stringify(report)}`;
  }
  if (w[SEEDED_COLLISION.name] !== SEEDED_COLLISION.value) {
    return 'reSHape overwrote a name something else already owned';
  }
  const warned = cap.lines.filter((l) => l.type === 'warn' && /reSHape/.test(l.text));
  return warned.length ? true : 'nothing was written to the console about the skipped name';
});

check('nothing is skipped in a clean context', () => {
  const { window: w } = createSimpleContext();
  return same(w.__reshapeNamesSkipped, []) ? true : `skipped ${JSON.stringify(w.__reshapeNamesSkipped)}`;
});

check('reSHape invents no option key of its own', () => {
  const invented = [];
  for (const n of RESHAPE_NAMES) {
    for (const k of n.options) if (!RESHAPE_OPTION_KEYS.includes(k)) invented.push(`${n.name}.${k}`);
  }
  if (invented.length) return `option keys outside the sanctioned set: ${invented.join(', ')}`;
  // And the keys are really the ones the file offers, not just the ones this
  // gate hoped for: a key reSHape refuses is named in its own error message.
  const { window: w } = createSimpleContext();
  try {
    w.cuboid(10, 10, 10, { thickness: 2 });
    return 'box accepted an option it does not have';
  } catch (e) {
    return RESHAPE_OPTION_KEYS.every((k) => e.message.includes(k))
      ? true
      : `box's refusal does not list its real keys: ${e.message}`;
  }
});

// The identity bar. Same idea as API's "bare and namespaced calls build
// identical geometry", one step stricter: the whole serialised geometry, not
// just a polygon count, because a count would not notice a changed default.
for (const e of EQUIVALENTS) {
  check(`${e.label} builds exactly what the real API builds`, () => {
    const { window: w, jscad } = createSimpleContext();
    const mine = e.reshape(w);
    if (!isGeometry(mine)) return 'reSHape returned nothing the renderer could draw';
    const theirs = e.real(jscad);
    return sameGeometry(mine, theirs);
  });
}

// turn() is exempt from the bar above BY DESIGN, so it is pinned to the
// opposite expectation here. `orbits` is the counter-case: the day it equals
// `expect`, turn has become a pure rename and the silent wrong answer it was
// built to close is back.
for (const t of TURN_IN_PLACE) {
  check(`turn rotates in place — ${t.label}`, () => {
    const { window: w } = createSimpleContext();
    const turned = t.reshape(w);
    if (!isGeometry(turned)) return 'turn returned nothing the renderer could draw';
    const box = Array.isArray(turned)
      ? w.measureAggregateBoundingBox(turned)
      : w.measureBoundingBox(turned);
    if (!same(box, t.expect)) {
      return `turned to ${JSON.stringify(box)}, expected ${JSON.stringify(t.expect)}`;
    }
    const orbited = t.orbit(w);
    const orbitBox = Array.isArray(orbited)
      ? w.measureAggregateBoundingBox(orbited)
      : w.measureBoundingBox(orbited);
    if (!same(orbitBox, t.orbits)) {
      return `the real rotate now lands on ${JSON.stringify(orbitBox)} — the measurement this name is built on has moved`;
    }
    return same(box, orbitBox)
      ? 'turn and transforms.rotate now agree — turn has silently become a pure rename'
      : true;
  });
}

// turn's SECOND divergence from rotate, which for a while was neither
// documented nor tested: rotating about the shape's own middle COMMUTES with
// translate, and rotating about the world origin does not. So the "order
// matters" phenomenon — §9.2's composition topic — cannot be shown with turn at
// all. Both halves are pinned: turn must commute, and the real rotate must
// still not, because the whole argument rests on the second one being true.
for (const t of TURN_COMPOSITION) {
  check(`turn commutes with translate, rotate does not — ${t.label}`, () => {
    const { window: w, jscad } = createSimpleContext();

    const turnedThenMoved = w.translate(t.move, w.turn(t.degrees, t.build(w)));
    const movedThenTurned = w.turn(t.degrees, w.translate(t.move, t.build(w)));
    if (!sameModel(jscad, turnedThenMoved, movedThenTurned)) {
      return 'turn no longer commutes with translate — it has stopped rotating in place, '
        + 'and the banner in reshape.js plus the jscad-legacy.md section on it are now wrong';
    }

    const spunThenMoved = w.translate(t.move, w.rotate(t.radians, t.build(w)));
    const movedThenSpun = w.rotate(t.radians, w.translate(t.move, t.build(w)));
    if (sameModel(jscad, spunThenMoved, movedThenSpun)) {
      return 'transforms.rotate now commutes with translate too — the world-origin pivot '
        + 'this whole name is built on has changed under it';
    }
    return true;
  });
}

check('the loss turn causes is written down where a student will read it', () => {
  const md = readFileSync(GRADUATION.path, 'utf8');
  // The claim that used to stand here — "`turn` teaches why you build at the
  // origin and translate last" — is a claim turn makes UNOBSERVABLE, because
  // with turn the order makes no difference at all. It must not come back.
  // (\s+ spans the line wrap either way round, CRLF included.)
  if (/teaches why you build\s+at the origin/.test(md)) {
    return 'jscad-legacy.md still claims turn teaches the build-at-the-origin lesson — '
      + 'turn is the one name that makes that lesson impossible to observe';
  }
  return /cannot be shown with `turn`/i.test(md)
    ? true
    : 'jscad-legacy.md does not say that the order of transforms cannot be shown with turn';
});

at('svg');

// stl/3mf/obj all serialize polygons, so a geom2 — every §8.2 and §8.3 design —
// had no way out of the app at all. A8.2.1 asks for exactly that file.
for (const t of SVG_CASES) {
  check(`svg: ${t.label}`, () => {
    const { svg, window: w, jscad } = createSvgContext();
    const out = svg.serialize(jscad, t.build(w));
    if (out === null) return 'serialize returned null for a 2D design';
    const paths = (out.match(/<path /g) || []).length;
    const subpaths = (out.match(/M /g) || []).length;
    // paths = shapes, subpaths = loops. A hole is where they differ, and
    // fill-rule only resolves loops inside ONE element — see SVG_CASES.
    if (paths !== t.paths) return `${paths} <path> elements, expected ${t.paths}`;
    if (subpaths !== t.subpaths) {
      return `${subpaths} subpaths, expected ${t.subpaths} — a hole emitted as its own `
        + '<path> is drawn as a filled shape in the fill colour, not as a hole';
    }
    return true;
  });
}

check('svg: up is up — the y axis is flipped for SVG', () => {
  const { svg, window: w, jscad } = createSvgContext();
  const meanY = (g) => {
    const ys = [...svg.serialize(jscad, g).matchAll(/[ML] [-\d.]+ ([-\d.]+)/g)].map((m) => +m[1]);
    return ys.reduce((a, b) => a + b, 0) / ys.length;
  };
  const up = meanY(w.translate([0, 20], w.circle(3)));
  const down = meanY(w.translate([0, -20], w.circle(3)));
  // SVG y grows DOWN, so the disc JSCAD put at y=+20 must have the SMALLER y.
  // Without the flip these swap and the design is mirrored — which still looks
  // like a design, and is wrong in the way nobody notices until it is cut out.
  if (!(up < 0 && down > 0)) return `mirrored: y=+20 came out at ${up}, y=-20 at ${down}`;
  return up < down ? true : `mirrored: +20 -> ${up}, -20 -> ${down}`;
});

check('svg: a solid is refused rather than written empty', () => {
  const { svg, window: w, jscad } = createSvgContext();
  if (svg.serialize(jscad, w.sphere(5)) !== null) return 'a geom3 produced an SVG';
  const mixed = svg.serialize(jscad, [w.rectangle(10, 10), w.sphere(5)]);
  return /<path /.test(mixed) ? true : 'a mixed 2D/3D return dropped the 2D half';
});

check('svg: the viewBox is the design plus a margin', () => {
  const { svg, window: w, jscad } = createSvgContext();
  const g = w.rectangle(40, 20);
  const vb = /viewBox="([^"]+)"/.exec(svg.serialize(jscad, g))[1].split(/\s+/).map(Number);
  const bb = jscad.measurements.measureBoundingBox(g);
  const wantW = (bb[1][0] - bb[0][0]) + SVG_MARGIN * 2;
  const wantH = (bb[1][1] - bb[0][1]) + SVG_MARGIN * 2;
  return Math.abs(vb[2] - wantW) < 0.01 && Math.abs(vb[3] - wantH) < 0.01
    ? true
    : `viewBox is ${vb[2]} x ${vb[3]}, the design plus margin is ${wantW} x ${wantH}`;
});

check('svg: the runner offers the button and loads the file', () => {
  const html = readFileSync(join(REPO, 'public/reshape/runner.html'), 'utf8');
  if (!/<script src="\.\/svg\.js">/.test(html)) return 'runner.html does not load svg.js';
  if (!/data-format="svg"/.test(html)) return 'there is no Save SVG button';
  return /svg:\s*\{\s*name: 'design\.svg'/.test(html) ? true : 'svg is not in FORMATS';
});

// jscad-legacy.md cites another session's assertion instead of restating the
// world-origin fact. That citation is only worth more than a paragraph while
// the thing it points at still exists — so the rename breaks OUR build, which
// is where the maintenance burden belongs.
for (const b of BORROWED_ASSERTIONS) {
  check(`the borrowed assertion still exists: "${b.name}"`, () => {
    const md = readFileSync(GRADUATION.path, 'utf8');
    if (!md.includes(b.name)) {
      return `jscad-legacy.md no longer cites "${b.name}" in ${b.cited} — if the citation was `
        + 'removed on purpose, remove its BORROWED_ASSERTIONS entry too; a half-removed '
        + 'citation is the rot';
    }
    let src;
    try {
      src = readFileSync(join(REPO, b.file), 'utf8');
    } catch {
      return `${b.file} is gone, and jscad-legacy.md sends a student to it. `
        + `Owned by ${b.owner} — ask them where it went, then fix both.`;
    }
    return src.includes(b.name)
      ? true
      : `${b.file} no longer contains the assertion "${b.name}". It was renamed or deleted `
        + `by ${b.owner}. Find the new name, then update BORROWED_ASSERTIONS and the citation `
        + 'in jscad-legacy.md TOGETHER. Do not delete this check to go green — that is the '
        + 'citation rotting, which is what it exists to catch.';
  });
}

// Every refusal has to hand the student the real function. Measured before
// this existed: only the object-first errors did, so revolve(profile, {angle})
// — which §9.1's own worked example invites — was a dead end in the one
// chapter revolve exists for.
for (const r of REFUSALS_NAME_THE_REAL_CALL) {
  check(`refusal names the real call: ${r.what}`, () => {
    const { window: w } = createSimpleContext();
    let out;
    try {
      out = r.run(w);
    } catch (e) {
      if (!e.message.includes(r.names)) {
        return `the message never names ${r.names}, so there is nowhere to go: ${e.message}`;
      }
      if (r.spells && !r.spells.test(e.message)) {
        return `the message names ${r.names} but does not spell out the call: ${e.message}`;
      }
      return true;
    }
    return `accepted and ignored${r.why ? ` — ${r.why}` : ''}. Got ${isGeometry(out) ? 'geometry' : String(out)}`;
  });
}

// The positional-plus-options contract, on five of the nine names.
for (const c of POSITIONAL_CONTRACT) {
  check(`${c.name}: positional day one, one brace day two`, () => {
    const { window: w } = createSimpleContext();

    const plain = c.bare(w);
    if (!isGeometry(plain)) return `${c.name}(...) with no options returned nothing drawable`;
    if (!same(w.measureBoundingBox(plain), c.bareBox)) {
      return `bare call measured ${JSON.stringify(w.measureBoundingBox(plain))}, expected ${JSON.stringify(c.bareBox)}`;
    }

    const withOpts = c.withOptions(w);
    if (!isGeometry(withOpts)) return 'the options form returned nothing drawable';
    if (!same(w.measureBoundingBox(withOpts), c.optionBox)) {
      return `the option did not move the model: ${JSON.stringify(w.measureBoundingBox(withOpts))}`;
    }
    if (same(w.measureBoundingBox(withOpts), c.bareBox)) {
      return 'the trailing { } changed nothing — the option is being ignored';
    }

    // THE OBJECT FORM IS THE LIBRARY'S AND MUST REACH IT. This used to assert the
    // opposite -- that an object-shaped first argument was refused, to teach a
    // day-one/day-two contrast between the friendly name and the real one. There
    // is no second day now: reSHape owns this word, so the { } spelling a student
    // pastes off jscad.app has to go straight through. That it hands back exactly
    // what the real primitive hands back is proved once, for all ten names, by
    // 'every name reSHape owns still reaches the library through its { } form'.
    let viaObject;
    try {
      viaObject = c.objectFirst(w);
    } catch (e) {
      return `${c.name}({ … }) was refused — the library's own spelling must still work: ${e.message}`;
    }
    if (!isGeometry(viaObject)) return `${c.name}({ … }) returned nothing drawable`;

    try {
      c.short(w);
      return `${c.name} accepted a call with a missing argument`;
    } catch (e) {
      if (!c.shortSays.test(e.message)) return `the missing argument is not named: ${e.message}`;
    }

    try {
      c.badKey(w);
      return `${c.name} accepted an option it does not have`;
    } catch (e) {
      if (!c.badKeySays.test(e.message)) return `the refused key is not named: ${e.message}`;
    }
    return true;
  });
}

// The other half of the contract: the names with no trailing { } at all. The
// loop above needs a `withOptions` case, so it can only speak for names that
// have options. "No options" is a claim that rots in two directions — a { }
// silently accepted and dropped, or a refusal that stops naming the real call.
for (const c of NO_OPTIONS_CONTRACT) {
  check(`${c.name}: positional only, and the { } is refused by name`, () => {
    const { window: w } = createSimpleContext();

    const plain = c.bare(w);
    if (!isGeometry(plain)) return `${c.name}(...) returned nothing drawable`;
    if (!same(w.measureBoundingBox(plain), c.bareBox)) {
      return `bare call measured ${JSON.stringify(w.measureBoundingBox(plain))}, expected ${JSON.stringify(c.bareBox)}`;
    }

    try {
      c.trailing(w);
      return `${c.name} accepted a trailing { } — the library drops it silently (${c.why}), `
        + 'which is the exact defect this layer exists to close';
    } catch (e) {
      if (!c.trailingSays.test(e.message)) return `unhelpful refusal for the trailing { }: ${e.message}`;
    }

    let viaObject2;
    try {
      viaObject2 = c.objectFirst(w);
    } catch (e) {
      return `${c.name}({ … }) was refused — the library's own spelling must still work: ${e.message}`;
    }
    if (!isGeometry(viaObject2)) return `${c.name}({ … }) returned nothing drawable`;

    try {
      c.short(w);
      return `${c.name} accepted a call with a missing argument`;
    } catch (e) {
      if (!c.shortSays.test(e.message)) return `the missing argument is not named: ${e.message}`;
    }
    return true;
  });
}

// A guard that names somebody else's parameters is not a guard. requireNumbers
// builds its message out of the list it is handed, so `ring needs two numbers:
// ring(radius, height)` is a perfectly plausible-looking wrong answer. Every
// parameter the name declares in RESHAPE_NAMES has to appear in its own message.
for (const g of ARITY_GUARDS) {
  check(`the arity guard for ${g.name} names its own parameters`, () => {
    const spec = RESHAPE_NAMES.find((n) => n.name === g.name);
    if (!spec) return `${g.name} is not in RESHAPE_NAMES`;
    const { window: w } = createSimpleContext();
    let message;
    try {
      g.run(w);
      return `${g.name} accepted a call with a missing argument`;
    } catch (e) {
      message = e.message;
    }
    const want = spec.positional.filter((p) => !p.startsWith('...'));
    const absent = want.filter((p) => !message.includes(p));
    if (absent.length) {
      return `the message never names ${absent.join(', ')} — RESHAPE_NAMES says ${g.name} takes `
        + `${want.join(', ')}, and a guard that names the wrong parameters sends a student `
        + `to fix the wrong thing: ${message}`;
    }
    return message.includes(`${g.name}(`)
      ? true
      : `the message does not show the call shape ${g.name}(…): ${message}`;
  });
}

// The three names added because /sandbox was generating half an reSHape call and
// half a raw namespaced one in the same expression. EQUIVALENTS above compares
// the whole serialised geometry, which is stricter — but it reports "shape 1
// differs" and nothing else, and the thing a reader of a failure needs here is
// the SIZE. A ring 8 across instead of 36 is the defect the argument order was
// chosen to prevent.
for (const wb of WRAPS_BOX) {
  check(`${wb.label} measures what the real call measures`, () => {
    const { window: w, jscad } = createSimpleContext();
    const mine = wb.reshape(w);
    if (!isGeometry(mine)) return 'reSHape returned nothing the renderer could draw';
    const box = w.measureBoundingBox(mine);
    if (!same(box, wb.box)) {
      return `measured ${JSON.stringify(box)}, expected ${JSON.stringify(wb.box)}`;
    }
    const theirBox = w.measureBoundingBox(wb.real(jscad));
    return same(box, theirBox)
      ? true
      : `the real call it wraps measures ${JSON.stringify(theirBox)} instead`;
  });
}

// ring's whole justification is that JSCAD's labels mislead — and the honest
// version of that, which the first draft of this group overstated, is that ONE
// of ring's two words is true where torus's is a lie: `tubeRadius` is the tube,
// `innerRadius` claims to be the hole and is not. `ringRadius` carries the same
// outer-edge ambiguity `outerRadius` does. So the finished model is measured
// rather than described, and BOTH sides' misreadings are pinned as
// counter-cases, because the fact that they BUILD SILENTLY is the argument.
check('ring(14, 4) is 36 across and 8 thick, not 8 across', () => {
  const { window: w } = createSimpleContext();
  const dims = w.measureDimensions(RING_ARITHMETIC.build(w));
  if (!same(dims, RING_ARITHMETIC.dimensions)) {
    return `ring(14, 4) measures ${JSON.stringify(dims)}, expected `
      + `${JSON.stringify(RING_ARITHMETIC.dimensions)} — ringRadius maps to torus's `
      + 'outerRadius and tubeRadius to its innerRadius, and that order is the whole name';
  }
  if (dims[0] !== RING_ARITHMETIC.across || dims[2] !== RING_ARITHMETIC.thick) {
    return `across ${dims[0]} / thick ${dims[2]}`;
  }
  return true;
});

for (const m of RING_ARITHMETIC.misread) {
  check(`the torus misreading builds silently — ${m.what}`, () => {
    const { window: w } = createSimpleContext();
    let out;
    try {
      out = m.run(w);
    } catch (e) {
      return `it throws now (${e.message}) — the argument for ring rests on this building `
        + 'silently at the wrong size, so re-measure RING_ARITHMETIC rather than deleting it';
    }
    const dims = w.measureDimensions(out);
    return same(dims, m.dimensions)
      ? true
      : `the misreading now measures ${JSON.stringify(dims)}, not ${JSON.stringify(m.dimensions)}`;
  });
}

// AND RING'S OWN MISREADINGS, which the first version of this group did not
// measure at all. It measured torus's three failure modes exhaustively and
// ring's none, which made the case for ring look stronger than it is: reading
// `ringRadius` as the donut's outer edge is exactly as available as reading
// `outerRadius` that way, and it builds the byte-identical wrong model. The
// published table in jscad-legacy.md carries these two rows for the same reason.
for (const m of RING_ARITHMETIC.ownMisread) {
  check(`ring's OWN misreading builds silently too — ${m.what}`, () => {
    const { window: w } = createSimpleContext();
    let out;
    try {
      out = m.run(w);
    } catch (e) {
      return `it throws now (${e.message}). That would be good news, but jscad-legacy.md and `
        + "reshape.js's banner both publish this as a SILENT wrong answer — re-measure and "
        + 'rewrite all three together rather than deleting the row';
    }
    const dims = w.measureDimensions(out);
    if (!same(dims, m.dimensions)) {
      return `it now measures ${JSON.stringify(dims)}, not ${JSON.stringify(m.dimensions)} — `
        + 'the misread table in jscad-legacy.md prints this number';
    }
    if (m.sameAs) {
      const twin = w.measureDimensions(m.sameAs(w));
      return same(twin, dims)
        ? true
        : `it no longer matches the torus misreading it is published as identical to `
          + `(${JSON.stringify(twin)} vs ${JSON.stringify(dims)})`;
    }
    return true;
  });
}

check('only the full swap throws, and it names circles nobody typed', () => {
  const { window: w } = createSimpleContext();
  try {
    RING_ARITHMETIC.swapped(w);
    return 'torus({ outerRadius: 4, innerRadius: 14 }) builds now — every misreading is '
      + 'silent, so the one message a student could ever have got has gone';
  } catch (e) {
    if (!RING_ARITHMETIC.swappedSays.test(e.message)) {
      return `the library's message changed: ${e.message}`;
    }
  }
  try {
    RING_ARITHMETIC.reshapeSwapped(w);
    return 'ring(4, 14) builds — the backwards call has stopped being caught';
  } catch (e) {
    return RING_ARITHMETIC.reshapeSwappedSays.test(e.message)
      ? true
      : `ring does not rethrow it with the student's own numbers: ${e.message}`;
  }
});

// Why ring and poly ship no { } at all, measured rather than asserted. torus
// ACCEPTS center and segments and ignores both; offering either would be the
// defect the layer exists to close. `drops: false` is the other kind — a real
// key that really works, refused for a vocabulary reason, recorded here so the
// two reasons are never confused.
for (const d of SILENTLY_DROPPED) {
  check(`${d.real} ${d.drops ? 'silently drops' : 'really honours'} ${d.key}, so ${d.name} ${d.drops ? 'must not offer it' : 'hands it over'}`, () => {
    const { window: w } = createSimpleContext();
    const a = JSON.stringify(d.a(w));
    const b = JSON.stringify(d.b(w));
    if (d.drops) {
      return a === b
        ? true
        : `${d.real} honours ${d.key} now — ${d.name}'s refusal says it does not, so rewrite `
          + `the refusal rather than leave it saying something false (${d.why})`;
    }
    return a !== b
      ? true
      : `${d.real} ignores ${d.key} now, so ${d.name}'s refusal is handing over a key that `
        + `does nothing (${d.why})`;
  });
}

// Two refusals in reshape.js's banner were overturned this round. A refusal
// overturned QUIETLY leaves nobody able to audit the decision later, and the
// poly one has a live cost — it takes a target out of A8.2.2. So the banner has
// to keep saying it, and these are the sentences it must keep.
for (const s of REFUSALS_OVERTURNED.says) {
  check(`reshape.js's banner records ${s.what}`, () => {
    const src = readFileSync(REFUSALS_OVERTURNED.path, 'utf8').replace(/\r\n/g, '\n');
    return s.rx.test(src)
      ? true
      : 'the banner no longer says it — an overturned refusal that is simply deleted is a '
        + 'decision nobody can audit afterwards';
  });
}

check('the names that were overturned are not still listed as refused', () => {
  const src = readFileSync(REFUSALS_OVERTURNED.path, 'utf8').replace(/\r\n/g, '\n');
  const m = REFUSALS_OVERTURNED.refusalLine.exec(src);
  if (!m) return 'reshape.js no longer has a "Deliberately NOT here" list at all';
  const still = REFUSALS_OVERTURNED.notRefusedAnyMore.filter((n) => new RegExp(`\\b${n}\\b`).test(m[1]));
  return still.length
    ? `still on the not-here list after being added: ${still.join(', ')}`
    : true;
});

// ---------------------------------------------------------------------------
// A8.2.2, WHICH THE FIRST VERSION OF THIS GROUP GOT BACKWARDS.
//
// It asserted that ellipse and star were the surviving pool and that poly had
// taken the assignment's best target. Both are false, and both are false for
// one reason: reshape.js's banner quoted the assignment as "NOT covered in
// class" when curriculum-plan.md says "NOT covered in class THIS WEEK", and
// §8.2 — the assignment's own section — teaches ellipse, polygon and star with
// worked solutions. BOOK_CENSUS.calls is a flat per-name total with no chapter
// attribution, so the old check could not have asked the question that decides
// it and instead asked a different one confidently.
//
// The fix is the data model, not the numbers. The two sentences that decide
// everything are READ OUT OF curriculum-plan.md here and matched against the
// banner's quotation of them, so dropping two words from a quote is a red check
// rather than a plausible paragraph.

check(`${ASSIGNMENT_POOL.assignment} is quoted from the plan, word for word`, () => {
  if (!existsSync(ASSIGNMENT_POOL.planPath)) {
    return `no ${relative(REPO, ASSIGNMENT_POOL.planPath)} — this check reads the assignment `
      + 'out of the plan rather than trusting a copy of it';
  }
  const plan = readFileSync(ASSIGNMENT_POOL.planPath, 'utf8').replace(/\r\n/g, '\n');
  if (!plan.includes(ASSIGNMENT_POOL.wording)) {
    return `the plan no longer says "${ASSIGNMENT_POOL.wording}". Re-read A8.2.2 and redo the `
      + 'eligibility accounting in ASSIGNMENT_POOL and in reshape.js — every number below '
      + 'depends on which week counts as "covered in class"';
  }
  if (!plan.includes(ASSIGNMENT_POOL.objectiveLine)) {
    return `§8.2's learning objective is no longer "${ASSIGNMENT_POOL.objectiveLine}", so what `
      + 'the assignment\'s own week teaches has changed and the eligible pool moved with it';
  }
  const taught = ASSIGNMENT_POOL.objectiveLine.split(':')[1].split(',').map((s) => s.trim()).sort();
  if (!same(taught, [...ASSIGNMENT_POOL.taughtThisWeek].sort())) {
    return `the objective now names ${JSON.stringify(taught)}, the record says `
      + `${JSON.stringify(ASSIGNMENT_POOL.taughtThisWeek)}`;
  }
  // The banner is a wrapped // comment, so the quotation is compared with the
  // wrapping taken out — the words have to match, not the line breaks.
  const banner = readFileSync(SIMPLE_PATH, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\/\/\s*/g, ' ')
    .replace(/\s+/g, ' ');
  return banner.includes(ASSIGNMENT_POOL.wording)
    ? true
    : 'reshape.js quotes A8.2.2 in words that are not the plan\'s words. That is exactly how '
      + 'this went wrong the first time: "NOT covered in class" and "NOT covered in class this '
      + 'week" are different assignments, and only one of them is the one being set';
});

// spoiledByOurOwnDocs was recorded and then read by nothing — the one cost
// sentence in the banner with no check behind it, which is the state every
// other claim here exists to avoid. A recorded cost nobody asserts is a
// paragraph, and a paragraph is what drifts.
check(`${ASSIGNMENT_POOL.assignment}'s largest softener is still written down`, () => {
  if (!ASSIGNMENT_POOL.spoiledByOurOwnDocs) {
    return 'ASSIGNMENT_POOL.spoiledByOurOwnDocs is false. If shCode genuinely stopped '
      + 'publishing the option signatures of A8.2.2\'s eligible primitives, delete this check '
      + 'with it — but verify that first, because jscad-legacy.md and lib/reshape-docs.ts both '
      + 'carried them and /docs/reshape served them in-app.';
  }
  const banner = readFileSync(SIMPLE_PATH, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\/\/\s*/g, ' ')
    .replace(/\s+/g, ' ');
  return /satisfied by scrolling one bundled page/.test(banner)
    ? true
    : 'reshape.js no longer records that shCode\'s own docs are what soften A8.2.2 most — '
      + 'that "using only the JSCAD documentation" is satisfiable without leaving the app. '
      + 'It is the biggest cost to that assignment and none of the three new names caused it. '
      + 'Do not delete this check to go green: either restore the sentence, or set '
      + 'spoiledByOurOwnDocs to false because the docs really did stop publishing them.';
});

check(`${ASSIGNMENT_POOL.assignment} still has primitives left that its own week did not teach`, () => {
  const { jscad } = loadModeling();
  const claimed = new Set(Object.keys(REVERSE_LOOKUP.expect));
  const taught = new Set(ASSIGNMENT_POOL.taughtThisWeek);
  const prims = Object.keys(jscad.primitives).filter((k) => typeof jscad.primitives[k] === 'function');
  // ELIGIBLE is both conditions at once, which is the correction: a primitive
  // reSHape has no word for is useless as a target if §8.2 taught it anyway.
  const eligible = prims.filter((p) => !claimed.has(p) && !taught.has(p)).sort();
  if (!same(eligible, [...ASSIGNMENT_POOL.eligible].sort())) {
    return `the eligible pool is now ${JSON.stringify(eligible)}, the record says `
      + `${JSON.stringify(ASSIGNMENT_POOL.eligible)} — re-measure ASSIGNMENT_POOL and reshape.js's `
      + 'banner together, they are the same accounting';
  }
  const twoD = ASSIGNMENT_POOL.eligible2d.filter((p) => eligible.includes(p));
  if (twoD.length < ASSIGNMENT_POOL.minEligible2d) {
    return `only ${twoD.length} of the 2D targets are left (${twoD.join(', ') || 'none'}). §8.2 `
      + 'is a 2D week, so a 2D lab that asks for a primitive it did not teach has nothing left '
      + 'to ask for';
  }
  // Pinned because it went from one to zero this round: torus was the only
  // book-called primitive that was ever eligible, and ring took it.
  const bookUsed = eligible.filter((p) => p in BOOK_CENSUS.calls).sort();
  if (!same(bookUsed, [...ASSIGNMENT_POOL.bookUsedEligible].sort())) {
    return `${JSON.stringify(bookUsed)} of the eligible pool are names the chapters call, the `
      + `record says ${JSON.stringify(ASSIGNMENT_POOL.bookUsedEligible)}`;
  }
  // The two claims the corrected accounting rests on, checked rather than said.
  const wrongly = ASSIGNMENT_POOL.neverEligible.filter((p) => !taught.has(p));
  if (wrongly.length) {
    return `${wrongly.join(', ')} is recorded as having cost A8.2.2 nothing because its own week `
      + 'taught it, and the week does not teach it any more — that claim has to be re-argued';
  }
  const notTaken = ASSIGNMENT_POOL.taken.filter((p) => !claimed.has(p) || taught.has(p));
  return notTaken.length
    ? `${notTaken.join(', ')} is recorded as taken from the eligible pool, but it is not a name `
      + 'reSHape claims, or its own week teaches it — either way the cost is misstated'
    : true;
});

// The graduation-day cost of poly, which is the one it does not pay in shCode.
// It is the only reSHape name whose positional argument is a list, so it is the
// only one that teaches "hand the array over bare" — and polygon answers a bare
// array with a valid, EMPTY shape and no error at all.
check('polygon answers the bare list poly trains with a silently empty shape', () => {
  const { jscad } = loadModeling();
  const right = POLY_BARE_ARRAY.right(jscad);
  if (jscad.geometries.geom2.toSides(right).length < 3) {
    return 'polygon({ points: … }) is not building the shape either, so this comparison is '
      + 'measuring nothing';
  }
  let bare;
  try {
    bare = POLY_BARE_ARRAY.bare(jscad);
  } catch (e) {
    return `polygon([[…]]) throws now (${e.message}) — that would be GOOD NEWS, and it means `
      + "jscad-legacy.md's poly crossover table and reshape.js's banner are both saying something "
      + 'false. Rewrite them rather than deleting this check';
  }
  if (!isGeometry(bare)) return 'the bare call no longer returns geometry at all';
  const sides = jscad.geometries.geom2.toSides(bare).length;
  if (sides !== POLY_BARE_ARRAY.bareSides) {
    return `the bare call now has ${sides} sides, the record says ${POLY_BARE_ARRAY.bareSides}`;
  }
  const box = jscad.measurements.measureBoundingBox(bare);
  if (!same(box, POLY_BARE_ARRAY.bareBox)) {
    return `its bounding box is ${JSON.stringify(box)}, the record says `
      + `${JSON.stringify(POLY_BARE_ARRAY.bareBox)}`;
  }
  // And the reason "always wrap the list" is not the lesson: line really does
  // take its points bare, two rows away in the same catalogue.
  const line = POLY_BARE_ARRAY.alsoBare(jscad);
  return isGeometry(line)
    ? true
    : 'line() no longer takes a bare array, so jscad-legacy.md\'s "some of them do" is wrong and '
      + 'the honest rule really would be "always wrap it"';
});

// The guards, each of which exists because the library's own answer is a
// silent wrong result or a message a fourteen-year-old cannot act on.
for (const g of GUARDS) {
  check(`guard: ${g.what}`, () => {
    const { window: w } = createSimpleContext();
    let out;
    try {
      out = g.run(w);
    } catch (e) {
      return g.says.test(e.message) ? true : `wrong message (${g.why}): ${e.message}`;
    }
    return `no error at all — ${g.why}. Got ${isGeometry(out) ? 'geometry' : String(out)}`;
  });
}

// "Returns real geometry" has to mean this in practice, not just isGeometry():
// a reSHape result is a first-class citizen of the real API.
for (const i of INTEROP) {
  check(`the real API accepts a reSHape shape — ${i.label}`, () => {
    const { window: w } = createSimpleContext();
    const out = i.run(w);
    return isGeometry(out) ? true : 'the real call did not hand back drawable geometry';
  });
}

// ---------------------------------------------------------------------------
// The graduation table in jscad-legacy.md, executed rather than read.
//
// EQUIVALENTS above proves reshape.js matches the real API. It proves nothing
// about what the DOCS say the real API is — and that table is the only place a
// student is handed the real call to copy. The two drifted once already: the
// `sit` row was missing `grouped`, which is right for one shape and silently
// collapses an assembly onto the bed, in the two sections that are entirely
// about assemblies. The gate was green throughout.
//
// So both halves of every row are evaluated here, against the same bound
// `profile` / `shape` / `parts`, and compared as whole geometry.

const graduation = readGraduationTable();

check('the graduation table in jscad-legacy.md parses, and covers every reSHape name', () => {
  if (graduation.error) return graduation.error;
  const { rows } = graduation;
  if (!rows.length) return `no rows found under "${GRADUATION.heading}"`;
  const missing = GRADUATION.namesInTable.filter(
    (n) => !rows.some((r) => new RegExp(`^${n}\\s*\\(`).test(r.reshape))
  );
  if (missing.length) return `not in the graduation table: ${missing.join(', ')}`;
  const noReal = rows.filter((r) => !r.real && !(r.reshape in GRADUATION.prose));
  return noReal.length
    ? `no real call given for: ${noReal.map((r) => r.reshape).join(', ')} — a row with no right-hand call must be listed in GRADUATION.prose with a reason`
    : true;
});

check('every prose exemption names a row that is really in the table', () => {
  if (graduation.error) return graduation.error;
  const stale = Object.keys(GRADUATION.prose).filter(
    (k) => !graduation.rows.some((r) => r.reshape === k)
  );
  return stale.length
    ? `GRADUATION.prose excuses rows that no longer exist: ${stale.join(', ')} — a stale exemption would quietly excuse a new row`
    : true;
});

for (const row of graduation.rows || []) {
  if (row.reshape in GRADUATION.prose) continue;
  check(`graduation: ${row.reshape}  ->  ${row.real}`, () => {
    const g = createGraduationContext();
    let mine;
    let theirs;
    try {
      mine = g.evaluate(row.reshape);
    } catch (e) {
      return `jscad-legacy.md:${row.line} — the reSHape half does not run: ${e.message}`;
    }
    try {
      theirs = g.evaluate(row.real);
    } catch (e) {
      return `jscad-legacy.md:${row.line} — the real call a student would copy does not run: ${e.message}`;
    }
    if (!isGeometry(mine)) return `jscad-legacy.md:${row.line} — the reSHape half built nothing drawable`;
    if (!isGeometry(theirs)) return `jscad-legacy.md:${row.line} — the real half built nothing drawable`;
    const verdict = sameGeometry(mine, theirs);
    return verdict === true
      ? true
      : `jscad-legacy.md:${row.line} — a student copying this row gets a different model: ${verdict}`;
  });
}

for (const t of GRADUATION_TRIPWIRES) {
  check(`graduation tripwire: ${t.what}`, () => {
    if (graduation.error) return graduation.error;
    const row = (graduation.rows || []).find((r) => r.reshape === t.row);
    if (!row) return `the row this guards is gone: ${t.row}`;
    const g = createGraduationContext();
    const mine = g.evaluate(row.reshape);
    let other;
    try {
      other = g.evaluate(t.without);
    } catch (e) {
      return t.throws
        ? true
        : `the counter-case no longer runs at all (${t.why}): ${e.message}`;
    }
    if (t.throws) return `${t.without} no longer fails — ${t.why}`;
    return sameGeometry(mine, other) === true
      ? `${t.without} now builds the same model — the row is decoration (${t.why})`
      : true;
  });
}

// ---------------------------------------------------------------------------
// The reverse of the graduation table.
//
// The graduation table answers "I wrote box — what is that really?". The seven
// written Q3 chapters ask the opposite: they are in the real API, so a student
// READS cuboid and has to write box. Measured on the chapter sources, roughly
// half the calls in the assigned reading are in a spelling reSHape replaces, and
// three of the mappings — extrudeRotate -> revolve, align -> sit, rotate ->
// turn — cannot be guessed backwards at all. jscad-legacy.md carries both
// directions; this is the check that it keeps carrying the second one.

const reverse = readReverseTable();

check('jscad-legacy.md maps every real name reSHape replaces back to its reSHape word', () => {
  if (reverse.error) return reverse.error;
  const rows = new Map(reverse.rows.map((r) => [r.real, r]));
  const problems = [];
  for (const [real, reshape] of Object.entries(REVERSE_LOOKUP.expect)) {
    const row = rows.get(real);
    if (!row) {
      problems.push(`${real} has no row — a student reading the book cannot get from it to ${reshape}`);
      continue;
    }
    if (!new RegExp(`\\b${reshape}\\b`).test(row.says)) {
      problems.push(`jscad-legacy.md:${row.line} — ${real} does not point at ${reshape}: ${row.says}`);
    }
  }
  return problems.length ? problems.join('; ') : true;
});

check('the reverse table points only at names reSHape really has', () => {
  if (reverse.error) return reverse.error;
  const known = new Set(RESHAPE_NAMES.map((n) => n.name));
  const bad = reverse.rows.filter((r) => {
    const named = (r.says.match(/`([A-Za-z_$][\w$]*)/g) || []).map((m) => m.slice(1));
    return named.length > 0 && !named.some((n) => known.has(n));
  });
  return bad.length
    ? `rows naming no reSHape word: ${bad.map((r) => `jscad-legacy.md:${r.line} ${r.real}`).join(', ')}`
    : true;
});

check('every real name in the reverse table is one reSHape actually stands in for', () => {
  const want = new Set(RESHAPE_NAMES.map((n) => n.real));
  const missing = [...want].filter((r) => !(r in REVERSE_LOOKUP.expect));
  return missing.length
    ? `reSHape stands in for ${missing.join(', ')} but the reverse table is not asked about them`
    : true;
});

// The shcode-only examples were asserted to FAIL portably and never asserted to
// WORK anywhere — so the turn example, the one a student is most likely to copy
// out of the hardest section, was never executed at all. Run them where they
// are meant to run.
for (const e of examples.filter((x) => x.source.endsWith('jscad-legacy.md') && x.tags.includes('shcode-only'))) {
  check(`the reSHape example at ${e.source}:${e.line} actually runs`, () => {
    const cap = captureConsole();
    const { ctx } = createSimpleContext({ consoleImpl: cap.console });
    const r = runProgram(ctx, e.code, `${e.source}:${e.line}`, { lineOffset: e.line - 1 });
    if (!r.ok) return `${r.phase}: ${r.error.message}`;
    if (!r.main) return 'no main() to call';
    const errs = cap.lines.filter((l) => l.type === 'error');
    if (errs.length) return `console.error: ${errs[0].text.slice(0, 120)}`;
    return isGeometry(r.geometry)
      ? true
      : 'main() ran but returned nothing the renderer could draw';
  });
}

check('jscad-legacy.md documents every reSHape name in a shcode-only fence', () => {
  const fenced = examples
    .filter((e) => e.source.endsWith('jscad-legacy.md') && e.tags.includes('shcode-only'))
    .map((e) => e.code)
    .join('\n');
  const missing = RESHAPE_NAMES.filter((n) => !new RegExp(`\\b${n.name}\\s*\\(`).test(fenced));
  return missing.length
    ? `not shown in jscad-legacy.md: ${missing.map((n) => n.name).join(', ')} — every reSHape example needs the shcode-only tag or the portability check fails it`
    : true;
});


// ---------------------------------------------------------------------------
// THE BRIDGE — is every call in the assigned reading answerable from shCode?
//
// REVERSE_LOOKUP above asks the narrow question: does every name reSHape stands
// in for have a row? A student reading the book asks the wide one: does every
// name I can TYPE have a row? Measured before these checks existed, eight did
// not — `cube` at 12 calls among them, in the opening runnable block of the
// whole unit — and none of the eight was in the closing "everything else"
// sentence either. Silence on a table that otherwise answers everything reads
// as "nothing to worry about".
//
// The census is data (BOOK_CENSUS) rather than a live read of the textbook,
// deliberately: the seven chapters live in another repository and `npm test`
// must not need it checked out. Its method is recorded beside it.

check('every name in the book census is really a @jscad/modeling export', () => {
  const { jscad } = loadModeling();
  const names = apiNames(jscad);
  const bad = Object.keys(BOOK_CENSUS.calls).filter((n) => !names.has(n));
  for (const [label, path] of Object.entries(BOOK_CENSUS.dottedCalls)) {
    let v = jscad;
    for (const step of path.slice(0, -1)) v = v && v[step];
    if (typeof v !== 'function') bad.push(label);
  }
  return bad.length
    ? `the census claims the book calls these and the library does not export them: ${bad.join(', ')}`
    : true;
});

check('the book census adds up to the total it reports', () => {
  const bare = Object.values(BOOK_CENSUS.calls).reduce((a, b) => a + b, 0);
  const dotted = Object.values(BOOK_CENSUS.dottedCalls).reduce((a, p) => a + p[p.length - 1], 0);
  const chapters = Object.values(BOOK_CENSUS.perChapter).reduce((a, b) => a + b, 0);
  if (chapters !== bare) return `per-chapter counts sum to ${chapters}, the name counts to ${bare}`;
  return eq(bare + dotted, BOOK_CENSUS.totalCalls, 'total calls in the seven chapters');
});

const bridgeWord = readBridgeTable(BRIDGE.reshapeWordHeading);
const bridgeNoWord = readBridgeTable(BRIDGE.noWordHeading);

check('jscad-legacy.md carries both halves of the bridge', () => {
  if (bridgeWord.error) return bridgeWord.error;
  if (bridgeNoWord.error) return bridgeNoWord.error;
  if (!bridgeWord.rows.length) return `no rows under "${BRIDGE.reshapeWordHeading}"`;
  if (!bridgeNoWord.rows.length) return `no rows under "${BRIDGE.noWordHeading}"`;
  return true;
});

check('every call the seven chapters make has a row in jscad-legacy.md', () => {
  if (bridgeWord.error || bridgeNoWord.error) return bridgeWord.error || bridgeNoWord.error;
  const word = new Set(bridgeWord.rows.map((r) => r.left));
  const noWord = new Set(bridgeNoWord.rows.map((r) => r.left));
  const census = [...Object.keys(BOOK_CENSUS.calls), ...Object.keys(BOOK_CENSUS.dottedCalls)];
  const missing = census.filter((n) => !word.has(n) && !noWord.has(n));
  return missing.length
    ? `no row anywhere for: ${missing.join(', ')} — a student reading the book can type these `
      + 'and shCode says nothing about them, which reads as "nothing to worry about"'
    : true;
});

check('no name is answered twice, in two different directions', () => {
  if (bridgeWord.error || bridgeNoWord.error) return bridgeWord.error || bridgeNoWord.error;
  const noWord = new Set(bridgeNoWord.rows.map((r) => r.left));
  const both = bridgeWord.rows.map((r) => r.left).filter((n) => noWord.has(n));
  return both.length
    ? `on both bridge tables, so one of them is lying: ${both.join(', ')}`
    : true;
});

check('the "no reSHape word" table names only real library functions', () => {
  if (bridgeNoWord.error) return bridgeNoWord.error;
  const { jscad } = loadModeling();
  const names = apiNames(jscad);
  const bad = [];
  for (const row of bridgeNoWord.rows) {
    if (names.has(row.left)) continue;
    const path = BOOK_CENSUS.dottedCalls[row.left];
    let v = jscad;
    if (path) for (const step of path.slice(0, -1)) v = v && v[step];
    if (!path || typeof v !== 'function') bad.push(`jscad-legacy.md:${row.line} ${row.left}`);
  }
  return bad.length ? `rows for things the library does not export: ${bad.join(', ')}` : true;
});

check('nothing on the "no reSHape word" table actually has one', () => {
  if (bridgeNoWord.error) return bridgeNoWord.error;
  const has = bridgeNoWord.rows.filter((r) => r.left in REVERSE_LOOKUP.expect);
  return has.length
    ? `told to "type what the book typed" for names reSHape does replace: ${has.map((r) => r.left).join(', ')}`
    : true;
});

check('the size of the bridge in jscad-legacy.md is the measured size', () => {
  if (bridgeWord.error) return bridgeWord.error;
  const word = new Set(bridgeWord.rows.map((r) => r.left));
  const replaced = Object.entries(BOOK_CENSUS.calls)
    .filter(([n]) => word.has(n))
    .reduce((a, [, c]) => a + c, 0);
  if (replaced !== BOOK_CENSUS.replacedCalls) {
    return `the reSHape-word table now covers ${replaced} of the book's calls, but the census `
      + `records ${BOOK_CENSUS.replacedCalls} — move the row back, or re-measure and update both`;
  }
  const md = readFileSync(BRIDGE.path, 'utf8');
  if (!new RegExp(`\\*\\*${BOOK_CENSUS.totalCalls} library calls\\*\\*`).test(md)) {
    return `jscad-legacy.md does not print the measured total (${BOOK_CENSUS.totalCalls})`;
  }
  return new RegExp(`\\*\\*${replaced} of them`).test(md)
    ? true
    : `jscad-legacy.md does not print the measured ${replaced} calls reSHape replaces`;
});

// The rows that are not renames. Each of these is a real call and a reSHape word
// that do DIFFERENT things, silently — the model comes out wrong and nothing
// throws. A row that does not say so is worse than a missing row, because the
// table reads as authoritative.
for (const wrn of BRIDGE_WARNINGS) {
  check(`the ${wrn.real} row warns that its reSHape word is not a rename`, () => {
    if (bridgeWord.error) return bridgeWord.error;
    const row = bridgeWord.rows.find((r) => r.left === wrn.real);
    if (!row) return `${wrn.real} has no row at all`;
    const silent = wrn.says.filter((rx) => !rx.test(row.right));
    return silent.length
      ? `jscad-legacy.md:${row.line} — the row says nothing about ${silent.join(' / ')}. ${wrn.why}`
      : true;
  });
}

// The align row, measured. It was true about a call the book never makes.
check('sit is not the align the seven chapters print', () => {
  const { window: w } = createSimpleContext();
  const shape = SIT_VS_BOOK_ALIGN.build(w);

  const seated = w.measureBoundingBox(w.sit(shape));
  if (!same(seated, SIT_VS_BOOK_ALIGN.sitBox)) {
    return `sit now lands on ${JSON.stringify(seated)}, not ${JSON.stringify(SIT_VS_BOOK_ALIGN.sitBox)}`;
  }
  for (const m of SIT_VS_BOOK_ALIGN.bookModes) {
    const aligned = w.measureBoundingBox(w.align({ modes: m.modes }, shape));
    if (same(aligned, seated)) {
      return `align({ modes: ${JSON.stringify(m.modes)} }) and sit now agree — the warning on `
        + 'the align row has become decoration, and the row can go back to being a plain rename';
    }
  }
  const first = w.measureBoundingBox(
    w.align({ modes: SIT_VS_BOOK_ALIGN.bookModes[0].modes }, shape)
  );
  return same(first, SIT_VS_BOOK_ALIGN.bookBox)
    ? true
    : `the book's own modes now land on ${JSON.stringify(first)}, not `
      + `${JSON.stringify(SIT_VS_BOOK_ALIGN.bookBox)} — re-measure SIT_VS_BOOK_ALIGN`;
});

// TAU: a value the book types eleven times and never defines, which is not a
// name this runner installs. The fix is documentation plus a refusal that
// spells something runnable, because runner.html owns the scope and reSHape adds
// no tenth name.
for (const id of BOOK_IDENTIFIERS) {
  check(`${id.name} is not in scope here, and jscad-legacy.md says what to type instead`, () => {
    const { ctx } = createSimpleContext();
    const inScope = vm.runInContext(`typeof ${id.name} !== 'undefined'`, ctx);
    if (inScope !== id.inScope) {
      return inScope
        ? `${id.name} IS in scope now — runner.html changed, so delete this check and the `
          + 'jscad-legacy.md section it guards rather than leaving them saying something false'
        : `${id.name} is no longer measurable`;
    }
    for (const spelling of [id.write, id.portable, id.alsoWrite]) {
      let v;
      try {
        v = vm.runInContext(`(${spelling})`, ctx);
      } catch (e) {
        return `jscad-legacy.md tells a student to write ${spelling}, and it throws: ${e.message}`;
      }
      if (v !== id.value) return `${spelling} is ${v}, not ${id.value}`;
    }
    const md = readFileSync(BRIDGE.path, 'utf8');
    if (!md.includes(BRIDGE.tauHeading)) return `jscad-legacy.md has no "${BRIDGE.tauHeading}" section`;
    const missing = [id.write, id.portable, id.alsoWrite].filter((s) => !md.includes(s));
    return missing.length
      ? `jscad-legacy.md never gives the working spelling: ${missing.join(', ')}`
      : true;
  });
}

// A refusal that hands over a call the student cannot run is not an escape
// hatch. Both of these were written with the book's bare TAU and threw.
for (const r of REFUSAL_CALLS) {
  check(`${r.what} is spelled out, and runs`, () => {
    const { window: w } = createSimpleContext();
    let message;
    try {
      r.trigger(w);
      return `no refusal at all — ${r.why}`;
    } catch (e) {
      message = e.message;
    }
    if (!message.includes(r.call)) {
      return `the message does not spell the call out (${r.why}): ${message}`;
    }
    let out;
    try {
      out = evaluateInShcad(r.bindings, r.call).value;
    } catch (e) {
      return `the call the refusal hands over does not run in this runner: ${e.message}`;
    }
    return isGeometry(out)
      ? true
      : 'the call the refusal hands over runs but builds nothing drawable';
  });
}

// A name is only translated if the KEYS beside it do something. Every option
// key the seven chapters print is built twice with two different values and the
// results compared, because JSCAD ignores an unknown option without a word.
// Thirteen of the fourteen pairs are fine. The fourteenth is §8.1's glyph
// exercise, which prints `inputText` — not an option — so "swap 'J' for 'H' and
// run again" changes nothing and reports nothing.
for (const k of BOOK_OPTION_KEYS) {
  check(`the book's option keys really do something: ${k.what}`, () => {
    const { window: w } = createSimpleContext();
    const a = JSON.stringify(k.a(w));
    const b = JSON.stringify(k.b(w));
    if (k.changes) {
      return a !== b
        ? true
        : `two different values for this key build the identical model — the library is `
          + 'ignoring it, silently, and the row that names it is not a translation';
    }
    if (a !== b) {
      return `this key WORKS now, so the warning jscad-legacy.md carries about it is out of date `
        + `— delete the warning rather than leave it saying something false (${k.why})`;
    }
    if (!k.row) return true;
    const row = (bridgeNoWord.rows || []).find((r) => r.left === k.row);
    if (!row) return `${k.row} has no row to carry the warning`;
    const silent = k.says.filter((rx) => !rx.test(row.right));
    return silent.length
      ? `jscad-legacy.md:${row.line} — the ${k.row} row says nothing about ${silent.join(' / ')}. `
        + `A student copying the book's spelling gets no letter and no error (${k.why})`
      : true;
  });
}

// ---------------------------------------------------------------------------
// OBJECT DEPTH — the layer's justification, measured rather than asserted.
//
// reSHape's defence is that it postpones the object literal rather than hiding
// it. Measured before this existed, the section making that argument held
// exactly ONE live object literal, because every other brace on the page was
// inside a // comment showing the real API — while 197 of the book's own calls
// lead with one.

const reshape = reshapeSection();
const reshapeFences = reshape.error
  ? []
  : [...reshape.body.matchAll(/^```js([^\n]*)\n([\s\S]*?)^```/gm)].map((m) => ({
    tags: (m[1] || '').trim().split(/\s+/).filter(Boolean),
    code: m[2],
  }));

check('every example in the reSHape section is tagged shcode-only', () => {
  if (reshape.error) return reshape.error;
  if (!reshapeFences.length) return 'no examples in the reSHape section at all';
  const untagged = reshapeFences.filter((f) => !f.tags.includes('shcode-only'));
  return untagged.length
    ? `${untagged.length} example(s) in the reSHape section are not tagged shcode-only — they are `
      + 'run in the require-only sandbox, where every reSHape name is undefined'
    : true;
});

check('the reSHape section writes option objects rather than describing them', () => {
  if (reshape.error) return reshape.error;
  const objects = reshapeFences.flatMap((f) => liveObjectLiterals(f.code));
  if (objects.length < OBJECT_DEPTH.minLiveObjects) {
    return `only ${objects.length} live option object(s) in the whole section, expected at least `
      + `${OBJECT_DEPTH.minLiveObjects} — a brace inside a // comment is not an example of `
      + 'writing one';
  }
  const single = objects.filter((k) => k.length === 1).length;
  const multi = objects.filter((k) => k.length >= 2).length;
  const widest = objects.reduce((a, k) => Math.max(a, k.length), 0);
  if (single < OBJECT_DEPTH.minSingleKey) {
    return `only ${single} one-key object(s) — the day-two call is the whole point of the layer`;
  }
  if (multi < OBJECT_DEPTH.minMultiKey) {
    return `only ${multi} object(s) carry two or more keys, expected ${OBJECT_DEPTH.minMultiKey} — `
      + 'without them there is no progression, just a brace';
  }
  return widest >= OBJECT_DEPTH.minKeysInOneObject
    ? true
    : `the widest object in the section has ${widest} key(s), expected ${OBJECT_DEPTH.minKeysInOneObject}`;
});

check('every reSHape option key is worked in a runnable example, not just tabled', () => {
  if (reshape.error) return reshape.error;
  const keys = new Set(reshapeFences.flatMap((f) => liveObjectLiterals(f.code)).flat());
  const missing = OBJECT_DEPTH.keys.filter((k) => !keys.has(k));
  return missing.length
    ? `reSHape ships these keys and no runnable example writes them: ${missing.join(', ')}`
    : true;
});

check('the parameter panel example is a real array of objects, and its defaults reach main()', () => {
  const { marker, minDefinitions, everyDefinition, someDefinition, modelBox } = OBJECT_DEPTH.parameters;
  const fence = reshapeFences.find((f) => new RegExp(`function\\s+${marker}`).test(f.code));
  if (!fence) return `no runnable ${marker} example in the reSHape section`;

  const cap = captureConsole();
  const ctx = createSimpleContext({ consoleImpl: cap.console });
  const r = runProgram(ctx.ctx, fence.code, 'jscad-legacy.md', { lineOffset: 0 });
  if (!r.ok) return `${r.phase}: ${r.error.message}`;

  let defs;
  try {
    defs = ctx.window[marker]();
  } catch (e) {
    return `${marker}() threw: ${e.message}`;
  }
  if (!Array.isArray(defs)) return `${marker}() returned ${typeof defs}, not an array`;
  if (defs.length < minDefinitions) {
    return `${defs.length} definition(s) — an array of objects needs to look like one`;
  }
  for (const d of defs) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return 'a definition is not an object';
    const missing = everyDefinition.filter((k) => d[k] === undefined);
    if (missing.length) return `the "${d.name}" definition is missing ${missing.join(', ')}`;
  }
  for (const shape of someDefinition) {
    if (!defs.some((d) => shape.every((k) => d[k] !== undefined))) {
      return `no definition carries ${shape.join(' / ')} — every control is the same object `
        + 'shape, so the example is not showing that they differ';
    }
  }
  // And the defaults have to actually arrive: main(params) is called with them
  // and nothing else, so a parameter that changes nothing is a broken example.
  if (!isGeometry(r.geometry)) return 'main(defaults) built nothing drawable';
  const box = ctx.window.measureBoundingBox(r.geometry);
  return same(box, modelBox)
    ? true
    : `main(defaults) measured ${JSON.stringify(box)}, expected ${JSON.stringify(modelBox)} — the `
      + 'declared defaults are not reaching the shape';
});

check('the parameter trap jscad-legacy.md names is really in runner.html', () => {
  const html = runnerSource();
  const fn = html.slice(html.indexOf('function initialOf('));
  const body = fn.slice(0, fn.indexOf('\n\t}'));
  const unread = PARAM_DEFAULTS.reads.filter((k) => !body.includes(`d.${k}`));
  if (unread.length) {
    return `runner.html's initialOf no longer reads ${unread.join(', ')} — jscad-legacy.md says it does`;
  }
  if (body.includes(`d.${PARAM_DEFAULTS.ignores}`)) {
    return `runner.html now reads d.${PARAM_DEFAULTS.ignores} too, so jscad-legacy.md's warning that `
      + 'a checkbox default never arrives is out of date — delete it rather than leave it wrong';
  }
  return PARAM_DEFAULTS.saysInReference.test(readFileSync(BRIDGE.path, 'utf8'))
    ? true
    : 'jscad-legacy.md does not warn that a checkbox default never reaches main() in this runner';
});

// ---------------------------------------------------------------------------
// THE PARAMETER PANEL — the half of the reading that is not a call.
//
// Every bridge check above answers a NAME. BOOK_CENSUS counts CALLS. §8.4 and
// §8.5 also print words that are neither: the `type:` values inside
// getParameterDefinitions, which are strings in an object literal. So the
// coverage claim was true and a student still stalled — a reSHape-only reader
// translated all 28 of §8.5's calls and then stopped on `type: 'float'`, which
// appeared nowhere shCode ships, while the in-app docs said "THREE of the types
// hand you a number" and thereby denied it existed.
//
// What these pin is the sentence rather than the table: TYPE PICKS THE CONTROL,
// INITIAL CARRIES THE VALUE. That is what makes a type nobody listed harmless,
// and the day runner.html starts branching on `type` it stops being true.

const paramBookTable = readFirstColumn(PARAM_TYPES.heading);
const paramRefTable = readFirstColumn(PARAM_TYPES.referenceHeading);

check('the parameter-type census adds up', () => {
  const sum = Object.values(PARAM_TYPES.spellings).reduce((a, s) => a + s.defs, 0);
  return sum === PARAM_TYPES.totalDefinitions
    ? true
    : `the spellings sum to ${sum} definitions, the census records `
      + `${PARAM_TYPES.totalDefinitions} — re-measure both together`;
});

// One per spelling, because a missing row is the failure being closed here and
// a single aggregate check reports it as one number rather than as the word.
for (const [type, m] of Object.entries(PARAM_TYPES.spellings)) {
  check(`the book's type: '${type}' has a row in the reSHape section`, () => {
    if (paramBookTable.error) return paramBookTable.error;
    const want = `type: '${type}'`;
    const row = paramBookTable.rows.find((r) => r.left === want);
    if (!row) {
      return `no row for ${want} — §${m.chapter} prints it ${m.defs} time(s) in a runnable `
        + 'editor, and a word missing from this table reads as "do not type this"';
    }
    if (!row.rest.includes(`§${m.chapter}`)) {
      return `jscad-legacy.md:${row.line} — the row does not say where the book prints it (§${m.chapter})`;
    }
    if (!row.rest.includes(want)) {
      return `jscad-legacy.md:${row.line} — the row names no spelling to type in shCode`;
    }
    // A row that cites the book's own parameters has to cite the RIGHT ones,
    // and ONLY those. Written from memory the first time, this row named a
    // `spacing` knob §8.5 has not got — and a fabricated example is worse than
    // no example, because it reads exactly like the true ones beside it and is
    // the half a student trusts hardest. So the citation is compared as a set:
    // a missing name and an invented one both fail.
    if (!m.names) return true;
    const marker = `§${m.chapter}'s`;
    const at = row.rest.indexOf(marker);
    if (at === -1) {
      return `jscad-legacy.md:${row.line} — the row does not point at the parameters §${m.chapter} `
        + `declares with this type (${m.names.join(', ')})`;
    }
    const cited = [...row.rest.slice(at).matchAll(/`([^`]+)`/g)].map((c) => c[1]);
    const invented = cited.filter((n) => !m.names.includes(n));
    const absent = m.names.filter((n) => !cited.includes(n));
    if (invented.length) {
      return `jscad-legacy.md:${row.line} — the row cites ${invented.join(', ')}, and §${m.chapter} `
        + `declares no such parameter. It declares ${m.names.join(', ')}`;
    }
    return absent.length
      ? `jscad-legacy.md:${row.line} — the row does not name §${m.chapter}'s ${absent.join(', ')}`
      : true;
  });
}

check("jscad-legacy.md's own type table lists every type either surface teaches", () => {
  if (paramRefTable.error) return paramRefTable.error;
  const have = new Set(paramRefTable.rows.map((r) => r.left));
  const missing = PARAM_TYPES.documented.filter((t) => !have.has(t));
  return missing.length
    ? `§Parameters has no row for: ${missing.join(', ')} — the in-app docs teach these and `
      + 'jscad-legacy.md is the file the reSHape section tells a student to keep open. Two doc '
      + 'surfaces disagreeing about the list is how int and float went missing'
    : true;
});

check('runner.html reads a definition initial and never its type', () => {
  const html = runnerSource();
  const fn = html.slice(html.indexOf('function initialOf('));
  const body = fn.slice(0, fn.indexOf('\n\t}'));
  if (body.includes(`d.${PARAM_DEFAULTS.neverReads}`)) {
    return `initialOf now reads d.${PARAM_DEFAULTS.neverReads}, so an unlisted type is no longer `
      + 'harmless — every "type what the book typed" row in jscad-legacy.md just became a guess. '
      + 'Fix the docs, not this check';
  }
  return PARAM_DEFAULTS.saysTypeIsIgnored.test(readFileSync(BRIDGE.path, 'utf8'))
    ? true
    : 'jscad-legacy.md does not say that type picks the control and initial carries the value — '
      + 'which is the one sentence that makes the type table safe to stop consulting';
});

// The same fact from the other end: declared, run, and read back out of main().
// A structural check on runner.html proves the field is unread; this proves the
// value arrives. The last entry is deliberately not a JSCAD type at all.
for (const a of PARAM_TYPES.arrives) {
  check(`type: '${a.type}' picks a control and leaves the value alone`, () => {
    const { ctx } = createSimpleContext();
    const literal = `{ name: 'v', type: ${JSON.stringify(a.type)}, initial: ${JSON.stringify(a.initial)} }`;
    const r = runProgram(ctx, paramProgram(literal), 'param-type');
    if (!r.ok) return `${r.phase}: ${r.error.message}`;
    const seen = vm.runInContext('__seen', ctx);
    if (!seen || !('v' in seen)) {
      return `main(params) was handed no v at all — a type this runner does not recognise is `
        + 'supposed to be a differently-shaped knob, never a value that fails to arrive';
    }
    if (seen.v !== a.initial) return `v arrived as ${JSON.stringify(seen.v)}, not ${JSON.stringify(a.initial)}`;
    return typeof seen.v === typeof a.initial
      ? true
      : `v arrived as a ${typeof seen.v}, not a ${typeof a.initial}`;
  });
}

// And the two documented exceptions, which are exceptions because they declare
// no `initial` — not because their type is special.
for (const d of PARAM_TYPES.declaresNothing) {
  check(`${d.what} reaches main() as nothing at all`, () => {
    const { ctx } = createSimpleContext();
    const r = runProgram(ctx, paramProgram(d.def), 'param-type');
    if (!r.ok) return `${r.phase}: ${r.error.message}`;
    const seen = vm.runInContext('__seen', ctx);
    const name = (d.def.match(/name:\s*'([^']+)'/) || [])[1];
    return seen && name in seen
      ? `${name} DOES arrive now (${JSON.stringify(seen[name])}), so jscad-legacy.md's warning about `
        + 'it is out of date — delete the warning rather than leave it saying something false'
      : true;
  });
}

// lib/reshape-docs.ts stopped teaching getParameterDefinitions on 2026-09-03:
// reSHape Script's param() takes a number and optional bounds, and there is no
// type word for a student to get wrong. So the "both surfaces" pair below is
// now one surface, jscad-legacy.md, plus a tripwire: the day a `type: '…'`
// declaration reappears in the in-app docs, the two-surface comparison has to
// come back with it.
check('the JSCAD reference names every numeric parameter type', () => {
  const text = readFileSync(PARAM_TYPES.path, 'utf8');
  const bad = PARAM_TYPES.numeric.filter((t) => !new RegExp(`type:\\s*'${t}'`).test(text));
  return bad.length
    ? `${bad.join(', ')} never written in jscad-legacy.md — a type missing from the list is `
      + 'exactly how int and float went missing, and a student reading it stalls'
    : true;
});

check('the in-app docs teach param(), not getParameterDefinitions types', () => {
  const ts = readFileSync(PARAM_TYPES.inApp, 'utf8');
  if (/type:\s*'(number|slider|int|float)'/.test(ts)) {
    return 'lib/reshape-docs.ts declares a parameter type again — restore the two-surface '
      + 'numeric-type comparison this check replaced (git log -S numericSentence scripts/test-reshape.mjs)';
  }
  return /\bparam\s*\(/.test(ts) ? true : 'lib/reshape-docs.ts never shows param() — the panel caption is untaught';
});

check('the reSHape section works the four numeric types in one runnable example', () => {
  if (reshape.error) return reshape.error;
  const { findBy, declares, everyValueIsA } = PARAM_TYPES.example;
  const fence = reshapeFences.find((f) => findBy.test(f.code));
  if (!fence) return `no runnable example in the reSHape section declares ${findBy} — the table `
    + 'says these are safe to type and nothing on the page types one';
  if (!fence.tags.includes('shcode-only')) return 'that example is not tagged shcode-only';
  const missing = declares.filter((t) => !new RegExp(`type:\\s*'${t}'`).test(fence.code));
  if (missing.length) return `the example does not declare ${missing.join(', ')}`;

  const cap = captureConsole();
  const ctx = createSimpleContext({ consoleImpl: cap.console });
  const r = runProgram(ctx.ctx, fence.code, 'jscad-legacy.md', { lineOffset: 0 });
  if (!r.ok) return `${r.phase}: ${r.error.message}`;
  if (!isGeometry(r.geometry)) return 'main(defaults) built nothing drawable';

  const defs = ctx.window.getParameterDefinitions();
  const wrong = defs
    .filter((d) => declares.includes(String(d.type)))
    .filter((d) => typeof d.initial !== everyValueIsA);
  return wrong.length
    ? `${wrong.map((d) => `${d.name} (${d.type})`).join(', ')} declared an initial that is not a `
      + `${everyValueIsA} — the point of the example is that all four are one kind of thing`
    : true;
});


// The generalised wall behind both hand-found stalls. A word the book prints
// inside an object literal is not a call, so BOOK_CENSUS does not count it and
// no bridge table covers it — which is how `type: 'float'` and then
// `twistAngle` each got through with the gate fully green. Swept, one check per
// word, because the failure being closed is a MISSING word and an aggregate
// reports it as a number instead of as the word.
for (const [key, takenBy] of Object.entries({
  ...BOOK_OPTION_WORDS.keys, ...BOOK_OPTION_WORDS.alsoFromGraduation,
  ...BOOK_OPTION_WORDS.alsoFromRefusals,
})) {
  check(`jscad-legacy.md writes the option key ${key}`, () => {
    const md = readFileSync(BOOK_OPTION_WORDS.path, 'utf8');
    return new RegExp('`[^`\\n]*\\b' + key + '\\b[^`\\n]*`').test(md)
      ? true
      : `${key} is never written in jscad-legacy.md, and the seven chapters type it (${takenBy}). `
        + 'The in-app docs are not a substitute: jscad-legacy.md is the file the reSHape section '
        + 'tells a student to keep open while reading, so a word only the other surface '
        + 'carries is a word that student cannot reach';
  });
}


// ===========================================================================
// report
// ===========================================================================

const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

const pass = results.filter((r) => r.pass).length;
const ok = pass === results.length && results.length > 0;

if (WANT_JSON) {
  process.stdout.write(JSON.stringify({
    results,
    summary: { pass, total: results.length, ok },
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

const GROUPS = ['bundle', 'shim', 'api', 'renderer', 'docs', 'sync', 'reach', 'simple'];
const TITLES = {
  bundle: 'BUNDLE   — the vendored libraries, and no CDN anywhere',
  shim: 'SHIM     — cut live out of runner.html',
  api: 'API      — bare name IS the library function',
  renderer: 'RENDERER — every symbol runner.html reaches',
  docs: 'DOCS     — every example runs on jscad.app',
  sync: 'SYNC     — in-app docs vs docs/reference.md',
  reach: 'REACH    — a student can actually load this runtime',
  simple: 'SIMPLE   — reSHape adds names, and only names',
};

for (const g of GROUPS) {
  const rows = results.filter((r) => r.group === g);
  if (!rows.length) continue;
  const fails = rows.filter((r) => !r.pass);
  console.log(`\n${C.b}${TITLES[g]}${C.x}`);
  if (!fails.length) console.log(`  ${C.g}all ${rows.length} pass${C.x}`);
  for (const f of fails) {
    console.log(`  ${C.r}FAIL${C.x} ${f.name}`);
    console.log(`       ${C.d}${f.reason}${C.x}`);
  }
  if (fails.length) console.log(`  ${rows.length - fails.length}/${rows.length} passing`);
}

console.log(`\n${ok ? C.g + 'reSHape gate: PASS' : C.r + 'reSHape gate: FAIL'}${C.x} — ${pass}/${results.length}\n`);
process.exit(ok ? 0 : 1);
