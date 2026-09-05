// Runs scripts/model-deps-assertions.cjs against lib/model-deps.ts.
//
// Same shape as test-topo-name.mjs: compile the TypeScript to CommonJS in a
// temp dir, hand the dir to the assertions, clean up. Used to pull
// lib/model-codegen.ts along too, for a cross-check against generated JSCAD
// source text; that engine and its cross-check are gone (CLAUDE.md's "JSCAD
// is retired" section) -- the assertions now check deps.danglingRefs()
// directly, so model-deps.ts alone is enough.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-deps-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-deps.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const ok = require('./model-deps-assertions.cjs')(out.replace(/\\/g, '/'));
  if (!ok) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
