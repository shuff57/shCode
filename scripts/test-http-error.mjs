// lib/http-error.ts: what a teacher is shown when a request fails. Run: node scripts/test-http-error.mjs
import { strict as assert } from 'node:assert';
import { errorText } from '../lib/http-error.ts';
const results = [];
async function check(name, fn) { try { await fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } }
const res = (body, status = 500) => new Response(body, { status });
await check('a JSON {"error"} shows the message, not the JSON', async () => assert.equal(await errorText(res('{"error":"Failed to create announcement"}')), 'Failed to create announcement'));
await check('plain text is shown as it is', async () => assert.equal(await errorText(res('Not allowed', 403)), 'Not allowed'));
await check('an HTML error page is replaced by a readable line with the status', async () => assert.equal(await errorText(res('<!DOCTYPE html><html>...', 502)), 'Something went wrong (HTTP 502).'));
await check('an empty body falls back to the status', async () => assert.equal(await errorText(res('', 500)), 'Something went wrong (HTTP 500).'));
await check('JSON without an error field is never shown as JSON', async () => assert.equal(await errorText(res('{"ok":false}', 500)), 'Something went wrong (HTTP 500).'));
await check('a very long body is cut', async () => assert.ok((await errorText(res('x'.repeat(500)))).length <= 201));
console.log(results.join('\n'));
console.log(process.exitCode ? '\nhttp-error tests FAILED' : '\nhttp-error tests passed');
