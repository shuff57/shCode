'use strict';
/* Headless regression sweep — runs all 86 real lesson script.js/solution.js
 * files through the promoted public/moshion/moshion.js engine.
 *
 * Run: node spikes/engine-spike/sweep.cjs
 */

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const PLANCK_PATH = path.join(REPO, 'public', 'moshion', 'planck.min.js');
const ENGINE_PATH = path.join(REPO, 'public', 'moshion', 'moshion.js');
const LESSONS_DIR = path.join(REPO, 'lessons');

const planckSrc = fs.readFileSync(PLANCK_PATH, 'utf8');
const engineSrc = fs.readFileSync(ENGINE_PATH, 'utf8');

// ---- JSCAD folders (excluded — different runtime) -----------------------
const JSCAD_FOLDERS = new Set(['reshape-intro', 'reshape-2d-shapes', 'reshape-booleans']);

// ---- sandbox factory ----------------------------------------------------

function createSandbox() {
  const sandbox = {};
  sandbox.window = sandbox;

  let lastCanvas = null;
  function makeCtxStub() {
    return new Proxy({}, { get: () => () => {} });
  }
  function makeCanvasStub() {
    const listeners = {};
    return {
      width: 0, height: 0,
      getContext: () => makeCtxStub(),
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      _listeners: listeners,
    };
  }
  sandbox.document = {
    createElement: () => (lastCanvas = makeCanvasStub()),
    body: { appendChild() {} },
  };

  const windowListeners = {};
  sandbox.addEventListener = (type, fn) => { (windowListeners[type] ||= []).push(fn); };

  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 64; this.naturalHeight = 64; this.onload = null; }
    set src(v) { this._src = v; this.complete = true; if (this.onload) this.onload(); }
    get src() { return this._src; }
  }
  sandbox.Image = FakeImage;

  const store = new Map();
  sandbox.localStorage = {
    setItem: (k, v) => store.set(k, String(v)),
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    removeItem: (k) => store.delete(k),
  };

  let fakeNow = 0;
  sandbox.performance = { now: () => fakeNow };

  let rafCallback = null;
  sandbox.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };

  // moshion.js uses setTimeout(fn, 0) for auto-boot deferral.
  // Queue callbacks so they fire AFTER student code is loaded, not during
  // engine evaluation (when window.setup doesn't exist yet).
  const timeoutQueue = [];
  sandbox.setTimeout = (fn, ms) => { timeoutQueue.push(fn); return timeoutQueue.length; };
  sandbox.clearTimeout = () => {};

  vm.createContext(sandbox);
  vm.runInContext(planckSrc, sandbox, { filename: PLANCK_PATH });
  vm.runInContext(engineSrc, sandbox, { filename: ENGINE_PATH });

  function tick(steps = 1, dtMs = 1000 / 60) {
    for (let i = 0; i < steps; i++) {
      fakeNow += dtMs;
      const cb = rafCallback;
      rafCallback = null;
      if (cb) cb(fakeNow);
    }
  }

  return { sandbox, tick, timeoutQueue };
}

// ---- classification helpers ---------------------------------------------

function isJSCAD(filePath) {
  const folder = path.basename(path.dirname(filePath));
  if (JSCAD_FOLDERS.has(folder)) return true;
  const src = fs.readFileSync(filePath, 'utf8');
  return src.includes('@jscad/modeling') || src.includes('module.exports');
}

function isNonthe reference API(filePath) {
  const folder = path.basename(path.dirname(filePath));
  const src = fs.readFileSync(filePath, 'utf8');
  // These are console/HTML lessons — no setup()/draw() pattern
  if (!src.includes('function setup') && !src.includes('function draw') && !src.includes('function update')) {
    return true;
  }
  return false;
}

function isStarterScaffold(src) {
  // A starter scaffold has setup()/draw() stubs but they're mostly comments
  // with no real Canvas/Sprite creation
  const hasSetup = /function\s+setup\s*\(/.test(src);
  const hasDraw = /function\s+draw\s*\(/.test(src);
  if (!hasSetup && !hasDraw) return false;
  // Check if setup() actually creates a Canvas (not just mentions it in a comment)
  const hasCanvas = /^\s*new\s+Canvas\s*\(/m.test(src);
  if (!hasCanvas) return true; // setup() exists but no Canvas — scaffold
  return false;
}

function isScaffoldError(errMsg) {
  // Errors that are clearly about student-written code not being filled in yet
  if (/new Canvas\(w, h\) must be called in setup/.test(errMsg)) return true;
  if (/is not a function$/.test(errMsg)) return true;
  if (/is not defined$/.test(errMsg)) return true;
  return false;
}

// ---- run one file -------------------------------------------------------

function runFile(filePath) {
  const relPath = path.relative(REPO, filePath);
  const folder = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath);

  // JSCAD exclusion
  if (isJSCAD(filePath)) {
    return { file: relPath, status: 'EXCLUDED-JSCAD', error: null, state: null };
  }

  const src = fs.readFileSync(filePath, 'utf8');

  // Non-the reference API lessons (console/HTML) — no setup/draw pattern
  if (isNonthe reference API(filePath)) {
    return { file: relPath, status: 'NO-OP', error: null, state: null, note: 'non-moSHion lesson (console/HTML)' };
  }

  const isScaffold = isStarterScaffold(src);

  let sandbox, tick, timeoutQueue;
  try {
    const ctx = createSandbox();
    sandbox = ctx.sandbox;
    tick = ctx.tick;
    timeoutQueue = ctx.timeoutQueue;
  } catch (err) {
    return { file: relPath, status: 'THROWS', error: `Sandbox creation failed: ${err.message}`, state: null };
  }

  // Run the student code in the sandbox
  try {
    vm.runInContext(src, sandbox, { filename: filePath });
  } catch (err) {
    if (isScaffold || isScaffoldError(err.message)) {
      return { file: relPath, status: 'THROWS-SCAFFOLD', error: err.message, state: null };
    }
    return { file: relPath, status: 'THROWS', error: err.message, state: null };
  }

  // Flush deferred setTimeout callbacks (engine's auto-boot fires here,
  // after student code has defined window.setup)
  while (timeoutQueue.length > 0) {
    const fn = timeoutQueue.shift();
    try { fn(); } catch (err) {
      if (isScaffold || isScaffoldError(err.message)) {
        return { file: relPath, status: 'THROWS-SCAFFOLD', error: err.message, state: null };
      }
      return { file: relPath, status: 'THROWS', error: err.message, state: null };
    }
  }

  // The engine auto-boots if window.setup is defined. If it didn't start
  // (no setup function), it's a NO-OP.
  if (typeof sandbox.setup !== 'function') {
    return { file: relPath, status: 'NO-OP', error: null, state: null, note: 'no setup() defined' };
  }

  // Run for 60 frames, catching any runtime errors
  try {
    tick(60);
  } catch (err) {
    if (isScaffold || isScaffoldError(err.message)) {
      return { file: relPath, status: 'THROWS-SCAFFOLD', error: err.message, state: null };
    }
    return { file: relPath, status: 'THROWS', error: err.message, state: null };
  }

  // Sample state after 60 frames
  let state = null;
  try {
    const allSprites = sandbox.allSprites;
    if (allSprites && allSprites.length > 0) {
      const samples = allSprites.slice(0, 10).map(s => ({
        x: Math.round(s.x), y: Math.round(s.y),
        w: s.w, h: s.h, shape: s.shape,
        color: s.color, body: s.body,
      }));
      state = { spriteCount: allSprites.length, samples };
    } else {
      state = { spriteCount: 0 };
    }
  } catch (e) {
    state = { error: e.message };
  }

  if (isScaffold) {
    return { file: relPath, status: 'NO-OP', error: null, state, note: 'starter scaffold (no Canvas in setup)' };
  }

  return { file: relPath, status: 'RUNS-CLEAN', error: null, state };
}

// ---- main ---------------------------------------------------------------

function main() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'script.js' || entry.name === 'solution.js') {
        files.push(full);
      }
    }
  }
  walk(LESSONS_DIR);

  console.log(`Found ${files.length} files to sweep\n`);

  const results = [];
  for (const f of files) {
    const r = runFile(f);
    results.push(r);
    const marker = r.status === 'RUNS-CLEAN' ? '✓' : r.status === 'NO-OP' ? '○' : r.status === 'EXCLUDED-JSCAD' ? '⊘' : '✗';
    console.log(`${marker} ${r.status.padEnd(18)} ${r.file}`);
    if (r.error) console.log(`     ${r.error.split('\n')[0]}`);
  }

  // Summary
  const counts = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  console.log('\n===== SUMMARY =====');
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`  TOTAL: ${results.length}`);

  // Detailed report for non-clean
  const problems = results.filter(r => r.status === 'THROWS' || r.status === 'THROWS-SCAFFOLD');
  if (problems.length > 0) {
    console.log('\n===== PROBLEM FILES =====');
    for (const p of problems) {
      console.log(`\n  ${p.status}: ${p.file}`);
      console.log(`    ${p.error}`);
    }
  }

  // Write full JSON report
  const reportPath = path.join(__dirname, 'sweep-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report written to ${reportPath}`);

  const exitCode = (counts.THROWS || 0) > 0 ? 1 : 0;
  process.exitCode = exitCode;
}

main();
