// A diagram lesson's stored reference chart must go all-green against that
// lesson's own rules.
//
// scripts/check-starters.mjs does this for code lessons, but it skips anything
// with no `requirements` (line 94) -- which is every diagram lesson, because a
// flowchart is graded by `diagram.rules` instead. So a reference chart could be
// stored, served to teachers, and be wrong, with nothing to say so. A teacher
// pressing Insert on a reference that fails the lesson's own checks is worse
// than having no reference at all.
//
// A diagram reference lives at lessons/<id>/solution/<name>.mmd -- Mermaid, the
// same dialect as `diagram.starter`. generate-solutions.mjs picks the directory
// up unchanged; it never assumed the files were JavaScript.
//
// Compile pattern lifted from scripts/test-diagram.mjs -- lib/ is TypeScript
// that Node will not load directly.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsDir = path.join(root, 'lessons');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-diagsol-'));

let failures = 0;
let checked = 0;

try {
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
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const toUrl = (f) => 'file://' + path.join(out, f).replace(/\\/g, '/');
  const { fromMermaid } = await import(toUrl('diagram-mermaid.js'));
  const { checkDiagram } = await import(toUrl('diagram-check.js'));

  for (const id of readdirSync(lessonsDir).sort()) {
    const cfgPath = path.join(lessonsDir, id, 'lesson.json');
    if (!existsSync(cfgPath)) continue;

    let cfg;
    try {
      cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    } catch {
      continue;
    }
    const rules = cfg.diagram?.rules;
    if (!Array.isArray(rules) || rules.length === 0) continue;

    const solDir = path.join(lessonsDir, id, 'solution');
    if (!existsSync(solDir)) continue;

    const charts = readdirSync(solDir).filter((f) => f.endsWith('.mmd'));
    if (charts.length === 0) {
      console.error(`  FAIL  ${id}: has solution/ but no .mmd chart in it`);
      failures += 1;
      continue;
    }

    for (const file of charts) {
      checked += 1;
      const src = readFileSync(path.join(solDir, file), 'utf8');
      let results;
      try {
        results = checkDiagram(fromMermaid(src), rules);
      } catch (e) {
        console.error(`  FAIL  ${id}/solution/${file}: will not parse as Mermaid -- ${e.message}`);
        failures += 1;
        continue;
      }
      const red = results.filter((r) => !r.passed);
      if (red.length === 0) {
        console.log(`  ok    ${id}/solution/${file}  ${results.length}/${results.length}`);
      } else {
        failures += 1;
        console.error(
          `  FAIL  ${id}/solution/${file}  ${results.length - red.length}/${results.length}`,
        );
        for (const r of red) console.error(`          ${r.title || r.id} -- ${r.detail || ''}`);
      }
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (checked === 0) {
  // Not a failure: no diagram lesson has a reference yet. Say so, so that a
  // silently-empty run is never mistaken for a passing one.
  console.log('[check-diagram-solutions] no diagram lesson ships a reference chart yet');
} else if (failures === 0) {
  console.log(`[check-diagram-solutions] OK — ${checked} reference chart(s), all green`);
} else {
  console.error(`[check-diagram-solutions] ${failures} reference chart(s) failed their own rules`);
}
process.exit(failures === 0 ? 0 : 1);
