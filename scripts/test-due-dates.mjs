// Runs scripts/due-dates-assertions.cjs against lib/due-dates-core.ts.
//
// Same shape as test-diagram.mjs: the library is TypeScript, so compile it to
// CommonJS in a temp dir, hand the dir to the assertions, and clean up.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-duedates-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/due-dates-core.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  execFileSync(process.execPath, [path.join(here, 'due-dates-assertions.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, DUE_DATES_LIB_DIR: out.replace(/\\/g, '/') },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
