// What switching grading v2 on (lib/grading-v2.ts) would do to every live class's grades, measured
// on production data BEFORE it is switched on. Read-only: it SELECTs the tables the grade reads into a
// local SQLite and runs the real loaders and studentGrading() twice, switch off and switch on (as if
// stamped now, with the plan-score backfill applied). Nothing is written to D1.
//
//   node --import ./scripts/register-ts.mjs scripts/grading-v2-impact.mjs [--detail] [--switch 2026-12-01]
//
// --switch simulates stamping on that date (school-day midnight UTC) instead of now, and also lists how many
// lessons graded only by v2 fall due in the four weeks after it, per class: the work that starts to count.
//
// Prints, per class, how many lessons count, and how each student's grade moves. Anonymous unless
// --detail, which adds first name + last initial (teachers' own data, printed only to this terminal).

import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeD1 } from './_d1-sqlite.mjs';
import { loadLessonScopeMap, loadClassDueRows, loadClassDueWaivers } from '../functions/_shared/dueDates.ts';
import { loadClassWeights, studentGrading } from '../functions/_shared/grading.ts';
import { classStaffEmails } from '../functions/_shared/classStaff.ts';
import { buildDueIndex } from '../lib/due-dates-core.ts';
import { planCardMaxima } from './grading-v2-plans.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const detail = process.argv.includes('--detail');

function remote(sql) {
  const raw = execFileSync(process.execPath, ['--import', path.join(root, 'scripts/register-ts.mjs'), path.join(root, 'scripts/d1.mjs'),
    'execute', 'shcode-commits', '--remote', '--json', '--command', sql], { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  return JSON.parse(raw.slice(raw.indexOf('[')))[0].results ?? [];
}

const switchArg = (() => { const i = process.argv.indexOf('--switch'); return i < 0 ? null : process.argv[i + 1]; })();
const now = Date.now();
const switchAt = switchArg ? Date.parse(switchArg + 'T08:00:00Z') : now;
if (!Number.isFinite(switchAt)) throw new Error('--switch wants YYYY-MM-DD');
const evalAt = Math.max(now, switchAt);
const db = makeD1();
const sq = db.sqlite;
function load(table, rows) {
  if (!rows.length) return 0;
  const cols = sq.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  let n = 0;
  for (const r of rows) {
    const keys = Object.keys(r).filter((k) => cols.includes(k));
    sq.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => r[k]));
    n++;
  }
  return n;
}

console.error('reading production (read-only) ...');
const classes = remote('SELECT * FROM classes').filter((c) => !c.archived_at);
const ids = classes.map((c) => `'${String(c.id).replace(/'/g, "''")}'`).join(',') || "''";
load('classes', classes);
load('class_teachers', remote(`SELECT * FROM class_teachers WHERE class_id IN (${ids})`));
const enrollments = remote(`SELECT * FROM enrollments WHERE class_id IN (${ids}) AND expires_at > ${now}`);
load('enrollments', enrollments);
load('class_due_dates', remote(`SELECT * FROM class_due_dates WHERE class_id IN (${ids})`));
load('lesson_due_waivers', remote(`SELECT * FROM lesson_due_waivers WHERE class_id IN (${ids})`));
load('class_grading_weights', remote(`SELECT * FROM class_grading_weights WHERE class_id IN (${ids})`));
load('lesson_state', remote(`SELECT * FROM lesson_state ls WHERE ls.student_email IN (SELECT student_email FROM enrollments WHERE class_id IN (${ids}) AND expires_at > ${now})`));
const names = new Map(detail ? remote(`SELECT email, first_name, last_name FROM students WHERE email IN (SELECT student_email FROM enrollments WHERE class_id IN (${ids}))`).map((s) => [s.email, `${s.first_name ?? '?'} ${(s.last_name ?? '').slice(0, 1)}.`]) : []);

const manifest = readFileSync(path.join(root, 'public/lessons-manifest.json'), 'utf8');
const env = { DB: db, ASSETS: { fetch: async () => new Response(manifest, { headers: { 'Content-Type': 'application/json' } }) } };
const scopeOff = await loadLessonScopeMap(env, new Request('http://local/'));
if (!scopeOff) throw new Error('manifest did not load');

// Switch on: a plan with no rubric is scored out of its card count (scripts/lesson-score-fields.mjs), and
// every plan finished before the switch is backfilled to full (it needed every card green then).
const planMax = planCardMaxima();
const scopeOn = new Map([...scopeOff].map(([id, sc]) => [id, planMax.has(id) ? { ...sc, maxScore: planMax.get(id) } : sc]));

const pct = (xs, p) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
let anyStudents = 0;
for (const c of classes) {
  const roster = enrollments.filter((e) => e.class_id === c.id).map((e) => e.student_email);
  const staff = await classStaffEmails(db, c.id);
  const students = roster.filter((e) => !staff.has(e));
  if (!students.length) continue;
  anyStudents += students.length;
  const index = buildDueIndex(await loadClassDueRows(db, c.id));
  const waivers = await loadClassDueWaivers(db, c.id);
  const weights = await loadClassWeights(db, c.id);
  const rows = [];
  for (const email of students) {
    const states = sq.prepare('SELECT lesson_id, state, score FROM lesson_state WHERE student_email = ?').all(email);
    const statesOn = states.map((s) => (planMax.has(s.lesson_id) && s.state === 'completed' ? { ...s, score: planMax.get(s.lesson_id) } : s));
    const due = { index, waived: waivers.get(email) ?? new Set(), now: evalAt };
    const off = studentGrading(scopeOff, states, weights, due, null);
    const on = studentGrading(scopeOn, statesOn, weights, due, switchAt);
    rows.push({ email, off, on, delta: on.percent - off.percent });
  }
  const deltas = rows.map((r) => r.delta);
  console.log(`\n== class "${c.name}" (${students.length} students)${switchArg ? `, switch on ${switchArg}` : ''}`);
  {
    const { newlyGraded } = await import('../lib/grading-weights.ts');
    const { resolveDueAt } = await import('../lib/due-dates-core.ts');
    const weeks = [0, 0, 0, 0];
    let noDate = 0;
    for (const [id, sc] of scopeOn) {
      const l = { title: sc.title, preview: sc.preview, scoreKind: sc.scoreKind, assignmentCode: sc.assignmentCode, graded: sc.graded };
      if (!newlyGraded(l, switchAt)) continue;
      const at = resolveDueAt(index, { lessonId: id, moduleId: sc.moduleId, unitId: sc.unitId });
      if (at === null) { noDate++; continue; }
      const w = Math.floor((at - switchAt) / (7 * 86400000));
      if (w >= 0 && w < 4) weeks[w]++;
    }
    console.log(`   lessons graded only by v2, falling due in weeks 1-4 after the switch: ${weeks.join(' / ')}  (no due date set: ${noDate})`);
  }
  console.log(`   graded lessons in the course: ${rows[0].off.gradedTotal} -> ${rows[0].on.gradedTotal}`);
  console.log(`   counted per student (median): ${pct(rows.map((r) => r.off.counted), 0.5)} -> ${pct(rows.map((r) => r.on.counted), 0.5)};  done (median): ${pct(rows.map((r) => r.off.doneCount), 0.5)} -> ${pct(rows.map((r) => r.on.doneCount), 0.5)};  missing (median): ${pct(rows.map((r) => r.off.missingCount), 0.5)} -> ${pct(rows.map((r) => r.on.missingCount), 0.5)}`);
  console.log(`   grade (median): ${f1(pct(rows.map((r) => r.off.percent), 0.5))}% -> ${f1(pct(rows.map((r) => r.on.percent), 0.5))}%`);
  console.log(`   change per student: min ${f1(Math.min(...deltas))}, p25 ${f1(pct(deltas, 0.25))}, median ${f1(pct(deltas, 0.5))}, p75 ${f1(pct(deltas, 0.75))}, max ${f1(Math.max(...deltas))} points`);
  console.log(`   down more than 1 point: ${deltas.filter((d) => d < -1).length};  up more than 1 point: ${deltas.filter((d) => d > 1).length};  within 1 point: ${deltas.filter((d) => Math.abs(d) <= 1).length}`);
  if (detail) for (const r of rows.sort((a, b) => a.delta - b.delta)) console.log(`     ${(names.get(r.email) ?? 'student').padEnd(16)} ${f1(r.off.percent).padStart(5)}% -> ${f1(r.on.percent).padStart(5)}%  (${r.delta >= 0 ? '+' : ''}${f1(r.delta)})  missing ${r.off.missingCount} -> ${r.on.missingCount}`);
}
if (!anyStudents) console.log('no live class has students');
console.log(`\nplan labs scored out of their cards under v2: ${planMax.size}`);
