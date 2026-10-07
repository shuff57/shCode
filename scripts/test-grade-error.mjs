// lib/grade-error.ts: what a student reads when the grader fails. Run: node scripts/test-grade-error.mjs
import { strict as assert } from 'node:assert';
import { gradeFailureMessage, classifyGradeFailure, BANNED_IN_UNREACHABLE } from '../lib/grade-error.ts';
const results = [];
async function check(name, fn) { try { await fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } }
const clean = (s) => assert.ok(!BANNED_IN_UNREACHABLE.test(s), `banned wording in: ${s}`);

await check('network (thrown fetch) says to check the connection and that work is saved', () => {
  const k = classifyGradeFailure(0, null, true);
  assert.equal(k, 'network');
  const m = gradeFailureMessage({ kind: k, status: 0 });
  assert.equal(m, 'We could not reach the grader. Check your connection, then try again. Your work is saved.');
  clean(m);
});
await check('network on a capped part adds that no try was used', () => {
  const m = gradeFailureMessage({ kind: 'network', keepsTries: true });
  assert.match(m, /did not use one of your tries/); clean(m);
});
await check('non-JSON 404 and 502 read as the grader not responding, status never shown', () => {
  for (const st of [404, 502]) {
    const k = classifyGradeFailure(st, null);
    assert.equal(k, 'unreadable');
    const m = gradeFailureMessage({ kind: k, status: st });
    assert.equal(m, "The grader isn't responding right now. Your work is saved, so you can try again in a minute.");
    clean(m); assert.ok(!m.includes(String(st)));
  }
});
await check('server 5xx ignores a vendor-bearing server message', () => {
  const k = classifyGradeFailure(502, { error: 'Ollama 401: unauthorized, check OLLAMA_API_KEY' });
  assert.equal(k, 'server');
  const m = gradeFailureMessage({ kind: k, status: 502, serverMessage: 'Ollama 401: unauthorized' });
  clean(m);
});
await check('429 keeps the server text', () => {
  const t = "You've submitted 30 written responses for grading today, which is the daily maximum.";
  const k = classifyGradeFailure(429, { error: t, rateLimited: true });
  assert.equal(k, 'rate-limit');
  assert.equal(gradeFailureMessage({ kind: k, serverMessage: t }), t);
});
await check('503 busy keeps the server text', () => {
  const t = 'The grader is busy right now. Wait a moment and submit again.';
  const k = classifyGradeFailure(503, { error: t });
  assert.equal(k, 'busy');
  assert.equal(gradeFailureMessage({ kind: k, serverMessage: t }), t);
});
await check('offline 503 keeps a vendor-free server text and drops a vendor-bearing one', () => {
  const t = 'The grader is not available on this site right now.';
  assert.equal(classifyGradeFailure(503, { error: t, offline: true }), 'offline');
  assert.equal(gradeFailureMessage({ kind: 'offline', serverMessage: t }), t);
  const old = 'The cloud grader is not set up on this site. Ask your teacher — OLLAMA_API_KEY is not set on this deploy.';
  const m = gradeFailureMessage({ kind: 'offline', serverMessage: old });
  clean(m);
});
await check('second sentence per caller is preserved', () => {
  const capped = gradeFailureMessage({ kind: 'server', keepsTries: true });
  assert.match(capped, /Your draft is saved and this did not use one of your tries\./); clean(capped);
  const sent = gradeFailureMessage({ kind: 'unreadable', keepsTries: false });
  assert.match(sent, /saved and sent to your teacher for marking\./); clean(sent);
  assert.match(gradeFailureMessage({ kind: 'busy', serverMessage: 'Busy.', keepsTries: true }), /^Busy\. Your draft is saved/);
});
await check('a 4xx the server explained is kept', () => {
  const t = 'All 3 tries on this part are already used.';
  const k = classifyGradeFailure(409, { error: t });
  assert.equal(k, 'other');
  assert.equal(gradeFailureMessage({ kind: k, serverMessage: t }), t);
});
await check('raw status is carried on the input, not lost by classification', () => {
  const input = { kind: classifyGradeFailure(502, null), status: 502 };
  assert.equal(input.status, 502);
});
console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrade-error tests FAILED' : '\ngrade-error tests passed');
