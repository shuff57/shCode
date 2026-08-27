// ---------------------------------------------------------------------------
// SVG out, for the half of Q3 that has no other way out of the app.
//
// The save bar ships stl, 3mf and obj. All three are 3D MESH formats: they
// serialize polygons, and a `geom2` has none. So a 2D design — §8.2's logo,
// §8.3's gasket, every profile before §9.1 extrudes one — could be built,
// rendered and graded in shCode and never leave it. A8.2.1 asks for exactly
// that file ("Export as SVG") and shCode could not produce one.
//
// This is hand-written rather than vendored on purpose. @jscad/io publishes an
// SVG serializer, but the bundle in public/reshape/lib/ does not contain one, and
// that bundle is already the one entry in EXPECTED_BUNDLES with
// `verified: false` — its upstream identity is not established. Adding a second
// unverified binary to fix a fifty-line problem is the wrong trade. Everything
// below is geom2 -> path data, which the library already hands us as segments.
//
// TWO THINGS THAT ARE EASY TO GET WRONG AND ARE TESTED:
//
//   1. SVG's y axis points DOWN; JSCAD's points UP. Emitting coordinates
//      unchanged mirrors the design, and a mirrored logo still looks like a
//      logo — it is wrong in the one way nobody notices until it is cut out of
//      vinyl backwards. Handled by negating y, not by a transform attribute, so
//      the numbers in the file read the way the shape sits.
//   2. A shape with a hole is two loops, and which is the hole depends on
//      winding. `fill-rule="evenodd"` decides it by nesting instead, which is
//      what a student means by "the circle is a hole" and does not care which
//      way subtract happened to wind it.
//
// ponytail: outputs one <path> per closed loop, no styling beyond a flat fill.
// Colour and stroke would need colorize() support and a per-shape story, and
// nothing in Q3 asks for either.
// ---------------------------------------------------------------------------
(function (root) {
	'use strict';

	/** 4 decimals is under a micron at these scales and keeps the file small. */
	function num(n) {
		var r = Math.round(n * 10000) / 10000;
		return Object.is(r, -0) ? '0' : String(r);
	}

	function key(p) { return num(p[0]) + ',' + num(p[1]); }

	/**
	 * geom2 sides are unordered segments that happen to join up. Chain them
	 * into closed loops by walking end -> start.
	 *
	 * A side whose partner is missing ends the loop rather than looping forever:
	 * a malformed geometry should produce a short path, not a hang.
	 */
	function loopsOf(sides) {
		var byStart = new Map();
		for (var i = 0; i < sides.length; i++) {
			var k = key(sides[i][0]);
			if (!byStart.has(k)) byStart.set(k, []);
			byStart.get(k).push(sides[i]);
		}
		var loops = [];
		var used = new Set();
		for (var j = 0; j < sides.length; j++) {
			if (used.has(sides[j])) continue;
			var loop = [];
			var cur = sides[j];
			while (cur && !used.has(cur)) {
				used.add(cur);
				loop.push(cur[0]);
				var next = byStart.get(key(cur[1]));
				cur = null;
				if (next) {
					for (var n = 0; n < next.length; n++) {
						if (!used.has(next[n])) { cur = next[n]; break; }
					}
				}
			}
			if (loop.length > 1) loops.push(loop);
		}
		return loops;
	}

	function pathData(loop) {
		var d = 'M ' + num(loop[0][0]) + ' ' + num(-loop[0][1]);
		for (var i = 1; i < loop.length; i++) {
			d += ' L ' + num(loop[i][0]) + ' ' + num(-loop[i][1]);
		}
		return d + ' Z';
	}

	/**
	 * @param {object} jscad   the @jscad/modeling module object
	 * @param {*} solids       whatever main() returned
	 * @param {object} [opts]  { margin } in mm, default 2
	 * @returns {string|null}  SVG source, or null if there is no 2D geometry
	 */
	function serialize(jscad, solids, opts) {
		var margin = (opts && typeof opts.margin === 'number') ? opts.margin : 2;
		var geom2 = jscad.geometries.geom2;
		var list = (Array.isArray(solids) ? solids : [solids]).filter(function (s) {
			return s && geom2.isA(s);
		});
		if (!list.length) return null;

		// ONE <path> PER GEOMETRY, not one per loop. `fill-rule` resolves
		// subpaths WITHIN a single <path>; it does nothing across separate
		// elements. Emitting each loop as its own <path> drew the hole as a
		// filled shape in the fill colour, on top of the shape it should have
		// cut — a solid plate that looked completely correct, because the hole
		// was there and simply invisible.
		//
		// Caught by rendering the file and looking at it. The numeric check that
		// missed it asserted "two paths" and "fill-rule is present", and both
		// were true.
		var shapes = [];
		for (var i = 0; i < list.length; i++) {
			var loops = loopsOf(geom2.toSides(list[i]));
			if (loops.length) shapes.push(loops);
		}
		if (!shapes.length) return null;

		var box = jscad.measurements.measureAggregateBoundingBox(list);
		var minX = box[0][0] - margin, maxX = box[1][0] + margin;
		// y flips, so the TOP of the design is -maxY once negated.
		var minY = -box[1][1] - margin, maxY = -box[0][1] + margin;
		var w = maxX - minX, h = maxY - minY;

		var out = '<?xml version="1.0" encoding="UTF-8"?>\n'
			+ '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"\n'
			+ '     width="' + num(w) + 'mm" height="' + num(h) + 'mm"\n'
			+ '     viewBox="' + num(minX) + ' ' + num(minY) + ' ' + num(w) + ' ' + num(h) + '">\n'
			+ '  <g fill="#282a36" fill-rule="evenodd" stroke="none">\n';
		for (var S = 0; S < shapes.length; S++) {
			var d = [];
			for (var L = 0; L < shapes[S].length; L++) d.push(pathData(shapes[S][L]));
			out += '    <path d="' + d.join(' ') + '"/>\n';
		}
		return out + '  </g>\n</svg>\n';
	}

	root.reshapeSvg = { serialize: serialize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
