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
import { signSession, workOwnerFor } from '../functions/_shared/auth.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SECRET = 'test-secret-for-owned-storage';

const MODULES = [
  'store', 'lesson-sync', 'work-records', 'guest-work', 'owner-guard', 'auth', 'owner-fetch', 'local-history',
  'moshion-storage', 'starter-variants', 'carry-forward', 'games-client', 'draft-autosave', 'library-sync',
  'owned-storage', 'version-control',
].map((m) => `lib/${m}.ts`);

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
  return { email, wo: await workOwnerFor(email, SECRET) };
}

/**
 * One browser: shared storage file and cookie jar, any number of tabs.
 * server.rows: { [email]: { [lessonId]: { files, revision } } } (lesson-sync)
 * server.writes: every request the middleware let through, with the account it ran as.
 */
export function createBrowser({ quota = 0, db = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shcode-browser-'));
  const storeFile = path.join(dir, 'localStorage.json');
  fs.writeFileSync(storeFile, '{}');
  const tabs = [];
  const jar = { session: null, owner: null };
  const server = { rows: {}, writes: [], refused: [], drafts: {} };
  const cookieHeader = () => [jar.session && `shcode_session=${jar.session}`, jar.owner && `shcode_owner=${jar.owner}`]
    .filter(Boolean).join('; ');
  // The DB the middleware reads for a session with no `wo` claim.
  const DB = db ?? {
    prepare() { return { bind() { return { first: async () => null, run: async () => ({}) }; } }; },
  };

  async function routes(req, email) {
    const u = new URL(req.url);
    const m = /^\/api\/lesson-sync\/([^/]+)$/.exec(u.pathname);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const mine = (server.rows[email] ||= {});
      if (req.method === 'GET') {
        const row = mine[id];
        return Response.json(row ? { files: row.files, revision: row.revision, updatedAt: 1 } : { files: null, revision: 0, updatedAt: null });
      }
      const body = await req.json();
      const row = mine[id];
      if ((row?.revision ?? 0) !== body.baseRevision) {
        return Response.json({ files: row?.files ?? null, revision: row?.revision ?? 0, updatedAt: 1 }, { status: 409 });
      }
      mine[id] = { files: body.files, revision: (row?.revision ?? 0) + 1 };
      return Response.json({ revision: mine[id].revision, updatedAt: 2 });
    }
    if (u.pathname.startsWith('/api/lesson-submissions') || u.pathname.startsWith('/api/lesson-drafts/')) {
      const body = req.method === 'GET' ? null : await req.text();
      (server.drafts[email] ||= []).push({ path: u.pathname, body });
      return Response.json({ ok: true });
    }
    if (u.pathname === '/api/me') return Response.json({ email, role: 'student' });
    if (u.pathname === '/api/accept-terms') {
      (server.terms ||= []).push(email);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  async function handleFetch(f) {
    const url = new URL(f.url, 'http://localhost').href;
    const headers = new Headers(f.headers);
    headers.set('Cookie', cookieHeader());
    const request = new Request(url, { method: f.method, headers, body: f.method === 'GET' ? undefined : f.body });
    const data = {};
    let ran = null;
    const res = await onRequest({
      request,
      env: { DB, AUTH_SECRET: SECRET },
      data,
      next: async () => { ran = data.email; return routes(request.clone(), data.email); },
      params: {},
      waitUntil() {},
      passThroughOnException() {},
    });
    if (ran) server.writes.push({ email: ran, method: f.method, path: new URL(url).pathname, owner: f.headers['x-work-owner'] ?? null, body: f.body });
    else server.refused.push({ status: res.status, path: new URL(url).pathname, owner: f.headers['x-work-owner'] ?? null });
    // The browser keeps what the response sets, as a real one would.
    let changed = false;
    for (const c of res.headers.getSetCookie()) {
      const m = /^(shcode_session|shcode_owner)=([^;]*);.*?Max-Age=(\d+)/.exec(c);
      if (!m) continue;
      const v = m[3] === '0' ? null : m[2];
      if (m[1] === 'shcode_session') jar.session = v; else jar.owner = v;
      changed = true;
    }
    if (changed) pushCookie();
    const h = {};
    res.headers.forEach((v, k) => { if (k !== 'set-cookie') h[k] = v; });
    return { status: res.status, headers: h, body: await res.text() };
  }

  function pushCookie() {
    const c = cookieHeader().replace(/shcode_session=[^;]*(; )?/, ''); // HttpOnly: pages cannot read it
    for (const t of tabs) if (t.alive) t.child.send({ cookie: c });
  }

  const browser = {
    storeFile,
    server,
    /**
     * Sign in as `acct` (both cookies set together, as login.ts does). `ownerCookie: false`
     * models a browser holding the session but not the owner cookie (a page served from a
     * cache the server never saw, or the cookie deleted by hand).
     */
    async signIn(acct, { ownerCookie = true } = {}) {
      jar.session = await signSession(acct.email, 'student', SECRET);
      jar.owner = ownerCookie ? acct.wo : null;
      pushCookie();
    },
    jar,
    /** Sign out (both cookies cleared together, as logout.ts does). */
    signOut() { jar.session = null; jar.owner = null; pushCookie(); },
    /** The raw localStorage contents. */
    storage() { return JSON.parse(fs.readFileSync(storeFile, 'utf8')); },
    setStorage(obj) { fs.writeFileSync(storeFile, JSON.stringify(obj)); },
    /** Open a tab. It reads the cookie as it is NOW, like a page load. */
    async open(name = `tab${tabs.length}`) {
      const child = fork(path.join(root, 'scripts', 'owned-storage-tab.cjs'), [], {
        env: {
          ...process.env, NODE_OPTIONS: '',
          OS_OUT: compile(), OS_STORE: storeFile, OS_QUOTA: String(quota),
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
  if (compiled) fs.rmSync(compiled, { recursive: true, force: true });
  compiled = null;
}
