// Runs scripts/sketch-outline-assertions.cjs against the sketch libraries.
//
// Same shape as test-model-codegen.mjs, with lib/model-handles.ts added to the
// compile list: this suite is about which points a MOVER is allowed to touch,
// and the drag handles are one of the three movers it covers.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-outline-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-types.ts',
      'lib/model-codegen.ts',
      'lib/model-handles.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const ok = require('./sketch-outline-assertions.cjs')(out.replace(/\\/g, '/'));
  if (!ok) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
