// moshion-harness.mjs — run moSHion sketches headlessly, deterministically, in node.
//
// moshion.js touches ~30 DOM API points and nothing else (planck.js is pure JS),
// so a browser is overkill: we stub the DOM, own the clock, and step the rAF
// loop by hand. Every run of the same sketch produces byte-identical draw ops.
//
// This file is the GATE. Engine builders do not edit it — if a check here is
// wrong, fix the check deliberately, not to make a build pass.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLANCK = join(REPO, 'public', 'moshion', 'planck.min.js');
const MOSHION = join(REPO, 'public', 'moshion', 'moshion.js');

const FRAME_MS = 1000 / 60;

// ---- recording 2D context -------------------------------------------------

// Records every call and state write in order. Draw ops are the observable
// output of a sketch — asserting on them is how we tell "it ran" from "it ran
// and actually drew the thing".
function makeCtx(ops) {
  const state = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
    globalAlpha: 1,
  };
  const methods = [
    'save', 'restore', 'translate', 'rotate', 'scale', 'beginPath', 'closePath',
    'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'fill', 'stroke',
    'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText',
    'drawImage', 'setTransform', 'resetTransform', 'clip', 'quadraticCurveTo',
    'bezierCurveTo', 'setLineDash', 'createLinearGradient', 'measureText',
    // roundRect is real canvas API. It was missing here once, and a builder
    // hand-rolled arcTo corners to avoid tripping the stub — the test double
    // silently dictating the engine's implementation. Stub broadly.
    'roundRect', 'createRadialGradient', 'createPattern', 'drawFocusIfNeeded',
    'isPointInPath', 'getLineDash', 'transform',
  ];
  // A real canvas silently accepts a non-finite transform argument and then
  // draws NOTHING for the rest of the frame — the sprite just vanishes, with
  // no error anywhere. A permissive stub reproduces the "accepts it" half and
  // not the "vanishes" half, so the bug is invisible headlessly. That is
  // exactly how `sprite.scale = 2` shipped broken: it left scale.x undefined,
  // ctx.scale(undefined, undefined) was recorded as a normal op, and every
  // check passed. Treat a NaN transform as the failure it actually is.
  const TRANSFORM_OPS = new Set(['scale', 'translate', 'rotate', 'setTransform', 'transform']);

  // drawImage was deliberately left out of the guard at first, on the
  // reasoning that a bad argument to one draw call only drops one shape while
  // a bad transform corrupts the whole frame. That reasoning was right about
  // blast radius and wrong about detectability: a NaN source rect draws
  // NOTHING and reports nothing, and that is exactly how animated sprites
  // went untested. Now that it has actually happened, the guard is no longer
  // speculative. Only the numeric args are checked; arg 0 is the image.
  const RECT_OPS = new Set(['drawImage']);

  const ctx = {};
  for (const m of methods) {
    ctx[m] = (...args) => {
      if (TRANSFORM_OPS.has(m) && args.some((a) => typeof a !== 'number' || !Number.isFinite(a))) {
        throw new TypeError(
          `ctx.${m}(${args.map(String).join(', ')}) — a non-finite transform argument. ` +
          'In a browser this sets a NaN transform and everything drawn afterwards disappears silently.'
        );
      }
      if (RECT_OPS.has(m) && args.slice(1).some((a) => typeof a !== 'number' || !Number.isFinite(a))) {
        throw new TypeError(
          `ctx.${m}(image, ${args.slice(1).map(String).join(', ')}) — a non-finite rectangle. ` +
          'In a browser this draws nothing at all, with no error.'
        );
      }
      ops.push({ op: m, args: args.map(simplify), fill: state.fillStyle, stroke: state.strokeStyle });
      if (m === 'measureText') return { width: String(args[0] ?? '').length * 6 };
      if (m === 'createLinearGradient') return { addColorStop() {} };
      return undefined;
    };
  }
  for (const k of Object.keys(state)) {
    Object.defineProperty(ctx, k, {
      get: () => state[k],
      set: (v) => { state[k] = v; ops.push({ op: `set:${k}`, args: [simplify(v)] }); },
    });
  }
  return ctx;
}

// Canvas/Image objects would serialize as huge blobs; keep ops comparable.
function simplify(v) {
  if (v && typeof v === 'object') {
    if (v.__isImage) return `<img ${v.src}>`;
    if (v.__isCanvas) return '<canvas>';
    return '<obj>';
  }
  if (typeof v === 'number') return Math.round(v * 1000) / 1000;
  return v;
}

// ---- sandbox --------------------------------------------------------------

export function createSandbox({ width = 800, height = 600 } = {}) {
  const ops = [];
  const consoleLines = [];
  const errors = [];
  const rafQueue = [];
  const timers = [];
  const listeners = new Map(); // target-key -> {type -> [fn]}
  let clock = 0;

  const store = new Map();

  function addListenerFactory(key) {
    return (type, fn) => {
      if (!listeners.has(key)) listeners.set(key, new Map());
      const m = listeners.get(key);
      if (!m.has(type)) m.set(type, []);
      m.get(type).push(fn);
    };
  }

  function makeCanvas() {
    const el = {
      __isCanvas: true,
      width, height,
      style: {},
      getContext: () => ctx2d,
      addEventListener: addListenerFactory('canvas'),
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: el.width, height: el.height, right: el.width, bottom: el.height }),
      toDataURL: () => 'data:,',
      setAttribute: () => {}, appendChild: () => {},
    };
    return el;
  }

  const ctx2d = makeCtx(ops);
  let createdCanvas = null;

  const document = {
    body: { appendChild: (n) => { createdCanvas = createdCanvas || n; }, style: {}, addEventListener: addListenerFactory('body') },
    documentElement: { style: {} },
    createElement: (tag) => (String(tag).toLowerCase() === 'canvas' ? (createdCanvas = makeCanvas()) : { style: {}, appendChild() {}, addEventListener() {}, setAttribute() {} }),
    createElementNS: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: addListenerFactory('document'),
    removeEventListener: () => {},
  };

  // Audio, recorded rather than played. Every call lands in `audioLog` so a
  // check can assert what a sketch actually asked the speakers to do — which
  // is the only observable there is headlessly.
  //
  // play() returns a resolved Promise deliberately: a real browser returns a
  // Promise that REJECTS when autoplay is blocked before a user gesture, and
  // an engine that ignores it produces unhandled rejections in the console of
  // every sketch that makes a sound on frame 1.
  const audioLog = [];
  class FakeAudio {
    constructor(src) {
      this.__isAudio = true;
      this.src = src || '';
      this.volume = 1;
      this.playbackRate = 1;
      this.loop = false;
      this.currentTime = 0;
      this.duration = 1.5;
      this.paused = true;
      this.muted = false;
      audioLog.push({ op: 'new', src: this.src });
    }
    play() { this.paused = false; audioLog.push({ op: 'play', src: this.src, volume: this.volume, loop: this.loop, rate: this.playbackRate }); return Promise.resolve(); }
    pause() { this.paused = true; audioLog.push({ op: 'pause', src: this.src }); }
    load() { audioLog.push({ op: 'load', src: this.src }); }
    cloneNode() { const c = new FakeAudio(this.src); c.volume = this.volume; c.playbackRate = this.playbackRate; c.loop = this.loop; return c; }
    addEventListener(type, fn) { if (type === 'canplaythrough' || type === 'loadedmetadata') timers.push(fn); }
    removeEventListener() {}
  }

  // A Web Audio graph, recorded rather than heard. Every node creation,
  // connection, parameter write and start/stop lands in `audioLog`, which is
  // the only observable there is headlessly.
  //
  // The context starts SUSPENDED, like a real one does before the user has
  // interacted with the page. An engine that assumes 'running' works in
  // testing and is silent in a browser.
  class FakeAudioParam {
    constructor(name, node, value) { this._name = name; this._node = node; this.value = value; }
    setValueAtTime(v, t) { this.value = v; audioLog.push({ op: 'param', node: this._node, name: this._name, set: v, at: t }); return this; }
    linearRampToValueAtTime(v, t) { this.value = v; audioLog.push({ op: 'ramp', node: this._node, name: this._name, to: v, at: t }); return this; }
    cancelScheduledValues(t) { audioLog.push({ op: 'cancel', node: this._node, name: this._name, at: t }); return this; }
  }
  class FakeNode {
    constructor(kind) { this.__kind = kind; audioLog.push({ op: 'create', node: kind }); }
    connect(dest) { audioLog.push({ op: 'connect', from: this.__kind, to: dest && dest.__kind ? dest.__kind : 'destination' }); return dest; }
    disconnect() { audioLog.push({ op: 'disconnect', from: this.__kind }); }
  }
  class FakeAudioContext {
    constructor() {
      this.__isAudioContext = true;
      this.state = 'suspended';
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.destination = new FakeNode('destination');
      audioLog.push({ op: 'context' });
    }
    resume() { this.state = 'running'; audioLog.push({ op: 'resume' }); return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createGain() { const n = new FakeNode('gain'); n.gain = new FakeAudioParam('gain', 'gain', 1); return n; }
    createStereoPanner() { const n = new FakeNode('panner'); n.pan = new FakeAudioParam('pan', 'panner', 0); return n; }
    createBufferSource() {
      const n = new FakeNode('source');
      n.buffer = null;
      n.loop = false;
      n.loopStart = 0;
      n.loopEnd = 0;
      n.playbackRate = new FakeAudioParam('playbackRate', 'source', 1);
      n.onended = null;
      n.start = (when = 0, offset = 0, duration) => {
        n.__started = true;
        audioLog.push({ op: 'start', when, offset, duration, loop: n.loop, rate: n.playbackRate.value });
      };
      n.stop = () => { n.__started = false; audioLog.push({ op: 'stop' }); if (typeof n.onended === 'function') n.onended(); };
      return n;
    }
    decodeAudioData(buf) {
      audioLog.push({ op: 'decode', bytes: buf && buf.byteLength ? buf.byteLength : 0 });
      return Promise.resolve({ duration: 1.5, sampleRate: 48000, numberOfChannels: 2, length: 72000 });
    }
  }

  // Images resolve synchronously with a plausible size so spritesheet slicing
  // runs for real instead of sitting in a never-fired onload.
  class FakeImage {
    constructor() {
      this.__isImage = true;
      // naturalWidth/naturalHeight, not just width/height. The engine slices
      // sprite sheets with `img.naturalWidth / ani.frameCount`, and this stub
      // only ever defined width/height — so fw was NaN and EVERY animated
      // sprite drew with a NaN source rect, silently, for as long as the
      // harness has existed. The comment above claimed slicing "runs for
      // real"; it missed by two property names.
      this.width = 256; this.height = 64;
      this.naturalWidth = 256; this.naturalHeight = 64;
      this.complete = false;
      this._src = '';
      this.onload = null; this.onerror = null;
    }
    get src() { return this._src; }
    set src(v) {
      this._src = v;
      this.complete = true;
      timers.push(() => { if (typeof this.onload === 'function') this.onload(); });
    }
    addEventListener(type, fn) { if (type === 'load') timers.push(fn); }
  }

  const sandbox = {
    console: {
      log: (...a) => consoleLines.push({ type: 'log', text: a.map(String).join(' ') }),
      warn: (...a) => consoleLines.push({ type: 'warn', text: a.map(String).join(' ') }),
      error: (...a) => consoleLines.push({ type: 'error', text: a.map(String).join(' ') }),
      info: (...a) => consoleLines.push({ type: 'info', text: a.map(String).join(' ') }),
    },
    document,
    Image: FakeImage,
    Audio: FakeAudio,
    AudioContext: FakeAudioContext,
    // A sketch fetching an audio file gets plausible bytes back rather than a
    // network error, so the decode path runs for real.
    fetch: (url) =>
      Promise.resolve({
        ok: true,
        status: 200,
        url: String(url),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      }),
    performance: { now: () => clock },
    Date: Object.assign(function Date_() { return new global.Date(0); }, { now: () => clock, prototype: global.Date.prototype }),
    requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame: () => {},
    setTimeout: (fn, _ms) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    addEventListener: addListenerFactory('window'),
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: width, innerHeight: height,
    Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError,
    RangeError, Map, Set, WeakMap, WeakSet, Symbol, Promise, RegExp, isNaN,
    isFinite, parseInt, parseFloat, Infinity, NaN, undefined,
    Float32Array, Float64Array, Int32Array, Uint8Array, ArrayBuffer,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  sandbox.self = sandbox;

  createContext(sandbox);

  // ---- load the engine ----------------------------------------------------
  runInContext(readFileSync(PLANCK, 'utf8'), sandbox, { filename: 'planck.min.js' });
  runInContext(readFileSync(MOSHION, 'utf8'), sandbox, { filename: 'moshion.js' });

  function drainTimers() {
    let guard = 0;
    while (timers.length && guard++ < 1000) {
      const fn = timers.shift();
      try { fn(); } catch (e) { errors.push(e); }
    }
  }

  // Step exactly one animation frame. The engine reads performance.now()
  // deltas, so advancing the clock by a fixed 16.667ms makes physics
  // reproducible run-to-run.
  function step() {
    const cb = rafQueue.shift();
    if (!cb) return false;
    clock += FRAME_MS;
    try { cb(clock); } catch (e) { errors.push(e); return false; }
    drainTimers();
    return true;
  }

  function pump(frames) {
    let ran = 0;
    for (let i = 0; i < frames; i++) { if (!step()) break; ran++; }
    return ran;
  }

  // ---- synthetic input ----------------------------------------------------
  function dispatch(key, type, ev) {
    const m = listeners.get(key);
    if (!m || !m.has(type)) return;
    for (const fn of m.get(type)) { try { fn(ev); } catch (e) { errors.push(e); } }
  }
  const input = {
    keyDown: (k) => dispatch('window', 'keydown', { key: k, preventDefault() {} }),
    keyUp: (k) => dispatch('window', 'keyup', { key: k, preventDefault() {} }),
    mouseMove: (x, y) => dispatch('canvas', 'mousemove', { clientX: x, clientY: y }),
    mouseDown: () => dispatch('canvas', 'mousedown', {}),
    mouseUp: () => dispatch('window', 'mouseup', {}),
  };

  return {
    sandbox, ops, consoleLines, errors, input, audioLog, pump, step, drainTimers,
    get canvas() { return createdCanvas; },
    get frames() { return Math.round(clock / FRAME_MS); },
    run(code, filename = 'sketch.js') {
      try {
        runInContext(code, sandbox, { filename });
      } catch (e) {
        errors.push(e);
        return false;
      }
      drainTimers(); // fires the engine's deferred auto-boot
      return true;
    },
  };
}

// ---- one-shot convenience -------------------------------------------------

/**
 * Run a sketch for N frames and report what happened.
 * Never throws — a broken sketch is data, not an exception.
 */
export function runSketch(code, { frames = 60, filename = 'sketch.js', beforeFrames } = {}) {
  let box;
  try {
    box = createSandbox();
  } catch (e) {
    return { ok: false, phase: 'boot', error: e, ops: [], console: [], frames: 0 };
  }
  const loaded = box.run(code, filename);
  if (!loaded || box.errors.length) {
    return {
      ok: false, phase: 'setup', error: box.errors[0],
      ops: box.ops, console: box.consoleLines, frames: 0, box,
    };
  }
  if (typeof beforeFrames === 'function') beforeFrames(box);
  const ran = box.pump(frames);
  return {
    ok: box.errors.length === 0,
    phase: box.errors.length ? 'frame' : 'done',
    error: box.errors[0] || null,
    ops: box.ops,
    console: box.consoleLines,
    frames: ran,
    box,
  };
}

export { FRAME_MS };
