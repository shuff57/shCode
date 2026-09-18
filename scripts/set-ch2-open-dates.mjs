#!/usr/bin/env node
// Sets the Chapter 2 assessment open-date locks in D1.
//
//   node scripts/set-ch2-open-dates.mjs            # remote (prod)
//   node scripts/set-ch2-open-dates.mjs --local    # local dev D1
//
// Two rows per class: module 2.6 opens Mon Sep 28 2026 00:00 and module 2.7
// opens Wed Sep 30 2026 00:00, in the school timezone (America/Los_Angeles —
// the timezone the due/open routes resolve in). Midnight is the whole-day
// default: the module stays locked until its day starts.
//
// Requires CLOUDFLARE_API_TOKEN in the environment (or an authed wrangler).
// The class list is read from the classes table so the rows land on every
// real class; pass --classes <id,id,...> to gate only those classes.
//
// Verify after the run:
//   node scripts/d1.mjs execute shcode-commits --remote \
//     --command "SELECT * FROM class_open_dates WHERE scope='module' AND scope_id IN ('2.6','2.7');" --json

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = process.argv.includes('--local');
const SET_BY = process.env.SET_BY ?? 'shuff57@gmail.com';

// 2026-09-28 and 2026-09-30, midnight, America/Los_Angeles (PDT, UTC-7).
const epochFor = (d) => new Date(`${d}T00:00:00-07:00`).getTime();
const OPEN_26 = epochFor('2026-09-28');
const OPEN_27 = epochFor('2026-09-30');
const now = Date.now();

const run = (command) => {
  const out = execFileSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'd1.mjs'),
      'execute', 'shcode-commits',
      local ? '--local' : '--remote',
      '--command', command,
      '--json',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const start = out.indexOf('[');
  return JSON.parse(out.slice(start, out.lastIndexOf(']') + 1))[0]?.results ?? [];
};

const rows = run('SELECT id FROM classes;');
const classIds = rows.map((r) => r.id).filter(Boolean);
if (classIds.length === 0) {
  console.error('No classes found — nothing to gate.');
  process.exit(1);
}

const stmts = [];
for (const id of classIds) {
  stmts.push(
    `INSERT INTO class_open_dates (class_id, scope, scope_id, open_at, set_by, set_at) VALUES ` +
      `('${id}', 'module', '2.6', ${OPEN_26}, '${SET_BY}', ${now}) ` +
      `ON CONFLICT (class_id, scope, scope_id) DO UPDATE SET open_at=${OPEN_26}, set_by='${SET_BY}', set_at=${now};`,
  );
  stmts.push(
    `INSERT INTO class_open_dates (class_id, scope, scope_id, open_at, set_by, set_at) VALUES ` +
      `('${id}', 'module', '2.7', ${OPEN_27}, '${SET_BY}', ${now}) ` +
      `ON CONFLICT (class_id, scope, scope_id) DO UPDATE SET open_at=${OPEN_27}, set_by='${SET_BY}', set_at=${now};`,
  );
}

for (const s of stmts) {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'd1.mjs'),
      'execute', 'shcode-commits',
      local ? '--local' : '--remote',
      '--command', s,
      '--json',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
  );
}

console.log(`[set-ch2-open-dates] ${classIds.length} class(es) gated:`);
console.log(`  module 2.6 -> ${new Date(OPEN_26).toISOString()} (${new Date(OPEN_26).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })})`);
console.log(`  module 2.7 -> ${new Date(OPEN_27).toISOString()} (${new Date(OPEN_27).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })})`);
console.log('Verify: SELECT * FROM class_open_dates WHERE scope=\'module\' AND scope_id IN (\'2.6\',\'2.7\');');