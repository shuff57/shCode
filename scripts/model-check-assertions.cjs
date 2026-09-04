// Assertions for lib/model-check.ts's checkModel(), run against a CommonJS
// build by scripts/test-model-check.mjs.

module.exports = function run(dir) {
  const path = require('path');
  const { checkModel } = require(path.join(dir, 'model-check.js'));
  const { formatName } = require(path.join(dir, 'topo-name.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const box = (id, size, extra) => ({ id, kind: 'box', size, center: [0, 0, 0], ...extra });
  const hole = (id, target, diameter, extra) =>
    ({ id, kind: 'hole', target, diameter, depth: 10, center: [0, 0, 0], axis: 'z', ...extra });
  const sketch = (id, points, extra) =>
    ({ id, kind: 'sketch', plane: 'xy', offset: 0, points, ...extra });
  const shell = (id, target, thickness, open) =>
    ({ id, kind: 'shell', target, thickness, ...(open !== undefined ? { open } : {}) });
  const fillet = (id, target, size, style, edge) =>
    ({ id, kind: 'fillet', target, edge, size, style });
  const doc = (...features) => ({ version: 1, features });
  const req = (expect, tolerance) => ({ expect, ...(tolerance !== undefined ? { tolerance } : {}) });

  const primFace = (feature, part) => ({ cause: 'primitive', feature, kind: 'face', part });

  console.log('\n=== exact match ===');
  {
    const d = doc(box('b1', [40, 40, 20]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('exact size array matches', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(box('b1', [40, 40, 10]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('mismatched size fails', r.passed === false, JSON.stringify(r));
  }

  console.log('\n=== tolerance ===');
  {
    const d = doc(box('b1', [40.005, 40, 20]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('within default tolerance (0.01) passes', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(box('b1', [40.02, 40, 20]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('outside default tolerance fails', r.passed === false, JSON.stringify(r));
  }
  {
    const d = doc(box('b1', [40.4, 40, 20]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }], 0.5), d);
    check('custom tolerance passes a bigger gap', r.passed === true, JSON.stringify(r));
  }

  console.log('\n=== aliases ===');
  {
    const d = doc(box('b1', [40, 30, 20]));
    const r = checkModel(req([{ kind: 'box', width: 40, depth: 30, height: 20 }]), d);
    check('box width/depth/height aliases match size[0..2]', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(hole('h1', 'b1', 6));
    const r = checkModel(req([{ kind: 'hole', across: 6 }]), d);
    check('hole "across" alias matches diameter', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(hole('h1', 'b1', 8));
    const r = checkModel(req([{ kind: 'hole', across: 6 }]), d);
    check('hole "across" alias still enforces the value', r.passed === false, JSON.stringify(r));
  }

  console.log('\n=== two entries of the same kind need two DISTINCT features ===');
  {
    const d = doc(hole('h1', 'b1', 6));
    const r = checkModel(req([{ kind: 'hole', across: 6 }, { kind: 'hole', across: 6 }]), d);
    check('one hole cannot satisfy two hole entries', r.passed === false && r.missing.length === 1, JSON.stringify(r));
  }
  {
    const d = doc(hole('h1', 'b1', 6), hole('h2', 'b1', 6));
    const r = checkModel(req([{ kind: 'hole', across: 6 }, { kind: 'hole', across: 6 }]), d);
    check('two matching holes satisfy two entries', r.passed === true, JSON.stringify(r));
  }

  console.log('\n=== extra features are ignored ===');
  {
    const d = doc(box('b1', [40, 40, 20]), sketch('sk1', [[0, 0], [10, 0], [10, 10], [0, 10]]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('an unrelated extra feature does not break a match', r.passed === true, JSON.stringify(r));
  }

  console.log('\n=== null doc ===');
  {
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), null);
    check('a null doc fails', r.passed === false, JSON.stringify(r));
    check('a null doc reports every entry missing', r.missing.length === 1, JSON.stringify(r));
    check('a null doc message tells the student to build first', r.message === 'Build or run the model first', r.message);
  }

  console.log('\n=== derived sketch width/depth ===');
  {
    const d = doc(sketch('sk1', [[0, 0], [40, 0], [40, 25], [0, 25]]));
    const r = checkModel(req([{ kind: 'sketch', width: 40, depth: 25 }]), d);
    check('sketch width/depth derive from the bbox of points', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(sketch('sk1', [[0, 0], [40, 0], [40, 25], [0, 25]]));
    const r = checkModel(req([{ kind: 'sketch', width: 40, depth: 20 }]), d);
    check('wrong sketch depth fails', r.passed === false, JSON.stringify(r));
  }
  {
    const d = doc(sketch('sk1', [[-5, 0], [5, 0]], { shape: 'circle' }));
    const r = checkModel(req([{ kind: 'sketch', across: 10 }]), d);
    check('circle sketch "across" derives from the diameter endpoints', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(sketch('sk1', [[0, 0], [40, 0], [40, 25], [0, 25]]));
    const r = checkModel(req([{ kind: 'sketch', across: 10 }]), d);
    check('a non-circle sketch has no "across" -- entry is missing, not a stray match', r.passed === false, JSON.stringify(r));
  }

  console.log('\n=== shell open ===');
  {
    const d = doc(shell('sh1', 'b1', 2, primFace('b1', '+z')));
    const r = checkModel(req([{ kind: 'shell', open: true }]), d);
    check('open: true matches any open face', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(shell('sh1', 'b1', 2));
    const r = checkModel(req([{ kind: 'shell', open: true }]), d);
    check('a fully-closed shell fails open: true', r.passed === false, JSON.stringify(r));
  }
  {
    const name = primFace('b1', '+z');
    const d = doc(shell('sh1', 'b1', 2, name));
    const r = checkModel(req([{ kind: 'shell', open: formatName(name) }]), d);
    check('an exact open-face name string matches formatName()', r.passed === true, JSON.stringify(r));
  }
  {
    const d = doc(shell('sh1', 'b1', 2, primFace('b1', '+z')));
    const r = checkModel(req([{ kind: 'shell', open: 'b1.face[-z]' }]), d);
    check('the wrong exact open-face name fails', r.passed === false, JSON.stringify(r));
  }

  console.log('\n=== fillet style (only named fields are checked) ===');
  {
    const d = doc(fillet('f1', 'b1', 4, 'chamfer', null));
    const r = checkModel(req([{ kind: 'fillet', style: 'fillet' }]), d);
    check('a bevel does not satisfy an entry that names style: fillet', r.passed === false, JSON.stringify(r));
  }
  {
    const d = doc(fillet('f1', 'b1', 4, 'fillet', null));
    const r = checkModel(req([{ kind: 'fillet' }]), d);
    check('an entry naming no fields at all matches any fillet', r.passed === true, JSON.stringify(r));
  }

  console.log('\n=== message wording ===');
  {
    const d = doc(box('b1', [40, 40, 10]));
    const r = checkModel(req([{ kind: 'box', size: [40, 40, 20] }]), d);
    check('box mismatch message names both the expected and found size',
      r.message === 'Expected a box 40 x 40 x 20, found a box 40 x 40 x 10.', r.message);
  }
  {
    const d = doc(box('b1', [40, 40, 20]));
    const r = checkModel(req([{ kind: 'hole', across: 6 }]), d);
    check('missing-kind message says there is no such feature',
      r.message === 'Expected a hole across 6; there is no hole.', r.message);
  }

  console.log(`\n${pass} passed, ${fails.length} failed`);
  return fails.length === 0;
};
