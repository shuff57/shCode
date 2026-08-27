// A ```flow readonly fence is a chart the student is shown as CORRECT — a
// worked example printed beside the prose that explains it. So each one has to
// survive the same structural rules the student's own chart is graded against,
// or the course is teaching from a diagram it would mark wrong.
//
// `readonly` is the whole distinction, and it is already the authored one: a
// fence WITHOUT it renders a scratch canvas the student rearranges, and those
// are deliberately unfinished — 1-5-19 hands over a diamond with one exit and
// says "give it both answers and an End" as the exercise. Grading a scratch
// canvas against has-end would fail the lesson for working as designed. They
// are still parsed, because a fence that does not parse renders nothing at all.
//
// A fence marked `broken` is exempt and must FAIL: the fix-the-chart lessons
// ship a defective figure on purpose, and a figure that stopped being broken
// would quietly turn those lessons into a no-op.
//
// Same compile trick as scripts/test-diagram.mjs: the libraries are TypeScript
// importing without file extensions, so build them to CommonJS in a temp dir
// and hand the dir over.

import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-flow-'));

let failures = 0;
let checked = 0;
let canvases = 0;

/** Pull every ```flow fence out of a markdown file, with its 1-based line. */
function fences(md) {
  const found = [];
  const rx = /^```flow([^\n]*)\n([\s\S]*?)^```/gm;
  for (const m of md.matchAll(rx)) {
    found.push({
      info: m[1].trim(),
      body: m[2],
      line: md.slice(0, m.index).split('\n').length,
    });
  }
  return found;
}

/** Every markdown file under a directory, recursively. */
function markdown(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'out') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) markdown(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

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

  const require = createRequire(path.join(out, 'package.json'));
  const { fromMermaid } = require(path.join(out, 'diagram-mermaid.js'));
  const { checkDiagram } = require(path.join(out, 'diagram-check.js'));
  const { DEFAULT_RULES } = require(path.join(out, 'diagram-types.js'));

  // lessons/ is the curriculum; docs/ and public/**/docs hold the reference
  // pages. Whichever of them exist get walked — a missing one is not an error,
  // but a new one must not silently go unchecked, so this is a directory list
  // rather than a hardcoded pair.
  const roots = ['lessons', 'docs', 'public/reshape/docs', 'public/moshion/docs']
    .map((d) => path.join(root, d))
    .filter(existsSync);
  for (const file of roots.flatMap((d) => markdown(d))) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    for (const f of fences(readFileSync(file, 'utf8'))) {
      const wantBroken = /\bbroken\b/.test(f.info);
      const isFigure = /\breadonly\b/.test(f.info);
      if (isFigure) checked++; else canvases++;
      let doc;
      try {
        doc = fromMermaid(f.body);
      } catch (e) {
        failures++;
        console.log(`FAIL ${rel}:${f.line} — the fence does not parse: ${e.message}`);
        continue;
      }
      // A scratch canvas is the student's to finish; only a figure is a claim.
      if (!isFigure) continue;
      const bad = checkDiagram(doc, DEFAULT_RULES).filter((r) => !r.passed);
      if (wantBroken && bad.length === 0) {
        failures++;
        console.log(`FAIL ${rel}:${f.line} — marked \`broken\` but every rule passes, so the `
          + 'fix-the-chart exercise built on it has nothing to find');
      } else if (!wantBroken && bad.length > 0) {
        failures++;
        console.log(`FAIL ${rel}:${f.line} — a figure the student is shown as correct:`);
        for (const r of bad) console.log(`       ${r.id}: ${r.detail}`);
      }
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? `flow figures: PASS — ${checked} figure(s) checked, ${canvases} scratch canvas(es) parsed`
    : `flow figures: FAIL — ${failures} of ${checked} figure(s)`,
);
process.exit(failures === 0 ? 0 : 1);
