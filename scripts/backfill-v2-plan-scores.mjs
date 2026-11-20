// Grading v2 scores a plan lab out of its card count (scripts/grading-v2-plans.mjs). A plan finished BEFORE
// v2 stored a score of 0 (its cards carried no points) and needed every card green, so it is set to full
// marks here; without this every finished plan would read 0% the moment v2 is on.
//
//   node --import ./scripts/register-ts.mjs scripts/backfill-v2-plan-scores.mjs                 # dry run (counts)
//   node --import ./scripts/register-ts.mjs scripts/backfill-v2-plan-scores.mjs --emit-sql f.sql [--until <ISO time>]
//
// --until: only rows finished before that instant (default: the stamp). The OLD code keeps writing 0 for a
// finished plan until the v2 deploy is live, so run it twice: before deploying (--until now) and right after
// the deploy finishes (--until <that time>). A plan finished under v2 has a real card score and is never
// touched, because it was finished after the second --until.
// Refuses until lib/grading-v2.ts is stamped: the UPDATEs are guarded by completed_at < the stamp, so a
// plan finished under v2 (with a real score) is never touched. Idempotent: it only raises a lower score.
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { planCardMaxima } from './grading-v2-plans.mjs';
import { GRADING_V2_FROM } from '../lib/grading-v2.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : process.argv[i + 1]; };
const plans = planCardMaxima();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

if (GRADING_V2_FROM === null) {
  console.error('lib/grading-v2.ts is not stamped yet (scripts/stamp-grading-v2.mjs --set-now). The backfill is guarded by that instant.');
  if (!process.argv.includes('--dry-run-anyway')) process.exit(1);
}
const untilArg = arg('until');
const stamp = untilArg ? Date.parse(untilArg) : (GRADING_V2_FROM ?? Date.now());
if (!Number.isFinite(stamp)) { console.error('--until wants an ISO time, e.g. 2026-11-30T16:05:00Z'); process.exit(2); }
const lines = [...plans].map(([id, max]) =>
  `UPDATE lesson_state SET score = ${max} WHERE lesson_id = ${q(id)} AND state = 'completed' AND (score IS NULL OR score < ${max}) AND (completed_at IS NULL OR completed_at < ${stamp});`);

const out = arg('emit-sql');
if (out) {
  writeFileSync(out, `-- grading v2 plan-score backfill: plans finished before ${new Date(stamp).toISOString()}, ${lines.length} plan labs\n${lines.join('\n')}\n`);
  console.log(`wrote ${lines.length} guarded UPDATEs to ${out}. Review, then: npm run d1 -- execute shcode-commits --remote --file ${out}`);
} else {
  const ids = [...plans.keys()].map(q).join(',');
  const raw = execFileSync(process.execPath, ['--import', path.join(root, 'scripts/register-ts.mjs'), path.join(root, 'scripts/d1.mjs'), 'execute', 'shcode-commits', '--remote', '--json', '--command',
    `SELECT lesson_id, COUNT(*) AS n FROM lesson_state WHERE state = 'completed' AND lesson_id IN (${ids}) AND (completed_at IS NULL OR completed_at < ${stamp}) GROUP BY lesson_id`], { cwd: root, encoding: 'utf8' });
  const rows = JSON.parse(raw.slice(raw.indexOf('[')))[0].results ?? [];
  console.log(`dry run: ${plans.size} plan labs; ${rows.reduce((a, r) => a + r.n, 0)} finished rows would be set to full marks (${rows.length} labs with any).`);
}
