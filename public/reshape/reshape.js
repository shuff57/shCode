// ---------------------------------------------------------------------------
// reSHape — the simplified JSCAD layer the course teaches in Q3.
//
// WHAT THIS IS
// Twelve extra names — box, rect, disc, ball, tube, cone, ring, poly, extrude,
// revolve, turn, sit — that let a fourteen-year-old write a real JSCAD program
// on their first day without meeting an object literal, an array literal and a
// radian in the same line:
//
//     primitives.cuboid({ size: [40, 20, 10] })      the real library
//     box(40, 20, 10)                                reSHape
//
// The whole design turns on the SECOND line a student writes, not the first:
//
//     box(40, 20, 10, { center: [0, 0, 10] })
//
// The brace appears the moment the model needs something the shape cannot
// exist without — which is exactly when an object literal is worth meeting.
// Real JSCAD cannot teach that contrast, because there the brace is mandatory
// from line one. So: POSITIONAL ARGUMENTS for the values a shape cannot exist
// without, and every named extra rides in an OPTIONAL TRAILING { } OBJECT.
// The option keys are the textbook's own words — center, roundRadius,
// segments — never invented ones.
//
// ADDITIVE, IN ITS OWN FILE
// This file loads AFTER the vendored @jscad/modeling bundle and AFTER the
// bare-name shim in runner.html, and BEFORE any student code. It adds names
// and does nothing else:
//
//   * It never renames a JSCAD function. Every name here is a NEW word —
//     box not cuboid, ball not sphere, tube not cylinder — chosen so it can
//     never read as an abbreviation of the real name it must not shadow.
//     ELEVEN of the twelve keep that rule. `poly` BREAKS IT: it is literally an
//     abbreviation of the very name it must not shadow, which is the one thing
//     this bullet says a name here is never allowed to be. It was still taken,
//     because every alternative was worse for the student the layer is for —
//     `corners`, `shape` and `outline` all read as a variable rather than a
//     call, `points` is a real option key in this same vocabulary, and `pgon`
//     is unpronounceable. The exception is written here rather than left for
//     someone to notice, and the real cost it carries is the graduation-day one
//     recorded further down, not the spelling.
//   * It never overwrites anything. The install loop at the bottom refuses any
//     name that is already on window, exactly the way the shim's own install()
//     does, and reports what it had to skip in window.__reshapeNamesSkipped plus
//     a console warning on the first run.
//   * It never wraps geometry. Every function here hands back the SAME kind of
//     object the real library hands back — a geom2 or a geom3 — so a reSHape
//     result goes straight into subtract(), hull(), colorize(), extrudeLinear()
//     or anything else in @jscad/modeling, and a student's file can mix the two
//     vocabularies in one line with nothing to convert.
//   * It never changes a default. Options are forwarded to the library
//     verbatim: a key is passed through untouched or it is refused by name.
//     Nothing here is clamped, renamed, or "improved" — including
//     extrudeRotate's chunky segments default, which stays as the library
//     ships it.
//
// HOW A STUDENT GRADUATES TO THE REAL API
// Nothing to undo. The real names are all still in scope — cuboid, sphere,
// cylinder, rectangle, circle, extrudeLinear, extrudeRotate, translate,
// rotate, scale, union, subtract, intersect, hull, align — bare, namespaced,
// or through require('@jscad/modeling'). Eleven of the twelve names below are
// a pure rename plus a bracket: swap box(40, 20, 10) for
// cuboid({ size: [40, 20, 10] }) and the program is portable to jscad.app with
// no other edit. The graduation lesson is one slide per name — except that
// poly's slide has to carry a warning the other ten do not, because forgetting
// ITS bracket is the one that does not throw. See poly's paragraph below.
//
// turn() IS THE ONE EXCEPTION, AND IT DIVERGES FROM rotate TWICE.
//
// FIRST DIVERGENCE — THE PIVOT.
// transforms.rotate spins geometry around the WORLD origin, not around the
// shape's own middle. Measured on this exact bundle: a 40 x 20 x 20 box moved
// to x = 50 has the bounding box [[30,-10,-10],[70,10,10]]; turned 90 degrees
// with transforms.rotate it becomes [[-10,30,-10],[10,70,10]] — it orbited to
// y = 50 instead of turning where it stood, and nothing threw. A student who
// moves a shape and then turns it watches it fly off the screen with no error
// message, in week two, in the very assignment that requires translate and
// rotate on the same shapes.
//
// So turn() rotates IN PLACE: it measures the shape's own middle, brings it to
// the origin, rotates, and puts it back.
//
// SECOND DIVERGENCE — THE ORDER STOPS MATTERING. THIS IS A REAL LOSS, AND IT
// IS WRITTEN DOWN HERE RATHER THAN LEFT TO BE DISCOVERED.
// Rotating a shape about its OWN middle commutes with translate. Rotating it
// about the world origin does not. That is not a quirk of this implementation,
// it is arithmetic — turn(a, translate(t, s)) and translate(t, turn(a, s)) are
// the same model for every a, t and s. Measured on this bundle with
// box(40, 20, 10):
//
//   translate([50,0,0], rotate([0,0,PI/2], s))  ->  [[40,-20,-5],[60,20,5]]
//   rotate([0,0,PI/2], translate([50,0,0], s))  ->  [[-10,30,-5],[10,70,5]]
//   translate([50,0,0], turn(90, s))            ->  [[40,-20,-5],[60,20,5]]
//   turn(90, translate([50,0,0], s))            ->  [[40,-20,-5],[60,20,5]]
//
// With rotate the two orders are two different models. With turn they are the
// same model, always. So "the order you apply transforms in changes the
// answer" — the composition topic in section 9.2 — is NOT observable through
// turn, and no amount of trying will make it appear.
//
// That also corrects what turn's graduation lesson can honestly be. It is NOT
// "this is why you build at the origin and translate last": with turn that
// advice makes no difference at all, so a Q3 spent in reSHape would quietly
// contradict it. The honest lesson runs the other way round —
//
//   "turn spins your shape around its own middle, which is why it never
//    mattered whether you turned it before or after you moved it. rotate spins
//    it around the middle of the WORLD, so with rotate it matters very much —
//    and that is why every JSCAD example you are about to read builds at the
//    origin and translates last."
//
// The composition lesson is still fully teachable in Q3, because reSHape renames
// nothing: rotate and translate are both bare, both real, and both what the
// textbook prints. reference.md shows the two orders side by side in rotate,
// and the gate pins both halves of this — TURN_COMPOSITION asserts that turn
// commutes AND that transforms.rotate still does not.
//
// turn() also takes DEGREES, the unit a fourteen-year-old already owns from
// geometry class, converted with the library's own utils.degToRad. Everything
// else in the course — the textbook and the /sandbox code generator — prints
// radians. That is one extra unit story, paid on purpose, to close a silent
// wrong answer.
//
// The in-place answer stops at turn, on purpose. transforms.scale is
// origin-based in the same way, and reSHape ships no scale name at all: scale
// stays real, so there is no inconsistency INSIDE reSHape's vocabulary — it has
// exactly one transform name and it does exactly what its name says. revolve's
// sweep about the world Z axis is not a pivot bug either, it IS the operation:
// the profile is supposed to sit off-axis.
//
// Deliberately NOT here: move, grow, cut, join, row, grid, stack, tray, paint.
// translate, scale, union, subtract, intersect, mirror and center are already
// short, brace-free and read as English — renaming them would buy nothing and
// cost a second word for every operation. Anything that would perform a loop
// or a boolean inside a helper is cut too: those ARE the assignments.
//
// THREE NAMES THAT WERE ON THAT LIST, AND WHAT ADDING THEM COST.
// cone, donut and poly were each refused once. The refusals are rewritten here
// rather than deleted, because a refusal overturned quietly is a decision
// nobody can audit afterwards.
//
//   cone sat in the list above, sharing the reason given for move/grow/cut/
//   join — "translate, scale, union, subtract are already short and read as
//   English". That reason never applied to it. The call it stands for is
//   cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 }),
//   which is neither short nor English, and the seven written Q3 chapters call
//   it exactly zero times, so no student meets it in the reading either.
//   Meanwhile the /sandbox visual modeller emits that call verbatim for its
//   Cone kind, which put half an reSHape line and half a raw namespaced line in
//   the same generated expression. It was listed under a rationale it does not
//   fit; that needs no counter-argument, only the observation.
//
//   donut (torus) was refused with a real argument: "two unlabelled radii are
//   unmemorable — donut(10, 2) is worse than torus({ innerRadius: 2,
//   outerRadius: 10 })". OVERTURNED. The new evidence beats the old argument
//   because the old argument measured memorability and never measured whether
//   the labels are TRUE. They are not. JSCAD's outerRadius is the radius of the
//   circle the tube travels along — it is neither the outside edge of the
//   finished donut nor any feature you can put a caliper on. Measured on this
//   bundle, for a student building a donut 36 across with an 8-thick tube: the
//   correct call is torus({ outerRadius: 14, innerRadius: 4 }); reading
//   outerRadius as the outside edge gives torus({ outerRadius: 18,
//   innerRadius: 4 }) -> 44 x 44 x 8, and additionally reading innerRadius as
//   the hole gives torus({ outerRadius: 18, innerRadius: 10 }) -> 56 x 56 x 20.
//   BOTH BUILD SILENTLY. Only the full swap throws, and it throws "inner circle
//   is too large to rotate about the outer circle", which names two circles a
//   student never typed. So the labelled form is not the safe one: it is a
//   labelled form whose labels mislead, in exactly the direction the original
//   refusal predicted students would go.
//
//   BUT THE WIN IS NARROWER THAN THE FIRST VERSION OF THIS PARAGRAPH CLAIMED,
//   AND THE MISSING MEASUREMENT WAS ring's OWN. It said "both its names are
//   honest about what they set". Only one of them is. Measured on this bundle:
//   ring(18, 4) — ringRadius read as "the radius of the ring I am making", its
//   outside edge — builds 44 x 44 x 8, SILENTLY, the byte-identical wrong model
//   torus({ outerRadius: 18, innerRadius: 4 }) builds. `ringRadius` carries the
//   same ambiguity `outerRadius` does. ring(14, 8), tubeRadius read as the
//   tube's THICKNESS rather than its radius, builds 44 x 44 x 16, also
//   silently. Nor does ring win on catching the swap: torus throws on the full
//   swap too, so what ring wins there is the MESSAGE — ring(4, 14) is rethrown
//   with the student's own two numbers and the call they meant — not the catch.
//
//   What is left is still enough, and it is the whole of it: tubeRadius is TRUE
//   where innerRadius is a LIE. innerRadius is the tube, not the hole, and
//   reading it as the hole costs 56 x 56 x 20 with nothing on screen; there is
//   no corresponding lie in ring. ring does not fix the arithmetic either —
//   ringRadius is still (across - thick) / 2 — which is exactly why that
//   formula is printed beside the name in reference.md and beside the misread
//   table there, rather than left to the label to imply.
//
//   poly (polygon) was refused to protect assignment A8.2.2, which asks a
//   student, "Using only the JSCAD documentation (no asking for code), find and
//   use one primitive type NOT covered in class this week." Overturned on
//   operator approval — and then the cost was counted, twice, because the first
//   count was wrong in the direction that flattered it.
//
//   THE FIRST COUNT DROPPED TWO WORDS FROM THE QUOTATION. It read "not covered
//   in class", concluded that poly took A8.2.2's best target and ring its
//   second, and named ellipse and star as the surviving pool. The words are
//   "this week", and §8.2 IS that week: its learning objective in
//   curriculum-plan.md is "Create 2D primitives: rectangle, circle, ellipse,
//   polygon, star", and the book section gives ellipse, polygon and star each a
//   titled API subsection, a full option table, a Try It Now and a worked
//   solution. Six of polygon's ten book calls are inside §8.2. So all three
//   were taught, with answers, days before the assignment is set, and none of
//   them was ever an eligible answer to it. The "surviving pool" named a pool
//   of zero valid targets.
//
//   Counted properly, against the bundle's primitives exports crossed with what
//   §8.2 teaches:
//
//     poly costs A8.2.2 NOTHING. polygon is that week's own material. The
//     refusal was protecting a target that did not exist.
//
//     ring and cone are what took from the pool — torus, which the chapters
//     call in 8.1 and 9.2 and never in 8.2, and cylinderElliptic, which they
//     never call at all. The first count waved cylinderElliptic through as free
//     BECAUSE it has zero book calls; for an assignment that asks for a
//     primitive the week did not cover, that is the qualifying property, not a
//     discount.
//
//     Eligible primitives — no reSHape word, not taught in §8.2 — went from nine
//     to seven. torus was the only one of the nine the seven chapters call at
//     all, so the book-anchored part of the pool went from one to zero, and
//     ring is what emptied it. That floor turns out to be the wrong thing to
//     measure anyway: A8.2.2 asks for a primitive the week did not cover, read
//     out of the real JSCAD documentation, and a primitive the book never
//     calls is the better exercise, not the worse one.
//
//   And what survives, which is more than either count suggested: both losses
//   are 3D primitives, in a 2D week. The 2D remainder is square, triangle, arc
//   and line, none of which reSHape claims and none of which the seven chapters
//   call even once, and that is the pool a 2D lab actually draws on. A8.2.2 is
//   not in trouble. The accounting was.
//
//   The larger cost to A8.2.2 is one neither count looked at, and these three
//   names did not cause it: reference.md's own primitives catalogue publishes
//   the option signature of every surviving target, lib/reshape-docs.ts mirrors
//   it, and /docs/reshape serves it in the app — so "using only the JSCAD
//   documentation" can be satisfied by scrolling one bundled page. That is
//   deliberate (a missing row reads as "nothing to worry about", which is the
//   opposite of true) and it predates this round, but it is the thing that
//   softens the assignment most, and leaving it unsaid would be the same
//   mistake again. Read all of this before proposing a thirteenth name:
//   ASSIGNMENT_POOL in scripts/reshape-simple-checks.mjs reads both plan
//   sentences out of curriculum-plan.md and matches them against this comment,
//   so a paraphrase that drops words again is a red check.
//
//   poly's other cost is the one it does not pay until graduation day. It is
//   the only name in the layer whose positional argument is a LIST, so it is
//   the only one that teaches "hand the array over bare" — and polygon does not
//   accept a bare array. It does not refuse one either. Measured on this
//   bundle, primitives.polygon([[0, 0], [20, 0], [10, 15]]) returns a real
//   geom2 that is SILENTLY EMPTY: zero sides, bounding box [[0,0,0],[0,0,0]],
//   no throw and nothing on screen. Every other name here graduates by a rename
//   plus a bracket that fails loudly when the bracket is forgotten; poly
//   graduates into a blank viewport. Nor is "always wrap it" the lesson, because
//   `line`, sitting two rows away in reference.md's catalogue, really does take
//   its array bare. reference.md carries this next to poly's own row.
//
// TWO OF THE TWELVE SHIP NO { } AT ALL, AND THAT IS MEASURED RATHER THAN
// STYLISTIC. torus has neither a center key nor a segments key, and it accepts
// and SILENTLY DROPS both: torus({ outerRadius: 14, innerRadius: 4, center:
// [0, 0, 10] }) comes back at the same bounding box, and segments: 8 comes back
// at the same 2048 polygons. polygon's other two keys — paths and orientation —
// are neither in this layer's option vocabulary nor anywhere in the seven
// chapters. Offering either family would be the exact defect the layer exists
// to close, so ring and poly follow extrude, turn and sit: a trailing argument
// is refused by name, and the refusal spells out the real call that does take
// those keys. poly also carries the one cost the positional rule cannot pay
// off — its single positional argument is a LIST, so poly([[0, 0], [20, 0],
// [10, 15]]) is not punctuation-free. What it removes is the object literal
// wrapped around a list the student already has, which is a smaller win than
// box(40, 20, 10) and is worth saying so.
//
// New expectations for this file go in scripts/reshape-simple-checks.mjs and the
// SIMPLE group of scripts/test-reshape.mjs — never by loosening a check that is
// already there.
// ---------------------------------------------------------------------------
(function () {
	var jscad = window.jscadModeling;
	// The shim above already puts the failure on screen; there is nothing
	// useful this layer can add to it.
	if (!jscad) return;

	var primitives = jscad.primitives;
	var transforms = jscad.transforms;
	var extrusions = jscad.extrusions;
	var measurements = jscad.measurements;
	var geometries = jscad.geometries;
	var utils = jscad.utils;

	// ---- what counts as what ------------------------------------------------

	function isGeometry(v) {
		if (!v || typeof v !== 'object') return false;
		return Array.isArray(v.polygons) || Array.isArray(v.sides) || Array.isArray(v.points);
	}
	function isFlat(v) { return geometries.geom2.isA(v); }
	function isSolid(v) { return geometries.geom3.isA(v); }
	// A path2 is the third geometry the library ships. It is not a geom2 -- it
	// has points rather than sides -- but extrudeLinear takes one, which is how
	// the book turns vectorText into a solid letter.
	function isPath(v) { return geometries.path2.isA(v); }

	// A student's trailing { } — as opposed to a shape, an array, or a number.
	function isOptionsObject(v) {
		return !!v && typeof v === 'object' && !Array.isArray(v) && !isGeometry(v);
	}

	function isNumber(v) { return typeof v === 'number' && isFinite(v); }

	// Short, honest description of whatever the student actually passed, for an
	// error message. "the text 'big'" beats [object Object].
	function describe(v) {
		if (v === null) return 'null';
		if (v === undefined) return 'nothing';
		if (typeof v === 'string') return 'the text "' + v + '"';
		if (typeof v === 'boolean') return String(v);
		if (typeof v === 'number') return String(v);
		if (Array.isArray(v)) return 'a list of ' + v.length;
		// Say WHICH kind. isGeometry is true for all three, so answering "a
		// shape" produced the self-refuting "that is not a shape, it is a
		// shape." for a path2 — measured against §8.1's vectorText glyph, where
		// the message a student got told them nothing at all.
		if (isSolid(v)) return 'a solid';
		if (isFlat(v)) return 'a flat shape';
		if (isPath(v)) return 'an open or closed path';
		if (isGeometry(v)) return 'a shape';
		if (typeof v === 'function') return 'a function';
		return 'a { } object';
	}

	// 0.30000000000000004 is not a limit anybody can act on.
	function tidy(n) { return String(Math.round(n * 10000) / 10000); }

	var WORDS = ['zero', 'one', 'two', 'three', 'four'];
	function count(n) { return WORDS[n] || String(n); }

	function english(list) {
		if (list.length === 1) return list[0];
		return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
	}

	// ---- the two guards every shape shares ----------------------------------

	/**
	 * The positional arity guard, and the reason tube() exists at all: the real
	 * cylinder({ radius: 5 }) does NOT complain about the missing height. It
	 * quietly defaults it to 2 and hands back a squat disc, which is worse than
	 * an error because there is nothing to read.
	 *
	 * The object-first case is a teaching moment rather than an alias: a student
	 * who copies { size: [...] } out of the real docs is told, by name, which
	 * function that spelling belongs to.
	 */
	function requireNumbers(fn, params, args, real) {
		if (isOptionsObject(args[0])) {
			throw new Error(
				fn + ' takes plain numbers: ' + fn + '(' + params.join(', ') + '). ' +
				'The JSCAD version that takes a { } object is called ' + real + '.'
			);
		}
		var call = fn + ' needs ' + count(params.length) + ' number' +
			(params.length === 1 ? '' : 's') + ': ' + fn + '(' + params.join(', ') + ').';
		for (var i = 0; i < params.length; i++) {
			if (args[i] === undefined) throw new Error(call + ' The ' + params[i] + ' is missing.');
			if (!isNumber(args[i])) {
				throw new Error(call + ' The ' + params[i] + ' has to be a number, and you gave it ' +
					describe(args[i]) + '.');
			}
		}
	}

	/**
	 * Keys the REAL backing call has and reSHape deliberately does not offer.
	 *
	 * A refusal has to leave a student somewhere. "revolve has no option called
	 * angle" is true and is a dead end; the same sentence with the real call
	 * spelled out beside it is the escape hatch this whole layer promises —
	 * every reSHape name is one function away from the full API, and this is the
	 * moment a student most needs to be told which function.
	 *
	 * `angle` is the sharp one: section 9.1's own worked example is
	 * extrudeRotate({ segments: 8, angle: constants.TAU / 2 }, profile), so a student
	 * reading the chapter revolve exists for WILL type it. reSHape does not grow
	 * an angle key for it — angle is outside the option vocabulary this layer
	 * ships — it hands over the real call instead, spelled out and ready to
	 * copy.
	 *
	 * The call it hands over has to RUN. The book writes that angle as a bare
	 * TAU, and bare TAU is not a name runner.html installs: MODULE_ORDER copies
	 * the fifteen modules and their members one level deep, and TAU sits one
	 * level below that, at maths.constants.TAU. So these messages spell
	 * constants.TAU — the bare `constants` module member, which IS in scope —
	 * and REFUSAL_CALLS in the gate executes every call spelled out here.
	 */
	var REAL_EXTRAS = {
		cone: {
			startRadius: 'cylinderElliptic({ startRadius: [10, 6], endRadius: [0, 0], height: 20 }) gives it an oval base',
			endRadius: 'cylinderElliptic({ startRadius: [10, 10], endRadius: [4, 4], height: 20 }) cuts the point off',
			startAngle: 'cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, startAngle: 0, endAngle: constants.TAU / 2 }) leaves half of it, like a pie slice',
			endAngle: 'cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, startAngle: 0, endAngle: constants.TAU / 2 }) leaves half of it, like a pie slice'
		},
		revolve: {
			angle: 'extrudeRotate({ segments: 16, angle: constants.TAU / 2 }, profile) turns it part of the way round'
		},
		extrude: {
			twistAngle: 'extrudeLinear({ height: 10, twistAngle: constants.TAU / 4, twistSteps: 20 }, profile) twists it',
			twistSteps: 'extrudeLinear({ height: 10, twistAngle: constants.TAU / 4, twistSteps: 20 }, profile) twists it'
		}
	};

	/**
	 * Read the optional trailing { }.
	 *
	 * Pass-through only. A key the function knows is copied ACROSS UNTOUCHED —
	 * same name, same value, straight into the real library call. A key it does
	 * not know is refused by name rather than silently ignored, because a
	 * misspelled option that does nothing is the same class of bug as the
	 * missing height above — and the refusal names the real function to reach
	 * for, so it is a signpost rather than a wall.
	 */
	function readOptions(fn, allowed, given, example, real) {
		if (given === undefined) return {};
		if (!isOptionsObject(given)) {
			throw new Error(
				fn + "'s extras go in a { } object at the end, like " + example + '. ' +
				'You gave it ' + describe(given) + '.'
			);
		}
		var out = {};
		for (var key in given) {
			if (!Object.prototype.hasOwnProperty.call(given, key)) continue;
			if (allowed.indexOf(key) === -1) {
				var hint = (REAL_EXTRAS[fn] || {})[key];
				throw new Error(
					fn + ' has no option called "' + key + '". It takes ' + english(allowed) + '. ' +
					(hint
						? 'The JSCAD version does have ' + key + ': ' + hint + '.'
						: 'The JSCAD version, with every option there is, is called ' + real + '.')
				);
			}
			out[key] = given[key];
		}
		return out;
	}

	// Fold the student's options onto the required values. The required values
	// go in first so the real call reads in the library's own order.
	function callWith(required, extras) {
		for (var key in extras) {
			if (Object.prototype.hasOwnProperty.call(extras, key)) required[key] = extras[key];
		}
		return required;
	}

	/**
	 * The library's own roundRadius message is accurate and useless to a
	 * beginner: "roundRadius must be smaller than the radius of all dimensions".
	 * Rethrow it with the student's actual numbers in it.
	 *
	 * Deliberately NOT clamped to a legal value. Silently building a different
	 * model than the one asked for is the line between a simplified name and a
	 * fork of the library.
	 */
	function saidRoundRadius(err) {
		return /roundRadius/.test((err && err.message) || '');
	}

	// ---- the twelve names ---------------------------------------------------

	var BOX_KEYS = ['center', 'roundRadius', 'segments'];
	var RECT_KEYS = ['center', 'roundRadius', 'segments'];
	var DISC_KEYS = ['center', 'segments'];
	var BALL_KEYS = ['center', 'segments'];
	var TUBE_KEYS = ['center', 'roundRadius', 'segments'];
	var CONE_KEYS = ['center', 'segments'];
	var REVOLVE_KEYS = ['segments'];

	/** box(40, 20, 10) -> primitives.cuboid({ size: [40, 20, 10] }) */
	function box(width, depth, height, extras) {
		requireNumbers('box', ['width', 'depth', 'height'], arguments, 'cuboid');
		var opts = readOptions('box', BOX_KEYS, extras, 'box(40, 20, 10, { center: [0, 0, 10] })', 'cuboid');
		var size = [width, depth, height];
		if (!('roundRadius' in opts)) return primitives.cuboid(callWith({ size: size }, opts));
		try {
			return primitives.roundedCuboid(callWith({ size: size }, opts));
		} catch (e) {
			if (!saidRoundRadius(e)) throw e;
			throw new Error(
				'roundRadius ' + opts.roundRadius + ' is too big for a ' + width + ' x ' + depth +
				' x ' + height + ' box — it must be less than ' +
				tidy(Math.min(width, depth, height) / 2) + '.'
			);
		}
	}

	/** rect(40, 20) -> primitives.rectangle({ size: [40, 20] }) */
	function rect(width, height, extras) {
		requireNumbers('rect', ['width', 'height'], arguments, 'rectangle');
		var opts = readOptions('rect', RECT_KEYS, extras, 'rect(40, 20, { center: [10, 0] })', 'rectangle');
		var size = [width, height];
		if (!('roundRadius' in opts)) return primitives.rectangle(callWith({ size: size }, opts));
		try {
			return primitives.roundedRectangle(callWith({ size: size }, opts));
		} catch (e) {
			if (!saidRoundRadius(e)) throw e;
			throw new Error(
				'roundRadius ' + opts.roundRadius + ' is too big for a ' + width + ' x ' + height +
				' rect — it must be less than ' + tidy(Math.min(width, height) / 2) + '.'
			);
		}
	}

	/** disc(6) -> primitives.circle({ radius: 6 }) */
	function disc(radius, extras) {
		requireNumbers('disc', ['radius'], arguments, 'circle');
		var opts = readOptions('disc', DISC_KEYS, extras, 'disc(6, { center: [10, 0] })', 'circle');
		return primitives.circle(callWith({ radius: radius }, opts));
	}

	/** ball(20) -> primitives.sphere({ radius: 20 }) */
	function ball(radius, extras) {
		requireNumbers('ball', ['radius'], arguments, 'sphere');
		var opts = readOptions('ball', BALL_KEYS, extras, 'ball(20, { segments: 64 })', 'sphere');
		return primitives.sphere(callWith({ radius: radius }, opts));
	}

	/** tube(5, 20) -> primitives.cylinder({ radius: 5, height: 20 }) */
	function tube(radius, height, extras) {
		requireNumbers('tube', ['radius', 'height'], arguments, 'cylinder');
		var opts = readOptions('tube', TUBE_KEYS, extras, 'tube(5, 20, { center: [0, 0, 10] })', 'cylinder');
		var required = { radius: radius, height: height };
		if (!('roundRadius' in opts)) return primitives.cylinder(callWith(required, opts));
		try {
			return primitives.roundedCylinder(callWith(required, opts));
		} catch (e) {
			var msg = (e && e.message) || '';
			// roundedCylinder has two separate complaints, and they need two
			// separate answers: one is about the height, one about the radius.
			if (/height must be larger than twice roundRadius/.test(msg)) {
				throw new Error(
					'roundRadius ' + opts.roundRadius + ' is too big for a tube ' + height +
					' tall — it must be less than ' + tidy(height / 2) + '.'
				);
			}
			if (!saidRoundRadius(e)) throw e;
			throw new Error(
				'roundRadius ' + opts.roundRadius + ' is too big for a tube of radius ' + radius +
				' — it must be ' + tidy(radius) + ' or less.'
			);
		}
	}

	/**
	 * cone(10, 20) ->
	 *   primitives.cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 })
	 *
	 * The same silent wrong answer tube() exists for, one shape along. Measured:
	 * cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0] }) with no
	 * height does not complain — height defaults to 2, so it hands back a
	 * 20 x 20 x 2 pancake and says nothing. requireNumbers closes it.
	 *
	 * center and segments are the only keys, and both were already in this
	 * layer's three-word option vocabulary, so nothing is invented and the
	 * day-one call cone(10, 20) still has no punctuation in it. roundRadius is
	 * refused rather than accepted for the usual reason: measured,
	 * cylinderElliptic ignores it silently — same bounding box, same 64
	 * polygons. A cut-off point, an oval base and a pie slice are all real
	 * things to want, and cone deliberately models none of them; REAL_EXTRAS
	 * above hands over the whole cylinderElliptic call for each one.
	 */
	function cone(radius, height, extras) {
		requireNumbers('cone', ['radius', 'height'], arguments, 'cylinderElliptic');
		var opts = readOptions('cone', CONE_KEYS, extras, 'cone(10, 20, { center: [0, 0, 10] })', 'cylinderElliptic');
		return primitives.cylinderElliptic(callWith({
			startRadius: [radius, radius], endRadius: [0, 0], height: height
		}, opts));
	}

	/**
	 * ring(14, 4) -> primitives.torus({ outerRadius: 14, innerRadius: 4 })
	 *
	 * The mapping is inverted on purpose, and the inversion is the whole reason
	 * this name exists: JSCAD's outerRadius is the radius of the circle the TUBE
	 * TRAVELS ALONG, and its innerRadius is the radius of the tube itself.
	 * Neither is the thing its name suggests. Measured: ring(14, 4) comes out
	 * 36 across and 8 thick.
	 *
	 * No options object at all — see the banner. torus has no center and no
	 * segments, and drops both silently.
	 */
	function ring(ringRadius, tubeRadius) {
		if (arguments.length > 2) {
			throw new Error(
				'ring takes just the two radiuses: ring(14, 4). It has no { } options — ' +
				'a torus has no center and no segments, so translate it to move it. The ' +
				'JSCAD version, which does take innerSegments and outerSegments, is called ' +
				'torus: torus({ outerRadius: 14, innerRadius: 4, outerSegments: 64 }).'
			);
		}
		requireNumbers('ring', ['ringRadius', 'tubeRadius'], arguments, 'torus');
		try {
			return primitives.torus({ outerRadius: ringRadius, innerRadius: tubeRadius });
		} catch (e) {
			// The library's own words are "inner circle is too large to rotate
			// about the outer circle", which names two circles a student never
			// typed. Their two numbers, the right way round, is the answer.
			if (!/inner circle is too large/.test((e && e.message) || '')) throw e;
			throw new Error(
				'a tube ' + tubeRadius + ' thick will not fit round a ring of radius ' +
				ringRadius + ' — in ring(ringRadius, tubeRadius) the ring radius comes ' +
				'first. ring(' + tubeRadius + ', ' + ringRadius + ') is the one you meant.'
			);
		}
	}

	/**
	 * poly([[0, 0], [20, 0], [10, 15]]) -> primitives.polygon({ points: [...] })
	 *
	 * The one reSHape name whose positional argument is a list rather than a
	 * number, which is a cost the banner records rather than hides.
	 *
	 * Three guards, each closing a measured silent failure:
	 *   polygon({ points: [] })                       a VALID geom2, 0 sides,
	 *                                                 an all-zero bounding box,
	 *                                                 and no error
	 *   polygon({ points: [[0,0],[20,0],[10,'x']] })  real geometry whose box
	 *                                                 reads [[0,null,0],…], no
	 *                                                 error anywhere
	 *   polygon({ points: [[0,0],[20,0]] })           throws "list of points 0
	 *                                                 must contain three or
	 *                                                 more points", naming a
	 *                                                 list index poly has not
	 *                                                 got
	 */
	function poly(points) {
		if (arguments.length > 1) {
			throw new Error(
				'poly takes just the list of corners: poly([[0, 0], [20, 0], [10, 15]]). ' +
				'It has no { } options. The JSCAD version, which also takes paths and ' +
				'orientation, is called polygon.'
			);
		}
		// This test HAS to run before any geometry test. An object with a
		// `points` array is exactly what a path2 looks like, so isGeometry()
		// claims { points: [...] } and the refusal would never say the word
		// polygon — the same trap reshape-simple-checks.mjs flags on rect/normal.
		if (points && typeof points === 'object' && !Array.isArray(points)) {
			throw new Error(
				'poly takes a plain list of corners: poly([[0, 0], [20, 0], [10, 15]]). ' +
				'The JSCAD version that takes { points: [...] } as a { } object is ' +
				'called polygon.'
			);
		}
		if (!Array.isArray(points)) {
			throw new Error(
				'poly needs a list of corners: poly(points), like ' +
				'poly([[0, 0], [20, 0], [10, 15]]). You gave it ' + describe(points) + '.'
			);
		}
		if (points.length < 3) {
			throw new Error(
				'poly needs at least three corners to enclose anything: poly(points), ' +
				'like poly([[0, 0], [20, 0], [10, 15]]). You gave it ' +
				count(points.length) + '.'
			);
		}
		for (var i = 0; i < points.length; i++) {
			var corner = points[i];
			if (!Array.isArray(corner) || corner.length < 2 ||
				!isNumber(corner[0]) || !isNumber(corner[1])) {
				throw new Error(
					'every corner poly takes is an x and a y: ' +
					'poly([[0, 0], [20, 0], [10, 15]]). Corner ' + (i + 1) + ' is ' +
					describe(corner) + '.'
				);
			}
		}
		return primitives.polygon({ points: points });
	}

	/**
	 * extrude(10, profile) -> extrusions.extrudeLinear({ height: 10 }, profile)
	 *
	 * Same operand order as the real call — number first, shapes last — so this
	 * one graduates by deleting the word "Linear" and adding a brace. No options
	 * object: extrudeLinear's only other keys are twistAngle and twistSteps,
	 * which are outside the textbook's vocabulary, and reSHape offers no key
	 * rather than inventing a name for one. A student who wants a twist reaches
	 * for extrudeLinear, which is bare and still there.
	 *
	 * The 2D guard is not decoration. Measured on this bundle: extrudeLinear on
	 * a solid does not throw — it hands the solid straight back, unchanged.
	 */
	function extrude(height, shape) {
		// The real extrudeLinear takes its { } FIRST. A student who copies that
		// order out of the docs gets told which function that spelling belongs
		// to, by name, instead of a message about the height.
		if (isOptionsObject(height)) {
			throw new Error(
				'extrude takes the height first and plain: extrude(10, shape). ' +
				'The JSCAD version that takes { height: 10 } as a { } object first ' +
				'is called extrudeLinear.'
			);
		}
		if (!isNumber(height)) {
			throw new Error(
				'extrude needs the height first: extrude(10, shape). You gave it ' +
				describe(height) + '.'
			);
		}
		var shapes = Array.prototype.slice.call(arguments, 1);
		if (!shapes.length) throw new Error('extrude needs a shape to push upwards: extrude(10, shape).');
		// The real extrudeLinear flattens an array of profiles, so a student may
		// hand it one. Validate the flattened view; forward the original.
		var flat = [];
		for (var i = 0; i < shapes.length; i++) {
			if (Array.isArray(shapes[i])) flat = flat.concat(shapes[i]);
			else flat.push(shapes[i]);
		}
		for (var j = 0; j < flat.length; j++) {
			if (isSolid(flat[j])) {
				throw new Error(
					'extrude needs a flat 2D shape — you gave it a solid. Build the flat ' +
					'outline first (rect, disc, or a boolean of them), then extrude that.'
				);
			}
			if (isOptionsObject(flat[j])) {
				// extrude has no trailing { } at all, so one written here would
				// otherwise be handed to extrudeLinear as a profile and quietly
				// contribute nothing. Name the real call that does take those keys
				// — and SPELL IT OUT, off the same REAL_EXTRAS table the by-name
				// refusals read. Measured: extrude never calls readOptions, so that
				// table's extrude entries were unreachable and this message stopped
				// at a function name. A name is a search; a call is a paste.
				throw new Error(
					'extrude has no { } options: extrude(10, shape). The JSCAD version ' +
					'that takes twistAngle and twistSteps is called extrudeLinear: ' +
					REAL_EXTRAS.extrude.twistAngle + '.'
				);
			}
			// A path2 is allowed through: extrudeLinear takes one, and refusing it
			// here would put the two out of step for no reason a student could
			// see. It is what §8.1 extrudes a vectorText glyph from.
			if (!isFlat(flat[j]) && !isPath(flat[j])) {
				throw new Error(
					'extrude(10, shape) — that is not a flat shape, it is ' + describe(flat[j]) + '. ' +
					'Build the outline first with rect, disc or poly, then extrude that.'
				);
			}
		}
		return extrusions.extrudeLinear.apply(null, [{ height: height }].concat(shapes));
	}

	/**
	 * revolve(profile) -> extrusions.extrudeRotate({}, profile)
	 *
	 * A full turn, which is already the library's default angle — so leaving it
	 * out changes nothing about the model, it only removes TAU and the baffling
	 * empty brace from the bare form. TAU is worth removing twice over: it is a
	 * word a student has not met, AND it is genuinely not in scope in this
	 * runner — bare TAU throws, because it lives one level below the members
	 * the shim copies out, at maths.constants.TAU. reference.md's "TAU is a
	 * value, not a name in scope" section is the answer for a chapter that
	 * needs it; revolve is the answer for the five sixths of the book that do
	 * not.
	 *
	 * The type guard is load-bearing: measured, extrudeRotate on a solid throws
	 * "Cannot read properties of undefined (reading 'length')" from inside the
	 * library, which points a student at nothing at all.
	 */
	function revolve(shape, extras) {
		// revolve is the one name whose options object trades places with the
		// real call's: revolve(profile, { segments: 16 }) is
		// extrudeRotate({ segments: 16 }, profile). reSHape's grammar has no
		// exceptions — every extra rides in a TRAILING { } — so the swap is
		// real, it is documented in the graduation table, and a student who
		// writes the library's order is told so rather than left with a message
		// about flat shapes.
		if (isOptionsObject(shape)) {
			throw new Error(
				'revolve takes the shape first and its extras last: ' +
				'revolve(profile, { segments: 16 }). The JSCAD version that takes ' +
				'the { } object first is called extrudeRotate.'
			);
		}
		if (Array.isArray(shape)) {
			throw new Error('revolve spins one flat shape at a time: revolve(profile).');
		}
		if (isSolid(shape)) {
			throw new Error('revolve needs a flat 2D shape — you gave it a solid.');
		}
		if (!isFlat(shape)) {
			throw new Error('revolve needs a flat 2D shape: revolve(profile). You gave it ' +
				describe(shape) + '.');
		}
		var opts = readOptions('revolve', REVOLVE_KEYS, extras, 'revolve(profile, { segments: 16 })', 'extrudeRotate');
		return extrusions.extrudeRotate(opts, shape);
	}

	// turn(45, shape) — degrees about Z, or turn([0, 90, 0], shape) to pick the
	// axis. Read the banner at the top of this file before changing anything
	// here: the in-place pivot is the one place reSHape is not a pure rename, and
	// it is not an accident.
	function turnAngles(degrees) {
		if (isNumber(degrees)) return [0, 0, degrees];
		if (Array.isArray(degrees) && degrees.length === 3 &&
			isNumber(degrees[0]) && isNumber(degrees[1]) && isNumber(degrees[2])) {
			return [degrees[0], degrees[1], degrees[2]];
		}
		// Shape first is the commonest way to get this wrong, and it deserves a
		// sentence about the order rather than one about degrees.
		if (isGeometry(degrees) || (Array.isArray(degrees) && isGeometry(degrees[0]))) {
			throw new Error(
				'turn takes the angle first and the shape last: turn(45, shape).'
			);
		}
		throw new Error(
			'turn needs an angle in degrees first: turn(45, shape) to spin it in the page, ' +
			'or turn([0, 90, 0], shape) to pick the axis. You gave it ' + describe(degrees) + '.'
		);
	}

	function middleOf(shape) {
		var bounds = Array.isArray(shape)
			// measureBoundingBox of an ARRAY returns one box per shape, nested —
			// so [0][2] on it is undefined and everything downstream goes null
			// with no error. An assembly needs the aggregate.
			? measurements.measureAggregateBoundingBox(shape)
			: measurements.measureBoundingBox(shape);
		return [
			(bounds[0][0] + bounds[1][0]) / 2,
			(bounds[0][1] + bounds[1][1]) / 2,
			(bounds[0][2] + bounds[1][2]) / 2
		];
	}

	function everyGeometry(list) {
		for (var i = 0; i < list.length; i++) if (!isGeometry(list[i])) return false;
		return list.length > 0;
	}
	function everyFlat(list) {
		for (var i = 0; i < list.length; i++) if (!isFlat(list[i])) return false;
		return list.length > 0;
	}

	function turn(degrees, shape) {
		// turn has no options object, so a third argument is something a student
		// believed in. Refusing it by name beats accepting and ignoring it — that
		// is the same rule the trailing { } obeys, applied to the argument list.
		if (arguments.length > 2) {
			throw new Error(
				'turn takes just the angle and the shape: turn(45, shape). It has no ' +
				'{ } options — turn([0, 90, 0], shape) picks the axis. The JSCAD ' +
				'version is called rotate.'
			);
		}
		var spin = turnAngles(degrees);
		var list = Array.isArray(shape) ? shape : [shape];
		if (!everyGeometry(list)) {
			throw new Error('turn needs a shape to turn: turn(45, shape). You gave it ' +
				describe(shape) + '.');
		}
		// Measured: rotate([PI/2, 0, 0], rect) silently returns a degenerate
		// line — real geometry, zero area, invisible, no error.
		if ((spin[0] || spin[1]) && everyFlat(list)) {
			throw new Error(
				'turn tips a flat shape out of its plane and it disappears — ' +
				'turn(45, shape) spins it in the page. Extrude it into a solid first ' +
				'if you want to tip it.'
			);
		}
		var mid = middleOf(shape);
		var radians = [
			utils.degToRad(spin[0]), utils.degToRad(spin[1]), utils.degToRad(spin[2])
		];
		return transforms.translate(mid,
			transforms.rotate(radians,
				transforms.translate([-mid[0], -mid[1], -mid[2]], shape)));
	}

	/**
	 * sit(shape) — drop the shape until its lowest point rests on z = 0.
	 *
	 * ball and tube are built centred on the origin, so half of them starts
	 * below the print bed, and "does it have a flat bottom?" is a graded
	 * question in §9.1 before measureBoundingBox is taught in Q4.
	 *
	 * grouped matters. An assembly is a group: aligned individually, every part
	 * would drop to the bed separately and the model would collapse into itself.
	 */
	function sit(shape) {
		// Same rule. sit(shape, { modes: [...] }) is the likeliest thing to write
		// here — modes is align's own key — and accepting it silently would leave
		// a student certain they had changed something.
		if (arguments.length > 1) {
			throw new Error(
				'sit takes just the shape: sit(ball(10)). It has no { } options. The ' +
				'JSCAD version, which lines shapes up any way you like, is called align.'
			);
		}
		var many = Array.isArray(shape);
		var list = many ? shape : [shape];
		if (!everyGeometry(list)) {
			throw new Error('sit needs a shape, or a list of shapes: sit(ball(10)). You gave it ' +
				describe(shape) + '.');
		}
		return transforms.align(
			{ modes: ['none', 'none', 'min'], relativeTo: [0, 0, 0], grouped: many },
			shape
		);
	}

	// ---- install ------------------------------------------------------------
	//
	// Same discipline as the shim's own install(): anything already on window
	// wins, and a name that could not be installed is REPORTED rather than
	// filed away in a global nobody reads. Nothing here is a documented
	// collision, so every skip is a real name a student expected and did not
	// get — which is why the console warning has no exception list.
	//
	// ---- live shapes: the moSHion model ------------------------------------
	//
	// A moSHion Sprite is configured two ways — `new Sprite(x, y, 50, 50)` and
	// `s.color = 'red'` — and a reSHape name works the same:
	//
	//     let b = ball(5)      b.radius = 9      b.color = 'red'
	//
	// Every name returns a LIVE HANDLE: it remembers the arguments it was built
	// from and REBUILDS its geometry when one is assigned. The twelve
	// implementations above are untouched and still hand back plain geometry.
	//
	// WHY A REBUILD AND NOT AN IN-PLACE MUTATION. Swapping `polygons` on the
	// real geom3 is the obvious design and it is silently wrong:
	// @jscad/modeling memoises measureVolume / measureArea / measureBoundingBox
	// / measureBoundingSphere / measureCenterOfMass in a WeakMap keyed on the
	// geometry object, with no way to clear it from outside. Mutate in place and
	// every measurement taken before the change keeps its old answer forever.
	// Each rebuild makes a FRESH inner geometry, so the cache is keyed on an
	// object that really is that shape.
	//
	// WHY A PROXY AND NOT AN OBJECT OF GETTERS. The first version of this
	// (ad98aa3, and the copy still vendored in bookSHelf) was a plain object
	// carrying `sides`/`polygons`/`transforms` as defined getters. It renders
	// fine — geom2.isA/geom3.isA duck-type on those — but it does NOT serialise
	// like geometry, because its own keys are the parameter names too. That
	// broke every identity check in the gate at once, and the failure was read
	// as an options-contract bug for a whole session.
	//
	// A Proxy forwards ownKeys/getOwnPropertyDescriptor to the CURRENT inner
	// geometry, so JSON.stringify(handle) === JSON.stringify(geometry), exactly.
	// Parameter names are reachable through `get`/`set` but are deliberately
	// absent from ownKeys, which is what keeps the serialised form honest.
	var HANDLE = new WeakMap();

	/** A handle unwrapped to the geometry it currently stands for. */
	function current(v) {
		var s = HANDLE.get(v);
		return s ? s.geom : v;
	}
	function currentAll(args) {
		var out = [];
		for (var i = 0; i < args.length; i++) out.push(current(args[i]));
		return out;
	}

	function isOptions(v) {
		return v && typeof v === 'object' && !Array.isArray(v)
			&& !('polygons' in v) && !('sides' in v);
	}

	// `names` are the positional parameters of the call; a trailing options
	// object contributes its keys as settable names too, so ball(5, {segments:8})
	// gives both `.radius` and `.segments`.
	function live(build, names, args) {
		var params = {};
		var extras = null;
		for (var i = 0; i < names.length; i++) params[names[i]] = args[i];

		// Whatever follows the named parameters. extrude is variadic —
		// extrude(4, rect(10, 10), disc(3)) pushes BOTH shapes — so the tail is
		// carried through the rebuild rather than dropped. It is positional only;
		// there is no name to assign it by, which is why it is not in `params`.
		var tail = Array.prototype.slice.call(args, names.length);
		if (tail.length && isOptions(tail[tail.length - 1])) {
			extras = tail.pop();
			for (var k in extras) {
				if (Object.prototype.hasOwnProperty.call(extras, k)) params[k] = extras[k];
			}
		}
		var rest = tail;

		var state = { params: params, geom: null };
		function rebuild() {
			var positional = [];
			for (var i = 0; i < names.length; i++) positional.push(current(state.params[names[i]]));
			// A parameter that was never supplied must stay UNSUPPLIED, not become
			// an explicit undefined: the twelve implementations read arguments.length
			// to tell "you forgot the shape" from "that is not a shape", and passing
			// undefined turns the first message into the second. Assigning the
			// property later fills the hole and the argument comes back.
			while (positional.length && positional[positional.length - 1] === undefined) positional.pop();
			for (var j = 0; j < rest.length; j++) positional.push(current(rest[j]));
			if (extras) {
				var opts = {};
				for (var k in extras) {
					if (Object.prototype.hasOwnProperty.call(extras, k)) opts[k] = state.params[k];
				}
				positional.push(opts);
			}
			state.geom = build.apply(null, positional);
		}
		rebuild();

		var handle = new Proxy({}, {
			get: function (t, key) {
				if (Object.prototype.hasOwnProperty.call(state.params, key)) return state.params[key];
				return state.geom[key];
			},
			set: function (t, key, value) {
				if (Object.prototype.hasOwnProperty.call(state.params, key)) {
					state.params[key] = value;
					rebuild();
					return true;
				}
				// `.color` is not a build parameter: the library applies colour with
				// colorize(), which returns a NEW geometry rather than taking an
				// option, so it recolours what is there instead of rebuilding.
				if (key === 'color') {
					state.geom = jscad.colors.colorize(
						jscad.colors.colorNameToRgb(value) || value, state.geom
					);
					return true;
				}
				state.geom[key] = value;
				return true;
			},
			has: function (t, key) {
				return Object.prototype.hasOwnProperty.call(state.params, key) || (key in state.geom);
			},
			// The two traps that make a handle serialise as its geometry. Parameter
			// names are NOT listed: adding them would change JSON.stringify and put
			// the handle back where ad98aa3 left it.
			ownKeys: function () { return Reflect.ownKeys(state.geom); },
			getOwnPropertyDescriptor: function (t, key) {
				var d = Reflect.getOwnPropertyDescriptor(state.geom, key);
				// configurable:true is required, or the Proxy invariant check throws
				// for a key the (empty) target does not have.
				return d ? { value: d.value, writable: true, enumerable: d.enumerable, configurable: true } : undefined;
			}
		});

		HANDLE.set(handle, state);
		return handle;
	}

	/** The positional parameters of each name, in order. */
	var PARAMS = {
		box: ['width', 'depth', 'height'], rect: ['width', 'height'],
		disc: ['radius'], ball: ['radius'],
		tube: ['radius', 'height'], cone: ['radius', 'height'],
		ring: ['ringRadius', 'tubeRadius'], poly: ['points'],
		extrude: ['height', 'shape'], revolve: ['shape'],
		turn: ['degrees', 'shape'], sit: ['shape']
	};

	function liveify(name, fn) {
		var names = PARAMS[name];
		return function () {
			var out = live(fn, names, Array.prototype.slice.call(arguments));
			// sit() and turn() hand back an ARRAY for an assembly. An array is not
			// one shape and must not be wrapped as one, or the renderer is handed a
			// single object where it expected a list.
			return Array.isArray(current(out)) ? current(out) : out;
		};
	}

	// Measurements are the ONE place a handle is not transparent. Each of these
	// memoises on the object it was handed, and a handle's identity is stable
	// across a rebuild by definition — so a shape measured, changed, then
	// measured again would report its OLD answer, in the chapter about measuring
	// things before printing them. Unwrapping first gives the cache a key that
	// really is that shape.
	//
	// This is the ONE place reSHape overwrites names the shim already installed,
	// and the gate names all eight rather than waiving the rule: see
	// 'reshape.js adds exactly the reSHape names, plus the measure wrappers'.
	var CACHED_MEASURES = ['measureArea', 'measureVolume', 'measureBoundingBox',
		'measureBoundingSphere', 'measureCenterOfMass', 'measureDimensions',
		'measureCenter', 'measureEpsilon'];
	CACHED_MEASURES.forEach(function (m) {
		if (typeof measurements[m] !== 'function') return;
		var orig = measurements[m];
		window[m] = function () { return orig.apply(null, currentAll(arguments)); };
	});

	// Hosts (a runner, an exporter) turn whatever main() returned into real
	// geometry with this. Arrays are walked, so `return [a, b]` works.
	// bookSHelf's fence runner maps every result through it before rendering.
	window.__reshapeCurrent = function unwrap(v) {
		if (Array.isArray(v)) return v.map(unwrap);
		return current(v);
	};

	var NAMES = [
		['box', liveify('box', box)], ['rect', liveify('rect', rect)],
		['disc', liveify('disc', disc)], ['ball', liveify('ball', ball)],
		['tube', liveify('tube', tube)], ['cone', liveify('cone', cone)],
		['ring', liveify('ring', ring)], ['poly', liveify('poly', poly)],
		['extrude', liveify('extrude', extrude)], ['revolve', liveify('revolve', revolve)],
		['turn', liveify('turn', turn)], ['sit', liveify('sit', sit)]
	];

	var skipped = [];
	for (var n = 0; n < NAMES.length; n++) {
		var name = NAMES[n][0];
		if (name in window) { skipped.push(name); continue; }
		window[name] = NAMES[n][1];
	}
	window.__reshapeNamesSkipped = skipped;
	if (skipped.length) {
		console.warn(
			'reSHape: ' + skipped.length + ' name(s) could not be added to scope because ' +
			'something already owns them here: ' + skipped.join(', ') + '. The JSCAD ' +
			'function each one stands in for is still available under its real name.'
		);
	}
})();
