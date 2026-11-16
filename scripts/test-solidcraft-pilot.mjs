// Real sandbox runtime + production grade function: starter/incorrect work,
// class-name variations, refused features, and teacher-policy authorization.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { grade } from '../lib/grader.ts';
import { cadPolicy } from '../lib/solidcraft-policy.ts';
import { cadToolbarCrop } from '../lib/solidcraft-viewport.ts';
import { onRequestGet as myModes } from '../functions/api/my-lesson-modes.ts';
import { makeD1 } from './_d1-sqlite.mjs';
import { onRequestPost } from '../functions/api/classes/[id]/lesson-modes.ts';
const id = '9-1-12-lab-one-class-two-parts';
assert.equal(cadToolbarCrop([0, 151, 731, 35], 731, 186), 151, 'a short view still allows Run after the frame expands');
assert.equal(cadToolbarCrop([0, 151, 731, 35], 1462, 372), 302, 'UI points scale to CSS pixels');
assert.equal(cadToolbarCrop([0, 0, 731, 186], 731, 186), 0, 'a toolbar-free view needs no crop');
for (const viewport of [[0, 151, 731, 0], [0, 186, 731, 1], [0, NaN, 731, 35], [0, 10, 0, 35]]) {
  assert.throws(() => cadToolbarCrop(viewport, 731, 186), /could not be measured/);
}
const meta = JSON.parse(readFileSync(`lessons/${id}/lesson.json`, 'utf8'));
const reference = readFileSync(`lessons/${id}/solution.js`, 'utf8');
const starter = readFileSync(`lessons/${id}/script.js`, 'utf8');
let listener, result;
const parent = { postMessage(value) { if (value.source === 'reshape-result') result = value; } };
const window = { parent, addEventListener(_type, fn) { listener = fn; } };
const context = vm.createContext({ window, console });
vm.runInContext(readFileSync('vendor/solidcraft-preview/pane/bundle/runner.js', 'utf8'), context);
function run(code) { result = null; listener({ source: parent, data: { source: 'reshape-run', runId: 1, code } }); return result; }
function score(code, doc, refusals = null) { return grade(meta.requirements, { 'script.js': code }, 0, { modelDoc: doc, refusals }).results; }
const built = run(reference);
assert.equal(built.errors.length, 0);
assert.equal(score(reference, built.doc).filter(r => r.status === 'passed').length, 3);
assert.equal(score(starter, run(starter).doc).some(r => r.status === 'failed'), true);
assert.equal(score(reference, null).at(-1).status, 'failed', 'unbuilt/stale code must not pass');
const hole = built.doc.features.find(f => f.kind === 'hole');
assert.equal(score(reference, built.doc, { [hole.id]: 'This hole was not built.' }).at(-1).status, 'failed');
const wrong = reference.replace('small.width = 42', 'small.width = 54');
assert.equal(score(wrong, run(wrong).doc).at(-1).status, 'failed', 'two equal-width parts must fail');
const alias = reference.replaceAll('MountingPlate', 'Part').replaceAll('small', 'left').replaceAll('large', 'right');
assert.equal(score(alias, run(alias).doc).every(r => r.status === 'passed'), true);
const procedural = 'const a = box(42,30,8,{at:[0,0,0]}); hole(a,{across:6}); const b = box(54,30,8,{at:[80,0,0]}); hole(b,{across:6});';
assert.equal(JSON.stringify(run(procedural).doc), JSON.stringify(built.doc), 'class method must lower to the same feature recipe');
assert.equal(score(procedural, run(procedural).doc)[0].status, 'failed');
const comments = '// class Fake { constructor() { this.a = 1; } build() {} }\n// new Fake(); new Fake(); a.build(); b.build();\n' + procedural;
assert.equal(score(comments, run(comments).doc)[0].status, 'failed', 'comments cannot satisfy the OOP card');
assert.equal(run('class Broken {').doc, null);
assert.equal(cadPolicy(id, null).toolsAllowed, false);
assert.equal(cadPolicy(id, { classDefault: null, lessons: {} }).toolsAllowed, false);
assert.equal(cadPolicy(id, { classDefault: 'both', lessons: {} }).toolsAllowed, true);
assert.equal(cadPolicy(id, { classDefault: 'both', lessons: { [id]: 'code' } }).toolsAllowed, false);
assert.equal(cadPolicy(id, { classDefault: 'code', lessons: { [id]: 'both' } }).toolsAllowed, true);
// Persist through the real handlers and a D1 facade over real SQLite.
const DB = makeD1();
for (const [email, role] of [['owner@test', 'teacher'], ['student@test', 'student'], ['other@test', 'teacher']]) DB.sqlite.prepare('INSERT INTO students (email,password_hash,role,created_at) VALUES (?, ?, ?, ?)').run(email, 'test', role, Date.now());
DB.sqlite.prepare('INSERT INTO classes (id,name,code,owner_email,school_year,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('c', 'CAD pilot', 'CAD123', 'owner@test', '2026', Date.now());
DB.sqlite.prepare('INSERT INTO enrollments (class_id,student_email,enrolled_at,expires_at) VALUES (?, ?, ?, ?)').run('c','student@test',Date.now(),Date.now()+86400000);
async function set(email, role, lessonId, mode) {
  return onRequestPost({ env: { DB }, data: { email, role }, params: { id: 'c' }, request: new Request('http://test/api/classes/c/lesson-modes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId, mode }) }) });
}
for (const [email, role] of [['student@test', 'student'], ['owner@test', 'student'], ['other@test', 'teacher']]) assert.equal((await set(email, role, id, 'both')).status, 403);
assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM lesson_modes').get().n, 0);
assert.equal((await set('owner@test', 'teacher', '*', 'both')).status, 200);
assert.equal((await set('owner@test', 'teacher', id, 'code')).status, 200);
const readModes = async () => (await myModes({ env: { DB }, data: { email: 'student@test', role: 'student' } })).json();
assert.equal(cadPolicy(id, await readModes()).toolsAllowed, false, 'saved assignment beats saved class policy');
assert.equal((await set('owner@test', 'teacher', id, null)).status, 200);
assert.equal(cadPolicy(id, await readModes()).toolsAllowed, true, 'clearing assignment restores class policy');
DB.sqlite.close();
console.log('SolidCraft pilot: reference, wrong/stale/refused work, OOP aliases, and persisted teacher-only policy pass.');
