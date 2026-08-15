// Runs scripts/diagram-assertions.cjs against lib/diagram-*.ts.
//
// The libraries are TypeScript that imports without file extensions, which
// neither Node's ESM resolver nor its type stripping will load. So compile
// them to CommonJS in a temp dir, hand the dir to the assertions, and clean
// up. Keeps the checks runnable with no test framework in the project.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-diagram-'));

try {
  // Invoke tsc's JS entry point directly rather than the .cmd shim, so this
  // needs no shell and behaves the same on Windows and POSIX.
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/diagram-types.ts',
      'lib/diagram-mermaid.ts',
      'lib/diagram-check.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  // tsc emits bare .js; mark the temp dir CommonJS so an ancestor
  // package.json with "type": "module" can't reinterpret them as ESM.
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  execFileSync(process.execPath, [path.join(here, 'diagram-assertions.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, DIAGRAM_LIB_DIR: out.replace(/\\/g, '/') },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
