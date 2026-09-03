// Assertions for lib/model-handles.ts's planeAnchor, run against a CommonJS
// build by scripts/test-model-handles.mjs.

module.exports = function run(dir) {
  const path = require('path');
  const handles = require(path.join(dir, 'model-handles.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const planes = [
    ['xy', [1, 0, 0], [0, 1, 0]],
    ['xz', [1, 0, 0], [0, 0, 1]],
    ['yz', [0, 1, 0], [0, 0, 1]],
  ];

  console.log('\n=== planeAnchor origin and axes ===');

  for (const [plane, u, v] of planes) {
    const a = handles.planeAnchor(plane, 0);
    check(`${plane} at offset 0 sits at the origin`, eq(a.origin, [0, 0, 0]), JSON.stringify(a.origin));
    check(`${plane} axis is the plane's u`, eq(a.axis, u), JSON.stringify(a.axis));
    check(`${plane} axisV is the plane's v`, eq(a.axisV, v), JSON.stringify(a.axisV));
  }

  const off = handles.planeAnchor('xy', 15);
  check('xy at offset 15 moves along +z', eq(off.origin, [0, 0, 15]), JSON.stringify(off.origin));
  check('...while its axes stay the same', eq(off.axis, [1, 0, 0]) && eq(off.axisV, [0, 1, 0]));

  const yz = handles.planeAnchor('yz', 20);
  check('yz at offset 20 moves along +x', eq(yz.origin, [20, 0, 0]), JSON.stringify(yz.origin));
  const xz = handles.planeAnchor('xz', -7);
  check('xz at negative offset moves along -y', eq(xz.origin, [0, -7, 0]), JSON.stringify(xz.origin));

  console.log('\n=== planeAnchor satisfies the HandleSpec shape ===');

  const a = handles.planeAnchor('xy', 0);
  check('has kind', typeof a.kind === 'string', String(a.kind));
  check('has param', typeof a.param === 'string', String(a.param));
  check('has origin (3 numbers)', Array.isArray(a.origin) && a.origin.length === 3, JSON.stringify(a.origin));
  check('has axis', Array.isArray(a.axis) && a.axis.length === 3, JSON.stringify(a.axis));
  check('has scale', typeof a.scale === 'number', String(a.scale));
  check('has label', typeof a.label === 'string', String(a.label));
  check('param is the reserved plane-origin marker',
    a.param === '__planeOrigin', String(a.param));
  check('paramV is set and truthy (so the runner computes the second axis vector)',
    typeof a.paramV === 'string' && a.paramV.length > 0, String(a.paramV));

  console.log(fails.length === 0
    ? `\nplaneAnchor: all ${pass} checks passed`
    : `\nplaneAnchor: ${fails.length} failed`);

  // ---------------------------------------------------- fillet edge handle --
  // Hand-computed cases, independent of the implementation -- see the module
  // header for the arithmetic each one is checking. The rectangle-degeneracy
  // trap that bit the sketch corner-radius handle does not apply here (this
  // shape's cross-section is always 90 degrees, scale is always 1), so every
  // check below carries its value in the POSITION arithmetic instead.
  console.log('\n=== drag handle for a rounded box edge ===');

  const box = (extra = {}) => ({
    id: 'b1', kind: 'box', size: [10, 10, 10], center: [0, 0, 0], ...extra,
  });
  const between = (partA, partB, feature = 'r1') => ({
    cause: 'between', feature, kind: 'edge',
    of: [
      { cause: 'primitive', feature: 'b1', kind: 'face', part: partA },
      { cause: 'primitive', feature: 'b1', kind: 'face', part: partB },
    ],
  });
  const fillet = (edge, extra = {}) => ({
    id: 'r1', kind: 'fillet', target: 'b1', edge, size: 3, style: 'fillet', ...extra,
  });

  const docOf = (...features) => ({ version: 1, features });

  {
    const doc = docOf(box(), fillet(between('+x', '+z')));
    const specs = handles.handlesFor(doc.features[1], doc);
    check('exactly one handle for a plain box edge', specs.length === 1, String(specs.length));
    const h = specs[0];
    check('kind is radius', h && h.kind === 'radius', h && h.kind);
    check('param names this fillet\'s own size slot', h && h.param === 'r1_size', h && h.param);
    check('face A = +x (sorted first), origin [5,0,2]',
      h && eq(h.origin, [5, 0, 2]), h && JSON.stringify(h.origin));
    check('axis = -face B normal = [0,0,-1]', h && eq(h.axis, [0, 0, -1]), h && JSON.stringify(h.axis));
    check('scale 1 -- a box edge is always a 90-degree corner',
      h && h.scale === 1, h && String(h.scale));
  }

  {
    // face A = +z ('+' sorts before '-'), edgeMid [0,-10,15], origin [0,-6,15], axis [0,1,0]
    const doc = docOf(box({ size: [10, 20, 30] }), fillet(between('-y', '+z'), { size: 4 }));
    const h = handles.handlesFor(doc.features[1], doc)[0];
    check('face A = +z, edgeMid/origin [0,-6,15]', h && eq(h.origin, [0, -6, 15]), h && JSON.stringify(h.origin));
    check('axis = [0,1,0] (away from -y)', h && eq(h.axis, [0, 1, 0]), h && JSON.stringify(h.axis));
  }

  {
    // The sort guard: the same edge written with `of` reversed must produce a
    // byte-identical spec. This is the only check that catches kernel face
    // order leaking through -- the stored order is NOT the sorted order.
    const forward = docOf(box({ size: [10, 20, 30] }), fillet(between('-y', '+z'), { size: 4 }));
    const reversed = docOf(box({ size: [10, 20, 30] }), fillet(between('+z', '-y'), { size: 4 }));
    const hf = handles.handlesFor(forward.features[1], forward)[0];
    const hr = handles.handlesFor(reversed.features[1], reversed)[0];
    check('reversing the stored face order does not change the emitted handle',
      hf && hr && eq(hf, hr), JSON.stringify({ hf, hr }));
  }

  {
    // Proves centre is added rather than assumed zero: origin [12,0,2].
    const doc = docOf(box({ center: [7, 0, 0] }), fillet(between('+x', '+z')));
    const h = handles.handlesFor(doc.features[1], doc)[0];
    check('a non-origin box adds its own centre: origin [12,0,2]',
      h && eq(h.origin, [12, 0, 2]), h && JSON.stringify(h.origin));
  }

  {
    const cylDoc = docOf(
      { id: 'c1', kind: 'cylinder', radius: 5, height: 10, center: [0, 0, 0] },
      fillet(between('+z', 'side'), { target: 'c1' }),
    );
    // A cylinder edge names 'c1' as the shared feature, but its side face has
    // no constant normal -- refused for now, not guessed at.
    check('root is a cylinder -> no handle',
      handles.handlesFor(cylDoc.features[1], cylDoc).length === 0);
  }

  {
    const splitEdge = between('+x', '+z');
    splitEdge.of[1] = { ...splitEdge.of[1], feature: 'other' };
    const doc = docOf(box(), fillet(splitEdge));
    check('of[0].feature !== of[1].feature -> no handle',
      handles.handlesFor(doc.features[1], doc).length === 0);
  }

  {
    const notBetween = { cause: 'primitive', feature: 'b1', kind: 'edge', part: '+x' };
    const doc = docOf(box(), fillet(notBetween));
    check('edge.cause is not \'between\' -> no handle',
      handles.handlesFor(doc.features[1], doc).length === 0);
  }

  console.log(fails.length === 0
    ? `\nall ${pass} checks passed`
    : `\n${fails.length} failed`);
  return fails.length === 0;
};
