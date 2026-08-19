// Runs scripts/grader-assertions.cjs against lib/grade-written-core.ts.
//
// Same shape as test-diagram.mjs, and for the same reason: the library is
// TypeScript importing without file extensions, which Node will not load
// directly. Compile to CommonJS in a temp dir, hand the dir over, clean up.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-grader-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/grade-written-core.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  execFileSync(process.execPath, [path.join(here, 'grader-assertions.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, GRADER_LIB_DIR: out.split(path.sep).join(String.fromCharCode(47)) },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
