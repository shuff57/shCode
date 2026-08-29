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
  return fails.length === 0;
};
