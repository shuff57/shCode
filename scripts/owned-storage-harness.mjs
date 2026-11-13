// Shared harness for the per-account storage tests (scripts/test-owned-storage.mjs).
//
// A "browser" is one localStorage file plus one cookie jar. A "tab" is a forked Node
// process (scripts/owned-storage-tab.cjs) running the app's real lib modules, compiled
// here once with tsc (lib/store.ts uses syntax Node's type stripping refuses). Every
// fetch a tab makes is answered by the REAL functions/_middleware.ts with the browser's
// cookies, then by a small in-memory server standing in for the routes behind it.
//
// Everything is torn down by close(); the test process then exits by itself.

import { execFileSync, fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/_middleware.ts';
import { signSession, workKeyFor, workOwnerFor } from '../functions/_shared/auth.ts';
import { fromBase64, openText } from '../lib/work-cipher.ts';

import { compileHandler, makeD1 } from './_d1-sqlite.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SECRET = 'test-secret-for-owned-storage';

const MODULES = [
  'store', 'lesson-sync', 'work-records', 'guest-work', 'owner-guard', 'auth', 'owner-fetch', 'local-history',
  'moshion-storage', 'starter-variants', 'carry-forward', 'games-client', 'draft-autosave', 'library-sync',
  'owned-storage', 'version-control', 'outbox', 'outbox-senders', 'outbox-page', 'offline', 'written-grader-store',
  'draft-sync', 'draft-sync-core', 'work-cipher',
].map((m) => `lib/${m}.ts`);

// The REAL draft routes (stage 3) over a real SQLite with every migration applied.
let draftRoutes = null;
function realDraftRoutes() {
  if (!draftRoutes) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shcode-draft-routes-'));
    draftRoutes = {
      dir,
      'lesson-drafts': compileHandler('api/lesson-drafts/[lessonId].ts', path.join(dir, 'drafts')),
    };
  }
  return draftRoutes;
}
/** A database two browsers ("two computers") can share: createBrowser({ d1 }). */
export function sharedD1() { realDraftRoutes(); return makeD1(); }
/** Compile the draft routes now, so the first request in a test is not seconds slow. */
export function warmDraftRoutes() { realDraftRoutes(); }

let compiled = null;
export function compile() {
  if (compiled) return compiled;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'shcode-owned-'));
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), ...MODULES,
      '--outDir', out, '--rootDir', '.', '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
      '--esModuleInterop', '--moduleResolution', 'node', '--noEmitOnError', 'false',
    ], { cwd: root, stdio: 'pipe' });
  } catch {
    // tsc exits non-zero on type errors under these loose flags but still emits; check below.
  }
  if (!fs.existsSync(path.join(out, 'lib', 'store.js'))) throw new Error('harness: tsc emitted nothing');
  fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), 'dir');
  compiled = out;
  return out;
}

/** An account: its email and the work-owner id the server derives for it. */
export async function account(email) {
  return { email, wo: await workOwnerFor(email, SECRET), wk: await workKeyFor(email, SECRET) };
}

/**
 * One browser: shared storage file and cookie jar, any number of tabs.
 * server.rows: { [email]: { [lessonId]: { files, revision } } } (lesson-sync)
 * server.writes: every request the middleware let through, with the account it ran as.
 */
/**
 * `sealing`: the browser keeps the work-key cookie the server sends (lib/owned-storage.ts seals an
 * account's records with it). Off by default: those tests are the plain path, which is also what a
 * page gets from a server that sends no key. `sealWrites`: the tabs also seal NEW records (step two of
 * the rollout; off in the shipped code). KEYED=1 in the environment = key cookie, sealing off (what ships
 * now); SEALED=1 = key cookie and sealing on (step two).
 */
export function createBrowser({ quota = 0, db = null, d1 = null, sealing = process.env.SEALED === '1' || process.env.KEYED === '1', sealWrites = sealing && process.env.KEYED !== '1' } = {}) {
  // lesson_drafts, served by the real handler. Made on first use.
  let draftDb = d1;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shcode-browser-'));
  const storeFile = path.join(dir, 'localStorage.json');
  fs.writeFileSync(storeFile, '{}');
  const tabs = [];
  const jar = { session: null, owner: null, key: null };
  // owner id -> key, for every account that signed in here, so the tests can look inside sealed records.
  const knownKeys = new Map();
  // history: Cloud history rows the real route would write (a Save, never an `auto` upload).
  // holds: requests parked until released (browser.hold). answer: a scripted reply that runs
  // before the routes (a 500, a 401 from a route...), or null to fall through.
  const server = { rows: {}, writes: [], refused: [], drafts: {}, history: {}, holds: [], answer: null, puts: [] };
  const cookieHeader = () => [jar.session && `shcode_session=${jar.session}`, jar.owner && `shcode_owner=${jar.owner}`, jar.key && `shcode_wk=${jar.key}`]
    .filter(Boolean).join('; ');
  // The DB the middleware reads for a session with no `wo` claim.
  const DB = db ?? {
    prepare() { return { bind() { return { first: async () => null, run: async () => ({}) }; } }; },
  };

  // As the real route: this revision has a Cloud history row (a Save, not an upload by itself).
  const versioned = (email, id, revision) => (server.history[email]?.[id] ?? []).includes(revision);
  async function routes(req, email) {
    const u = new URL(req.url);
    const m = /^\/api\/lesson-sync\/([^/]+)$/.exec(u.pathname);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const mine = (server.rows[email] ||= {});
      if (req.method === 'GET') {
        const row = mine[id];
        return Response.json(row ? { files: row.files, revision: row.revision, updatedAt: 1, versioned: versioned(email, id, row.revision) } : { files: null, revision: 0, updatedAt: null });
      }
      const body = await req.json();
      const row = mine[id];
      server.puts.push({ email, id, files: body.files, baseRevision: body.baseRevision, auto: body.auto === true, keys: Object.keys(body) });
      if ((row?.revision ?? 0) !== body.baseRevision) {
        return Response.json({ conflict: true, files: row?.files ?? null, revision: row?.revision ?? 0, updatedAt: row?.updatedAt ?? 1, versioned: versioned(email, id, row?.revision ?? 0) }, { status: 409 });
      }
      mine[id] = { files: body.files, revision: (row?.revision ?? 0) + 1, updatedAt: Date.now() };
      if (body.auto !== true) ((server.history[email] ||= {})[id] ||= []).push(mine[id].revision);
      return Response.json({ revision: mine[id].revision, updatedAt: mine[id].updatedAt });
    }
    const dm = /^\/api\/(lesson-drafts)\/([^/]+)$/.exec(u.pathname);
    if (dm) {
      const body = req.method === 'GET' ? null : await req.clone().text();
      if (dm[1] === 'lesson-drafts' && req.method !== 'GET') (server.drafts[email] ||= []).push({ path: u.pathname, body });
      const h = realDraftRoutes()[dm[1]];
      const fn = { GET: h.onRequestGet, POST: h.onRequestPost, PUT: h.onRequestPut, DELETE: h.onRequestDelete }[req.method];
      if (!fn) return Response.json({ error: 'method' }, { status: 405 });
      draftDb ||= makeD1();
      return fn({ request: req, env: { DB: draftDb }, data: { email }, params: { lessonId: decodeURIComponent(dm[2]) } });
    }
    if (u.pathname.startsWith('/api/lesson-submissions')) {
      const body = req.method === 'GET' ? null : await req.text();
      (server.drafts[email] ||= []).push({ path: u.pathname, body });
      return Response.json({ ok: true });
    }
    if (u.pathname === '/api/me') return Response.json({ email, role: 'student', wo: await workOwnerFor(email, SECRET) });
    if (u.pathname === '/api/accept-terms') {
      (server.terms ||= []).push(email);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  async function handleFetch(f) {
    const url = new URL(f.url, 'http://localhost').href;
    const pathname = new URL(url).pathname;
    for (const h of [...server.holds]) {
      if (h.re.test(`${f.method} ${pathname}`)) {
        server.holds.splice(server.holds.indexOf(h), 1);
        h.reachedResolve();
        await h.gate;
      }
    }
    const headers = new Headers(f.headers);
    headers.set('Cookie', cookieHeader());
    const request = new Request(url, { method: f.method, headers, body: f.method === 'GET' ? undefined : f.body });
    const data = {};
    let ran = null;
    const res = await onRequest({
      request,
      env: { DB, AUTH_SECRET: SECRET },
      data,
      next: async () => {
        ran = data.email;
        const scripted = server.answer ? await server.answer(request.clone(), data.email) : null;
        return scripted ?? routes(request.clone(), data.email);
      },
      params: {},
      waitUntil() {},
      passThroughOnException() {},
    });
    if (ran) server.writes.push({ email: ran, method: f.method, path: new URL(url).pathname, owner: f.headers['x-work-owner'] ?? null, body: f.body, keepalive: !!f.keepalive });
    else server.refused.push({ status: res.status, path: new URL(url).pathname, owner: f.headers['x-work-owner'] ?? null });
    // The browser keeps what the response sets, as a real one would.
    let changed = false;
    for (const c of res.headers.getSetCookie()) {
      const m = /^(shcode_session|shcode_owner|shcode_wk)=([^;]*);.*?Max-Age=(\d+)/.exec(c);
      if (!m) continue;
      const v = m[3] === '0' ? null : m[2];
      if (m[1] === 'shcode_wk') { if (!sealing && v !== null) continue; jar.key = v; }
      else if (m[1] === 'shcode_session') jar.session = v; else jar.owner = v;
      changed = true;
    }
    if (changed) pushCookie();
    const h = {};
    res.headers.forEach((v, k) => { if (k !== 'set-cookie') h[k] = v; });
    return { status: res.status, headers: h, body: await res.text() };
  }

  // One Web Locks manager per browser, shared by its tabs (navigator.locks in the tab).
  const lockState = new Map(); // name -> { held: boolean, queue: [send] }
  function onLock(tab, { id, name, ifAvailable }) {
    const st = lockState.get(name) ?? { held: false, queue: [] };
    lockState.set(name, st);
    const grant = (g) => { if (tab.alive) tab.child.send({ lockGrant: { id, granted: g } }); };
    if (!st.held) { st.held = true; grant(true); return; }
    if (ifAvailable) { grant(false); return; }
    st.queue.push(() => grant(true));
  }
  function onLockRelease({ name }) {
    const st = lockState.get(name);
    if (!st) return;
    const next = st.queue.shift();
    if (next) next(); else st.held = false;
  }

  function pushCookie() {
    const c = cookieHeader().replace(/shcode_session=[^;]*(; )?/, ''); // HttpOnly: pages cannot read it
    for (const t of tabs) if (t.alive) t.child.send({ cookie: c });
  }

  const browser = {
    storeFile,
    server,
    /** The draft route's database (lesson_drafts). */
    get d1() { draftDb ||= makeD1(); return draftDb; },
    /**
     * Sign in as `acct` (both cookies set together, as login.ts does). `ownerCookie: false`
     * models a browser holding the session but not the owner cookie (a page served from a
     * cache the server never saw, or the cookie deleted by hand).
     */
    async signIn(acct, { ownerCookie = true, keyCookie = sealing } = {}) {
      jar.session = await signSession(acct.email, 'student', SECRET);
      jar.owner = ownerCookie ? acct.wo : null;
      // login.ts sets the work key in the same response (keyCookie: false = a browser without it).
      jar.key = keyCookie ? `${acct.wo}.${acct.wk ?? await workKeyFor(acct.email, SECRET)}` : null;
      knownKeys.set(acct.wo, acct.wk ?? await workKeyFor(acct.email, SECRET));
      pushCookie();
    },
    jar,
    /** Sign out (both cookies cleared together, as logout.ts does). */
    signOut() { jar.session = null; jar.owner = null; jar.key = null; pushCookie(); },
    /** The session ends but the owner cookie stays (a session that expired on the server side). */
    expireSession() { jar.session = null; pushCookie(); },
    /**
     * Park the next request whose "METHOD /path" matches `re` until release() is called.
     * `reached` resolves when it arrives.
     */
    hold(re) {
      let release; let reachedResolve;
      const gate = new Promise((r) => { release = r; });
      const reached = new Promise((r) => { reachedResolve = r; });
      server.holds.push({ re, gate, reachedResolve });
      return { release: () => release(), reached };
    },
    /** localStorage exactly as stored (sealed records are unreadable text). */
    rawStorage() { return JSON.parse(fs.readFileSync(storeFile, 'utf8')); },
    /**
     * localStorage as the tests read it: a sealed record `s1:<owner>:<key>` is shown OPENED, under
     * `w1:<owner>:<key>` in the plain envelope shape, when its account signed in on this browser.
     * So one assertion covers both the plain and the sealed run. Where both copies exist the sealed
     * one is shown, as it is for a page.
     */
    storage() {
      const raw = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
      const out = {};
      for (const [k, v] of Object.entries(raw)) if (!k.startsWith('s1:')) out[k] = v;
      for (const [k, v] of Object.entries(raw)) {
        const m = /^s1:([a-z2-7]{16}):(.*)$/s.exec(k);
        if (!m) continue;
        const key = knownKeys.get(m[1]);
        let env = null;
        try { env = JSON.parse(v); } catch { env = null; }
        const text = key && env && typeof env.e === 'string'
          ? openText(fromBase64(key.replace(/-/g, '+').replace(/_/g, '/') + '='), env.e, k) : null;
        if (text === null) { out[k] = v; continue; }
        // The sealed copy is the record, as it is for a page, whatever a plain copy beside it says.
        out[`w1:${m[1]}:${m[2]}`] = JSON.stringify({ v: 1, d: JSON.parse(text), t: env.t, up: null });
      }
      return out;
    },
    setStorage(obj) { fs.writeFileSync(storeFile, JSON.stringify(obj)); },
    /** Open a tab. It reads the cookie as it is NOW, like a page load. */
    async open(name = `tab${tabs.length}`) {
      const child = fork(path.join(root, 'scripts', 'owned-storage-tab.cjs'), [], {
        env: {
          ...process.env, NODE_OPTIONS: '',
          OS_OUT: compile(), OS_STORE: storeFile, OS_QUOTA: String(quota),
          OS_SEAL: sealWrites ? '1' : '0',
          OS_COOKIE: cookieHeader().replace(/shcode_session=[^;]*(; )?/, ''),
        },
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      });
      let n = 0;
      const waiting = new Map();
      const tab = { name, child, alive: true };
      await new Promise((resolve, reject) => {
        child.on('message', async (msg) => {
          if (msg.ready) return resolve();
          if (msg.lock) return onLock(tab, msg.lock);
          if (msg.lockRelease) return onLockRelease(msg.lockRelease);
          if (msg.fetch) {
            const reply = await handleFetch(msg.fetch);
            if (tab.alive) child.send({ fetchReply: { id: msg.fetch.id, ...reply } });
            return;
          }
          const w = waiting.get(msg.id);
          if (!w) return;
          waiting.delete(msg.id);
          if (msg.ok) w.resolve(msg.value); else w.reject(new Error(`${name}: ${msg.error}`));
        });
        child.on('exit', () => { tab.alive = false; });
        child.on('error', reject);
      });
      tab.run = (code) => new Promise((resolve, reject) => {
        const id = ++n;
        waiting.set(id, { resolve, reject });
        child.send({ id, code });
      });
      tab.close = () => new Promise((resolve) => {
        if (!tab.alive) return resolve();
        child.once('exit', () => resolve());
        child.disconnect();
      });
      tabs.push(tab);
      return tab;
    },
    async close() {
      await Promise.all(tabs.map((t) => t.close()));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return browser;
}

export function cleanup() {
  if (draftRoutes) fs.rmSync(draftRoutes.dir, { recursive: true, force: true });
  if (compiled) fs.rmSync(compiled, { recursive: true, force: true });
  compiled = null;
}
