// One-time go-live backfill for the three-tries feature: grandfather what students already earned.
//
// WHY. Before the feature most PA parts had no maxScore, so a completed part read as 100%
// (lessonPercent: no max -> 100) and its stored lesson_state.score is 0 or NULL. The feature gives
// those parts a real max (a chart 3-4, a demo 6, find-and-fix 20 ...). Nothing rewrites a stored
// score on deploy, so every such completed part would show 0% until the student reopened it.
//
// RULE (the owner's decision, 2026-10-04: grandfather). For every STUDENT's completed PA part
// whose new percent would be LOWER than the old one, set score = oldPercent/100 * newMax, so the
// displayed percent is exactly what it was. A part whose percent would go UP is left alone (the
// old concepts-quiz denominator was 18, one form is 8). A teacher's score_override, a row that is
// not completed, and any non-student are never touched. Find-and-fix keeps full credit (old 100%).
//
// SAFE BY DEFAULT: this prints before/after and writes NOTHING. It only reads prod.
//   node scripts/backfill-grandfather-scores.mjs                  # dry run, summary + per-student
//   node scripts/backfill-grandfather-scores.mjs --csv out.csv    # also write the rows to a file
//   node scripts/backfill-grandfather-scores.mjs --emit-sql f.sql # write the UPDATEs (still not run)
// Run the emitted SQL ONLY after migrations 0032-0034 are applied and the go-live stamp is set,
// and only with the owner's approval. A re-run is harmless: it keys on lesson_state.score.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

// maxScore each PA part had BEFORE the feature (frozen: generated from the pre-feature manifest).
const OLD_MAX = {
  '1-6-1-ch1-pa-design-chart': null, '1-6-2-ch1-pa-build': null, '1-6-3-ch1-pa-demo': null,
  '1-7-1-ch1-individual-pa-concepts': 18, '1-7-2-ch1-individual-pa-own-words': null,
  '1-7-3-ch1-individual-pa-find-and-fix': null, '1-7-4-ch1-individual-pa-chart-it': null,
  '1-7-5-ch1-individual-pa-write-the-steps': null,
  '2-6-1-ch2-group-pa-design-chart': null, '2-6-2-ch2-group-pa-build': null, '2-6-3-ch2-group-pa-demo': null,
  '2-7-1-ch2-individual-pa-concepts': 18, '2-7-2-ch2-individual-pa-own-words': 10,
  '2-7-3-ch2-individual-pa-find-and-fix': null, '2-7-4-ch2-individual-pa-chart-it': null,
  '2-7-5-ch2-individual-pa-write-the-steps': 20,
  '3-10-1-ch3-individual-pa-concepts': 18, '3-10-2-ch3-individual-pa-own-words': 10,
  '3-10-3-ch3-individual-pa-find-and-fix': null, '3-10-4-ch3-individual-pa-chart-it': null,
  '3-10-5-ch3-individual-pa-write-the-steps': 20,
  '3-9-1-ch3-group-pa-design-chart': null, '3-9-2-ch3-group-pa-build': null, '3-9-3-ch3-group-pa-demo': null,
};

// maxScore NOW, from the current manifest generator (the number the gradebook will divide by).
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST || path.join(ROOT, 'public', 'lessons-manifest.json'), 'utf8'));
const NEW_MAX = Object.fromEntries((manifest.lessons || manifest).map((l) => [l.id, l.maxScore]));

const pct = (score, max) => (max != null && max > 0 && score != null ? Math.round(Math.min(1, Math.max(0, score / max)) * 100) : 100);

function query(sql) {
  const r = spawnSync('node', ['scripts/d1.mjs', 'execute', 'shcode-commits', '--remote', '--json', '--command', sql], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
  return JSON.parse(r.stdout)[0].results;
}

const ids = Object.keys(OLD_MAX);
const bad = ids.filter((i) => !(i in NEW_MAX));
if (bad.length) { console.error('lessons missing from public/lessons-manifest.json (run npm run prebuild first):', bad.join(', ')); process.exit(1); }
const list = ids.map((i) => `'${i}'`).join(',');

const rows = [];
for (let off = 0; ; off += 400) {
  const page = query(`SELECT s.student_email e, s.lesson_id l, s.score sc FROM lesson_state s JOIN students st ON st.email = s.student_email WHERE s.state = 'completed' AND st.role = 'student' AND s.lesson_id IN (${list}) ORDER BY s.student_email, s.lesson_id LIMIT 400 OFFSET ${off}`);
  rows.push(...page);
  if (page.length < 400) break;
}

const changes = [];
const per = {};
for (const r of rows) {
  const oldMax = OLD_MAX[r.l], newMax = NEW_MAX[r.l];
  const L = (per[r.l] ??= { completed: 0, change: 0, same: 0, up: 0 });
  L.completed++;
  if (newMax == null) { L.same++; continue; } // still no max: stays 100% either way
  const o = pct(r.sc, oldMax), n = pct(r.sc, newMax);
  if (n >= o) { n > o ? L.up++ : L.same++; continue; }
  const target = Math.round((o / 100) * newMax * 100) / 100;
  L.change++;
  changes.push({ email: r.e, lesson: r.l, oldScore: r.sc, oldPct: o, newPctNow: n, newScore: target, newMax });
}

console.log(`completed student PA parts read: ${rows.length}\n`);
console.log('lesson'.padEnd(44), 'done  set  same  up   (set = score rewritten to keep the old percent)');
for (const [k, v] of Object.entries(per).sort()) console.log(k.padEnd(44), String(v.completed).padStart(4), String(v.change).padStart(4), String(v.same).padStart(5), String(v.up).padStart(4));
console.log(`\n${changes.length} parts would be rewritten (all would otherwise DROP).`);

const csv = arg('--csv');
if (csv) {
  fs.writeFileSync(csv, 'student,lesson,old_score,old_percent,percent_if_not_fixed,new_score,new_max\n' + changes.map((c) => [c.email, c.lesson, c.oldScore, c.oldPct, c.newPctNow, c.newScore, c.newMax].join(',')).join('\n') + '\n');
  console.log('wrote', csv);
}
const sqlFile = arg('--emit-sql');
if (sqlFile) {
  // Guard: only rewrite a row still holding the score the dry run saw, never a teacher's override.
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const body = changes.map((c) => `UPDATE lesson_state SET score = ${c.newScore} WHERE student_email = ${q(c.email)} AND lesson_id = ${q(c.lesson)} AND state = 'completed' AND score ${c.oldScore == null ? 'IS NULL' : '= ' + c.oldScore} AND score_override IS NULL;`).join('\n');
  fs.writeFileSync(sqlFile, `-- grandfather backfill, ${changes.length} rows. Run after migrations 0032-0034 and the stamp.\n${body}\n`);
  console.log('wrote', sqlFile, '(NOT executed)');
}
