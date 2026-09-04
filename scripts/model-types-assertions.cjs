// Assertions for lib/model-types.ts's isSketchOnly(), run against a CommonJS
// build by scripts/test-model-types.mjs.
//
// This is the predicate behind the fix to SandboxWorkspace.tsx's `stale`
// gate: zero triangles is only a build FAILURE when the doc contains
// something that should have produced a solid.

module.exports = function run(dir) {
  const path = require('path');
  const types = require(path.join(dir, 'model-types.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const box = (id) => ({ id, kind: 'box', size: [40, 40, 20], center: [0, 0, 0] });
  const sketch = (id) => ({
    id, kind: 'sketch', plane: 'xy', offset: 0,
    points: [[0, 0], [40, 0], [40, 20], [0, 20]], shape: 'polygon',
  });
  const extrude = (id, target) => ({ id, kind: 'extrude', target, height: 10 });
  const hole = (id, target) => ({ id, kind: 'hole', target, across: 6, deep: null, corner: null });
  const fillet = (id, target) => ({ id, kind: 'fillet', target, edge: null, size: 4, style: 'fillet' });
  const doc = (...features) => ({ version: 1, features });

  console.log('\n=== isSketchOnly: nothing to build yet ===');

  check('a brand-new empty doc is sketch-only (nothing was ever asked to build)',
    types.isSketchOnly(doc()) === true);
  check('one bare sketch is sketch-only',
    types.isSketchOnly(doc(sketch('sk1'))) === true);
  check('several bare sketches are still sketch-only',
    types.isSketchOnly(doc(sketch('sk1'), sketch('sk2'))) === true);

  console.log('\n=== isSketchOnly: something SHOULD have produced a solid ===');

  check('a bare primitive is not sketch-only',
    types.isSketchOnly(doc(box('b1'))) === false);
  check('a sketch that has been Pulled (extrude on top) is not sketch-only',
    types.isSketchOnly(doc(sketch('sk1'), extrude('e1', 'sk1'))) === false);
  check('a primitive plus an unrelated sketch is not sketch-only -- ANY solid-producing feature disqualifies it',
    types.isSketchOnly(doc(box('b1'), sketch('sk1'))) === false);
  check('a hole on a (missing) box target is still not sketch-only -- kind alone decides, not whether the target resolves',
    types.isSketchOnly(doc(hole('h1', 'b1'))) === false);

  console.log('\n=== shellInsertion: the ordinary case -- nothing to reorder ===');

  {
    const d = doc(box('b1'));
    const r = types.shellInsertion(d, 'b1');
    check('a bare primitive with no hole/round appends at the end, targeting itself',
      r.target === 'b1' && r.insertAt === 1 && r.rewireId === null, JSON.stringify(r));
  }
  {
    const d = doc(box('b1'), hole('h1', 'b1'));
    const r = types.shellInsertion(d, 'h1');
    check('a hole with nothing ELSE hollow-blocking ahead of it (it IS the picked feature) still triggers a reorder -- Hollow must come before it too',
      r.target === 'b1' && r.insertAt === 1 && r.rewireId === 'h1', JSON.stringify(r));
  }

  console.log('\n=== shellInsertion: the reported regression -- Box, Hole, Round, Hollow ===');

  {
    const d = doc(box('b1'), hole('h1', 'b1'), fillet('r1', 'h1'));
    const r = types.shellInsertion(d, 'r1');
    check('picking Round 1 (the current tip) finds the Hole in its ancestry and reorders before it, not before the Round',
      r.target === 'b1' && r.insertAt === 1 && r.rewireId === 'h1', JSON.stringify(r));
  }

  console.log('\n=== shellInsertion: a round with no hole ahead of it ===');

  {
    const d = doc(box('b1'), fillet('r1', 'b1'));
    const r = types.shellInsertion(d, 'r1');
    check('a lone round on a bare box reorders before the round, targeting the box',
      r.target === 'b1' && r.insertAt === 1 && r.rewireId === 'r1', JSON.stringify(r));
  }

  console.log('\n=== shellInsertion: a chain with no hole or round anywhere ===');

  {
    const d = doc(box('b1'), { id: 'm1', kind: 'move', target: 'b1', offset: [10, 0, 0], copy: false });
    const r = types.shellInsertion(d, 'm1');
    check('a Move with no hole/round in its ancestry is not reordered at all',
      r.target === 'm1' && r.insertAt === 2 && r.rewireId === null, JSON.stringify(r));
  }

  console.log('\n=== shellInsertion: a picked feature with no ancestry at all ===');

  {
    const d = doc(box('b1'), box('b2'));
    const r = types.shellInsertion(d, 'b2');
    check('a second, unrelated primitive has nothing to walk back through -- appends normally',
      r.target === 'b2' && r.insertAt === 2 && r.rewireId === null, JSON.stringify(r));
  }

  console.log(fails.length === 0
    ? `\nall ${pass} checks passed`
    : `\n${fails.length} failed`);
  return fails.length === 0;
};
