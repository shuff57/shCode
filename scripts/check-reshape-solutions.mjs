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
// to get a ModelDoc. That doc is ALSO built on a real B-rep kernel (the same
// pre-built public/reshape/kernel/ bundle test-reshape-script.mjs's --occt
// step and test-occt-adapter.mjs load, copied here rather than reinvented),
// because the kernel can REFUSE a feature the doc-only check has no way to
// see -- 8.1.11's `round(b.edge('top','front'), 3)` after a 2mm hollow passes
// checkModel() on the doc alone but the kernel rejects it ("Rounding Round 1
// at 3 would not fit its edge"), and lib/model-check.ts's checkModel() now
// treats a refused feature as absent (its `refusals` param, lib/occt-build.ts
// BuildResult.refusals). A reference the kernel refuses can never pass in the
// app, so it must never pass this gate either.
//
// Run: node scripts/check-reshape-solutions.mjs [--occt <dir>]
//      (also part of `npm test`; --occt defaults to public/reshape/kernel)
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

// --occt <dir>, defaulting to the kernel bundle that already ships with the
// repo. Unlike test-occt-adapter.mjs (which compiles lib/occt-build.ts fresh
// into a tmpdir), the files under public/reshape/kernel/ are ALREADY built --
// build-brep-kernel.mjs put them there -- so they are loaded directly, no tsc
// step needed for this half.
const occtFlagIdx = process.argv.indexOf('--occt');
const occtDir = occtFlagIdx > -1 ? process.argv[occtFlagIdx + 1] : path.join(root, 'public/reshape/kernel');
if (!existsSync(path.join(occtDir, 'replicad_single.js'))) {
  console.error(`${path.relative(root, occtDir)} has no replicad_single.js -- `
    + 'run node scripts/build-brep-kernel.mjs --occt <dir with replicad_single.js>');
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

  // The kernel loads once for the whole module's labs, not once per lesson --
  // ~9 labs at one wasm init is well inside the ~60s budget; nine separate
  // inits would not be.
  const { buildDoc: buildOnKernel } = await import(pathToFileURL(path.join(occtDir, 'occt-build.js')).href);
  const arc = await import(pathToFileURL(path.join(occtDir, 'sketch-arc.js')).href);
  const oc = await (await import(pathToFileURL(path.join(occtDir, 'replicad_single.js')).href)).default();

  const buildDoc = (code) => {
    const r = runScript(code);
    const errs = Array.isArray(r && r.errors) ? r.errors : [];
    if (errs.length) return { doc: null, error: String(errs[0].message || errs[0]) };
    return { doc: r.doc ?? null, error: null };
  };

  // Flattened the way lib/model-check.ts's `Refusals` type wants it: plain
  // object, feature id -> the kernel's own sentence for why it dropped it.
  const kernelRefusals = (doc) => {
    const built = buildOnKernel(oc, doc, arc);
    return Object.fromEntries(built.refusals ?? new Map());
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

    let refRefusals;
    try {
      refRefusals = kernelRefusals(refDoc);
    } catch (e) {
      failures++;
      console.error(`FAIL ${id}: reference solution does not build on the kernel: ${String(e.message || e).slice(0, 160)}`);
      continue;
    }
    const refRefusedIds = Object.keys(refRefusals);
    if (refRefusedIds.length) {
      // A refusal is its own failure, not just an input to checkModel -- the
      // doc-only check can pass a reference the kernel actually rejects (that
      // is exactly what happened with 8.1.11), so this must fail here even if
      // checkModel(refDoc) below would have said everything matched.
      failures++;
      console.error(`FAIL ${id}: kernel refuses reference feature ${refRefusedIds[0]}`
        + ` -- ${refRefusals[refRefusedIds[0]]}`);
      continue;
    }

    const refResults = modelReqs.map((r) => checkModel(r, refDoc, refRefusals));
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
    // that is a scaffold, not an error to report. A scaffold that DOES run
    // but the kernel can't build (half-finished geometry) is the same kind of
    // trivial fail, not a script error worth surfacing.
    let starterRefusals = {};
    if (!starterError) {
      try { starterRefusals = kernelRefusals(starterDoc); } catch { /* scaffold, not a solution -- expected to fail */ }
    }
    const starterResults = starterError
      ? modelReqs.map(() => ({ passed: false }))
      : modelReqs.map((r) => checkModel(r, starterDoc, starterRefusals));
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
