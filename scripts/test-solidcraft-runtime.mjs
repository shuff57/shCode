// Public CAD engines must stream only their pinned R2 objects, without exposing student uploads.
import assert from 'node:assert/strict';
import { onRequest } from '../functions/solidcraft-preview/[[path]].ts';
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime.ts';

const asset = SOLIDCRAFT_ASSETS[0];
const calls = [];
let size = asset.size;
let missing = false;
const bucket = {
  async head(key) { calls.push(['head', key]); return missing ? null : { size }; },
  async get(key) {
    calls.push(['get', key]);
    return missing ? null : { size, body: new Blob(['wasm stream']).stream() };
  },
};
const run = (path, options = {}, env = { UPLOADS: bucket }) => onRequest({
  request: new Request(`https://shcode.pages.dev/solidcraft-preview/${path}`, options), env,
  next: async () => new Response('static asset', { status: 404 }),
});

let result = await run(asset.path);
assert.equal(result.status, 200);
assert.equal(result.headers.get('Content-Type'), 'application/wasm');
assert.equal(result.headers.get('Content-Length'), String(asset.size));
assert.equal(result.headers.get('ETag'), `"${asset.sha256}"`);
assert.equal(await result.text(), 'wasm stream');
assert.deepEqual(calls.pop(), ['get', asset.key]);

result = await run(asset.path, { method: 'HEAD' });
assert.equal(result.status, 200);
assert.equal(await result.text(), '');
assert.deepEqual(calls.pop(), ['head', asset.key]);

result = await run(asset.path, { headers: { 'If-None-Match': `"${asset.sha256}"` } });
assert.equal(result.status, 304);
assert.equal(result.headers.has('Content-Length'), false);
await result.body?.cancel();

const reads = calls.length;
for (const path of ['kernel/student.wasm', 'host.html', 'uploads/private.png', 'kernel/../student.wasm', `${asset.path}/extra`]) {
  result = await run(path);
  assert.equal(result.status, 404, path);
}
assert.equal(calls.length, reads, 'unknown paths never read R2');
result = await run(asset.path, { method: 'POST' });
assert.equal(result.status, 405);
assert.equal(calls.length, reads, 'unsupported methods never read R2');
assert.equal((await run(asset.path, {}, {})).status, 503);
missing = true;
assert.equal((await run(asset.path)).status, 503);
missing = false;
size = 1;
assert.equal((await run(asset.path)).status, 503, 'an incomplete upload is never served');
console.log('[test-solidcraft-runtime] pinned streams, HEAD, cache validation, routing boundaries and missing assets passed');
