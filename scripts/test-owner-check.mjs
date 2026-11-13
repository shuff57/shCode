// The server half of per-account browser storage (functions/_middleware.ts,
// functions/_shared/{auth,ownerCheck}.ts, functions/api/auth/logout.ts, scripts/dev-owner.mjs).
//
//  * X-Work-Owner that is not the session's account: 409 owner-mismatch, the route never runs.
//    No header (an old cached bundle): the route runs exactly as before. /api/accept-terms is
//    exempt (a session is still required).
//  * The owner id is 16 base32 characters of HMAC(AUTH_SECRET, "work-owner:" + email): no
//    database read anywhere, so it can never be missing for a signed-in account.
//  * A page load with a session gets the owner cookie (an older session without `wo` is
//    re-signed with it, keeping its end time); so does any /api/* answer while the browser
//    lacks it. No session clears a left-over owner cookie; a script or image request is never
//    touched, and a bad token never breaks the page.
//  * Sign-out clears the session cookie and the owner cookie in the same response.
//  * The dev server derives the same way and applies the same rule with the same function.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-owner-check.mjs

import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { onRequest } from '../functions/_middleware.ts';
import { isWorkOwnerId, signSession, verifySession, workOwnerFor } from '../functions/_shared/auth.ts';
import { isOwnerMismatch, wantsDocument } from '../functions/_shared/ownerCheck.ts';
import { onRequestPost as logout } from '../functions/api/auth/logout.ts';
import { devOwnerId, mountDevOwner } from './dev-owner.mjs';

const SECRET = 'owner-check-secret';
let failed = 0;
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; } catch (e) { failed++; console.error(`FAIL ${name}\n  ${String(e && e.stack || e).split('\n').slice(0, 5).join('\n  ')}`); }
}

/** A D1 stub that records any use: the owner rule must never touch the database. */
function db() {
  const calls = [];
  return { calls, prepare(q) { calls.push(q); throw new Error(`unexpected database use: ${q}`); } };
}

async function call({ path = '/api/lesson-drafts/x', method = 'POST', cookie = '', owner = null, headers = {}, DB = db(), upgrade = false }) {
  const h = new Headers({ Cookie: cookie, ...headers });
  if (owner !== null) h.set('X-Work-Owner', owner);
  const request = new Request(`https://shcode.test${path}`, { method, headers: h, body: method === 'GET' || method === 'HEAD' ? undefined : '{}' });
  let ran = false;
  const data = {};
  const sentinel = new Response(null, { status: 200 });
  if (upgrade) Object.defineProperty(sentinel, 'webSocket', { value: {} });
  const res = await onRequest({
    request, env: { DB, AUTH_SECRET: SECRET }, data, params: {},
    next: async () => { ran = true; return upgrade ? sentinel : new Response('page', { status: 200, headers: { 'Content-Type': 'text/html' } }); },
    waitUntil() {}, passThroughOnException() {},
  });
  return { res, ran, data, cookies: res.headers.getSetCookie?.() ?? [], same: res === sentinel };
}

const A = { email: 'a@school.org', wo: await workOwnerFor('a@school.org', SECRET) };
const B = { email: 'b@school.org', wo: await workOwnerFor('b@school.org', SECRET) };
/** A session as signed before the `wo` claim existed. */
const oldToken = (acct, exp = Math.floor(Date.now() / 1000) + 3600) => new SignJWT({ email: acct.email, role: 'student' })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(new TextEncoder().encode(SECRET));
const sessionOf = async (acct, withWo = true) =>
  `shcode_session=${withWo ? await signSession(acct.email, 'student', SECRET) : await oldToken(acct)}`;

await test('the rule: no header passes, equal passes, anything else refuses', () => {
  assert.equal(isOwnerMismatch(null, A.wo), false);
  assert.equal(isOwnerMismatch(A.wo, A.wo), false);
  assert.equal(isOwnerMismatch(B.wo, A.wo), true);
  assert.equal(isOwnerMismatch('guest', A.wo), true);
  assert.equal(isOwnerMismatch('', A.wo), true);
});

await test('owner ids: a keyed hash of the email, 16 base32 characters, stable, never the email', async () => {
  assert.ok(isWorkOwnerId(A.wo) && isWorkOwnerId(B.wo));
  assert.notEqual(A.wo, B.wo);
  assert.equal(await workOwnerFor('a@school.org', SECRET), A.wo, 'not stable');
  assert.equal(await workOwnerFor('  A@School.ORG ', SECRET), A.wo, 'email not normalised');
  assert.notEqual(await workOwnerFor('a@school.org', 'another-secret'), A.wo, 'not keyed');
  assert.ok(!A.wo.includes('school'));
  const ids = new Set(await Promise.all(Array.from({ length: 300 }, (_, i) => workOwnerFor(`s${i}@school.org`, SECRET))));
  assert.equal(ids.size, 300);
  // Known answer: a change to the derivation would orphan every namespace in every browser.
  assert.equal(await workOwnerFor('known@example.org', 'fixed-secret'), '65j7jcruezcymygt');
});

await test('the session JWT always carries wo; re-signing keeps the end time', async () => {
  const s = await verifySession(await signSession(A.email, 'student', SECRET), SECRET);
  assert.equal(s.wo, A.wo);
  const resigned = await verifySession(await signSession(A.email, 'student', SECRET, s.exp - 100), SECRET);
  assert.equal(resigned.exp, s.exp - 100);
  assert.equal(resigned.wo, A.wo);
  assert.equal((await verifySession(await oldToken(A), SECRET)).wo, undefined);
});

await test('A\'s header under B\'s session: 409 owner-mismatch, marked, the route never runs, no cookie changes', async () => {
  const r = await call({ cookie: await sessionOf(B), owner: A.wo });
  assert.equal(r.res.status, 409);
  assert.equal(r.res.headers.get('X-Owner-Mismatch'), '1');
  assert.equal((await r.res.json()).error, 'owner-mismatch');
  assert.equal(r.ran, false);
  assert.deepEqual(r.cookies, []);
  const g = await call({ cookie: await sessionOf(B), owner: 'guest' });
  assert.equal(g.res.status, 409, 'a page opened signed out must not send as B');
  assert.equal(g.ran, false);
});

await test('the right header, or none at all (an old bundle), runs the route as before', async () => {
  const ok = await call({ cookie: await sessionOf(B), owner: B.wo });
  assert.equal(ok.ran, true);
  assert.equal(ok.data.email, B.email);
  const old = await call({ cookie: await sessionOf(B) });
  assert.equal(old.ran, true);
  assert.equal(old.data.email, B.email);
  assert.equal((await call({ owner: A.wo })).res.status, 401);
  const auth = await call({ path: '/api/auth/login', owner: A.wo, cookie: await sessionOf(B) });
  assert.equal(auth.ran, true, 'signing in is never refused');
});

await test('a session signed before the wo claim: the id is derived, and no database is touched', async () => {
  const D = db();
  assert.equal((await call({ cookie: await sessionOf(B, false), owner: A.wo, DB: D })).res.status, 409);
  assert.equal((await call({ cookie: await sessionOf(B, false), owner: B.wo, DB: D })).ran, true);
  assert.deepEqual(D.calls, []);
});

await test('/api/accept-terms needs a session but is never refused for the owner', async () => {
  const g = await call({ path: '/api/accept-terms', cookie: await sessionOf(A), owner: 'guest' });
  assert.equal(g.ran, true);
  assert.equal(g.data.email, A.email);
  assert.equal((await call({ path: '/api/accept-terms', owner: 'guest' })).res.status, 401);
  assert.equal((await call({ path: '/api/accept-terms-x', cookie: await sessionOf(A), owner: 'guest' })).res.status, 409);
});

await test('an API answer gives a browser without the owner cookie the account\'s; a match or a socket is left alone', async () => {
  const me = await call({ path: '/api/me', method: 'GET', cookie: await sessionOf(A) });
  assert.equal(me.ran, true);
  assert.ok(me.cookies.some((c) => c.startsWith(`shcode_owner=${A.wo}; Path=/; SameSite=Lax; Max-Age=`)), 'no owner cookie on /api/me');
  assert.deepEqual((await call({ path: '/api/me', method: 'GET', cookie: `${await sessionOf(A)}; shcode_owner=${A.wo}` })).cookies, []);
  assert.ok((await call({ path: '/api/me', method: 'GET', cookie: await sessionOf(A, false) })).cookies
    .some((c) => c.startsWith(`shcode_owner=${A.wo}`)));
  const ws = await call({ path: '/api/live/ABCD', method: 'GET', cookie: await sessionOf(A), upgrade: true });
  assert.equal(ws.same, true, 'a WebSocket upgrade response must be passed through untouched');
});

const PAGE = { path: '/lessons/1-1-1/', method: 'GET', headers: { 'Sec-Fetch-Dest': 'document' } };

await test('page load with a session: the owner cookie is set to the account, readable, same lifetime', async () => {
  const r = await call({ ...PAGE, cookie: await sessionOf(A) });
  assert.equal(r.ran, true);
  assert.equal(await r.res.text(), 'page');
  const c = r.cookies.find((x) => x.startsWith('shcode_owner='));
  assert.ok(c, 'no owner cookie');
  assert.match(c, new RegExp(`^shcode_owner=${A.wo}; Path=/; SameSite=Lax; Max-Age=(\\d+); Secure$`));
  const age = Number(/Max-Age=(\d+)/.exec(c)[1]);
  assert.ok(age > 60 * 60 * 24 * 6 && age <= 60 * 60 * 24 * 7);
  assert.deepEqual((await call({ ...PAGE, cookie: `${await sessionOf(A)}; shcode_owner=${A.wo}` })).cookies, []);
  const wrong = await call({ ...PAGE, cookie: `${await sessionOf(A)}; shcode_owner=${B.wo}` });
  assert.ok(wrong.cookies.some((x) => x.startsWith(`shcode_owner=${A.wo}`)), 'a wrong cookie is corrected');
});

await test('page load with an older session: re-signed with wo, keeping its end, plus the owner cookie', async () => {
  const D = db();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const r = await call({ ...PAGE, cookie: `shcode_session=${await oldToken(A, exp)}`, DB: D });
  const sess = r.cookies.find((x) => x.startsWith('shcode_session='));
  const own = r.cookies.find((x) => x.startsWith('shcode_owner='));
  assert.ok(sess && own);
  assert.equal(/shcode_owner=([a-z2-7]{16})/.exec(own)[1], A.wo);
  const s = await verifySession(/shcode_session=([^;]+)/.exec(sess)[1], SECRET);
  assert.equal(s.wo, A.wo);
  assert.equal(s.exp, exp, 'the session got longer');
  assert.match(sess, /HttpOnly/);
  assert.deepEqual(D.calls, []);
});

await test('page load signed out clears a left-over owner cookie; scripts and bad tokens are untouched', async () => {
  assert.deepEqual((await call({ ...PAGE, cookie: `shcode_owner=${A.wo}` })).cookies, ['shcode_owner=; Path=/; SameSite=Lax; Max-Age=0; Secure']);
  assert.deepEqual((await call({ ...PAGE })).cookies, []);
  const script = await call({ path: '/_next/static/x.js', method: 'GET', headers: { 'Sec-Fetch-Dest': 'script' }, cookie: await sessionOf(A) });
  assert.deepEqual(script.cookies, []);
  assert.equal(script.ran, true);
  const bad = await call({ ...PAGE, cookie: 'shcode_session=not-a-jwt' });
  assert.equal(bad.ran, true);
  assert.equal(await bad.res.text(), 'page');
  assert.equal(wantsDocument(new Request('https://x/', { headers: { Accept: 'text/html' } })), true);
  assert.equal(wantsDocument(new Request('https://x/', { method: 'POST', headers: { Accept: 'text/html' } })), false);
});

await test('sign-out clears the session cookie and the owner cookie in one response', async () => {
  const res = await logout({ request: new Request('https://shcode.test/api/auth/logout', { method: 'POST' }) });
  const c = res.headers.getSetCookie();
  assert.equal(c.length, 2);
  assert.ok(c.some((x) => /^shcode_session=; .*Max-Age=0/.test(x)));
  assert.ok(c.some((x) => /^shcode_owner=; .*Max-Age=0/.test(x)));
});

await test('dev server: same derivation, same rule, owner cookie on page loads and API answers, guest after sign-out', async () => {
  assert.equal(devOwnerId('Ana@School.test'), await workOwnerFor('ana@school.test', 'shcode-dev-only-work-owner-secret'));
  assert.ok(isWorkOwnerId(devOwnerId('ana')));
  assert.notEqual(devOwnerId('ana'), devOwnerId('ben'));
  let mw = null;
  mountDevOwner({ server: { use: (fn) => { mw = fn; } }, devIdentity: (req) => /dev_student=([^;]+)/.exec(req.headers.cookie || '')?.[1] ?? 'teacher' });
  const run = (path, cookie, headers = {}) => {
    const out = { status: 200, cookies: [], next: false, headers: {} };
    const req = { path, method: 'GET', headers: { cookie }, get: (n) => headers[n.toLowerCase()] };
    const res = {
      set: (k, v) => { out.headers[k] = v; },
      status: (s) => { out.status = s; return res; },
      json: () => res,
      append: (k, v) => { out.cookies.push(...[].concat(v)); },
    };
    mw(req, res, () => { out.next = true; });
    return out;
  };
  const stale = run('/api/lesson-drafts/x', 'dev_student=ben', { 'x-work-owner': devOwnerId('ana') });
  assert.equal(stale.status, 409);
  assert.equal(stale.next, false);
  assert.equal(stale.headers['X-Owner-Mismatch'], '1');
  assert.equal(run('/api/lesson-drafts/x', 'dev_student=ben', { 'x-work-owner': devOwnerId('ben') }).next, true);
  assert.equal(run('/api/lesson-drafts/x', 'dev_student=ben').next, true);
  assert.ok(run('/api/me', 'dev_student=ben').cookies.some((c) => c.startsWith(`shcode_owner=${devOwnerId('ben')}`)));
  assert.equal(run('/api/accept-terms', 'dev_student=ben', { 'x-work-owner': 'guest' }).next, true);
  const page = run('/lessons/x/', 'dev_student=ben', { 'sec-fetch-dest': 'document' });
  assert.ok(page.cookies.some((c) => c.startsWith(`shcode_owner=${devOwnerId('ben')}`)));
  const outPage = run('/lessons/x/', `dev_student=ben; dev_signed_out=1; shcode_owner=${devOwnerId('ben')}`, { 'sec-fetch-dest': 'document' });
  assert.ok(outPage.cookies.some((c) => c.startsWith('shcode_owner=;')));
  assert.equal(run('/api/me', 'dev_student=ben; dev_signed_out=1').status, 401);
});

console.log(`owner check: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
