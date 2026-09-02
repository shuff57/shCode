// Assertions for lib/model-deps.ts.
//
// The defect these were written against, measured 2026-09-01: deleting a sketch
// removed only the sketch, so the Pull built from it stayed in the timeline
// pointing at nothing and the generated source read
//
//   const pull1 = extrudeOnPlane(sk1, p.pull1_height, 'xy', p.sk1_offset)
//
// with `sk1` never declared. The preview died with "ReferenceError: sk1 is not
// defined" -- a raw JavaScript error for the ordinary act of deleting a sketch.
//
// So the check that matters here is not "does orphanedBy return the right set".
// It is the CROSS-CHECK: a document the dependency layer calls clean must
// generate source that declares every feature it uses. A set-equality assertion
// would have gone green the day the bug shipped, because the sets were never
// the thing that was wrong.

module.exports = function run(dir) {
  const path = require('path');
  const deps = require(path.join(dir, 'model-deps.js'));
  const gen = require(path.join(dir, 'model-codegen.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  // A model shaped like something a student would actually build: draw, pull,
  // drill, and cut a separate block out of the result.
  const DOC = { version: 1, features: [
    { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
      points: [[0, 0], [40, 0], [40, 25], [0, 25]] },
    { id: 'pull1', kind: 'extrude', target: 'sk1', height: 12 },
    { id: 'hole1', kind: 'hole', target: 'pull1', diameter: 8, depth: 30,
      center: [0, 0, 0], axis: 'z' },
    { id: 'b1', kind: 'box', size: [10, 10, 40], center: [30, 0, 0] },
    { id: 'cut1', kind: 'combine', op: 'subtract', targets: ['hole1', 'b1'] },
  ] };
  const label = (id) => ({
    sk1: 'Sketch 1', pull1: 'Pull 1', hole1: 'Hole 1', b1: 'Box 1', cut1: 'Cut 1',
  }[id] || id);
  const ids = (doc) => doc.features.map((f) => f.id).join(',');

  console.log('\n=== what an edit costs ===');

  check('CONTROL: the document starts with no dangling reference',
    deps.danglingRefs(DOC).length === 0, JSON.stringify(deps.danglingRefs(DOC)));

  check('deleting a sketch takes everything built from it, all the way down',
    ids(deps.withoutFeatures(DOC, ['sk1'])) === 'b1',
    ids(deps.withoutFeatures(DOC, ['sk1'])));
  check('...and the chain is walked transitively, not one level',
    deps.orphanedBy(DOC, ['sk1']).has('cut1'),
    'cut1 leans on hole1 leans on pull1 leans on sk1');
  check('deleting a leaf takes only the leaf',
    ids(deps.withoutFeatures(DOC, ['cut1'])) === 'sk1,pull1,hole1,b1',
    ids(deps.withoutFeatures(DOC, ['cut1'])));
  check('deleting from the middle keeps what came before',
    ids(deps.withoutFeatures(DOC, ['hole1'])) === 'sk1,pull1,b1',
    ids(deps.withoutFeatures(DOC, ['hole1'])));
  check('the surviving features keep their timeline order',
    ids(deps.withoutFeatures(DOC, ['b1'])) === 'sk1,pull1,hole1',
    'a delete must not double as an invisible reorder');

  console.log('\n=== and says so, in words a student can act on ===');

  check('deleting a sketch names what goes with it',
    deps.whyDeletingCosts(DOC, ['sk1'], label)
      === 'Pull 1, Hole 1 and Cut 1 are built from Sketch 1, so they go too.',
    String(deps.whyDeletingCosts(DOC, ['sk1'], label)));
  check('...and reads as one thing when only one thing goes',
    deps.whyDeletingCosts(DOC, ['b1'], label)
      === 'Cut 1 is built from Box 1, so it goes too.',
    String(deps.whyDeletingCosts(DOC, ['b1'], label)));
  check('...and says nothing at all when nothing else is lost',
    deps.whyDeletingCosts(DOC, ['cut1'], label) === null,
    String(deps.whyDeletingCosts(DOC, ['cut1'], label)));
  check('...naming only the extras, never the thing that was asked for',
    !String(deps.whyDeletingCosts(DOC, ['sk1'], label)).startsWith('Sketch 1,'),
    'the student knows what they clicked; the sentence is for the rest');

  console.log('\n=== the cross-check: no source that uses what it never declared ===');

  // Two detectors, both exact, neither guessing.
  //
  // The first takes the universe of ids explicitly. An earlier version derived
  // it from the document being checked, which is precisely wrong: the id that
  // dangles is the one that was REMOVED, so it is never in that document and
  // was never looked for. The control below caught that -- it went green
  // against source that visibly used an undeclared `sk1` -- which is the whole
  // reason the control is there.
  function usesRemovedIds(doc, universe) {
    const src = String(gen.toReshape(doc));
    const at = src.indexOf('function main');
    if (at < 0) return ['(no main)'];
    const body = src.slice(at, src.indexOf('module.exports', at));
    const here = new Set(doc.features.map((f) => f.id));
    return universe.filter((id) => !here.has(id)
      && new RegExp('(^|[^\\w$.])' + id + '([^\\w$]|$)').test(body));
  }

  // The second needs no universe at all: every parameter the generated main()
  // reads has to be one getParameterDefinitions actually declares. `p.sk1_offset`
  // survived the old delete and was undefined at runtime, which is the same
  // defect showing up on the parameter side rather than the variable side.
  function undeclaredParams(doc) {
    const src = String(gen.toReshape(doc));
    const declared = new Set();
    const re = /name:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) declared.add(m[1]);
    const at = src.indexOf('function main');
    const body = src.slice(at, src.indexOf('module.exports', at));
    const used = new Set();
    const ru = /\bp\.([A-Za-z_$][\w$]*)/g;
    while ((m = ru.exec(body))) used.add(m[1]);
    return [...used].filter((u) => !declared.has(u));
  }

  const ALL = DOC.features.map((f) => f.id);

  check('CONTROL: the intact document generates source that declares everything',
    usesRemovedIds(DOC, ALL).length === 0 && undeclaredParams(DOC).length === 0,
    JSON.stringify([usesRemovedIds(DOC, ALL), undeclaredParams(DOC)]));

  // The exact edit that shipped broken: the OLD delete, which removed the
  // sketch and filtered combines only.
  const oldDelete = { ...DOC, features: DOC.features
    .filter((f) => f.id !== 'sk1')
    .filter((f) => f.kind !== 'combine' || f.targets.every((t) => t !== 'sk1')) };
  check('CONTROL: the delete this replaced really does leave a use with no declaration',
    usesRemovedIds(oldDelete, ALL).includes('sk1')
      && undeclaredParams(oldDelete).includes('sk1_offset'),
    'if this stops failing, the checks below are measuring nothing: '
      + JSON.stringify([usesRemovedIds(oldDelete, ALL), undeclaredParams(oldDelete)]));

  check('...and the cascading delete leaves none',
    usesRemovedIds(deps.withoutFeatures(DOC, ['sk1']), ALL).length === 0
      && undeclaredParams(deps.withoutFeatures(DOC, ['sk1'])).length === 0,
    JSON.stringify([usesRemovedIds(deps.withoutFeatures(DOC, ['sk1']), ALL),
      undeclaredParams(deps.withoutFeatures(DOC, ['sk1']))]));
  check('...for a delete anywhere in the chain',
    ['pull1', 'hole1', 'b1', 'cut1'].every((id) => {
      const d = deps.withoutFeatures(DOC, [id]);
      return usesRemovedIds(d, ALL).length === 0
        && undeclaredParams(d).length === 0
        && deps.danglingRefs(d).length === 0;
    }),
    'one of the four leaves a broken document');
  check('...and for deleting everything at once',
    deps.withoutFeatures(DOC, DOC.features.map((f) => f.id)).features.length === 0);

  console.log('\n=== danglingRefs is an invariant, so it has to be able to fail ===');

  const broken = { version: 1, features: [
    { id: 'pull1', kind: 'extrude', target: 'sk1', height: 12 },
  ] };
  check('a reference to a feature that is not there is reported',
    deps.danglingRefs(broken).length === 1
      && deps.danglingRefs(broken)[0].feature === 'pull1'
      && deps.danglingRefs(broken)[0].missing === 'sk1',
    JSON.stringify(deps.danglingRefs(broken)));

  // Out of dependency order on purpose. The timeline enforces order on reorder
  // but nothing enforces it on load, and a single forward pass would walk past
  // the Pull before knowing the sketch was doomed.
  const outOfOrder = { version: 1, features: [
    { id: 'hole1', kind: 'hole', target: 'pull1', diameter: 8, depth: 30,
      center: [0, 0, 0], axis: 'z' },
    { id: 'pull1', kind: 'extrude', target: 'sk1', height: 12 },
    { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
      points: [[0, 0], [40, 0], [40, 25], [0, 25]] },
  ] };
  check('an out-of-order document is still walked to a fixed point',
    deps.withoutFeatures(outOfOrder, ['sk1']).features.length === 0,
    ids(deps.withoutFeatures(outOfOrder, ['sk1'])));


  console.log('\n=== a selection can be a NAME, and dangle just the same ===');

  // Round and Draft hold a TopoName, not just a target id. The edge a Round
  // works on is the meeting of two faces, and those faces can belong to a
  // feature other than the one being rounded -- a dependency no `target` field
  // shows. dependsOn() folds it in, so everything above works on it unchanged.
  const face = (feature, part) => ({ cause: 'primitive', feature, kind: 'face', part });
  const NAMED = { version: 1, features: [
    { id: 'b1', kind: 'box', size: [40, 30, 20], center: [0, 0, 0] },
    { id: 'b2', kind: 'box', size: [10, 10, 40], center: [30, 0, 0] },
    { id: 'cut1', kind: 'combine', op: 'subtract', targets: ['b1', 'b2'] },
    { id: 'r1', kind: 'fillet', target: 'cut1', size: 4, style: 'fillet',
      edge: { cause: 'between', feature: 'cut1', kind: 'edge',
              of: [face('b1', '+z'), face('b1', '+x')] } },
  ] };
  const nlabel = (id) => ({ b1: 'Box 1', b2: 'Box 2', cut1: 'Cut 1', r1: 'Round 1' }[id] || id);

  check('CONTROL: a document whose Round names a live face is clean',
    deps.danglingRefs(NAMED).length === 0, JSON.stringify(deps.danglingRefs(NAMED)));
  check('a Round depends on the feature its EDGE names, not only on its target',
    deps.orphanedBy(NAMED, ['b1']).has('r1'),
    'r1 targets cut1, but its edge is named off b1');
  check('...so deleting that feature takes the Round with it, and says so',
    deps.whyDeletingCosts(NAMED, ['b1'], nlabel)
      === 'Cut 1 and Round 1 are built from Box 1, so they go too.',
    String(deps.whyDeletingCosts(NAMED, ['b1'], nlabel)));
  check('...and a Round left naming a feature that is gone is reported dangling',
    deps.danglingRefs({ version: 1, features: [NAMED.features[3]] })
      .some((d) => d.missing === 'b1'),
    JSON.stringify(deps.danglingRefs({ version: 1, features: [NAMED.features[3]] })));
  check('a Draft with no named face depends only on its target',
    deps.orphanedBy({ version: 1, features: [
      NAMED.features[0],
      { id: 'd1', kind: 'draft', target: 'b1', whole: true, angle: 8, pull: 'z', neutral: -10 },
    ] }, ['b1']).has('d1'),
    'Body Draft names no face, so its only tie is the target');

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
