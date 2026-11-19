// Points on a sketch's plane (lib/sketch-plane-points.ts): reSHape's plane frames, the projective map from the screen to a plane,
// which sketch the editor cursor is in, and what a picked point writes into the code. The pointer in the real view is a browser check.
import assert from 'node:assert/strict';
import { dimensionOf, resizeEdits, distToSegment, slotGeoms, typedNumbers, typedPoint, typedWords, sketchGeoms, curveOwners, distToPolyline, sketchStatementLines, arcCode, faceSketchArgs, finishDirections, freshName, movePointEdits, planeOutlines, sweepOf, activeSketch, applyProjective, fromPlane, geomPath, geomSnaps, gridStep, planeFrameOf, planeWords, pointCode, pointInsertion, projective, sketchAtCursor, sketchBlockEnd, toGrid, toolCode, toPlane, viewAngles } from '../lib/sketch-plane-points.ts';

// ---- planes, as reSHape resolves them: a named plane's origin is normal x offset ------------------------------------------
const top10 = planeFrameOf({ plane: 'xy', offset: 10 });
assert.deepEqual(toPlane(top10, [12, 7, 10]), [12, 7]); assert.deepEqual(fromPlane(top10, [12, 7]), [12, 7, 10]);
const front = planeFrameOf({ plane: 'xz', offset: 5 });
assert.deepEqual(front.origin, [0, 5, 0], 'front at 5 is y = 5'); assert.deepEqual(toPlane(front, [3, 5, 9]), [3, 9], 'front: x and z');
assert.deepEqual(toPlane(planeFrameOf({ plane: 'yz', offset: 2 }), [2, 4, 6]), [4, 6], 'side: y and z');
const slant = planeFrameOf({ frame: { origin: [0, 0, 5], u: [1, 0, 0], v: [0, 0.6, 0.8] } });
assert.deepEqual(toPlane(slant, fromPlane(slant, [3, 4])).map(x => +x.toFixed(9)), [3, 4], 'a frame round-trips');
assert.deepEqual(toPlane(top10, [1, 2, 0]), [1, 2], 'a point below the plane is dropped onto it');
assert.equal(planeWords({ plane: 'xy', offset: 10 }), 'top plane at 10'); assert.equal(planeWords({ plane: 'xz' }), 'front plane'); assert.equal(planeWords({ frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0] } }), 'a slanted plane');
console.log('PASS planes: top, front, side with offsets, and frames, as reSHape places them');

// ---- the projective map: a perspective view of a plane, inverted from four points --------------------------------------------
const cam = (p) => { const [x, y, z] = p; const d = 200 - (0.3 * x + 0.2 * y + 0.9 * z); return [640 + 800 * (x - 0.5 * z) / d, 360 - 800 * (y + 0.3 * x) / d]; }; // some perspective camera
const quad = [[-30, -30], [90, -30], [90, 70], [-30, 70]];
const H = projective(quad.map(q => cam(fromPlane(top10, q))), quad);
for (const q of [[12.3, 7.6], [60, 40], [-5, 33.3]]) {
  const back = applyProjective(H, cam(fromPlane(top10, q)));
  assert.ok(Math.hypot(back[0] - q[0], back[1] - q[1]) < 1e-6, `a pixel goes back to its plane point ${q}: ${back}`);
}
assert.equal(projective([[0, 0], [1, 0], [2, 0], [3, 0]], quad), null, 'four points in a line fix nothing (a plane seen edge-on)');
console.log('PASS projective map: any pixel back to its point on the plane, and no map for a plane seen edge-on');

// ---- which sketch the cursor is in ------------------------------------------------------------------------------------------
const code = "const base = sketch('top');\nbase.rectangle([0, 0], [60, 40]);\nconst part = extrude(base, 10);\n\nconst lid = sketch('top', 10);\nlid.circle(|);\npocket(lid, part, 10);\nfillet(part.edge('top', 'front'), 2);\n";
const at = (s) => { const i = s.indexOf('|'); return [s.replace('|', ''), i]; };
const sk = new Set(['base', 'lid']);
assert.equal(activeSketch(...at(code), sk), 'lid', 'in lid.circle(');
assert.equal(activeSketch(...at(code.replace('lid.circle(|);', 'lid.circle();').replace("base.rectangle([0, 0], [60, 40]);", "base.rectangle([0, 0], |[60, 40]);")), sk), 'base');
assert.equal(activeSketch(...at(code.replace('lid.circle(|);', 'lid.circle();').replace('const lid = sketch(', 'const lid = sk|etch(')), sk), 'lid', 'on its own declaration');
assert.equal(activeSketch(...at(code.replace('lid.circle(|);', 'lid.circle();') + '|'), sk), 'lid', 'below a pocket of lid, the nearest sketch is lid');
assert.equal(activeSketch(...at('const w = 60;|\n' + code.replace('|', '')), sk), null, 'above every sketch: none');
assert.equal(activeSketch(...at(code), new Set()), null);
console.log('PASS the sketch the cursor is in: its own lines, its declaration, a step that uses it');

// ---- what a picked point writes ---------------------------------------------------------------------------------------------
assert.equal(pointCode([30, 20]), '[30, 20]'); assert.equal(pointCode([-0.0001, 12.3456]), '[0, 12.346]');
assert.deepEqual(toGrid([12.26, 7.74]), [12.5, 7.5]);
assert.equal(pointInsertion('lid.circle(', 11, [30, 20]), '[30, 20]');
assert.equal(pointInsertion('s.rectangle([0, 0]', 18, [60, 40]), ', [60, 40]', 'after a point: a comma first');
assert.equal(pointInsertion('s.lines([[0, 0], ', 17, [5, 5]), '[5, 5]');
console.log('PASS a picked point is written as [x, y], after a comma when it follows another point');
// ---- live sketch mode ---------------------------------------------------------------------------------------------------------
{
  // SolidCraft's measured views (z up): top pitch pi/2, front yaw 0 pitch 0, right yaw -pi/2; the eye goes along u x v
  const r = (a) => ({ yaw: +a.yaw.toFixed(6), pitch: +a.pitch.toFixed(6) });
  assert.deepEqual(r(viewAngles(planeFrameOf({ plane: 'xy', offset: 10 }))), { yaw: 0, pitch: +(Math.PI / 2).toFixed(6) }, 'a top sketch is seen from above');
  assert.deepEqual(r(viewAngles(planeFrameOf({ plane: 'xz' }))), { yaw: 0, pitch: 0 }, 'a front sketch (x right, z up) from the front');
  assert.deepEqual(r(viewAngles(planeFrameOf({ plane: 'yz' }))), { yaw: +(-Math.PI / 2).toFixed(6), pitch: 0 }, 'a side sketch (y right, z up) from the right');
  const tilt = viewAngles(planeFrameOf({ frame: { origin: [0, 0, 5], u: [1, 0, 0], v: [0, 0.6, 0.8] } }));
  assert.ok(Math.abs(tilt.pitch - Math.asin(0.6)) < 1e-9, 'a slanted plane: pitched by its slope');
  assert.equal(gridStep(1), 20); assert.equal(gridStep(3), 5); assert.equal(gridStep(30), 0.5);
  const arc = geomPath({ k: 'arc', c: [0, 0], r: 2, a: [2, 0], b: [0, 2], sense: 'ccw' });
  assert.deepEqual(arc[0].map(x => +x.toFixed(9)), [2, 0]); assert.deepEqual(arc.at(-1).map(x => +x.toFixed(9)), [0, 2]); assert.ok(arc.every(q => q[0] >= -1e-9 && q[1] >= -1e-9), 'a quarter, counter-clockwise');
  const cw = geomPath({ k: 'arc', c: [0, 0], r: 2, a: [2, 0], b: [0, 2], sense: 'cw' });
  assert.ok(cw.some(q => q[1] < -1), 'clockwise goes the long way round');
  assert.deepEqual(geomSnaps({ k: 'line', a: [0, 0], b: [10, 4] }).map(x => x.q), [[0, 0], [10, 4], [5, 2]]);
  const doc = "const base = sketch('top');\nbase.rectangle([0, 0], [60, 40]);\nconst part = extrude(base, 10);\n\nconst lid = sketch('top', 10);\n// the hole\nlid.circle([30, 20], { r: 6 });\n\npocket(lid, part, 4);\n";
  assert.equal(doc.slice(0, sketchBlockEnd(doc, 'lid')).split('\n').at(-1), 'lid.circle([30, 20], { r: 6 });', 'after its last line, comments between allowed');
  assert.equal(doc.slice(0, sketchBlockEnd(doc, 'base')).split('\n').at(-1), 'base.rectangle([0, 0], [60, 40]);');
  assert.equal(sketchBlockEnd(doc.replace('lid.circle([30, 20], { r: 6 });', ''), 'lid') !== null, true);
  assert.equal(sketchBlockEnd(doc, 'nope'), null);
  const in_ = (mark) => sketchAtCursor(doc, doc.indexOf(mark), new Set(['base', 'lid']));
  assert.equal(in_('{ r: 6 }'), 'lid'); assert.equal(in_('// the hole'), 'lid', 'a comment inside the block'); assert.equal(in_("sketch('top', 10)"), 'lid');
  assert.equal(in_('pocket('), null, 'a step that uses the sketch is out of its block'); assert.equal(in_('extrude('), null); assert.equal(in_('[60, 40]'), 'base');
  assert.equal(toolCode.rectangle('lid', [40, 30], [10, 5]), 'lid.rectangle([10, 5], [40, 30]);', 'corners in either order');
  assert.equal(toolCode.circle('lid', [30, 20], 6), 'lid.circle([30, 20], { r: 6 });');
  assert.equal(toolCode.lines('lid', [[0, 0], [10, 0], [10, 5]], true), 'lid.lines([[0, 0], [10, 0], [10, 5], [0, 0]]);');
  assert.equal(toolCode.line('lid', [0, 0], [10, 5]), 'lid.line([0, 0], [10, 5]);');
}
console.log('PASS live sketch: the view for each plane, the grid step, arcs drawn, where a new line goes, the code each tool writes');
// ---- a sketch on a face, finished into a feature; the arc tool; moving a point; the face's outline ---------------------------
{
  assert.equal(faceSketchArgs({ plane_normal: [0, 0, 1], centroid: [30, 20, 10] }), "'top', 10");
  assert.equal(faceSketchArgs({ plane_normal: [0, -1, 0], centroid: [30, 0, 5] }), "'front'");
  assert.equal(faceSketchArgs({ plane_normal: [1, 0, 0], centroid: [60, 20, 5] }), "'side', 60");
  assert.equal(faceSketchArgs({ plane_normal: null, centroid: [0, 0, 0] }), null, 'a curved face holds no sketch');
  const slope = faceSketchArgs({ plane_normal: [0, -0.6, 0.8], centroid: [10, 5, 8] });
  const fr = planeFrameOf({ frame: Function(`return ${slope}`)() });
  assert.deepEqual(sweepOf(fr).map(x => +x.toFixed(9)), [0, -0.6, 0.8], 'a slanted face: the frame\'s u x v is the face\'s outward normal');
  assert.ok(Math.abs(fr.u[2]) < 1e-12, 'its x runs level, across the slope');
  // a 60 x 40 x 10 box: centre (30, 20, 5)
  const c = [30, 20, 5];
  assert.deepEqual(finishDirections(planeFrameOf({ plane: 'xy', offset: 10 }), c), { extrudeReversed: false, pocketReversed: false }, 'on the top face: up and down as written');
  assert.deepEqual(finishDirections(planeFrameOf({ plane: 'xz', offset: 40 }), c), { extrudeReversed: true, pocketReversed: true }, 'on the back face, the front plane\'s -Y sweep points into the part: both turned round');
  assert.deepEqual(finishDirections(planeFrameOf({ plane: 'xz', offset: 0 }), c), { extrudeReversed: false, pocketReversed: false }, 'on the front face');
  assert.deepEqual(finishDirections(planeFrameOf({ plane: 'xy', offset: 0 }), c), { extrudeReversed: true, pocketReversed: true }, 'on the bottom face');
  assert.equal(freshName('part', new Set(['part', 'part2'])), 'part3');
  assert.equal(arcCode('lid', [0, 0], [5, 0], [0, 9]), "lid.arc([0, 0], [5, 0], [0, 5], 'ccw');", 'the end is put on the circle, towards the third click');
  assert.equal(arcCode('lid', [0, 0], [0, 0], [1, 1]), null);
  const doc = "const lid = sketch('top', 10);\nlid.line([0, 0], [10, 5]);\nlid.lines([[10, 5], [20, 5], [10, 5]]);\nlid.circle([30, 20], { r: 6 });\npocket(lid, part, 4, [10, 5]);\n";
  const ed = movePointEdits(doc, 'lid', [10, 5], [12, 6]);
  const moved = ed.reduceRight((d, e) => d.slice(0, e.from) + e.insert + d.slice(e.to), doc);
  assert.equal(moved, "const lid = sketch('top', 10);\nlid.line([0, 0], [12, 6]);\nlid.lines([[12, 6], [20, 5], [12, 6]]);\nlid.circle([30, 20], { r: 6 });\npocket(lid, part, 4, [10, 5]);\n", 'every [10, 5] in the block moves; the one past it does not');
  assert.equal(movePointEdits("const lid = sketch('top');\nlid.circle([w / 2, 5], { r: 1 });\n", 'lid', [30, 5], [31, 5]).length, 0, 'a point written with a variable is not changed');
  const sq = planeOutlines([{ a: [0, 0], b: [60, 0], mid: [30, 0] }, { a: [60, 40], b: [60, 0], mid: [60, 20] }, { a: [60, 40], b: [0, 40], mid: [30, 40] }, { a: [0, 0], b: [0, 40], mid: [0, 20] }, { a: [36, 20], b: [36, 20], mid: [24, 20] }]);
  assert.equal(sq.length, 2, 'the outside, joined from edges in any order and direction, and a round hole');
  assert.ok(sq.some(l => l.length === 5) && sq.some(l => l.length === 49));
  assert.equal(planeOutlines([{ a: [0, 0], b: [60, 0], mid: [30, 0] }]).length, 0, 'an edge that does not close is left out');
}
console.log('PASS a sketch on a face, the way extrude and pocket go, the arc tool, moving a point, the face\'s outline');
{ // Delete: the drawing lines of a block, which line drew which curve, and the distance to a drawn curve
  const doc = "const a = 1;\nconst sk = sketch('top');\nsk.rectangle([0, 0], [10, 5]);\n// c\nsk.circle([2, 2], { r: a });\nconst p = extrude(sk, 3);\n";
  const L = sketchStatementLines(doc, 'sk');
  assert.deepEqual(L.map(l => l.text), ['sk.rectangle([0, 0], [10, 5]);', 'sk.circle([2, 2], { r: a });'], 'the drawing lines, not the comment or the extrude');
  assert.equal(doc.slice(L[0].from, L[0].to), 'sk.rectangle([0, 0], [10, 5]);\n', 'with its newline, so removing it leaves no blank line');
  assert.deepEqual(sketchStatementLines(doc, 'other'), []);
  assert.deepEqual(sketchStatementLines("const sk = sketch('top');\nsk.line([0, 0], [1, 1]);", 'sk').map(l => [l.from, l.to]), [[26, 50]], 'the last line of the file, no newline');
  assert.deepEqual(curveOwners([4, 5], 5), [0, 0, 0, 0, 1], 'a rectangle is four curves of one line');
  assert.equal(curveOwners([4, 5], 6), null, 'counts that do not add up: not known');
  assert.equal(curveOwners([4, 3], 3), null, 'a count that goes down: not known');
  assert.equal(distToPolyline([5, 3], [[0, 0], [10, 0]]), 3); assert.equal(distToPolyline([-4, 3], [[0, 0], [10, 0]]), 5);
}
console.log('PASS delete: the drawing lines of a sketch, which line drew each curve');
{ // plain outlines drawn from their points
  assert.deepEqual(sketchGeoms({ points: [[10, 0], [20, 0], [20, 10]] }), [{ k: 'line', a: [10, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, 10] }, { k: 'line', a: [20, 10], b: [10, 0] }], 'a polygon: its sides, closed');
  assert.deepEqual(sketchGeoms({ points: [[13.5, 5], [16.5, 5]], shape: 'circle' }), [{ k: 'circle', c: [15, 5], r: 1.5 }], 'a circle from the ends of a diameter');
  const g = [{ k: 'circle', c: [1, 1], r: 1 }]; assert.equal(sketchGeoms({ geoms: g, points: [[0, 0], [1, 0], [1, 1]] }), g, 'geoms rows first');
  assert.deepEqual(sketchGeoms({ points: [[0, 0], [10, 0], [10, 10], [0, 10]], rounds: [0, 2, 0, 0] }), [], 'a rounded corner: not drawn as straight sides');
  assert.deepEqual(sketchGeoms({ points: [[0, 0], [10, 0], [10, 10], [0, 10]], rounds: [0, 0, 0, 0], chamfers: [], bulges: [] }), sketchGeoms({ points: [[0, 0], [10, 0], [10, 10], [0, 10]] }), 'no corner changed: drawn');
  assert.deepEqual(sketchGeoms({}), []);
}
console.log('PASS plain outlines: a polygon\'s sides and a circle, from points');
{ // a size typed while drawing
  assert.deepEqual(typedNumbers('25'), [25]); assert.deepEqual(typedNumbers(' 30, 20 '), [30, 20]); assert.deepEqual(typedNumbers('30 x 20'), [30, 20]);
  assert.equal(typedNumbers(''), null); assert.equal(typedNumbers('1,2,3'), null); assert.deepEqual(typedNumbers('2.'), [2], 'part way through typing 2.5');
  assert.equal(typedNumbers('a'), null);
  assert.deepEqual(typedPoint('line', [[0, 0]], [10, 0], '25'), [25, 0], 'a line 25 long towards the pointer');
  assert.deepEqual(typedPoint('line', [[0, 0]], [3, 4], '10'), [6, 8]);
  assert.deepEqual(typedPoint('line', [[5, 5]], [5, 5], '10'), [15, 5], 'pointer on the point: along +x');
  assert.deepEqual(typedPoint('polyline', [[0, 0], [10, 0]], [10, 50], '5'), [10, 5], 'from the last point');
  assert.deepEqual(typedPoint('rectangle', [[10, 10]], [0, 30], '30, 20'), [-20, 30], 'into the pointer\'s quarter');
  assert.deepEqual(typedPoint('rectangle', [[0, 0]], [5, 5], '8'), [8, 8], 'one number: a square');
  assert.deepEqual(typedPoint('circle', [[2, 2]], [2, 9], '5'), [2, 7], 'the radius');
  assert.deepEqual(typedPoint('arc', [[0, 0], [10, 0]], [0, 0], '90'), [0, 10], 'an arc turning 90 degrees counter-clockwise');
  assert.equal(typedPoint('arc', [[0, 0]], [0, 0], '90'), null, 'an arc needs its start first');
  assert.equal(typedPoint('line', [], [1, 1], '5'), null, 'nothing before the first click');
  assert.equal(typedPoint('line', [[0, 0]], [1, 1], '-5'), null); assert.equal(typedPoint('line', [[0, 0]], [1, 1], '5, 6'), null);
  assert.equal(typedWords('rectangle', [[0, 0]], '30, 20'), 'width 30, height 20'); assert.equal(typedWords('line', [[0, 0]], '25'), 'length 25'); assert.equal(typedWords('arc', [[0, 0], [1, 0]], '90'), 'angle 90°');
}
console.log('PASS typed sizes: length, width and height, radius, angle');
{ // the slot tool
  assert.equal(toolCode.slot('sk', [10, 10], [30, 10], 4), "sk.line([10, 6], [30, 6]);\nsk.arc([30, 10], [30, 6], [30, 14], 'ccw');\nsk.line([30, 14], [10, 14]);\nsk.arc([10, 10], [10, 14], [10, 6], 'ccw');", 'in the drawing words, which mix with the other tools');
  const g = slotGeoms([0, 0], [10, 0], 2);
  assert.deepEqual(g.map(x => x.k), ['line', 'arc', 'line', 'arc']);
  const pts = g.flatMap(x => geomPath(x, 64));
  assert.ok(Math.abs(Math.max(...pts.map(q => q[0])) - 12) < 1e-9 && Math.abs(Math.min(...pts.map(q => q[0])) + 2) < 1e-9, 'the caps go round the outer ends');
  assert.ok(Math.abs(Math.max(...pts.map(q => q[1])) - 2) < 1e-9 && Math.abs(Math.min(...pts.map(q => q[1])) + 2) < 1e-9, 'the sides 2 out');
  assert.deepEqual(slotGeoms([0, 0], [0, 0], 2), [], 'no slot with both ends on one point');
  assert.deepEqual(typedPoint('slot', [[0, 0], [10, 0]], [3, 3], '4'), [5, 4], 'a typed radius: a point that far from the middle');
  assert.equal(distToSegment(typedPoint('slot', [[0, 0], [10, 0]], [3, 3], '4'), [0, 0], [10, 0]), 4);
  assert.equal(typedPoint('slot', [[0, 0]], [3, 3], '4'), null, 'the radius comes after both ends');
  assert.equal(typedWords('slot', [[0, 0], [10, 0]], '4'), 'radius 4');
}
console.log('PASS the slot tool: its code, its outline, a typed radius');
{ // dimensions: shown on each curve, changed by typing
  assert.deepEqual(dimensionOf({ k: 'line', a: [0, 0], b: [3, 4] }), { at: [1.5, 2], text: '5', value: 5, kind: 'length' });
  assert.equal(dimensionOf({ k: 'circle', c: [0, 0], r: 2 }).text, 'r 2'); assert.equal(dimensionOf({ k: 'arc', c: [0, 0], r: 3, a: [3, 0], b: [0, 3], sense: 'ccw' }).text, 'r 3');
  const doc = "const w = 4;\nconst sk = sketch('top');\nsk.rectangle([10, 5], [30, 15]);\nsk.circle([45, 20], { r: 5 });\nsk.lines([[0, 0], [10, 0], [10, 10]]);\nsk.circle(6, { at: [70, 5] });\nsk.rectangle([40, 40], [40 + w, 50]);\nsk.line([44, 40], [60, 40]);\n";
  const L = sketchStatementLines(doc, 'sk');
  const apply = (es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  assert.match(apply(resizeEdits(doc, 'sk', L[0], { k: 'line', a: [10, 5], b: [30, 5] }, 25)), /sk\.rectangle\(\[10, 5\], \[35, 15\]\);/, 'a rectangle\'s width');
  assert.match(apply(resizeEdits(doc, 'sk', L[0], { k: 'line', a: [30, 5], b: [30, 15] }, 4)), /sk\.rectangle\(\[10, 5\], \[30, 9\]\);/, 'its height');
  assert.match(apply(resizeEdits(doc, 'sk', L[1], { k: 'circle', c: [45, 20], r: 5 }, 7.5)), /\{ r: 7\.5 \}/, 'a circle\'s radius');
  assert.match(apply(resizeEdits(doc, 'sk', L[2], { k: 'line', a: [0, 0], b: [10, 0] }, 20)), /sk\.lines\(\[\[0, 0\], \[20, 0\], \[10, 10\]\]\);/, 'a chain\'s side: its end moves, and the next side starts there');
  assert.match(apply(resizeEdits(doc, 'sk', L[3], { k: 'circle', c: [70, 5], r: 3 }, 4)), /sk\.circle\(8, \{ at: \[70, 5\] \}\);/, 'the one-shape circle: its diameter');
  assert.equal(resizeEdits(doc, 'sk', L[4], { k: 'line', a: [44, 50], b: [44, 40] }, 3), null, 'a side whose corner is written with a variable: not changed, though [44, 40] is written on another line');
  assert.equal(resizeEdits(doc, 'sk', L[1], { k: 'circle', c: [45, 20], r: 5 }, 0), null, 'a size of 0 is not given');
}
console.log('PASS dimensions: lengths and radii shown, and changed in the code');
console.log('Sketch plane points: planes, the screen-to-plane map, the active sketch and the written point pass.');
