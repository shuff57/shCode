// A student's saved sandbox still opens.
//
// A ModelDoc lives as JSON in the lesson_drafts table. Whatever the sketch
// representation becomes, a doc written by the OLD one must still load, still
// build, and still produce the same solid -- a student who saved work on a
// Tuesday does not care that the format moved on Wednesday.
//
// .gauntlet/fixtures/legacy-sketch.json is frozen on purpose. It is a real
// pre-change doc: two polyline sketches, one with all four legacy constraint
// kinds, both extruded and unioned. The correct way to make this pass is to
// read the old shape and convert it on load. The incorrect ways, in order of
// how tempting they are:
//
//   - editing the fixture to match the new format  (it is not a sample, it is
//     an artefact -- editing it is editing the past)
//   - loosening the volume bound until anything passes
//   - deleting this file
//
// If a deliberate decision is made to break saved work, this script is where
// that decision gets recorded, with the migration or the reason. Do not make
// it quietly.
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-compat-'));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail && !ok ? ' -- ' + detail : ''}`);
  if (!ok) failures++;
};

try {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
     'lib/model-types.ts', 'lib/model-codegen.ts',
     '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const gen = require(path.join(out, 'model-codegen.js'));
  const types = require(path.join(out, 'model-types.js'));

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

  let src = null;
  try {
    src = gen.toJscad(doc);
    check('an old doc still generates source', typeof src === 'string' && src.length > 0);
  } catch (e) {
    check('an old doc still generates source', false, String(e && e.message));
  }

  if (src) {
    // Both outlines have to survive, not just the simple one -- the second
    // carries every legacy constraint kind.
    check('both legacy sketches reach the generated source',
      /\bsk1\b/.test(src) && /\bsk2\b/.test(src));
    check('...and both extrusions still consume them',
      /pull1/.test(src) && /pull2/.test(src));

    // Geometry, not just text. A 40x25x12 plate unioned with a
    // 30-base/20-high triangle pulled 6 deep. The union overlaps, so this is
    // a range, not an identity -- but a doc that silently built NOTHING (an
    // empty outline, a dropped sketch) lands at 0 and a doc that lost its
    // second half lands at 12000.
    check('the old doc still has exactly one top-level solid',
      types.topLevel(doc).length === 1,
      `got ${types.topLevel(doc).length}`);

    // Geometry, not text. A check that only reads the emitted string cannot
    // tell a correct outline from an empty one, and an empty one is exactly
    // what a dropped sketch produces.
    //
    // The plate alone is 40 x 25 x 12 = 12000. The second sketch is a
    // triangle on the xz plane at offset 5, pulled 6 -- it adds 1800 of its
    // own but INTERSECTS the plate, so the union lands between the two.
    // Bracketed rather than pinned: the exact overlap depends on how the
    // generator places an offset sketch, and a number I cannot derive is a
    // number I should not assert. What the bracket does catch:
    //     0     both sketches dropped
    //   1800    the plain sketch dropped
    //  12000    the constrained sketch dropped -- the interesting one, since
    //           it is the one carrying all four legacy constraint kinds
    const { build } = require('./reshape-build-harness.cjs');
    let built = null;
    try {
      built = build(src);
    } catch (e) {
      // A dropped sketch usually shows up here rather than as a wrong volume:
      // the extrude that consumed it still emits, and its target is now an
      // undefined variable. Caught so the gate explains itself instead of
      // ending in a stack trace.
      check('an old doc still BUILDS, not just generates', false,
        `${e && e.message} -- a feature the old doc referenced went missing`);
    }
    if (built) {
    check('...and still builds BOTH solids, not just the unconstrained one',
      built.volume > 12100 && built.volume < 13800,
      `volume ${built.volume.toFixed(0)} `
        + `(0 = both dropped, 1800 = plate dropped, 12000 = constrained sketch dropped)`);

    // The plate spans y 0..25 on its own. The triangle is pulled along y from
    // the offset plane, so if it survived, the union reaches past the plate.
    check('...and the offset sketch really is in there, not silently flattened',
      built.bbox[1][1] > 25.5 || built.bbox[0][1] < -0.5,
      `y extent ${built.bbox[0][1].toFixed(1)}..${built.bbox[1][1].toFixed(1)}`);
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s). A student's saved sandbox no longer opens.`);
  process.exit(1);
}
console.log('\nsaved sandboxes still open');
