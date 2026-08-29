// An arc's endpoints belong to the arc.
//
// Every check here exists because some mover in the app treated a fillet's
// trim point as a free point: the drag handles did (M1), the constraint solver
// did (M2), and the Rules panel could collapse an edge to nothing and have the
// result called valid (M3). The fix was to stop storing trim points at all --
// a sketch holds its design corners plus a radius per rounded corner, and
// outlineOf() derives the rest.
//
// A fix like that is easy to assert degenerately: under the new design the
// movers simply never see the arc, so almost anything measured comes out right
// for free. So the checks below carry CONTROLS built through filletCorner() in
// the old stored shape and run through the identical operation. If a control
// stops breaking, the check beside it is measuring nothing and says so. Every
// pinned number was measured, both ways, before it was written down.

module.exports = function run(dir) {
  const path = require('path');
  const fs = require('fs');
  const vm = require('vm');
  const arc = require(path.join(dir, 'sketch-arc.js'));
  const gen = require(path.join(dir, 'model-codegen.js'));
  const handles = require(path.join(dir, 'model-handles.js'));
  const solve = require(path.join(dir, 'sketch-solve.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const rect = () => [[0, 0], [40, 0], [40, 25], [0, 25]];
  const sk = (extra = {}) => ({
    id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: rect(), ...extra,
  });
  const doc = (f) => ({ version: 1, features: [f] });

  const unit = (v) => { const L = Math.hypot(v[0], v[1]); return [v[0] / L, v[1] / L]; };
  const between = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));

  // Radius of the (single) arc in an outline, plus the worst tangent break at
  // its two joints. The kink is the measurement that matters: a fillet whose
  // radius is right but whose ends no longer meet the straight edges is not a
  // rounded corner, it is a notch. M1's own damage report is a kink number
  // (0 -> 33.4 degrees), not a radius number.
  function arcOf(o) {
    const keys = Object.keys(o.bulges || {}).map(Number).filter((k) => o.bulges[k]);
    if (keys.length !== 1) return null;
    const k = keys[0];
    const n = o.points.length;
    const a = o.points[k];
    const b = o.points[(k + 1) % n];
    const g = o.bulges[k];
    const A = arc.arcFromBulge(a, b, g);
    let sweep = A.endAngle - A.startAngle;
    if (g > 0 && sweep < 0) sweep += Math.PI * 2;
    if (g < 0 && sweep > 0) sweep -= Math.PI * 2;
    const s = Math.sign(sweep);
    const t0 = [-Math.sin(A.startAngle) * s, Math.cos(A.startAngle) * s];
    const t1 = [-Math.sin(A.endAngle) * s, Math.cos(A.endAngle) * s];
    const p = o.points[(k - 1 + n) % n];
    const q = o.points[(k + 2) % n];
    return {
      radius: A.radius,
      kink: Math.max(
        between(unit([a[0] - p[0], a[1] - p[1]]), t0),
        between(t1, unit([q[0] - b[0], q[1] - b[1]])),
      ),
    };
  }

  const area = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  };

  // The round-3 shape of the same sketch: the fillet baked into the point list
  // and the constraints reindexed past the seam, exactly as roundSketchCorner
  // used to do it. This is the control, and it must still break.
  const storedForm = (constraints) => {
    const f = arc.filletCorner({ points: rect(), constraints }, 1, 8);
    return { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, ...f };
  };

  // Tangent break below this counts as zero. Measured worst case on a correct
  // implementation across the whole drag sweep below: 1.5e-8 rad, which is
  // trim-point float noise. The defect it has to separate from is 5.8e-1 rad
  // (33.4 degrees) -- seven orders of magnitude away, so this is not a
  // tolerance anything can hide behind.
  const FLAT = 1e-6;

  // ------------------------------------------------------------------ C1 --
  console.log('\n=== C1 the round survives a drag on the corner beside it (M1) ===');

  let worstR = 0;
  let worstKink = 0;
  for (const u of [40, 38, 35, 30, 25, 16, 12]) {
    const moved = gen.applyParam(doc(sk({ rounds: { 1: 8 } })), 'sk1_p1u', u).features[0];
    const info = arcOf(arc.outlineOf(moved));
    if (!info) { worstR = Infinity; break; }
    worstR = Math.max(worstR, Math.abs(info.radius - 8));
    worstKink = Math.max(worstKink, info.kink);
  }
  check('#C1 dragging design corner 2 across u leaves the round at exactly 8',
    worstR < 1e-9,
    `worst radius error ${worstR} across u in {40,38,35,30,25,16,12}`);
  check('...and the arc still meets both straight edges (no tangent break)',
    worstKink < FLAT, `worst kink ${worstKink} rad`);

  // The control. Same drag, same distances, on the stored form. If this stops
  // blowing up, the drag being measured is not reaching an arc at all and #C1
  // above is proving nothing.
  const controlR = [30, 25, 10, 1].map((u) => {
    const moved = gen.applyParam(doc(storedForm()), 'sk1_p1u', u).features[0];
    const info = arcOf(moved);
    return info ? info.radius : NaN;
  });
  check('...CONTROL: the same drag on the round-3 stored form really does rescale it',
    Math.abs(controlR[0] - 9.0554) < 1e-3 && Math.abs(controlR[1] - 12.0208) < 1e-3
      && Math.abs(controlR[2] - 21.9545) < 1e-3 && Math.abs(controlR[3] - 28.1514) < 1e-3,
    `got ${controlR.map((r) => r.toFixed(4)).join(', ')} at u = 30, 25, 10, 1; expected `
      + '9.0554, 12.0208, 21.9545, 28.1514. All 8.0000 means the control is broken and '
      + '#C1 above is measuring nothing');

  // ------------------------------------------------------------------ C2 --
  console.log('\n=== C2 the round survives the constraint solver (M2) ===');

  const SETS = [
    ['length e0=40', [{ kind: 'length', edge: 0, value: 40 }]],
    ['length e1=25', [{ kind: 'length', edge: 1, value: 25 }]],
    ['equal(0,2)', [{ kind: 'equal', edge: 0, other: 2 }]],
    ['lock0+len e0', [{ kind: 'lock', corner: 0 }, { kind: 'length', edge: 0, value: 40 }]],
    // Not one of M2's four. Those four are all rules a fresh rectangle ALREADY
    // obeys -- which under this design means the solver has nothing to do, so a
    // check built only on them would also pass against an implementation that
    // had simply switched the solver off. This one really moves the design,
    // from [[0,0],[40,0],..] to [[-10,0],[50,0],..], and the round has to
    // survive that rather than survive nothing happening.
    ['length e0=60', [{ kind: 'length', edge: 0, value: 60 }]],
  ];

  for (const [name, cs] of SETS) {
    const solved = gen.solveDoc(doc(sk({ rounds: { 1: 8 }, constraints: cs }))).features[0];
    const info = arcOf(arc.outlineOf(solved));
    check(`#C2 ${name}: the rule takes AND the round stays 8.0000`,
      info !== null && Math.abs(info.radius - 8) < 1e-9 && info.kink < FLAT
        && solve.residualOf(solved.points, cs) < 1e-7,
      info === null ? 'no arc in the outline at all'
        : `radius ${info.radius.toFixed(4)}, kink ${info.kink}, residual `
          + solve.residualOf(solved.points, cs));
  }

  const moving = gen.solveDoc(doc(sk({ rounds: { 1: 8 }, constraints: SETS[4][1] }))).features[0];
  check('...and length e0=60 really did move the design (so C2 is not measuring a no-op)',
    Math.abs(moving.points[0][0] + 10) < 1e-6 && Math.abs(moving.points[1][0] - 50) < 1e-6,
    `design came back ${JSON.stringify(moving.points)} -- unchanged means the solver did `
      + 'nothing and every #C2 above passed for the wrong reason');

  const controlSolve = (cs) => {
    const out = gen.solveDoc(doc(storedForm(cs))).features[0];
    const info = arcOf(out);
    return info ? info.radius : NaN;
  };
  const k1 = controlSolve([{ kind: 'length', edge: 0, value: 40 }]);
  const k2 = controlSolve([{ kind: 'equal', edge: 0, other: 2 }]);
  const k3 = controlSolve([{ kind: 'lock', corner: 0 }, { kind: 'length', edge: 0, value: 40 }]);
  check('...CONTROL: the same rules on the round-3 stored form really do rescale it',
    Math.abs(k1 - 6.3246) < 1e-3 && Math.abs(k2 - 7.0711) < 1e-3 && Math.abs(k3 - 5.6569) < 1e-3,
    `got ${[k1, k2, k3].map((r) => r.toFixed(4)).join(', ')}; expected 6.3246 (-20.94%), `
      + '7.0711 (-11.61%), 5.6569 (-29.29%). All 8.0000 means the control is broken');

  // ------------------------------------------------------------------ C3 --
  console.log('\n=== C3 a rule that would collapse an edge is refused, and only that (M3) ===');

  // Half one: the collapse. The solver on its own really does drive both
  // corners of edge 0 onto the same point and call it solved -- residual 0,
  // nothing over-constrained -- which is exactly why residual cannot be the
  // gate. The collapse is what SATISFIES the rule.
  const raw = solve.solveSketch(rect(), [{ kind: 'vertical', edge: 0 }]);
  check('#C3 the bare solver DOES collapse edge 0 to nothing, at residual 0',
    Math.hypot(raw.points[1][0] - raw.points[0][0], raw.points[1][1] - raw.points[0][1]) < 1e-9
      && raw.residual < 1e-9 && !raw.overConstrained,
    `solver returned ${JSON.stringify(raw.points)}, residual ${raw.residual}`);

  const refused = gen.solveDoc(doc(sk({ constraints: [{ kind: 'vertical', edge: 0 }] }))).features[0];
  check('...and solveDoc refuses it, leaving the design exactly as it was',
    JSON.stringify(refused.points) === JSON.stringify(rect()),
    `doc came back ${JSON.stringify(refused.points)}`);

  const collapsedWhy = arc.outlineOf(sk({ points: raw.points.map((p) => [p[0], p[1]]) })).why;
  check('...with a reason that names no remedy this code cannot provide',
    typeof collapsedWhy === 'string' && collapsedWhy.length > 20
      && !/rules panel|round a corner/i.test(collapsedWhy),
    String(collapsedWhy));

  // Half two, and it is required: a gate that refused EVERYTHING would pass
  // half one on its own. The sliver is the interesting entry -- 0.0001 units
  // is 2.5x the relative tolerance on a 40-unit span, deliberately close to
  // the line, and still has to be let through.
  for (const [name, f] of [
    ['a plain rectangle', sk()],
    ['a rectangle with all four corners rounded', sk({ rounds: { 0: 8, 1: 8, 2: 8, 3: 8 } })],
    ['a 40 x 0.0001 sliver', sk({ points: [[0, 0], [40, 0], [40, 0.0001], [0, 0.0001]] })],
    ['a triangle', sk({ points: [[0, 0], [40, 0], [0, 30]] })],
  ]) {
    check(`...and ${name} is accepted`, arc.outlineOf(f).ok === true);
  }

  // ------------------------------------------------------------------ C4 --
  console.log('\n=== C4 derived and stored describe the same shape ===');

  const four = sk({ rounds: { 0: 8, 1: 8, 2: 8, 3: 8 } });
  const derived = arc.outlineOf(four);
  let stored = { points: rect() };
  for (const k of [3, 2, 1, 0]) stored = arc.filletCorner(stored, k, 8);

  const derivedArea = area(arc.tessellate({ points: derived.points, bulges: derived.bulges }));
  const storedArea = area(arc.tessellate(stored));
  check('#C4 all four corners rounded gives 8 outline points, derived and stored alike',
    derived.points.length === 8 && stored.points.length === 8,
    `derived ${derived.points.length}, stored ${stored.points.length}`);
  check('...and the same area, 944.49 (a 40x25 rectangle minus four r=8 corners)',
    Math.abs(derivedArea - 944.4882) < 0.01 && Math.abs(storedArea - 944.4882) < 0.01,
    `derived ${derivedArea.toFixed(4)}, stored ${storedArea.toFixed(4)} -- 1000.00 means no `
      + 'round was applied at all, and the two differing means the derivation drifted from '
      + 'filletCorner');
  check('...every outline point is attributed to a design corner, both trim points to theirs',
    derived.basis.length === 8
      && JSON.stringify(derived.basis) === JSON.stringify([0, 0, 1, 1, 2, 2, 3, 3]),
    JSON.stringify(derived.basis));

  const unrounded = arc.outlineOf(sk({ rounds: { 1: 0 } }));
  check('...and a round of 0 is no round: 4 points, area 1000.00',
    unrounded.points.length === 4 && Math.abs(area(unrounded.points) - 1000) < 1e-6,
    `${unrounded.points.length} points, area ${area(unrounded.points).toFixed(2)}`);

  // The clamp has to report the number the outline USED, not the number this
  // corner could have taken on its own: corner 2's round eats part of the edge
  // corner 1 wanted, so 12.5 comes back as 8.5 and the message has to say 8.5.
  const shared = arc.outlineOf(sk({ rounds: { 1: 12.5, 2: 8 } }));
  check('...a round clamped by its NEIGHBOUR is reported at the shared number',
    shared.notes.length === 1 && shared.notes[0].corner === 1
      && Math.abs(shared.notes[0].want - 12.5) < 1e-9
      && Math.abs(shared.notes[0].got - 8.5) < 1e-6,
    `${JSON.stringify(shared.notes)} -- 12.5 is the design-only ceiling, which the student `
      + 'cannot actually have here');

  // `rounds` is keyed by CORNER while `bulges` is keyed by EDGE, and reindex()
  // has to shift them on their own rules. Pressing Corner splits edge 0, which
  // inserts a design corner at index 1 -- so a round on corner 1 belongs to
  // corner 2 afterwards. Getting this wrong slides a student's radius onto a
  // corner they never chose, silently, on a button press that is supposed to
  // leave the outline exactly where it was.
  const types = require(path.join(dir, 'model-types.js'));
  const split = types.addCorner(sk({ rounds: { 1: 8 } }), 0);
  check('...Corner moves a round with its corner (1 -> 2), not with its index',
    split.points.length === 5 && split.rounds && split.rounds[2] === 8
      && split.rounds[1] === undefined,
    `${split.points.length} points, rounds ${JSON.stringify(split.rounds)}`);
  check('...and the outline it produces still carries exactly one r=8 arc',
    (() => {
      const info = arcOf(arc.outlineOf(split));
      return info !== null && Math.abs(info.radius - 8) < 1e-9 && info.kink < FLAT;
    })(),
    JSON.stringify(arc.outlineOf(split).bulges));

  // ------------------------------------------------------------ CHAMFER --
  console.log('\n=== C6 chamfer: a straight slice, request-not-geometry, like round ===');

  // A plain chamfer: corner 0 of a rectangle at distance 5. Unlike a round it
  // writes NO arc -- the two trim points are joined by a straight edge, so the
  // outline is 5 corners and no bulge.
  const chamf = arc.outlineOf(sk({ chamfers: { 0: 5 } }));
  check('#C6 a chamfered corner produces two trim points and no arc',
    chamf.points.length === 5
      && Math.abs(chamf.points[0][0] - 0) < 1e-9 && Math.abs(chamf.points[0][1] - 5) < 1e-9
      && Math.abs(chamf.points[1][0] - 5) < 1e-9 && Math.abs(chamf.points[1][1] - 0) < 1e-9
      && (chamf.bulges === undefined || Object.keys(chamf.bulges).length === 0),
    `points ${JSON.stringify(chamf.points)}, bulges ${JSON.stringify(chamf.bulges)} -- a chamfer `
      + 'must be a straight edge (no bulge), unlike a round');
  check('...every outline point is attributed to a design corner',
    chamf.basis.length === 5 && JSON.stringify(chamf.basis) === JSON.stringify([0, 0, 1, 2, 3]),
    JSON.stringify(chamf.basis));

  // The clamp. Chamfer's input IS the trim distance, so the ceiling is the
  // shorter adjacent edge (25 for a 40x25 corner) and a request past it has to
  // be clamped AND reported.
  const clampedChamf = arc.outlineOf(sk({ chamfers: { 0: 500 } }));
  check('#C6 a chamfer clamped by the ceiling is reported at the used number',
    clampedChamf.points.length === 5
      && clampedChamf.notes.length === 1 && clampedChamf.notes[0].corner === 0
      && Math.abs(clampedChamf.notes[0].want - 500) < 1e-9
      && Math.abs(clampedChamf.notes[0].got - 25) < 1e-6,
    `${JSON.stringify(clampedChamf.notes)} -- a chamfer request of 500 on a 25-unit edge must `
      + 'clamp to 25 and say so');

  // A chamfer next to a curved edge is refused, like a round: chamfer reads
  // both edges as straight chords and would slice the arc. Refusing leaves the
  // outline exactly as the arc already described it, and reports got: 0.
  const filletedTri = arc.filletCorner({ points: [[0, 0], [40, 0], [0, 30]] }, 1, 5);
  const curvedChamf = arc.outlineOf({
    points: filletedTri.points, bulges: filletedTri.bulges, chamfers: { 2: 5 },
  });
  check('#C6 a chamfer next to a curved edge is refused, not silently wrong',
    curvedChamf.points.length === filletedTri.points.length
      && Math.abs(curvedChamf.bulges[1] - filletedTri.bulges[1]) < 1e-12
      && curvedChamf.notes.length === 1 && curvedChamf.notes[0].corner === 2
      && Math.abs(curvedChamf.notes[0].got) < 1e-9,
    `points ${JSON.stringify(curvedChamf.points)}, bulges ${JSON.stringify(curvedChamf.bulges)}`
      + `, notes ${JSON.stringify(curvedChamf.notes)} -- the arc must survive untouched`);

  // The conflict rule: a corner in BOTH rounds and chamfers is rounded, the
  // chamfer dropped. Corner 1 here has round 8 and chamfer 10; the corner must
  // come out ARCED (a bulge, two trim points), not sliced.
  const both = arc.outlineOf(sk({ rounds: { 1: 8 }, chamfers: { 1: 10 } }));
  const bothKeys = Object.keys(both.bulges || {}).map(Number);
  check('#C6 when a corner carries BOTH a round and a chamfer, round wins',
    bothKeys.length === 1 && bothKeys[0] === 1
      && Math.abs(both.bulges[1] - 0.41421356237309503) < 1e-9
      && both.points.length === 5
      && Math.abs(both.points[1][0] - 32) < 1e-9 && Math.abs(both.points[2][1] - 8) < 1e-9,
    `points ${JSON.stringify(both.points)}, bulges ${JSON.stringify(both.bulges)} -- the corner `
      + 'must come out ARCED (round wins) not sliced (chamfer would win)');
  check('...and the chamfer ask for that corner is not reported (it was ignored, not clamped)',
    both.notes.length === 0, JSON.stringify(both.notes));

  // The legacy-passthrough gate. A doc with `chamfers` and no `rounds` is NOT
  // a legacy bulges-only outline -- it has to be processed. If it wrongly took
  // the passthrough branch it would come back with the raw 4 design corners
  // and no trim.
  const chamfOnly = arc.outlineOf(sk({ chamfers: { 1: 8 } }));
  check('#C6 a chamfers-only doc is processed, not passed through as legacy',
    chamfOnly.points.length === 5
      && Math.abs(chamfOnly.points[2][0] - 40) < 1e-9 && Math.abs(chamfOnly.points[2][1] - 8) < 1e-9
      && chamfOnly.points[1][0] === 32 && chamfOnly.points[1][1] === 0,
    `points ${JSON.stringify(chamfOnly.points)} -- 4 points means the doc took the legacy `
      + 'bulges-only passthrough and the chamfer was ignored');

  // ------------------------------------------------------------------ C5 --
  console.log('\n=== C5 the generated source drags live ===');

  const src = gen.toReshape({
    version: 1,
    features: [
      sk({ rounds: { 1: 8 } }),
      { id: 'pull1', kind: 'extrude', target: 'sk1', height: 10 },
    ],
  });
  const at = src.indexOf('const sk1 =');
  const call = src.slice(at, src.indexOf('\n', at));
  check('#C5 a rounded sketch emits roundPoly, not a baked outline',
    /roundPoly\(\[/.test(call), call);
  check('...its corners are PARAMETERS, so a drag moves the shape without regenerating',
    ['p.sk1_p0u', 'p.sk1_p1u', 'p.sk1_p2u', 'p.sk1_p3u'].every((n) => call.includes(n)),
    `${call} -- literal trim points here mean the corner parameters are referenced by `
      + 'nothing, so the shape freezes mid-drag and only catches up on release');
  check('...and so is the radius, which is the only live readout of it anywhere',
    call.includes('p.sk1_r1') && src.includes("{ name: 'sk1_r1', type: 'float', initial: 8"),
    call);
  // The corner list specifically: a bare number anywhere in it is a baked
  // trim point, which is the freeze-mid-drag failure. (The rounds map beside
  // it legitimately contains the corner INDEX as a key, so the whole call
  // cannot be scanned for digits.)
  const cornerList = call.slice(call.indexOf('roundPoly([') + 10, call.indexOf(']],') + 1);
  check('...no coordinate is emitted as a literal in the corner list',
    // Regex LITERAL, not new RegExp(a string): inside a string the \\d collapsed to a
    // bare d, so this was a character class of 'd' and '.', matched nothing, and
    // stayed green when every coordinate was emitted as a baked literal. Watched
    // failing after the fix, against that same sabotage.
    !/\[\s*-?[\d.]/.test(cornerList), cornerList);

  // The generated helper is a second implementation of the same arithmetic --
  // it has to be, it runs inside the sandboxed frame with no imports. So it is
  // measured against the first one rather than trusted. This is the only thing
  // that catches the two drifting apart.
  // Both helpers by name, in dependency order -- toReshape emits them in
  // whatever order the needs set happened to fill, so slicing a range from
  // one of them silently drops the other.
  const fnSrc = (name) => {
    const i = src.indexOf(`function ${name}(`);
    return i < 0 ? '' : src.slice(i, src.indexOf('\n}', i) + 2);
  };
  const helperSrc = `${fnSrc('polyArc')}\n${fnSrc('roundPoly')}`;
  const captured = [];
  const sandbox = {
    Math,
    Object,
    Number,
    geometries: { geom2: { fromPoints: (pts) => { captured.push(pts); return pts; } } },
  };
  vm.createContext(sandbox);

  // Four requests, not one. A single r=8 round on a 40x25 rectangle sits well
  // under every limit, so it exercises none of the arithmetic the two copies
  // could disagree about -- watched: deleting the clamp from the generated
  // helper left this check green while r=8 was the only case. 12.5+8 makes the
  // two rounds fight over the edge between them (descending order, and the
  // second clamp), all-four fills the ring, and 500 is a request only a clamp
  // can survive.
  const CASES = [
    ['one modest round', { 1: 8 }],
    ['two rounds sharing an edge', { 1: 12.5, 2: 8 }],
    ['all four', { 0: 8, 1: 8, 2: 8, 3: 8 }],
    ['a request far past the ceiling', { 1: 500 }],
  ];
  for (const [label, rounds] of CASES) {
    captured.length = 0;
    vm.runInContext(
      `${helperSrc}\nroundPoly([[0,0],[40,0],[40,25],[0,25]], ${JSON.stringify(rounds)}, {})`,
      sandbox);
    const fromHelper = captured[0];
    const o = arc.outlineOf(sk({ rounds }));
    const fromLib = arc.tessellate({ points: o.points, bulges: o.bulges });
    check(`...the generated roundPoly agrees with outlineOf: ${label}`,
      Array.isArray(fromHelper) && fromHelper.length === fromLib.length
        && fromHelper.every((p, i) => Math.abs(p[0] - fromLib[i][0]) < 1e-9
          && Math.abs(p[1] - fromLib[i][1]) < 1e-9),
      `helper gave ${Array.isArray(fromHelper) ? fromHelper.length : 'nothing'} points, lib `
        + `gave ${fromLib.length} -- two separate implementations of the same trim/bulge `
        + 'arithmetic, and this is the only thing tying them together');
    check(`...(and ${label} is a real sampled outline, not two empty lists)`,
      fromLib.length > 8 && Array.isArray(fromHelper) && fromHelper.length > 8,
      `lib ${fromLib.length}, helper ${Array.isArray(fromHelper) ? fromHelper.length : 'n/a'}`);
  }

  // Unchanged: a doc with bulges and no rounds is somebody else's outline.
  const legacySrc = gen.toReshape(doc(sk({
    points: [[0, 0], [25, 0], [28, 9], [0, 30]],
    bulges: { 1: 0.720748 },
  })));
  check('#C4 a bulges-no-rounds doc still emits polyArc, untouched',
    /polyArc\(\[/.test(legacySrc) && !legacySrc.includes('roundPoly(['), legacySrc);

  // --------------------------------------------------------- the handles --
  console.log('\n=== the handles a student can actually grab ===');

  const specs = handles.handlesFor(sk({ rounds: { 1: 8 } }));
  check('one point handle per DESIGN corner, and not one on either trim point',
    specs.filter((h) => h.kind === 'point').length === 4
      && specs.every((h) => h.param !== 'sk1_p4u'),
    specs.map((h) => h.param).join(', '));
  const rh = specs.find((h) => h.kind === 'radius');
  check('...plus one radius handle, sitting where the arc leaves the outgoing edge',
    rh !== undefined && rh.param === 'sk1_r1'
      && Math.abs(rh.origin[0] - 40) < 1e-6 && Math.abs(rh.origin[1] - 8) < 1e-6,
    rh ? JSON.stringify(rh) : 'no radius handle emitted');
  check('...and one unit of drag along that edge is tan(interior/2) of radius',
    rh !== undefined && Math.abs(rh.scale - 1) < 1e-9, rh && String(rh.scale));
  // The rectangle is degenerate for THIS law and only this law: interior is 90
  // degrees, tan(45) = 1, so scale === 1 is also what you get from deleting the
  // law entirely. Measured: replacing `scale: half` with `scale: 1` left the
  // check above green. A 3-4-5 triangle's corner 1 is ~36.87 degrees, where the
  // right answer is 1/3 and a missing law gives 1.
  const triRadius = handles.handlesFor({
    id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
    points: [[0, 0], [40, 0], [0, 30]], rounds: { 1: 5 },
  }).find((h) => h.kind === 'radius');
  check('...and that law is checked at an angle where it is not 1',
    triRadius !== undefined && Math.abs(triRadius.scale - 1 / 3) < 1e-6,
    `scale ${triRadius && triRadius.scale} at a 36.87-degree corner; 1 means the `
      + 'tan(interior/2) law is gone and the rectangle could not tell');
  check('...no radius handle on a corner nobody has rounded',
    handles.handlesFor(sk()).every((h) => h.kind !== 'radius'));

  // The handle's whole round trip: the param it names has to be one applyParam
  // will actually write, and the value has to land on `rounds` rather than
  // anywhere else. Watched failing for real: the r<n> pattern shipped as
  // /^r(d+)$/ -- one backslash eaten between here and the file -- so the
  // handle moved, the readout followed it, and the doc silently kept the old
  // radius. Every check above passed; only the browser noticed. A handle whose
  // param nothing consumes is a control that claims to work and doesn't, which
  // is the failure this codebase keeps closing one instance at a time.
  const pulled = gen.applyParam(doc(sk({ rounds: { 1: 8 } })), rh ? rh.param : 'sk1_r1', 11.5);
  check('...and applyParam writes that exact param onto rounds',
    pulled.features[0].rounds && Math.abs(pulled.features[0].rounds[1] - 11.5) < 1e-9,
    `rounds came back ${JSON.stringify(pulled.features[0].rounds)} for param `
      + `${rh ? rh.param : 'sk1_r1'} -- unchanged means the handle drives nothing`);
  const zeroed = gen.applyParam(doc(sk({ rounds: { 1: 8 } })), 'sk1_r1', 0);
  check('...and dragging it to nothing un-rounds rather than storing a dead zero',
    zeroed.features[0].rounds && !(1 in zeroed.features[0].rounds),
    JSON.stringify(zeroed.features[0].rounds));
  check('...while a param for a corner that does not exist is refused',
    gen.applyParam(doc(sk({ rounds: { 1: 8 } })), 'sk1_r9', 5).features[0].rounds[9] === undefined);

  // ------------------------------------------------------------------ M4 --
  console.log('\n=== arcFromBulge past a half turn (M4, and it was NOT splitEdge) ===');

  // The brief blamed splitEdge's half-angle formula. It is correct: measured
  // against tan(sweep/8) it agrees to 1e-12 at every bulge below. The wrong
  // answer was arcFromBulge's centre, on the wrong side of the chord for a
  // major arc.
  // These used to evaluate the formula inline and compare it with itself, which
  // is a claim about arithmetic, not about splitEdge -- replacing splitEdge's
  // halfBulge with `bulge / 2` left every one of them green. Ask splitEdge.
  for (const b of [0.414214, 1.0, 1.2, 2.0, 5.0]) {
    const wantSweep = 4 * Math.atan(b);
    const want = Math.tan(wantSweep / 8);
    const sp = arc.splitEdge({ points: [[0, 0], [10, 0], [10, 10]], bulges: { 0: b } }, 0);
    check(`splitEdge's half bulge at b=${b} is tan(sweep/8), as it always was`,
      sp.bulges && Math.abs(sp.bulges[0] - want) < 1e-12
        && Math.abs(sp.bulges[1] - want) < 1e-12,
      `halves ${sp.bulges && JSON.stringify([sp.bulges[0], sp.bulges[1]])} vs ${want}`);
  }

  // Measured at the arc's OWN apex, not as |centre.v| + radius. That second
  // formula is symmetric in the centre's sign -- it returns 10 for the centre
  // at [5,-3.75] AND for the wrong one at [5,3.75] -- so it cannot tell a
  // fixed implementation from the broken one. Watched: flipping the sign back
  // left this check green until it was rewritten to walk the arc.
  const major = arc.arcFromBulge([0, 0], [10, 0], 2);
  let majorSweep = major.endAngle - major.startAngle;
  if (majorSweep < 0) majorSweep += Math.PI * 2;
  const apex = [
    major.center[0] + major.radius * Math.cos(major.startAngle + majorSweep / 2),
    major.center[1] + major.radius * Math.sin(major.startAngle + majorSweep / 2),
  ];
  const sagitta = Math.hypot(apex[0] - 5, apex[1] - 0);
  check('#M4 bulge 2 on a 10-unit chord sweeps 4*atan(2) = 253.74 degrees',
    Math.abs(majorSweep - 4 * Math.atan(2)) < 1e-9,
    `got ${(majorSweep * 180 / Math.PI).toFixed(2)} degrees with centre `
      + `${JSON.stringify(major.center)} -- 106.26 is the un-flipped answer`);
  check('...so its apex stands halfChord * |bulge| = 10 off the chord, not 2.5',
    Math.abs(sagitta - 10) < 1e-9,
    `apex ${JSON.stringify(apex)} is ${sagitta.toFixed(4)} from the chord midpoint`);
  const minor = arc.arcFromBulge([25, 0], [28, 9], 0.720748);
  check('...and an ordinary sub-half-turn arc is untouched (centre still inside the corner)',
    Math.abs(minor.center[0] - 25) < 0.01 && Math.abs(minor.center[1] - 5) < 0.01
      && Math.abs(minor.radius - 5) < 0.01,
    JSON.stringify(minor.center));

  // -------------------------------------------------------------- wiring --
  console.log('\n=== the wiring, because a fix that never reaches a click is half a fix ===');

  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
  const editorSrc = read('components', 'model', 'ModelEditor.tsx');
  const wsSrc = read('components', 'SandboxWorkspace.tsx');
  const panelSrc = read('components', 'model', 'SketchConstraints.tsx');

  check('Round a corner writes a request, not geometry',
    /rounds: \{ \.\.\.\(f\.rounds \?\? \{\}\), \[corner\]: radius \}/.test(editorSrc),
    'ModelEditor.tsx does not record the radius on the feature');
  // The import line, not a grep for the name -- the comment above that code
  // deliberately says what it USED to call, and a substring check would read
  // its own explanation as the defect it describes.
  check('...and it no longer imports the function that bakes trim points in',
    !/^import \{[^}]*filletCorner/m.test(editorSrc),
    'ModelEditor.tsx still imports filletCorner');
  check('...the outline the overlay draws comes from outlineOf, not from f.points',
    /outlineOf\(f\)/.test(wsSrc) && /basis: o\.basis/.test(wsSrc),
    'SandboxWorkspace.tsx still hands the raw feature points to the overlay');
  check('...commitParams goes through the same gate loadDoc does',
    /next = solveDoc\(next\)/.test(wsSrc),
    'applyParam output reaches the doc ungated -- two adoption paths, one gate');
  check('...the constraint toggle refuses a collapsing rule out loud',
    /outlineOf\(\{ \.\.\.f, points \}\)/.test(editorSrc) && /if \(!outline\.ok\)/.test(editorSrc),
    'ModelEditor.setConstraints applies any rule the solver will accept, collapse included');
  check('...the Round box shows the radius currently set, so it can be edited or cleared',
    /defaultValue=\{set !== undefined \? String\(set\) : ''\}/.test(panelSrc),
    'SketchConstraints.tsx always renders the Round box empty, so nothing shows the radius');
  check('...and a Length already set on a curved edge stays clearable',
    /disabled=\{curved && !fixed\}/.test(panelSrc),
    'the note says "remove one to settle it" while the box that removes it is disabled');

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
