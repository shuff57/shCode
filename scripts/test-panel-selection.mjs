// Runs scripts/panel-selection-assertions.cjs against lib/model-selection.ts.
//
// Same shape as test-model-handles.mjs: model-selection.ts imports the
// ModelDoc type from model-types.ts (type-only, erased at compile time) and
// rootFeature()/TopoName from topo-name.ts (a real runtime call, and pure
// algebra with zero imports of its own -- see that file's own header). None
// of the three touches a jscad bundle or a running kernel, so this compiles
// to CommonJS in a temp dir and runs the assertions directly, no geometry
// engine needed. No test framework in the project.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-panel-selection-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-types.ts',
      'lib/topo-name.ts',
      'lib/model-selection.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const ok = require('./panel-selection-assertions.cjs')(out.replace(/\\/g, '/'));
  if (!ok) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
