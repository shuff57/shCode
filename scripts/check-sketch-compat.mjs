// A student's saved sandbox still opens.
//
// A ModelDoc lives as JSON in the lesson_drafts table. Whatever the sketch
// representation becomes, a doc written by the OLD one must still load,
// still round-trip through reSHape Script, and still BUILD on the real
// kernel -- a student who saved work on a Tuesday does not care that the
// format moved on Wednesday.
//
// .gauntlet/fixtures/legacy-sketch.json is frozen on purpose. It is a real
// pre-change doc: two polyline sketches, one with all four legacy constraint
// kinds, both extruded and unioned. The correct way to make this pass is to
// read the old shape and convert it on load. The incorrect ways, in order of
// how tempting they are:
//
//   - editing the fixture to match the new format  (it is not a sample, it is
//     an artefact -- editing it is editing the past)
//   - loosening the check until anything passes
//   - deleting this file
//
// If a deliberate decision is made to break saved work, this script is where
// that decision gets recorded, with the migration or the reason. Do not make
// it quietly.
//
// USED TO measure the geometry half by generating JSCAD source (gen.toReshape)
// and building it through scripts/reshape-build-harness.cjs -- both are gone
// (CLAUDE.md's "JSCAD is retired" section). This now builds the SAME fixture
// through the real kernel instead, the same way scripts/test-occt-adapter.mjs
// does (compile lib/occt-build.ts + friends to a temp dir, load
// replicad_single.js, buildDoc()).
//
// UNLIKE its siblings, this does NOT skip entirely without --occt: the
// doc-level round trip below (toScript() then runScript(), both plain
// TypeScript, no wasm) needs no kernel at all, and it catches a dropped or
// flattened sketch before the kernel would ever see it -- there is no
// reason to withhold that just because nobody passed a wasm build today. So:
// with --occt <dir with replicad_single.js> (or OCCT_DIR), the geometry
// checks run for real; a directory that does not actually have
// replicad_single.js in it is a FAILURE (you asked for kernel measurement
// and it did not happen), not a silent skip. Without the flag at all, the
// geometry checks are left out and one visible line says so -- still no
// skip of the checks that do not need a kernel.
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail && !ok ? ' -- ' + detail : ''}`);
  if (!ok) failures++;
};

const flag = process.argv.indexOf('--occt');
const occtDir = flag > -1 ? process.argv[flag + 1] : process.env.OCCT_DIR;
const occtRequested = occtDir !== undefined && occtDir !== null && occtDir !== '';
const occtReady = occtRequested && existsSync(path.join(occtDir, 'replicad_single.js'));
if (occtRequested && !occtReady) {
  check('--occt points at a real OpenCascade build', false,
    `${occtDir} has no replicad_single.js -- geometry cannot be measured`);
}

const out = mkdtempSync(path.join(tmpdir(), 'shcode-compat-'));

try {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
     'lib/reshape-script.ts', 'lib/reshape-script-gen.ts',
     'lib/model-types.ts', 'lib/model-codegen.ts', 'lib/occt-build.ts',
     'lib/sketch-arc.ts', 'lib/sketch-solve.ts', 'lib/topo-name.ts', 'lib/topo-resolve.ts',
     'lib/topo-history.ts',
     '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const script = require(path.join(out, 'reshape-script.js'));
  const gen = require(path.join(out, 'reshape-script-gen.js'));
  const types = require(path.join(out, 'model-types.js'));
  const adapter = require(path.join(out, 'occt-build.js'));
  const arc = require(path.join(out, 'sketch-arc.js'));

  let oc = null;
  if (occtReady) {
    oc = await (await import(pathToFileURL(path.join(occtDir, 'replicad_single.js')).href)).default();
    console.log(`OpenCascade up, ${Object.keys(oc).length} exports\n`);
  }

  const raw = readFileSync(path.join(root, '.gauntlet/fixtures/legacy-sketch.json'), 'utf8');
  const doc = JSON.parse(raw);

  console.log('\n=== a saved sandbox from before the sketch rewrite ===');

  // The fixture must still be the old shape. If a future change "fixes" this
  // script by modernising the fixture, the gate has been removed, not passed.
  const sketches = doc.features.filter((f) => f.kind === 'sketch');
  check('the fixture is still a legacy doc -- plain points, no new fields',
    sketches.length === 2 && sketches.every(
      (s) => Array.isArray(s.points) && s.points.every(
        (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'))),
    'the fixture was edited; it is an artefact, not a sample');

  // Geometry, not text. A doc that silently built NOTHING (an empty outline,
  // a dropped sketch) is exactly what a text-only check on emitted source
  // cannot tell apart from a correct one.
  check('the old doc still has exactly one top-level solid',
    types.topLevel(doc).length === 1,
    `got ${types.topLevel(doc).length}`);

  let src = null;
  try {
    src = gen.toScript(doc);
    check('an old doc still generates a reSHape Script', typeof src === 'string' && src.length > 0);
  } catch (e) {
    check('an old doc still generates a reSHape Script', false, String(e && e.message));
  }

  if (src) {
    // Both outlines have to survive, not just the simple one -- the second
    // carries every legacy constraint kind.
    check('both legacy sketches reach the generated script',
      /\bsk1\b/.test(src) && /\bsk2\b/.test(src));
    check('...and both extrusions still consume them',
      /pull1/.test(src) && /pull2/.test(src));

    const result = script.runScript(src);
    check('the generated script actually runs, with no errors',
      Array.isArray(result.errors) && result.errors.length === 0,
      result.errors && result.errors.map((e) => e.message).join('; '));

    if (result.errors.length === 0) {
      const rebuilt = result.doc;
      check('...and the rebuilt doc still has exactly one top-level solid, not a dropped one',
        types.topLevel(rebuilt).length === 1,
        `got ${types.topLevel(rebuilt).length}`);

      const rebuiltSketches = rebuilt.features.filter((f) => f.kind === 'sketch');
      check('...both sketches came back, not just the unconstrained one',
        rebuiltSketches.length === 2,
        `got ${rebuiltSketches.length}`);
      // A dropped or flattened outline shows up here as too few points to be
      // a real polygon, not as a wrong volume -- the same failure mode the
      // original text-only check could not see, without needing a kernel to
      // measure it.
      check('...each with a real, non-degenerate outline (at least 3 points)',
        rebuiltSketches.every((s) => Array.isArray(s.points) && s.points.length >= 3),
        JSON.stringify(rebuiltSketches.map((s) => s.points.length)));
      // sk2 sits on the xz plane, offset 5 from the origin -- the interesting
      // sketch, since it carries every legacy constraint kind. If it were
      // silently flattened onto sk1's own xy plane instead, this is what
      // would go quiet.
      const offsetSketch = rebuiltSketches.find((s) => s.plane === 'xz');
      check('...and the offset xz sketch is really in there, not silently flattened onto xy',
        offsetSketch !== undefined && offsetSketch.offset === 5,
        JSON.stringify(rebuiltSketches.map((s) => ({ plane: s.plane, offset: s.offset }))));
    }
  }

  // Geometry, not text. A check that only reads generated source (JSCAD or
  // reSHape Script) cannot tell a correct outline from an empty one, and an
  // empty one is exactly what a dropped sketch produces. Built straight off
  // the ORIGINAL fixture doc through the real kernel (lib/occt-build.ts),
  // the same way scripts/test-occt-adapter.mjs measures every other fixture.
  //
  // The plate alone is 40 x 25 x 12 = 12000. The second sketch is a triangle
  // on the xz plane at offset 5, pulled 6 -- it adds 1800 of its own but
  // INTERSECTS the plate, so the union lands between the two. Bracketed
  // rather than pinned, same as the JSCAD-era check this replaces: the exact
  // overlap depends on where the legacy constraint solve settles the
  // triangle's corners, and a number that cannot be derived by hand is a
  // number that should not be asserted. Both solids here are flat prismatic
  // extrusions, so unlike a curved fixture there is no tessellation error to
  // allow for -- no 2% tolerance needed, only the same bracket the original
  // check used. What the bracket catches:
  //     0     both sketches dropped
  //   1800    the plain sketch dropped
  //  12000    the constrained sketch dropped -- the interesting one, since
  //           it is the one carrying all four legacy constraint kinds
  if (occtReady) {
    let built;
    try {
      built = adapter.buildDoc(oc, doc, arc);
    } catch (e) {
      check('the old doc still BUILDS on the real kernel, not just generates', false,
        `${e && e.message} -- a feature the old doc referenced went missing`);
    }
    if (built) {
      const finalId = doc.features[doc.features.length - 1].id;
      const shape = built.shapes.get(finalId);
      if (!shape) {
        check('the old doc still BUILDS on the real kernel, not just generates', false,
          `the kernel built nothing for ${finalId} -- a feature the old doc referenced went missing`);
      } else {
        const measured = adapter.measureShape(oc, shape);
        check('...and still builds BOTH solids on the real kernel, not just the unconstrained one',
          measured.volume > 12100 && measured.volume < 13800,
          `volume ${measured.volume} (0 = both dropped, 1800 = plate dropped, 12000 = constrained sketch dropped)`);
        // The plate spans y 0..25 on its own. The triangle is pulled along y
        // from the offset plane, so if it survived, the union reaches past it.
        check('...and the offset sketch really reaches the built solid, not silently flattened',
          measured.bbox[1][1] > 25.5 || measured.bbox[0][1] < -0.5,
          `y extent ${measured.bbox[0][1]}..${measured.bbox[1][1]}`);
      }
    }
  } else {
    console.log('  ----  geometry not measured: pass --occt public/reshape/kernel');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s). A student's saved sandbox no longer opens.`);
  process.exit(1);
}
console.log('\nsaved sandboxes still open');
