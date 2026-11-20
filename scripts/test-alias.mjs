#!/usr/bin/env node
// A person's alias (migration 0066), through the real handlers on a real SQLite with every migration.
//   1. cleanAlias: length, characters, personal details, and spaces-only clearing;
//   2. PUT /api/me sets, returns and clears an alias; a body WITHOUT the key leaves it alone;
//   3. two people cannot hold the same alias (any letter case);
//   4. classmates see the alias where they saw "First L." (Everyone / class library list), the
//      real name stays on the account and in the teacher's progress list;
//   5. a student with no alias still reads as "First L.".

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { cleanAlias } from '../lib/alias-core.ts';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

// ---- 1. the rules ----
const bad = (v) => { const r = cleanAlias(v); return r !== null && typeof r === 'object'; };
check('a plain handle is kept', cleanAlias('CoolCat') === 'CoolCat');
check('spaces inside collapse, edges trim', cleanAlias('  Cool   Cat ') === 'Cool Cat');
check('empty, spaces and null clear it', cleanAlias('') === null && cleanAlias('   ') === null && cleanAlias(null) === null && cleanAlias(undefined) === null);
check('one character is too short', bad('a'));
check('21 characters is too long', bad('a'.repeat(21)) && !bad('a'.repeat(20)));
check('symbols and markup are refused', bad('<b>hi</b>') && bad('cat!!') && bad('a@b') && bad('-lead') && bad('trail_'));
check('a phone number is refused', bad('555-123-4567'));
check('not a string is refused', bad(42) && bad({}));
check('dots, dashes, underscores and accents are fine', cleanAlias('j_doe-2.0') === 'j_doe-2.0' && cleanAlias('Zoë') === 'Zoë');

// ---- 2-5. the routes ----
const out = join(root, '.tmp', 'alias-test');
const me = compileHandler('api/me.ts', join(out, 'a'));
const lib = compileHandler('api/library/shared/index.ts', join(out, 'b'));
const prog = compileHandler('api/classes/[id]/progress.ts', join(out, 'c'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['t1@s.test', 'Tess', 'Ward', 'teacher'],
]) sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
for (const e of ['ana@s.test', 'ben@s.test']) sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('C1', ?, ?, ?)`, e, now, FAR);
sql(`INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, hash, updated_at) VALUES ('I1', 'ana@s.test', 'texture', 'hero', 10, 'image/png', 'h1', ?)`, now);
sql(`INSERT INTO library_shares (item_id, class_id, shared_at) VALUES ('I1', 'C1', ?)`, now);
const ANA = { email: 'ana@s.test', role: 'student' }, BEN = { email: 'ben@s.test', role: 'student' }, T1 = { email: 't1@s.test', role: 'teacher' };

async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  return { status: res.status, body: JSON.parse(await res.text()) };
}
const put = (u, b) => call(me.onRequestPut, u, '/api/me', {}, 'PUT', b);
const get = (u) => call(me.onRequestGet, u, '/api/me');
const ownerSeenBy = async (u) => ((await call(lib.onRequestGet, u, '/api/library/shared')).body.items ?? []).find((i) => i.id === 'I1')?.owner;

let r = await get(ANA);
check('a new account has no alias', r.body.alias === null && r.body.firstName === 'Ana', r.body);
check('classmates read "First L." before an alias', (await ownerSeenBy(BEN)) === 'Ana L.', await ownerSeenBy(BEN));

r = await put(ANA, { firstName: 'Ana', lastName: 'Lopez', alias: 'CoolCat' });
check('setting an alias answers it', r.status === 200 && r.body.alias === 'CoolCat' && r.body.lastName === 'Lopez', r);
check('GET returns it, real name untouched', (await get(ANA)).body.alias === 'CoolCat' && (await get(ANA)).body.lastName === 'Lopez');
check('a classmate now sees the alias, not the name', (await ownerSeenBy(BEN)) === 'CoolCat', await ownerSeenBy(BEN));

r = await put(ANA, { firstName: 'Ana', lastName: 'Lopez' });
check('a body WITHOUT the alias key leaves it alone (an older page)', r.status === 200 && r.body.alias === 'CoolCat' && (await get(ANA)).body.alias === 'CoolCat', r);

r = await put(BEN, { firstName: 'Ben', lastName: 'Diaz', alias: 'coolcat' });
check('the same alias in another letter case is refused (409)', r.status === 409 && (await get(BEN)).body.alias === null, r);
r = await put(BEN, { firstName: 'Ben', lastName: 'Diaz', alias: '555-123-4567' });
check('a rule failure is a 400 with the reason', r.status === 400 && typeof r.body.error === 'string', r);
check('a refused alias changed nothing', (await get(BEN)).body.firstName === 'Ben');

const prg = await call(prog.onRequestGet, T1, '/api/classes/C1/progress', { id: 'C1' });
const anaRow = (prg.body.students ?? []).find((s) => s.student_email === 'ana@s.test');
check("the teacher's progress list keeps the REAL name and adds the alias", anaRow?.firstName === 'Ana' && anaRow?.lastName === 'Lopez' && anaRow?.alias === 'CoolCat', anaRow);

r = await put(ANA, { firstName: 'Ana', lastName: 'Lopez', alias: '' });
check('an empty alias clears it', r.status === 200 && r.body.alias === null && (await ownerSeenBy(BEN)) === 'Ana L.', r);
r = await put(BEN, { firstName: 'Ben', lastName: 'Diaz', alias: 'CoolCat' });
check('...and frees it for someone else', r.status === 200 && r.body.alias === 'CoolCat', r);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
