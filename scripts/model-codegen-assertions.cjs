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
  const bundlePath = path.join(__dirname, '..', 'public', 'jscad', 'lib', 'jscad-modeling.min.js');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), sandbox);
  const M = sandbox.jscadModeling;

  // The generator emits shCAD names (box, tube, ball, extrude, turn), which are
  // globals installed by simple.js — so the geometry checks below cannot run
  // without it. That is a real dependency, not a test convenience: the code we
  // generate genuinely does not work without simple.js loaded, which is also
  // why it no longer runs unmodified on jscad.app.
  const simplePath = path.join(__dirname, '..', 'public', 'jscad', 'simple.js');
  if (!fs.existsSync(simplePath)) {
    console.log('  FAIL  public/jscad/simple.js is missing — the generated code needs it');
    return false;
  }
  vm.runInContext(fs.readFileSync(simplePath, 'utf8'), sandbox);
  for (const n of ['box', 'tube', 'ball', 'extrude', 'turn', 'cone', 'ring', 'poly']) {
    if (typeof sandbox[n] !== 'function') {
      console.log(`  FAIL  simple.js did not expose ${n}()`);
      return false;
    }
  }

  function build(src) {
    const mod = { exports: {} };
    // Run inside the same context simple.js populated, so the shCAD globals the
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

  const plain = gen.toJscad(doc(box('b1')));
  check('a plain box is a shCAD box', plain.includes('box(p.b1_width, p.b1_depth, p.b1_height'));
  check('...positional, never the object form box() refuses', !plain.includes('box({'));
  check('no hulls import when nothing needs it', !plain.includes('hulls'));

  const filleted = gen.toJscad(doc(box('b1', { round: 4, roundStyle: 'fillet' })));
  check('a filleted box passes roundRadius to box', filleted.includes('roundRadius: p.b1_round'));

  const chamfered = gen.toJscad(doc(box('b1', { round: 4, roundStyle: 'chamfer' })));
  check('a chamfered box uses the hull helper', chamfered.includes('function chamferBox('));
  check('...and pulls transforms in', /const \{[^}]*transforms[^}]*\} = require/.test(chamfered));
  check('...and only that helper', !chamfered.includes('function chamferCylinder('));

  const chamCyl = gen.toJscad(doc(cyl('c1', { round: 2, roundStyle: 'chamfer' })));
  check('a chamfered cylinder uses its own helper', chamCyl.includes('function chamferCylinder('));

  const filCyl = gen.toJscad(doc(cyl('c1', { round: 2, roundStyle: 'fillet' })));
  check('a filleted cylinder passes roundRadius to tube',
    filCyl.includes('tube(') && filCyl.includes('roundRadius: p.c1_round'));

  console.log('\n=== order is the lesson ===');

  const cut = gen.toJscad(doc(box('b1'), cyl('c1'), {
    id: 'x1', kind: 'combine', op: 'subtract', targets: ['b1', 'c1'],
  }));
  check('subtract keeps body first', cut.includes('booleans.subtract(b1, c1)'));
  check('a consumed feature is not returned', /return x1\b/.test(cut));

  const flipped = gen.toJscad(doc(box('b1'), cyl('c1'), {
    id: 'x1', kind: 'combine', op: 'subtract', targets: ['c1', 'b1'],
  }));
  check('swapping targets swaps the call', flipped.includes('booleans.subtract(c1, b1)'));

  const loose = gen.toJscad(doc(box('b1'), cyl('c1')));
  check('two loose shapes are unioned', loose.includes('booleans.union(b1, c1)'));

  const empty = gen.toJscad(doc());
  check('an empty doc still returns something', empty.includes('return box(1, 1, 1)'));

  console.log('\n=== cone and ring ===');

  const cone = (id) => ({ id, kind: 'cone', radius: 12, height: 30, center: [0, 0, 0] });
  const ring = (id) => ({ id, kind: 'torus', ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] });

  const coneSrc = gen.toJscad(doc(cone('k1')));
  const ringSrc = gen.toJscad(doc(ring('r1')));
  check('a cone is a shCAD cone', coneSrc.includes('cone(p.k1_radius, p.k1_height'));
  check('a ring is a shCAD ring', ringSrc.includes('ring(p.r1_ring, p.r1_tube)'));
  // ring() refuses an options object because torus accepts `center` and drops
  // it silently. A positioned ring must therefore be a translate around one.
  check('a ring is positioned by translate, not by an argument',
    ringSrc.includes('transforms.translate([p.r1_x') && !ringSrc.includes('ring(p.r1_ring, p.r1_tube, {'));

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

  const flatOnly = gen.toJscad(doc(sketch('s1')));
  check('a sketch is a shCAD poly', flatOnly.includes('poly([[p.s1_p0u'));
  check('...taking the list positionally, never an options object',
    !flatOnly.includes('poly({'));
  check('a bare sketch is not returned as the model',
    !/return s1\b/.test(flatOnly), flatOnly.slice(flatOnly.indexOf('return')).split('\n')[0]);

  const pulled = gen.toJscad(doc(sketch('s1'), pull('e1', 's1')));
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
  const onXZ = build(gen.toJscad(doc(sketch('s1', 'xz'), pull('e1', 's1'))));
  check('an xz sketch stands up in z, not y',
    Math.abs(onXZ.bbox[1][2] - onXZ.bbox[0][2] - 25) < 0.5
    && Math.abs(onXZ.bbox[1][1] - onXZ.bbox[0][1] - 12) < 0.5,
    JSON.stringify(onXZ.bbox));
  const onYZ = build(gen.toJscad(doc(sketch('s1', 'yz'), pull('e1', 's1'))));
  check('a yz sketch is thin in x',
    Math.abs(onYZ.bbox[1][0] - onYZ.bbox[0][0] - 12) < 0.5, JSON.stringify(onYZ.bbox));

  const raised = build(gen.toJscad(doc(sketch('s1', 'xy', 30), pull('e1', 's1'))));
  check('offset lifts the sketch off the origin',
    Math.abs(raised.bbox[0][2] - 30) < 0.5, JSON.stringify(raised.bbox));

  // An extruded sketch is a solid like any other, so it must cut and be cut.
  const cutBySketch = build(gen.toJscad(doc(
    box('b1'), sketch('s1'), pull('e1', 's1'),
    { id: 'x1', kind: 'combine', op: 'subtract', targets: ['b1', 'e1'] },
  )));
  check('an extruded sketch composes with the booleans',
    cutBySketch.volume > 0 && cutBySketch.volume < 40 * 40 * 20,
    `${cutBySketch.volume.toFixed(0)}`);

  console.log('\n=== turning a shape ===');

  const flat = gen.toJscad(doc(box('b1')));
  const turnedSrc = gen.toJscad(doc(box('b1', { rotate: [0, 0, 45] })));
  check('an unrotated shape carries no turn call', !flat.includes('turn('));
  check('a turned shape is turned', turnedSrc.includes('turn([p.b1_rx, p.b1_ry, p.b1_rz]'));
  // shCAD's turn takes degrees. The conversion this used to emit is gone, and
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

  const offCentre = build(gen.toJscad(doc(box('b1', {
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

  const turnedRing = build(gen.toJscad(doc(ring('r1'))));
  check('a ring still builds with the rotation path in place', turnedRing.volume > 100);

  console.log('\n=== names count per kind, not per row ===');

  const mixed = doc(box('b1'), cyl('c1'), box('b2'), cyl('c2'));
  const nm = types.nameMap(mixed);
  check('the first cylinder is Cylinder 1 even after a box', nm.c1 === 'Cylinder 1', nm.c1);
  check('the second box is Box 2', nm.b2 === 'Box 2', nm.b2);
  check('the second cylinder is Cylinder 2', nm.c2 === 'Cylinder 2', nm.c2);
  check('captions follow the same names',
    gen.generatedParams(mixed).some((p) => p.caption === 'Cylinder 1 radius'));

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

  const code = gen.toJscad(d);
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
    ['loose', loose], ['empty', empty], ['plainCyl', gen.toJscad(doc(cyl('c1')))],
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

  check('a combine refuses to round',
    /Round the box before/.test(types.whyCannotRound({ id: 'x', kind: 'combine', op: 'union', targets: [] })));
  check('a sphere refuses to round',
    types.whyCannotRound({ id: 's', kind: 'sphere', radius: 5, center: [0, 0, 0] }) !== null);
  check('a box may round', types.whyCannotRound(box('b1')) === null);
  check('maxRound stops short of half the smallest side',
    types.maxRound(box('b1')) < 10 && types.maxRound(box('b1')) > 9.9,
    String(types.maxRound(box('b1'))));
  check('maxRound on a cylinder uses the smaller of radius*2 and height',
    types.maxRound(cyl('c1')) < 10, String(types.maxRound(cyl('c1'))));

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
