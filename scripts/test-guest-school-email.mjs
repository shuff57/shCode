#!/usr/bin/env node
// A school email as proof for a guest (migration 0061; functions/_shared/guests.ts), on a real SQLite with every migration applied,
// through the real handlers. The district's mail blocks outside mail for students, so the site sends nothing: a class that asks gets
// the guest's school address on its list of domains, the TEACHER'S card shows a one-time phrase, the teacher emails it from their
// school account, and the guest types it back. What has to hold:
//   1. the class setting: teachers of the class only, at least one real school domain, never a public mail service;
//   2. a class that does not ask is exactly as before (no phrase, nothing stored);
//   3. redeeming in a class that asks needs an address on the list (and a typo leaves the code unused); the phrase is on the
//      TEACHER'S card and in no other answer, ever;
//   4. approval is refused until the guest types the phrase back, and a right phrase never approves by itself;
//   5. a wrong phrase counts, five clear it, only a teacher makes a new one; an old phrase is deleted; a used one is deleted;
//   6. a decision deletes the phrase and keeps the address for the record;
//   7. changing the address kills the old phrase; a class that turns the proof on later asks the waiting guest for it; turning it
//      off lets the teacher's approval stand alone again (the fallback).

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'guest-school-test');
let n = 0;
const h = (entry) => compileHandler(entry, join(out, String(n++)));
const mine = h('api/guests/index.ts');
const redeem = h('api/guests/redeem.ts');
const verify = h('api/guests/verify.ts');
const school = h('api/guests/school.ts');
const one = h('api/guests/[id].ts');
const cls = h('api/classes/[id]/guests/index.ts');
const notes = h('api/notifications.ts');

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const get = (q, ...a) => db.sqlite.prepare(q).get(...a);
const people = [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cy@s.test', 'Cy', 'Moss', 'student'],
  ['g1@p.test', 'Gia', 'One', 'student'], ['g2@p.test', 'Gus', 'Two', 'student'], ['g3@p.test', 'Gil', 'Three', 'student'],
  ['g4@p.test', 'Gus', 'Four', 'student'], ['g5@p.test', 'Gwen', 'Five', 'student'], ['g6@p.test', 'Gabe', 'Six', 'student'],
  ['g7@p.test', 'Gale', 'Seven', 'student'], ['g8@p.test', 'Gene', 'Eight', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
];
for (const [email, first, last, role] of people) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now - 86_400_000 * 30, role, first, last);
}
const mkClass = (id, name, code, owner) => sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, code, owner, now);
mkClass('C1', 'Period 1', 'AAAAAA', 't1@s.test');
mkClass('C2', 'Robotics', 'BBBBBB', 't2@s.test');
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cy@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CY = U('cy@s.test');
const G = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, U(`g${i}@p.test`)]));
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher');

// Every answer that is NOT the teacher's class card: a phrase must never be in one of these.
const publicBodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  if (!/^\/api\/classes\//.test(url)) publicBodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const invite = (u, classId) => call(mine.onRequestPost, u, '/api/guests', {}, 'POST', { classId, name: 'Pat Guest', relation: 'a friend', age: 'teen', org: 'Oak High School', purpose: 'build a game together' });
const redeem$ = (u, code, schoolEmail) => call(redeem.onRequestPost, u, '/api/guests/redeem', {}, 'POST', { code, ...(schoolEmail !== undefined ? { schoolEmail } : {}) });
const verify$ = (u, phrase) => call(verify.onRequestPost, u, '/api/guests/verify', {}, 'POST', { phrase });
const school$ = (u, id, schoolEmail) => call(school.onRequestPost, u, '/api/guests/school', {}, 'POST', { id, schoolEmail });
const mineOf = (u) => call(mine.onRequestGet, u, '/api/guests');
const panel = (u, classId, body) => body === undefined
  ? call(cls.onRequestGet, u, `/api/classes/${classId}/guests`, { id: classId })
  : call(cls.onRequestPost, u, `/api/classes/${classId}/guests`, { id: classId }, 'POST', body);
const rowOf = (id) => get(`SELECT * FROM sandbox_guests WHERE id = ?`, id);
const settings = (u, classId, required, domains) => panel(u, classId, { action: 'school-settings', required, domains });
const cardOf = async (u, classId, id) => (await panel(u, classId)).body.guests.find((g) => g.id === id);
// A host makes a code and a guest asks with it; returns the row id and the answer.
async function ask(host, classId, guest, schoolEmail) {
  const inv = (await invite(host, classId)).body;
  const r = await redeem$(guest, inv.code, schoolEmail);
  return { id: inv.id, code: inv.code, r };
}
const phraseOf = (id) => rowOf(id).school_phrase;
const typed = (id) => `shcode-${phraseOf(id)}`;

// ---- 1. the class setting ----
let r = await settings(T1, 'C1', true, '');
check('asking for a school email with no domain listed is refused (400)', r.status === 400 && /at least one school domain/.test(r.body.error), r);
r = await settings(T1, 'C1', true, 'gmail.com');
check('a public mail service is never a school domain (400)', r.status === 400 && /public mail service/.test(r.body.error), r);
r = await settings(T1, 'C1', true, 'not a domain!');
check('...nor something that is not a domain (400)', r.status === 400 && /not a domain/.test(r.body.error), r);
r = await settings(T1, 'C1', true, 'a.org, b.org, c.org, d.org, e.org, f.org, g.org, h.org, i.org, j.org, k.org');
check('...nor a very long list (400)', r.status === 400);
check("another class's teacher cannot change it (403), nor a student", (await settings(T2, 'C1', true, 'school.test')).status === 403 && (await settings(ANA, 'C1', true, 'school.test')).status === 403);
check('nothing changed after those refusals', get(`SELECT guest_school_required AS r, guest_school_domains AS d FROM classes WHERE id = 'C1'`).r === 0);
r = await panel(T1, 'C1');
check('a class that never asked starts with the proof off and an empty list', r.body.schoolRequired === false && r.body.schoolDomains.length === 0, r.body);

// ---- 2. a class that does not ask is exactly as before ----
let A = await ask(ANA, 'C1', G[1], 'gia@school.test');
check('off: a guest asks as before (pending), no proof offered, and the address they typed is ignored', A.r.status === 201 && A.r.body.schoolProof === undefined && rowOf(A.id).school_email === null && rowOf(A.id).school_phrase === null, A.r);
let card = await cardOf(T1, 'C1', A.id);
check('off: the teacher card has no phrase and state none', card.school.state === 'none' && card.school.phrase === null, card);
check("off: the guest's list says there is no proof to give", (await mineOf(G[1])).body.asGuest[0].school.state === 'none');
r = await verify$(G[1], 'shcode-ABCDEF');
check('off: there is nothing to confirm (404)', r.status === 404);
r = await panel(T1, 'C1', { action: 'approve', id: A.id });
check('off: the teacher approves as before', r.status === 200 && rowOf(A.id).status === 'approved', r);

// ---- 3. a class that asks ----
r = await settings(T1, 'C1', true, ' @School.TEST , student.school.test ');
check('a teacher turns it on with a list (tidied, lower case, no @)', r.status === 200 && r.body.schoolRequired === true && r.body.schoolDomains.join(',') === 'school.test,student.school.test', r.body);
const inv2 = (await invite(ANA, 'C1')).body;
r = await redeem$(G[2], inv2.code);
check('on: asking with no school address is refused and says so (400)', r.status === 400 && r.body.needsSchoolEmail === true && r.body.domains.includes('school.test'), r);
check('...and the code is still unused', rowOf(inv2.id).status === 'invited');
r = await redeem$(G[2], inv2.code, 'gus@gmail.com');
check('on: an address that is not on the list is refused (400)', r.status === 400 && /school\.test/.test(r.body.error));
r = await redeem$(G[2], inv2.code, 'gus@evilschool.test');
check('...a look-alike domain is not a subdomain (400)', r.status === 400);
r = await redeem$(G[2], inv2.code, 'not an email@school.test');
check('...nor something that is not an address (400)', r.status === 400);
check('...every refusal left the code unused', rowOf(inv2.id).status === 'invited' && rowOf(inv2.id).school_email === null);
r = await redeem$(G[2], inv2.code, '  Gus.Two@Student.School.TEST ');
const B = { id: inv2.id };
check('on: a school address on the list (a subdomain counts, any case) asks, and the proof is waiting for the phrase', r.status === 201 && r.body.schoolProof === 'need-phrase' && r.body.schoolEmail === 'gus.two@student.school.test', r);
check('...the row holds the address and a 6-character phrase', rowOf(B.id).school_email === 'gus.two@student.school.test' && /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(phraseOf(B.id) ?? ''), rowOf(B.id));
card = await cardOf(T1, 'C1', B.id);
check("the TEACHER's card shows the address and the phrase to email (shcode-XXXXXX), and that it is waiting", card.school.state === 'need-phrase' && card.school.email === 'gus.two@student.school.test' && card.school.phrase === `shcode-${phraseOf(B.id)}`, card);
const phraseB = phraseOf(B.id);
r = await mineOf(G[2]);
check("the guest's own list shows their address and that the phrase is to type back, never the phrase", r.body.asGuest[0].school.state === 'need-phrase' && r.body.asGuest[0].school.email === 'gus.two@student.school.test' && !JSON.stringify(r.body).includes(phraseB), r.body);
r = await mineOf(ANA);
check('the host sees neither the school address nor the phrase', !JSON.stringify(r.body).includes('student.school.test') && !JSON.stringify(r.body).includes(phraseB), r.body);

// ---- 4. approval waits for the proof ----
r = await panel(T1, 'C1', { action: 'approve', id: B.id });
check('the teacher cannot approve before the guest has typed the phrase back (409)', r.status === 409 && /not confirmed/.test(r.body.error) && rowOf(B.id).status === 'pending', r);
r = await verify$(G[3], typed(B.id));
check("someone else cannot use the phrase (404: they have no request waiting on it), and it still works for its owner", r.status === 404 && phraseOf(B.id) === phraseB);
r = await verify$(G[2], 'nope');
check('a malformed phrase is a 400 and costs no try', r.status === 400 && rowOf(B.id).school_tries === 0);
r = await verify$(G[2], 'shcode-AAAAAA');
check('a wrong phrase is refused and counted (4 tries left)', r.status === 400 && r.body.triesLeft === 4 && rowOf(B.id).school_tries === 1, r);
r = await verify$(G[2], `  ${phraseB.toLowerCase().slice(0, 3)} ${phraseB.toLowerCase().slice(3)} `);
check('the right phrase works however it is typed (lower case, spaces, no shcode- prefix)', r.status === 200 && r.body.verified === true, r);
check('...it is DELETED the moment it is used, and the row is still pending (a right phrase never approves)', phraseOf(B.id) === null && rowOf(B.id).school_verified_at > 0 && rowOf(B.id).status === 'pending', rowOf(B.id));
r = await verify$(G[2], `shcode-${phraseB}`);
check('the same phrase cannot be used twice (404)', r.status === 404);
card = await cardOf(T1, 'C1', B.id);
check('the teacher card now says verified with no phrase', card.school.state === 'verified' && card.school.phrase === null && card.school.verifiedAt > 0, card);
r = await panel(T1, 'C1', { action: 'approve', id: B.id });
check("then the teacher's approval is the gate, and it works", r.status === 200 && rowOf(B.id).status === 'approved' && rowOf(B.id).school_phrase === null, r);
check('...the address stays on the row for the record', rowOf(B.id).school_email === 'gus.two@student.school.test');

// ---- 5. wrong phrases, lockout, old phrases ----
let C = await ask(BEN, 'C1', G[4], 'gus.four@school.test');
const phraseC = phraseOf(C.id);
for (let i = 0; i < 4; i++) await verify$(G[4], 'shcode-AAAAAA');
check('four wrong phrases leave the phrase alive', phraseOf(C.id) === phraseC && rowOf(C.id).school_tries === 4);
r = await verify$(G[4], 'shcode-AAAAAA');
check('the fifth wrong one deletes it and says to ask the teacher', r.status === 400 && r.body.triesLeft === 0 && /out of tries/.test(r.body.error) && phraseOf(C.id) === null, r);
r = await verify$(G[4], `shcode-${phraseC}`);
check('...and then even the right phrase is refused (404): six characters cannot be guessed at', r.status === 404 && rowOf(C.id).school_verified_at === null, r);
check('...the card says locked, with no phrase', (await cardOf(T1, 'C1', C.id)).school.state === 'locked' && (await cardOf(T1, 'C1', C.id)).school.phrase === null);
r = await panel(T1, 'C1', { action: 'approve', id: C.id });
check('a locked request cannot be approved (409)', r.status === 409);
r = await panel(T2, 'C1', { action: 'school-phrase', id: C.id });
check("another class's teacher cannot make a phrase (403)", r.status === 403);
r = await panel(T1, 'C1', { action: 'school-phrase', id: C.id });
const phraseC2 = phraseOf(C.id);
check('the teacher makes a new phrase: fresh, tries reset', r.status === 200 && /^[A-Z2-9]{6}$/.test(phraseC2) && phraseC2 !== phraseC && rowOf(C.id).school_tries === 0, r);
r = await verify$(G[4], `shcode-${phraseC}`);
check('the old phrase is dead (400)', r.status === 400);
r = await verify$(G[4], `shcode-${phraseC2}`);
check('the new one works', r.status === 200 && rowOf(C.id).school_verified_at > 0);

// A phrase older than its 7 days is deleted wherever it is read, and cannot be used.
let D = await ask(BEN, 'C1', G[5], 'gwen@school.test');
sql(`UPDATE sandbox_guests SET school_phrase_at = ? WHERE id = ?`, now - 8 * 86_400_000, D.id);
const phraseD = phraseOf(D.id);
r = await verify$(G[5], `shcode-${phraseD}`);
check('a phrase older than 7 days is refused (404) and deleted', r.status === 404 && phraseOf(D.id) === null, r);
check('...and the card says locked', (await cardOf(T1, 'C1', D.id)).school.state === 'locked');
sql(`UPDATE sandbox_guests SET school_phrase = 'ZZZZZZ', school_phrase_at = ? WHERE id = ?`, now - 9 * 86_400_000, D.id);
await panel(T1, 'C1');
check('merely opening the teacher list deletes an old phrase (the 7-day backstop)', phraseOf(D.id) === null);

// ---- 6. a decision deletes the phrase and keeps the address ----
let E = await ask(BEN, 'C1', G[6], 'gabe@school.test');
check('a fresh request has a phrase', !!phraseOf(E.id));
r = await panel(T1, 'C1', { action: 'decline', id: E.id });
check('declining it deletes the phrase, keeps the address, and the teacher list no longer carries it', r.status === 200 && phraseOf(E.id) === null && rowOf(E.id).school_email === 'gabe@school.test' && r.body.guests.find((g) => g.id === E.id).school.phrase === null, r);

// ---- 7. changing the address; a class that turns it on later; and turning it off ----
let F = await ask(CY, 'C2', G[7]);
check('a class that has not asked still takes a request with no address', F.r.status === 201 && F.r.body.schoolProof === undefined);
await settings(T2, 'C2', true, 'school.test');
check("the class turns the proof on AFTER someone asked: that request now needs an address", (await cardOf(T2, 'C2', F.id)).school.state === 'need-address' && (await mineOf(G[7])).body.asGuest[0].school.state === 'need-address');
r = await panel(T2, 'C2', { action: 'approve', id: F.id });
check('...and the teacher cannot approve it yet (409)', r.status === 409);
r = await school$(G[7], F.id, 'gale@gmail.com');
check('the guest gives an address off the list: refused (400)', r.status === 400);
r = await school$(G[8], F.id, 'gale@school.test');
check("someone else's request is not found (404)", r.status === 404);
r = await school$(G[7], F.id, 'gale@school.test');
const phraseF = phraseOf(F.id);
check('the guest adds a listed address: a phrase appears on the teacher card', r.status === 200 && r.body.schoolProof === 'need-phrase' && (await cardOf(T2, 'C2', F.id)).school.phrase === `shcode-${phraseF}`, r);
r = await school$(G[7], F.id, 'gale.typo@school.test');
const phraseF2 = phraseOf(F.id);
check('changing the address kills the old phrase and makes a new one', phraseF2 !== phraseF && rowOf(F.id).school_email === 'gale.typo@school.test' && rowOf(F.id).school_tries === 0);
r = await verify$(G[7], `shcode-${phraseF}`);
check('...the phrase sent to the old address no longer works (400)', r.status === 400);
r = await verify$(G[7], `shcode-${phraseF2}`);
check('...the new one does', r.status === 200);
r = await school$(G[7], F.id, 'other@school.test');
check('once confirmed the address cannot be changed (409)', r.status === 409 && rowOf(F.id).school_email === 'gale.typo@school.test');
r = await school$(G[1], A.id, 'gia@school.test');
check('a request that is not waiting is not found (404)', r.status === 404);

// The fallback: the teacher turns the proof off and approval stands alone.
let H = await ask(CY, 'C2', G[8], 'gene@school.test');
r = await panel(T2, 'C2', { action: 'approve', id: H.id });
check('proof on: unconfirmed, cannot approve (409)', r.status === 409);
await settings(T2, 'C2', false, 'school.test');
r = await panel(T2, 'C2');
check('the class turns the proof off: the list is kept, the switch is off', r.body.schoolRequired === false && r.body.schoolDomains.join(',') === 'school.test', r.body);
check('...the waiting request reads as no proof needed', r.body.guests.find((g) => g.id === H.id).school.state === 'none');
r = await panel(T2, 'C2', { action: 'approve', id: H.id });
check("...and the teacher's approval alone is enough again (the fallback)", r.status === 200 && rowOf(H.id).status === 'approved', r);
r = await panel(T2, 'C2');
check('a proof that was confirmed still reads as verified after the switch is off', r.body.guests.find((g) => g.id === F.id).school.state === 'verified');

// ---- 8. the phrase appears nowhere but the teacher card ----
const allPhrases = people.length ? [phraseB, phraseC, phraseC2, phraseD, phraseF, phraseF2] : [];
check('no answer outside the class card ever carried a phrase, or a school address that was not the caller\'s own', allPhrases.every((p) => p && publicBodies.every((b) => !b.includes(p))), allPhrases);
const feed = JSON.stringify((await call(notes.onRequestGet, T1, '/api/notifications')).body);
check('the Activity feed carries no phrase either', allPhrases.every((p) => !feed.includes(p)));
check('a guest withdrawing deletes the whole row, phrase included', (await call(one.onRequestDelete, G[5], `/api/guests/${D.id}`, { id: D.id }, 'DELETE')).status === 200 && !rowOf(D.id));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
