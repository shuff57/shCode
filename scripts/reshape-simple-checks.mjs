// reshape-simple-checks.mjs — what the reSHape gate knows, as data.
//
// Same split, and the same rule, as reshape-checks.mjs: the mechanics live in
// scripts/test-reshape.mjs and the expectations live here, because they are
// edited by different people for different reasons. A number in this file
// changes because the reSHape surface or the library changed. A line in
// test-reshape.mjs changes because the gate itself was wrong.
//
// Runtime builders MUST NOT edit this file — or reshape-checks.mjs, or
// test-reshape.mjs — to make a red check go green. A red check is closed by
// fixing public/reshape/reshape.js, public/reshape/runner.html, the vendored
// bundles, or the docs.
//
// reSHape is the simplified layer the course teaches for the whole of Q3. It
// lives in public/reshape/reshape.js, loads after the modeling bundle and after
// the bare-name shim, and adds twelve NEW names on top of the real API without
// renaming, wrapping or overwriting any of it. The three claims that make it
// safe, and that everything below exists to measure:
//
//   1. ADDITIVE   — none of the twelve names exists before reshape.js runs, and
//                   no real JSCAD name is a different value afterwards.
//   2. REAL       — every call returns the SAME geometry the real API call it
//                   stands for returns, so the result goes straight back into
//                   subtract / union / hull / extrudeLinear / colorize.
//   3. OBJECTS    — required values are positional; every named extra rides in
//                   an optional trailing { } whose keys are the textbook's own
//                   words. box(40,20,10) on day one, box(40,20,10,{center:…})
//                   the first time a student moves something.
//
// turn() is the ONE deliberate exception to "the same geometry the real call
// returns", and it is asserted against the opposite expectation on purpose —
// see TURN_IN_PLACE for the pivot, and TURN_COMPOSITION for the consequence of
// the pivot, which is a second divergence and a genuine loss: turn commutes
// with translate and rotate does not, so "order matters" cannot be shown with
// turn at all.
//
// A fourth claim, added after a review found the layer's own rule broken in
// three places: every refusal NAMES THE REAL FUNCTION, and nothing is ever
// accepted and quietly ignored — see REFUSALS_NAME_THE_REAL_CALL. And a fifth,
// REVERSE_LOOKUP, for the direction the graduation table cannot answer: the
// book is written in the real API, so a student reads `cuboid` and has to
// write `box`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { REPO, createShimContext } from './reshape-harness.mjs';

export const SIMPLE_PATH = join(REPO, 'public/reshape/reshape.js');

/** The twelve names, what each needs positionally, and what it really calls. */
export const RESHAPE_NAMES = [
  {
    name: 'box', arity: 3,
    positional: ['width', 'depth', 'height'],
    options: ['center', 'roundRadius', 'segments'],
    wraps: 'primitives.cuboid({ size: [width, depth, height] }); roundedCuboid when roundRadius is given',
    real: 'cuboid',
  },
  {
    name: 'rect', arity: 2,
    positional: ['width', 'height'],
    options: ['center', 'roundRadius', 'segments'],
    wraps: 'primitives.rectangle({ size: [width, height] }); roundedRectangle when roundRadius is given',
    real: 'rectangle',
  },
  {
    name: 'disc', arity: 1,
    positional: ['radius'],
    options: ['center', 'segments'],
    wraps: 'primitives.circle({ radius })',
    real: 'circle',
  },
  {
    name: 'ball', arity: 1,
    positional: ['radius'],
    options: ['center', 'segments'],
    wraps: 'primitives.sphere({ radius })',
    real: 'sphere',
  },
  {
    name: 'tube', arity: 2,
    positional: ['radius', 'height'],
    options: ['center', 'roundRadius', 'segments'],
    wraps: 'primitives.cylinder({ radius, height }); roundedCylinder when roundRadius is given',
    real: 'cylinder',
  },
  {
    name: 'cone', arity: 2,
    positional: ['radius', 'height'],
    options: ['center', 'segments'],
    wraps: 'primitives.cylinderElliptic({ startRadius: [radius, radius], endRadius: [0, 0], height })',
    real: 'cylinderElliptic',
  },
  {
    name: 'ring', arity: 2,
    positional: ['ringRadius', 'tubeRadius'],
    options: [],
    wraps: 'primitives.torus({ outerRadius: ringRadius, innerRadius: tubeRadius }) — the mapping is inverted, and that is the point',
    real: 'torus',
  },
  {
    name: 'poly', arity: 1,
    positional: ['points'],
    options: [],
    wraps: 'primitives.polygon({ points })',
    real: 'polygon',
  },
  {
    name: 'extrude', arity: 2,
    positional: ['height', 'shape', '...moreShapes'],
    options: [],
    wraps: 'extrusions.extrudeLinear({ height }, ...shapes)',
    real: 'extrudeLinear',
  },
  {
    name: 'revolve', arity: 1,
    positional: ['shape'],
    options: ['segments'],
    wraps: 'extrusions.extrudeRotate({}, shape) — a full turn is already the default angle',
    real: 'extrudeRotate',
  },
  {
    name: 'turn', arity: 2,
    positional: ['degrees', 'shape'],
    options: [],
    wraps: 'measure the shape\'s own middle, translate to the origin, transforms.rotate in radians, translate back — NOT a pure rename',
    real: 'rotate',
  },
  {
    name: 'sit', arity: 1,
    positional: ['shape'],
    options: [],
    wraps: "transforms.align({ modes: ['none','none','min'], relativeTo: [0,0,0], grouped: Array.isArray(shape) }, shape)",
    real: 'align',
  },
];

/** A jump means the taught surface moved. Twelve names, and twelve is a decision. */
export const EXPECTED_RESHAPE_NAME_COUNT = 12;

/**
 * THE TWO NAMES THAT SHIP NO { } BECAUSE THE LIBRARY DROPS IT, MEASURED.
 *
 * Every other name without a trailing { } — extrude, turn, sit — has one for a
 * design reason: the keys exist on the real call and reSHape declines to offer
 * them. ring and poly are different, and the difference is worth an assertion
 * rather than a sentence: torus ACCEPTS `center` and `segments` and silently
 * ignores both, so a ring that took them would be the exact defect this layer
 * was built to close. `drops: true` is therefore asserted, not tolerated — the
 * day the library honours one of these, the refusal that names it should be
 * rewritten rather than left saying something false.
 *
 * poly's two are the other kind: `paths` and `orientation` are real polygon
 * keys that do work, and they are refused because they are outside both
 * RESHAPE_OPTION_KEYS and the book's own vocabulary. That is recorded here too so
 * the two reasons are not confused for each other.
 */
export const SILENTLY_DROPPED = [
  {
    name: 'ring', key: 'center', real: 'torus', drops: true,
    a: (w) => w.torus({ outerRadius: 14, innerRadius: 4 }),
    b: (w) => w.torus({ outerRadius: 14, innerRadius: 4, center: [0, 0, 10] }),
    why: 'a torus has no center; the bounding box does not move and nothing is reported',
  },
  {
    name: 'ring', key: 'segments', real: 'torus', drops: true,
    a: (w) => w.torus({ outerRadius: 14, innerRadius: 4 }),
    b: (w) => w.torus({ outerRadius: 14, innerRadius: 4, segments: 8 }),
    why: 'torus spells them innerSegments and outerSegments; plain segments is dropped, '
      + 'and the model comes back at the same 2048 polygons',
  },
  {
    name: 'cone', key: 'roundRadius', real: 'cylinderElliptic', drops: true,
    a: (w) => w.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }),
    b: (w) => w.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, roundRadius: 2 }),
    why: 'roundRadius is in reSHape\'s option vocabulary and is NOT a cylinderElliptic key — '
      + 'accepting it would round nothing and say nothing',
  },
  {
    name: 'poly', key: 'orientation', real: 'polygon', drops: false,
    a: (w) => w.polygon({ points: [[0, 0], [20, 0], [10, 15]] }),
    b: (w) => w.polygon({ points: [[0, 0], [20, 0], [10, 15]], orientation: 'clockwise' }),
    why: 'this one really works — poly refuses it because it is outside the option '
      + 'vocabulary, not because the library ignores it, and the refusal hands over polygon',
  },
];

/**
 * The only globals reshape.js is allowed to add beyond the nine names.
 * `__reshapeNamesSkipped` is the browser-only collision report: a node vm global
 * is a far smaller surface than a browser `window`, so a real collision can
 * exist there and not here. Publishing it is how it stays observable.
 */
export const RESHAPE_REPORT_GLOBALS = ['__reshapeNamesSkipped'];

/**
 * The three option keys reSHape ships, and the rule they obey. Every one is BOTH
 * a real key of the backing library call AND measured vocabulary from the seven
 * written Q3 book chapters. Nothing here is invented, renamed or defaulted
 * differently from the library.
 */
export const RESHAPE_OPTION_KEYS = ['center', 'roundRadius', 'segments'];

/**
 * The identity bar. Each case builds the same model twice — once in reSHape,
 * once in the real API — and the two must be indistinguishable. This is the
 * check that catches a future "helpful" default drifting into a wrapper: a
 * changed segment count or a synthesised center would pass "it returns
 * geometry" and fail here.
 */
export const EQUIVALENTS = [
  { name: 'box', label: 'box(40, 20, 10)',
    reshape: (w) => w.box(40, 20, 10),
    real: (j) => j.primitives.cuboid({ size: [40, 20, 10] }) },
  { name: 'box', label: 'box(40, 20, 10, { center: [0, 0, 10] })',
    reshape: (w) => w.box(40, 20, 10, { center: [0, 0, 10] }),
    real: (j) => j.primitives.cuboid({ size: [40, 20, 10], center: [0, 0, 10] }) },
  { name: 'box', label: 'box(20, 20, 20, { roundRadius: 3, segments: 16 })',
    reshape: (w) => w.box(20, 20, 20, { roundRadius: 3, segments: 16 }),
    real: (j) => j.primitives.roundedCuboid({ size: [20, 20, 20], roundRadius: 3, segments: 16 }) },
  { name: 'rect', label: 'rect(40, 20)',
    reshape: (w) => w.rect(40, 20),
    real: (j) => j.primitives.rectangle({ size: [40, 20] }) },
  { name: 'rect', label: 'rect(40, 20, { roundRadius: 3 })',
    reshape: (w) => w.rect(40, 20, { roundRadius: 3 }),
    real: (j) => j.primitives.roundedRectangle({ size: [40, 20], roundRadius: 3 }) },
  { name: 'disc', label: 'disc(6)',
    reshape: (w) => w.disc(6),
    real: (j) => j.primitives.circle({ radius: 6 }) },
  { name: 'disc', label: 'disc(6, { center: [10, 0], segments: 48 })',
    reshape: (w) => w.disc(6, { center: [10, 0], segments: 48 }),
    real: (j) => j.primitives.circle({ radius: 6, center: [10, 0], segments: 48 }) },
  { name: 'ball', label: 'ball(20)',
    reshape: (w) => w.ball(20),
    real: (j) => j.primitives.sphere({ radius: 20 }) },
  { name: 'ball', label: 'ball(20, { segments: 64 })',
    reshape: (w) => w.ball(20, { segments: 64 }),
    real: (j) => j.primitives.sphere({ radius: 20, segments: 64 }) },
  { name: 'tube', label: 'tube(5, 20)',
    reshape: (w) => w.tube(5, 20),
    real: (j) => j.primitives.cylinder({ radius: 5, height: 20 }) },
  { name: 'tube', label: 'tube(5, 20, { roundRadius: 1 })',
    reshape: (w) => w.tube(5, 20, { roundRadius: 1 }),
    real: (j) => j.primitives.roundedCylinder({ radius: 5, height: 20, roundRadius: 1 }) },
  { name: 'cone', label: 'cone(10, 20)',
    reshape: (w) => w.cone(10, 20),
    real: (j) => j.primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }) },
  { name: 'cone', label: 'cone(10, 20, { center: [0, 0, 10] })',
    reshape: (w) => w.cone(10, 20, { center: [0, 0, 10] }),
    real: (j) => j.primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, center: [0, 0, 10] }) },
  { name: 'cone', label: 'cone(10, 20, { segments: 64 })',
    reshape: (w) => w.cone(10, 20, { segments: 64 }),
    real: (j) => j.primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, segments: 64 }) },
  { name: 'ring', label: 'ring(14, 4)',
    reshape: (w) => w.ring(14, 4),
    real: (j) => j.primitives.torus({ outerRadius: 14, innerRadius: 4 }) },
  { name: 'ring', label: 'ring(10, 2)',
    reshape: (w) => w.ring(10, 2),
    real: (j) => j.primitives.torus({ outerRadius: 10, innerRadius: 2 }) },
  { name: 'poly', label: 'poly([[0, 0], [20, 0], [10, 15]])',
    reshape: (w) => w.poly([[0, 0], [20, 0], [10, 15]]),
    real: (j) => j.primitives.polygon({ points: [[0, 0], [20, 0], [10, 15]] }) },
  { name: 'extrude', label: 'extrude(10, rect(40, 20))',
    reshape: (w) => w.extrude(10, w.rect(40, 20)),
    real: (j) => j.extrusions.extrudeLinear({ height: 10 }, j.primitives.rectangle({ size: [40, 20] })) },
  { name: 'extrude', label: 'extrude(4, rect(10, 10), disc(3)) — variadic',
    reshape: (w) => w.extrude(4, w.rect(10, 10), w.disc(3)),
    real: (j) => j.extrusions.extrudeLinear(
      { height: 4 },
      j.primitives.rectangle({ size: [10, 10] }),
      j.primitives.circle({ radius: 3 })
    ) },
  { name: 'revolve', label: 'revolve(profile)',
    reshape: (w) => w.revolve(w.translate([10, 0, 0], w.rect(4, 10))),
    real: (j) => j.extrusions.extrudeRotate(
      {}, j.transforms.translate([10, 0, 0], j.primitives.rectangle({ size: [4, 10] }))
    ) },
  { name: 'revolve', label: 'revolve(profile, { segments: 16 })',
    reshape: (w) => w.revolve(w.translate([10, 0, 0], w.rect(4, 10)), { segments: 16 }),
    real: (j) => j.extrusions.extrudeRotate(
      { segments: 16 }, j.transforms.translate([10, 0, 0], j.primitives.rectangle({ size: [4, 10] }))
    ) },
  { name: 'sit', label: 'sit(ball(10))',
    reshape: (w) => w.sit(w.ball(10)),
    real: (j) => j.transforms.align(
      { modes: ['none', 'none', 'min'], relativeTo: [0, 0, 0], grouped: false },
      j.primitives.sphere({ radius: 10 })
    ) },
  { name: 'sit', label: 'sit([ball(10), box(10, 10, 10)]) — an assembly, grouped',
    reshape: (w) => w.sit([w.ball(10), w.translate([30, 0, 40], w.box(10, 10, 10))]),
    real: (j) => j.transforms.align(
      { modes: ['none', 'none', 'min'], relativeTo: [0, 0, 0], grouped: true },
      [j.primitives.sphere({ radius: 10 }),
        j.transforms.translate([30, 0, 40], j.primitives.cuboid({ size: [10, 10, 10] }))]
    ) },
];

/**
 * turn() is EXEMPT from the identity bar above, deliberately, and is asserted
 * against the opposite expectation instead.
 *
 * transforms.rotate spins geometry about the WORLD origin. Measured on the
 * vendored bundle: a 40 x 20 x 20 box moved to x = 50 occupies
 * [[30,-10,-10],[70,10,10]]; rotate 90° about Z sends it to
 * [[-10,30,-10],[10,70,10]] — it orbits to y = 50 and nothing throws. turn()
 * measures the shape's own middle and rotates there instead, so the same box
 * lands on [[40,-20,-10],[60,20,10]] — same footprint, turned where it stood.
 *
 * `orbits` is the counter-case: if it ever equals `expect`, turn has silently
 * become a pure rename of rotate and the reason it exists has evaporated.
 */
export const TURN_IN_PLACE = [
  {
    label: 'a 40 x 20 x 20 box moved to x = 50, turned 90°',
    reshape: (w) => w.turn(90, w.translate([50, 0, 0], w.box(40, 20, 20))),
    orbit: (w) => w.rotate([0, 0, Math.PI / 2], w.translate([50, 0, 0], w.box(40, 20, 20))),
    expect: [[40, -20, -10], [60, 20, 10]],
    orbits: [[-10, 30, -10], [10, 70, 10]],
  },
  {
    label: 'a flat rect moved to x = 30, turned 90° in the page',
    reshape: (w) => w.turn(90, w.translate([30, 0, 0], w.rect(40, 20))),
    orbit: (w) => w.rotate([0, 0, Math.PI / 2], w.translate([30, 0, 0], w.rect(40, 20))),
    expect: [[20, -20, 0], [40, 20, 0]],
    orbits: [[-10, 10, 0], [10, 50, 0]],
  },
  {
    label: 'an assembly turned as one group',
    reshape: (w) => w.turn(90, [w.translate([50, 0, 0], w.box(40, 20, 20)), w.translate([50, 0, 30], w.ball(5))]),
    orbit: (w) => w.rotate([0, 0, Math.PI / 2], [w.translate([50, 0, 0], w.box(40, 20, 20)), w.translate([50, 0, 30], w.ball(5))]),
    expect: [[40, -20, -10], [60, 20, 35]],
    orbits: [[-10, 30, -10], [10, 70, 35]],
  },
];

/**
 * TURN'S SECOND DIVERGENCE, PINNED.
 *
 * TURN_IN_PLACE above pins the pivot. This pins the consequence of the pivot,
 * which is a separate fact and was for a while undocumented and untested:
 * rotating about a shape's OWN middle COMMUTES with translate, and rotating
 * about the world origin does not.
 *
 *   translate(t, turn(a, s))   ===   turn(a, translate(t, s))     always
 *   translate(t, rotate(a, s))  !==  rotate(a, translate(t, s))
 *
 * So "the order you apply transforms in changes the answer" — §9.2's
 * composition topic — is NOT observable through turn. That is a thing turn
 * takes away, it is stated in reshape.js's banner and in reference.md, and both
 * halves are asserted here so neither claim can rot: `commutes` failing would
 * mean turn had stopped rotating in place, and `rotateCommutes` becoming true
 * would mean the library's rotate had changed under the whole argument.
 */
export const TURN_COMPOSITION = [
  {
    label: 'a solid moved 50 along x and turned 90° about Z',
    build: (w) => w.box(40, 20, 10),
    move: [50, 0, 0],
    degrees: 90,
    radians: [0, 0, Math.PI / 2],
  },
  {
    label: 'a flat shape moved 30 along x and turned 90° in the page',
    build: (w) => w.rect(40, 20),
    move: [30, 0, 0],
    degrees: 90,
    radians: [0, 0, Math.PI / 2],
  },
  {
    label: 'an assembly moved 50 along x and turned 90° about Z',
    build: (w) => [w.box(40, 20, 10), w.translate([0, 0, 30], w.ball(5))],
    move: [50, 0, 0],
    degrees: 90,
    radians: [0, 0, Math.PI / 2],
  },
  {
    // The /sandbox generator emits turn(translate(ring(...))) for a ring that
    // is both positioned and rotated, and CANNOT exercise it — its Ring UI has
    // no rotation control, so that path ships unrun and was filed Not-tested in
    // 3d1bca9. It is covered here instead, because turn is this side's code and
    // the open question was about turn.
    //
    // Tilt about Y rather than spin about Z, deliberately: a torus is
    // rotationally symmetric about its own Z, so a Z-turn leaves the bounding
    // box identical and this row would pass on a turn that had stopped working
    // altogether. And the move is along x while the tilt is about y for the
    // reason the first draft of this row got wrong — an offset lying ON the
    // rotation axis cannot orbit, so the `rotate` counter-case commuted too and
    // proved nothing.
    label: 'a ring moved 50 along x and tilted 90° about Y',
    build: (w) => w.ring(14, 4),
    move: [50, 0, 0],
    degrees: [0, 90, 0],
    radians: [0, Math.PI / 2, 0],
  },
];

/**
 * Every refusal has to leave a student somewhere.
 *
 * Measured before this existed: the object-first errors named the real function
 * ("…is called cuboid") and NOTHING else did. `revolve(profile, { angle: … })`
 * — which a student reading §9.1 will type, because the chapter's own worked
 * example is extrudeRotate({ segments: 8, angle: TAU / 2 }, profile) — answered
 * only "revolve has no option called angle. It takes segments." True, and a
 * dead end, in the one chapter revolve exists for.
 *
 * `names` is the real function the message must hand over. `spells` is set on
 * the cases where the refused key is a real key of that function, so the
 * message owes the student the actual call rather than just a name.
 */
export const REFUSALS_NAME_THE_REAL_CALL = [
  { what: 'box refuses size', run: (w) => w.box(10, 10, 10, { size: 3 }), names: 'cuboid' },
  // NOT { points: … } here: an object with a `points` array is what a path2
  // looks like, so the geometry test claims it before the option test can.
  { what: 'rect refuses normal', run: (w) => w.rect(10, 10, { normal: [0, 0, 1] }), names: 'rectangle' },
  { what: 'disc refuses radius', run: (w) => w.disc(6, { radius: 3 }), names: 'circle' },
  { what: 'ball refuses outerRadius', run: (w) => w.ball(10, { outerRadius: 3 }), names: 'sphere' },
  { what: 'tube refuses innerRadius', run: (w) => w.tube(5, 20, { innerRadius: 2 }), names: 'cylinder' },
  {
    what: 'cone refuses endRadius and spells out the cut-off-point call',
    run: (w) => w.cone(10, 20, { endRadius: [4, 4] }),
    names: 'cylinderElliptic',
    spells: /cylinderElliptic\(\{ startRadius: \[10, 10\], endRadius: \[4, 4\], height: 20 \}\)/,
    why: 'a frustum is a real thing to want and cone deliberately does not model it',
  },
  {
    what: 'cone refuses roundRadius, which the library would have dropped',
    run: (w) => w.cone(10, 20, { roundRadius: 2 }),
    names: 'cylinderElliptic',
    why: 'roundRadius IS in reSHape\'s option vocabulary, and cylinderElliptic ignores it '
      + 'silently — same bounding box, same 64 polygons',
  },
  {
    what: 'ring refuses a { } and spells out the torus call that takes segments',
    run: (w) => w.ring(14, 4, { segments: 64 }),
    names: 'torus',
    spells: /torus\(\{ outerRadius: 14, innerRadius: 4, outerSegments: 64 \}\)/,
    why: 'measured: torus accepts plain `segments` and silently drops it',
  },
  {
    what: 'poly refuses the { points: … } spelling by name',
    run: (w) => w.poly({ points: [[0, 0], [20, 0], [10, 15]] }),
    names: 'polygon',
    why: 'an object with a `points` array is what a path2 looks like, so the geometry test '
      + 'would claim it and the refusal would never say the word polygon',
  },
  {
    what: 'poly refuses a trailing { } instead of ignoring it',
    run: (w) => w.poly([[0, 0], [20, 0], [10, 15]], { orientation: 'clockwise' }),
    names: 'polygon',
    why: 'orientation is a real polygon key that really works — refusing it has to hand it over',
  },
  {
    what: 'revolve refuses angle and spells out the part-turn call',
    run: (w) => w.revolve(w.translate([10, 0, 0], w.rect(4, 10)), { angle: Math.PI }),
    names: 'extrudeRotate',
    spells: /extrudeRotate\(\{ segments: 16, angle: constants\.TAU \/ 2 \}, profile\)/,
    why: "§9.1's own worked example is a part turn, and revolve does not do part turns",
  },
  {
    what: 'extrude refuses a { } and spells out the twist call',
    run: (w) => w.extrude(10, w.rect(10, 10), { twistAngle: 1 }),
    names: 'extrudeLinear',
    spells: /twistAngle: constants\.TAU \/ 4/,
    why: 'extrude has no options object at all, so a { } here would be read as a profile',
  },
  {
    what: 'turn refuses a third argument instead of ignoring it',
    run: (w) => w.turn(45, w.box(10, 10, 10), 30),
    names: 'rotate',
    why: 'measured: turn(45, s, "extra") used to be accepted silently',
  },
  {
    what: 'sit refuses a { } instead of ignoring it',
    run: (w) => w.sit(w.box(10, 10, 10), { modes: ['center', 'center', 'min'] }),
    names: 'align',
    why: "measured: sit(s, { modes: … }) used to be accepted and dropped, and `modes` is align's own key",
  },
];

/**
 * The reverse of the graduation table.
 *
 * The graduation table answers "I wrote box, what is that really?". The seven
 * written Q3 chapters pose the opposite question — they are in the real API,
 * so a student READS `cuboid` and has to write `box`. Measured on the chapter
 * sources: roughly half the calls in the assigned reading are in a spelling
 * reSHape replaces, and three of the mappings (extrudeRotate -> revolve,
 * align -> sit, rotate -> turn) cannot be guessed backwards at all.
 *
 * So reference.md carries both directions and this pins the second one: every
 * name reSHape stands in for has a row, pointing at the reSHape word for it.
 */
export const REVERSE_LOOKUP = {
  path: join(REPO, 'public/reshape/docs/reference.md'),
  heading: '#### Reading the book',
  /** real name in the left cell -> the reSHape name its right cell must name. */
  expect: {
    cuboid: 'box',
    // 12 calls across four chapters, and the opening runnable block of the
    // whole unit is cube({ size: 10 }). box(10, 10, 10) is exactly it, and
    // until this row existed nothing shCode shipped said so.
    cube: 'box',
    roundedCuboid: 'box',
    rectangle: 'rect',
    roundedRectangle: 'rect',
    circle: 'disc',
    sphere: 'ball',
    cylinder: 'tube',
    roundedCylinder: 'tube',
    // The three added when /sandbox's generator turned out to be emitting half
    // an reSHape call and half a raw namespaced one in the same expression. torus
    // and polygon moved OFF the "no reSHape word" table to get here, which is the
    // A8.2.2 cost the banner in reshape.js records.
    cylinderElliptic: 'cone',
    torus: 'ring',
    polygon: 'poly',
    extrudeLinear: 'extrude',
    extrudeRotate: 'revolve',
    align: 'sit',
    rotate: 'turn',
  },
};

/**
 * Read a two-column table of ``real`` -> ``reshape`` out of reference.md, the
 * same way readGraduationTable reads the forward one.
 */
export function readReverseTable(text = readFileSync(REVERSE_LOOKUP.path, 'utf8')) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(REVERSE_LOOKUP.heading);
  if (start === -1) return { error: `reference.md has no "${REVERSE_LOOKUP.heading}" heading` };
  const rows = [];
  let seen = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (seen) break;
      continue;
    }
    seen = true;
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 2) continue;
    const real = (cells[0].match(/`([A-Za-z_$][\w$]*)`/) || [])[1];
    if (!real) continue;
    rows.push({ line: i + 1, real, says: cells[1] });
  }
  return { rows };
}

/**
 * The contract the whole design rests on: the required values are POSITIONAL,
 * so day one has no punctuation in it; the named extras ride in an OPTIONAL
 * TRAILING { }, so the first brace a student writes arrives because the model
 * needed something.
 *
 *   bare        the day-one call, no brace anywhere
 *   withOptions the day-two call, one key, and it must actually change the model
 *   objectFirst the graduation stumble: box({ size: [...] }) must NOT work.
 *               An alias would delete the contrast that reSHape exists to teach,
 *               and would make the arity guard unwriteable — you cannot tell a
 *               mistyped positional call from an intended object call. What it
 *               gets instead is the name of the real function to reach for.
 *   short       the missing-argument case, which must name the argument.
 *               This is the sharp one for tube: the real cylinder({radius:5})
 *               does not throw, it silently builds a height-2 stub.
 *   badKey      a misspelled option is refused by name, never ignored.
 */
export const POSITIONAL_CONTRACT = [
  {
    name: 'box',
    bare: (w) => w.box(40, 20, 10),
    bareBox: [[-20, -10, -5], [20, 10, 5]],
    withOptions: (w) => w.box(40, 20, 10, { center: [0, 0, 10] }),
    optionBox: [[-20, -10, 5], [20, 10, 15]],
    objectFirst: (w) => w.box({ size: [40, 20, 10] }),
    objectFirstSays: /takes plain numbers.*called cuboid/s,
    short: (w) => w.box(40, 20),
    shortSays: /box needs three numbers.*height is missing/s,
    badKey: (w) => w.box(40, 20, 10, { colour: 'red' }),
    badKeySays: /no option called "colour".*center, roundRadius and segments/s,
  },
  {
    name: 'rect',
    bare: (w) => w.rect(40, 20),
    bareBox: [[-20, -10, 0], [20, 10, 0]],
    withOptions: (w) => w.rect(40, 20, { center: [10, 0] }),
    optionBox: [[-10, -10, 0], [30, 10, 0]],
    objectFirst: (w) => w.rect({ size: [40, 20] }),
    objectFirstSays: /takes plain numbers.*called rectangle/s,
    short: (w) => w.rect(40),
    shortSays: /rect needs two numbers.*height is missing/s,
    badKey: (w) => w.rect(40, 20, { radius: 3 }),
    badKeySays: /no option called "radius"/s,
  },
  {
    name: 'tube',
    bare: (w) => w.tube(5, 20),
    bareBox: [[-5, -5, -10], [5, 5, 10]],
    withOptions: (w) => w.tube(5, 20, { center: [0, 0, 10] }),
    optionBox: [[-5, -5, 0], [5, 5, 20]],
    objectFirst: (w) => w.tube({ radius: 5, height: 20 }),
    objectFirstSays: /takes plain numbers.*called cylinder/s,
    // The measured defect this name exists for: the real call would have
    // returned a height-2 disc here, with no complaint at all.
    short: (w) => w.tube(5),
    shortSays: /tube needs two numbers.*height is missing/s,
    badKey: (w) => w.tube(5, 20, { innerRadius: 2 }),
    badKeySays: /no option called "innerRadius"/s,
  },
  {
    name: 'cone',
    bare: (w) => w.cone(10, 20),
    bareBox: [[-10, -10, -10], [10, 10, 10]],
    withOptions: (w) => w.cone(10, 20, { center: [0, 0, 10] }),
    optionBox: [[-10, -10, 0], [10, 10, 20]],
    objectFirst: (w) => w.cone({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }),
    objectFirstSays: /takes plain numbers.*called cylinderElliptic/s,
    // tube's defect, one shape along: measured, the real call with no height
    // builds a 20 x 20 x 2 pancake and says nothing at all.
    short: (w) => w.cone(10),
    shortSays: /cone needs two numbers.*height is missing/s,
    badKey: (w) => w.cone(10, 20, { roundRadius: 2 }),
    badKeySays: /no option called "roundRadius".*center and segments/s,
  },
  {
    name: 'ball',
    bare: (w) => w.ball(20),
    bareBox: [[-20, -20, -20], [20, 20, 20]],
    withOptions: (w) => w.ball(20, { center: [0, 0, 20] }),
    optionBox: [[-20, -20, 0], [20, 20, 40]],
    objectFirst: (w) => w.ball({ radius: 20 }),
    objectFirstSays: /takes plain numbers.*called sphere/s,
    short: (w) => w.ball(),
    shortSays: /ball needs one number.*radius is missing/s,
    badKey: (w) => w.ball(20, { size: 3 }),
    badKeySays: /no option called "size"/s,
  },
  {
    name: 'disc',
    bare: (w) => w.disc(6),
    bareBox: [[-6, -6, 0], [6, 6, 0]],
    withOptions: (w) => w.disc(6, { center: [10, 0] }),
    optionBox: [[4, -6, 0], [16, 6, 0]],
    objectFirst: (w) => w.disc({ radius: 6 }),
    objectFirstSays: /takes plain numbers.*called circle/s,
    short: (w) => w.disc(),
    shortSays: /disc needs one number.*radius is missing/s,
    badKey: (w) => w.disc(6, { roundRadius: 1 }),
    badKeySays: /no option called "roundRadius".*center and segments/s,
  },
];

/**
 * THE OTHER HALF OF THE CONTRACT: the names with no trailing { } at all.
 *
 * POSITIONAL_CONTRACT above needs a `withOptions` case, so it can only speak
 * for the names that HAVE options. ring and poly have none — for a measured
 * reason, see SILENTLY_DROPPED — and "no options" is a claim that can rot in
 * both directions. It rots one way if a { } starts being accepted and ignored,
 * which is the defect the whole layer exists to close; it rots the other way if
 * the refusal stops naming the real call, leaving a dead end.
 *
 *   bare        the day-one call, which is the only call
 *   trailing    a trailing { } must be REFUSED, by name, not dropped
 *   objectFirst the graduation stumble: poly({ points: … }) must not work
 *   short       the missing-argument case, which must name the argument
 */
export const NO_OPTIONS_CONTRACT = [
  {
    name: 'ring',
    bare: (w) => w.ring(14, 4),
    bareBox: [[-18, -18, -4], [18, 18, 4]],
    trailing: (w) => w.ring(14, 4, { segments: 64 }),
    trailingSays: /ring takes just the two radiuses.*no \{ \} options.*called torus/s,
    objectFirst: (w) => w.ring({ outerRadius: 14, innerRadius: 4 }),
    objectFirstSays: /takes plain numbers.*called torus/s,
    short: (w) => w.ring(14),
    shortSays: /ring needs two numbers.*tubeRadius is missing/s,
    why: 'torus accepts center and segments and silently drops both',
  },
  {
    name: 'poly',
    bare: (w) => w.poly([[0, 0], [20, 0], [10, 15]]),
    bareBox: [[0, 0, 0], [20, 15, 0]],
    trailing: (w) => w.poly([[0, 0], [20, 0], [10, 15]], { orientation: 'clockwise' }),
    trailingSays: /poly takes just the list of corners.*no \{ \} options.*called polygon/s,
    objectFirst: (w) => w.poly({ points: [[0, 0], [20, 0], [10, 15]] }),
    objectFirstSays: /plain list of corners.*called polygon/s,
    short: (w) => w.poly(),
    shortSays: /poly needs a list of corners: poly\(points\)/s,
    why: 'paths and orientation are real polygon keys outside this layer\'s vocabulary',
  },
];

/**
 * A GUARD THAT NAMES SOMETHING ELSE'S PARAMETERS IS NOT A GUARD.
 *
 * requireNumbers builds its message out of the parameter list it is handed, so
 * a copy-pasted name is a silent way to tell a student to fix the wrong thing —
 * `ring needs two numbers: ring(radius, height)` would be a perfectly
 * plausible-looking wrong answer. Each of these calls a name short and asserts
 * that EVERY parameter that name declares in RESHAPE_NAMES appears in the
 * message, so the two cannot drift.
 */
export const ARITY_GUARDS = [
  { name: 'cone', run: (w) => w.cone(10) },
  { name: 'ring', run: (w) => w.ring(14) },
  { name: 'poly', run: (w) => w.poly() },
  { name: 'box', run: (w) => w.box(40, 20) },
  { name: 'rect', run: (w) => w.rect(40) },
  { name: 'tube', run: (w) => w.tube(5) },
];

/**
 * THE ARITHMETIC THE ARGUMENT ORDER RESTS ON.
 *
 * ring's whole justification is that JSCAD's labels mislead: `outerRadius` is
 * the radius of the circle the tube travels along, not the outside edge of the
 * donut. That claim is only worth anything if ring's own two words are true, so
 * the finished model is MEASURED rather than described — a 14/4 ring has to
 * come out 36 across and 8 thick.
 *
 * `misread` is the counter-case, and it is the reason the name exists: both of
 * the ways a student reads JSCAD's labels build silently, at the wrong size.
 * Only the full swap throws, and it throws about two circles nobody typed.
 *
 * `ownMisread` IS THE OTHER HALF, AND IT WAS MISSING. The table above measured
 * the alternative's failure modes exhaustively and never measured ring's own,
 * which made the case for ring look stronger than it is. Measured on this
 * bundle: `ringRadius` read as "the radius of the ring I am making", i.e. its
 * outside edge, is exactly as available a misreading as `outerRadius` read the
 * same way, and it builds the byte-identical wrong model — ring(18, 4) and
 * torus({ outerRadius: 18, innerRadius: 4 }) are both 44 x 44 x 8, silently.
 * `tubeRadius` has a second, smaller version of it: read as the tube's
 * THICKNESS rather than its radius, ring(14, 8) comes out 44 x 44 x 16.
 *
 * So the honest claim — the one reference.md and the banner now make, and the
 * one that is still enough to justify the name — is narrower than "both of
 * ring's words are true":
 *
 *   tubeRadius is TRUE where innerRadius is a LIE (innerRadius is the tube, not
 *   the hole, and reading it as the hole is worth 56 x 56 x 20), and ringRadius
 *   carries the same outer-edge ambiguity outerRadius does — which is why the
 *   arithmetic, (across - thick) / 2, is printed next to it in both places.
 *
 * The swap is not a differentiator either, and `swapped` above proves it:
 * torus THROWS on the full swap too. What ring wins there is the message, not
 * the catch.
 */
export const RING_ARITHMETIC = {
  build: (w) => w.ring(14, 4),
  dimensions: [36, 36, 8],
  across: 36,
  thick: 8,
  misread: [
    { what: 'outerRadius read as the outside edge of the donut',
      run: (w) => w.torus({ outerRadius: 18, innerRadius: 4 }),
      dimensions: [44, 44, 8] },
    { what: 'and innerRadius read as the hole',
      run: (w) => w.torus({ outerRadius: 18, innerRadius: 10 }),
      dimensions: [56, 56, 20] },
  ],
  /**
   * ring's OWN silent wrong answers. Each one is here so the published table
   * cannot go back to being one-sided, and `sameAs` pins the sentence that
   * costs the argument most: this is not merely also-wrong, it is the same
   * model, to the byte, as the torus misreading directly above it.
   */
  ownMisread: [
    { what: 'ringRadius read as the outside edge of the donut',
      run: (w) => w.ring(18, 4),
      dimensions: [44, 44, 8],
      sameAs: (w) => w.torus({ outerRadius: 18, innerRadius: 4 }) },
    // No `sameAs` on this one: there is no torus misreading it mirrors. It is
    // ring's own, and 8 THICK asked for is 16 thick delivered.
    { what: "and tubeRadius read as the tube's thickness",
      run: (w) => w.ring(14, 8),
      dimensions: [44, 44, 16] },
  ],
  /** the only spelling that does not build, and the message it gives */
  swapped: (w) => w.torus({ outerRadius: 4, innerRadius: 14 }),
  swappedSays: /inner circle is too large to rotate about the outer circle/,
  /** the same swap through ring, rethrown with the student's own numbers */
  reshapeSwapped: (w) => w.ring(4, 14),
  reshapeSwappedSays: /a tube 14 thick will not fit round a ring of radius 4.*ring\(14, 4\) is the one you meant/s,
};

/**
 * WHAT poly TRAINS, AND WHAT THAT HABIT DOES ON GRADUATION DAY.
 *
 * poly is the one reSHape name whose single positional argument is a LIST, so it
 * is also the one that teaches "hand the array over bare". Every other name in
 * the layer teaches numbers-then-optional-brace, and graduating any of those is
 * a rename plus a bracket that FAILS LOUDLY if you forget the bracket.
 *
 * polygon does not fail loudly. Measured on the vendored bundle:
 * primitives.polygon([[0, 0], [20, 0], [10, 15]]) — the exact shape of the call
 * poly trains — returns a real geom2 with ZERO sides and a bounding box of
 * [[0,0,0],[0,0,0]]. No throw, no warning, nothing on screen. And the layer
 * cannot guard it, because by then the student has left the layer.
 *
 * It is a real crossover cost and it belongs next to poly wherever poly is
 * explained, so this is pinned as data and asserted rather than described.
 * `alsoBare` is the reason it is a trap rather than a rule: `line`, the other
 * points-taking primitive in reference.md's catalogue, really does take its
 * array bare, so "some of them do" is the truth a student has to carry.
 */
export const POLY_BARE_ARRAY = {
  corners: [[0, 0], [20, 0], [10, 15]],
  right: (j) => j.primitives.polygon({ points: [[0, 0], [20, 0], [10, 15]] }),
  bare: (j) => j.primitives.polygon([[0, 0], [20, 0], [10, 15]]),
  /** what the bare call comes back as: real geometry, and empty */
  bareSides: 0,
  bareBox: [[0, 0, 0], [0, 0, 0]],
  alsoBare: (j) => j.primitives.line([[0, 0], [20, 0]]),
};

/**
 * BOUNDING BOX, MEASURED AGAINST THE REAL CALL AND AGAINST A NUMBER.
 *
 * EQUIVALENTS already compares the whole serialised geometry, which is
 * strictly stronger — so why this? Because a serialised compare reports
 * "shape 1 differs" and nothing else. These three names were added to stop a
 * generator emitting half an reSHape call, and the thing a reader of a failure
 * needs is the SIZE: a ring that comes out 8 across instead of 36 is the exact
 * defect the argument order was chosen to prevent, and this is the check that
 * says so in numbers.
 */
export const WRAPS_BOX = [
  { label: 'cone(10, 20)',
    reshape: (w) => w.cone(10, 20),
    real: (j) => j.primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }),
    box: [[-10, -10, -10], [10, 10, 10]] },
  { label: 'cone(10, 20, { center: [0, 0, 10] })',
    reshape: (w) => w.cone(10, 20, { center: [0, 0, 10] }),
    real: (j) => j.primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, center: [0, 0, 10] }),
    box: [[-10, -10, 0], [10, 10, 20]] },
  { label: 'ring(14, 4)',
    reshape: (w) => w.ring(14, 4),
    real: (j) => j.primitives.torus({ outerRadius: 14, innerRadius: 4 }),
    box: [[-18, -18, -4], [18, 18, 4]] },
  { label: 'ring(10, 2)',
    reshape: (w) => w.ring(10, 2),
    real: (j) => j.primitives.torus({ outerRadius: 10, innerRadius: 2 }),
    box: [[-12, -12, -2], [12, 12, 2]] },
  { label: 'poly([[0, 0], [20, 0], [10, 15]])',
    reshape: (w) => w.poly([[0, 0], [20, 0], [10, 15]]),
    real: (j) => j.primitives.polygon({ points: [[0, 0], [20, 0], [10, 15]] }),
    box: [[0, 0, 0], [20, 15, 0]] },
];

/**
 * THE REFUSALS THIS RUN OVERTURNED, AND WHAT THEY COST, AS A CHECK.
 *
 * reshape.js's banner refused `donut` and `poly` in writing, with arguments.
 * Both were overturned. A refusal that is overturned QUIETLY — by deleting the
 * paragraph — leaves nobody able to audit the decision later, and the poly one
 * has a live cost: assignment A8.2.2 asks a student to find a primitive not
 * covered in class, and taking polygon and torus removes two of its four
 * book-anchored targets.
 *
 * So the banner has to keep saying it. Each entry is a phrase the banner must
 * carry; if a future edit tidies the paragraph away, this goes red.
 */
export const REFUSALS_OVERTURNED = {
  path: SIMPLE_PATH,
  says: [
    { what: 'the donut refusal is quoted rather than deleted',
      rx: /two unlabelled radii are\s*\n?\/\/\s*unmemorable/ },
    { what: 'and it is marked OVERTURNED', rx: /OVERTURNED/ },
    { what: 'with the measurement that beats it',
      rx: /44 x 44 x 8/ },
    { what: 'and the second misreading too', rx: /56 x 56 x 20/ },
    { what: 'the A8.2.2 cost is named', rx: /A8\.2\.2/ },
    // These three replace an earlier trio that pinned the WRONG accounting —
    // "TWO of the four book-anchored" targets lost, "ellipse and star" left. The
    // assignment says "this week", §8.2 teaches ellipse, polygon and star, and
    // the numbers invert once that is read properly. A pin on a false sentence
    // is worse than no pin, because it defends the sentence.
    { what: 'the assignment is quoted with the two words that decide it',
      rx: /NOT covered in class this week/ },
    { what: 'and the corrected accounting says poly cost the assignment nothing',
      rx: /poly costs A8\.2\.2 NOTHING/ },
    { what: 'while naming what really was taken from the pool',
      rx: /torus[\s\S]{0,200}cylinderElliptic/ },
    { what: "cone's listing under a rationale it does not fit is recorded",
      rx: /rationale it does not\s*\n?\/\/\s*fit/ },
    { what: 'and poly\'s own cost — a positional argument that is a list',
      rx: /positional argument is a LIST/ },
    // Two costs the first version of the banner did not record at all.
    { what: 'poly is admitted to break the layer\'s own naming rule',
      rx: /abbreviation of the very name/ },
    { what: 'and the bare-array habit it trains is measured at the crossover',
      rx: /SILENTLY EMPTY|silently empty/ },
    { what: "ring's own misreadings are recorded, not just torus's",
      rx: /ring\(18, 4\)/ },
  ],
  /** the names that must NOT still be sitting in the "deliberately NOT here" list */
  notRefusedAnyMore: ['cone', 'donut'],
  refusalLine: /Deliberately NOT here:([^\n]*)/,
};

/**
 * The guards that exist because the library's own answer is a silent wrong
 * result or an untranslatable message. Every one of these was measured against
 * the vendored bundle before it was written down.
 */
export const GUARDS = [
  {
    what: 'roundRadius too big for a box is rethrown with the real numbers',
    run: (w) => w.box(10, 4, 10, { roundRadius: 5 }),
    says: /roundRadius 5 is too big for a 10 x 4 x 10 box — it must be less than 2\./,
    why: "the library says only 'roundRadius must be smaller than the radius of all dimensions'",
  },
  {
    what: 'roundRadius too big for a rect is rethrown with the real numbers',
    run: (w) => w.rect(10, 4, { roundRadius: 5 }),
    says: /roundRadius 5 is too big for a 10 x 4 rect — it must be less than 2\./,
    why: 'same library message, same uselessness to a beginner',
  },
  {
    what: 'a tube too short for its roundRadius names the height',
    run: (w) => w.tube(5, 4, { roundRadius: 3 }),
    says: /roundRadius 3 is too big for a tube 4 tall — it must be less than 2\./,
    why: "the library says 'height must be larger than twice roundRadius'",
  },
  {
    what: 'a tube too thin for its roundRadius names the radius',
    run: (w) => w.tube(5, 40, { roundRadius: 6 }),
    says: /roundRadius 6 is too big for a tube of radius 5 — it must be 5 or less\./,
    why: "roundedCylinder's second, different complaint",
  },
  {
    what: 'a ring whose tube will not fit is rethrown with the two numbers typed',
    run: (w) => w.ring(4, 14),
    says: /a tube 14 thick will not fit round a ring of radius 4 — in ring\(ringRadius, tubeRadius\) the ring radius comes first\. ring\(14, 4\) is the one you meant\./,
    why: "the library says 'inner circle is too large to rotate about the outer circle', "
      + 'which names two circles a student never typed',
  },
  {
    what: 'poly refuses an empty list instead of building an invisible nothing',
    run: (w) => w.poly([]),
    says: /poly needs at least three corners to enclose anything.*You gave it zero\./s,
    why: 'measured: polygon({ points: [] }) returns a VALID geom2 with no sides and an '
      + 'all-zero bounding box, and nothing throws',
  },
  {
    what: 'poly names the corner that is not a pair of numbers',
    run: (w) => w.poly([[0, 0], [20, 0], [10, 'x']]),
    says: /every corner poly takes is an x and a y.*Corner 3 is/s,
    why: 'measured: that call builds real geometry whose bounding box reads '
      + '[[0,null,0],[20,null,0]], with no error anywhere',
  },
  {
    what: 'poly counts the corners itself rather than letting the library name a list index',
    run: (w) => w.poly([[0, 0], [20, 0]]),
    says: /poly needs at least three corners to enclose anything.*You gave it two\./s,
    why: 'the library throws "list of points 0 must contain three or more points", naming a '
      + "list index poly's spelling has not got",
  },
  {
    what: 'revolve refuses a solid instead of dying inside the library',
    run: (w) => w.revolve(w.box(4, 4, 4)),
    says: /revolve needs a flat 2D shape — you gave it a solid\./,
    why: "measured: extrudeRotate on a geom3 throws \"Cannot read properties of undefined (reading 'length')\"",
  },
  {
    what: 'extrude refuses a solid instead of returning it unchanged',
    run: (w) => w.extrude(10, w.box(4, 4, 4)),
    says: /extrude needs a flat 2D shape — you gave it a solid\./,
    why: 'measured: extrudeLinear on a geom3 does not throw, it hands the solid straight back',
  },
  {
    what: 'turn refuses to tip a flat shape out of its plane',
    run: (w) => w.turn([90, 0, 0], w.rect(40, 20)),
    says: /turn tips a flat shape out of its plane and it disappears/,
    why: 'measured: rotate([PI/2,0,0], rect) returns a degenerate line, no error',
  },
  {
    what: 'turn refuses an angle it cannot read',
    run: (w) => w.turn('45', w.box(10, 10, 10)),
    says: /turn needs an angle in degrees first/,
    why: 'a quoted number is the commonest beginner slip and silently means nothing here',
  },
  {
    what: 'extrude refuses to run without a shape',
    run: (w) => w.extrude(10),
    says: /extrude needs a shape to push upwards/,
    why: 'extrudeLinear({height}) with no profile throws from inside the library',
  },
  // The operand-order family. reSHape's grammar has ONE rule — required values
  // positional, every extra in a TRAILING { } — and the real API breaks it for
  // the two extrusions, which take their { } first. A student who copies the
  // library's order out of the docs (or out of the graduation table two lines
  // below the one they wanted) must be told which function that spelling
  // belongs to, not handed a message about flat shapes.
  {
    what: 'revolve names extrudeRotate when the { } is written first',
    run: (w) => w.revolve({ segments: 16 }, w.translate([10, 0, 0], w.rect(4, 10))),
    says: /revolve takes the shape first and its extras last.*called extrudeRotate/s,
    why: 'the bare type guard said only "you gave it a { } object", which names nothing',
  },
  {
    what: 'extrude names extrudeLinear when the { } is written first',
    run: (w) => w.extrude({ height: 10 }, w.rect(40, 20)),
    says: /extrude takes the height first and plain.*called extrudeLinear/s,
    why: 'same stumble, same fix — the real call really does take { height } first',
  },
  {
    what: 'turn says which way round its two arguments go',
    run: (w) => w.turn(w.box(10, 10, 10), 45),
    says: /turn takes the angle first and the shape last: turn\(45, shape\)\./,
    why: 'a message about degrees does not help someone who wrote the shape first',
  },
  {
    what: 'sit refuses something that is not a shape',
    run: (w) => w.sit(42),
    says: /sit needs a shape, or a list of shapes/,
    why: 'align on a number produces null coordinates with no error',
  },
];

/**
 * A reSHape result must be a first-class citizen of the real API — that is what
 * "returns real geometry" has to mean in practice, not just isGeometry().
 */
export const INTEROP = [
  { label: 'subtract(rect, disc) — §8.3 in one readable line',
    run: (w) => w.subtract(w.rect(40, 20), w.disc(6)) },
  { label: 'subtract(tube, tube) — the A9.2.2 bushing',
    run: (w) => w.subtract(w.tube(10, 20), w.tube(4, 22)) },
  { label: 'union of a reSHape shape and a real one',
    run: (w) => w.union(w.ball(10), w.cuboid({ size: [10, 10, 10] })) },
  { label: 'hull of two reSHape shapes',
    run: (w) => w.hull(w.disc(5), w.translate([20, 0, 0], w.disc(2))) },
  { label: 'extrudeLinear (the real one) on a reSHape profile',
    run: (w) => w.extrudeLinear({ height: 5 }, w.rect(20, 10)) },
  { label: 'colorize a reSHape solid',
    run: (w) => w.colorize([1, 0, 0], w.ball(5)) },
  { label: 'measureBoundingBox reads a reSHape shape',
    run: (w) => w.box(10, 10, 10) },
  { label: 'a reSHape shape passed through the real align',
    run: (w) => w.align({ modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] }, w.ball(8)) },
  // The three new names, in the shapes /sandbox actually generates.
  { label: 'extrude(6, poly(corners)) — the /sandbox Sketch kind, in one vocabulary',
    run: (w) => w.extrude(6, w.poly([[0, 0], [20, 0], [10, 15]])) },
  { label: 'subtract(box, ring) — a groove cut with a donut',
    run: (w) => w.subtract(w.box(40, 40, 40), w.ring(14, 4)) },
  { label: 'hull(cone, ball) — a reSHape cone in an organic form',
    run: (w) => w.hull(w.cone(10, 20), w.translate([0, 0, 30], w.ball(4))) },
  { label: 'sit(cone) and sit(ring) — both are built centred on the origin',
    run: (w) => w.sit([w.cone(10, 20), w.translate([40, 0, 0], w.ring(14, 4))]) },
  { label: 'revolve(translate(poly)) — a point list swept into a solid',
    run: (w) => w.revolve(w.translate([30, 0, 0], w.poly([[0, 0], [20, 0], [10, 15]]))) },
  { label: 'turn(90, ring) — turning a torus in place',
    run: (w) => w.turn(90, w.ring(14, 4)) },
];

/**
 * THE GRADUATION TABLE, AS AN ANSWER KEY RATHER THAN A DESCRIPTION.
 *
 * reference.md's "#### The nine names" table is the one document a student
 * reads at the moment they leave reSHape, and it is the only place the real call
 * is written out for them to copy. EQUIVALENTS above proves reshape.js matches
 * the real API; it proves nothing about what that table SAYS, so the two could
 * — and did — drift apart with the gate fully green.
 *
 * Measured, before this existed: the `sit` row read
 *   align({ modes: ['none','none','min'], relativeTo: [0,0,0] }, shape)
 * with no `grouped`. On a single shape that is right. On an assembly, `align`
 * defaults to grouped:false and drops EVERY PART separately onto z = 0 — a
 * three-part model measuring [[-10,-10,0],[10,10,54]] under sit() collapses to
 * [[-10,-10,0],[10,10,34]] with the parts interpenetrating, and nothing throws.
 * A student who graduated by copying that row got a silently broken model, in
 * §9.2 and §10.1, which are entirely about assemblies returned as arrays.
 *
 * So both halves of every row are now EXECUTED and compared as whole geometry.
 * The table cannot be wrong again without the gate going red.
 */
export const GRADUATION = {
  path: join(REPO, 'public/reshape/docs/reference.md'),
  heading: '#### The twelve names',

  /**
   * The free names the table's cells use, bound once so both halves of a row
   * start from identical inputs. `parts` is deliberately a three-piece
   * assembly with real vertical offsets — a one-piece list, or parts that
   * already sit on the bed, would not tell grouped:true from grouped:false.
   */
  bindings: [
    'var profile = translate([10, 0, 0], rectangle({ size: [4, 10] }));',
    'var shape = sphere({ radius: 10 });',
    'var corners = [[0, 0], [20, 0], [10, 15]];',
    'var parts = [',
    '  sphere({ radius: 10 }),',
    '  translate([0, 0, 6], cylinder({ radius: 3, height: 34 })),',
    '  translate([0, 0, 37], sphere({ radius: 6 }))',
    '];',
  ].join('\n'),

  /**
   * Rows whose right-hand cell is prose because there IS no plain equivalent.
   * Keyed by the reSHape call so a stale exemption fails on the missing row
   * instead of quietly excusing a new one.
   */
  prose: {
    'turn(45, shape)':
      'turn rotates in place, not about the world origin — it is the one name that is not a rename, ' +
      'and TURN_IN_PLACE pins it to the opposite expectation instead',
  },

  /** Every reSHape name has to appear somewhere in the left column. */
  namesInTable: RESHAPE_NAMES.map((n) => n.name),
};

/**
 * Pull the graduation table out of reference.md as rows. Both cells are read as
 * their FIRST backticked span, which is how the table is written: the code
 * first, any commentary after it.
 */
export function readGraduationTable(text = readFileSync(GRADUATION.path, 'utf8')) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(GRADUATION.heading);
  if (start === -1) return { error: `reference.md has no "${GRADUATION.heading}" heading` };

  const rows = [];
  let seen = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (seen) break;
      continue;
    }
    seen = true;
    if (/^\|[\s|:-]+\|$/.test(line)) continue;            // the --- separator
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 2) continue;
    const code = (cell) => (cell.match(/`([^`]+)`/) || [])[1];
    const reshape = code(cells[0]);
    if (!reshape || reshape === 'reSHape') continue;              // the header row
    rows.push({ line: i + 1, reshape, real: code(cells[1]), rawReal: cells[1] });
  }
  return { rows };
}

/**
 * A context with the table's free names bound in it, ready to evaluate a cell.
 * Both halves of a row run here, against the same `profile` / `shape` /
 * `parts`, so a difference can only be the call.
 */
export function createGraduationContext() {
  const ctx = createSimpleContext();
  vm.runInContext(GRADUATION.bindings, ctx.ctx, { filename: 'graduation-bindings' });
  ctx.evaluate = (expr) => vm.runInContext(`(${expr})`, ctx.ctx, { filename: 'reference.md' });
  return ctx;
}

/**
 * A row of the graduation table only earns its place if the thing it spells out
 * actually matters. These are the counter-cases: the same real call with the
 * load-bearing part removed, which must NOT match. The day one of them matches,
 * the row it guards has become decoration and the check above is vacuous.
 */
export const GRADUATION_TRIPWIRES = [
  {
    what: "the sit row's grouped:true is load-bearing",
    row: 'sit(parts)',
    without: "align({ modes: ['none','none','min'], relativeTo: [0,0,0] }, parts)",
    why: 'align defaults to grouped:false, which drops every part of an assembly '
      + 'separately onto z = 0 — the model collapses into itself and nothing throws',
  },
  {
    what: "the revolve row's operand order is load-bearing",
    row: 'revolve(profile, { segments: 16 })',
    without: 'extrudeRotate(profile, { segments: 16 })',
    throws: true,
    why: 'extrudeRotate takes its { } FIRST — keeping reSHape\'s trailing order after '
      + 'graduating is the swap the row exists to show, and the library dies inside '
      + 'itself rather than saying so',
  },
];

/**
 * A student's own declaration beats everything, and everything on the page
 * beats reSHape. Seeded the way the shim's own collision check is seeded,
 * because a node vm global is too small a surface to produce a real collision
 * on its own.
 */
export const SEEDED_COLLISION = { name: 'box', value: 'a student already owns this word' };

// ---- the context ----------------------------------------------------------

/**
 * The shim context with reshape.js run into it — bundle, shim, then reSHape, in
 * the order runner.html loads them. reshape.js is read off disk and evaluated
 * as-is, never reimplemented here, for the same reason the shim is cut live
 * out of runner.html: edit the file and this tests the edit.
 *
 * `added` is measured by diffing the context's own property names across the
 * load, INSIDE the vm — reading or deleting them from outside the sandbox is a
 * no-op against the vm's real global, which would make an additive-ness check
 * silently pass anything.
 */
export function createSimpleContext(opts = {}) {
  const shim = createShimContext(opts);
  vm.runInContext('globalThis.__beforeSimple = [];', shim.ctx);
  vm.runInContext('__beforeSimple = Object.getOwnPropertyNames(globalThis);', shim.ctx);
  const before = vm.runInContext('__beforeSimple.slice()', shim.ctx);
  vm.runInContext(readFileSync(SIMPLE_PATH, 'utf8').replace(/\r\n/g, '\n'), shim.ctx, {
    filename: 'public/reshape/reshape.js',
  });
  const added = vm.runInContext(
    'Object.getOwnPropertyNames(globalThis).filter(function (n) { return __beforeSimple.indexOf(n) < 0; })',
    shim.ctx
  );
  return { ...shim, before: [...before], added: [...added] };
}

/**
 * A comparison that a wrapper cannot fake. Two geometries built by two routes
 * are the same model when their serialised form is identical — same polygon or
 * side list, same transform matrix, same key order, because they came out of
 * the same constructor.
 */
export function sameGeometry(a, b) {
  const one = Array.isArray(a) ? a : [a];
  const two = Array.isArray(b) ? b : [b];
  if (one.length !== two.length) return `${one.length} shape(s) vs ${two.length}`;
  for (let i = 0; i < one.length; i++) {
    if (JSON.stringify(one[i]) !== JSON.stringify(two[i])) {
      return `shape ${i + 1} differs from the real API's result`;
    }
  }
  return true;
}

/**
 * A comparison that survives a different route to the same model.
 *
 * sameGeometry above compares the serialised object, which is right for the
 * identity bar — two calls that are meant to BE the same call must agree down
 * to the transform matrix. It is the wrong tool for asking whether two
 * different orderings of transforms produced the same shape: JSCAD composes
 * translate and rotate into a lazy matrix, so the same model reached two ways
 * carries two different matrices and two different float tails.
 *
 * So flatten instead: apply the transforms, take every polygon (or side) as a
 * rounded vertex list, sort them, and compare. Two models are the same when
 * they occupy the same points, however they got there.
 */
export function modelFingerprint(jscad, value) {
  const { geom2, geom3, path2 } = jscad.geometries;
  const round = (n) => Math.round(n * 1e6) / 1e6 + 0;
  const point = (v) => Array.from(v, round).join(',');
  const rows = [];
  for (const item of Array.isArray(value) ? value : [value]) {
    if (geom3.isA(item)) {
      for (const poly of geom3.toPolygons(item)) rows.push(poly.vertices.map(point).join(' '));
    } else if (geom2.isA(item)) {
      for (const side of geom2.toSides(item)) rows.push(side.map(point).join(' '));
    } else if (path2.isA(item)) {
      rows.push(path2.toPoints(item).map(point).join(' '));
    } else {
      rows.push(`not-geometry:${typeof item}`);
    }
  }
  return rows.sort().join('|');
}

/** True when two builds occupy the same points, whatever route they took. */
export function sameModel(jscad, a, b) {
  return modelFingerprint(jscad, a) === modelFingerprint(jscad, b);
}

// ---------------------------------------------------------------------------
// The fact we borrowed rather than restated
// ---------------------------------------------------------------------------

/**
 * `turn` exists because JSCAD rotates about the WORLD ORIGIN, so an off-centre
 * shape orbits the middle of the scene instead of spinning in place. That fact
 * was not discovered here — it was measured by the session that built the
 * /sandbox visual modeller, and it already has an executable home in THEIR
 * gate: an assertion named below, which fails their build if the generator ever
 * reverses its build-at-origin-then-translate ordering.
 *
 * reference.md therefore CITES that assertion instead of restating the fact.
 * A doc sentence and a test drift apart silently; a doc that points at a
 * build-failing test cannot go stale without someone noticing — provided the
 * thing it points at still exists. That is what this check is for.
 *
 * It is deliberately read-only and deliberately ours: the file belongs to the
 * other session, and a rename there should fail OUR build (the citation is
 * ours to maintain) rather than theirs. Agreed with that session 2026-08-23;
 * they undertook not to rename it silently, and this is the wall behind the
 * undertaking rather than a substitute for it.
 *
 * If it ever goes red: find what the assertion was renamed to, update `name`
 * here AND the citation in reference.md together. Do not delete the check to
 * make it green — that is the citation rotting, which is the whole thing this
 * exists to prevent.
 */
export const BORROWED_ASSERTIONS = [
  {
    file: 'scripts/model-codegen-assertions.cjs',
    name: 'a turned shape spins about itself, not the scene',
    owner: 'the /sandbox model-codegen session',
    cited: 'the world-origin explanation under "`turn` is the one that is not a rename"',
  },
  {
    file: 'scripts/model-codegen-assertions.cjs',
    name: 'an xz sketch stands up in z, not y',
    owner: 'the /sandbox model-codegen session',
    cited: 'the "`turn` for shapes, `rotate` for frames" section',
  },
];

/** Back-compat alias: the first citation, which existed before there were two. */
export const BORROWED_ASSERTION = BORROWED_ASSERTIONS[0];

// ===========================================================================
// THE BRIDGE — every call the seven written Q3 chapters make, and the row in
// reference.md that answers it.
// ===========================================================================
//
// REVERSE_LOOKUP above asks a narrow question: does every name reSHape stands in
// for have a row? It cannot ask the wide one, which is the one that matters to
// a student — is there a row for every name the BOOK PRINTS? Measured before
// this existed: eight names the chapters type had no row anywhere and were not
// in the closing "everything else" sentence either, `cube` among them at 12
// calls across four chapters, in the opening runnable block of the whole unit.
// A missing row does not read as "we forgot"; it reads as "nothing to worry
// about", which is the exact opposite of true.
//
// The census below is the measurement, pinned as data so the gate does not
// depend on a second repository being checked out. Its method is written down
// because a count is only worth as much as its denominator: a naive
// whole-document regex over the same seven files returns 549, because it counts
// prose mentions and option-table rows as calls.

export const BOOK_CENSUS = {
  source: 'bookSHelf/projects/Introduction to Programming Concepts and Methodologies/html/'
    + '{8.1,8.2,8.3,8.4,8.5,9.1,9.2}_*.html',
  method:
    'Occurrences of a bare `name(` inside the 209 <textarea class="cs-input"> runnable '
    + 'editors across the seven chapters, with /* */ and // comments and string literals '
    + 'stripped first, matched against the export lists of the fifteen modules read out of '
    + 'the vendored public/reshape/lib/jscad-modeling.min.js. EXCLUDED: inline <code> in prose '
    + 'and option tables (every <code> in all seven files was verified single-line, so no '
    + 'code example lives outside the textareas); <pre class="cs-out"> program output; JS '
    + 'builtins and array methods; require() and main() module plumbing. Dotted member calls '
    + 'were excluded except path2.fromPoints, which is genuine library API.',

  /** Bare `name(` calls per chapter. These sum to the bare total below. */
  perChapter: { '8.1': 55, '8.2': 41, '8.3': 64, '8.4': 9, '8.5': 28, '9.1': 22, '9.2': 52 },

  /**
   * name -> how many times the chapters CALL it in runnable code.
   * Every one of these must be a real export of the vendored bundle, and must
   * have a row in one of reference.md's two bridge tables — never both.
   */
  calls: {
    circle: 59, rectangle: 31, translate: 27, cuboid: 24, subtract: 13, cube: 12,
    polygon: 10, sphere: 9, union: 9, extrudeLinear: 9, rotate: 9, extrudeRotate: 6,
    cylinder: 5, mirror: 5, torus: 4, intersect: 4, scale: 4, center: 4, align: 4,
    roundedCuboid: 3, rotateZ: 2, measureDimensions: 2, measureVolume: 2, hullChain: 2,
    vectorText: 2, ellipse: 2, roundedRectangle: 2, star: 2, extrudeRectangular: 2,
    roundedCylinder: 2,
  },

  /** The one dotted call that is library API rather than a JS builtin. */
  dottedCalls: { 'path2.fromPoints': ['geometries', 'path2', 'fromPoints', 2] },

  /** 271 bare + 2 dotted. */
  totalCalls: 273,

  /**
   * How many of those calls are in a spelling reSHape replaces. Derived from
   * `calls` and the reSHape-word table at check time, and pinned here so a row
   * quietly moving between the two tables cannot go unnoticed.
   *
   * Was 177 before `ring` and `poly` existed. torus (4 calls) and polygon (10)
   * moved off the "type what the book typed" table and onto the reSHape-word one:
   * the two tables are a partition, so a name gained here is a name lost there.
   *
   * This number is NOT the A8.2.2 cost, and an earlier version of this comment
   * said it was. Book calls replaced and assignment targets taken are different
   * questions with different answers — polygon accounts for 10 of the calls
   * moved here and for none of the assignment cost at all, because §8.2 teaches
   * it. See ASSIGNMENT_POOL for that half.
   */
  replacedCalls: 191,
};

/**
 * A8.2.2 ASKS FOR A PRIMITIVE THE COURSE DOES NOT COVER, AND THE FIRST VERSION
 * OF THIS RECORD COUNTED THE WRONG THING.
 *
 * It read the assignment as "not covered in class" and concluded that `poly`
 * cost A8.2.2 its best target, that `ring` cost it the second, and that
 * `ellipse` and `star` were the surviving pool. Every one of those three claims
 * is false, and they are false for one reason: two words were dropped from the
 * quotation. The assignment, at curriculum-plan.md, reads
 *
 *   "find and use one primitive type NOT covered in class THIS WEEK"
 *
 * and §8.2 IS that week. Its learning objective is "Create 2D primitives:
 * rectangle, circle, ellipse, polygon, star", and the book section gives
 * ellipse, polygon and star each a titled API subsection, an option table, a
 * Try It Now and a worked solution. So all five were covered in class that
 * week, and NONE of them was ever an eligible answer.
 *
 * The corrected accounting runs the other way round from the original:
 *
 *   * `poly` costs A8.2.2 NOTHING. polygon is §8.2's own material — 6 of its 10
 *     book calls are inside that section, with solutions. The refusal that
 *     protected it was protecting a target that did not exist.
 *   * `ring` and `cone` are what actually took from the pool: torus (called in
 *     8.1 and 9.2, never in 8.2) and cylinderElliptic (zero book calls
 *     anywhere). The banner had waved cylinderElliptic through as free BECAUSE
 *     it has no book calls, which for this assignment is the qualifying
 *     property, not a discount.
 *   * eligible primitives went from nine to seven, and torus was the only one
 *     of the nine that the seven chapters call at all — so the book-anchored
 *     part of the pool went from one to zero, and `ring` is what emptied it.
 *
 * And the part that survives all of it: both losses are 3D primitives, in a 2D
 * week. The 2D remainder — square, triangle, arc, line — is untouched, the book
 * never calls any of the four, and that is the pool a 2D lab realistically
 * draws on. A8.2.2 is in better shape than either the old record or its
 * correction suggests; it is the accounting that was wrong, not the assignment
 * that was broken.
 *
 * THE DATA MODEL IS THE FIX, NOT THE NUMBERS. BOOK_CENSUS.calls is a flat
 * per-name total with no chapter attribution, so it cannot express "taught in
 * the assignment's own week" and the old check could never have asked. Rather
 * than pin a second census, the two sentences that decide everything are READ
 * OUT OF curriculum-plan.md at gate time and matched against reshape.js's
 * quotation of them — which is what makes dropping two words from a quote a
 * red check instead of a plausible paragraph.
 */
export const ASSIGNMENT_POOL = {
  assignment: 'A8.2.2',
  planPath: join(REPO, 'curriculum-plan.md'),

  /** the assignment, verbatim. The check finds this in the plan, and in reshape.js. */
  wording: 'find and use one primitive type NOT covered in class this week',
  /** §8.2's own learning objective, likewise read out of the plan */
  objectiveLine: 'Create 2D primitives: rectangle, circle, ellipse, polygon, star',
  /** parsed off that line — the names that are covered in class that week */
  taughtThisWeek: ['circle', 'ellipse', 'polygon', 'rectangle', 'star'],

  /**
   * ELIGIBLE = a primitive of the bundle that reSHape has no word for AND §8.2
   * does not teach. Derived at check time from those two facts, never listed by
   * hand; this is the expected answer, and disagreeing with it is the failure.
   */
  eligible: ['arc', 'ellipsoid', 'geodesicSphere', 'line', 'polyhedron', 'square', 'triangle'],
  /** the 2D half, which is what a 2D week's lab actually draws on */
  eligible2d: ['arc', 'line', 'square', 'triangle'],
  /** floor: A8.2.2 is unwriteable the day this reaches zero */
  minEligible2d: 4,

  /**
   * NONE of the survivors is a name the seven chapters call — and the old
   * record's floor, "at least two book-anchored targets must survive", was
   * measuring the wrong property in the first place. A8.2.2 asks for a
   * primitive the week did NOT cover, read out of the real JSCAD documentation.
   * A primitive the book never calls is the better exercise, not the worse one.
   * The number is pinned anyway, because it went from one to zero this round —
   * torus was the only book-called primitive that was ever eligible, and `ring`
   * is what took it.
   */
  bookUsedEligible: [],

  /** taken from the eligible pool this round — and NOT polygon */
  taken: ['cylinderElliptic', 'torus'],
  /** claimed by reSHape, but never eligible, so its loss cost the assignment nothing */
  neverEligible: ['polygon'],

  /**
   * The softener nobody had measured, recorded because it is larger than
   * anything the three new names did: reference.md's own primitives catalogue
   * publishes the option signature of every surviving target, lib/reshape-docs.ts
   * mirrors it under the SYNC gate, and /docs/reshape serves it in-app. "Using
   * only the JSCAD documentation" is therefore satisfiable without leaving
   * shCode. That predates this round and is deliberate — a missing row reads as
   * "nothing to worry about" — but it is the real cost to A8.2.2, and pretending
   * otherwise would repeat the mistake this record exists to correct.
   */
  spoiledByOurOwnDocs: true,
};

/**
 * Where reference.md answers each half of the census.
 *
 * Two tables, deliberately separate. The first is the reverse lookup
 * REVERSE_LOOKUP already reads. The second is the one that did not exist: a row
 * per name reSHape has NO word for, saying so, because silence reads as safety.
 */
export const BRIDGE = {
  path: join(REPO, 'public/reshape/docs/reference.md'),
  reshapeWordHeading: REVERSE_LOOKUP.heading,
  noWordHeading: "#### The book's other names — type what the book typed",
  tauHeading: '#### `TAU` is a value, not a name in scope',
};

/**
 * Read every two-column table row under a heading, up to the next heading of
 * any level. Both cells are read as their FIRST backticked span in full — not
 * as a bare identifier — because one of the names in play is dotted
 * (`path2.fromPoints`) and an identifier-only reader drops it silently.
 */
export function readBridgeTable(heading, text = readFileSync(BRIDGE.path, 'utf8')) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) return { error: `reference.md has no "${heading}" heading` };
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) break;
    if (!line.startsWith('|')) continue;
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 2) continue;
    const span = (cell) => (cell.match(/`([^`]+)`/) || [])[1];
    const left = span(cells[0]);
    if (!left) continue;
    rows.push({ line: i + 1, left, right: cells[1], rawLeft: cells[0] });
  }
  return { rows };
}

/**
 * Three rows of the reSHape-word table are not renames. The real call and the
 * reSHape word beside it do DIFFERENT THINGS, and each difference is silent —
 * the model comes out wrong and nothing throws. A row that does not say so is
 * worse than a missing row, because the table reads as authoritative.
 */
export const BRIDGE_WARNINGS = [
  {
    real: 'rotate',
    says: [/own middle/],
    why: 'rotate pivots on the world origin, turn pivots on the shape — an off-centre '
      + 'shape orbits under one and stays put under the other',
  },
  {
    real: 'rotateZ',
    says: [/world origin/],
    why: 'the single-axis shortcuts orbit the world origin exactly the way rotate does',
  },
  {
    real: 'align',
    says: [/none/, /wrong answer/i],
    why: "sit is hard-wired to modes ['none','none','min'] and not one align in the seven "
      + 'chapters is written that way — see SIT_VS_BOOK_ALIGN for the measurement',
  },
  {
    real: 'torus',
    says: [/ring\(ringRadius, tubeRadius\)/, /outerRadius/],
    why: "JSCAD's outerRadius is the radius of the circle the tube travels along, not the "
      + 'outside edge of the donut, and its innerRadius is the tube — so ring inverts the '
      + 'pair on purpose. A row that only said "torus -> ring" would send a student '
      + 'straight into the misreading the name was added to close',
  },
  {
    real: 'polygon',
    says: [/orientation/],
    why: 'poly has no options object at all, so polygon\'s paths and orientation are on the '
      + 'other side of it — the same shape of warning extrudeLinear carries about twistAngle',
  },
  {
    real: 'extrudeRotate',
    says: [/full turn only/i, /9\.1/],
    why: 'revolve has no angle key, and §9.1\'s first worked example is a half turn',
  },
  {
    real: 'extrudeLinear',
    says: [/twistAngle/, /9\.1/],
    why: 'extrude has no options object at all, so it has no twistAngle either, and three of '
      + "§9.1's five extrudeLinear calls carry one. Found by sweeping the chapters for object "
      + 'KEYS rather than call names, the same way the parameter-type hole was found: `extrude` '
      + 'had a plain rename row, `twistAngle` appeared nowhere in reference.md at all, and the '
      + 'in-app docs taught it — two doc surfaces disagreeing again, in the direction that '
      + 'leaves the file a student is told to keep open the poorer of the two',
  },
];

/**
 * THE align ROW, MEASURED.
 *
 * `align (onto z = 0) -> sit` was a true row about a call the book never makes.
 * All four align calls in the seven chapters centre the shape on X (and one of
 * them on Y as well) at the same time as dropping it, and sit does neither.
 * Swapping one for the other leaves the part on the bed but still off to one
 * side — a different model, no error, and a table row that told you to do it.
 *
 * So the row now carries the warning, and this is the counter-case behind it:
 * the day these two boxes agree, the warning has become decoration.
 */
export const SIT_VS_BOOK_ALIGN = {
  bookModes: [
    { modes: ['center', 'center', 'min'], calls: 3, where: '§8.2 once, §9.2 twice' },
    { modes: ['center', 'min', 'min'], calls: 1, where: '§8.2' },
  ],
  sitModes: ['none', 'none', 'min'],
  /** deliberately off-centre in X and Y, which is the whole difference */
  build: (w) => w.translate([40, 25, 12], w.box(20, 10, 8)),
  sitBox: [[30, 20, 0], [50, 30, 8]],
  bookBox: [[-10, -5, 0], [10, 5, 8]],
};

/**
 * TAU IS NOT A NAME IN THIS RUNNER, AND §9.1 TYPES IT FIVE TIMES.
 *
 * Measured by executing the vendored bundle and the shim: MODULE_ORDER installs
 * the fifteen module names and then their members ONE LEVEL DEEP, so `maths`
 * and `constants` both land in scope and TAU — which lives at
 * maths.constants.TAU, one level below that — does not. Paste §9.1's own worked
 * example into shCode and it dies on `TAU is not defined`, in the one chapter
 * reSHape's `revolve` exists to serve.
 *
 * This is not fixed by adding a name. runner.html installs the scope and this
 * layer adds no tenth word, so the fix is that reference.md says what to type
 * and reSHape's own refusals spell a call that runs. Both are checked.
 *
 * `inScope: false` is asserted, not assumed. The day the runner does install a
 * bare TAU, this goes red and the documentation it guards should be deleted
 * rather than left saying something that stopped being true.
 */
export const BOOK_IDENTIFIERS = [
  {
    name: 'TAU',
    blocks: 5,
    where: '§9.1',
    inScope: false,
    write: 'constants.TAU',
    portable: 'maths.constants.TAU',
    alsoWrite: 'Math.PI * 2',
    value: 6.283185307179586,
  },
];

/**
 * EVERY CALL A REFUSAL SPELLS OUT HAS TO RUN.
 *
 * REFUSALS_NAME_THE_REAL_CALL asserts the message hands over a real function
 * name, and for two of them that the message spells the whole call. Neither
 * check asks whether the spelled call WORKS — and measured, neither did: both
 * were written with the book's bare `TAU`, which throws here. reSHape's one
 * promise is that a dead end is always one function name from an answer, and
 * an answer that throws is not an answer.
 *
 * So the call is lifted out of the message verbatim and executed.
 */
export const REFUSAL_CALLS = [
  {
    what: 'the part-turn call revolve hands over',
    trigger: (w) => w.revolve(w.translate([10, 0, 0], w.rect(4, 10)), { angle: Math.PI }),
    call: 'extrudeRotate({ segments: 16, angle: constants.TAU / 2 }, profile)',
    bindings: 'var profile = translate([10, 0, 0], rectangle({ size: [4, 10] }));',
    why: "§9.1's own worked example is a part turn and revolve does not do part turns",
  },
  {
    what: 'the twist call extrude hands over',
    trigger: (w) => w.extrude(10, w.rect(10, 10), { twistAngle: 1 }),
    call: 'extrudeLinear({ height: 10, twistAngle: constants.TAU / 4, twistSteps: 20 }, profile)',
    bindings: 'var profile = rectangle({ size: [10, 10] });',
    why: 'extrude has no options object at all, so the whole twist is on the other side of '
      + 'this message',
  },
  {
    what: 'the cut-off-point call cone hands over',
    trigger: (w) => w.cone(10, 20, { endRadius: [4, 4] }),
    call: 'cylinderElliptic({ startRadius: [10, 10], endRadius: [4, 4], height: 20 })',
    bindings: '',
    why: 'a frustum is a real thing to want and cone models a point only',
  },
  {
    what: 'the pie-slice call cone hands over',
    trigger: (w) => w.cone(10, 20, { endAngle: 3 }),
    call: 'cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, startAngle: 0, endAngle: constants.TAU / 2 })',
    bindings: '',
    why: 'it spells constants.TAU rather than the book\'s bare TAU, which throws in this runner',
  },
  {
    what: 'the segmented-torus call ring hands over',
    trigger: (w) => w.ring(14, 4, { segments: 64 }),
    call: 'torus({ outerRadius: 14, innerRadius: 4, outerSegments: 64 })',
    bindings: '',
    why: 'ring has no { } at all, and plain `segments` is the key torus silently drops',
  },
];

/**
 * EVERY OPTION KEY THE CHAPTERS PRINT, SWEPT FOR THE SILENT ONE.
 *
 * A name with a row is only translated if the KEYS beside it do something. So
 * each key the seven chapters type is built twice with two different values and
 * the two results compared: a key that changes nothing is a key the library is
 * ignoring, and JSCAD ignores an unknown option without a word.
 *
 * Fourteen pairs, thirteen of them fine — and one that is not. §8.1's glyph
 * exercise writes `vectorText({ height: 8, inputText: 'J' })`, and there is no
 * `inputText` option. Measured: that call and the same one with `'H'` come back
 * byte-identical, and so does `vectorText({ height: 8 })` with no letter at
 * all. The chapter then says "run, then swap 'J' for 'H'", which changes
 * nothing and reports nothing — the single worst shape a beginner exercise can
 * have. The real key is `input`.
 *
 * `changes: false` is therefore an assertion that the defect is still there,
 * not a tolerance. The day the library accepts `inputText`, this goes red and
 * the warning on the vectorText row should be deleted rather than left saying
 * something that stopped being true.
 */
export const BOOK_OPTION_KEYS = [
  { what: 'star vertices', changes: true,
    a: (w) => w.star({ vertices: 5, outerRadius: 10, innerRadius: 4 }),
    b: (w) => w.star({ vertices: 9, outerRadius: 10, innerRadius: 4 }) },
  { what: 'path2.fromPoints closed', changes: true,
    a: (w) => w.path2.fromPoints({ closed: true }, [[0, 0], [10, 0], [10, 10]]),
    b: (w) => w.path2.fromPoints({ closed: false }, [[0, 0], [10, 0], [10, 10]]) },
  { what: 'mirror normal', changes: true,
    a: (w) => w.mirror({ normal: [1, 0, 0] }, w.translate([10, 0, 0], w.box(4, 4, 4))),
    b: (w) => w.mirror({ normal: [0, 1, 0] }, w.translate([10, 0, 0], w.box(4, 4, 4))) },
  { what: 'center axes', changes: true,
    a: (w) => w.center({ axes: [true, false, false] }, w.translate([10, 10, 10], w.box(4, 4, 4))),
    b: (w) => w.center({ axes: [true, true, true] }, w.translate([10, 10, 10], w.box(4, 4, 4))) },
  { what: 'align modes', changes: true,
    a: (w) => w.align({ modes: ['center', 'center', 'min'] }, w.translate([10, 10, 10], w.box(4, 4, 4))),
    b: (w) => w.align({ modes: ['none', 'none', 'min'] }, w.translate([10, 10, 10], w.box(4, 4, 4))) },
  { what: 'extrudeRotate angle', changes: true,
    a: (w) => w.extrudeRotate({ segments: 16, angle: Math.PI }, w.disc(2, { center: [6, 0] })),
    b: (w) => w.extrudeRotate({ segments: 16, angle: Math.PI * 2 }, w.disc(2, { center: [6, 0] })) },
  { what: 'extrudeLinear twistAngle', changes: true,
    a: (w) => w.extrudeLinear({ height: 10, twistAngle: Math.PI / 2, twistSteps: 20 }, w.rect(10, 4)),
    b: (w) => w.extrudeLinear({ height: 10 }, w.rect(10, 4)) },
  { what: 'torus innerRadius', changes: true,
    a: (w) => w.torus({ innerRadius: 2, outerRadius: 8 }),
    b: (w) => w.torus({ innerRadius: 3, outerRadius: 8 }) },
  { what: "torus outerSegments — the key ring's refusal hands over", changes: true,
    a: (w) => w.torus({ innerRadius: 4, outerRadius: 14 }),
    b: (w) => w.torus({ innerRadius: 4, outerRadius: 14, outerSegments: 64 }) },
  { what: "cylinderElliptic endRadius — the key cone's refusal hands over", changes: true,
    a: (w) => w.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }),
    b: (w) => w.cylinderElliptic({ startRadius: [10, 10], endRadius: [4, 4], height: 20 }) },
  { what: "polygon orientation — the key poly's refusal hands over", changes: true,
    a: (w) => w.polygon({ points: [[0, 0], [20, 0], [10, 15]] }),
    b: (w) => w.polygon({ points: [[0, 0], [20, 0], [10, 15]], orientation: 'clockwise' }) },
  { what: 'ellipse radius pair', changes: true,
    a: (w) => w.ellipse({ radius: [5, 10] }),
    b: (w) => w.ellipse({ radius: [10, 5] }) },
  { what: 'extrudeRectangular size', changes: true,
    a: (w) => w.extrudeRectangular({ size: 2, height: 10 }, w.rect(10, 20)),
    b: (w) => w.extrudeRectangular({ size: 4, height: 10 }, w.rect(10, 20)) },
  { what: 'cube size', changes: true,
    a: (w) => w.cube({ size: 10 }), b: (w) => w.cube({ size: 20 }) },
  { what: 'polygon points', changes: true,
    a: (w) => w.polygon({ points: [[0, 0], [10, 0], [10, 10]] }),
    b: (w) => w.polygon({ points: [[0, 0], [20, 0], [20, 20]] }) },
  { what: "vectorText input — the real key", changes: true,
    a: (w) => w.vectorText({ height: 8, input: 'J' }),
    b: (w) => w.vectorText({ height: 8, input: 'H' }) },
  {
    what: "vectorText inputText — the key §8.1 prints, and the library has not got",
    changes: false,
    a: (w) => w.vectorText({ height: 8, inputText: 'J' }),
    b: (w) => w.vectorText({ height: 8, inputText: 'H' }),
    row: 'vectorText',
    says: [/inputText/, /`input`/],
    why: "§8.1 says \"swap 'J' for 'H' and run again\"; nothing changes and nothing is reported",
  },
];

/**
 * THE OBJECT LITERAL, WHICH IS THE LAYER'S ENTIRE JUSTIFICATION.
 *
 * reSHape's defence is that it does not hide objects, it postpones them until
 * they are worth having. Measured before this existed, the section making that
 * argument contained exactly ONE live object literal —
 * box(40, 20, 10, { center: [0, 0, 10] }) — because every other brace on the
 * page was inside a // comment showing the real API. One brace does not carry
 * an argument about braces, and meanwhile 197 of the book's own calls lead with
 * one.
 *
 * So the section is measured: how many option objects a student can actually
 * run, how many of them carry more than one key, and whether the three keys the
 * layer ships each appear in a worked example rather than only in a table.
 */
export const OBJECT_DEPTH = {
  path: join(REPO, 'public/reshape/docs/reference.md'),
  heading: '## reSHape — the simplified names',
  endsBefore: '## Modules',

  /** live = not inside a comment, so it really is executed by the gate */
  minLiveObjects: 12,
  /** the progression only exists if braces grow: one key, then two, then three */
  minMultiKey: 5,
  minKeysInOneObject: 3,
  /** and the shape a student is being taught to write first */
  minSingleKey: 4,

  /** every option key reSHape ships, worked rather than merely listed */
  keys: RESHAPE_OPTION_KEYS,

  /**
   * getParameterDefinitions is the richest object writing in the quarter and
   * §8.4 is entirely about it, so it is the one place the section has to show
   * an array OF objects rather than one object. It stays real JSCAD: no reSHape
   * name is involved in the parameter panel itself.
   */
  parameters: {
    marker: 'getParameterDefinitions',
    minDefinitions: 3,
    everyDefinition: ['name', 'type', 'caption'],
    /** at least one definition carries each of these richer shapes */
    someDefinition: [['min', 'max', 'step'], ['values', 'captions']],
    /** and the defaults must really reach main() and change the model */
    modelBox: [[-20, -10, 0], [20, 10, 10]],
  },
};

/**
 * The parameter panel's one trap, and the reason the example above uses a
 * `choice` where a `checkbox` would read more naturally.
 *
 * The in-app runner has no parameter UI: it reads each definition's `initial`
 * (or `default`) and calls main() with those once. A checkbox's default is
 * spelled `checked`, which is not either of those, so `params.engrave` arrives
 * as undefined however the definition was written. That is a documented fact
 * about runner.html, read out of runner.html rather than restated.
 */
export const PARAM_DEFAULTS = {
  runner: 'public/reshape/runner.html',
  reads: ['initial', 'default'],
  ignores: 'checked',
  saysInReference: /checkbox[\s\S]{0,400}?`checked`[\s\S]{0,400}?undefined/,

  /**
   * And the field it never reads at all, which is the fact the whole parameter
   * section now rests on: `type` chooses a control, `initial` carries the
   * value. If initialOf ever starts branching on `type`, an unlisted type stops
   * being harmless and every "type what the book typed" row below becomes a
   * guess — so this goes red rather than the docs going quietly wrong.
   */
  neverReads: 'type',
  saysTypeIsIgnored: /`type` decides how the panel ASKS for a value\. `initial` decides what the\s*\n?value IS/,
};

/** Comments out, so what is left is what the gate actually executes. */
export function stripJsComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
}

/**
 * The option objects in a block of code, as their key lists. Innermost braces
 * only, which is exactly right here: a function body containing any nested
 * brace is skipped, and an option object never nests.
 */
export function liveObjectLiterals(code) {
  const out = [];
  for (const m of stripJsComments(code).matchAll(/\{([^{}]*)\}/g)) {
    const keys = [...m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((k) => k[1]);
    if (keys.length) out.push(keys);
  }
  return out;
}

/** The slice of reference.md the reSHape layer owns. */
export function reshapeSection(text = readFileSync(OBJECT_DEPTH.path, 'utf8')) {
  const src = text.replace(/\r\n/g, '\n');
  const start = src.indexOf(OBJECT_DEPTH.heading);
  if (start === -1) return { error: `reference.md has no "${OBJECT_DEPTH.heading}" heading` };
  const end = src.indexOf(OBJECT_DEPTH.endsBefore, start);
  if (end === -1) return { error: `reference.md has no "${OBJECT_DEPTH.endsBefore}" heading after it` };
  const body = src.slice(start, end);
  const line = src.slice(0, start).split('\n').length;
  return { body, line };
}

/** Evaluate an expression in a reSHape context with extra bindings in place. */
export function evaluateInShcad(bindings, expr) {
  const ctx = createSimpleContext();
  if (bindings) vm.runInContext(bindings, ctx.ctx, { filename: 'bindings' });
  return { ...ctx, value: vm.runInContext(`(${expr})`, ctx.ctx, { filename: 'refusal-message' }) };
}


// ===========================================================================
// THE PARAMETER PANEL — the half of the reading that is not a call.
// ===========================================================================
//
// BOOK_CENSUS counts CALLS, and every bridge table above answers a NAME. §8.4
// and §8.5 also print words that are neither: the `type:` values inside
// getParameterDefinitions, which are strings in an object literal. Nothing
// counted them and no table covered them, so the coverage claim was true and
// still left a hole a student falls into.
//
// Measured: a reSHape-only reader translated every one of §8.5's 28 calls and
// then stopped dead on line two of its first parameter block —
// `{ name: 'ringRadius', type: 'float', ... }`. `float` appeared nowhere in
// anything shCode shipped: not in reference.md's four-row type table, not on
// any bridge table, and the in-app docs said "THREE of the types hand you a
// number" — which does not merely omit `float`, it counts the numeric types
// and gets the wrong answer, so the docs actively denied it existed. One line
// earlier, `type: 'int'` had the same problem for anyone reading reference.md
// alone: the in-app docs teach `int` and `slider`, reference.md listed
// neither, and reference.md is the file the reSHape section tells a student to
// keep open while reading.
//
// The answer is one sentence, and it is what the checks below pin rather than
// the nine-row table: TYPE PICKS THE CONTROL, INITIAL CARRIES THE VALUE.
// runner.html never reads `type` at all. So `float` always worked — it was
// simply undiscoverable, which is the same thing as broken for a student who
// has been correctly trained not to guess.

export const PARAM_TYPES = {
  path: join(REPO, 'public/reshape/docs/reference.md'),
  inApp: join(REPO, 'lib/reshape-docs.ts'),

  /** The book -> shCode table, in the reSHape section. */
  heading: '#### The parameter panel — the words that are not calls',
  /** The plain reference table, in the API half of the file. */
  referenceHeading: '## Parameters',

  source: BOOK_CENSUS.source,
  method:
    "Occurrences of type: '<word>' inside the same 209 <textarea class=\"cs-input\"> "
    + 'runnable editors BOOK_CENSUS counts calls in. These are values in an object '
    + 'literal, not calls, so BOOK_CENSUS neither counts them nor could: it is a '
    + 'census of a different kind of thing, and that is exactly why the hole existed.',

  /** spelling -> how many definitions use it, and which chapter prints them. */
  spellings: {
    number: { defs: 9, chapter: '8.4' },
    int: { defs: 6, chapter: '8.5', names: ['count', 'rows', 'cols'] },
    choice: { defs: 4, chapter: '8.4' },
    slider: { defs: 2, chapter: '8.4' },
    float: { defs: 2, chapter: '8.5', names: ['ringRadius'] },
    checkbox: { defs: 2, chapter: '8.4' },
    group: { defs: 2, chapter: '8.4' },
  },
  totalDefinitions: 27,

  /**
   * Every type reference.md's own table has to carry a row for: the seven the
   * chapters print, plus `text` and `color`, which the in-app docs teach with
   * a worked example each. A type taught on one surface and absent from the
   * other is how this went wrong the first time.
   */
  documented: [
    'number', 'slider', 'int', 'float', 'text', 'checkbox', 'choice', 'color', 'group',
  ],

  /**
   * The four that are the same number asked for four different ways. The
   * in-app docs COUNT these in prose, so the count is pinned to the list —
   * that sentence is what told a student `float` was not a numeric type.
   */
  numeric: ['number', 'slider', 'int', 'float'],
  numericWord: 'Four',
  numericSentence: /(\w+) of the types hand you a number/,

  /**
   * type is ignored; initial is read. Each of these is declared with its own
   * type and its own initial, and the value has to arrive at main() unchanged
   * and with its JavaScript type intact.
   */
  arrives: [
    { type: 'number', initial: 10 },
    { type: 'slider', initial: 20 },
    { type: 'int', initial: 6 },
    { type: 'float', initial: 2.5 },
    { type: 'text', initial: 'HI' },
    { type: 'choice', initial: 'round' },
    { type: 'color', initial: '#ff5555' },
    { type: 'nonsense-that-is-not-a-reshape-type', initial: 41.5 },
  ],

  /**
   * The two that do not follow the rule, and both are documented as such.
   * checkbox spells its default `checked`, which nothing here reads; group is
   * furniture and declares no value at all.
   */
  declaresNothing: [
    { what: 'a checkbox carrying only its own spelling of a default',
      def: "{ name: 'engrave', type: 'checkbox', checked: true }" },
    { what: 'a group, which is a heading rather than a knob',
      def: "{ name: 'plateGroup', type: 'group', caption: 'Plate' }" },
  ],

  /**
   * The runnable example in the reSHape section. Its whole job is to show the
   * four numeric spellings declared together and arriving as one kind of
   * thing, so it is found by the type the docs used to deny.
   */
  example: {
    findBy: /type:\s*'float'/,
    declares: ['int', 'float', 'slider', 'number'],
    everyValueIsA: 'number',
  },
};

/**
 * The first backticked span of the first column of every table row under a
 * heading. Unlike readBridgeTable this does not care how many columns the
 * table has — the parameter tables carry three — and it reads the whole span,
 * because the cells here are `type: 'float'` rather than bare identifiers.
 */
export function readFirstColumn(heading, text = readFileSync(PARAM_TYPES.path, 'utf8')) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) return { error: `reference.md has no "${heading}" heading` };
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) break;
    if (!line.startsWith('|')) continue;
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const left = (cells[0].match(/`([^`]+)`/) || [])[1];
    if (!left) continue;
    rows.push({ line: i + 1, left, rest: cells.slice(1).join(' | ') });
  }
  return { rows };
}

/** A one-parameter program, built from a definition literal, for the gate to run. */
export function paramProgram(defLiteral) {
  return `function getParameterDefinitions() { return [${defLiteral}] }
function main(params) { globalThis.__seen = params; return box(10, 10, 10) }`;
}


/**
 * EVERY OPTION KEY THE CHAPTERS TYPE, AND WHETHER reference.md WRITES IT.
 *
 * This is the generalised wall behind two stalls that were found by hand, one
 * per round, both of the same shape: a word the book prints INSIDE an object
 * literal rather than as a call, so no census counted it and no bridge table
 * covered it.
 *
 *   round 1  `type: 'float'` (§8.5). reference.md's parameter table had four
 *            rows and the book prints seven types. See PARAM_TYPES.
 *   round 2  `twistAngle` / `twistSteps` (§9.1, three runnable editors).
 *            `extrudeLinear` had a plain rename row pointing at `extrude`,
 *            which has no options object at all — and the two words appeared
 *            NOWHERE in reference.md, while the in-app docs taught both.
 *
 * Both times the defect was the same one: two doc surfaces disagreeing, with
 * reference.md — the file the reSHape section tells a student to keep open while
 * reading — the poorer of the two. So the list below is swept rather than
 * spot-checked. A key here must be WRITTEN in reference.md, inside backticks,
 * not merely implied by the function that takes it.
 *
 * Measured the same way as BOOK_CENSUS: object-literal keys inside the 209
 * runnable editors of the seven chapters, comments stripped, minus the
 * getParameterDefinitions keys (PARAM_TYPES owns those) and minus keys that
 * belong to a student's own object rather than to the library.
 */
export const BOOK_OPTION_WORDS = {
  path: join(REPO, 'public/reshape/docs/reference.md'),

  /** key -> the call that takes it, for the failure message. */
  keys: {
    angle: 'extrudeRotate',
    axes: 'center',
    center: 'cuboid / circle / cylinder',
    closed: 'path2.fromPoints',
    height: 'extrudeLinear / cylinder / vectorText',
    innerRadius: 'torus / star',
    input: 'vectorText',
    inputText: 'nothing — the key §8.1 prints and the library has not got',
    modes: 'align',
    normal: 'mirror',
    outerRadius: 'torus / star',
    points: 'polygon',
    radius: 'circle / sphere / cylinder / ellipse',
    roundRadius: 'roundedCuboid / roundedRectangle / roundedCylinder',
    segments: 'circle / sphere / cylinder / extrudeRotate',
    size: 'cuboid / rectangle / cube / extrudeRectangular',
    twistAngle: 'extrudeLinear',
    twistSteps: 'extrudeLinear',
    vertices: 'star',
  },

  /**
   * Not from the book, but from reSHape's own graduation table — the two keys a
   * student is handed at the moment they leave the layer. `grouped` is the one
   * that silently collapses an assembly if it goes missing.
   */
  alsoFromGraduation: { grouped: 'align', relativeTo: 'align' },

  /**
   * And the keys reSHape's own refusals SPELL OUT. Three of the twelve names hand
   * a student a real call carrying a key the layer does not offer — cone's
   * frustum and pie slice, ring's segmented torus. REFUSAL_CALLS proves those
   * calls run; this proves reference.md writes the words, so a student who met
   * one in an error message can look it up in the file they were told to keep
   * open rather than only in the error.
   */
  alsoFromRefusals: {
    startRadius: 'cylinderElliptic',
    endRadius: 'cylinderElliptic',
    startAngle: 'cylinderElliptic / torus',
    endAngle: 'cylinderElliptic',
    outerSegments: 'torus',
    innerSegments: 'torus',
    paths: 'polygon',
    orientation: 'polygon',
  },
};


// ---------------------------------------------------------------------------
// SVG — the only way 2D work leaves the app
// ---------------------------------------------------------------------------

/** public/reshape/svg.js, evaluated into a shim context the way reshape.js is. */
export const SVG_PATH = join(REPO, 'public/reshape/svg.js');

export function createSvgContext(opts = {}) {
  const sc = createSimpleContext(opts);
  vm.runInContext(readFileSync(SVG_PATH, 'utf8').replace(/\r\n/g, '\n'), sc.ctx, {
    filename: 'public/reshape/svg.js',
  });
  return { ...sc, svg: sc.ctx.reshapeSvg ?? sc.window.reshapeSvg };
}

/**
 * WHY THE SUBPATH COUNT IS THE CHECK, AND NOT THE PATH COUNT.
 *
 * `fill-rule="evenodd"` resolves subpaths WITHIN one <path>. It does nothing
 * across separate <path> elements. The first build emitted one element per
 * loop, so a hole was drawn as a filled shape in the fill colour, on top of the
 * shape it should have cut: a plate that rendered completely solid and
 * completely plausible.
 *
 * The check that missed it asserted "two paths" and "fill-rule is present".
 * Both were true. It was caught by rendering the file and looking at it.
 *
 * So: `paths` is how many SHAPES, `subpaths` is how many LOOPS, and a hole is
 * the case where they differ. Assert both, or this comes back.
 */
export const SVG_CASES = [
  { label: 'a plain rectangle', build: (w) => w.rect(40, 20), paths: 1, subpaths: 1 },
  { label: 'a rectangle with a hole in it',
    build: (w) => w.subtract(w.rect(40, 20), w.disc(5)), paths: 1, subpaths: 2 },
  { label: 'a plate with two holes',
    build: (w) => w.subtract(w.rect(60, 20), w.translate([-15, 0], w.disc(4)),
                             w.translate([15, 0], w.disc(4))), paths: 1, subpaths: 3 },
  { label: 'two separate shapes',
    build: (w) => [w.rect(10, 10), w.translate([40, 0], w.disc(5))], paths: 2, subpaths: 2 },
];

/** Margin the serializer adds around the bounding box, in mm. */
export const SVG_MARGIN = 2;
