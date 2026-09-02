// Assertions for lib/topo-name.ts.
//
// The naming scheme is tested here without a kernel on purpose. Its rules are
// about identity and dependency, not geometry, and a rule that only holds when
// OpenCascade agrees with it is a rule nobody can check while designing.

module.exports = function run(dir) {
  const path = require('path');
  const N = require(path.join(dir, 'topo-name.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  // A model shaped like something a student would actually build: a sketch,
  // pulled into a solid, with a cylinder cut out of it.
  const FEATURES = { sk1: 4, sk2: null };
  const exists = (id) => ['sk1', 'e1', 'c1', 'op1'].includes(id);
  const edges = (id) => (id in FEATURES ? FEATURES[id] : null);
  const label = (id) => ({ sk1: 'Sketch 1', e1: 'Pull 1', c1: 'Cylinder 1', op1: 'Cut 1' }[id] || id);

  const sideFace = { cause: 'swept', feature: 'e1', kind: 'face', from: 'sk1', edge: 0 };
  const topCap = { cause: 'cap', feature: 'e1', kind: 'face', end: 'top' };
  const boxTop = { cause: 'primitive', feature: 'c1', kind: 'face', part: '+z' };
  const carried = { cause: 'carried', feature: 'op1', kind: 'face', of: sideFace };
  const split = { cause: 'split', feature: 'op1', kind: 'face', of: topCap, at: { u: 12.5, v: 4 } };
  const made = { cause: 'made', feature: 'op1', kind: 'face', at: { u: 0.5, v: 0.25 } };

  console.log('\n=== a name reads as what made it, not where it sits ===');

  check('a swept face names the sketch edge it came from',
    N.formatName(sideFace) === 'e1.face[sk1.edge0]', N.formatName(sideFace));
  check('a cap names its end', N.formatName(topCap) === 'e1.cap[top]', N.formatName(topCap));
  check('a primitive face names its direction',
    N.formatName(boxTop) === 'c1.face[+z]', N.formatName(boxTop));
  check('a face carried through an operation still says where it came from',
    N.formatName(carried) === 'op1.same[e1.face[sk1.edge0]]', N.formatName(carried));
  check('a split piece names its parent AND what tells it from its siblings',
    N.formatName(split) === 'op1.split[e1.cap[top], near(12.5,4)]', N.formatName(split));
  check('a face the operation invented names its maker and a point on it',
    N.formatName(made) === 'op1.made[face, near(0.5,0.25)]', N.formatName(made));

  // The whole point of the discriminator: it must NOT be an ordinal. If the
  // name of a split piece contained "0" or "1", two rebuilds that happened to
  // order the pieces differently would silently swap the student's selection.
  check('a split name contains no ordinal to be reordered',
    !/\[\s*\d+\s*\]/.test(N.formatName(split)), N.formatName(split));

  // Two rebuilds of the same model must write the same text, or nothing can be
  // compared or stored. Raw floats do not, which is why the point is rounded.
  const jitter = { ...split, at: { u: 12.500000000001, v: 3.99999999999 } };
  check('a hair of float jitter does not change the name text',
    N.formatName(jitter) === N.formatName(split),
    `${N.formatName(jitter)} vs ${N.formatName(split)}`);

  console.log('\n=== what a name depends on ===');

  check('the root of a carried name is the feature that MADE the face',
    N.rootFeature(carried) === 'e1', N.rootFeature(carried));
  check('...not the operation that passed it along',
    N.rootFeature(split) === 'e1', N.rootFeature(split));
  check('a name with no ancestry roots at itself',
    N.rootFeature(made) === 'op1' && N.rootFeature(boxTop) === 'c1');
  check('the chain lists every feature the name passes through, nearest first',
    JSON.stringify(N.featureChain(split)) === JSON.stringify(['op1', 'e1']),
    JSON.stringify(N.featureChain(split)));

  console.log('\n=== a name that no longer means anything says so ===');

  check('a live name is valid', N.nameIsStructurallyValid(sideFace, exists, edges));
  check('...and reports no reason to be lost',
    N.whyNameLost(sideFace, exists, edges, label) === null);

  // The exact case this scheme exists for: the student removes a corner, the
  // sketch loses an edge, and a fillet was sitting on the face that edge swept.
  const shrunk = (id) => (id === 'sk1' ? 2 : edges(id));
  check('a face swept from an edge that no longer exists is invalid',
    !N.nameIsStructurallyValid(sideFace, exists, (id) => (id === 'sk1' ? 0 : edges(id))));
  const why = N.whyNameLost(
    { cause: 'swept', feature: 'e1', kind: 'face', from: 'sk1', edge: 3 }, exists, shrunk, label,
  );
  check('...and the reason names the sketch, the edge, and what is left',
    /Sketch 1/.test(why || '') && /edge 4/.test(why || '') && /only 2 edges/.test(why || ''),
    String(why));

  const gone = (id) => id !== 'e1' && exists(id);
  check('deleting the feature that made a face invalidates names carried past it',
    !N.nameIsStructurallyValid(carried, gone, edges));
  check('...and says which feature is missing, by its student-facing name',
    /Pull 1/.test(N.whyNameLost(carried, gone, edges, label) || ''),
    String(N.whyNameLost(carried, gone, edges, label)));

  // The rule the whole file is built around, stated as a test so it cannot be
  // quietly softened later: a lost name is an error to report, never a
  // selection to move. If whyNameLost ever returned null for an invalid name,
  // a caller would have nothing to say and would silently drop or relocate the
  // student's fillet.
  const bad = { cause: 'swept', feature: 'e1', kind: 'edge', from: 'sk1', edge: 9 };
  check('every structurally invalid name has a reason to give the student',
    !N.nameIsStructurallyValid(bad, exists, edges)
      && typeof N.whyNameLost(bad, exists, edges, label) === 'string',
    'an invalid name with no explanation would force a silent drop');

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
