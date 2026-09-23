// Deploy preflight: refuse to deploy while D1 has unapplied migrations.
//
// Why. `wrangler d1 migrations apply` auto-confirms its "about to apply N
// migration(s)" prompt when stdin is not a TTY ("Using fallback value in
// non-interactive context: yes"). So a deploy script that calls it will apply
// whatever is pending -- including a destructive migration -- with no human in
// the loop. This asserts the ledger is clean and makes applying a deliberate,
// separate step.
//
// Exit 0 = nothing pending, safe to deploy. Exit 1 = pending (or the state
// could not be determined), with the command to run.
//
// Run: node scripts/check-pending-migrations.mjs

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Go through scripts/d1.mjs, not bare wrangler -- it retries Cloudflare's
// transient failures rather than reporting them as credential problems.
const res = spawnSync(
  process.execPath,
  [join(root, 'scripts/d1.mjs'), 'migrations', 'list', 'shcode-commits', '--remote'],
  { encoding: 'utf8', cwd: root },
);

const output = `${res.stdout || ''}${res.stderr || ''}`;

if (res.status !== 0) {
  console.error(
    '\n[deploy] Could not read the D1 migration ledger (see output above).\n' +
      '         Refusing to deploy rather than risk a stale schema.\n',
  );
  process.exit(1);
}

if (/No migrations to apply/i.test(output)) {
  console.log('[deploy] D1 migrations: none pending.');
  process.exit(0);
}

if (/Migrations to be applied/i.test(output)) {
  console.error(
    '\n[deploy] REFUSING: D1 has unapplied migrations.\n' +
      '         Apply them deliberately, then deploy:\n\n' +
      '             npm run d1:migrate\n' +
      '             npm run deploy\n\n' +
      '         (A migration that names a table the new code queries must land\n' +
      '         BEFORE that code serves traffic -- see HANDOFF, 2026-09-22.)\n',
  );
  process.exit(1);
}

console.error(
  '\n[deploy] REFUSING: could not tell whether migrations are pending.\n' +
    '         Unexpected `d1 migrations list` output, so assuming the worst.\n' +
    `         Run it yourself: npm run d1:status\n`,
);
process.exit(1);
