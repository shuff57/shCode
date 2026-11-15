#!/usr/bin/env node
// Edit, delete and @mention in messages (migration 0056), on a real SQLite with every migration applied,
// through the real handlers (GET|POST /api/messages, /api/messages/[id], /api/shares/[id]). What has to hold:
//   1. editing: only the author, the words change, classmates see "edited" and the NEW words only, the class's
//      teachers see the ORIGINAL and every version between; the safety check runs again; an unchanged edit
//      writes nothing; 20 edits per message and 10 a minute;
//   2. deleting: the author deletes, classmates see "Message deleted" and no words and no program, the class's
//      teachers still read everything; the list says so; a deleted message cannot be edited;
//   3. a teacher's Remove and the author's delete are separate, and neither lets the author undo the teacher;
//   4. a student whose messages are Off may still delete but not edit;
//   5. @mentions: only people who read that conversation, only when @name is in the words, counted on the
//      envelope even in a channel never opened, cleared by opening it, dropped by a delete, kept or changed by an edit;
//   6. the teacher's panel carries the history; deleting a channel removes its history and mentions; no email leaks.

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'message-edits-test');
const inbox = compileHandler('api/messages/index.ts', join(out, 'a'));
const one = compileHandler('api/messages/[id].ts', join(out, 'b'));
const teach = compileHandler('api/classes/[id]/messages.ts', join(out, 'c'));
const shares = compileHandler('api/shares/[id].ts', join(out, 'd'));
const core = createRequire(import.meta.url)(join(out, 'a', 'lib', 'messages-core.js'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const get = (q, ...a) => db.sqlite.prepare(q).get(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cat@s.test', 'Cat', 'Moss', 'student'],
  ['dan@s.test', 'Dan', 'Hill', 'student'], ['eve@s.test', 'Eve', 'Park', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C1', 'cat@s.test'], ['C1', 'dan@s.test'], ['C2', 'eve@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CAT = U('cat@s.test'), DAN = U('dan@s.test'), EVE = U('eve@s.test');
const T1 = U('t1@s.test', 'teacher');

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const people = (u) => call(inbox.onRequestGet, u, '/api/messages?people=1');
const list = (u) => call(inbox.onRequestGet, u, '/api/messages');
const count = async (u) => (await call(inbox.onRequestGet, u, '/api/messages?count=1')).body.unread;
const create = (u, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId: 'C1', ...body });
const dm = (u, to, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId: 'C1', to, body });
const open = (u, id) => call(one.onRequestGet, u, `/api/messages/${id}`, { id });
const post = (u, id, body, extra = {}) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { body, ...extra });
const act = (u, id, action, extra = {}) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { action, ...extra });
const edit = (u, id, messageId, body, mentions) => act(u, id, 'edit', { messageId, body, ...(mentions ? { mentions } : {}) });
const unsend = (u, id, messageId) => act(u, id, 'unsend', { messageId });
const panel = (u, body) => body === undefined
  ? call(teach.onRequestGet, u, '/api/classes/C1/messages', { id: 'C1' })
  : call(teach.onRequestPost, u, '/api/classes/C1/messages', { id: 'C1' }, 'POST', body);
const last = (view) => view.messages.at(-1);

let r = await people(ANA);
const c1 = r.body.classes.find((c) => c.id === 'C1');
const key = (name) => c1.people.find((p) => p.name === name).key;
const ANA_K = (await people(BEN)).body.classes.find((c) => c.id === 'C1').people.find((p) => p.name === 'Ana L.').key;
const BEN_K = key('Ben D.'), CAT_K = key('Cat M.'), DAN_K = key('Dan H.'), T1_K = key('Tess W.');
// Eve is in another class: she has a key (as anyone listed somewhere does), and it must never work in C1.
const EVE_K = 'p' + 'ee'.repeat(10);
sql(`INSERT INTO person_keys (email, key) VALUES ('eve@s.test', ?)`, EVE_K);

// ---- 0. the pure helpers ----
check('hasMention finds @Name, with its full name and a full stop', core.hasMention('hi @Ben D. look', 'Ben D.') && core.hasMention('@Ben D.', 'Ben D.'));
check('...not part of a longer name', !core.hasMention('hi @Ben D.Smith', 'Ben D.') && !core.hasMention('hi @Benjamin', 'Ben'));
check('...not an email address or a name without the @', !core.hasMention('x@Ben D. y', 'Ben D.') && !core.hasMention('Ben D. look', 'Ben D.'));
const parts = core.mentionParts('hey @Ben D. and @Ben D.! also @Cat M.', ['Ben D.', 'Cat M.']);
check('mentionParts cuts the words into plain and @name pieces', parts.filter((p) => p.mention).map((p) => p.text).join('|') === '@Ben D.|@Ben D.|@Cat M.' && parts.map((p) => p.text).join('') === 'hey @Ben D. and @Ben D.! also @Cat M.');

// ---- 1. editing ----
await call(inbox.onRequestGet, ANA, '/api/messages');
const G = (await list(ANA)).body.threads.find((t) => t.kind === 'channel' && t.title === 'general').id;
r = await post(ANA, G, 'helo everyone');
const A1 = last(r.body).id;
check('a fresh message is the author\'s to edit and delete, not edited', last(r.body).canEdit === true && last(r.body).canDelete === true && last(r.body).edited === false);
r = await open(BEN, G);
check("...and a classmate has neither button on it", last(r.body).canEdit === false && last(r.body).canDelete === false);
r = await edit(ANA, G, A1, 'hello everyone');
check('the author edits it: new words, marked edited', r.status === 200 && last(r.body).body === 'hello everyone' && last(r.body).edited === true);
check('...the author sees no history (only the class\'s teachers do)', last(r.body).history === undefined);
r = await open(BEN, G);
check('a classmate sees the new words and "edited", never the old', last(r.body).body === 'hello everyone' && last(r.body).edited === true && last(r.body).history === undefined && !JSON.stringify(r.body).includes('helo everyone'));
r = await open(T1, G);
check("the class's teacher sees the ORIGINAL", last(r.body).history?.length === 1 && last(r.body).history[0].body === 'helo everyone');
await edit(ANA, G, A1, 'hello, everyone!');
r = await open(T1, G);
check('...and every version between, the original first', last(r.body).history?.length === 2 && last(r.body).history[0].body === 'helo everyone' && last(r.body).history[1].body === 'hello everyone' && last(r.body).body === 'hello, everyone!');
const before = get(`SELECT COUNT(*) AS n FROM message_edits`).n;
r = await edit(ANA, G, A1, 'hello, everyone!');
check('saving the same words changes nothing and records nothing', r.status === 200 && get(`SELECT COUNT(*) AS n FROM message_edits`).n === before);
r = await edit(BEN, G, A1, 'ha ha, mine now');
check("nobody edits someone else's message (404)", r.status === 404 && get(`SELECT body FROM messages WHERE id = ?`, A1).body === 'hello, everyone!');
r = await edit(T1, G, A1, 'teacher edit');
check('...a teacher does not either', r.status === 404);
r = await edit(ANA, G, A1, 'call me at 555 201 3344');
check('the safety check runs on an edit, in plain words', r.status === 400 && r.body.safety === true && /phone number/.test(r.body.error) && get(`SELECT body FROM messages WHERE id = ?`, A1).body === 'hello, everyone!');
r = await edit(ANA, G, A1, '   ');
check('an edit to nothing is refused', r.status === 400);
r = await edit(ANA, G, 'f'.repeat(32), 'x');
check('a message that is not there is a 404', r.status === 404);
r = await edit(EVE, G, A1, 'x');
check('someone outside the class learns nothing (404)', r.status === 404);

sql(`INSERT INTO messages (id, thread_id, author_email, body, created_at) VALUES ('${'a1'.repeat(16)}', ?, 'ana@s.test', 'cap me', ?)`, G, now);
const CAPM = 'a1'.repeat(16);
for (let i = 0; i < 20; i++) sql(`INSERT INTO message_edits (id, message_id, thread_id, body, replaced_at, edited_by) VALUES (?, ?, ?, 'old', ?, 'ana@s.test')`, `e${String(i).padStart(31, '0')}`, CAPM, G, now - 3_600_000);
r = await edit(ANA, G, CAPM, 'one more');
check('a message takes 20 changes, then says so', r.status === 429 && /20 times/.test(r.body.error));
sql(`DELETE FROM message_edits WHERE message_id = ?`, CAPM);
for (let i = 0; i < 10; i++) sql(`INSERT INTO message_edits (id, message_id, thread_id, body, replaced_at, edited_by) VALUES (?, ?, ?, 'old', ?, 'ana@s.test')`, `m${String(i).padStart(31, '0')}`, CAPM, G, now);
r = await edit(ANA, G, CAPM, 'too fast');
check('10 edits in a minute is the most', r.status === 429 && /last minute/.test(r.body.error));
sql(`DELETE FROM message_edits WHERE message_id = ?`, CAPM);
sql(`DELETE FROM messages WHERE id = ?`, CAPM);

// ---- 2. deleting ----
r = await post(BEN, G, 'oops wrong chat');
const B1 = last(r.body).id;
r = await unsend(BEN, G, B1);
check('the author deletes: they see their own stub', r.status === 200 && last(r.body).deleted === true && last(r.body).body === null && last(r.body).canEdit === false && last(r.body).canDelete === false);
r = await open(ANA, G);
check('a classmate sees "deleted" and none of the words', last(r.body).deleted === true && last(r.body).body === null && !JSON.stringify(r.body).includes('oops wrong chat'));
r = await open(T1, G);
check("the class's teacher still reads the words", last(r.body).deleted === true && last(r.body).body === 'oops wrong chat');
r = await list(ANA);
const gl = r.body.threads.find((t) => t.id === G);
check('the mailbox list says "deleted" and gives no words', gl.last.deleted === true && gl.last.snippet === '');
r = await edit(BEN, G, B1, 'undelete');
check('a deleted message cannot be edited', r.status === 409);
r = await unsend(BEN, G, B1);
check('deleting twice is harmless', r.status === 200);
r = await unsend(ANA, G, B1);
check("nobody deletes someone else's message (404)", r.status === 404);

// ---- 3. a teacher's Remove and the author's delete are separate ----
r = await post(CAT, G, 'remove this one');
const C1m = last(r.body).id;
await act(T1, G, 'remove', { messageId: C1m });
r = await edit(CAT, G, C1m, 'changed');
check('after a teacher removed it the author cannot edit it', r.status === 403);
r = await unsend(CAT, G, C1m);
check('...or delete it', r.status === 403);
await act(T1, G, 'restore', { messageId: C1m });
r = await edit(CAT, G, C1m, 'remove this one, please');
check('once the teacher puts it back it is the author\'s again', r.status === 200 && last(r.body).body === 'remove this one, please');

// ---- 4. messages Off: delete yes, edit no ----
r = await post(DAN, G, 'my last words');
const D1 = last(r.body).id;
await panel(T1, { action: 'student-level', student: DAN_K, level: 2 });
r = await edit(DAN, G, D1, 'new words');
check('a student whose messages are Off cannot edit (403, plain words)', r.status === 403 && r.body.why === 'all-off' && get(`SELECT body FROM messages WHERE id = ?`, D1).body === 'my last words');
r = await open(DAN, G);
check('...and the page is told: no Edit button, a Delete button', last(r.body).canEdit === false && last(r.body).canDelete === true);
r = await unsend(DAN, G, D1);
check('...but can still delete it', r.status === 200 && last(r.body).deleted === true);
await panel(T1, { action: 'student-level', student: DAN_K, level: 0 });

// ---- 5. a program goes with its message ----
r = await post(CAT, G, '', { share: { kind: 'copy', lang: 'js', title: 'maze', code: 'let x = 1;' } });
const S = last(r.body);
check('a program with no words can be sent', r.status === 201 && S.share?.id);
r = await call(shares.onRequestGet, BEN, `/api/shares/${S.share.id}`, { id: S.share.id });
check('a classmate opens it', r.status === 200 && r.body.code === 'let x = 1;');
r = await edit(CAT, G, S.id, 'my maze');
check('its author gives it words by editing', r.status === 200 && last(r.body).body === 'my maze' && last(r.body).share?.id === S.share.id);
await unsend(CAT, G, S.id);
r = await call(shares.onRequestGet, BEN, `/api/shares/${S.share.id}`, { id: S.share.id });
check('once the author deletes it the program is gone for a classmate (404)', r.status === 404);
r = await call(shares.onRequestGet, T1, `/api/shares/${S.share.id}`, { id: S.share.id });
check("...but not for the class's teacher", r.status === 200 && r.body.code === 'let x = 1;');
r = await call(shares.onRequestGet, CAT, `/api/shares/${S.share.id}`, { id: S.share.id });
check('...nor for the author, who deleted it (404)', r.status === 404);

// ---- 6. @mentions ----
r = await create(ANA, { create: 'channel', name: 'plans' });
const PL = r.body.id;
check('a channel offers everyone in the class to @, not yourself, not another class', Array.isArray(r.body.mentionable) && r.body.mentionable.some((p) => p.name === 'Ben D.') && r.body.mentionable.some((p) => p.name === 'Tess W.') && !r.body.mentionable.some((p) => p.name === 'Ana L.' || p.name === 'Eve P.'));
r = await post(ANA, PL, 'hey @Ben D. and @Tess W., look', { mentions: [BEN_K, T1_K, EVE_K, CAT_K, 'pnotakey', 5] });
const M1 = last(r.body);
check('mentions are kept for people named in the words and who read it', r.status === 201 && M1.mentions.map((m) => m.name).sort().join('|') === 'Ben D.|Tess W.', M1.mentions);
check('...not for someone in another class, or named by key but not in the words', !M1.mentions.some((m) => m.name === 'Eve P.' || m.name === 'Cat M.') && get(`SELECT COUNT(*) AS n FROM message_mentions WHERE message_id = ?`, M1.id).n === 2);
check('the page can bold them: the reader\'s own is marked', (await open(BEN, PL)).body.messages.at(-1).mentions.find((m) => m.name === 'Ben D.').me === true);
// (that open marked it read for Ben; make a new mention for the counting tests)
r = await post(ANA, PL, 'also @Ben D.', { mentions: [BEN_K] });
check('a new mention counts on the envelope for someone who read the channel before', (await count(BEN)) === 1);
check('...while a channel message that names nobody else adds nothing for them', (await count(CAT)) === 0 && (await count(DAN)) === 0);
const CAT_SEES = (await post(ANA, PL, 'psst @Cat M.', { mentions: [CAT_K] })).body;
check('and it counts in a channel the person has never opened', get(`SELECT COUNT(*) AS n FROM message_members WHERE thread_id = ? AND email = 'cat@s.test'`, PL).n === 0 && (await count(CAT)) === 1);
r = await list(CAT);
check('the list marks it, and the channel is bold', r.body.threads.find((t) => t.id === PL).mentioned === true && r.body.threads.find((t) => t.id === PL).unread === true);
check("...an ordinary channel message still adds nothing for someone not named", (await count(DAN)) === 0);
await open(CAT, PL);
check('opening it clears the count and the mark', (await count(CAT)) === 0 && (await list(CAT)).body.threads.find((t) => t.id === PL).mentioned !== true);
r = await post(ANA, PL, 'last one, @Dan H.', { mentions: [DAN_K] });
const DM1 = last(r.body).id;
check('Dan is named: counts 1', (await count(DAN)) === 1);
await unsend(ANA, PL, DM1);
check('a deleted message tells nobody anything any more', (await count(DAN)) === 0);

// editing a mention
r = await post(ANA, PL, 'plan for @Ben D.', { mentions: [BEN_K] });
const EM = last(r.body).id;
await open(BEN, PL);
const benRowTime = get(`SELECT created_at FROM message_mentions WHERE message_id = ? AND email = 'ben@s.test'`, EM).created_at;
r = await edit(ANA, PL, EM, 'plan for @Ben D. and @Cat M.', [BEN_K, CAT_K]);
check('an edit that adds a mention adds a row for the new person only', r.status === 200 && get(`SELECT COUNT(*) AS n FROM message_mentions WHERE message_id = ?`, EM).n === 2 && get(`SELECT created_at FROM message_mentions WHERE message_id = ? AND email = 'ben@s.test'`, EM).created_at === benRowTime);
check('...and the new person is told (one conversation with an @)', (await count(CAT)) === 1);
await open(CAT, PL);
r = await edit(ANA, PL, EM, 'plan for @Cat M. only', [CAT_K]);
check('an edit that drops a name drops that mention', r.status === 200 && r.body.messages.at(-1).mentions.map((m) => m.name).join() === 'Cat M.');
r = await edit(ANA, PL, EM, 'plan for everyone');
check('an edit that sends no mentions names nobody (even if the words had been picked once)', r.status === 200 && get(`SELECT COUNT(*) AS n FROM message_mentions WHERE message_id = ?`, EM).n === 0);

// groups and direct messages
r = await create(ANA, { create: 'group', people: [BEN_K, CAT_K], title: 'Maze team' });
const GR = r.body.id;
check('a group offers its other people to @', r.body.mentionable.map((p) => p.name).sort().join('|') === 'Ben D.|Cat M.');
r = await post(ANA, GR, 'hi @Ben D. and @Dan H.', { mentions: [BEN_K, DAN_K] });
check('a group takes mentions only of its own people (Dan is not in it)', r.status === 201 && last(r.body).mentions.map((m) => m.name).join() === 'Ben D.');
r = await dm(ANA, BEN_K, 'hello @Ben D.');
const DMT = r.body.id;
check('a two-person conversation has no @ list', r.status === 201 && r.body.mentionable === undefined);
r = await post(ANA, DMT, 'again @Ben D.', { mentions: [BEN_K] });
check('...and takes no mentions', r.status === 201 && last(r.body).mentions.length === 0 && get(`SELECT COUNT(*) AS n FROM message_mentions WHERE thread_id = ?`, DMT).n === 0);

// ---- 7. a student-teacher conversation: the teacher still sees the original ----
r = await dm(CAT, T1_K, 'i didnt do it');
const TT = r.body.id;
const TM = last(r.body).id;
await edit(CAT, TT, TM, 'i did it');
r = await open(T1, TT);
check('in a direct message to a teacher, the teacher sees what it said before', r.status === 200 && last(r.body).body === 'i did it' && last(r.body).history?.[0].body === 'i didnt do it');
await unsend(CAT, TT, TM);
r = await open(T1, TT);
check('...and what a student deleted', last(r.body).deleted === true && last(r.body).body === 'i did it');
r = await open(CAT, TT);
check('...which the student no longer reads', last(r.body).body === null);

// ---- 8. the teacher's panel ----
r = await call(inbox.onRequestPost, BEN, '/api/messages', {}, 'POST', { classId: 'C1', to: DAN_K, body: 'plain talk' });
const BD = r.body.id;
await edit(BEN, BD, last(r.body).id, 'talk');
r = await panel(T1);
check('the panel lists the conversation', r.body.threads.some((t) => t.id === BD));
r = await call(teach.onRequestGet, T1, `/api/classes/C1/messages?thread=${BD}`, { id: 'C1' });
check('...and a conversation opens with its edit history and deleted marks', r.body.thread.messages.at(-1).edited === true && r.body.thread.messages.at(-1).history?.[0].body === 'plain talk' && r.body.thread.messages.at(-1).deleted === false);

// ---- 9. deleting a conversation removes the history and mentions ----
check('a channel has edit history and mentions before it goes', get(`SELECT COUNT(*) AS n FROM message_edits WHERE thread_id = ?`, G).n > 0 && get(`SELECT COUNT(*) AS n FROM message_mentions WHERE thread_id = ?`, PL).n > 0);
r = await act(T1, PL, 'delete');
check('a teacher deletes the channel', r.status === 200);
check('...its mentions are gone', get(`SELECT COUNT(*) AS n FROM message_mentions WHERE thread_id = ?`, PL).n === 0 && get(`SELECT COUNT(*) AS n FROM message_edits WHERE thread_id = ?`, PL).n === 0);

check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));
void CAT_SEES; void ANA_K;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
