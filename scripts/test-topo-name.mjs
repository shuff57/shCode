// Runs scripts/topo-name-assertions.cjs against lib/topo-name.ts.
//
// Same shape as test-sketch-solve.mjs: compile the TypeScript to CommonJS in a
// temp dir, hand the dir to the assertions, clean up. No test framework here.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-topo-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/topo-name.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const ok = require('./topo-name-assertions.cjs')(out.replace(/\\/g, '/'));
  if (!ok) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
