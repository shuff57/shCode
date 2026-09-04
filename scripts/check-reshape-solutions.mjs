// Gate for every reSHape lesson that grades with a `model` requirement
// (lib/model-check.ts): the reference solution must satisfy every one of
// them, and the shipped starter must NOT satisfy at least one -- the same
// full-marks-reference / not-full-marks-starter pair check-starters.mjs
// already runs for regex/inFunction requirements, applied to `model` ones,
// which that script cannot see (it grades through lib/grader.ts with no
// ModelDoc in hand).
//
// Both the reference and the starter are run through reSHape Script's
// runScript() -- the compiled runtime script-runner.html actually loads --
// to get a ModelDoc, then checked with checkModel(). No kernel/wasm needed:
// runScript() builds the feature tree, not the mesh (see
// test-reshape.mjs's own "runs" check and test-reshape-script.mjs, neither
// of which needs --occt for this).
//
// Run: node scripts/check-reshape-solutions.mjs   (also part of `npm test`)
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsDir = path.join(root, 'lessons');

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');

// Same pairing check-starters.mjs uses: `solution.js` for a script-only
// lesson, or a `solution/` directory keyed by path for one that grades more
// than one file. Either way the file we actually run is `script.js`.
function referenceScript(id) {
  const dir = path.join(lessonsDir, id);
  const asDir = path.join(dir, 'solution', 'script.js');
  if (existsSync(asDir)) return read(asDir);
  const asFile = path.join(dir, 'solution.js');
  return existsSync(asFile) ? read(asFile) : null;
}

function starterScript(id) {
  const p = path.join(lessonsDir, id, 'script.js');
  return existsSync(p) ? read(p) : null;
}

const SCRIPT_RUNTIME = path.join(root, 'public/reshape/kernel/reshape-script.js');
if (!existsSync(SCRIPT_RUNTIME)) {
  console.error(`${path.relative(root, SCRIPT_RUNTIME)} is not built -- run node scripts/build-brep-kernel.mjs`);
  process.exit(1);
}

const out = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-solutions-'));
let failures = 0;
let checkedAny = false;

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-check.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const { checkModel } = require(path.join(out, 'model-check.js'));
  const { runScript } = await import(pathToFileURL(SCRIPT_RUNTIME).href);

  const buildDoc = (code) => {
    const r = runScript(code);
    const errs = Array.isArray(r && r.errors) ? r.errors : [];
    if (errs.length) return { doc: null, error: String(errs[0].message || errs[0]) };
    return { doc: r.doc ?? null, error: null };
  };

  for (const id of readdirSync(lessonsDir).sort()) {
    const cfgPath = path.join(lessonsDir, id, 'lesson.json');
    if (!existsSync(cfgPath)) continue;

    let cfg;
    try { cfg = JSON.parse(read(cfgPath)); } catch { continue; }
    if (cfg.preview !== 'reshape') continue;

    const modelReqs = (cfg.requirements ?? []).filter((r) => r.type === 'model');
    if (!modelReqs.length) continue;

    checkedAny = true;

    const refSrc = referenceScript(id);
    if (refSrc == null) {
      failures++;
      console.error(`FAIL ${id}: has a model requirement but no solution.js / solution/script.js`);
      continue;
    }

    const { doc: refDoc, error: refError } = buildDoc(refSrc);
    if (refError) {
      failures++;
      console.error(`FAIL ${id}: reference solution does not run: ${refError.slice(0, 160)}`);
      continue;
    }

    const refResults = modelReqs.map((r) => checkModel(r, refDoc));
    const refFailed = refResults.filter((r) => !r.passed);
    if (refFailed.length) {
      failures++;
      console.error(`FAIL ${id}: reference solution fails ${refFailed.length}/${modelReqs.length}`
        + ` model requirement(s) -- ${refFailed[0].message}`);
      continue;
    }

    const starterSrc = starterScript(id);
    if (starterSrc == null) {
      failures++;
      console.error(`FAIL ${id}: has a model requirement but no shipped script.js starter`);
      continue;
    }

    const { doc: starterDoc, error: starterError } = buildDoc(starterSrc);
    // A starter that fails to run at all trivially fails every requirement --
    // that is a scaffold, not an error to report.
    const starterResults = starterError
      ? modelReqs.map(() => ({ passed: false }))
      : modelReqs.map((r) => checkModel(r, starterDoc));
    const starterPassed = starterResults.filter((r) => r.passed).length;

    if (starterPassed === modelReqs.length) {
      failures++;
      console.error(`FAIL ${id}: starter already satisfies every model requirement`
        + ` (${starterPassed}/${modelReqs.length}) -- it is a solution, not a scaffold`);
      continue;
    }

    console.log(`PASS ${id} solution ${refResults.length}/${modelReqs.length},`
      + ` starter fails ${modelReqs.length - starterPassed}/${modelReqs.length}`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (!checkedAny) {
  console.log('OK no reshape lessons');
  process.exit(0);
}

process.exit(failures ? 1 : 0);
