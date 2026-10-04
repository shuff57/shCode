// Companion to the "pass/fail lessons get a real fraction" change (2026-10-04): grandfather
// everyone who already completed one.
//
// WHY. An ordinary pass/fail rubric lesson (every criterion 0 points, no try limit) had no
// maxScore, so a completed one read 100% whatever its stored score. It now has maxScore =
// the criteria count (scripts/generate-lessons-manifest.mjs, app/page.tsx). Their stored
// lesson_state.score is 0 (a 0-point rubric's totalEarned), which would read 0% against the
// new max. The owner's decision: past completions stay at 100%; the fraction applies only to
// what students do after this. So every STUDENT's completed row on these lessons whose score is
// below the max (or NULL) is set to the max.
//
// SAFE ORDER. Run this BEFORE the deploy: the code live today has no max for these lessons, so
// it reads 100% whatever the score, and nobody sees a change either way. A teacher's
// score_override (migration 0034) and any non-student are never touched.
//
//   node scripts/backfill-passfail-fraction.mjs                 # dry run: prints, writes nothing
//   node scripts/backfill-passfail-fraction.mjs --emit-sql f    # writes guarded UPDATEs, not run

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

const MAX = {};
for (const id of fs.readdirSync(path.join(ROOT, 'lessons')).sort()) {
  let l;
  try { l = JSON.parse(fs.readFileSync(path.join(ROOT, 'lessons', id, 'lesson.json'), 'utf8')); } catch { continue; }
  const g = l.aiGrader ?? l.diagram?.aiGrader;
  if (!g || !Array.isArray(g.rubric) || g.rubric.length === 0) continue;
  if (g.rubric.reduce((s, r) => s + (r?.points > 0 ? r.points : 0), 0) > 0) continue; // pointed
  if ([l.quiz, l.aiGrader, l.diagram, l.grading].some((b) => b && typeof b.maxSubmissions === 'number')) continue; // capped: the PA backfill's
  MAX[id] = g.rubric.length;
}
console.log(`${Object.keys(MAX).length} uncapped pass/fail rubric lessons`);

function query(sql) {
  const r = spawnSync('node', ['scripts/d1.mjs', 'execute', 'shcode-commits', '--remote', '--json', '--command', sql], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 27 });
  if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
  return JSON.parse(r.stdout)[0].results;
}
const list = Object.keys(MAX).map((i) => `'${i}'`).join(',');
const rows = [];
for (let o = 0; ; o += 400) {
  const p = query(`SELECT s.student_email e, s.lesson_id l, s.score sc FROM lesson_state s JOIN students t ON t.email = s.student_email WHERE t.role = 'student' AND s.state = 'completed' AND s.score_override IS NULL AND s.lesson_id IN (${list}) ORDER BY 1, 2 LIMIT 400 OFFSET ${o}`);
  rows.push(...p);
  if (p.length < 400) break;
}
const changes = rows.filter((r) => r.sc == null || r.sc < MAX[r.l]);
const per = {};
for (const r of rows) { const L = (per[r.l] ??= { completed: 0, set: 0 }); L.completed++; if (r.sc == null || r.sc < MAX[r.l]) L.set++; }
for (const [k, v] of Object.entries(per).sort()) console.log(k.padEnd(48), `max ${MAX[k]}  completed ${v.completed}  set to max ${v.set}`);
console.log(`\n${changes.length} of ${rows.length} completed parts would be set to their max (stay 100%).`);

const f = arg('--emit-sql');
if (f) {
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  fs.writeFileSync(f, changes.map((c) => `UPDATE lesson_state SET score = ${MAX[c.l]} WHERE student_email = ${q(c.e)} AND lesson_id = ${q(c.l)} AND state = 'completed' AND score_override IS NULL AND (score IS NULL OR score < ${MAX[c.l]});`).join('\n') + '\n');
  console.log('wrote', f, '(NOT executed)');
}
