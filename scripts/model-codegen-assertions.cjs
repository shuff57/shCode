// Assertions for lib/model-types.ts + lib/model-codegen.ts, run against a
// CommonJS build by scripts/test-model-codegen.mjs.

module.exports = function run(dir) {
  const path = require('path');
  const types = require(path.join(dir, 'model-types.js'));
  const gen = require(path.join(dir, 'model-codegen.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const box = (id, extra = {}) => ({
    id, kind: 'box', size: [40, 40, 20], center: [0, 0, 0], ...extra,
  });
  const cyl = (id, extra = {}) => ({
    id, kind: 'cylinder', radius: 10, height: 40, center: [0, 0, 0], ...extra,
  });
  const doc = (...features) => ({ version: 1, features });

  const fs = require('fs');

  console.log('\n=== cone and ring ===');

  const cone = (id) => ({ id, kind: 'cone', radius: 12, height: 30, center: [0, 0, 0] });
  const ring = (id) => ({ id, kind: 'torus', ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] });

  check('a ring refuses to round', types.whyCannotRound(ring('r1')) !== null);

  // An L, so a wrong winding or a dropped corner shows up in the volume rather
  // than only in a picture nobody looks at. `sketch`/`pull` are used well
  // below this point too (item D, item P), not just by the JSCAD-era checks
  // that used to sit in this section.
  const L = [[0, 0], [40, 0], [40, 10], [15, 10], [15, 25], [0, 25]];
  const sketch = (id, plane = 'xy', offset = 0) => ({
    id, kind: 'sketch', plane, offset, points: L,
  });
  const pull = (id, target, height = 12) => ({ id, kind: 'extrude', target, height });

  console.log('\n=== turning a shape ===');

  check('an unrotated shape declares no angles',
    !gen.generatedParams(doc(box('b1'))).some((p) => p.name.endsWith('_rz')));
  check('a turned one does',
    gen.generatedParams(doc(box('b1', { rotate: [0, 0, 45] }))).some((p) => p.name === 'b1_rz'));

  console.log('\n=== names count per kind, not per row ===');

  const mixed = doc(box('b1'), cyl('c1'), box('b2'), cyl('c2'));
  const nm = types.nameMap(mixed);
  check('the first cylinder is Cylinder 1 even after a box', nm.c1 === 'Cylinder 1', nm.c1);
  check('the second box is Box 2', nm.b2 === 'Box 2', nm.b2);
  check('the second cylinder is Cylinder 2', nm.c2 === 'Cylinder 2', nm.c2);
  // 'across', not 'radius' -- item D: the panel now speaks in the course's
  // diameter word for every round shape, matching Ring/Circle's own
  // long-standing convention.
  check('captions follow the same names',
    gen.generatedParams(mixed).some((p) => p.caption === 'Cylinder 1 across'));

  console.log('\n=== display numbers are stable under reordering (root cause B, finding 4) ===');

  // nameMap() used to count "position in doc.features" to number same-kind
  // rows, so dragging a feature past its same-kind sibling renamed BOTH of
  // them -- the box a student thinks of as "Box 1" reads as "Box 2" the
  // moment something reorders it ahead of the other box. A value that would
  // make a broken implementation pass: numbering by array index again, i.e.
  // building nm2 by iterating the reordered array and counting occurrences
  // in that order -- which would report b2 as "Box 1" below, the exact
  // mislabel this closes.
  const twoBoxes = doc(box('b1'), box('b2'));
  const nmBefore = types.nameMap(twoBoxes);
  check('b1 starts out Box 1', nmBefore.b1 === 'Box 1', nmBefore.b1);
  check('b2 starts out Box 2', nmBefore.b2 === 'Box 2', nmBefore.b2);

  const reorderedBoxes = doc(box('b2'), box('b1')); // same two features, swapped array order
  const nmAfter = types.nameMap(reorderedBoxes);
  check('b1 is still Box 1 after the list reorders it second',
    nmAfter.b1 === 'Box 1', `${nmAfter.b1} (broken: position-based numbering would say Box 2)`);
  check('b2 is still Box 2 after the list reorders it first',
    nmAfter.b2 === 'Box 2', `${nmAfter.b2} (broken: position-based numbering would say Box 1)`);

  // Same property for a kind whose label depends on a field, not the id
  // prefix: three combines that share the 'op' id counter but split across
  // three different labels (Join/Cut/Overlap) by f.op. Reordering must not
  // shuffle their per-label numbers either.
  const combos = doc(
    { id: 'op1', kind: 'combine', op: 'union', targets: [] },
    { id: 'op2', kind: 'combine', op: 'subtract', targets: [] },
    { id: 'op3', kind: 'combine', op: 'union', targets: [] },
  );
  const comboNm = types.nameMap(combos);
  check('the first Join is Join 1', comboNm.op1 === 'Join 1', comboNm.op1);
  check('the only Cut is Cut 1', comboNm.op2 === 'Cut 1', comboNm.op2);
  check('the second Join is Join 2, not Join 3 or Overlap 1', comboNm.op3 === 'Join 2', comboNm.op3);
  const combosReordered = doc(combos.features[2], combos.features[0], combos.features[1]);
  const comboNmAfter = types.nameMap(combosReordered);
  check('reordering the combines does not renumber any of them',
    comboNmAfter.op1 === comboNm.op1 && comboNmAfter.op2 === comboNm.op2 && comboNmAfter.op3 === comboNm.op3,
    JSON.stringify(comboNmAfter));

  console.log('\n=== the reorder guard asks each feature what it depends on (root cause B, finding 5) ===');

  // dependsOn() is what ModelEditor's move() reorder guard calls instead of
  // hardcoding `f.kind === 'combine'`. A value that would make a broken
  // implementation pass: dependsOn() (or the guard built on it) only
  // recognizing 'combine', i.e. returning [] for the other seven target-
  // carrying kinds -- which is exactly the pre-fix bug (a Hole could be
  // dragged above the box it drills with no warning).
  const targetCarrying = [
    ['hole', { id: 'h', kind: 'hole', target: 'b1', diameter: 4, depth: 10, center: [0, 0, 0], axis: 'z' }],
    ['extrude', { id: 'e', kind: 'extrude', target: 's1', height: 10 }],
    ['revolve', { id: 'r', kind: 'revolve', target: 's1', angle: 360 }],
    ['mirror', { id: 'm', kind: 'mirror', target: 'b1', plane: 'xy' }],
    ['pattern', { id: 'p', kind: 'pattern', target: 'b1', mode: 'linear', count: 2, step: [1, 0, 0] }],
    ['shell', { id: 'sh', kind: 'shell', target: 'b1', thickness: 1 }],
    ['move', { id: 'mv', kind: 'move', target: 'b1', offset: [1, 0, 0], copy: true }],
  ];
  for (const [label, f] of targetCarrying) {
    check(`dependsOn() sees the target ${label} carries, not just combine`,
      types.dependsOn(f).length === 1 && types.dependsOn(f)[0] === f.target,
      JSON.stringify(types.dependsOn(f)));
  }
  check('dependsOn() on a combine returns every target, not just one',
    JSON.stringify(types.dependsOn({ id: 'x', kind: 'combine', op: 'union', targets: ['a', 'b'] })) === '["a","b"]');
  check('dependsOn() on a standalone shape is empty -- nothing to depend on',
    types.dependsOn(box('b1')).length === 0);
  check('dependsOn() on a sketch is empty too',
    types.dependsOn({ id: 's', kind: 'sketch', plane: 'xy', offset: 0, points: [] }).length === 0);

  console.log('\n=== parameters ===');

  // Every shape kind, so a parameter that is declared but never read cannot
  // hide behind a doc that happens not to contain that shape. A ring's centre
  // did exactly that: torus() takes no center, so its move handles drove
  // parameters main() never looked at.
  const d = doc(box('b1'), cyl('c1'), cone('k1'), ring('r1'),
                { id: 's1', kind: 'sphere', radius: 9, center: [0, 0, 0] });
  const params = gen.generatedParams(d);
  const names = params.map((p) => p.name);
  check('names are keyed by id, not position',
    names.includes('b1_width') && names.includes('c1_radius'), names.join(','));

  // Reordering must not rename anything: a rename would send a pushed value to
  // the wrong slot the moment a feature moves in the list.
  const reordered = gen.generatedParams(doc(
    ring('r1'), cone('k1'), cyl('c1'),
    { id: 's1', kind: 'sphere', radius: 9, center: [0, 0, 0] }, box('b1')));
  check('reordering renames nothing',
    reordered.map((p) => p.name).sort().join() === names.slice().sort().join());
  check('paramValues matches generatedParams\' own name set',
    Object.keys(gen.paramValues(d)).sort().join() === names.slice().sort().join());

  console.log('\n=== rounding rules ===');

  // ROOT CAUSE A / finding 2: whyCannotRound() used to say "Round the box
  // before you cut the hole" for EVERY combine, regardless of f.op -- wrong
  // for a Join or an Overlap, where nothing was cut. A value that would make
  // a broken implementation pass: the union/intersect messages below still
  // containing "cut" or "hole", which they would if the old unconditional
  // string were still in place.
  const cutMsg = types.whyCannotRound({ id: 'x', kind: 'combine', op: 'subtract', targets: [] });
  const joinMsg = types.whyCannotRound({ id: 'x', kind: 'combine', op: 'union', targets: [] });
  const overlapMsg = types.whyCannotRound({ id: 'x', kind: 'combine', op: 'intersect', targets: [] });
  check('a Cut names cutting', /cut/i.test(cutMsg), cutMsg);
  check('a Join does not blame a cut or a hole that never happened',
    !/cut|hole/i.test(joinMsg), joinMsg);
  check('a Join names joining', /join/i.test(joinMsg), joinMsg);
  check('an Overlap does not blame a cut or a hole either', !/cut|hole/i.test(overlapMsg), overlapMsg);
  check('an Overlap names overlapping', /overlap/i.test(overlapMsg), overlapMsg);

  // ROOT CAUSE A / finding 1: the sketch/Pull/Spin message used to send a
  // student to round "the corners of the sketch" -- a tool that did not
  // exist anywhere in the sketch editor. A value that would make a broken
  // implementation pass: either message below still containing the word
  // "corners" paired with an instruction to use them, since that is the
  // fabricated remedy being removed.
  const sketchMsg = types.whyCannotRound({ id: 's', kind: 'sketch', plane: 'xy', offset: 0, points: [] });
  const pullMsg = types.whyCannotRound({ id: 'e', kind: 'extrude', target: 's', height: 10 });
  const spinMsg = types.whyCannotRound({ id: 'r', kind: 'revolve', target: 's', angle: 360 });
  const fabricatedRemedy = /round the corners of the sketch/i;
  for (const [label, msg] of [['sketch', sketchMsg], ['Pull result', pullMsg], ['Spin result', spinMsg]]) {
    check(`a ${label} does not send the student to round a sketch's corners the OLD way`,
      !fabricatedRemedy.test(msg), msg);
  }

  // reSHape sketch build 1 (lib/sketch-arc.ts, the Rules panel's Round a corner
  // field): a real remedy now exists, so "there is no such tool" stopped
  // being true and the message must say so. A value that would make a
  // broken implementation pass: any of the three messages below still
  // containing the literal phrase "no way to round a corner" -- the exact
  // string this build was required to remove (see the parity map's `fillet`
  // -> `chamfer2d` split and its "load-bearing" why). Superseding, not
  // deleting, the check this replaces: the OLD assertion here required "no
  // way" to appear in all three messages, which was correct advice about a
  // product that had no such tool and became WRONG advice the moment this
  // build shipped one.
  for (const [label, msg] of [['sketch', sketchMsg], ['Pull result', pullMsg], ['Spin result', spinMsg]]) {
    check(`...and the ${label} message no longer claims there is no such tool`,
      !/no way to round a corner/i.test(msg), msg);
    check(`...and instead names the real remedy: Round a corner in the Rules panel`,
      /round a corner/i.test(msg) && /rules panel/i.test(msg), msg);
  }
  check('the fabricated-tool sentence is gone from the whole codebase',
    !fs.readFileSync(path.join(__dirname, '..', 'lib', 'model-types.ts'), 'utf8')
      .includes('no way to round a corner'));

  // ROOT CAUSE A / finding 3: the Move message used to always say "before
  // you move it," even for a Copy -- contradicting the "(copy)" label the
  // same row renders. A value that would make a broken implementation pass:
  // the copy-made message below still reading "moved copy" instead of
  // naming Copy, since that is the old unconditional text.
  const movedMsg = types.whyCannotRound({ id: 'mv', kind: 'move', target: 'b1', offset: [1, 0, 0], copy: false });
  const copiedMsg = types.whyCannotRound({ id: 'mv', kind: 'move', target: 'b1', offset: [1, 0, 0], copy: true });
  check('a genuine Move names moving', /move/i.test(movedMsg), movedMsg);
  check('a Move made with Copy names copying, not moving',
    /copy/i.test(copiedMsg) && !/moved copy/i.test(copiedMsg), copiedMsg);
  check('Move and Copy give different reasons', movedMsg !== copiedMsg);

  check('a sphere refuses to round',
    types.whyCannotRound({ id: 's', kind: 'sphere', radius: 5, center: [0, 0, 0] }) !== null);
  check('a box may round', types.whyCannotRound(box('b1')) === null);
  check('maxRound stops short of half the smallest side',
    types.maxRound(box('b1')) < 10 && types.maxRound(box('b1')) > 9.9,
    String(types.maxRound(box('b1'))));
  check('maxRound on a cylinder uses the smaller of radius*2 and height',
    types.maxRound(cyl('c1')) < 10, String(types.maxRound(cyl('c1'))));

  // A second silent-wrong-result bug found while fixing Repeat and Mirror:
  // whyCannotRound() only ever named 5 of the 11 feature kinds; the other 6
  // fell through to `return null` -- which reads as "rounding is fine here"
  // -- while isRoundable() (the real gate, since only a box/cylinder even
  // HAS a round field) silently no-opped the click one function away. A
  // value that would make a broken implementation pass: whyCannotRound still
  // falling through to null for these -- every check below would then read
  // `null !== null` as false and fail.
  const holeF = { id: 'h', kind: 'hole', target: 'b1', diameter: 6, depth: 10, center: [0, 0, 0], axis: 'z' };
  const shellF = { id: 'sh', kind: 'shell', target: 'b1', thickness: 2 };
  const mirrorF = { id: 'm', kind: 'mirror', target: 'b1', plane: 'xy' };
  const patF = { id: 'pa', kind: 'pattern', target: 'b1', mode: 'linear', count: 3, step: [10, 0, 0] };
  const moveF = { id: 'mv', kind: 'move', target: 'b1', offset: [10, 0, 0], copy: true };
  const revF = { id: 'rv', kind: 'revolve', target: 's1', angle: 360 };
  check('a hole refuses to round, and says why', types.whyCannotRound(holeF) !== null);
  check('a hollowed shape refuses to round, and says why', types.whyCannotRound(shellF) !== null);
  check('a mirrored copy refuses to round, and says why', types.whyCannotRound(mirrorF) !== null);
  check('a repeated copy refuses to round, and says why', types.whyCannotRound(patF) !== null);
  check('a moved copy refuses to round, and says why', types.whyCannotRound(moveF) !== null);
  check('a revolve refuses to round, and says why', types.whyCannotRound(revF) !== null);
  check('every one of those reasons is actually a sentence, not a blank refusal',
    [holeF, shellF, mirrorF, patF, moveF, revF]
      .every((f) => (types.whyCannotRound(f) || '').length > 10));

  console.log('\n=== revolve (Spin) ===');

  // Off-axis profile: x from 10 to 20, y from 0 to 30 -- a washer cross
  // section, so a wrong axis or a dropped angle shows up in the volume.
  const revProfile = (id) => ({
    id, kind: 'sketch', plane: 'xy', offset: 0,
    points: [[10, 0], [20, 0], [20, 30], [10, 30]],
  });
  const revolveF = (id, target, angle = 360) => ({ id, kind: 'revolve', target, angle });

  console.log('\n=== mirror (Mirror) ===');

  const mirrorDoc = doc(box('b1', { center: [50, 0, 0] }), { id: 'm1', kind: 'mirror', target: 'b1', plane: 'yz' });
  check('mirror keeps the original standing: both b1 and m1 come back top-level',
    types.topLevel(mirrorDoc).map((f) => f.id).sort().join() === 'b1,m1');

  console.log('\n=== pattern (Repeat) is a real for loop ===');

  const linPattern = { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'linear', count: 3, step: [30, 0, 0] };
  const linDoc = doc(box('b1', { size: [10, 10, 10] }), linPattern);
  check('the pattern consumes its source: only the pattern comes back',
    types.topLevel(linDoc).map((f) => f.id).join() === 'pat1');

  console.log('\n=== Repeat Around orbits the world axis, and refuses when there is nothing to orbit ===');

  // The real footgun the round-4 critic was half-seeing: a shape ON the axis
  // has no radius to sweep, so every copy lands on the first. Refused up
  // front rather than shipped as six rows that render one shape.
  const onAxis = types.whyCannotOrbit(
    { id: 'c2', kind: 'cylinder', radius: 5, height: 10, center: [0, 0, 0] }, 'z');
  check('a shape sitting on the axis is refused, with a reason naming the fix',
    typeof onAxis === 'string' && /move it away/i.test(onAxis), String(onAxis));
  check('a shape away from the axis is allowed through',
    types.whyCannotOrbit(
      { id: 'c3', kind: 'cylinder', radius: 5, height: 10, center: [50, 0, 0] }, 'z') === null);

  console.log('\n=== hole (Hole) is one row, not two ===');

  const holeDoc = doc(box('b1', { size: [40, 40, 20] }), {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 10, depth: 30, center: [0, 0, 0], axis: 'z',
  });
  check('no separate cylinder feature row exists to be returned',
    types.topLevel(holeDoc).map((f) => f.id).join() === 'hole1');

  check('applyParam moves a hole by name, same as any other centre',
    gen.applyParam(holeDoc, 'hole1_x', 12).features[0].id === 'b1'
    && gen.applyParam(holeDoc, 'hole1_x', 12).features[1].center[0] === 12
    && gen.applyParam(holeDoc, 'hole1_x', 12).features[1].center[1] === 0);

  console.log('\n=== hole, four corners: one feature, guaranteed symmetric ===');

  // A plate big enough that four 6mm-diameter corner bores 40 apart in x and
  // 30 apart in y (dx 20, dy 15) do not overlap each other or the edge.
  const plate = box('b1', { size: [60, 40, 10] });
  const cornersFeature = {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 20,
    center: [0, 0, 0], axis: 'z', corners: { dx: 20, dy: 15 },
  };
  const cornersDoc = doc(plate, cornersFeature);

  check('four corners is still ONE subtract, not four Hole rows',
    types.topLevel(cornersDoc).map((f) => f.id).join() === 'hole1');

  check('a plain Hole still declares no corner spacing at all',
    !gen.generatedParams(holeDoc).some((p) => p.name.endsWith('_dx') || p.name.endsWith('_dy')));
  // Item P: the panel now shows the INSET from each side, not the raw
  // centre-offset -- plate is 60x40 (dx:20 -> 30-20=10 in from the side;
  // dy:15 -> 20-15=5 in from the side).
  check('a four-corners Hole declares both spacings, captioned "in from each side"',
    gen.generatedParams(cornersDoc).some((p) => p.name === 'hole1_dx' && p.caption === 'Hole 1 in from each side (across)' && p.value === 10)
    && gen.generatedParams(cornersDoc).some((p) => p.name === 'hole1_dy' && p.caption === 'Hole 1 in from each side (up)' && p.value === 5));

  check('newHole() makes a plain single hole with no corners field',
    types.newHole(doc(), 'b1').corners === undefined);
  check('newHoleCorners() makes a four-corners hole out of the box',
    types.newHoleCorners(doc(), 'b1').corners !== undefined
    && types.newHoleCorners(doc(), 'b1').axis === 'z');

  // Target-aware defaults: a hole reads the target's own extent along its
  // bore axis so the default pokes through rather than landing as an
  // invisible blind pocket, and a linear pattern's step clears the target's
  // width instead of fusing the copies into one blob.
  const defaultBoxDoc = doc(box('b1'));
  check('newHole() on a 40x40x20 box bores all the way through (depth 22)',
    types.newHole(defaultBoxDoc, 'b1').depth === 22);
  check('newHoleCorners() on a 40x40x20 box bores all the way through (depth 22)',
    types.newHoleCorners(defaultBoxDoc, 'b1').depth === 22);
  check('newPattern() linear on a 40-wide box steps clear of it ([60, 0, 0])',
    JSON.stringify(types.newPattern(defaultBoxDoc, 'b1', 'linear').step) === JSON.stringify([60, 0, 0]));

  const cylDoc = doc(cyl('c1', { radius: 5, height: 30 }));
  check('newHole() on a r5 h30 cylinder bores all the way through (depth 32)',
    types.newHole(cylDoc, 'c1').depth === 32);
  check('newPattern() linear on a r5 cylinder steps clear of it ([15, 0, 0])',
    JSON.stringify(types.newPattern(cylDoc, 'c1', 'linear').step) === JSON.stringify([15, 0, 0]));

  const chainHole = types.newHole(defaultBoxDoc, 'b1');
  const chainDoc = doc(box('b1'), chainHole);
  check('newHole() chained onto a hole on the box still reads the box (depth 22)',
    types.newHole(chainDoc, chainHole.id).depth === 22);

  check('newHole() on a target id that does not exist falls back to depth 10',
    types.newHole(defaultBoxDoc, 'does-not-exist').depth === 10);
  check('newPattern() linear on a target id that does not exist falls back to [30, 0, 0]',
    JSON.stringify(types.newPattern(defaultBoxDoc, 'does-not-exist', 'linear').step) === JSON.stringify([30, 0, 0]));

  const rotatedBoxDoc = doc(box('b2', { rotate: [0, 90, 0] }));
  check('newHole() on a rotated box falls back to depth 10',
    types.newHole(rotatedBoxDoc, 'b2').depth === 10);
  check('newPattern() linear on a rotated box falls back to [30, 0, 0]',
    JSON.stringify(types.newPattern(rotatedBoxDoc, 'b2', 'linear').step) === JSON.stringify([30, 0, 0]));

  // Same rule for a tilted cylinder: its reach along z is no longer its height.
  const tiltedCylDoc = doc({ id: 'c2', kind: 'cylinder', radius: 5, height: 30, center: [0, 0, 0], rotate: [90, 0, 0] });
  check('newHole() on a rotated cylinder falls back to depth 10',
    types.newHole(tiltedCylDoc, 'c2').depth === 10);

  console.log('\n=== newShape() spaces a second shape out, not on top of the first ===');

  // A second primitive used to land at [0, 0, 0] no matter what already
  // existed -- invisible, hidden inside the first shape, findable only by
  // a student who thought to open the x field. newShape() now walks the
  // doc's existing primitives and starts the new one past all of them.
  check('newShape() on an empty doc still starts a box at the origin',
    JSON.stringify(types.newShape(doc(), 'box').center) === JSON.stringify([0, 0, 0]));
  // A 40-wide box at the origin reaches to x=20. A second 40-wide box also
  // needs 20 to its own left, plus the 10-unit gap: 20 + 20 + 10 = 50.
  check('newShape() places a second box after a 40-wide box at x=50',
    types.newShape(defaultBoxDoc, 'box').center[0] === 50);
  // Same box, but the new shape is a cylinder: its OWN half-width is its
  // radius (10), not a box's half-size, so the gap comes out smaller: 20 (the
  // box's own reach) + 10 (the cylinder's radius) + 10 (the gap) = 40.
  check('newShape() places a cylinder after a box using the cylinder\'s own radius, not the box\'s',
    types.newShape(defaultBoxDoc, 'cylinder').center[0] === 40);
  // The other two axes are left alone -- only x moves shapes apart.
  check('newShape() never moves the new shape off the y or z axis',
    types.newShape(defaultBoxDoc, 'box').center[1] === 0
    && types.newShape(defaultBoxDoc, 'box').center[2] === 0);

  // Item P: applyParam takes the typed INSET and converts it back to the
  // stored centre-offset (plate 60x40: half 30/20) -- typing 15 in from
  // the side across gives dx = 30-15 = 15; typing 8 in from the side up
  // gives dy = 20-8 = 12.
  const widerCorners = gen.applyParam(gen.applyParam(cornersDoc, 'hole1_dx', 15), 'hole1_dy', 8);
  check('applyParam converts a typed inset back to the stored centre-offset, without touching diameter, depth or centre',
    widerCorners.features[1].corners.dx === 15
    && widerCorners.features[1].corners.dy === 12
    && widerCorners.features[1].diameter === 6
    && widerCorners.features[1].center.join() === '0,0,0');

  console.log('\n=== Repeat on a Hole repeats the bore, not the block ===');

  // The exact defect this closes, verified live: select a single 6mm bore in
  // a 40x40x20 box and click Repeat, and the feature list reads "Hole 1 x 3"
  // while the OLD engine (patternLines' generic branch) translated and
  // unioned three copies of hole1's own value -- which per HoleFeature's doc
  // comment is "the block with a hole in it," not "the hole." Each copy's
  // solid material fills in its neighbour's hole, so the 3D view shows the
  // box tripled into a solid bar with every hole gone.
  //
  // A value that would make a broken implementation pass: holePatternLines()
  // never being called at all -- i.e. patternLines() still routing a
  // hole-target pattern through booleans.union(translated copies of hole1)
  // the way every other target does. That produces a ~56-wide solid slab
  // (three overlapping 40-wide boxes spanning x -20..36) with volume close
  // to the block's own 32000, not three real bores removed from ONE block.
  const repeatHoleBox = box('b1', { size: [40, 40, 20] });
  const repeatHole = {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 25, center: [0, 0, 0], axis: 'z',
  };
  const repeatHolePattern = {
    id: 'pat1', kind: 'pattern', target: 'hole1', mode: 'linear', count: 3, step: [8, 0, 0],
  };
  const repeatHoleDoc = doc(repeatHoleBox, repeatHole, repeatHolePattern);

  check('the pattern still consumes the hole: only the repeat comes back top-level',
    types.topLevel(repeatHoleDoc).map((f) => f.id).join() === 'pat1');

  console.log('\n=== shell (Hollow) ===');

  const shellDoc = doc(box('b1', { size: [40, 40, 20] }), { id: 'shell1', kind: 'shell', target: 'b1', thickness: 4 });
  check('the shell consumes its target, only the hollow shape returns',
    types.topLevel(shellDoc).map((f) => f.id).join() === 'shell1');

  console.log('\n=== shell open face (Hollow, leaving one face open) ===');

  check('newShell with no open argument carries no open field',
    types.newShell(doc(box('b1')), 'b1').open === undefined);
  const openZName = { cause: 'primitive', feature: 'b1', kind: 'face', part: '+z' };
  check('newShell(doc, target, open) stores the face name',
    types.newShell(doc(box('b1')), 'b1', openZName).open === openZName);

  console.log('\n=== move (Move) ===');

  const moveCopyDoc = doc(box('b1'), { id: 'move1', kind: 'move', target: 'b1', offset: [50, 0, 0], copy: true });
  check('copy:true keeps the original standing alongside the moved copy',
    types.topLevel(moveCopyDoc).map((f) => f.id).sort().join() === 'b1,move1');

  const moveReplaceDoc = doc(box('b1'), { id: 'move2', kind: 'move', target: 'b1', offset: [50, 0, 0], copy: false });
  check('copy:false relocates: the original is consumed, only the moved feature shows',
    types.topLevel(moveReplaceDoc).map((f) => f.id).join() === 'move2');

  console.log('\n=== new feature names match the parity map ===');

  const labelDoc = doc(
    revProfile('s1'), revolveF('rev1', 's1'),
    box('b1'),
    { id: 'm1', kind: 'mirror', target: 'b1', plane: 'xy' },
    { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'linear', count: 2, step: [10, 0, 0] },
    { id: 'hole1', kind: 'hole', target: 'b1', diameter: 4, depth: 10, center: [0, 0, 0], axis: 'z' },
    { id: 'shell1', kind: 'shell', target: 'b1', thickness: 2 },
    { id: 'move1', kind: 'move', target: 'b1', offset: [5, 0, 0], copy: true },
  );
  const labelNm = types.nameMap(labelDoc);
  check('revolve is labelled Spin', labelNm.rev1 === 'Spin 1', labelNm.rev1);
  check('mirror is labelled Mirror', labelNm.m1 === 'Mirror 1', labelNm.m1);
  check('a linear pattern is labelled Repeat', labelNm.pat1 === 'Repeat 1', labelNm.pat1);
  check('hole is labelled Hole', labelNm.hole1 === 'Hole 1', labelNm.hole1);
  check('shell is labelled Hollow', labelNm.shell1 === 'Hollow 1', labelNm.shell1);
  // move1 above has copy:true -- it must read "Copy 1", not "Move 1"
  // (item C: the toolbar's own Move/Copy distinction, ModelEditor.tsx's
  // moveLabel(), used to be lost once nameMap() got involved).
  check('a copy:true move is labelled Copy, not Move', labelNm.move1 === 'Copy 1', labelNm.move1);

  const newKindIds = ['rev1', 'm1', 'pat1', 'hole1', 'shell1', 'move1'];
  check('isDerived recognizes every new feature as depending on an earlier one',
    newKindIds.every((id) => types.isDerived(labelDoc.features.find((f) => f.id === id))));
  check('isShape excludes every new feature -- none of them has a plain centre',
    newKindIds.every((id) => !types.isShape(labelDoc.features.find((f) => f.id === id))));

  console.log('\n=== one name per tool: chip label matches the toolbar (item C) ===');

  {
    const circPatDoc = doc(box('b2'), { id: 'pat2', kind: 'pattern', target: 'b2', mode: 'circular', count: 6, axis: 'z', totalAngle: 360 });
    const nm = types.nameMap(circPatDoc);
    check('a circular pattern is labelled Repeat Around, not Repeat -- the toolbar already distinguishes these two buttons',
      nm.pat2 === 'Repeat Around 1', nm.pat2);
  }
  {
    const copyOnlyDoc = doc(box('b3'), { id: 'mv3', kind: 'move', target: 'b3', offset: [10, 0, 0], copy: false });
    const nm = types.nameMap(copyOnlyDoc);
    check('a plain copy:false move still reads Move, unaffected by the copy:true fix above',
      nm.mv3 === 'Move 1', nm.mv3);
  }
  {
    const roundDoc = doc(box('b4'), { id: 'fr1', kind: 'fillet', target: 'b4', edge: null, size: 3, style: 'fillet' });
    const chamferDoc = doc(box('b5'), { id: 'fc1', kind: 'fillet', target: 'b5', edge: null, size: 3, style: 'chamfer' });
    check('a fillet-style round is labelled Round', types.nameMap(roundDoc).fr1 === 'Round 1', types.nameMap(roundDoc).fr1);
    // Matches the toolbar's own button text (ModelEditor.tsx's roundLabel) --
    // NOT reference.md/studentWord()'s "bevel", a naming disagreement this
    // pass flags rather than resolves (see model-types.ts's labelOf comment).
    // Decision: reference.md/studentWord() win the naming disagreement --
    // "Bevel", not the toolbar's retired "Angled Corner" (kept only as a
    // search alias, see ModelEditor.tsx's FlyoutVariant.alias).
    check('a chamfer-style round is labelled Bevel, matching reference.md/studentWord()',
      types.nameMap(chamferDoc).fc1 === 'Bevel 1', types.nameMap(chamferDoc).fc1);
  }

  console.log('\n=== sketch build 1: circle (shape tag) ===');

  const circleSketch = { id: 'sk2', kind: 'sketch', plane: 'xy', offset: 0, shape: 'circle', points: [[15, 12.5], [25, 12.5]] };

  // #8 was pinned the other way once: "a circle keeps its four corner params,
  // not derived r/cx/cy", because sketchHandles() (lib/model-handles.ts)
  // builds every drag HANDLE from f.points, and a derived-params circle
  // looked like it would have no draggable handles at all. That conflated
  // two independent lists. Handles are untouched by this change -- they
  // still come straight off f.points, same as every other sketch -- and are
  // covered by scripts/test-model-handles.mjs, not this file. What changed
  // is only the DIMENSIONS PANEL, which is exactly where the real defect
  // was: "corner 1 across -5, corner 2 across 5" made a student reverse an
  // exact Ø10 by hand (measured 2026-09-04). The panel now reads "across"
  // (a real diameter) and "centre x"/"centre y", not two raw endpoints.
  check('#8 a circle\'s PANEL params are derived -- across/centre x/centre y -- not raw corner coordinates',
    gen.generatedParams(doc(circleSketch)).map((p) => p.name).sort().join() === 'sk2_across,sk2_offset,sk2_x,sk2_y',
    `got ${gen.generatedParams(doc(circleSketch)).map((p) => p.name).sort().join()}`);
  check('...captioned "across", "centre x", "centre y", reading the diameter and midpoint of the stored points',
    // "Sketch 1", not "Sketch 2" -- nameMap() numbers sketches by their ORDER
    // in this doc, not by the literal id string, and this doc has only one.
    gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_across').caption === 'Sketch 1 across'
    && gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_across').value === 10
    && gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_x').caption === 'Sketch 1 centre x'
    && gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_x').value === 20
    && gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_y').caption === 'Sketch 1 centre y'
    && gen.generatedParams(doc(circleSketch)).find((p) => p.name === 'sk2_y').value === 12.5,
    JSON.stringify(gen.generatedParams(doc(circleSketch))));

  console.log('\n=== a circle\'s panel params round-trip through applyParam ===');

  const acrossDoc = { version: 1, features: [{ id: 'sk3', kind: 'sketch', plane: 'xy', offset: 0, shape: 'circle', points: [[0, 3], [10, 3]] }] };
  check('a circle of across 10 at centre (5, 3) is stored as points (0,3) and (10,3)',
    JSON.stringify(gen.generatedParams(acrossDoc).map((p) => [p.name, p.value])) ===
    JSON.stringify([['sk3_across', 10], ['sk3_x', 5], ['sk3_y', 3], ['sk3_offset', 0]]),
    JSON.stringify(gen.generatedParams(acrossDoc)));

  const draggedAcross = gen.applyParam(acrossDoc, 'sk3_across', 20);
  const draggedAcrossSk = draggedAcross.features[0];
  check('dragging across to 20 keeps the centre at (5, 3)',
    Math.abs((draggedAcrossSk.points[0][0] + draggedAcrossSk.points[1][0]) / 2 - 5) < 1e-9
    && Math.abs((draggedAcrossSk.points[0][1] + draggedAcrossSk.points[1][1]) / 2 - 3) < 1e-9
    && Math.abs(Math.hypot(
      draggedAcrossSk.points[1][0] - draggedAcrossSk.points[0][0],
      draggedAcrossSk.points[1][1] - draggedAcrossSk.points[0][1],
    ) - 20) < 1e-9,
    JSON.stringify(draggedAcrossSk.points));

  const draggedCentre = gen.applyParam(gen.applyParam(acrossDoc, 'sk3_x', 50), 'sk3_y', -8);
  const draggedCentreSk = draggedCentre.features[0];
  check('dragging the centre to (50, -8) keeps across at 10',
    Math.abs(Math.hypot(
      draggedCentreSk.points[1][0] - draggedCentreSk.points[0][0],
      draggedCentreSk.points[1][1] - draggedCentreSk.points[0][1],
    ) - 10) < 1e-9
    && Math.abs((draggedCentreSk.points[0][0] + draggedCentreSk.points[1][0]) / 2 - 50) < 1e-9
    && Math.abs((draggedCentreSk.points[0][1] + draggedCentreSk.points[1][1]) / 2 - (-8)) < 1e-9,
    JSON.stringify(draggedCentreSk.points));

  console.log('\n=== sketch build 1: Corner refuses on a circle (Finding 3, sketch gauntlet round 2) ===');

  // addCorner() has no idea it is being asked to splice a third point into a
  // two-point diameter -- ModelEditor.tsx's corner() is supposed to refuse
  // before ever calling it. addCorner() itself is the belt-and-suspenders:
  // called anyway, it must leave a circle untouched rather than degrade it
  // into a collinear "polygon" that Pull then extrudes into a flat wedge.
  const cornerOnCircle = types.addCorner(circleSketch, 0);
  check('#11 addCorner() refuses a circle sketch outright -- same points, same length',
    cornerOnCircle.points.length === 2
    && cornerOnCircle.points[0][0] === circleSketch.points[0][0]
    && cornerOnCircle.points[1][0] === circleSketch.points[1][0],
    `got ${JSON.stringify(cornerOnCircle.points)} -- an implementation that does not check ` +
    `shape === 'circle' splices a midpoint in, leaving 3 points where circleOf() still only reads the first two as the diameter`);

  console.log('\n=== whyCannotRound: a circle sketch names a reachable remedy (Finding 4, sketch gauntlet round 2) ===');

  // The Rules panel (SketchConstraints, which carries "Round a corner") is
  // rendered in ModelEditor.tsx only when shape !== 'circle' -- see
  // `activeSketch && activeSketch.shape !== 'circle'` there. A value that
  // would make a broken implementation pass: the circle message below still
  // naming "Rules panel", the same fabricated-remedy shape Finding 1 of the
  // PREVIOUS gauntlet round fixed for combine/extrude/revolve.
  const circleRoundMsg = types.whyCannotRound(circleSketch);
  check('#12 a circle sketch does not send the student to a Rules panel it cannot reach',
    !/rules panel/i.test(circleRoundMsg), circleRoundMsg);
  check('...and still gives a real, followable remedy',
    typeof circleRoundMsg === 'string' && circleRoundMsg.length > 10, String(circleRoundMsg));
  check('...while a plain (non-circle) sketch keeps naming the Rules panel -- this must NOT regress',
    /rules panel/i.test(sketchMsg), sketchMsg);

  console.log('\n=== sketch build 1: addCorner reindexes past the seam ===');

  const cornerRect = { id: 'sk4', kind: 'sketch', plane: 'xy', offset: 0, points: [[0, 0], [40, 0], [40, 25], [0, 25]],
    constraints: [{ kind: 'lock', corner: 2 }] };
  const afterAddCorner = types.addCorner(cornerRect, 0);
  check('#6 a lock past the insertion seam shifts from corner 2 to corner 3',
    afterAddCorner.constraints.some((c) => c.kind === 'lock' && c.corner === 3)
    && !afterAddCorner.constraints.some((c) => c.kind === 'lock' && c.corner === 2),
    `got ${JSON.stringify(afterAddCorner.constraints)} -- the pre-existing bug this closes left it ` +
    `reading corner: 2, which after the splice is a different point than the one it used to lock`);

  console.log('\n=== sketch build 1: solveDoc leaves bulges and shape alone ===');

  const solvedFilleted = gen.solveDoc({ version: 1, features: [{
    id: 'sk5', kind: 'sketch', plane: 'xy', offset: 0,
    points: [[0, 0], [25, 0], [28, 9], [0, 30]],
    bulges: { 1: 0.72 },
    constraints: [{ kind: 'length', edge: 3, value: 30 }],
  }] });
  const solvedSketch = solvedFilleted.features[0];
  check('#10 a rule applied through solveDoc does not silently flatten a fillet',
    solvedSketch.bulges && solvedSketch.bulges[1] === 0.72,
    `got bulges = ${JSON.stringify(solvedSketch.bulges)} -- a broken write-back path that ` +
    `does not spread the rest of the feature would drop this to undefined`);

  console.log('\n=== sketch build 1: the refusal message is actually true ===');

  // #13. grep, not a spot check on one message: the old sentence had TWO
  // homes (the sketch branch and the extrude/revolve branch both carried it)
  // and shipping fillet while either survived would leave the app naming a
  // remedy it had just made false again in the other direction.
  const libSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'model-types.ts'), 'utf8');
  check('#13 "no way to round a corner" has no hits left in lib/model-types.ts',
    !libSrc.includes('no way to round a corner'));

  const overlaySrc = fs.readFileSync(path.join(__dirname, '..', 'components', 'model', 'ModelEditor.tsx'), 'utf8');
  check('#14 the sketch tool group is searchable by "Circle" -- sketchVisible includes it',
    /sketchVisible\s*=\s*\[[^\]]*'Circle'[^\]]*\]/.test(overlaySrc),
    'a stale sketchVisible list would hide the whole sketch group, including the button being searched for, ' +
    'the moment a student typed "circle" into Search tools');

  console.log('\n=== sketch build 1: addCorner on a ROUNDED edge keeps the outline ===');

  // The button a student presses is Corner, and it calls addCorner() -- not
  // splitEdge(), which is where the arc arithmetic lives. So the outline
  // guarantee is asserted here too, at the entry point the app actually
  // reaches, and against tessellate(): a bulge is a factor of its own chord,
  // so a split that shifts the KEY and keeps the VALUE hands each half the
  // whole edge's factor over half the chord -- half the radius each. That
  // reads as a perfectly plausible pair of bulge numbers. Only the shape
  // gives it away.
  const arcLib = require(path.join(dir, 'sketch-arc.js'));
  const area = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  };

  // A rectangle with corner 1 rounded at r = 8, then Corner pressed on the
  // arc edge. Built through the real functions, not hand-written numbers.
  const roundedRect = arcLib.filletCorner(
    { id: 'sk6', kind: 'sketch', plane: 'xy', offset: 0, points: [[0, 0], [40, 0], [40, 25], [0, 25]] },
    1, 8,
  );
  const arcEdge = Number(Object.keys(roundedRect.bulges)[0]);
  const beforeArea = area(arcLib.tessellate(roundedRect));
  const afterCorner = types.addCorner(roundedRect, arcEdge);
  const afterArea = area(arcLib.tessellate(afterCorner));

  check('#15 pressing Corner on a rounded edge adds one corner',
    afterCorner.points.length === roundedRect.points.length + 1,
    `got ${afterCorner.points.length} from ${roundedRect.points.length}`);
  check('#15 ...and does not change the outline it was pressed on',
    Math.abs(afterArea - beforeArea) / beforeArea < 2e-3,
    `area moved ${((Math.abs(afterArea - beforeArea) / beforeArea) * 100).toFixed(3)}% ` +
    `(${beforeArea.toFixed(3)} -> ${afterArea.toFixed(3)}) -- a key-only reindex halves the ` +
    `arc's radius and moves its centre, silently`);
  check('#15 ...and leaves no duplicate point behind',
    afterCorner.points.every((p, i) => {
      const q = afterCorner.points[(i + 1) % afterCorner.points.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9;
    }), JSON.stringify(afterCorner.points));

  console.log('\n=== the generated program has to be what Run actually runs ===');

  // Pressing Run in Build mode used to read fileContents['script.js'], which
  // in Build is still the untouched JSCAD starter -- the generated source was
  // only written into fileContents on the one-way door OUT of Build. So Run
  // silently replaced the student's model with the starter box: feature tree
  // unchanged, handles gone, Save STL sitting directly above the wrong solid,
  // zero console output. Found live in sketch gauntlet round 3 while the lens
  // was looking for something else.
  //
  // SPEC-A1 (2026-09-04) moved Build/Code entirely into
  // components/reshape/ReshapeStudio.tsx and, with it, closed this one-way
  // door for good: `doc` now regenerates script.js on every Build edit
  // (debounced), not just on leaving Build, so there is no "stale starter"
  // state left to run. This is a source check because the defect was React
  // wiring, not codegen -- checking the new home for the same guarantee.
  const studioSrc = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'reshape', 'ReshapeStudio.tsx'), 'utf8');
  // toReshape() (the JSCAD emitter) is gone -- toScript() (reSHape Script,
  // the kernel's only remaining source emitter) is the sole path now, so
  // this checks for its presence AND toReshape's absence rather than both
  // being present the way the JSCAD-era escape hatch required.
  check('Build regenerates script.js from the live doc, not a stale snapshot',
    /toScript\(doc,\s*scriptNamedParams/.test(studioSrc) && !/toReshape\(/.test(studioSrc),
    'ReshapeStudio no longer regenerates script.js from `doc` via toScript(), or still '
      + 'references the deleted toReshape() -- Build can leave a stale script.js behind');
  check('...and Code mode still runs the CURRENT file, not a stale snapshot',
    /setCode\(value\)/.test(studioSrc),
    "run() no longer reads the live `value` prop, which breaks Code mode's Run button");

  {
    const sq = (id, offset, half) => ({
      id, kind: 'sketch', plane: 'xy', offset,
      points: [[-half, -half], [half, -half], [half, half], [-half, half]],
    });
    const big = sq('sa', 0, 20);
    const small = sq('sb', 30, 5);

    console.log('\n=== blend: what it refuses ===');

    check('two sketches on different planes are refused, naming the fix',
      /same one first/.test(types.whyCannotBlend(big, { ...small, plane: 'yz' }) || ''),
      String(types.whyCannotBlend(big, { ...small, plane: 'yz' })));
    check('the same offset twice is refused -- there is no gap to fill',
      /no gap to fill/.test(types.whyCannotBlend(big, { ...small, offset: 0 }) || ''));
    check('a solid is refused -- it has no outline to skin from',
      /Pick two sketches/.test(types.whyCannotBlend(big, { id: 'b1', kind: 'box', size: [1, 1, 1], center: [0, 0, 0] }) || ''));
    check('two good sketches are not refused', types.whyCannotBlend(big, small) === null);
    check('newBlend orders them bottom-first whichever way they are handed over',
      JSON.stringify(types.newBlend({ version: 1, features: [] }, small, big).targets) === JSON.stringify(['sa', 'sb']),
      JSON.stringify(types.newBlend({ version: 1, features: [] }, small, big).targets));
  }

  // ---------------------------------------------------- the fillet handle --
  // A fillet's radius must round-trip through applyParam before any UI work
  // on the drag handle means anything: without this branch applyParam falls
  // through to `return f`, `changed` stays false, and SandboxWorkspace's
  // commitParams hits its early return -- a handle that tracks the pointer
  // and a tooltip that counts up while the geometry never moves. That exact
  // silent-success shape is what this pair of checks exists to catch.
  console.log('\n=== a fillet\'s size param round-trips through applyParam ===');
  {
    const edge = {
      cause: 'between', feature: 'r1', kind: 'edge',
      of: [
        { cause: 'primitive', feature: 'b1', kind: 'face', part: '+x' },
        { cause: 'primitive', feature: 'b1', kind: 'face', part: '+z' },
      ],
    };
    const fillet = { id: 'r1', kind: 'fillet', target: 'b1', edge, size: 3, style: 'fillet' };
    const filletDoc = doc(box('b1'), fillet);

    const params = gen.generatedParams(filletDoc);
    const sizeParam = params.find((p) => p.name === 'r1_size');
    check('generatedParams emits one size param for a fillet',
      sizeParam !== undefined, params.map((p) => p.name).join(', '));
    check('...bounded by the named box\'s own maxRound, never below the current size',
      // 0.5 from 0.5: the stops must include every whole and half number,
      // or a student typing 3 lands on 3.1 (measured 2026-09-03).
      sizeParam !== undefined && sizeParam.min === 0.5 && sizeParam.step === 0.5
        // The ceiling sits on the 0.5 grid (9.5 for a 20-tall box, not 9.99),
        // so a typed oversize value and the slider agree.
        && sizeParam.max === Math.floor(types.maxRound(box('b1')) / 0.5) * 0.5 && sizeParam.max >= fillet.size,
      sizeParam && JSON.stringify(sizeParam));

    const moved = gen.applyParam(filletDoc, 'r1_size', 7);
    const movedFillet = moved.features.find((x) => x.id === 'r1');
    check('applyParam actually writes the fillet size (not the silent no-op fallthrough)',
      moved !== filletDoc && movedFillet !== undefined && movedFillet.size === 7,
      movedFillet && JSON.stringify(movedFillet));
    check('...and leaves the box it targets untouched',
      moved.features.find((x) => x.id === 'b1').size.join() === '40,40,20');

    const chamferDoc = doc(box('b1'), { ...fillet, style: 'chamfer' });
    check('a chamfer-style fillet shares the same r1_size slot, not a style-named one',
      gen.generatedParams(chamferDoc).some((p) => p.name === 'r1_size'));
    check('...and still round-trips through applyParam',
      gen.applyParam(chamferDoc, 'r1_size', 9).features.find((x) => x.id === 'r1').size === 9);

    // A fillet whose edge cannot be traced to a box/cylinder in this doc still
    // gets a usable slider -- just bounded by its own current value rather
    // than a borrowed ceiling.
    const orphanEdge = { ...edge, of: [{ ...edge.of[0], feature: 'gone' }, { ...edge.of[1], feature: 'gone' }] };
    const orphanDoc = doc(box('b1'), { ...fillet, edge: orphanEdge, size: 5 });
    const orphanParam = gen.generatedParams(orphanDoc).find((p) => p.name === 'r1_size');
    check('an orphaned root falls back to the stored size rather than throwing',
      orphanParam !== undefined && orphanParam.max === 5, orphanParam && JSON.stringify(orphanParam));
  }

  console.log('\n=== item D: the round-shape panel speaks "across" (diameter), not radius ===');

  {
    const cylDoc = doc({ id: 'c1', kind: 'cylinder', radius: 10, height: 40, center: [0, 0, 0] });
    const p = gen.generatedParams(cylDoc).find((x) => x.name === 'c1_radius');
    check('a cylinder radius:10 shows as across:20 in the panel', p && p.value === 20, p && JSON.stringify(p));
    check('typing 20 across writes radius:10 back to the doc',
      gen.applyParam(cylDoc, 'c1_radius', 20).features[0].radius === 10);

    const coneDoc = doc({ id: 'k1', kind: 'cone', radius: 15, height: 30, center: [0, 0, 0] });
    const pk = gen.generatedParams(coneDoc).find((x) => x.name === 'k1_radius');
    check('a cone radius:15 shows as across:30', pk && pk.value === 30, pk && JSON.stringify(pk));
    check('typing 30 across writes radius:15 back',
      gen.applyParam(coneDoc, 'k1_radius', 30).features[0].radius === 15);

    const sphDoc = doc({ id: 's1', kind: 'sphere', radius: 12, center: [0, 0, 0] });
    const ps = gen.generatedParams(sphDoc).find((x) => x.name === 's1_radius');
    check('a sphere radius:12 shows as across:24', ps && ps.value === 24, ps && JSON.stringify(ps));
    check('typing 24 across writes radius:12 back',
      gen.applyParam(sphDoc, 's1_radius', 24).features[0].radius === 12);

    // Ring: 'across' is the OUTSIDE diameter of the whole donut
    // (2*(ringRadius+tubeRadius)), not twice the centreline radius -- the
    // same formula reshape-script.ts's ring() already uses.
    const ringDoc = doc({ id: 'r1', kind: 'torus', ringRadius: 18, tubeRadius: 4, center: [0, 0, 0] });
    const params = gen.generatedParams(ringDoc);
    const pr = params.find((x) => x.name === 'r1_ring');
    const pt = params.find((x) => x.name === 'r1_tube');
    check('ringRadius:18 + tubeRadius:4 shows ring across:44 (2*(18+4))', pr && pr.value === 44, pr && JSON.stringify(pr));
    check('tubeRadius:4 shows tube across:8', pt && pt.value === 8, pt && JSON.stringify(pt));

    // Editing the TUBE across must not silently change the RING across the
    // student did not touch (the same "changing one field must not re-aim
    // another" rule the circle sketch's own 'across' handling already
    // follows) -- so the ring across, read back after, is still 44.
    const afterTube = gen.applyParam(ringDoc, 'r1_tube', 10).features[0];
    check('typing tube across 10 writes tubeRadius:5', afterTube.tubeRadius === 5, JSON.stringify(afterTube));
    const ringAcrossAfter = 2 * (afterTube.ringRadius + afterTube.tubeRadius);
    check('...and holds the ring across fixed at 44 (ringRadius adjusts to compensate)',
      Math.abs(ringAcrossAfter - 44) < 1e-9, ringAcrossAfter);

    // The reverse: editing the RING across must not silently change the
    // tube across the student did not touch.
    const afterRing = gen.applyParam(ringDoc, 'r1_ring', 50).features[0];
    check('typing ring across 50 leaves tubeRadius:4 untouched', afterRing.tubeRadius === 4, JSON.stringify(afterRing));
    check('...and ringRadius becomes 21 (50/2 - 4)', afterRing.ringRadius === 21, JSON.stringify(afterRing));
  }

  console.log('\n=== item P: Four Corners spacing means "in from each side", on a non-square target ===');

  {
    // A 60x40 plate on purpose -- item P's own bug only shows on a
    // non-square target, where "distance from centre" and "distance from
    // the side" disagree by a different amount on each axis.
    const plate = { id: 'b1', kind: 'box', size: [60, 40, 10], center: [0, 0, 0] };
    const holeDoc = (dx, dy) => ({
      version: 1,
      features: [plate, { id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 10, center: [0, 0, 0], axis: 'z', corners: { dx, dy } }],
    });

    // Typing the SAME inset (10) on both axes must give the SAME margin on
    // both, even though the plate's width (60) and depth (40) differ --
    // stored dx/dy come out DIFFERENT (20 and 10) precisely because the
    // panel is now measuring from each side, not the centre.
    const same = gen.applyParam(gen.applyParam(holeDoc(0, 0), 'hole1_dx', 10), 'hole1_dy', 10);
    check('typing the same inset (10) on a 60x40 plate gives dx=20 (30-10), not dx=10',
      same.features[1].corners.dx === 20, JSON.stringify(same.features[1].corners));
    check('...and dy=10 (20-10), a DIFFERENT stored value for the SAME typed margin',
      same.features[1].corners.dy === 10, JSON.stringify(same.features[1].corners));

    // Round-trip through generatedParams: the same 10mm inset reads back
    // out as 10 on both axes, regardless of the plate's own shape.
    const params = gen.generatedParams(same);
    const dxP = params.find((p) => p.name === 'hole1_dx');
    const dyP = params.find((p) => p.name === 'hole1_dy');
    check('reading the panel back shows 10 in from each side on BOTH axes',
      dxP.value === 10 && dyP.value === 10, JSON.stringify({ dxP, dyP }));

    // The min bound bakes in the hole's own radius (diameter 6 -> radius 3,
    // plus a hair of margin) so a typed inset that would break the side is
    // refused before it ever reaches the kernel.
    check("the inset's own min accounts for the hole's radius (diameter 6 -> min 3.5)",
      dxP.min === 3.5 && dyP.min === 3.5, JSON.stringify({ dxP, dyP }));
  }

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
