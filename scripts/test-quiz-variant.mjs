// Runs scripts/quiz-variant-assertions.cjs against lib/quiz-variant.ts.
//
// Same shape as test-due-dates.mjs: the library is TypeScript, so compile it
// to CommonJS in a temp dir, hand the dir to the assertions, and clean up.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-quizvariant-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/quiz-variant.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  execFileSync(process.execPath, [path.join(here, 'quiz-variant-assertions.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, QUIZ_VARIANT_LIB_DIR: out.replace(/\\/g, '/') },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
