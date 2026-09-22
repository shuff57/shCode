// Runs scripts/pii-guard-assertions.cjs against lib/pii-guard.ts.
//
// Same shape as test-pii-check.mjs: the library is TypeScript importing
// without file extensions, which neither Node's ESM resolver nor its type
// stripping will load. Compile to CommonJS in a temp dir, hand the dir to the
// assertions, clean up. No test framework in the project.
//
// This measures the DECISION logic only (thresholds, label filter, regex-first
// ordering). The models' actual catch behavior is measured by
// scripts/probe-pii-guard.mjs, which loads the real ONNX weights and is
// deliberately not part of npm test.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-pii-guard-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/pii-guard.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const ok = require('./pii-guard-assertions.cjs')(out.replace(/\\/g, '/'));
  if (!ok) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}