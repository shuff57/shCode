// Switch grading v2 on (lib/grading-v2.ts): stamp GRADING_V2_FROM with the go-live instant.
//
//   node --import ./scripts/register-ts.mjs scripts/stamp-grading-v2.mjs            # status
//   node --import ./scripts/register-ts.mjs scripts/stamp-grading-v2.mjs --set-now  # switch on
//
// Go-live, in order: (1) --set-now and commit; (2) scripts/backfill-v2-plan-scores.mjs --emit-sql f.sql,
// review it, apply it (npm run d1 -- execute shcode-commits --remote --file f.sql); (3) npm run deploy.
// Before stamping, scripts/grading-v2-impact.mjs shows what it will do to every live class.
// Never move the stamp once live: an earlier instant would count practice students skipped before v2.
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'grading-v2.ts');
const src = readFileSync(file, 'utf8');
const re = /export const GRADING_V2_FROM: number \| null = (null|\d+);(?: \/\/ .*)?/;
const m = src.match(re);
if (!m) { console.error('lib/grading-v2.ts: GRADING_V2_FROM line not found'); process.exit(2); }
const current = m[1] === 'null' ? null : Number(m[1]);

if (!process.argv.includes('--set-now')) {
  console.log(current === null ? 'grading v2 is OFF (GRADING_V2_FROM = null)' : `grading v2 is ON since ${new Date(current).toISOString()}`);
  process.exit(0);
}
if (current !== null && !process.argv.includes('--force')) {
  console.error(`already stamped ${new Date(current).toISOString()}; moving it changes which skipped practice counts. Pass --force only if it never shipped.`);
  process.exit(1);
}
const now = Date.now();
writeFileSync(file, src.replace(re, `export const GRADING_V2_FROM: number | null = ${now}; // ${new Date(now).toISOString()}`));
console.log(`grading v2 stamped ON at ${new Date(now).toISOString()}. Next: commit, run the plan-score backfill, then deploy.`);
