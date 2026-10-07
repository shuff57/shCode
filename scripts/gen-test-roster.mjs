import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATTEMPT_CAPS } from '../functions/_shared/pa-pseudocode.generated.ts';
import { COUNT_SINCE } from '../lib/attempt-cap.ts';

// Builds a labelled TEST class for a live check of the teacher side, as two SQL files you review and run:
//
//   node scripts/gen-test-roster.mjs --owner <teacher email> [--out <dir>]   writes <dir>/testroster.sql and testroster-undo-all.sql
//   node scripts/d1.mjs execute shcode-commits --remote --file <dir>/testroster.sql -y        (create)
//   node scripts/d1.mjs execute shcode-commits --remote --file <dir>/testroster-undo-all.sql -y   (delete it all again)
//
// The class ("ZZ Gradebook Test Roster (delete me)") is owned by OWNER, has six fake students
// (gbtest-*@example-test.invalid, login-disabled password hashes) at known places: up to date, behind, partway,
// no work (plus one AI-grading failure), everything late, waived lessons; five module due dates, one lesson that
// is not open yet, a teacher-reviewed score and a capped part with 2 of 3 tries used. Expected roster grades:
// Ada 100, Ben 59, Cleo 32, Dev 0, Eli 100, Fay 100 (the demo seeds the same class). Nothing here touches a real
// class. docs: HANDOFF.md "How to check the teacher side live".
const argv = process.argv.slice(2);
const S = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : fs.mkdtempSync(path.join(os.tmpdir(), 'testroster-'));
fs.mkdirSync(S, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'public', 'lessons-manifest.json'), 'utf8')).lessons;
const modOf = (t) => /^(\d+\.\d+)\.\d+/.exec(t || '')?.[1] ?? null;
const graded = man.filter((l) => (l.assignmentCode || l.preview === 'quiz' || l.scoreKind === 'written') && modOf(l.title));
const inMods = (mods) => graded.filter((l) => mods.includes(modOf(l.title)));
const now = Date.now(), DAY = 86400000, FAR = 4102444800000;
// The teacher who owns the test class (an existing teacher/admin account). Required: this repo is public, so no
// address is baked in.
const OWNER = argv.includes('--owner') ? argv[argv.indexOf('--owner') + 1] : process.env.TEST_ROSTER_OWNER;
if (!OWNER || !OWNER.includes('@')) {
  console.error('Pass --owner <teacher email> (or set TEST_ROSTER_OWNER): the existing account that will own the test class.');
  process.exit(1);
}
const CID = 'gbtest-roster-0c1f7a52-6d0e-4b8e-9f3a-2b6d4a1e8c90';
const q = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
const out = [], undo = [];
const ins = (t, cols, vals) => out.push(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${vals.map(q).join(', ')});`);
ins('classes', ['id', 'name', 'code', 'owner_email', 'school_year', 'created_at'], [CID, 'ZZ Gradebook Test Roster (delete me)', 'ZXQ7K3', OWNER, '2026-2027', now]);
for (const [m, at] of [['1.1', now - 20 * DAY], ['1.2', now - 14 * DAY], ['1.3', now - 7 * DAY], ['1.4', now - 2 * DAY], ['1.5', now + 7 * DAY]]) ins('class_due_dates', ['class_id', 'scope', 'scope_id', 'due_at', 'set_by', 'set_at'], [CID, 'module', m, at, OWNER, now]);
const locked = inMods(['1.5'])[0];
if (locked) ins('class_open_dates', ['class_id', 'scope', 'scope_id', 'open_at', 'set_by', 'set_at'], [CID, 'lesson', locked.id, now + 3 * DAY, OWNER, now]);
const students = [['gbtest-ada', 'Ada', 'Lovelace', 'all'], ['gbtest-ben', 'Ben', 'Franklin', 'early'], ['gbtest-cleo', 'Cleo', 'Patra', 'partial'], ['gbtest-dev', 'Dev', 'Patel', 'none'], ['gbtest-eli', 'Eli', 'Whitney', 'late'], ['gbtest-fay', 'Fay', 'Ray', 'waived']].map(([u, f, l, k]) => [u + '@example-test.invalid', f, l, k]);
let id = 0;
for (const [email, first, last, kind] of students) {
  ins('students', ['email', 'password_hash', 'created_at', 'first_name', 'last_name'], [email, 'login-disabled-test-account', now, first, last]);
  ins('enrollments', ['class_id', 'student_email', 'enrolled_at', 'expires_at'], [CID, email, now, FAR]);
  const put = (l, state, completedAt, score) => ins('lesson_state', ['student_email', 'lesson_id', 'state', 'started_at', 'completed_at', 'score'], [email, l.id, state, now - 30 * DAY, completedAt, score]);
  const full = (l) => (l.maxScore ? l.maxScore : null);
  if (kind === 'all' || kind === 'waived') for (const l of inMods(kind === 'all' ? ['1.1', '1.2', '1.3', '1.4'] : ['1.1', '1.2', '1.3'])) put(l, 'completed', now - 25 * DAY, full(l));
  if (kind === 'early') for (const l of inMods(['1.1', '1.2'])) put(l, 'completed', now - 15 * DAY, full(l));
  if (kind === 'late') for (const l of inMods(['1.1', '1.2', '1.3', '1.4'])) put(l, 'completed', now - 1 * DAY, full(l));
  if (kind === 'partial') { const ls = inMods(['1.1', '1.2', '1.3']); ls.slice(0, Math.ceil(ls.length / 2)).forEach((l) => put(l, 'completed', now - 18 * DAY, l.maxScore ? Math.max(1, Math.round(l.maxScore * 0.6)) : null)); if (ls.at(-1)) put(ls.at(-1), 'started', null, null); }
  if (kind === 'waived') for (const l of inMods(['1.4'])) ins('lesson_due_waivers', ['class_id', 'student_email', 'lesson_id', 'granted_by', 'granted_at'], [CID, email, l.id, OWNER, now]);
  const sub = (lid, gj, score, possible, at) => ins('lesson_submissions', ['id', 'student_email', 'lesson_id', 'response', 'grade_json', 'score', 'possible', 'submitted_at'], [`gbtest-sub-${++id}`, email, lid, 'test answer', gj === null ? null : JSON.stringify(gj), score, possible, at]);
  if (kind === 'early') { const capId = Object.keys(ATTEMPT_CAPS).find((c) => man.some((l) => l.id === c)); if (capId) { put(man.find((l) => l.id === capId), 'started', null, 1.5); for (const n of [1, 2]) sub(capId, { criteria: [] }, 1.5, 3, Math.max(COUNT_SINCE, now) + n); } }
  if (kind === 'all') { const f = inMods(['1.1'])[0]; if (f) sub(f.id, { teacherFeedback: 'Nice work. Your comments made the idea clear.', teacherReviewedAt: now - 3 * DAY }, 5, 5, now - 3 * DAY); }
  if (kind === 'none') { const f = inMods(['1.2']).find((l) => !(l.id in ATTEMPT_CAPS)); if (f) sub(f.id, { gradingFailed: true, error: 'test: grader unavailable' }, null, null, now - 1 * DAY); }
}
fs.writeFileSync(S + '/testroster.sql', out.join('\n') + '\n');
const emails = students.map((s) => q(s[0])).join(',');
fs.writeFileSync(S + '/testroster-undo-all.sql', [
  `DELETE FROM lesson_submissions WHERE student_email IN (${emails});`, `DELETE FROM lesson_state WHERE student_email IN (${emails});`,
  `DELETE FROM lesson_due_waivers WHERE class_id = ${q(CID)};`, `DELETE FROM class_open_dates WHERE class_id = ${q(CID)};`, `DELETE FROM class_due_dates WHERE class_id = ${q(CID)};`,
  `DELETE FROM enrollments WHERE class_id = ${q(CID)};`, `DELETE FROM class_teachers WHERE class_id = ${q(CID)};`, `DELETE FROM class_announcements WHERE class_id = ${q(CID)};`, `DELETE FROM class_solution_releases WHERE class_id = ${q(CID)};`, `DELETE FROM students WHERE email = 'gbtest-teacher@example-test.invalid';`, `DELETE FROM students WHERE email IN (${emails});`, `DELETE FROM classes WHERE id = ${q(CID)};`].join('\n') + '\n');
const c = {}; for (const l of out) { const t = /INSERT INTO (\w+)/.exec(l)[1]; c[t] = (c[t] || 0) + 1; } console.log(c);
console.log('wrote', S + '/testroster.sql', 'and', S + '/testroster-undo-all.sql');
console.log('capped part used:', Object.keys(ATTEMPT_CAPS).find((cc) => man.some((l) => l.id === cc)));
