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
  const vm = require('vm');
  const bundlePath = path.join(__dirname, '..', 'public', 'reshape', 'lib', 'jscad-modeling.min.js');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), sandbox);
  const M = sandbox.jscadModeling;

  // The generator emits reSHape names (box, tube, ball, extrude, turn), which are
  // globals installed by reshape.js — so the geometry checks below cannot run
  // without it. That is a real dependency, not a test convenience: the code we
  // generate genuinely does not work without reshape.js loaded, which is also
  // why it no longer runs unmodified on jscad.app.
  const simplePath = path.join(__dirname, '..', 'public', 'reshape', 'reshape.js');
  if (!fs.existsSync(simplePath)) {
    console.log('  FAIL  public/reshape/reshape.js is missing — the generated code needs it');
    return false;
  }
  vm.runInContext(fs.readFileSync(simplePath, 'utf8'), sandbox);
  for (const n of ['cuboid', 'cylinder', 'sphere', 'extrudeLinear', 'turn', 'cylinderElliptic', 'torus', 'polygon']) {
    if (typeof sandbox[n] !== 'function') {
      console.log(`  FAIL  reshape.js did not expose ${n}()`);
      return false;
    }
  }

  function build(src) {
    const mod = { exports: {} };
    // Run inside the same context reshape.js populated, so the reSHape globals the
    // generated code calls are actually in scope.
    const run = vm.runInContext(
      '(function (require, module) {' + src + String.fromCharCode(10) + '})',
      sandbox
    );
    run((n) => {
      if (n !== '@jscad/modeling') throw new Error('unexpected require: ' + n);
      return M;
    }, mod);
    const params = {};
    for (const d of mod.exports.getParameterDefinitions()) params[d.name] = d.initial;
    const g = mod.exports.main(params);
    const list = Array.isArray(g) ? g : [g];
    return {
      polys: list.reduce((n, s) => n + M.geometries.geom3.toPolygons(s).length, 0),
      volume: list.reduce((n, s) => n + M.measurements.measureVolume(s), 0),
      bbox: M.measurements.measureBoundingBox(list[0]),
    };
  }


  console.log('\n=== codegen shape ===');

  const plain = gen.toReshape(doc(box('b1')));
  check('a plain box is a reSHape box', plain.includes('cuboid(p.b1_width, p.b1_depth, p.b1_height'));
  check('...positional, never the object form box() refuses', !plain.includes('box({'));
  check('no hulls import when nothing needs it', !plain.includes('hulls'));

  const filleted = gen.toReshape(doc(box('b1', { round: 4, roundStyle: 'fillet' })));
  check('a filleted box passes roundRadius to box', filleted.includes('roundRadius: p.b1_round'));

  const chamfered = gen.toReshape(doc(box('b1', { round: 4, roundStyle: 'chamfer' })));
  check('a chamfered box uses the hull helper', chamfered.includes('function chamferBox('));
  check('...and pulls transforms in', /const \{[^}]*transforms[^}]*\} = require/.test(chamfered));
  check('...and only that helper', !chamfered.includes('function chamferCylinder('));

  const chamCyl = gen.toReshape(doc(cyl('c1', { round: 2, roundStyle: 'chamfer' })));
  check('a chamfered cylinder uses its own helper', chamCyl.includes('function chamferCylinder('));

  const filCyl = gen.toReshape(doc(cyl('c1', { round: 2, roundStyle: 'fillet' })));
  check('a filleted cylinder passes roundRadius to tube',
    filCyl.includes('cylinder(') && filCyl.includes('roundRadius: p.c1_round'));

  console.log('\n=== order is the lesson ===');

  const cut = gen.toReshape(doc(box('b1'), cyl('c1'), {
    id: 'x1', kind: 'combine', op: 'subtract', targets: ['b1', 'c1'],
  }));
  check('subtract keeps body first', cut.includes('booleans.subtract(b1, c1)'));
  check('a consumed feature is not returned', /return x1\b/.test(cut));

  const flipped = gen.toReshape(doc(box('b1'), cyl('c1'), {
    id: 'x1', kind: 'combine', op: 'subtract', targets: ['c1', 'b1'],
  }));
  check('swapping targets swaps the call', flipped.includes('booleans.subtract(c1, b1)'));

  const loose = gen.toReshape(doc(box('b1'), cyl('c1')));
  check('two loose shapes are unioned', loose.includes('booleans.union(b1, c1)'));

  const empty = gen.toReshape(doc());
  check('an empty doc still returns something', empty.includes('return cuboid(1, 1, 1)'));

  console.log('\n=== cone and ring ===');

  const cone = (id) => ({ id, kind: 'cone', radius: 12, height: 30, center: [0, 0, 0] });
  const ring = (id) => ({ id, kind: 'torus', ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] });

  const coneSrc = gen.toReshape(doc(cone('k1')));
  const ringSrc = gen.toReshape(doc(ring('r1')));
  // The 'radius'/'ring'/'tube' slots hold "across" (diameter) now -- item D
  // -- so the emitted JSCAD call halves them back to the radius JSCAD's own
  // primitives actually want; see featureExpr()'s own comment.
  check('a cone is a reSHape cone', coneSrc.includes('cylinderElliptic((p.k1_radius / 2), p.k1_height'));
  check('a ring is a reSHape ring', ringSrc.includes('torus((p.r1_ring - p.r1_tube) / 2, p.r1_tube / 2)'));
  // ring() refuses an options object because torus accepts `center` and drops
  // it silently. A positioned ring must therefore be a translate around one.
  check('a ring is positioned by translate, not by an argument',
    ringSrc.includes('transforms.translate([p.r1_x') && !ringSrc.includes('torus(p.r1_ring, p.r1_tube, {'));

  // The doc talks in ring-centre and tube thickness because that is what a
  // student can picture; JSCAD wants inner/outer. Getting that mapping backwards
  // still builds a torus, just the wrong one — so measure it.
  const coneBuilt = build(coneSrc);
  const ringBuilt = build(ringSrc);
  check('a cone builds and has volume', coneBuilt.volume > 100, String(coneBuilt.volume));
  check('a ring builds and has volume', ringBuilt.volume > 100, String(ringBuilt.volume));
  check('the ring is 36 across, not 8',
    Math.abs((ringBuilt.bbox[1][0] - ringBuilt.bbox[0][0]) - 36) < 1.5,
    `width ${(ringBuilt.bbox[1][0] - ringBuilt.bbox[0][0]).toFixed(1)}`);
  check('the ring is 8 thick',
    Math.abs((ringBuilt.bbox[1][2] - ringBuilt.bbox[0][2]) - 8) < 1.5,
    `thickness ${(ringBuilt.bbox[1][2] - ringBuilt.bbox[0][2]).toFixed(1)}`);
  check('a cone tapers to a point',
    coneBuilt.volume < Math.PI * 12 * 12 * 30 * 0.45,
    `${coneBuilt.volume.toFixed(0)} vs a full cylinder ${(Math.PI * 144 * 30).toFixed(0)}`);

  check('a ring refuses to round', types.whyCannotRound(ring('r1')) !== null);

  console.log('\n=== sketch and extrude ===');

  // An L, so a wrong winding or a dropped corner shows up in the volume rather
  // than only in a picture nobody looks at.
  const L = [[0, 0], [40, 0], [40, 10], [15, 10], [15, 25], [0, 25]];
  const sketch = (id, plane = 'xy', offset = 0) => ({
    id, kind: 'sketch', plane, offset, points: L,
  });
  const pull = (id, target, height = 12) => ({ id, kind: 'extrude', target, height });

  const flatOnly = gen.toReshape(doc(sketch('s1')));
  check('a sketch is a reSHape poly', flatOnly.includes('polygon([[p.s1_p0u'));
  check('...taking the list positionally, never an options object',
    !flatOnly.includes('poly({'));
  check('a bare sketch is not returned as the model',
    !/return s1\b/.test(flatOnly), flatOnly.slice(flatOnly.indexOf('return')).split('\n')[0]);

  const pulled = gen.toReshape(doc(sketch('s1'), pull('e1', 's1')));
  check('an extrude uses the plane helper', pulled.includes('function extrudeOnPlane('));
  check('...and pulls extrusions in', /const \{[^}]*extrusions[^}]*\} = require/.test(pulled));
  check('the sketch it consumed is not also returned', /return e1\b/.test(pulled));
  check('every corner is a parameter, not a literal',
    pulled.includes('p.s1_p0u') && pulled.includes('p.s1_p5v'));

  const pulledSolid = build(pulled);
  // 40x25 minus the 25x15 notch = 625, times 12 high.
  check('the L extrudes to the right volume',
    Math.abs(pulledSolid.volume - 625 * 12) < 40, `${pulledSolid.volume.toFixed(0)} vs 7500`);
  check('...and the right footprint',
    Math.abs(pulledSolid.bbox[1][0] - 40) < 0.5 && Math.abs(pulledSolid.bbox[1][1] - 25) < 0.5,
    JSON.stringify(pulledSolid.bbox));
  check('...standing 12 tall on xy',
    Math.abs(pulledSolid.bbox[1][2] - pulledSolid.bbox[0][2] - 12) < 0.5, JSON.stringify(pulledSolid.bbox));

  // The plane is the whole point of choosing one, so measure that it moved.
  const onXZ = build(gen.toReshape(doc(sketch('s1', 'xz'), pull('e1', 's1'))));
  check('an xz sketch stands up in z, not y',
    Math.abs(onXZ.bbox[1][2] - onXZ.bbox[0][2] - 25) < 0.5
    && Math.abs(onXZ.bbox[1][1] - onXZ.bbox[0][1] - 12) < 0.5,
    JSON.stringify(onXZ.bbox));
  const onYZ = build(gen.toReshape(doc(sketch('s1', 'yz'), pull('e1', 's1'))));
  check('a yz sketch is thin in x',
    Math.abs(onYZ.bbox[1][0] - onYZ.bbox[0][0] - 12) < 0.5, JSON.stringify(onYZ.bbox));

  const raised = build(gen.toReshape(doc(sketch('s1', 'xy', 30), pull('e1', 's1'))));
  check('offset lifts the sketch off the origin',
    Math.abs(raised.bbox[0][2] - 30) < 0.5, JSON.stringify(raised.bbox));

  // An extruded sketch is a solid like any other, so it must cut and be cut.
  const cutBySketch = build(gen.toReshape(doc(
    box('b1'), sketch('s1'), pull('e1', 's1'),
    { id: 'x1', kind: 'combine', op: 'subtract', targets: ['b1', 'e1'] },
  )));
  check('an extruded sketch composes with the booleans',
    cutBySketch.volume > 0 && cutBySketch.volume < 40 * 40 * 20,
    `${cutBySketch.volume.toFixed(0)}`);

  console.log('\n=== turning a shape ===');

  const flat = gen.toReshape(doc(box('b1')));
  const turnedSrc = gen.toReshape(doc(box('b1', { rotate: [0, 0, 45] })));
  check('an unrotated shape carries no turn call', !flat.includes('turn('));
  check('a turned shape is turned', turnedSrc.includes('turn([p.b1_rx, p.b1_ry, p.b1_rz]'));
  // reSHape's turn takes degrees. The conversion this used to emit is gone, and
  // its absence is worth asserting: a stray Math.PI/180 would silently divide
  // every angle by 57 and still produce a plausible-looking model.
  check('...in degrees, with no conversion left behind',
    !turnedSrc.includes('Math.PI / 180'));
  // The build-at-origin scaffolding is gone because turn() does that work
  // itself. It was never wrong -- only redundant once turn arrived. The shape
  // is now built where it belongs and turned in place.
  check('...built where it belongs, not at the origin and moved',
    !turnedSrc.includes('center: [0, 0, 0]') && turnedSrc.includes('center: [p.b1_x'));
  check('an unrotated shape declares no angles',
    !gen.generatedParams(doc(box('b1'))).some((p) => p.name.endsWith('_rz')));
  check('a turned one does',
    gen.generatedParams(doc(box('b1', { rotate: [0, 0, 45] }))).some((p) => p.name === 'b1_rz'));

  const offCentre = build(gen.toReshape(doc(box('b1', {
    center: [50, 0, 0], rotate: [0, 0, 90],
  }))));
  // A 40x40x20 box turned 90 degrees about its own centre is still centred on
  // x=50. If it swung about the world origin it would land near x=0 instead.
  const mid = (offCentre.bbox[0][0] + offCentre.bbox[1][0]) / 2;
  check('a turned shape spins about itself, not the scene',
    Math.abs(mid - 50) < 1.5, `centre x = ${mid.toFixed(1)}`);
  check('turning 90 degrees swaps width and depth',
    Math.abs((offCentre.bbox[1][1] - offCentre.bbox[0][1]) - 40) < 1.5,
    `depth ${(offCentre.bbox[1][1] - offCentre.bbox[0][1]).toFixed(1)}`);

  const turnedRing = build(gen.toReshape(doc(ring('r1'))));
  check('a ring still builds with the rotation path in place', turnedRing.volume > 100);

  console.log('\n=== one dialect, everywhere ===');

  // The property, not the spellings. These keep holding if a name moves; a
  // check that greps for `box(` would go red on a rename and teach nothing.
  const everything = gen.toReshape(doc(
    box('b1'), cyl('c1'), cone('k1'), ring('r1'),
    { id: 'sp1', kind: 'sphere', radius: 9, center: [0, 0, 0] },
    sketch('s1'), pull('e1', 's1')));
  const mainBody = everything.slice(everything.indexOf('function main'));
  check('no raw primitives survive in main()',
    !mainBody.includes('primitives.'),
    (mainBody.match(/primitives\.[a-zA-Z]+/g) || []).join(','));

  // The WHOLE file, not just main(). Helper bodies are generated code sitting
  // in a student's own file, so a second spelling there is the same second
  // dialect — and a main()-only check cannot see it. Coverage of a property is
  // not coverage of every place the property has to hold.
  const withHelpers = gen.toReshape(doc(
    box('b2', { round: 4, roundStyle: 'chamfer' }),
    cyl('c2', { round: 2, roundStyle: 'chamfer' }),
    sketch('s2'), pull('e2', 's2')));
  check('no raw primitives anywhere, helper bodies included',
    !withHelpers.includes('primitives.'),
    (withHelpers.match(/primitives\.[a-zA-Z]+/g) || []).join(','));

  check('not even the empty-doc placeholder is raw',
    !gen.toReshape(doc()).includes('primitives.'));

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

  const code = gen.toReshape(d);
  const declared = [...code.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
  check('every declared param is used in main()',
    declared.every((n) => code.includes('p.' + n)),
    declared.filter((n) => !code.includes('p.' + n)).join(','));
  check('every p.<name> in main() is declared',
    [...code.matchAll(/p\.([A-Za-z0-9_]+)/g)].map((m) => m[1]).every((n) => declared.includes(n)));
  check('paramValues matches the declared set',
    Object.keys(gen.paramValues(d)).sort().join() === declared.slice().sort().join());
  check('no dimension is a literal in main()',
    !/size: \[\d/.test(code.slice(code.indexOf('function main'))));

  console.log('\n=== the generated file is real JavaScript ===');

  for (const [label, src] of [
    ['plain', plain], ['filleted', filleted], ['chamfered box', chamfered],
    ['chamfered cylinder', chamCyl], ['cut', cut], ['loose pair', loose], ['empty', empty],
  ]) {
    let ok = true, why = '';
    try { new Function('require', 'module', src); } catch (e) { ok = false; why = e.message; }
    check(`${label} parses`, ok, why);
  }

  console.log('\n=== the generated file actually builds a solid ===');

  // Parsing proves nothing about whether JSCAD accepts the calls. Run the real
  // vendored bundle and count polygons -- that is what catches a hull helper
  // that is syntactically perfect and geometrically empty.

  const built = {};
  for (const [label, src] of [
    ['plain', plain], ['filleted', filleted], ['chamferedBox', chamfered],
    ['chamferedCyl', chamCyl], ['filletedCyl', filCyl], ['cut', cut],
    ['loose', loose], ['empty', empty], ['plainCyl', gen.toReshape(doc(cyl('c1')))],
  ]) {
    let r = null, why = '';
    try { r = build(src); } catch (e) { why = e.message; }
    built[label] = r;
    check(`${label} builds a solid`, r !== null && r.polys > 0 && r.volume > 0,
      why || (r ? `${r.polys} polys, volume ${r.volume}` : 'no result'));
  }

  // Volume is the assertion that matters. The first chamferBox here was the
  // hull of three inset boxes: it parsed, it built, it had a plausible polygon
  // count, and it removed 0.27% of the volume because it only cut the eight
  // corners. Nothing but measuring caught it.
  const B = built;
  if (B.plain && B.chamferedBox && B.filleted) {
    const cut12 = 1 - B.chamferedBox.volume / B.plain.volume;
    check('a 4mm chamfer on a 40x40x20 box removes ~9% of it',
      cut12 > 0.05 && cut12 < 0.15, `removed ${(cut12 * 100).toFixed(2)}%`);
    check('a fillet removes material too',
      B.filleted.volume < B.plain.volume && B.filleted.volume > B.plain.volume * 0.85,
      `${B.filleted.volume.toFixed(0)} vs ${B.plain.volume.toFixed(0)}`);
    check('rounding does not shrink the overall size',
      JSON.stringify(B.chamferedBox.bbox.map((v) => v.map(Math.round)))
        === JSON.stringify(B.plain.bbox.map((v) => v.map(Math.round))),
      JSON.stringify(B.chamferedBox.bbox));
  }
  if (B.plainCyl && B.chamferedCyl && B.filletedCyl) {
    check('a chamfer removes material from a cylinder',
      B.chamferedCyl.volume < B.plainCyl.volume * 0.999, `${B.chamferedCyl.volume.toFixed(0)} vs ${B.plainCyl.volume.toFixed(0)}`);
    check('a filleted cylinder is smaller than a sharp one',
      B.filletedCyl.volume < B.plainCyl.volume);
  }
  if (B.plain && B.cut) {
    check('subtracting a cylinder removes material',
      B.cut.volume < B.plain.volume, `${B.cut.volume.toFixed(0)} vs ${B.plain.volume.toFixed(0)}`);
  }

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

  const revSrc = gen.toReshape(doc(revProfile('s1'), revolveF('rev1', 's1')));
  // The real call is still there and still takes radians -- it moved into the
  // revolveOnPlane helper, exactly as extrudeLinear lives inside
  // extrudeOnPlane. That indirection is what lets Spin honour the sketch
  // plane: before it, revolve emitted extrudeRotate on the raw profile and
  // swept around world Z whatever plane the sketch sat on, so all three
  // planes produced the same solid and the Sits-on control did nothing.
  //
  // What matters pedagogically is unchanged and is what these check: the
  // student can still see the genuine JSCAD call, and the angle is still
  // converted at the point where a dial feeds it.
  check('the real extrudeRotate is still in the generated source',
    revSrc.includes('extrusions.extrudeRotate({ angle: angle }, profile)'),
    'the helper body should still contain the genuine JSCAD call');
  check('...and the angle still arrives in radians from the dial',
    revSrc.includes('p.rev1_angle * Math.PI / 180'));
  check('...through the plane-aware helper, so Spin honours Sits-on',
    revSrc.includes("revolveOnPlane(s1, p.rev1_angle * Math.PI / 180, 'xy'"),
    revSrc.split(/\r?\n/).filter((l) => l.includes('revolveOnPlane(')).slice(0, 1).join(''));
  check('...and pulls extrusions in', /const \{[^}]*extrusions[^}]*\} = require/.test(revSrc));
  check('the sketch it consumed is not also returned', !/return s1\b/.test(revSrc));
  check('the revolve is what gets returned', /return rev1\b/.test(revSrc));

  const rev360 = build(gen.toReshape(doc(revProfile('s1'), revolveF('rev1', 's1', 360))));
  const rev180 = build(gen.toReshape(doc(revProfile('s1'), revolveF('rev1', 's1', 180))));
  check('a full spin has real volume', rev360.volume > 20000, String(rev360.volume));
  check('a half spin is about half the volume of a full one',
    Math.abs(rev180.volume - rev360.volume / 2) < rev360.volume * 0.05,
    `${rev180.volume.toFixed(0)} vs half of ${rev360.volume.toFixed(0)}`);

  console.log('\n=== mirror (Mirror) ===');

  const mirrorDoc = doc(box('b1', { center: [50, 0, 0] }), { id: 'm1', kind: 'mirror', target: 'b1', plane: 'yz' });
  const mirrorSrc = gen.toReshape(mirrorDoc);
  check('a mirror calls the face-relative helper, not bare transforms.mirror',
    mirrorSrc.includes('mirrorThroughFace(b1, [1, 0, 0], 0)'));
  check('...and the helper is actually defined',
    mirrorSrc.includes('function mirrorThroughFace('));
  check('mirror keeps the original standing: both b1 and m1 come back top-level',
    types.topLevel(mirrorDoc).map((f) => f.id).sort().join() === 'b1,m1');
  check('...so the model unions them both',
    /return booleans\.union\(b1, m1\)/.test(mirrorSrc));

  const mirrorBuilt = build(mirrorSrc);
  // b1 spans x 30..70. The nearer-to-zero face is x=30, so the mirrored copy
  // reflects off THAT face and lands at -10..30 -- touching b1, not
  // reflected clean through the origin to -70..-30 (that stale expectation
  // is exactly the pre-fix defect: see the "moved part" block below for the
  // failing-value proof).
  check('the mirrored copy reflects off the part\'s own near face',
    mirrorBuilt.bbox[0][0] > -12 && mirrorBuilt.bbox[0][0] < -8
    && mirrorBuilt.bbox[1][0] > 68 && mirrorBuilt.bbox[1][0] < 72,
    JSON.stringify(mirrorBuilt.bbox));
  check('...forming one snug 80-wide double, not two pieces with a gap between them',
    Math.abs((mirrorBuilt.bbox[1][0] - mirrorBuilt.bbox[0][0]) - 80) < 2,
    JSON.stringify(mirrorBuilt.bbox));

  // The UI used to call newMirror with no plane, which meant the default
  // baked into the function ('xz') was the ONLY plane a student could ever
  // get -- picking a different one in a picker that did not exist was never
  // possible. That defect lived at the call site, but the way it stays fixed
  // is by proving every plane on the *doc* still produces genuinely
  // different, correct geometry -- a regression that quietly special-cases
  // or hardcodes one plane in featureExpr would fail right here even though
  // the UI is untouched. A value that would make a broken implementation
  // pass: featureExpr ignoring f.plane and always emitting the yz normal
  // ([1, 0, 0]) -- the 'yz' case above would still pass, but 'xy' and 'xz'
  // below would not, because b2/b3 would reflect on the wrong axis.
  const mirrorOnXY = doc(box('b2', { center: [0, 0, 50] }), { id: 'm2', kind: 'mirror', target: 'b2', plane: 'xy' });
  const xySrc = gen.toReshape(mirrorOnXY);
  check('a mirror across xy uses the real xy normal, axis index 2',
    xySrc.includes('mirrorThroughFace(b2, [0, 0, 1], 2)'));
  const xyBuilt = build(xySrc);
  // b2 spans z 40..60; the near face is z=40, so the copy lands at 20..40.
  check('...and actually flips z, not x or y',
    xyBuilt.bbox[0][2] > 18 && xyBuilt.bbox[0][2] < 22
    && xyBuilt.bbox[1][2] > 58 && xyBuilt.bbox[1][2] < 62
    && xyBuilt.bbox[0][0] < -18 && xyBuilt.bbox[1][0] > 18, // untouched box half-width still ~20
    JSON.stringify(xyBuilt.bbox));

  const mirrorOnXZ = doc(box('b3', { center: [0, 50, 0] }), { id: 'm3', kind: 'mirror', target: 'b3', plane: 'xz' });
  const xzSrc = gen.toReshape(mirrorOnXZ);
  check('a mirror across xz uses the real xz normal, axis index 1',
    xzSrc.includes('mirrorThroughFace(b3, [0, 1, 0], 1)'));
  const xzBuilt = build(xzSrc);
  // b3 spans y 30..70; the near face is y=30, so the copy lands at -10..30.
  check('...and actually flips y, not x or z',
    xzBuilt.bbox[0][1] > -12 && xzBuilt.bbox[0][1] < -8
    && xzBuilt.bbox[1][1] > 68 && xzBuilt.bbox[1][1] < 72,
    JSON.stringify(xzBuilt.bbox));

  check('the three planes are not secretly the same call',
    new Set([mirrorSrc, xySrc, xzSrc]
      .map((s) => s.match(/mirrorThroughFace\([a-zA-Z0-9_]+, (\[[^\]]+\])/)[1])).size === 3);

  console.log('\n=== mirror follows a part the Move tool relocated ===');

  // The exact defect this closes, verified live: an L-bracket sketched at
  // the origin mirrors fine, because the sketch's own corner already sits
  // at zero -- "happens to work" was always an accident of where the
  // student started drawing. The moment the toolbar's OWN Move tool
  // relocates that same part and it gets mirrored, the pre-fix code still
  // reflected through world x=0 -- the plane where the part USED TO BE, not
  // where Move put it -- so the "mirrored" copy came out nowhere near the
  // moved part, floating in space with no warning that anything was wrong.
  //
  // A value that would make a broken implementation pass here: featureExpr
  // still emitting the bare pre-fix call, `transforms.mirror({ normal }, target)`,
  // with no origin at all. That still runs and still builds a solid -- mirror
  // never throws just because the part has moved -- so this has to measure
  // the geometry, not just check that codegen produced *something*. Against
  // that old call the build below reflects the ALREADY-MOVED solid (x
  // 200..240) straight through world zero to x -240..-200: a ~480-wide
  // spread starting near -240, with a ~400-unit gap of empty space in the
  // middle. The assertions below reject exactly that shape of result.
  const movedL = doc(
    sketch('s1'), pull('e1', 's1'),
    { id: 'move1', kind: 'move', target: 'e1', offset: [200, 0, 0], copy: false },
    { id: 'm1', kind: 'mirror', target: 'move1', plane: 'yz' },
  );
  const movedSrc = gen.toReshape(movedL);
  check('mirror reads the MOVED part\'s own position, not e1\'s original one',
    movedSrc.includes('mirrorThroughFace(move1, [1, 0, 0], 0)'));

  const movedBuilt = build(movedSrc);
  // e1 spans x 0..40; after Move by +200 it spans x 200..240. The near face
  // is x=200, so the mirrored copy should land at 160..200, touching it.
  check('the mirrored copy lands next to the MOVED part, not back near the origin',
    movedBuilt.bbox[0][0] > 150,
    `bbox starts at ${movedBuilt.bbox[0][0].toFixed(1)} -- the old bug would put this near -240`);
  check('...forming one snug ~80-wide double, not a ~480-wide pair with a gap between',
    Math.abs((movedBuilt.bbox[1][0] - movedBuilt.bbox[0][0]) - 80) < 4,
    `span ${(movedBuilt.bbox[1][0] - movedBuilt.bbox[0][0]).toFixed(1)} -- the old bug would span ~480`);

  console.log('\n=== pattern (Repeat) is a real for loop ===');

  const linPattern = { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'linear', count: 3, step: [30, 0, 0] };
  const linDoc = doc(box('b1', { size: [10, 10, 10] }), linPattern);
  const linSrc = gen.toReshape(linDoc);
  check('a linear pattern emits an actual for loop, not a helper call',
    linSrc.includes('for (let i = 0; i < p.pat1_count; i++) {'));
  check('...translating by the step vector on each pass',
    linSrc.includes('pat1_parts.push(transforms.translate([x, y, z], b1))'));
  check('...then unions the copies together',
    linSrc.includes('const pat1 = booleans.union(pat1_parts)'));
  check('the pattern consumes its source: only the pattern comes back',
    types.topLevel(linDoc).map((f) => f.id).join() === 'pat1');

  const linBuilt = build(linSrc);
  // 10-wide boxes at x = 0, 30, 60 -> outer span -5 to 65.
  check('3 copies 30 apart span 70 across',
    Math.abs((linBuilt.bbox[1][0] - linBuilt.bbox[0][0]) - 70) < 1.5, JSON.stringify(linBuilt.bbox));

  const circPattern = { id: 'pat2', kind: 'pattern', target: 'c1', mode: 'circular', count: 4, axis: 'z', totalAngle: 360 };
  const circDoc = doc(cyl('c1', { radius: 3, height: 10, center: [20, 0, 0] }), circPattern);
  const circSrc = gen.toReshape(circDoc);
  check('a circular pattern is a for loop too',
    circSrc.includes('for (let i = 0; i < p.pat2_count; i++) {'));
  check('...spacing by totalAngle / count so 360 does not double up the seam',
    circSrc.includes('p.pat2_totalangle / p.pat2_count * i * Math.PI / 180'));
  check('...rotating around the chosen world axis, with no per-target pivot',
    circSrc.includes('transforms.rotate([0, 0, a], c1)')
    && !circSrc.includes('centerOf(c1)'));

  const circBuilt = build(circSrc);
  const singleCyl = Math.PI * 3 * 3 * 10;
  // c1 sits off-axis at [20, 0, 0], so 4 copies rotated about world Z land at
  // four separate points on a circle of radius 20 and do not overlap: ~4x.
  //
  // Round 5 inverted this assertion to ~1x and left a comment claiming the
  // ORIGINAL had encoded a bug. It had not -- the original was right, and the
  // rewrite locked in a real regression (a shape spun about its own centre is
  // a no-op for anything rotationally symmetric). Left as a marker: a test
  // rewritten to match new behaviour has stopped being a test.
  check('4 copies of an off-axis shape orbit the world axis -- ~4x, not ~1x',
    circBuilt.volume > singleCyl * 3.6 && circBuilt.volume < singleCyl * 4.4,
    `${circBuilt.volume.toFixed(0)} vs one instance ${singleCyl.toFixed(0)} `
      + `(the in-place-spin regression collapses to ~${singleCyl.toFixed(0)})`);

  console.log('\n=== Repeat Around orbits the world axis, and refuses when there is nothing to orbit ===');

  // This section previously asserted the OPPOSITE, and locked a regression in.
  //
  // A round-4 critic reported that a cylinder at (50, 50) "scatters six copies
  // into a huge ring instead of spinning where it stands", round 5 duly made
  // the pattern pivot on centerOf(target), and this assertion was written to
  // require ~1x. But scattering into a ring is what a circular pattern IS --
  // it is how you draw a bolt circle -- and spinning a cylinder about its own
  // axis produces six copies in one place whose union is one cylinder. The
  // test could not fail, because it had been written from the bug.
  //
  // The value that would make a broken implementation pass: any volume near
  // one instance. That is precisely what the in-place-spin code returns, and
  // it is what this now rejects.
  const scatterDoc = doc(cyl('c1', { radius: 5, height: 10, center: [50, 50, 0] }), {
    id: 'pat3', kind: 'pattern', target: 'c1', mode: 'circular', count: 6, axis: 'z', totalAngle: 360,
  });
  const scatterBuilt = build(gen.toReshape(scatterDoc));
  const oneOffAxisCyl = Math.PI * 5 * 5 * 10;
  check('six copies of an off-axis cylinder orbit world zero -- ~6x one instance, not ~1x',
    scatterBuilt.volume > oneOffAxisCyl * 5.4 && scatterBuilt.volume < oneOffAxisCyl * 6.6,
    `${scatterBuilt.volume.toFixed(0)} vs one instance ${oneOffAxisCyl.toFixed(0)} `
      + `(in-place-spin regression returns ~${oneOffAxisCyl.toFixed(0)})`);
  check('...and the emitted call rotates about the axis, with no per-target pivot',
    gen.toReshape(scatterDoc).includes('transforms.rotate([0, 0, a], c1)'));

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
  const holeSrc = gen.toReshape(holeDoc);
  check('a hole is a single subtract line, the cylinder built inline',
    holeSrc.includes(
      'booleans.subtract(b1, transforms.translate(centerOn(b1, [p.hole1_x, p.hole1_y, p.hole1_z]), ' +
      'cylinder(p.hole1_diameter / 2, p.hole1_depth)))'
    ));
  check('...no separate cylinder feature row exists to be returned',
    types.topLevel(holeDoc).map((f) => f.id).join() === 'hole1');

  const holeBuilt = build(holeSrc);
  check('a hole removes material without hollowing the whole block',
    holeBuilt.volume < 40 * 40 * 20 && holeBuilt.volume > 40 * 40 * 20 - Math.PI * 5 * 5 * 20 * 1.3,
    `${holeBuilt.volume.toFixed(0)} vs solid ${40 * 40 * 20}`);

  console.log('\n=== hole position is real, not stuck at the origin ===');

  // newHole() used to be the only way in, and it hardcodes center: [0, 0, 0]
  // with nothing in the UI able to change it -- so this proves the position a
  // *doc* carries is actually honoured by codegen end to end, independent of
  // which tool put it there. A value that would make a broken implementation
  // pass: featureExpr reading a literal [0, 0, 0] instead of f.center, same
  // bug restated one level down -- the off-centre case below would then remove
  // the same (larger) volume as the centred one instead of less, and fail.
  const centredHole = build(gen.toReshape(doc(box('b1', { size: [40, 40, 20] }), {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 10, depth: 30, center: [0, 0, 0], axis: 'z',
  })));
  // Box spans x -20..20. A radius-5 bore centred at x=19 pokes a third of its
  // circle past the x=20 edge, so noticeably less of it stays inside the
  // block than the centred case above, where the whole circle is inside.
  const offCentreHole = build(gen.toReshape(doc(box('b1', { size: [40, 40, 20] }), {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 10, depth: 30, center: [19, 0, 0], axis: 'z',
  })));
  check('moving a hole off-centre removes less material, not the same amount',
    offCentreHole.volume > centredHole.volume + 300 && offCentreHole.volume < 40 * 40 * 20,
    `off-centre ${offCentreHole.volume.toFixed(0)} vs centred ${centredHole.volume.toFixed(0)}`);

  console.log('\n=== hole bores at the TARGET\'s position, not world zero ===');

  // FINDING 1 from the round-5 gauntlet, reproduced live: drill a hole in a
  // box that has been moved to x=100 and the pre-fix bore -- built at a
  // literal [0, 0, 0] with no idea where the target actually is -- misses
  // the block entirely. A value that would make a broken implementation
  // pass: transforms.translate([p.hole1_x, p.hole1_y, p.hole1_z], ...) used
  // as an ABSOLUTE world position instead of routing through centerOn(b1,
  // ...). With the box moved to x=100 and the hole left at its default
  // (offset [0, 0, 0]), that puts the bore at world zero -- nowhere near
  // the block -- and booleans.subtract removes NOTHING: volume stays
  // exactly 32000, unchanged from the solid block.
  const movedBoxHoleDoc = doc(box('b1', { size: [40, 40, 20], center: [100, 0, 0] }), {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 10, depth: 30, center: [0, 0, 0], axis: 'z',
  });
  const movedBoxHoleBuilt = build(gen.toReshape(movedBoxHoleDoc));
  const movedBlockVolume = 40 * 40 * 20;
  check('a hole left at its default offset still bores through a box moved off the origin',
    movedBoxHoleBuilt.volume < movedBlockVolume - 300
    && movedBoxHoleBuilt.volume > movedBlockVolume - Math.PI * 5 * 5 * 20 * 1.3,
    `${movedBoxHoleBuilt.volume.toFixed(0)} vs untouched-block (broken pre-fix) ${movedBlockVolume}`);

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
  const cornersSrc = gen.toReshape(cornersDoc);

  check('four corners is still ONE subtract, not four Hole rows',
    types.topLevel(cornersDoc).map((f) => f.id).join() === 'hole1');
  check('...one subtract call, the four corners handed to the shared cornerBores helper',
    cornersSrc.includes(
      'booleans.subtract(b1, cornerBores(b1, [p.hole1_x, p.hole1_y, p.hole1_z], p.hole1_dx, p.hole1_dy, '
    ));
  check('...and the helper itself places all four corners, on top of the target\'s own centre',
    cornersSrc.includes('function cornerBores(')
    && cornersSrc.includes('transforms.translate([c[0] - dx, c[1] - dy, c[2]], bit)')
    && cornersSrc.includes('transforms.translate([c[0] + dx, c[1] - dy, c[2]], bit)')
    && cornersSrc.includes('transforms.translate([c[0] - dx, c[1] + dy, c[2]], bit)')
    && cornersSrc.includes('transforms.translate([c[0] + dx, c[1] + dy, c[2]], bit)'));
  check('...not booleans.union anywhere -- this is not Repeat duplicating the plate',
    !cornersSrc.includes('booleans.union'));
  check('dx and dy each feed the shared helper exactly once -- it fans them out to all four corners itself',
    (cornersSrc.match(/p\.hole1_dx/g) || []).length === 1
    && (cornersSrc.match(/p\.hole1_dy/g) || []).length === 1);

  const cornersBuilt = build(cornersSrc);
  const plateVolume = 60 * 40 * 10;
  const oneBore = Math.PI * 3 * 3 * 10; // radius 3, clipped to the 10-thick plate
  check('four non-overlapping corner bores remove ~4x one bore, not ~1x and not ~4x the plate',
    cornersBuilt.volume > plateVolume - oneBore * 4 * 1.3
    && cornersBuilt.volume < plateVolume - oneBore * 4 * 0.7,
    `${cornersBuilt.volume.toFixed(0)} vs plate ${plateVolume} minus ~${(oneBore * 4).toFixed(0)}`);
  // The failure mode Repeat has on a Hole target: duplicating the whole plate
  // instead of just the cut would leave FAR more than the plate's own volume
  // once the copies are unioned back together.
  check('...and nowhere near what duplicating the whole plate four times would leave',
    cornersBuilt.volume < plateVolume * 1.5, `${cornersBuilt.volume.toFixed(0)}`);

  check('a plain Hole still declares no corner spacing at all',
    !gen.generatedParams(holeDoc).some((p) => p.name.endsWith('_dx') || p.name.endsWith('_dy')));
  check('a four-corners Hole declares both spacings, captioned across/up',
    gen.generatedParams(cornersDoc).some((p) => p.name === 'hole1_dx' && p.caption === 'Hole 1 corner spacing across')
    && gen.generatedParams(cornersDoc).some((p) => p.name === 'hole1_dy' && p.caption === 'Hole 1 corner spacing up'));

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

  const widerCorners = gen.applyParam(gen.applyParam(cornersDoc, 'hole1_dx', 25), 'hole1_dy', 18);
  check('applyParam widens the corner spacing without touching diameter, depth or centre',
    widerCorners.features[1].corners.dx === 25
    && widerCorners.features[1].corners.dy === 18
    && widerCorners.features[1].diameter === 6
    && widerCorners.features[1].center.join() === '0,0,0');

  const holeXSrc = gen.toReshape(doc(box('b1'), {
    id: 'hole2', kind: 'hole', target: 'b1', diameter: 10, depth: 60, center: [0, 0, 0], axis: 'x',
  }));
  check('boring along x tilts the bit with rotateY, not the default Z bore',
    holeXSrc.includes('transforms.rotateY(Math.PI / 2, cylinder('));

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
  const repeatHoleSrc = gen.toReshape(repeatHoleDoc);

  check('the block stays ONE subtract from b1, not a union of shifted copies',
    repeatHoleSrc.includes('booleans.subtract(b1, pat1_bores)') && !repeatHoleSrc.includes('booleans.union'),
    repeatHoleSrc.slice(repeatHoleSrc.indexOf('function main')));
  check('the pattern still consumes the hole: only the repeat comes back top-level',
    types.topLevel(repeatHoleDoc).map((f) => f.id).join() === 'pat1');

  const repeatHoleBuilt = build(repeatHoleSrc);
  const blockVolume = 40 * 40 * 20;
  const oneBoreVol = Math.PI * 3 * 3 * 20; // radius 3, bored clean through the 20-thick block
  check('three non-overlapping bores remove ~3x one bore from ONE block',
    repeatHoleBuilt.volume > blockVolume - oneBoreVol * 3 * 1.6
    && repeatHoleBuilt.volume < blockVolume - oneBoreVol * 3 * 0.5,
    `${repeatHoleBuilt.volume.toFixed(0)} vs block ${blockVolume} minus ~${(oneBoreVol * 3).toFixed(0)}`);
  check('...nowhere near the solid tripled-block bar the old bug produced (~44800, no holes surviving)',
    repeatHoleBuilt.volume < blockVolume * 1.15,
    `${repeatHoleBuilt.volume.toFixed(0)} vs a broken ~44800`);

  console.log('\n=== Repeat on a Four Corners hole repeats every bore ===');

  // The same fix has to hold when the hole being repeated is itself a
  // Four Corners hole -- four bores per pattern instance, not one.
  const repeatCornersDoc = doc(box('b1', { size: [80, 40, 10] }), {
    id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 20,
    center: [-15, 0, 0], axis: 'z', corners: { dx: 10, dy: 12 },
  }, {
    id: 'pat1', kind: 'pattern', target: 'hole1', mode: 'linear', count: 2, step: [30, 0, 0],
  });
  const repeatCornersSrc = gen.toReshape(repeatCornersDoc);
  check('the pattern loop places all four corners itself, once per pass',
    (repeatCornersSrc.match(/pat1_bores\.push\(transforms\.translate/g) || []).length === 4);
  check('dx and dy each drive that loop -- once per corner, four times total',
    (repeatCornersSrc.match(/p\.hole1_dx/g) || []).length === 5 // 1 for hole1's own cut + 4 in the loop
    && (repeatCornersSrc.match(/p\.hole1_dy/g) || []).length === 5);

  const repeatCornersBuilt = build(repeatCornersSrc);
  const cornersPlateVolume = 80 * 40 * 10;
  const oneCornerBoreVol = Math.PI * 3 * 3 * 10; // radius 3, clipped to the 10-thick plate
  check('two pattern instances of a four-corners hole remove all 8 bores from ONE plate',
    repeatCornersBuilt.volume > cornersPlateVolume - oneCornerBoreVol * 8 * 1.4
    && repeatCornersBuilt.volume < cornersPlateVolume - oneCornerBoreVol * 8 * 0.6,
    `${repeatCornersBuilt.volume.toFixed(0)} vs plate ${cornersPlateVolume} minus ~${(oneCornerBoreVol * 8).toFixed(0)}`);

  console.log('\n=== shell (Hollow) ===');

  const shellDoc = doc(box('b1', { size: [40, 40, 20] }), { id: 'shell1', kind: 'shell', target: 'b1', thickness: 4 });
  const shellSrc = gen.toReshape(shellDoc);
  check('a shell uses the honest scaled-subtract helper', shellSrc.includes('function shellOp('));
  check('...which pulls measurements in for the bounding box',
    /const \{[^}]*measurements[^}]*\} = require/.test(shellSrc));
  check('the shell consumes its target, only the hollow shape returns',
    types.topLevel(shellDoc).map((f) => f.id).join() === 'shell1');

  const shellBuilt = build(shellSrc);
  check('a shell is genuinely hollow: less than the solid, more than nothing',
    shellBuilt.volume > 0 && shellBuilt.volume < 40 * 40 * 20 * 0.85,
    `${shellBuilt.volume.toFixed(0)} vs solid ${40 * 40 * 20}`);
  check('no shell.open field means no "not representable" comment either',
    !shellSrc.includes('open face not representable'));

  console.log('\n=== shell open face (Hollow, leaving one face open) ===');

  check('newShell with no open argument carries no open field',
    types.newShell(doc(box('b1')), 'b1').open === undefined);
  const openZName = { cause: 'primitive', feature: 'b1', kind: 'face', part: '+z' };
  check('newShell(doc, target, open) stores the face name',
    types.newShell(doc(box('b1')), 'b1', openZName).open === openZName);

  const shellOpenDoc = doc(
    box('b1', { size: [40, 40, 20] }),
    { id: 'shell1', kind: 'shell', target: 'b1', thickness: 4, open: openZName },
  );
  const shellOpenSrc = gen.toReshape(shellOpenDoc);
  check('an open primitive-face shell emits the slab-subtraction helper',
    shellOpenSrc.includes('function shellOpenOp('));
  check('...built ON TOP of the same closed-shell helper, not instead of it',
    shellOpenSrc.includes('function shellOp('));
  check('...and calls it with the axis and sign read off the face name',
    shellOpenSrc.includes("shellOpenOp(b1, p.shell1_thickness, 'z', 1)"));
  check('the closed shell from the SAME doc (no open field) never mentions shellOpenOp',
    !shellSrc.includes('shellOpenOp'));

  const shellOpenBuilt = build(shellOpenSrc);
  check('an open hollow is a real, positive volume',
    shellOpenBuilt.volume > 0);
  check('an open hollow removes MORE material than the closed one -- the same wall, minus one whole cap',
    shellOpenBuilt.volume < shellBuilt.volume,
    `open ${shellOpenBuilt.volume.toFixed(0)} vs closed ${shellBuilt.volume.toFixed(0)}`);

  // A cylinder's curved side has no flat slab a bounding-box cut can remove
  // -- the one primitive face JSCAD genuinely cannot represent as "open".
  const sideName = { cause: 'primitive', feature: 'c1', kind: 'face', part: 'side' };
  const shellSideDoc = doc(
    cyl('c1', { radius: 10, height: 40 }),
    { id: 'shell2', kind: 'shell', target: 'c1', thickness: 2, open: sideName },
  );
  const shellSideSrc = gen.toReshape(shellSideDoc);
  check("a cylinder's curved side is not representable -- no shellOpenOp call",
    !shellSideSrc.includes('shellOpenOp('));
  check('...the closed shell is emitted instead', shellSideSrc.includes('function shellOp('));
  check('...with a comment saying it is a deliberate, documented gap',
    shellSideSrc.includes('// open face not representable in JSCAD'));

  console.log('\n=== move (Move) ===');

  const moveCopyDoc = doc(box('b1'), { id: 'move1', kind: 'move', target: 'b1', offset: [50, 0, 0], copy: true });
  const moveCopySrc = gen.toReshape(moveCopyDoc);
  check('a move translates the target with the real transforms.translate',
    moveCopySrc.includes('transforms.translate([p.move1_x, p.move1_y, p.move1_z], b1)'));
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
  const circleDoc = doc(circleSketch, pull('e2', 'sk2'));
  const circleSrc = gen.toReshape(circleDoc);
  check('#7 a tagged circle emits discAcross, not poly',
    circleSrc.includes('discAcross([p.sk2_x - p.sk2_across / 2, p.sk2_y], [p.sk2_x + p.sk2_across / 2, p.sk2_y])')
    && !/\bpoly\(\[\[?p\.sk2/.test(circleSrc));
  check('...and the helper is defined', circleSrc.includes('function discAcross('));
  // Built through the extrude, not the bare sketch -- a bare sketch is never
  // top-level (see topLevel()'s doc comment), so measuring it directly would
  // silently measure the empty-doc placeholder box(1,1,1) instead.
  const circleBuilt = build(circleSrc);
  check('#7 the disc is 10 wide (radius from HALF the point distance), not 20 (the whole distance)',
    Math.abs((circleBuilt.bbox[1][0] - circleBuilt.bbox[0][0]) - 10) < 0.5,
    `width ${(circleBuilt.bbox[1][0] - circleBuilt.bbox[0][0]).toFixed(1)} -- a broken implementation ` +
    `that reads the point distance itself as the radius would draw one twice this size`);

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

  console.log('\n=== sketch build 1: a rounded corner (bulge) ===');

  // Same non-90-degree triangle the sketch-arc suite uses -- a rectangle
  // corner cannot tell a correct trim from a trim-by-r bug.
  const filletedDoc = doc({
    id: 'sk3', kind: 'sketch', plane: 'xy', offset: 0,
    points: [[0, 0], [25, 0], [28, 9], [0, 30]],
    bulges: { 1: Math.tan((143.1301 * Math.PI / 180) / 4) },
  }, pull('e3', 'sk3'));
  const filletedSrc = gen.toReshape(filletedDoc);
  check('a bulged sketch emits polyArc, not poly', filletedSrc.includes('polyArc([') && filletedSrc.includes('function polyArc('));
  check('...literal bulge values, keyed by edge, not routed through a param',
    /polyArc\(\[.*\], \{1: 0\.72/.test(filletedSrc), filletedSrc.slice(filletedSrc.indexOf('polyArc(')));
  check('...and pulls geometries in for geom2.fromPoints', /const \{[^}]*geometries[^}]*\} = require/.test(filletedSrc));

  const filletedBuilt = build(filletedSrc);
  // A 40x30 right triangle (area 600) minus the sliver the r=5 fillet cuts off
  // the corner -- the rounded footprint has to come out smaller than 600 and
  // comfortably bigger than a fillet-ate-the-whole-corner degenerate result.
  const footprint = filletedBuilt.bbox[1][0] - filletedBuilt.bbox[0][0];
  check('the filleted profile still stands up as a real solid, not a degenerate sliver',
    filletedBuilt.volume > 0 && footprint > 25 && footprint <= 40,
    `volume ${filletedBuilt.volume.toFixed(0)}, footprint ${footprint.toFixed(1)}`);

  console.log('\n=== sketch build 1: old docs are untouched ===');

  const plainSketchSrc = gen.toReshape(doc(sketch('s1')));
  check('#9 no shape, no bulges: still polygon([, byte-identical to before this build',
    plainSketchSrc.includes(`polygon([${sketch('s1').points.map((_, n) => `[p.s1_p${n}u, p.s1_p${n}v]`).join(', ')}])`));
  check('...and neither new helper is pulled in for a doc that never uses them',
    !plainSketchSrc.includes('function discAcross(') && !plainSketchSrc.includes('function polyArc('));
  {
    // A BOWED edge is not a legacy import any more -- the Bow row writes
    // bulges, so this path is now reachable from the UI and has to be checked
    // as a live one rather than as a compatibility shim. What matters is that
    // the corners stay PARAMETERS (so dragging one still moves the shape) while
    // the bulge rides along as a literal.
    const arcLib = require(path.join(dir, 'sketch-arc.js'));
    const bowed = arcLib.bowEdge(sketch('s1'), 0, 8);
    const bowedSrc = gen.toReshape(doc(bowed));
    check('a bowed sketch emits polyArc, not polygon',
      bowedSrc.includes('polyArc([') && !/=\s*polygon\(\[/.test(bowedSrc),
      bowedSrc.split(/\r?\n/).filter((l) => /poly(gon|Arc)\(/.test(l)).slice(0, 2).join(' | '));
    check('...and pulls the helper in with it',
      bowedSrc.includes('function polyArc('));
    check('...with the corners still PARAMETERS, so a drag still moves them',
      bowedSrc.includes('polyArc([[p.s1_p0u, p.s1_p0v]'),
      bowedSrc.split(/\r?\n/).filter((l) => l.includes('polyArc([')).slice(0, 1).join(''));
    check('...and the bow it was given carried through as a bulge',
      /polyArc\(\[.*\],\s*\{0:\s*0\.4\b/.test(bowedSrc),
      bowedSrc.split(/\r?\n/).filter((l) => l.includes('polyArc([')).slice(0, 1).join(''));

    // Built, not just generated -- and measured against the straight version
    // of the same sketch rather than against a number typed here. Bowing an
    // edge OUTWARD adds area, so the extruded solid has to get bigger; a
    // curve that draws on the canvas but flattens on the way to the geometry
    // is the exact half-wired failure this file exists to catch.
    const straightVol = build(gen.toReshape(doc(sketch('s1'), pull('e1', 's1')))).volume;
    const bowedVol = build(gen.toReshape(doc(bowed, pull('e1', 's1')))).volume;
    check('a bowed sketch still BUILDS, and the bow reaches the solid',
      bowedVol > straightVol * 1.02,
      `straight ${straightVol.toFixed(0)} -> bowed ${bowedVol.toFixed(0)}`);
  }


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
  check('Build regenerates script.js from the live doc, not a stale snapshot',
    /toScript\(doc,\s*scriptNamedParams/.test(studioSrc) && /toReshape\(doc\)/.test(studioSrc),
    'ReshapeStudio no longer regenerates script.js from `doc`, so Build can once again leave '
      + 'a stale script.js behind -- the same bug in a new shape');
  check('...and Code mode still runs the CURRENT file, not a stale snapshot',
    /setCode\(value\)/.test(studioSrc),
    "run() no longer reads the live `value` prop, which breaks Code mode's Run button");

  {
    console.log('\n=== blend: two outlines skinned into one solid ===');

    const sq = (id, offset, half) => ({
      id, kind: 'sketch', plane: 'xy', offset,
      points: [[-half, -half], [half, -half], [half, half], [-half, half]],
    });
    const big = sq('sa', 0, 20);
    const small = sq('sb', 30, 5);
    const blended = { version: 1, features: [big, small, { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] }] };
    const src = gen.toReshape(blended);

    check('a blend emits blendOnPlane and pulls the helper in',
      src.includes('blendOnPlane(') && src.includes('function blendOnPlane('));
    check('...with both corner lists as PARAMETERS, so dragging still reshapes it',
      src.includes('[p.sa_p0u, p.sa_p0v]') && src.includes('[p.sb_p0u, p.sb_p0v]'),
      src.split(/\r?\n/).filter((l) => l.includes('blendOnPlane(')).slice(0, 1).join(''));
    check('...and the gap read off the two offsets rather than a third number',
      /p\.sb_offset - p\.sa_offset/.test(src),
      src.split(/\r?\n/).filter((l) => l.includes('blendOnPlane(')).slice(0, 1).join(''));

    const built = build(src);
    // A truncated pyramid, 40x40 at the bottom and 10x10 at the top, 30 tall.
    // Volume of a frustum = h/3 * (A1 + A2 + sqrt(A1*A2)) = 30/3 * (1600 + 100 + 400).
    check('it builds a real tapered solid, measured against the frustum formula',
      Math.abs(built.volume - 21000) < 21000 * 0.02,
      `${built.volume.toFixed(0)} vs 21000`);
    check('...standing the full gap tall',
      Math.abs((built.bbox[1][2] - built.bbox[0][2]) - 30) < 0.5,
      JSON.stringify(built.bbox));
    check('...and as wide as its WIDEST outline, not its narrowest',
      Math.abs((built.bbox[1][0] - built.bbox[0][0]) - 40) < 0.5,
      JSON.stringify(built.bbox));

    // Different corner counts is the case the resampling exists for: without
    // it a skin has nothing to join corner n of one to corner n of the other.
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexPts.push([12 * Math.cos(a), 12 * Math.sin(a)]);
    }
    const mixed = { version: 1, features: [
      big,
      { id: 'sb', kind: 'sketch', plane: 'xy', offset: 30, points: hexPts },
      { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
    ] };
    const mixedBuilt = build(gen.toReshape(mixed));
    check('a 4-corner outline blends to a 6-corner one at all',
      mixedBuilt.volume > 0 && mixedBuilt.polys > 0,
      `volume ${mixedBuilt.volume.toFixed(0)}, ${mixedBuilt.polys} polys`);
    check('...and lands between the two areas, so the skin did not collapse or explode',
      mixedBuilt.volume > 30 * 300 * 0.4 && mixedBuilt.volume < 30 * 1600,
      `${mixedBuilt.volume.toFixed(0)}`);

    // Opposite winding is the bow-tie case. Reversing one outline must not
    // change the solid: a blend that self-intersects loses volume, badly.
    const reversed = { version: 1, features: [
      big,
      { ...sq('sb', 30, 5), points: sq('sb', 30, 5).points.slice().reverse() },
      { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
    ] };
    const revBuilt = build(gen.toReshape(reversed));
    check('drawing the top outline the other way round builds the SAME solid',
      Math.abs(revBuilt.volume - built.volume) < built.volume * 0.02,
      `${revBuilt.volume.toFixed(0)} vs ${built.volume.toFixed(0)} -- a bow tie would be far smaller`);

    check('a blend on the front plane builds too',
      build(gen.toReshape({ version: 1, features: [
        { ...big, plane: 'xz' }, { ...small, plane: 'xz' },
        { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
      ] })).volume > 0);

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

  {
    console.log('\n=== a chamfer has to reach the SOLID, not just the canvas ===');

    // Regression, and the number is derived by hand rather than snapshotted: a
    // 6mm chamfer on a right-angle corner removes a triangle with legs 6 and 6,
    // area 18, times 12 tall = 216. So 40*25*12 - 216 = 11784.
    //
    // Chamfer shipped without this. featureExpr's sketch branch read `rounds`
    // only, so a chamfered sketch emitted a plain polygon() of its raw corners:
    // HandleOverlay drew the cut, because it reads outlineOf, and the built
    // solid never had it. It looked chamfered, extruded square, exported
    // square, and no test could fail. Found by scripts/oracle-measure.mjs on
    // its first run -- a chamfered block measuring EXACTLY the volume of an
    // unchamfered one.
    const chSketch = { id: 'sk9', kind: 'sketch', plane: 'xy', offset: 0,
      points: [[0, 0], [40, 0], [40, 25], [0, 25]], chamfers: { 1: 6 } };
    const chDoc = { version: 1, features: [chSketch, { id: 'e9', kind: 'extrude', target: 'sk9', height: 12 }] };
    const chSrc = gen.toReshape(chDoc);
    check('a chamfered sketch does NOT emit a bare polygon of its raw corners',
      !/=\s*polygon\(\[/.test(chSrc),
      chSrc.split(/\r?\n/).filter((l) => /polygon\(|roundPoly\(/.test(l)).slice(0, 1).join(''));
    check('...it emits roundPoly, which is where the cut is derived',
      chSrc.includes('roundPoly(['));
    const chBuilt = build(chSrc);
    check('...and the cut really reaches the solid: 12000 - 216 = 11784',
      Math.abs(chBuilt.volume - 11784) < 1,
      `${chBuilt.volume.toFixed(2)} -- 12000 would mean the chamfer never arrived`);

    // Round still wins when a corner carries both, the same way outlineOf
    // resolves it -- so the two paths cannot disagree about one corner.
    const bothDoc = { version: 1, features: [
      { ...chSketch, rounds: { 1: 6 }, chamfers: { 1: 6 } },
      { id: 'e9', kind: 'extrude', target: 'sk9', height: 12 },
    ] };
    const bothVol = build(gen.toReshape(bothDoc)).volume;
    const roundOnly = build(gen.toReshape({ version: 1, features: [
      { ...chSketch, chamfers: undefined, rounds: { 1: 6 } },
      { id: 'e9', kind: 'extrude', target: 'sk9', height: 12 },
    ] })).volume;
    check('a corner asked for BOTH is rounded, not chamfered -- round wins',
      Math.abs(bothVol - roundOnly) < 1,
      `both ${bothVol.toFixed(2)} vs round-only ${roundOnly.toFixed(2)} (chamfer-only is 11784)`);

    check('a chamfer on one corner leaves the others sharp',
      Math.abs(build(gen.toReshape({ version: 1, features: [
        { ...chSketch, chamfers: { 1: 6, 2: 6 } },
        { id: 'e9', kind: 'extrude', target: 'sk9', height: 12 },
      ] })).volume - (12000 - 432)) < 1,
      'two chamfers should remove exactly twice one chamfer');
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

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
