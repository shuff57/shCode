// components/OwnerNotices.tsx, rendered for real (react-dom in jsdom), in a browser whose
// storage refuses every write (lib/owned-storage.ts reports it as 'blocked'):
//  * the "This browser is not letting the page save your work..." notice appears ONCE,
//    however many writes fail, including writes refused before the notice mounted;
//  * once the student presses OK it stays gone for the rest of the page's life;
//  * nothing shows while storage works.
//
// Run: node scripts/test-owner-notices.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'shcode-notices-'));
try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'components/OwnerNotices.tsx',
    '--outDir', out, '--rootDir', '.', '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    '--esModuleInterop', '--moduleResolution', 'node', '--jsx', 'react-jsx', '--noEmitOnError', 'false',
  ], { cwd: root, stdio: 'pipe' });
} catch { /* emits even with type errors under these flags; checked below */ }
if (!fs.existsSync(path.join(out, 'components', 'OwnerNotices.js'))) { console.error('FAIL tsc emitted nothing'); process.exit(1); }
fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
fs.symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), 'dir');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let storageWorks = false;
let refusing = null; // a readable store whose writes are refused (not out of space)
// This browser refuses storage: even reading window.localStorage throws (as in some
// privacy modes and opaque origins), until a scenario turns it on.
const realLocal = dom.window.localStorage;
Object.defineProperty(dom.window, 'localStorage', { configurable: true, get() { if (refusing) return refusing; if (!storageWorks) throw new Error('SecurityError'); return realLocal; } });
dom.window.fetch = async (url) => (String(url).includes('/api/me')
  ? new dom.window.Response('{"error":"Not signed in"}', { status: 401, headers: { 'Content-Type': 'application/json' } })
  : new dom.window.Response('{}', { status: 404 }));
if (!dom.window.Response) dom.window.Response = Response;
globalThis.fetch = (...a) => dom.window.fetch(...a);

const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');

let failed = 0;
const check = (name, ok) => { if (ok) return; failed++; console.error('FAIL ' + name); };
const notices = () => [...document.querySelectorAll('[data-owner-notice="blocked"]')];

function fresh() {
  for (const k of Object.keys(require.cache)) if (k.startsWith(out)) delete require.cache[k];
  return {
    Notices: require(path.join(out, 'components', 'OwnerNotices.js')),
    owned: require(path.join(out, 'lib', 'owned-storage.js')),
  };
}

async function mount(Notices) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => { r.render(React.createElement(Notices.default)); });
  await act(async () => { await new Promise((res) => setTimeout(res, 20)); });
  return { host, unmount: () => act(async () => { r.unmount(); host.remove(); }) };
}

// 1. Storage refuses writes after the notice is up.
{
  const { Notices, owned } = fresh();
  const m = await mount(Notices);
  check('nothing shown before a write fails', notices().length === 0);
  await act(async () => {
    owned.ownedLocal.setItem('written:W1', 'one');
    owned.ownedLocal.setItem('quiz:Q1', 'two');
    owned.ownedLocal.setJSON('progress:L1', { fileContents: {} });
  });
  check('blocked notice shown exactly once for three refused writes', notices().length === 1);
  check('blocked notice says so in plain words',
    notices()[0]?.textContent.includes('This browser is not letting the page save your work on this computer. Keep this tab open and use Save to send it to your account.'));
  check('the notice is announced as a status', notices()[0]?.getAttribute('role') === 'status');
  const ok = [...notices()[0].querySelectorAll('button')].find((b) => b.textContent === 'OK');
  await act(async () => { ok.click(); });
  check('OK hides it', notices().length === 0);
  await act(async () => { owned.ownedLocal.setItem('written:W1', 'three'); owned.ownedLocal.setItem('written:W1', 'four'); });
  check('it never comes back on this page', notices().length === 0);
  await m.unmount();
}

// 2. A write refused before the notice mounted still shows it, once.
{
  const { Notices, owned } = fresh();
  owned.ownedLocal.setItem('written:W1', 'early');
  const m = await mount(Notices);
  check('a refusal before mount is shown', notices().length === 1);
  await act(async () => { owned.ownedLocal.setItem('written:W1', 'later'); });
  check('and still only once', notices().length === 1);
  await m.unmount();
}

// 2b. Storage that can be read but refuses the write (not a full store): same notice, once.
{
  refusing = {
    getItem: () => null, removeItem() {}, key: () => null, length: 0,
    setItem() { const e = new Error('The operation is insecure.'); e.name = 'SecurityError'; throw e; },
  };
  const { Notices, owned } = fresh();
  const m = await mount(Notices);
  await act(async () => {
    check('a refused write answers blocked', owned.ownedLocal.setItem('written:W1', 'x') === 'blocked');
    owned.ownedLocal.setItem('written:W1', 'y');
  });
  check('a refused (not full) write shows the notice once', notices().length === 1);
  await m.unmount();
  refusing = null;
}

// 3. Working storage: no notice at all.
{
  storageWorks = true;
  const { Notices, owned } = fresh();
  const m = await mount(Notices);
  await act(async () => { check('a working write answers ok', owned.ownedLocal.setItem('written:W1', 'fine') === 'ok'); });
  check('no notice while storage works', notices().length === 0);
  await m.unmount();
}

fs.rmSync(out, { recursive: true, force: true });
if (failed) { console.error(`owner notices: ${failed} failed`); process.exit(1); }
console.log('owner notices: all checks passed');
process.exit(0);
