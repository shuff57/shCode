#!/usr/bin/env node
// "Everyone", the Public rung (migration 0058; functions/_shared/publicShare.ts), on a real SQLite with every migration
// applied, through the real handlers. What has to hold:
//   1. who sees Public: a VETTED account (a student in a live class, a teacher, an admin) and nobody else, however
//      they signed up; not the open web, not a student with no class;
//   2. making it public: live at once, refused for personal details, refused when a class switched it off or a teacher
//      pulled it; it also keeps the item in all the owner's classes (where a pulled one falls back to);
//   3. a public viewer plays, copies and stars, but gets NO comments, suggestions, proposed changes or versions;
//   4. the class switch hides what its students had public, and restoring it brings it back;
//   5. a teacher pulls anything a student of THAT class made public, with an optional reason; the pull is sticky
//      (narrowing, stopping and re-sharing cannot undo it); only a teacher puts it back; a teacher of another class
//      cannot touch it, one of a student's two classes can;
//   6. teachers are told in the Activity feed, the owner is told of a pull; a student who leaves their last class goes dark;
//   7. no answer carries an email.

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'public-share-test');
let n = 0;
const h = (entry) => compileHandler(entry, join(out, String(n++)));
const aud = h('api/audiences.ts');
const lib = h('api/library/index.ts');
const share = h('api/library/[id]/share.ts');
const sharedOne = h('api/library/shared/[id].ts');
const sharedList = h('api/library/shared/index.ts');
const games = h('api/games/index.ts');
const gshare = h('api/games/[id]/share.ts');
const gone = h('api/games/[id].ts');
const assets = h('api/games/[id]/assets.ts');
const star = h('api/games/[id]/star.ts');
const changes = h('api/games/[id]/changes.ts');
const versions = h('api/games/[id]/versions.ts');
const suggestions = h('api/games/[id]/suggestions.ts');
const comments = h('api/games/[id]/comments.ts');
const pub = h('api/public.ts');
const panel = h('api/classes/[id]/public-shares/index.ts');
const notes = h('api/notifications.ts');
const leave = h('api/leave-class.ts');
const nc = createRequire(import.meta.url)(join(out, String(n - 3), 'lib', 'game-notices-core.js'));

const db = makeD1();
const r2 = new Map();
const env = { DB: db, UPLOADS: {
  async put(k, v) { r2.set(k, String(v)); },
  async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; },
  async delete(k) { r2.delete(k); },
} };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const get = (q, ...a) => db.sqlite.prepare(q).get(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cy@s.test', 'Cy', 'Moss', 'student'],
  ['dee@s.test', 'Dee', 'Hill', 'student'], ['loner@s.test', 'Lo', 'Ner', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'], ['adm@s.test', 'Ad', 'Min', 'admin'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
const mkClass = (id, name, code, owner) => sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, code, owner, now);
mkClass('C1', 'Period 1', 'AAAAAA', 't1@s.test');
mkClass('C2', 'Robotics', 'BBBBBB', 't2@s.test');
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cy@s.test'], ['C1', 'dee@s.test'], ['C2', 'dee@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CY = U('cy@s.test'), DEE = U('dee@s.test'), LONER = U('loner@s.test');
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher'), ADM = U('adm@s.test', 'admin');

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  // my-enrollments-style routes are not here; creating things answers with names only
  bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');
const share$ = (u, id, body) => call(share.onRequestPost, u, `/api/library/${id}/share`, { id }, 'POST', body);
const gshare$ = (u, id, body) => call(gshare.onRequestPost, u, `/api/games/${id}/share`, { id }, 'POST', body);
const list = (u) => call(pub.onRequestGet, u, '/api/public');
const hasItem = async (u, id) => ((await list(u)).body.items ?? []).some((i) => i.id === id);
const hasGame = async (u, id) => ((await list(u)).body.games ?? []).some((g) => g.id === id);
const pnl = (u, classId, body) => body === undefined
  ? call(panel.onRequestGet, u, `/api/classes/${classId}/public-shares`, { id: classId })
  : call(panel.onRequestPost, u, `/api/classes/${classId}/public-shares`, { id: classId }, 'POST', body);
const pubRow = (kind, id) => get(`SELECT hidden_at, hidden_reason FROM public_shares WHERE kind = ? AND id = ?`, kind, id);
const classRows = (id) => db.sqlite.prepare(`SELECT class_id FROM library_shares WHERE item_id = ? ORDER BY class_id`).all(id).map((r) => r.class_id).join(',');

const saved = await call(lib.onRequestPut, ANA, '/api/library', {}, 'PUT', { kind: 'texture', name: 'dragon', dataUri: PNG, meta: null });
const ID = saved.body.item.id;
const GID = 'c'.repeat(32);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at, share_choice) VALUES (?, 'ana@s.test', 'Dodge', ?, 'none', 1, ?, ?, 'credit')`,
  GID, `function setup() { image('dragon'); }`, now, now);

// ---- 1. who may see it ----
let r = await call(aud.onRequestGet, ANA, '/api/audiences');
check('a student in a class is offered Everyone', r.body.public.allowed === true, r.body.public);
r = await call(aud.onRequestGet, LONER, '/api/audiences');
check('a student with no class is not, and is told why', r.body.public.allowed === false && /class/i.test(r.body.public.why ?? ''), r.body);
r = await list(LONER);
check('...and cannot see Everyone (403, plain words)', r.status === 403 && r.body.vetted === false && /Join a class/.test(r.body.error), r);
r = await list(CY);
check('a student in any class can (and sees nothing yet)', r.status === 200 && r.body.items.length === 0 && r.body.games.length === 0, r);
check('teachers and admins can', (await list(T2)).status === 200 && (await list(ADM)).status === 200);

// ---- 2. making it public ----
r = await share$(LONER, ID, { share: true, audience: { public: true } });
check("nobody makes someone else's item public (404)", r.status === 404);
r = await share$(ANA, ID, { share: true, audience: { public: true } });
check('Ana makes her picture public: live at once', r.status === 200 && r.body.audience?.kind === 'public' && pubRow('item', ID) && pubRow('item', ID).hidden_at === null, r);
check('...it also stays in her class (where a pulled one falls back to)', classRows(ID) === 'C1');
check('...Cy, in ANOTHER class, sees it; so does a teacher of another class; the loner does not', (await hasItem(CY, ID)) && (await hasItem(T2, ID)) && (await list(LONER)).status === 403);
r = await list(CY);
const it = r.body.items.find((i) => i.id === ID);
check("...named first name + last initial, never an email, copyable under 'credit'", it.owner === 'Ana L.' && it.canCopy === true && it.className === 'Everyone' && !JSON.stringify(r.body).includes('@'), it);
r = await call(sharedOne.onRequestGet, CY, `/api/library/shared/${ID}`, { id: ID });
check('Cy can fetch its content to copy it', r.status === 200 && r.body.dataUri === PNG, r.status);
r = await call(sharedOne.onRequestGet, LONER, `/api/library/shared/${ID}`, { id: ID });
check('the loner cannot (404)', r.status === 404);
r = await call(lib.onRequestGet, ANA, '/api/library');
check("her own list reports it as public", r.body.items[0].audience?.kind === 'public', r.body.items[0]);

r = await gshare$(ANA, GID, { share: true, audience: { public: true } });
check('she makes her game public too', r.status === 200 && r.body.audience?.kind === 'public' && classRowsGame(GID) === 'C1', r);
function classRowsGame(id) { return db.sqlite.prepare(`SELECT class_id FROM library_game_shares WHERE game_id = ? ORDER BY class_id`).all(id).map((x) => x.class_id).join(','); }
check('...Cy sees it in Everyone', await hasGame(CY, GID));

// ---- 3. what a public viewer gets, and does not ----
r = await call(gone.onRequestGet, CY, `/api/games/${GID}`, { id: GID });
check('Cy can open it to play (it is not shared with his class)', r.status === 200 && r.body.game.code.includes('dragon') && r.body.game.mine === false, r.status);
r = await call(gone.onRequestGet, LONER, `/api/games/${GID}`, { id: GID });
check('the loner cannot (404)', r.status === 404);
r = await call(assets.onRequestGet, CY, `/api/games/${GID}/assets`, { id: GID });
check("a public game brings the author's PUBLIC pictures", r.status === 200 && r.body.assets.some((a) => a.name === 'dragon'), r.body);
sql(`DELETE FROM public_shares WHERE kind = 'item' AND id = ?`, ID);
r = await call(assets.onRequestGet, CY, `/api/games/${GID}/assets`, { id: GID });
check("...but not one that is only shared with a class", r.status === 200 && !r.body.assets.some((a) => a.name === 'dragon') && r.body.missingItems?.some((m) => m.name === 'dragon'), r.body);
sql(`INSERT INTO public_shares (kind, id, owner_email, shared_at) VALUES ('item', ?, 'ana@s.test', ?)`, ID, now);
r = await call(star.onRequestPost, CY, `/api/games/${GID}/star`, { id: GID }, 'POST', { on: true });
check('a public viewer can star it', r.status === 200, r);
r = await call(changes.onRequestGet, CY, `/api/games/${GID}/changes`, { id: GID });
check("...but NOT read its proposed changes (404): those are class-only conversations", r.status === 404, r);
r = await call(versions.onRequestGet, CY, `/api/games/${GID}/versions`, { id: GID });
check('...nor its versions (404)', r.status === 404, r);
r = await call(suggestions.onRequestPost, CY, `/api/games/${GID}/suggestions`, { id: GID }, 'POST', { suggestion: 'harder', on: true });
check('...nor make suggestions on it', r.status === 403, r);
r = await call(comments.onRequestPost, CY, `/api/games/${GID}/comments`, { id: GID }, 'POST', { body: 'hello' });
check('...nor comment on it', r.status === 403 || r.status === 404, r);
r = await call(changes.onRequestGet, BEN, `/api/games/${GID}/changes`, { id: GID });
check('while a classmate (through the class) still reads them', r.status === 200, r.status);

// ---- 2b. safety ----
const bad = await call(lib.onRequestPut, ANA, '/api/library', {}, 'PUT', { kind: 'sound', name: 'call 555 201 3344', dataUri: 'data:audio/wav;base64,UklGRg==', meta: null });
if (bad.status === 201 || bad.status === 200) {
  const BAD_ID = bad.body.item.id;
  r = await share$(ANA, BAD_ID, { share: true, audience: { public: true } });
  check('a name with a phone number is refused for Everyone, in plain words', r.status === 400 && /phone number/.test(r.body.error) && !pubRow('item', BAD_ID), r);
  r = await share$(ANA, BAD_ID, { share: true, audience: { classes: ['C1'] } });
  check('...but is fine to share with her class', r.status === 200);
} else {
  check('(a sound name with a phone number could not be saved at all, so it never reaches Everyone)', true);
}
const G2 = 'd'.repeat(32);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Mail', 'let x = "write me at kid@school.org";', 'none', 1, ?, ?)`, G2, now, now);
r = await gshare$(ANA, G2, { share: true, audience: { public: true } });
check('a game whose CODE has an email address is refused for Everyone', r.status === 400 && /email address/.test(r.body.error) && !pubRow('game', G2), r);

// ---- 4. the class switch ----
r = await pnl(T1, 'C1', { action: 'class-off' });
check('a teacher turns Everyone off for the class', r.status === 200 && r.body.publicSharingOff === true);
check('...what Ana had public goes dark at once', !(await hasItem(CY, ID)) && !(await hasGame(CY, GID)));
r = await call(gone.onRequestGet, CY, `/api/games/${GID}`, { id: GID });
check('...and the game cannot be opened through Everyone (404)', r.status === 404);
r = await call(aud.onRequestGet, ANA, '/api/audiences');
check('...Everyone is closed to her, with the class named', r.body.public.allowed === false && /Period 1/.test(r.body.public.why), r.body.public);
r = await share$(ANA, ID, { share: true, audience: { public: true } });
check('...and making something public is refused (403)', r.status === 403 && /Period 1/.test(r.body.error), r);
r = await pnl(T1, 'C1', { action: 'class-on' });
check('switching it back on brings it all back', r.body.publicSharingOff === false && (await hasItem(CY, ID)) && (await hasGame(CY, GID)));

// ---- 5. the teacher's list and pulling ----
r = await pnl(T1, 'C1');
check('"Newly public": the class list shows her picture and game, newest first, by name', r.status === 200 && r.body.items.length === 2 && r.body.items.every((x) => x.owner === 'Ana L.' && x.pulled === null) && r.body.items.some((x) => x.name === 'Dodge' && x.what === 'game') && r.body.items.some((x) => x.name === 'dragon' && x.what === 'picture'), r.body);
check("...it does not name an email", !JSON.stringify(r.body).includes('@'));
check("a teacher of ANOTHER class cannot open Period 1's list (403)", (await pnl(T2, 'C1')).status === 403);
check('a student cannot (403)', (await pnl(ANA, 'C1')).status === 403);
r = await pnl(T2, 'C2');
check("Robotics's list does not show Ana's work (she is not in it)", r.body.items.length === 0, r.body);
r = await pnl(T2, 'C2', { action: 'pull', kind: 'item', id: ID });
check("a teacher cannot pull a student who is not in their class (404)", r.status === 404 && pubRow('item', ID).hidden_at === null);
r = await pnl(T1, 'C1', { action: 'pull', kind: 'item', id: ID, reason: 'x'.repeat(141) });
check('a reason over 140 characters is refused', r.status === 400 && pubRow('item', ID).hidden_at === null);
r = await pnl(T1, 'C1', { action: 'pull', kind: 'item', id: ID, reason: 'Please rename it to something about the picture.' });
check('Tess pulls it with a reason', r.status === 200 && r.body.items.find((x) => x.id === ID).pulled?.reason === 'Please rename it to something about the picture.', r.body);
check('...it is gone from Everyone for everybody', !(await hasItem(CY, ID)) && !(await hasItem(T2, ID)));
r = await call(sharedOne.onRequestGet, CY, `/api/library/shared/${ID}`, { id: ID });
check('...and cannot be fetched through it (404)', r.status === 404);
r = await call(sharedList.onRequestGet, BEN, '/api/library/shared');
check("...but falls back to Ana's class, where Ben still sees it", r.body.items.some((i) => i.id === ID), r.body.items.map((i) => i.id));
r = await call(lib.onRequestGet, ANA, '/api/library');
const mine = r.body.items.find((i) => i.id === ID);
check('Ana is told on the item, with the reason', mine.pulled?.reason === 'Please rename it to something about the picture.' && mine.audience?.kind !== 'public', mine);
r = await share$(ANA, ID, { share: true, audience: { public: true } });
check('she cannot make it public again (403) and is told what the teacher said', r.status === 403 && /took this down: Please rename it/.test(r.body.error), r);
await share$(ANA, ID, { share: true, audience: { classes: ['C1'] } });
await share$(ANA, ID, { share: false });
check('narrowing and stopping do not undo the pull (the row stays pulled)', pubRow('item', ID)?.hidden_at != null);
await share$(ANA, ID, { share: true, audience: { classes: ['C1'] } });
r = await share$(ANA, ID, { share: true, audience: { public: true } });
check('...so she still cannot (403)', r.status === 403);
r = await pnl(T1, 'C1', { action: 'pull', kind: 'item', id: ID });
check('pulling what is already pulled is a 409', r.status === 409);
r = await pnl(T1, 'C1', { action: 'restore', kind: 'game', id: GID });
check('restoring what is not pulled is a 409', r.status === 409);
r = await pnl(T1, 'C1', { action: 'restore', kind: 'item', id: ID });
check('a teacher puts it back: the pull is lifted and it leaves the "Newly public" list', r.status === 200 && !pubRow('item', ID) && !r.body.items.some((x) => x.id === ID), r.body);
check('...restoring gives back the permission, NOT the publication: she had narrowed it to her class, so it stays there', !(await hasItem(CY, ID)) && classRows(ID) === 'C1');
r = await share$(ANA, ID, { share: true, audience: { public: true } });
check('...and now she can choose Everyone again, which makes it live', r.status === 200 && (await hasItem(CY, ID)));

// ---- 5b. a student with two teachers ----
const DEE_SAVED = await call(lib.onRequestPut, DEE, '/api/library', {}, 'PUT', { kind: 'texture', name: 'deepic', dataUri: PNG, meta: null });
const DID = DEE_SAVED.body.item.id;
await share$(DEE, DID, { share: true, audience: { public: true } });
check("Dee is in both classes: both teachers see her item in their list", (await pnl(T1, 'C1')).body.items.some((x) => x.id === DID) && (await pnl(T2, 'C2')).body.items.some((x) => x.id === DID));
r = await pnl(T2, 'C2', { action: 'pull', kind: 'item', id: DID, reason: '' });
check('...and either may pull it (an empty reason is allowed)', r.status === 200 && pubRow('item', DID).hidden_at != null && pubRow('item', DID).hidden_reason === null, r.body);

// ---- 6. told in the app ----
r = await call(notes.onRequestGet, T1, '/api/notifications');
const tn = r.body.items.filter((i) => i.kind === 'public');
check('Tess is told in the Activity feed what her students made public (not who pulled)', tn.some((i) => i.title === 'dragon' && i.who === 'Ana L.' && i.pulled === false && i.classId === 'C1') && tn.some((i) => i.title === 'Dodge'), tn);
check("...and it links to her class list", tn.every((i) => i.classId === 'C1' || i.classId === 'C2'));
r = await call(notes.onRequestGet, T2, '/api/notifications');
check("Tom is not told about Ana's work (she is not in his class)", !r.body.items.some((i) => i.kind === 'public' && i.who === 'Ana L.'), r.body.items);
r = await call(notes.onRequestGet, DEE, '/api/notifications');
const dn = r.body.items.find((i) => i.kind === 'public' && i.pulled);
check('Dee is told a teacher took hers down: "Your teacher", with no reason when none was given', dn && dn.who === 'Your teacher' && dn.title === 'deepic' && dn.snippet === '', r.body.items);
await pnl(T1, 'C1', { action: 'pull', kind: 'game', id: GID, reason: 'Wait until it has a title screen.' });
r = await call(notes.onRequestGet, ANA, '/api/notifications');
const an = r.body.items.find((i) => i.kind === 'public' && i.pulled && i.title === 'Dodge');
check('Ana is told, with the reason a teacher typed', an && an.snippet === 'Wait until it has a title screen.' && an.what === 'game', r.body.items);
r = await call(games.onRequestGet, ANA, '/api/games');
check("her games list reports the pull on the game", r.body.games.find((g) => g.id === GID).pulled?.reason === 'Wait until it has a title screen.');
r = await call(gone.onRequestGet, ANA, `/api/games/${GID}`, { id: GID });
check('...and so does opening it', r.body.game.pulled?.reason === 'Wait until it has a title screen.');
r = await call(gone.onRequestGet, CY, `/api/games/${GID}`, { id: GID });
check('a pulled game cannot be opened through Everyone (404)', r.status === 404);
r = await call(gone.onRequestGet, BEN, `/api/games/${GID}`, { id: GID });
check("...but her classmate still plays it through the class", r.status === 200);

// ---- 6b. leaving the last class ----
r = await call(leave.onRequestPost, ANA, '/api/leave-class', {}, 'POST', { classId: 'C1' });
check('Ana leaves her last class', r.status === 200);
check('...what she made public goes dark (Everyone needs a class)', !(await hasItem(CY, ID)));
r = await call(aud.onRequestGet, ANA, '/api/audiences');
check('...and Everyone is closed to her', r.body.public.allowed === false);

// ---- 7. the notice's words, link and unread rule (lib/game-notices-core.ts, shared with the bell) ----
const mk = (extra) => ({ kind: 'public', key: 'public:game:x', what: 'game', title: 'Dodge', who: 'Ana L.', pulled: false, snippet: '', at: Date.now() - 1000, ...extra });
check('a teacher\'s notice reads "<name> made the game "Dodge" public" and opens the class list',
  nc.noticeAction(mk({})) === 'made the game “Dodge” public' && nc.noticeHref(mk({ classId: 'C1' })) === '/teacher/?class=C1&tab=students#public-shares');
check('an owner\'s notice says a teacher took it down and opens the right Library tab',
  /^took down your game “Dodge”:$/.test(nc.noticeAction(mk({ pulled: true, snippet: 'why' }))) && nc.noticeHref(mk({ pulled: true, what: 'picture' })) === '/library/?tab=pictures' && nc.noticeHref(mk({ pulled: true })) === '/library/?tab=games');
check('it is unread until that notice was opened, then read (keyed by the notice, not the game)',
  nc.isUnread(mk({}), { changes: {}, games: {}, readAllAt: null }, Date.now()) === true
  && nc.isUnread(mk({}), { changes: {}, games: { 'public:game:x': Date.now() }, readAllAt: null }, Date.now()) === false
  && nc.isUnread(mk({}), { changes: {}, games: { x: Date.now() }, readAllAt: null }, Date.now()) === true);

check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
