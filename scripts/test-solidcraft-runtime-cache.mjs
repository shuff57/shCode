// The studio page's cache of the SolidCraft engine and kernel (lib/solidcraft-runtime-cache.ts): only the pinned files, only when their size and
// sha256 match; a damaged copy is downloaded again; a wrong download is refused and not kept; two asks at once share one download.
// The frame side (vendor/solidcraft-preview/src/runtime-cache.js) is a browser check.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRuntimeCache } from '../lib/solidcraft-runtime-cache.ts';

const bytes = (s) => new TextEncoder().encode(s).buffer;
const sha = (b) => createHash('sha256').update(Buffer.from(b)).digest('hex');
const good = bytes('the engine'); const asset = { path: 'solidcraft/e_bg.wasm', size: good.byteLength, sha256: sha(good), key: 'k' };
globalThis.location = { origin: 'https://shcode.test' };
const URL_ = 'https://shcode.test/solidcraft-preview/solidcraft/e_bg.wasm';
// Cache Storage and fetch, stood in
const store = new Map(); let fetches = 0; let served = good;
globalThis.caches = { open: async () => ({
  match: async (u) => store.has(u) ? new Response(store.get(u)) : undefined,
  put: async (u, r) => { store.set(u, await r.arrayBuffer()); },
  delete: async (u) => store.delete(typeof u === 'string' ? u : u.url),
  keys: async () => [...store.keys()].map(url => ({ url })),
}) };
globalThis.fetch = async (u) => { fetches++; assert.equal(u, URL_); return new Response(served.slice(0)); };

const c = createRuntimeCache('/solidcraft-preview/', [asset]);
assert.equal(await c.get('solidcraft/other_bg.wasm'), null, 'a file that is not pinned is not handed over');
const [a, b] = await Promise.all([c.get(asset.path), c.get(asset.path)]);
assert.equal(sha(a), asset.sha256); assert.equal(sha(b), asset.sha256); assert.equal(fetches, 1, 'two asks at once: one download');
assert.equal(sha(store.get(URL_)), asset.sha256, 'kept');
assert.equal(sha(await c.get(asset.path)), asset.sha256); assert.equal(fetches, 1, 'the next visit: from the cache, not downloaded');
store.set(URL_, bytes('the engixe')); // same size, damaged
assert.equal(sha(await c.get(asset.path)), asset.sha256); assert.equal(fetches, 2, 'a damaged copy is downloaded again');
assert.equal(sha(store.get(URL_)), asset.sha256, 'and replaced');
store.clear(); served = bytes('not engine');
assert.equal(await c.get(asset.path), null, 'a download that is not the pinned file is refused: the frame downloads it itself');
assert.equal(store.size, 0, 'and it is not kept');
store.set('https://shcode.test/solidcraft-preview/solidcraft/old_bg.wasm', good); served = good;
await c.get(asset.path);
assert.deepEqual([...store.keys()], [URL_], 'files of an older pin go');
delete globalThis.caches; globalThis.caches = { open: async () => { throw new Error('no Cache Storage'); } }; fetches = 0;
assert.equal(sha(await c.get(asset.path)), asset.sha256); assert.equal(fetches, 1, 'with no Cache Storage (a private window): downloaded, kept nowhere');
console.log('SolidCraft runtime cache: pinned files only, size and sha256 checked, damaged copies replaced, wrong downloads refused, one download for two asks.');
