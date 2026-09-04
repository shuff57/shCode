// Assertions for lib/model-selection.ts's ownerOf(), run against a CommonJS
// build by scripts/test-panel-selection.mjs.
//
// This is the pure-logic seam behind the Dimensions-panel-visibility fix in
// components/SandboxWorkspace.tsx: a viewport pick's `target` (which feature's
// mesh batch currently draws that region -- the TIP of the chain, not
// necessarily the feature that MADE it) and resolved TopoName (lib/topo-name.ts
// -- what actually encodes provenance) are resolved back into the feature the
// Dimensions panel should select.
//
// The TopoName shapes below match what lib/topo-resolve.ts's
// nameFaceOnCurrentShape()/nameEdgeOnCurrentShape() actually hand back at a
// live pick, per their own doc comments: EITHER a `{cause:'primitive', ...}`
// name (an untouched primitive face, found by pushing every primitive's own
// face name forward through the op chain until one lands on the clicked
// face) OR `null` (a face/edge with "no recorded path back to any
// primitive" -- the new wall a Hole drills, a Round's own filleted face,
// deliberately refused rather than guessed). `between` (an edge) wraps two
// such face names. `ownerOf` is never expected to receive `carried`/`split`/
// `made`/`cap`/`swept`/`rounded` from a live pick today, but exercises them
// anyway since `rootFeature()` supports them and a future resolver may start
// producing them.

module.exports = function run(dir) {
  const path = require('path');
  const sel = require(path.join(dir, 'model-selection.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const box = (id) => ({ id, kind: 'box', size: [40, 40, 20], center: [0, 0, 0] });
  const hole = (id, target) => ({ id, kind: 'hole', target, across: 6, deep: null, corner: null });
  const fillet = (id, target) => ({ id, kind: 'fillet', target, edge: null, size: 4, style: 'fillet' });
  const doc = (...features) => ({ version: 1, features });

  const primitiveFace = (feature, part) => ({ cause: 'primitive', feature, kind: 'face', part });
  const between = (a, b) => ({ cause: 'between', feature: a.feature, kind: 'edge', of: [a, b] });

  console.log('\n=== ownerOf: a name that resolves wins over target ===');

  const d1 = doc(box('box1'));
  check('an untouched primitive face resolves to the primitive that made it',
    sel.ownerOf(d1, { target: 'box1', name: primitiveFace('box1', '+z') }) === 'box1');
  check('an edge between two of that primitive\'s own faces resolves the same way',
    sel.ownerOf(d1, {
      target: 'box1',
      name: between(primitiveFace('box1', '+z'), primitiveFace('box1', '+x')),
    }) === 'box1');

  const d2 = doc(box('box1'), hole('hole1', 'box1'));
  check('a plain box face, still tagged +z, resolves to Box 1 even though Hole 1 now draws the mesh',
    sel.ownerOf(d2, { target: 'hole1', name: primitiveFace('box1', '+z') }) === 'box1');

  // REGRESSION, measured 2026-09-04: components/model/ModelEditor.tsx's
  // round() compared `chosen[0].id` (the SELECTED feature, set from this
  // exact ownerOf() resolution) against `pickedEdge.target` DIRECTLY -- the
  // raw tip-of-chain, never resolved. Once a Hole sat on top of the box the
  // edge came from, `chosen[0].id` read "box1" and `pickedEdge.target` read
  // "hole1", the comparison always failed, and Round silently fell through
  // to the whole-shape path -- "Rounded every edge" for a click that named
  // one. The fix is round() (and the two usable-picked-* checks beside it)
  // comparing against ownerOf(doc, pickedEdge) instead of the raw target --
  // this is the exact case that regression needs to keep passing: an edge
  // whose OWNER (a primitive box) and whose TARGET (a later Hole) disagree.
  check('an edge on a box that a later Hole now draws the mesh for still resolves to the box, not the hole',
    sel.ownerOf(d2, { target: 'hole1', edge: between(primitiveFace('box1', '+z'), primitiveFace('box1', '+x')) }) === 'box1');

  console.log('\n=== ownerOf: no name to resolve -- falls back to target (tip of the chain) ===');

  check('a hole\'s own new wall has no primitive lineage (name is null) -- falls back to the hole itself',
    sel.ownerOf(d2, { target: 'hole1', name: null }) === 'hole1');

  const d3 = doc(box('box1'), fillet('round1', 'box1'));
  check('a round\'s own new filleted face has no primitive lineage either -- falls back to the round itself',
    sel.ownerOf(d3, { target: 'round1', name: null }) === 'round1');
  check('name omitted entirely (undefined) behaves the same as null',
    sel.ownerOf(d3, { target: 'round1' }) === 'round1');

  console.log('\n=== ownerOf: the pickedFace/pickedEdge state shape (face/edge, not name) ===');

  check('SandboxWorkspace\'s pickedFace state (field is `face`, not `name`) resolves the same way',
    sel.ownerOf(d1, { target: 'box1', face: primitiveFace('box1', '+x') }) === 'box1');
  check('SandboxWorkspace\'s pickedEdge state (field is `edge`) resolves the same way',
    sel.ownerOf(d1, { target: 'box1', edge: between(primitiveFace('box1', '+z'), primitiveFace('box1', '-y')) }) === 'box1');

  console.log('\n=== ownerOf: a name whose feature the doc no longer has ===');

  // A stored/stale name pointing at a primitive that was since deleted --
  // the name does not resolve, so this falls through to target exactly like
  // the null-name case above.
  check('a name rooted in a deleted primitive falls back to target',
    sel.ownerOf(doc(hole('hole1', 'box1')), { target: 'hole1', name: primitiveFace('box1', '+z') }) === 'hole1');

  console.log('\n=== ownerOf: nothing to resolve at all ===');

  check('null pick resolves to null', sel.ownerOf(d1, null) === null);
  check('undefined pick resolves to null', sel.ownerOf(d1, undefined) === null);

  console.log('\n=== ownerOf: the stale-pick case (neither name nor target resolve) ===');

  const empty = doc();
  check('a target the doc has never seen, with no name, resolves to null',
    sel.ownerOf(empty, { target: 'box1', name: null }) === null);

  const afterUndo = doc(box('box1'));
  check('a target Undo already removed (hole1, undone), with no name, resolves to null, not a phantom selection',
    sel.ownerOf(afterUndo, { target: 'hole1', name: null }) === null);

  console.log(fails.length === 0
    ? `\nall ${pass} checks passed`
    : `\n${fails.length} failed`);
  return fails.length === 0;
};
