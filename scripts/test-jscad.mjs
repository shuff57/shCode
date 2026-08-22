#!/usr/bin/env node
// test-jscad.mjs — the JSCAD acceptance gate.
//
// Six groups, each one closing a claim the stack currently makes only in prose:
//
//   BUNDLE    the two vendored files really are the libraries they claim to be,
//             and nothing in public/jscad/ reaches for a CDN.
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
//   DOCS      every example in lib/jscad-docs.ts and public/jscad/docs/
//             reference.md runs in a require-only context — the jscad.app
//             environment, with the shim subtracted back out.
//   SYNC      the in-app docs and reference.md document the same API surface.
//             public/jscad/docs/CLAUDE.md states this rule; this enforces it.
//   REACH     something a student can actually click loads this runtime. The
//             other six groups all measure whether the runtime is CORRECT;
//             none of them noticed that for the whole of the first build
//             nothing rendered JscadPreview at all, and /docs/jscad fed JSCAD
//             source to the shPlay runner. A gate that cannot fail on "nobody
//             can load it" is measuring the wrong thing.
//
// Runtime builders MUST NOT edit this file or jscad-checks.mjs. A red check is
// closed by fixing public/jscad/runner.html, the vendored bundles, or the docs
// — never by loosening a check here.
//
//   node scripts/test-jscad.mjs                # everything
//   node scripts/test-jscad.mjs --only=docs    # one group
//   node scripts/test-jscad.mjs --json         # machine-readable, for critics

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import {
  REPO, PATHS, extractShim, runnerSource, loadModeling, loadRenderer,
  createShimContext, createRequireOnlyContext, runProgram, isGeometry,
  docExamples, apiNames, documentedNames, docText, captureConsole,
} from './jscad-harness.mjs';
import {
  EXPECTED_BUNDLES,
  EXPECTED_MODULE_ORDER, DOCUMENTED_COLLISIONS, EXPECTED_BARE_NAME_COUNT,
  CORE_TAUGHT, taughtFromReference, REGL_ALIASES, MIN_REGL_SYMBOLS,
  ENTITY_GEOMETRY_KEYS, DOC_SYNC_EXCEPTIONS, MIN_DOC_EXAMPLES, FENCE_TAGS,
  REACH_CHAIN, REACH_LESSON, REACH_SHPLAY,
} from './jscad-checks.mjs';

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
    const p = join(REPO, 'public/jscad/lib', b.file);
    if (!existsSync(p)) { bad.push(`${b.file}: missing`); continue; }
    const buf = readFileSync(p);
    if (buf.length !== b.bytes) bad.push(`${b.file}: ${buf.length} bytes, expected ${b.bytes}`);
    const got = createHash('sha256').update(buf).digest('hex');
    if (got !== b.sha256) {
      const who = b.version ? `${b.pkg}@${b.version}` : b.pkg;
      bad.push(`${b.file}: sha256 ${got.slice(0, 16)}… but ${who} is recorded as ${b.sha256.slice(0, 16)}… — if this is a deliberate upgrade, update version AND sha256 in jscad-checks.mjs together, never the hash alone`);
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
check('nothing under public/jscad or its wiring loads from a CDN', () => {
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
  walk(join(REPO, 'public/jscad'));
  for (const p of [join(REPO, 'lib/preview-builder.ts'), join(REPO, 'components/JscadPreview.tsx')]) {
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
    : `expected ${JSON.stringify(want)}, got ${JSON.stringify(skipped)} — a library upgrade changed the collision set; update the shim banner, then jscad-checks.mjs`;
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
  const derived = taughtFromReference(docText.reference());
  const seen = new Set(derived.map((t) => `${t.module}.${t.name}`));
  return [...derived, ...CORE_TAUGHT.filter((t) => !seen.has(`${t.module}.${t.name}`))];
})();

check('the reference still documents the core taught API', () => {
  const derived = new Set(taughtFromReference(docText.reference()).map((t) => `${t.module}.${t.name}`));
  const missing = CORE_TAUGHT.filter((t) => !derived.has(`${t.module}.${t.name}`));
  return missing.length
    ? `reference.md no longer documents ${missing.map((t) => `${t.module}.${t.name}`).join(', ')}`
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

const examples = docExamples();

check('the doc example extractors still find the examples', () => {
  return examples.length >= MIN_DOC_EXAMPLES
    ? true
    : `only ${examples.length} examples extracted — an extractor has broken`;
});

check('every fence tag in reference.md is one the gate understands', () => {
  const known = new Set(['js', ...Object.keys(FENCE_TAGS)]);
  const bad = [];
  for (const e of examples) for (const t of e.tags) if (!known.has(t)) bad.push(`${e.source}:${e.line} "${t}"`);
  return bad.length ? `unknown fence tag: ${bad.join(', ')}` : true;
});

// Each example runs in the jscad.app-equivalent context: the shim subtracted
// back out, require() and module.exports the only things left. A bare `cube()`
// throws here, which is the whole point.
for (const e of examples) {
  const label = `${e.source}:${e.line}`;
  check(`runs on jscad.app — ${label}`, () => {
    const cap = captureConsole();
    const ctx = createRequireOnlyContext(cap.console);
    const r = runProgram(ctx, e.code, label, { lineOffset: e.line - 1 });
    const shcadeOnly = e.tags.includes('shcode-only');
    const skeleton = e.tags.includes('skeleton');

    if (shcadeOnly) {
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
// SYNC  (public/jscad/docs/CLAUDE.md's unenforced rule)
// ===========================================================================

at('sync');

check('the in-app docs and reference.md document the same API', () => {
  const { jscad } = loadModeling();
  const candidates = [...apiNames(jscad).keys()];
  const inApp = documentedNames(docText.inApp(), candidates);
  const ref = documentedNames(docText.reference(), candidates);
  const allow = new Map(DOC_SYNC_EXCEPTIONS.map((x) => [x.name, x.only]));

  const onlyInApp = [...inApp].filter((n) => !ref.has(n) && allow.get(n) !== 'in-app').sort();
  const onlyRef = [...ref].filter((n) => !inApp.has(n) && allow.get(n) !== 'reference').sort();
  if (!onlyInApp.length && !onlyRef.length) return true;
  const parts = [];
  if (onlyInApp.length) parts.push(`only in lib/jscad-docs.ts: ${onlyInApp.join(', ')}`);
  if (onlyRef.length) parts.push(`only in reference.md: ${onlyRef.join(', ')}`);
  return `${parts.join(' | ')} — document it in both, or add a reviewed entry to DOC_SYNC_EXCEPTIONS`;
});

check('the sync check is actually looking at both files', () => {
  const { jscad } = loadModeling();
  const candidates = [...apiNames(jscad).keys()];
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
      // Next.js filesystem routing: /docs/jscad -> app/docs/jscad/…
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

check('the shPlay docs still load the shPlay runner', () => assertHop(REACH_SHPLAY, REACH_SHPLAY.file));

check('a lesson with preview:"jscad" would mount the JSCAD runner', () => assertHop(REACH_LESSON, REACH_LESSON.file));

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

const GROUPS = ['bundle', 'shim', 'api', 'renderer', 'docs', 'sync', 'reach'];
const TITLES = {
  bundle: 'BUNDLE   — the vendored libraries, and no CDN anywhere',
  shim: 'SHIM     — cut live out of runner.html',
  api: 'API      — bare name IS the library function',
  renderer: 'RENDERER — every symbol runner.html reaches',
  docs: 'DOCS     — every example runs on jscad.app',
  sync: 'SYNC     — in-app docs vs docs/reference.md',
  reach: 'REACH    — a student can actually load this runtime',
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

console.log(`\n${ok ? C.g + 'JSCAD gate: PASS' : C.r + 'JSCAD gate: FAIL'}${C.x} — ${pass}/${results.length}\n`);
process.exit(ok ? 0 : 1);
