// jscad-harness.mjs — the machinery the JSCAD gate runs on.
//
// Nothing in here decides pass or fail; it only builds the two contexts the
// checks need and pulls the real artifacts out of the repo. The rule that
// makes the gate worth anything is that it NEVER reimplements the runtime:
//
//   * the modeling bundle is the vendored file, evaluated as-is
//   * the regl bundle is the vendored file, evaluated as-is
//   * the scope shim is CUT OUT OF public/jscad/runner.html at run time,
//     not copied here. Edit the shim and this file tests the edit.
//
// Two contexts come out the other side:
//
//   SHIM CONTEXT      what a student gets inside shCode — bundle + shim, so
//                     bare `cube(...)` resolves.
//   REQUIRE-ONLY      what a student gets on https://jscad.app/ — the same
//                     context with every name the shim installed deleted
//                     again, leaving only require / module / exports. Built by
//                     subtraction rather than by hand, so it cannot drift away
//                     from what the shim actually adds.
//
// Caveat worth knowing before reading a result: a node vm global object is a
// much smaller surface than a browser `window`, so the shim's rule-2 skip
// ("already on window") fires less often here than it would in the browser.
// That is why the collision tripwire in jscad-checks.mjs is asserted twice —
// once against this context, and once host-independently straight off the
// library.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PATHS = {
  modeling: join(REPO, 'public/jscad/lib/jscad-modeling.min.js'),
  regl: join(REPO, 'public/jscad/lib/jscad-regl-renderer.min.js'),
  runner: join(REPO, 'public/jscad/runner.html'),
  inAppDocs: join(REPO, 'lib/jscad-docs.ts'),
  reference: join(REPO, 'public/jscad/docs/reference.md'),
};

// ---- artifacts ------------------------------------------------------------

// Normalise line endings on the way in. Git's core.autocrlf=true rewrites text
// files on checkout, so a fresh clone on Windows gets CRLF while the tree these
// checks were written in has LF. extractShim() matches `<script>\n` literally;
// against `<script>\r\n` it finds zero blocks, throws, and takes the whole SHIM
// group and everything built on the shim context down with it.
//
// Measured 2026-08-22, and only because a deploy was built from a fresh
// worktree: same commit, 248/248 here and 30/248 there. A gate that depends on
// the checkout config of the machine it runs on is not a gate. Reading through
// this keeps it checkout-agnostic; .gitattributes keeps the working trees
// consistent as well, but the gate must not need that to be true.
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

let _modelingScript = null;
function modelingScript() {
  // Compiled once, run into every fresh context. 250KB of UMD re-parsed 37
  // times is the difference between a 2-second gate and a 20-second one.
  if (!_modelingScript) {
    _modelingScript = new vm.Script(read(PATHS.modeling), { filename: 'jscad-modeling.min.js' });
  }
  return _modelingScript;
}

/**
 * Cut the additive scope shim out of runner.html.
 *
 * The shim is whichever <script> block assigns __jscadBareNamesSkipped — the
 * one name the shim publishes for exactly this purpose. Identifying it by a
 * name the runtime already exposes means no marker comment can be deleted out
 * from under the test.
 */
export function extractShim(html = read(PATHS.runner)) {
  const blocks = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)];
  const hit = blocks.filter((b) => /window\.__jscadBareNamesSkipped\s*=/.test(b[1]));
  if (hit.length !== 1) {
    throw new Error(
      `expected exactly 1 <script> block in runner.html assigning window.__jscadBareNamesSkipped, found ${hit.length}`
    );
  }
  const before = html.slice(0, hit[0].index);
  return { code: hit[0][1], line: before.split('\n').length + 1 };
}

/** Every `regl.x` / `x.y` symbol path the runner's render() actually reaches. */
export function runnerSource() {
  return read(PATHS.runner);
}

// ---- contexts -------------------------------------------------------------

// The shim touches exactly one DOM node (the status line) and only to write a
// message when the bundle failed to load. Stubbing it is cheaper and more
// honest than pulling in a DOM implementation.
function browserish(consoleImpl = console) {
  const nodes = new Map();
  return {
    console: consoleImpl,
    document: {
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { id, textContent: '' });
        return nodes.get(id);
      },
      createElement: () => ({ textContent: '', appendChild() {} }),
      head: { appendChild() {} },
    },
    URLSearchParams,
    location: { search: '' },
    requestAnimationFrame: () => 0,
    addEventListener() {},
  };
}

function baseContext(consoleImpl) {
  const ctx = vm.createContext(browserish(consoleImpl));
  vm.runInContext('var window = this; var self = this; var global = this;', ctx);
  return ctx;
}

/**
 * A console that keeps what a doc example printed instead of spraying it
 * through the gate's own output. `console.log('volume:', …)` is a perfectly
 * good teaching example and a terrible test log line.
 */
export function captureConsole() {
  const lines = [];
  const rec = (type) => (...args) => lines.push({ type, text: args.map(String).join(' ') });
  return { lines, console: { log: rec('log'), info: rec('info'), warn: rec('warn'), error: rec('error'), debug: rec('debug') } };
}

/** Bundle only — no shim. Used by the host-independent collision audit. */
export function loadModeling(consoleImpl) {
  const ctx = baseContext(consoleImpl);
  modelingScript().runInContext(ctx);
  const jscad = ctx.window.jscadModeling;
  if (!jscad) throw new Error('jscad-modeling.min.js did not export window.jscadModeling');
  return { ctx, jscad };
}

/**
 * Bundle + the real shim, exactly as a student's preview iframe has it.
 *
 * `opts.preSeed` puts names on the global BEFORE the shim runs, which is the
 * only way to reproduce from node what a browser does for free: `window` in a
 * browser already carries hundreds of built-ins, and a node vm global carries
 * a handful. Seeding is how the gate exercises the shim's collision path
 * without waiting for a library upgrade to produce a real one.
 */
export function createShimContext(opts = {}) {
  const { ctx } = loadModeling(opts.consoleImpl);
  const shim = extractShim();
  if (opts.preSeed) {
    for (const [k, v] of Object.entries(opts.preSeed)) ctx.window[k] = v;
  }
  vm.runInContext(shim.code, ctx, { filename: 'runner.html<shim>', lineOffset: shim.line - 1 });
  return {
    ctx,
    window: ctx.window,
    jscad: ctx.window.jscadModeling,
    skipped: ctx.window.__jscadBareNamesSkipped,
    lost: ctx.window.__jscadBareNamesLost,
  };
}

// Names the shim itself installs that are part of the REAL jscad.app surface
// and therefore survive into the require-only context.
const PORTABLE = new Set(['module', 'exports', 'require']);

/**
 * The jscad.app-equivalent context: run the shim, then delete every global it
 * introduced except the CommonJS three. Built by subtraction so a shim that
 * starts installing a new bare name automatically starts being stripped here —
 * the portability check can never fall behind the shim.
 */
export function createRequireOnlyContext(consoleImpl) {
  const { ctx } = loadModeling(consoleImpl);
  const shim = extractShim();
  // The subtraction has to happen INSIDE the context. `delete ctx.cube` on the
  // sandbox object is a no-op against the vm's real global — a trap that makes
  // the portability check silently pass everything.
  vm.runInContext('globalThis.__before = Object.getOwnPropertyNames(globalThis);', ctx);
  vm.runInContext(shim.code, ctx, { filename: 'runner.html<shim>' });
  vm.runInContext(`(function () {
    var keep = {};
    __before.concat(${JSON.stringify([...PORTABLE])}).forEach(function (n) { keep[n] = 1; });
    Object.getOwnPropertyNames(globalThis).forEach(function (n) {
      if (!keep[n]) { try { delete globalThis[n]; } catch (e) {} }
    });
    // jscadModeling is a shCode-only global too: on jscad.app the library is
    // reachable through require() and nothing else.
    delete globalThis.jscadModeling;
    delete globalThis.__before;
  })();`, ctx);
  return ctx;
}

/**
 * The vendored regl renderer, loaded with no GL context anywhere.
 *
 * Both bundles go into ONE context, the way the runner page loads them.
 * entitiesFromSolids filters its input with `instanceof Object`, which is
 * false across vm realms — load them separately and it silently returns zero
 * entities for perfectly good geometry.
 */
export function loadRenderer() {
  const { ctx, jscad } = loadModeling();
  vm.runInContext(read(PATHS.regl), ctx, { filename: 'jscad-regl-renderer.min.js' });
  const regl = ctx.window.jscadReglRenderer;
  if (!regl) throw new Error('jscad-regl-renderer.min.js did not export window.jscadReglRenderer');
  return { regl, jscad, ctx };
}

// ---- running one student-shaped program ------------------------------------

/**
 * Mirrors the four-step pickup in runner.html: run the source, find `main`
 * (module.exports.main -> module.exports-as-function -> bare `main` via
 * indirect eval, which is the only way to see a `const main`), read the
 * getParameterDefinitions() defaults, call it.
 *
 * Returns { ok, phase, error, geometry } — never throws for student-side
 * failures, because a thrown example IS the result the caller wants.
 */
export function runProgram(ctx, code, filename, { lineOffset = 0 } = {}) {
  try {
    vm.runInContext(code, ctx, { filename, lineOffset });
  } catch (e) {
    return { ok: false, phase: 'load', error: e };
  }

  let main;
  try {
    const exp = ctx.module && ctx.module.exports;
    if (exp && typeof exp.main === 'function') main = exp.main;
    else if (typeof exp === 'function') main = exp;
    else main = vm.runInContext('typeof main !== "undefined" ? main : undefined', ctx);
  } catch (e) {
    return { ok: false, phase: 'find-main', error: e };
  }
  if (typeof main !== 'function') return { ok: true, phase: 'no-main', main: false, geometry: undefined };

  let params = {};
  try {
    const exp = ctx.module && ctx.module.exports;
    let defs = exp && typeof exp.getParameterDefinitions === 'function' ? exp.getParameterDefinitions : null;
    if (!defs) {
      defs = vm.runInContext(
        'typeof getParameterDefinitions !== "undefined" ? getParameterDefinitions : undefined', ctx
      );
    }
    if (typeof defs === 'function') {
      for (const d of defs() || []) {
        if (!d || d.name === undefined) continue;
        if (d.initial !== undefined) params[d.name] = d.initial;
        else if (d.default !== undefined) params[d.name] = d.default;
      }
    }
  } catch (e) {
    return { ok: false, phase: 'parameters', error: e };
  }

  try {
    const geometry = main(params);
    return { ok: true, phase: 'ran', main: true, geometry };
  } catch (e) {
    return { ok: false, phase: 'main', error: e };
  }
}

/** Did main() hand back something the renderer could actually draw? */
export function isGeometry(v) {
  if (Array.isArray(v)) return v.length > 0 && v.every(isGeometry);
  return !!v && typeof v === 'object' && (Array.isArray(v.polygons) || Array.isArray(v.sides) || Array.isArray(v.points));
}

// ---- doc example extraction -----------------------------------------------

/**
 * The in-app reference is a TS module of `code: \`...\`` template literals.
 * No example contains a backtick or a ${} interpolation today; if one ever
 * does, this throws rather than silently truncating a block.
 */
export function inAppExamples() {
  const src = read(PATHS.inAppDocs);
  const out = [];
  const rx = /^\s*code: `([\s\S]*?)`,?$/gm;
  let m;
  while ((m = rx.exec(src)) !== null) {
    if (/\$\{/.test(m[1])) throw new Error('lib/jscad-docs.ts example contains ${} — extractor needs updating');
    out.push({
      source: 'lib/jscad-docs.ts',
      line: src.slice(0, m.index).split('\n').length + 1,
      code: m[1],
      tags: [],
    });
  }
  return out;
}

/**
 * reference.md's ```js fences. An info string beyond `js` is carried through as
 * a tag; `shcode-only` is the one tag the gate understands (see test-jscad.mjs).
 */
export function referenceExamples() {
  const src = read(PATHS.reference);
  const out = [];
  const rx = /^```js([^\n]*)\n([\s\S]*?)^```/gm;
  let m;
  while ((m = rx.exec(src)) !== null) {
    out.push({
      source: 'public/jscad/docs/reference.md',
      line: src.slice(0, m.index).split('\n').length + 1,
      code: m[2],
      tags: (m[1] || '').trim().split(/\s+/).filter(Boolean),
    });
  }
  return out;
}

export function docExamples() {
  return [...inAppExamples(), ...referenceExamples()];
}

// ---- doc coverage ----------------------------------------------------------

/** Every function name @jscad/modeling exports, module by module. */
export function apiNames(jscad) {
  const names = new Map();       // name -> [module, ...]
  for (const mod of Object.keys(jscad)) {
    for (const k of Object.keys(jscad[mod] || {})) {
      if (typeof jscad[mod][k] !== 'function') continue;
      if (!names.has(k)) names.set(k, []);
      names.get(k).push(mod);
    }
  }
  return names;
}

/**
 * Which of those names a doc file actually documents.
 *
 * Deliberately NOT a bare word match: `line`, `project`, `square` and
 * `transform` are all real @jscad/modeling exports AND ordinary English, and a
 * word match reports ten names of drift that is only prose. A name counts when
 * it is written the way documentation writes an API name — called, dotted off
 * its module, or set in backticks.
 */
export function documentedNames(text, candidates) {
  const found = new Set();
  for (const name of candidates) {
    const rx = new RegExp(`\\b${name}\\s*\\(|\\.${name}\\b|\`${name}\``);
    if (rx.test(text)) found.add(name);
  }
  return found;
}

/**
 * lib/jscad-docs.ts opens with a scope-out comment naming a dozen functions the
 * course deliberately does NOT document. Reading it as content would report
 * every one of them as drift, so the file's docs start at its first import.
 */
export function docBodyOf(ts) {
  const i = ts.indexOf('import {');
  return i > 0 ? ts.slice(i) : ts;
}

export const docText = {
  inApp: () => docBodyOf(read(PATHS.inAppDocs)),
  reference: () => read(PATHS.reference),
};
