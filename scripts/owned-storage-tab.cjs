// One browser TAB for scripts/test-owned-storage.mjs (forked by owned-storage-harness.mjs).
//
// It runs the app's real modules (compiled by the harness from lib/*.ts) against:
//  * a localStorage that lives in a JSON file shared by every tab of the same "browser",
//    re-read on every call, with a byte quota and injectable failures;
//  * a document.cookie the parent ("the browser") pushes to every tab when it changes,
//    exactly as one cookie jar is seen by every tab in a real browser;
//  * a fetch that hands each request to the parent, which runs the REAL Pages middleware
//    (functions/_middleware.ts) on it with the browser's cookies.
//
// The parent sends { id, code } and gets back { id, ok, value | error }. `code` is the
// body of an async function of (M, T): M the app's modules, T test helpers.

const fs = require('node:fs');
const path = require('node:path');

const outDir = process.env.OS_OUT;
const storeFile = process.env.OS_STORE;
const quota = Number(process.env.OS_QUOTA || 0) || Infinity;
let failPattern = null;

function readAll() {
  try { return JSON.parse(fs.readFileSync(storeFile, 'utf8')); } catch { return {}; }
}
function writeAll(all) {
  fs.writeFileSync(storeFile, JSON.stringify(all));
}
function bytes(all) {
  let n = 0;
  for (const [k, v] of Object.entries(all)) n += (k.length + v.length) * 2;
  return n;
}
const localStorage = {
  getItem(k) { const all = readAll(); return Object.prototype.hasOwnProperty.call(all, k) ? all[k] : null; },
  setItem(k, v) {
    if (failPattern && new RegExp(failPattern).test(k)) {
      const e = new Error('injected failure'); e.name = 'SecurityError'; throw e;
    }
    const all = readAll();
    const next = { ...all, [k]: String(v) };
    if (bytes(next) > quota) {
      const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; e.code = 22; throw e;
    }
    writeAll(next);
  },
  removeItem(k) { const all = readAll(); delete all[k]; writeAll(all); },
  key(i) { return Object.keys(readAll())[i] ?? null; },
  get length() { return Object.keys(readAll()).length; },
};
const session = new Map();
const sessionStorage = {
  getItem: (k) => (session.has(k) ? session.get(k) : null),
  setItem: (k, v) => { session.set(k, String(v)); },
  removeItem: (k) => { session.delete(k); },
  key: (i) => [...session.keys()][i] ?? null,
  get length() { return session.size; },
};

let cookie = process.env.OS_COOKIE || '';
const listeners = {};
const docListeners = {};
globalThis.window = globalThis;
globalThis.localStorage = localStorage;
globalThis.sessionStorage = sessionStorage;
let reloads = 0;
globalThis.location = { origin: 'http://localhost', href: 'http://localhost/', reload() { reloads++; } };
globalThis.document = {
  get cookie() { return cookie; },
  set cookie(_v) { /* the page never sets it in these tests */ },
  visibilityState: 'visible',
  addEventListener(t, fn) { (docListeners[t] ||= []).push(fn); },
  removeEventListener(t, fn) { docListeners[t] = (docListeners[t] || []).filter((f) => f !== fn); },
};
globalThis.addEventListener = (t, fn) => { (listeners[t] ||= []).push(fn); };
globalThis.removeEventListener = (t, fn) => { listeners[t] = (listeners[t] || []).filter((f) => f !== fn); };
globalThis.dispatchEvent = () => true;

// navigator: onLine follows T.setOnline; locks is one Web Locks manager per "browser",
// held by the parent so two tab processes really contend for it.
let lseq = 0;
const lockWait = new Map();
const navigatorFake = {
  get onLine() { return online; },
  locks: {
    request(name, opts, cb) {
      if (typeof opts === 'function') { cb = opts; opts = {}; }
      if (noLocks) return Promise.resolve(cb({ name }));
      return new Promise((resolve, reject) => {
        const id = ++lseq;
        lockWait.set(id, async (granted) => {
          try { resolve(await cb(granted ? { name } : null)); } catch (e) { reject(e); } finally {
            if (granted) process.send({ lockRelease: { name } });
          }
        });
        process.send({ lock: { id, name, ifAvailable: !!opts.ifAvailable } });
      });
    },
  },
};
let noLocks = false;
Object.defineProperty(globalThis, 'navigator', { value: navigatorFake, configurable: true, writable: true });

// fetch -> the parent's real middleware
let seq = 0;
const pending = new Map();
var online = true;
globalThis.fetch = (input, init = {}) => {
  if (!online) return Promise.reject(new TypeError('Failed to fetch'));
  const url = typeof input === 'string' ? input : input.url;
  const headers = {};
  new Headers(init.headers || {}).forEach((v, k) => { headers[k] = v; });
  const id = `f${++seq}`;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    process.send({ fetch: { id, url, method: init.method || 'GET', headers, body: typeof init.body === 'string' ? init.body : null, keepalive: !!init.keepalive } });
  });
};

function load(rel) { return require(path.join(outDir, rel)); }
let M = null;
function modules() {
  if (M) return M;
  M = {
    owned: load('lib/owned-storage.js'),
    vc: load('lib/version-control.js'),
    store: load('lib/store.js'),
    sync: load('lib/lesson-sync.js'),
    records: load('lib/work-records.js'),
    history: load('lib/local-history.js'),
    moshion: load('lib/moshion-storage.js'),
    starter: load('lib/starter-variants.js'),
    carry: load('lib/carry-forward.js'),
    games: load('lib/games-client.js'),
    guest: load('lib/guest-work.js'),
    guard: load('lib/owner-guard.js'),
    auth: load('lib/auth.js'),
    ownerFetch: load('lib/owner-fetch.js'),
    autosave: load('lib/draft-autosave.js'),
    outbox: load('lib/outbox.js'),
    senders: load('lib/outbox-senders.js'),
    outboxPage: load('lib/outbox-page.js'),
    offline: load('lib/offline.js'),
    grader: load('lib/written-grader-store.js'),
    draftSync: load('lib/draft-sync.js'),
    draftCore: load('lib/draft-sync-core.js'),
  };
  return M;
}

const T = {
  get reloads() { return reloads; },
  session: sessionStorage,
  setOnline(v, { silent = false } = {}) {
    const was = online;
    online = v;
    if (was !== v && !silent) for (const fn of [...(listeners[v ? 'online' : 'offline'] || [])]) fn();
  },
  setVisible(v) {
    globalThis.document.visibilityState = v ? 'visible' : 'hidden';
    for (const fn of [...(docListeners.visibilitychange || [])]) fn();
  },
  noLocks(v = true) { noLocks = v; },
  listenerCount() {
    return Object.values(listeners).reduce((n, l) => n + l.length, 0) + Object.values(docListeners).reduce((n, l) => n + l.length, 0);
  },
  /** Require a compiled module again, from scratch, and report what it started. */
  freshLoad(rel) {
    const file = require.resolve(path.join(outDir, rel));
    delete require.cache[file];
    const before = new Set(process.getActiveResourcesInfo());
    const n = this.listenerCount();
    require(file);
    const after = process.getActiveResourcesInfo().filter((r) => !before.has(r));
    return { resources: after, listeners: this.listenerCount() - n };
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  failWrites(pattern) { failPattern = pattern; },
  hide() { for (const fn of listeners.pagehide || []) fn(); },
  raw: localStorage,
};

process.on('message', async (msg) => {
  if (msg.cookie !== undefined) { cookie = msg.cookie; return; }
  if (msg.lockGrant) {
    const w = lockWait.get(msg.lockGrant.id);
    lockWait.delete(msg.lockGrant.id);
    w?.(msg.lockGrant.granted);
    return;
  }
  if (msg.fetchReply) {
    const r = msg.fetchReply;
    const resolve = pending.get(r.id);
    pending.delete(r.id);
    resolve?.(new Response(r.body, { status: r.status, headers: r.headers }));
    return;
  }
  if (msg.code) {
    try {
      const fn = new (Object.getPrototypeOf(async function () {}).constructor)('M', 'T', msg.code);
      const value = await fn(modules(), T);
      process.send({ id: msg.id, ok: true, value: value === undefined ? null : value });
    } catch (e) {
      process.send({ id: msg.id, ok: false, error: String(e && e.stack || e) });
    }
  }
});
process.on('disconnect', () => process.exit(0));
process.send({ ready: true });
