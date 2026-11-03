#!/usr/bin/env node
// test-runner-errors.mjs -- a moSHion sketch that throws must tell the student why.
//
// The preview iframe (components/MoshionPreview.tsx) is sandboxed WITHOUT
// allow-same-origin, so it has an opaque origin and every <script src> in
// public/moshion/runner.html -- the engine included -- is cross-origin to it.
// A browser MUTES an uncaught error thrown inside a cross-origin script: the
// window error event gets "Script error." and nothing else. Until 2026-11-02
// that was all a student saw whenever the ENGINE threw, which is what every
// starter that has not made its canvas yet does ("new Canvas(w, h) must be
// called in setup()"): 5.1.11, 5.1.20, 5.1.23, 5.1.25 and 5.6.14.
//
// The runner now catches the two ways the engine is driven (the boot call and
// every animation frame) and reports the real Error. This test runs the REAL
// runner.html -- its scripts, in document order, the engine included -- in a
// node vm with a small DOM, and models the browser's muting rule: an uncaught
// exception whose throw site is in one of the runner's <script src> files
// reaches the error event as a bare "Script error." with no error object. A
// runner that leaves an engine error uncaught therefore fails here exactly as
// it failed in Chrome. (Checked once against the pre-fix runner: all five
// starters and the engine-throw cases report "Script error.", the same as
// the browser did.)
//
//   node scripts/test-runner-errors.mjs
//   node scripts/test-runner-errors.mjs --runner=/path/to/runner.html   # calibrate on another copy

import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// The host's Submit gate, fed the frame's reports (Node 22 strips the types itself).
import { canSubmitMoshion, moshionRunNeed, moshionRunStep, NO_MOSHION_RUN } from '../lib/ai-check.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOSHION_DIR = join(REPO, 'public', 'moshion');
const runnerArg = process.argv.find((a) => a.startsWith('--runner='));
const RUNNER = runnerArg ? runnerArg.slice('--runner='.length) : join(MOSHION_DIR, 'runner.html');
const FRAME_MS = 1000 / 60;

// ---- the runner's scripts, in document order --------------------------------

const html = readFileSync(RUNNER, 'utf8');
const scripts = [];
for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  const attrs = m[1] || '';
  const src = (attrs.match(/\ssrc="([^"]+)"/) || [])[1];
  if (src) scripts.push({ file: src.replace(/^\.\//, '').split('/').pop(), code: readFileSync(join(MOSHION_DIR, src.replace(/^\.\//, '')), 'utf8'), external: true });
  else scripts.push({ file: 'runner.html', code: m[2], external: false });
}
const EXTERNAL = new Set(scripts.filter((s) => s.external).map((s) => s.file));
if (!EXTERNAL.has('moshion.js')) {
  console.error('FAIL  runner.html no longer loads moshion.js with <script src> -- update this test');
  process.exit(1);
}

// ---- a frame, as the parent sees it -----------------------------------------

function encode(code) {
  return Buffer.from(code, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// A 2D context that accepts everything. What is drawn is not this test's
// business (scripts/test-moshion.mjs owns that); it only has to not throw.
function permissiveCtx() {
  const state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1, imageSmoothingEnabled: true };
  const special = {
    measureText: (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    getLineDash: () => [],
    isPointInPath: () => false,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy(state, {
    get(t, k) {
      if (k in special) return special[k];
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// `timers: true` makes setTimeout(fn, ms > 0) wait for the frame clock to reach it, so a sketch
// can throw from a timer AFTER it came up. Off by default: every other check here runs timers at
// once, as they always have.
function runFrame(code, { frames = 30, timers = false } = {}) {
  const posted = [];          // every message the frame posted to its parent
  const errorEvents = [];     // what reached the window error event, raw
  const tasks = [];           // macrotask queue (timers, message events)
  const later = [];           // { at, fn }: timers waiting for the clock (timers: true only)
  let raf = [];               // animation-frame callbacks for the next frame
  let clock = 0;
  const listeners = new Map();
  const on = (key) => (type, fn) => {
    if (!listeners.has(key)) listeners.set(key, new Map());
    const m = listeners.get(key);
    if (!m.has(type)) m.set(type, []);
    m.get(type).push(fn);
  };
  // An exception out of an event listener is reported like any other
  // uncaught one (the runner's storage hand-off boots the sketch from a
  // 'message' listener); one out of an error listener is dropped, as a
  // browser does, rather than reported into itself.
  const fire = (key, type, ev) => {
    const fns = ((listeners.get(key) || new Map()).get(type) || []).slice();
    for (const fn of fns) {
      try { fn(ev); } catch (err) { if (type !== 'error') reportUncaught(err); }
    }
  };

  // The browser's report-an-exception step, with its muting rule.
  function throwSite(err) {
    const stack = err && typeof err === 'object' ? String(err.stack || '') : '';
    for (const line of stack.split('\n')) {
      if (!/^\s+at /.test(line)) continue;
      const m = /\(?([^\s()]+):(\d+):(\d+)\)?\s*$/.exec(line);
      if (m) return { file: m[1], line: Number(m[2]), col: Number(m[3]) };
    }
    return null;
  }
  function reportUncaught(err) {
    const site = throwSite(err);
    if (site && EXTERNAL.has(site.file)) {
      const ev = { message: 'Script error.', filename: '', lineno: 0, colno: 0, error: null };
      errorEvents.push(ev);
      fire('window', 'error', ev);
      return;
    }
    const ev = {
      message: 'Uncaught ' + (err && err.name ? err.name + ': ' + err.message : String(err)),
      filename: site ? site.file : '', lineno: site ? site.line : 0, colno: site ? site.col : 0, error: err,
    };
    errorEvents.push(ev);
    fire('window', 'error', ev);
  }
  function task(fn) {
    try { fn(); } catch (err) { reportUncaught(err); }
  }

  let canvas = null;
  const makeEl = (tag) => {
    const el = {
      tagName: String(tag).toUpperCase(), style: {}, textContent: '', innerHTML: '',
      classList: { add() {}, remove() {}, contains: () => false },
      appendChild() {}, remove() {}, setAttribute() {}, addEventListener() {},
    };
    if (el.tagName === 'CANVAS') {
      Object.assign(el, {
        width: 300, height: 150,
        getContext: () => permissiveCtx(),
        addEventListener: on('canvas'), removeEventListener() {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: el.width, height: el.height, right: el.width, bottom: el.height }),
        toDataURL: () => 'data:,',
      });
      canvas = el;
    }
    return el;
  };
  const errorBox = makeEl('div');
  const emptyBox = makeEl('div');
  const document = {
    head: {
      // An inline <script> runs synchronously when it is inserted, and an
      // error inside it is REPORTED, never thrown back to the inserter.
      appendChild(el) {
        if (el.tagName === 'SCRIPT') {
          const name = (/\/\/# sourceURL=(\S+)\s*$/.exec(el.textContent) || [])[1] || 'inline.js';
          let script;
          try {
            script = new Script(el.textContent, { filename: name });
          } catch (err) {
            if (!err || err.name !== 'SyntaxError') throw err;
            // A sketch that does not parse, the way Chrome reports it (seen
            // 2026-11-03 on 5.1.11): the message in Chrome's own words, the
            // stack at the runner's inject() and NOT at the sketch, so the
            // error carries no line of the student's code at all.
            const chrome = new SyntaxError(`Failed to execute 'appendChild' on 'Node': ${err.message}`);
            chrome.stack = `SyntaxError: ${chrome.message}\n    at inject (runner.html:262:17)\n    at start (runner.html:290:3)`;
            reportUncaught(chrome);
            return;
          }
          task(() => script.runInContext(ctx));
        }
      },
    },
    body: { appendChild() {}, classList: { add() {} }, style: {}, innerHTML: '', addEventListener: on('body') },
    documentElement: { style: {} },
    createElement: makeEl,
    createElementNS: () => makeEl('svg'),
    getElementById: (id) => (id === 'error' ? errorBox : id === 'empty' ? emptyBox : null),
    querySelector: () => null,
    addEventListener: on('document'), removeEventListener() {},
  };

  class FakeImage {
    constructor() { this.width = 64; this.height = 64; this.naturalWidth = 64; this.naturalHeight = 64; this.complete = false; this.onload = null; }
    set src(v) { this._src = v; this.complete = true; tasks.push(() => { if (typeof this.onload === 'function') this.onload(); }); }
    get src() { return this._src; }
    addEventListener() {}
  }

  const consoleSink = [];
  const sandbox = {
    console: {
      log: (...a) => consoleSink.push(['log', a]), warn: (...a) => consoleSink.push(['warn', a]),
      error: (...a) => consoleSink.push(['error', a]), info: (...a) => consoleSink.push(['info', a]),
    },
    document,
    location: { search: '?code=' + encode(code) + '&r=1' },
    URLSearchParams, atob, escape, unescape, decodeURIComponent, encodeURIComponent,
    Image: FakeImage,
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
    cancelAnimationFrame() {},
    setTimeout: (fn, ms) => {
      if (typeof fn !== 'function') return 0;
      if (timers && ms > 0) later.push({ at: clock + ms, fn });
      else tasks.push(fn);
      return tasks.length + later.length;
    },
    clearTimeout() {},
    setInterval: () => 0,   // the runner's storage request is also sent once directly
    clearInterval() {},
    addEventListener: on('window'), removeEventListener() {},
    devicePixelRatio: 1, innerWidth: 800, innerHeight: 600,
    fetch: () => Promise.reject(new Error('no network in this test')),
    Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError, ReferenceError,
    Map, Set, WeakMap, WeakSet, Symbol, Promise, RegExp, isNaN, isFinite, parseInt, parseFloat,
    Infinity, NaN, undefined, Float32Array, Float64Array, Int32Array, Uint8Array, ArrayBuffer, Proxy, Reflect,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.top = {}; // embedded: the runner refuses to run as a top-level document
  // An opaque origin cannot even READ localStorage (see lib/moshion-storage.ts).
  Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('SecurityError: opaque origin'); } });
  sandbox.parent = {
    postMessage(msg) {
      posted.push(msg);
      if (msg && msg.source === 'preview-storage-request' && !sandbox.__answered) {
        sandbox.__answered = true;
        tasks.push(() => fire('window', 'message', { data: { source: 'preview-storage-init', data: {} } }));
      }
    },
  };
  const ctx = createContext(sandbox);

  for (const s of scripts) task(() => runInContext(s.code, ctx, { filename: s.file }));
  const drain = () => { let guard = 0; while (tasks.length && guard++ < 1000) task(tasks.shift()); };
  drain();
  let ran = 0;
  for (let i = 0; i < frames; i++) {
    const due = raf; raf = [];
    if (!due.length) break;
    clock += FRAME_MS;
    for (const cb of due) task(() => cb(clock));
    drain();
    for (let k = 0; k < later.length; ) {
      if (later[k].at <= clock) { const { fn } = later.splice(k, 1)[0]; task(fn); drain(); }
      else k++;
    }
    ran++;
  }
  const frameCount = (() => { try { return runInContext('typeof frameCount === "number" ? frameCount : -1', ctx); } catch (_) { return -1; } })();
  return {
    errors: posted.filter((m) => m && m.source === 'preview-error').map((m) => m.error),
    // "It came up": the host keeps Submit shut until this or an error arrives.
    cameUp: posted.filter((m) => m && m.source === 'preview-status' && m.status === 'running').length,
    // The two reports the host's Submit gate listens to, in the order they were posted.
    reports: posted
      .filter((m) => m && ((m.source === 'preview-status' && m.status === 'running') || m.source === 'preview-error'))
      .map((m) => (m.source === 'preview-error' ? 'error' : 'came-up')),
    errorEvents, ran, frameCount, pendingFrames: raf.length, canvas,
    // What the red box over the preview says -- what the student reads.
    box: errorBox.style.display === 'block' ? errorBox.textContent : '',
  };
}

// ---- checks -------------------------------------------------------------------

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('  ok    ' + name);
  else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}
const show = (r) => JSON.stringify(r.errors.map((e) => ({ name: e.name, message: e.message, line: e.line })));
const lesson = (folder, file) => readFileSync(join(REPO, 'lessons', folder, file), 'utf8');

// The five starters the bug report named (displayed number -> folder).
const STARTERS = [
  ['5.1.11', '5-1-11-moshion-intro'],
  ['5.1.20', '5-1-20-moshion-move-keys'],
  ['5.1.23', '5-1-21-a10-1-sprite-playground'],
  ['5.1.25', '5-1-23-challenges'],
  ['5.6.14', '5-3-13-lab-build-sprite'],
];
const NO_CANVAS = 'new Canvas(w, h) must be called in setup()';

const CANVAS_HINT = 'Your sketch needs a canvas first: inside setup(), write new Canvas(400, 400).';

console.log('starters that have not made a canvas yet');
for (const [num, folder] of STARTERS) {
  const r = runFrame(lesson(folder, 'script.js'));
  check(`${num} starter shows "${NO_CANVAS}", once, not "Script error."`,
    r.errors.length === 1 && r.errors[0].message === NO_CANVAS, show(r));
  check(`${num} starter says the plain sentence first, then the engine's own words`,
    r.errors.length === 1 && r.errors[0].hint === CANVAS_HINT && r.box === `${CANVAS_HINT}\nError: ${NO_CANVAS}`, JSON.stringify(r.box));
  check(`${num} starter stops cleanly (no frame loop left running)`, r.pendingFrames === 0 && r.ran === 0, `ran ${r.ran}, pending ${r.pendingFrames}`);
}

console.log('a correct sketch is untouched');
for (const [num, folder] of STARTERS) {
  const r = runFrame(lesson(folder, 'solution.js'), { frames: 30 });
  check(`${num} reference runs 30 frames with no error`, r.errors.length === 0 && r.ran === 30 && r.frameCount === 30 && r.pendingFrames === 1,
    `${show(r)} ran ${r.ran} frameCount ${r.frameCount} pending ${r.pendingFrames}`);
}

console.log('the student\'s own throw, at each stage');
{
  const r = runFrame("let x = 1;\nthrow new Error('boom at top');\nfunction setup() { new Canvas(200, 200); }\n");
  check('a throw at the top level reports its message and line 2', r.errors.length === 1 && r.errors[0].message === 'boom at top' && r.errors[0].line === 2, show(r));
}
{
  const r = runFrame("function setup() {\n  new Canvas(200, 200);\n  throw new Error('boom in setup');\n}\nfunction draw() { background('black'); }\n");
  check('a throw in setup() reports its message and line 3, and no frame runs', r.errors.length === 1 && r.errors[0].message === 'boom in setup' && r.errors[0].line === 3 && r.ran === 0, show(r));
}
{
  const r = runFrame("function setup() {\n  new Canvas(200, 200);\n}\nfunction draw() {\n  background('black');\n  if (frameCount > 2) throw new Error('boom in draw');\n}\n", { frames: 30 });
  check('a throw in draw() reports its message and line 6, once', r.errors.length === 1 && r.errors[0].message === 'boom in draw' && r.errors[0].line === 6, show(r));
  check('a throw in draw() stops the loop on that frame instead of repeating', r.ran === 3 && r.pendingFrames === 0, `ran ${r.ran}, pending ${r.pendingFrames}`);
}

console.log('the engine\'s throw, at each stage (these used to arrive as "Script error.")');
{
  const r = runFrame("function setup() {\n  new Canvas(200, 200);\n  new Sprite(10, 10, 10, 10);\n  world.origin = 'math';\n}\n");
  check('an engine error inside setup() names it, at the student\'s line 4',
    r.errors.length === 1 && /world\.origin = 'math' must come before any sprite/.test(r.errors[0].message) && r.errors[0].line === 4, show(r));
}
{
  const r = runFrame("function setup() {\n  new Canvas(200, 200);\n}\nfunction draw() {\n  background('black');\n  showGrid(-5);\n}\n", { frames: 10 });
  check('an engine error inside draw() names it, at the student\'s line 6',
    r.errors.length === 1 && /^showGrid\(step\): step must be a number above 0/.test(r.errors[0].message) && r.errors[0].line === 6 && r.errors[0].name === 'TypeError', show(r));
  check('an engine error inside draw() stops the loop', r.ran === 1 && r.pendingFrames === 0, `ran ${r.ran}, pending ${r.pendingFrames}`);
}
{
  // The one case that cannot be caught: the engine throwing while the
  // sketch's top-level code runs. The browser mutes it; the student still
  // gets a sentence, never the bare "Script error.".
  const r = runFrame("world.origin = 'polar';\nfunction setup() { new Canvas(200, 200); }\n");
  check('the model mutes it the way a browser does (calibration)', r.errorEvents.length >= 1 && r.errorEvents[0].message === 'Script error.' && r.errorEvents[0].error === null, JSON.stringify(r.errorEvents));
  check('a muted engine error at the top level becomes a plain sentence, not "Script error."',
    r.errors.length === 1 && !/Script error/i.test(r.errors[0].message) && /outside setup\(\) and draw\(\)/.test(r.errors[0].message), show(r));
}

// "It came up" (preview-status). The host keeps Submit shut from Run until the
// frame reports: an error, or this, once the first frame ran clean. A sketch
// that throws must never send it, or Check's fallback could open Submit on a
// crash (5.1.25, 2026-11-03).
console.log('the frame says when the sketch came up, and never for one that threw');
{
  // The math-grid lab's reference, and the walk's crash: the same lines with
  // world.origin moved below the sprite (lessons/5-1-25-math-grid).
  const grid = (originFirst) => [
    'let box;', '', 'function setup() {', '  new Canvas(400, 400);',
    ...(originFirst ? ["  world.origin = 'math';"] : []),
    '  box = new Sprite(100, 50, 40, 40);', "  box.color = 'deepskyblue';",
    ...(originFirst ? [] : ["  world.origin = 'math';"]),
    '}', '', 'function draw() {', "  background('#222');", '  showGrid(50);', '  showMouse();', '}', '',
  ].join('\n');
  const r0 = runFrame(grid(true), { frames: 0 });
  check('a started sketch waits for its first frame before saying it came up', r0.errors.length === 0 && r0.cameUp === 0, `cameUp ${r0.cameUp} ${show(r0)}`);
  const r = runFrame(grid(true), { frames: 5 });
  check('5.1.25 reference: says it came up, once, after its first frame', r.errors.length === 0 && r.cameUp === 1, `cameUp ${r.cameUp} ${show(r)}`);
  const rl = runFrame(grid(false), { frames: 5 });
  check('5.1.25 with world.origin after the sprite: an error and never "came up"',
    rl.errors.length === 1 && /must come before any sprite/.test(rl.errors[0].message) && rl.errors[0].line === 7 && rl.cameUp === 0, `cameUp ${rl.cameUp} ${show(rl)}`);
}
for (const [num, folder] of STARTERS) {
  const r = runFrame(lesson(folder, 'script.js'));
  check(`${num} starter (no canvas): never "came up"`, r.cameUp === 0, `cameUp ${r.cameUp}`);
}
{
  const r = runFrame("function setup() {\n  new Canvas(200, 200);\n}\nfunction draw() {\n  background('black');\n  if (frameCount > 2) throw new Error('boom in draw');\n}\n", { frames: 30 });
  check('a sketch that comes up and throws later says both, in that order of arrival', r.cameUp === 1 && r.errors.length === 1, `cameUp ${r.cameUp} ${show(r)}`);
  const rs = runFrame("let p;\nfunction setup() {\n  new Canvas(200, 200);\n  p = new Sprite(10, 10, 10, 10;\n}\n");
  check('a sketch with a typo never "came up"', rs.cameUp === 0 && rs.errors.length === 1, `cameUp ${rs.cameUp} ${show(rs)}`);
  const rn = runFrame('let total = 2 + 3;\n', { frames: 0 });
  check('a sketch with no setup() (no engine, no frames) says it came up at once', rn.errors.length === 0 && rn.cameUp === 1, `cameUp ${rn.cameUp} ${show(rn)}`);
}

// A late error (5.1 walk round 2, N7): a sketch that comes up clean and throws later (at frame 30,
// at frame 120, from a 1.5 s timer) let Submit sit lit for 0.2 to 1.7 s. The frame must report the
// late error after "came up", and the host's gate (lib/ai-check.ts, fed the reports in the order
// the frame posted them) must shut Submit on it and keep it shut, through Stop as well.
console.log('a late error re-locks Submit');
{
  const late = (body) => ['let p;', 'function setup() {', '  new Canvas(200, 200);', '  p = new Sprite(100, 100, 20, 20);', ...body.setup, '}',
    'function draw() {', "  background('#222');", ...body.draw, '}'].join('\n') + '\n';
  const cases = [
    ['frame 30', late({ setup: [], draw: ['  if (frameCount > 30) nope();'] }), { frames: 60 }],
    ['frame 120', late({ setup: [], draw: ['  if (frameCount > 120) nope();'] }), { frames: 150 }],
    ['a 1.5 s timer in setup()', late({ setup: ['  setTimeout(() => nope(), 1500);'], draw: [] }), { frames: 150, timers: true }],
  ];
  for (const [name, code, opts] of cases) {
    const r = runFrame(code, opts);
    check(`${name}: the frame says "came up", then the error, and nothing after`,
      JSON.stringify(r.reports) === '["came-up","error"]' && r.errors.length === 1 && r.errors[0].message === 'nope is not defined',
      `${JSON.stringify(r.reports)} ${show(r)}`);
    // The host, fed the same reports: Run, then each message as it arrives.
    let run = moshionRunStep(NO_MOSHION_RUN, { type: 'run', text: code });
    const gate = () => canSubmitMoshion({ cardsOk: true, run, currentText: code });
    const seen = [gate()];
    for (const rep of r.reports) { run = moshionRunStep(run, { type: rep }); seen.push(gate()); }
    check(`${name}: Submit is shut while loading, open once it came up, shut at the error`, JSON.stringify(seen) === '[false,true,false]', JSON.stringify(seen));
    run = moshionRunStep(run, { type: 'stop' });
    check(`${name}: Stop after the error keeps Submit shut (the code crashed)`, gate() === false && moshionRunNeed(run, code) === 'fix', moshionRunNeed(run, code));
  }
  // The timer case keeps animating after the throw (only a frame that throws stops the loop), so
  // the frame must not say "came up" again on the next clean frame.
  const t = runFrame(late({ setup: ['  setTimeout(() => nope(), 1500);'], draw: [] }), { frames: 150, timers: true });
  check('a timer error does not stop the frames, and they never re-open Submit', t.ran === 150 && t.cameUp === 1, `ran ${t.ran} cameUp ${t.cameUp}`);
}

// The three slips a beginner made in the 5.1 walk (2026-11-03), and what the
// student reads: a plain sentence first, the engine's message kept after it.
// Each has a negative twin, so a sentence cannot fire where it would mislead.
const sketch = (...body) => body.join('\n') + '\n';
const hintOf = (r) => JSON.stringify(r.errors.map((e) => ({ name: e.name, message: e.message, hint: e.hint, line: e.line })));
console.log('a plain first sentence for the slips beginners make');
{
  const r = runFrame(sketch(
    'let player;', '', 'function setup() {', '  new Canvas(400, 400);',
    '  player = new Sprite(200, 200, 40, 40;', '}', '', 'function draw() {', "  background('#222');", '}'));
  check('the model reports a parse error the way Chrome does (calibration)',
    r.errorEvents.length === 1 && /^Uncaught SyntaxError: Failed to execute 'appendChild' on 'Node': /.test(r.errorEvents[0].message), JSON.stringify(r.errorEvents.map((e) => e.message)));
  check('a missing ) says "There is a typo near line 5" with the engine\'s words, not "Failed to execute appendChild"',
    r.errors.length === 1 && r.errors[0].name === 'SyntaxError' && r.errors[0].line === 5
      && r.errors[0].message === 'missing ) after argument list'
      && r.errors[0].hint === 'There is a typo near line 5: missing ) after argument list'
      && !/appendChild/.test(r.box) && r.box.startsWith('There is a typo near line 5: missing ) after argument list\nSyntaxError: missing ) after argument list'), hintOf(r) + ' ' + JSON.stringify(r.box));
}
{
  const r = runFrame(sketch('function setup() {', '  new Canvas(400, 400);', '', 'function draw() {', "  background('#222');", '}'));
  check('a missing } is placed on the last line, where the closing half is missing',
    r.errors.length === 1 && r.errors[0].line === 6 && /^There is a typo near line 6: /.test(r.errors[0].hint || ''), hintOf(r));
}
{
  // Not a typo: the sketch parses, and a SyntaxError thrown while it runs
  // (JSON.parse of a bad string) must keep its own line and no typo sentence.
  const r = runFrame(sketch('function setup() {', '  new Canvas(200, 200);', "  JSON.parse('{oops');", '}'));
  check('a SyntaxError thrown at run time is not called a typo',
    r.errors.length === 1 && r.errors[0].name === 'SyntaxError' && r.errors[0].line === 3 && !r.errors[0].hint, hintOf(r));
}
{
  const r = runFrame(sketch(
    'let player;', '', 'function setup() {', '  new Canvas(400, 400);',
    '  player = Sprite(200, 200, 40, 40);', '}'));
  check('Sprite(...) without new says "Put the word new in front: new Sprite(...)", engine message kept, line 5',
    r.errors.length === 1 && r.errors[0].name === 'TypeError' && r.errors[0].line === 5
      && r.errors[0].message === "Class constructor Sprite cannot be invoked without 'new'"
      && r.errors[0].hint === 'Put the word new in front: new Sprite(...).'
      && r.box.startsWith("Put the word new in front: new Sprite(...).\nTypeError: Class constructor Sprite cannot be invoked without 'new'"), hintOf(r) + ' ' + JSON.stringify(r.box));
}
{
  const r = runFrame(sketch(
    'let player;', '', 'function setup() {', '  new Canvas(400, 400);',
    '  player = new Sprite(200, 200, 40, 40);', '  player.color = deepskyblue;', '}'));
  check('an unquoted colour says "The word deepskyblue is not defined ... put quotes around it", line 6',
    r.errors.length === 1 && r.errors[0].name === 'ReferenceError' && r.errors[0].line === 6
      && r.errors[0].message === 'deepskyblue is not defined'
      && r.errors[0].hint === 'The word deepskyblue is not defined. If it is a colour or text, put quotes around it.'
      && r.box.startsWith('The word deepskyblue is not defined. If it is a colour or text, put quotes around it.\nReferenceError: deepskyblue is not defined'), hintOf(r) + ' ' + JSON.stringify(r.box));
}
{
  // Quotes would make these worse: a misspelt command, a misspelt name.
  const r1 = runFrame(sketch('function setup() {', '  new Canvas(400, 400);', '}', 'function draw() {', "  bakground('#222');", '}'));
  check('a misspelt command (bakground(...)) gets no quotes advice',
    r1.errors.length === 1 && r1.errors[0].message === 'bakground is not defined' && !r1.errors[0].hint && r1.box === 'ReferenceError: bakground is not defined  @ sketch.js:5:3', hintOf(r1) + ' ' + JSON.stringify(r1.box));
  const r2 = runFrame(sketch('let player;', 'function setup() {', '  new Canvas(400, 400);', '  player = new Sprite(200, 200, 40, 40);', "  plyer.color = 'red';", '}'));
  check('a misspelt name used with a dot (plyer.color) gets no quotes advice',
    r2.errors.length === 1 && r2.errors[0].message === 'plyer is not defined' && !r2.errors[0].hint, hintOf(r2));
}
{
  // Errors that are not one of the slips keep exactly what they said before.
  const r = runFrame(sketch('function setup() {', '  new Canvas(200, 200);', "  throw new Error('boom in setup');", '}'));
  check('any other error gets no sentence and an unchanged red box',
    r.errors.length === 1 && !r.errors[0].hint && r.box === 'Error: boom in setup  @ sketch.js:3:9', hintOf(r) + ' ' + JSON.stringify(r.box));
  const r2 = runFrame(sketch('let s;', 'function setup() {', '  new Canvas(200, 200);', '  s.pos.x = 3;', '}'));
  check('an ordinary TypeError (reading a property of undefined) gets no sentence',
    r2.errors.length === 1 && r2.errors[0].name === 'TypeError' && r2.errors[0].line === 4 && !r2.errors[0].hint, hintOf(r2));
}

console.log(failed ? `\n${failed} FAILED` : '\nall runner error checks passed');
process.exit(failed ? 1 : 0);
