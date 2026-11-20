// Points on a sketch's plane (lib/sketch-plane-points.ts): reSHape's plane frames, the projective map from the screen to a plane,
// which sketch the editor cursor is in, and what a picked point writes into the code. The pointer in the real view is a browser check.
import assert from 'node:assert/strict';
import { angleDims, angleEdits, extendGeom, extendEdits, tangentAt, tangentArc, curveCode, mirrorGeom, offsetGeoms, offsetChain, offsetDistance, alignPoint, sketchCrossings, polygonPoints, patternGeoms, patternSource, moveEdits, revolveSketch, crossings, trimGeom, trimEdits, chamferEdits, chamferGeom, cornerAt, cutCorners, cutPreview, largestChamfer, largestRound, roundEdits, roundGeom, dimensionOf, resizeEdits, distToSegment, slotGeoms, typedNumbers, typedPoint, typedWords, sketchGeoms, curveOwners, distToPolyline, sketchStatementLines, arcCode, faceSketchArgs, finishDirections, freshName, movePointEdits, planeOutlines, sweepOf, activeSketch, applyProjective, fromPlane, geomPath, geomSnaps, gridStep, planeFrameOf, planeWords, pointCode, pointInsertion, projective, sketchAtCursor, sketchBlockEnd, toGrid, toolCode, toPlane, viewAngles } from '../lib/sketch-plane-points.ts';

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
  { // a slanted end, and a slanted slot: every arc's two ends on one circle to 1e-6, which reSHape asks of an arc
    const on = code => [...code.matchAll(/\.arc\(\[([-\d.]+), ([-\d.]+)\], \[([-\d.]+), ([-\d.]+)\], \[([-\d.]+), ([-\d.]+)\]/g)].every(m => { const [cx, cy, ax, ay, bx, by] = m.slice(1).map(Number); return Math.abs(Math.hypot(ax - cx, ay - cy) - Math.hypot(bx - cx, by - cy)) < 1e-6; });
    assert.equal(arcCode('lid', [0, 0], [5, 0], [1, 1]), "lid.arc([0, 0], [5, 0], [3.535533906, 3.535533906], 'ccw');", 'the end put on the circle, to 1e-9');
    assert.ok(on(arcCode('lid', [1.5, 2], [7, 3], [-4, 9])));
    const slot = toolCode.slot('lid', [0, 0], [20, 7], 3); assert.equal((slot.match(/\.arc\(/g) || []).length, 2); assert.ok(on(slot), slot);
  }
  const doc = "const lid = sketch('top', 10);\nlid.line([0, 0], [10, 5]);\nlid.lines([[10, 5], [20, 5], [10, 5]]);\nlid.circle([30, 20], { r: 6 });\npocket(lid, part, 4, [10, 5]);\n";
  const ed = movePointEdits(doc, 'lid', [10, 5], [12, 6]);
  const moved = ed.reduceRight((d, e) => d.slice(0, e.from) + e.insert + d.slice(e.to), doc);
  assert.equal(moved, "const lid = sketch('top', 10);\nlid.line([0, 0], [12, 6]);\nlid.lines([[12, 6], [20, 5], [12, 6]]);\nlid.circle([30, 20], { r: 6 });\npocket(lid, part, 4, [10, 5]);\n", 'every [10, 5] in the block moves; the one past it does not');
  assert.equal(movePointEdits("const lid = sketch('top');\nlid.circle([w / 2, 5], { r: 1 });\n", 'lid', [30, 5], [31, 5]).length, 0, 'a point written with a variable is not changed');
  {
    const r = "const sk = sketch('top', 10);\nsk.rectangle([10, 5], [40, 25]);\nsk.line([40, 5], [50, 0]);\n";
    const mv = (from, to) => movePointEdits(r, 'sk', from, to).reduceRight((d, e) => d.slice(0, e.from) + e.insert + d.slice(e.to), r);
    assert.equal(mv([40, 5], [45, 2]), "const sk = sketch('top', 10);\nsk.rectangle([10, 2], [45, 25]);\nsk.line([45, 2], [50, 0]);\n", 'a rectangle\'s corner its code does not write: the opposite corner stays, and a line from it moves too');
    assert.equal(mv([10, 25], [8, 30]), "const sk = sketch('top', 10);\nsk.rectangle([8, 5], [40, 30]);\nsk.line([40, 5], [50, 0]);\n", 'its other unwritten corner');
    assert.equal(mv([40, 25], [42, 26]), "const sk = sketch('top', 10);\nsk.rectangle([10, 5], [42, 26]);\nsk.line([40, 5], [50, 0]);\n", 'a written corner, as before');
    assert.equal(movePointEdits("const sk = sketch('top');\nsk.rectangle([w, 5], [40, 25]);\n", 'sk', [40, 5], [41, 5]).length, 0, 'a rectangle written with a variable is not changed');
  }
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
{ // angle dimensions: where two lines meet, changed by turning one about the corner
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const tri = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [10, 10] }, { k: 'line', a: [10, 10], b: [0, 0] }];
  const A = angleDims(tri);
  assert.deepEqual(A.map(a => [a.q, a.i, a.j, +a.value.toFixed(9)]), [[[0, 0], 0, 2, 45], [[20, 0], 0, 1, 45], [[10, 10], 1, 2, 90]], 'a triangle: 45, 45 and a slanted right angle');
  const rect = [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [10, 0], b: [10, 5] }, { k: 'line', a: [10, 5], b: [0, 5] }, { k: 'line', a: [0, 5], b: [0, 0] }];
  assert.deepEqual(angleDims(rect), [], 'a level and an upright line: no angle shown');
  assert.deepEqual(angleDims([{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [10, 0], b: [20, 0] }]), [], 'straight on: none');
  assert.deepEqual(angleDims([...tri, { k: 'line', a: [0, 0], b: [-5, 3] }]).map(a => a.q), [[20, 0], [10, 10]], 'three lines at a corner: none there');
  assert.deepEqual(angleDims([{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'arc', c: [0, 5], r: 5, a: [0, 0], b: [5, 5], sense: 'ccw' }]), [], 'a line and an arc: none');
  const doc = "const sk = sketch('top');\nsk.lines([[0, 0], [20, 0], [10, 10], [0, 0]]);\n";
  const L = sketchStatementLines(doc, 'sk');
  assert.match(apply(doc, angleEdits(doc, 'sk', L, [0, 0, 0], tri, A[0], 60)), /sk\.lines\(\[\[0, 0\], \[20, 0\], \[7\.071067812, 12\.247448714\], \[0, 0\]\]\);/,
    'the later line turns to 60 degrees about the corner, its length kept, written to 1e-9; the side that shares its end follows');
  const doc2 = "const w = 10;\nconst sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([0, 0], [w, 10]);\n";
  const G2 = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [0, 0], b: [10, 10] }]; const L2 = sketchStatementLines(doc2, 'sk'); const A2 = angleDims(G2);
  assert.equal(+A2[0].value.toFixed(9), 45);
  assert.match(apply(doc2, angleEdits(doc2, 'sk', L2, [0, 1], G2, A2[0], 30)), /sk\.line\(\[0, 0\], \[19\.318516526, 5\.176380902\]\);\nsk\.line\(\[0, 0\], \[w, 10\]\);/,
    'the later line\'s end is written with a variable: the earlier line turns instead');
  const doc3 = "const w = 10;\nconst sk = sketch('top');\nsk.line([0, 0], [w + 10, 0]);\nsk.line([0, 0], [w, 10]);\n";
  assert.equal(angleEdits(doc3, 'sk', sketchStatementLines(doc3, 'sk'), [0, 1], G2, A2[0], 30), null, 'neither written as plain numbers: no change');
  const doc4 = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([0, 0], [10, 10]);\nsk.arc([10, 0], [10, 10], [0, 0], 'ccw');\n";
  const G4 = [...G2, { k: 'arc', c: [10, 0], r: 10, a: [10, 10], b: [0, 0], sense: 'ccw' }];
  assert.equal(angleDims(G4).length, 0, 'an arc ends at the corner: no angle');
  const doc5 = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([0, 0], [10, 10]);\nsk.circle([10, 10], { r: 2 });\n";
  const G5 = [...G2, { k: 'circle', c: [10, 10], r: 2 }];
  assert.match(apply(doc5, angleEdits(doc5, 'sk', sketchStatementLines(doc5, 'sk'), [0, 1, 2], G5, angleDims(G5)[0], 30)), /sk\.line\(\[0, 0\], \[19\.318516526, 5\.176380902\]\);\nsk\.line\(\[0, 0\], \[10, 10\]\);/,
    'a circle is centred on the later line\'s end: the earlier line turns, the circle stays');
  const doc6 = "const sk = sketch('top');\nsk.rectangle([20, -5], [30, 0]);\nsk.line([0, 0], [20, 0]);\nsk.line([0, 0], [10, 10]);\nsk.line([10, 10], [15, 20]);\n";
  const G6 = [{ k: 'line', a: [20, -5], b: [30, -5] }, { k: 'line', a: [30, -5], b: [30, 0] }, { k: 'line', a: [30, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, -5] }, ...G2, { k: 'line', a: [10, 10], b: [15, 20] }];
  const A6 = angleDims(G6).find(a => a.q[0] === 0 && a.q[1] === 0);
  assert.match(apply(doc6, angleEdits(doc6, 'sk', sketchStatementLines(doc6, 'sk'), [0, 0, 0, 0, 1, 2, 3], G6, A6, 90)), /sk\.line\(\[0, 0\], \[0, 14\.142135624\]\);\nsk\.line\(\[0, 14\.142135624\], \[15, 20\]\);/,
    'the later line turns, and the line that starts at its end follows');
  const doc7 = "const sk = sketch('top');\nsk.rectangle([10, 10], [20, 15]);\nsk.line([0, 0], [20, 0]);\nsk.line([0, 0], [10, 10]);\n";
  const G7 = [{ k: 'line', a: [10, 10], b: [20, 10] }, { k: 'line', a: [20, 10], b: [20, 15] }, { k: 'line', a: [20, 15], b: [10, 15] }, { k: 'line', a: [10, 15], b: [10, 10] }, ...G2];
  assert.match(apply(doc7, angleEdits(doc7, 'sk', sketchStatementLines(doc7, 'sk'), [0, 0, 0, 0, 1, 2], G7, angleDims(G7).find(a => a.q[0] === 0), 30)), /sk\.rectangle\(\[10, 10\], \[20, 15\]\);\nsk\.line\(\[0, 0\], \[19\.318516526, 5\.176380902\]\);/,
    'a rectangle\'s corner on the later line\'s end: the earlier line turns, the rectangle stays');
  assert.equal(angleEdits(doc, 'sk', L, [0, 0, 0], tri, A[0], 180), null, '180 degrees is not an angle to give'); assert.equal(angleEdits(doc, 'sk', L, [0, 0, 0], tri, A[0], 0), null);
}
console.log('PASS angle dimensions: shown where two lines meet, changed by turning one line about the corner');
{ // Round: a corner where two lines meet, rounded with an arc
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const doc = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([20, 0], [20, 10]);\n";
  const G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, 10] }];
  assert.deepEqual(cutCorners(G), [[0, 0], [20, 0], [20, 10]], 'each end once');
  const c = cornerAt(G, [20, 0]); assert.deepEqual(c.lines, [0, 1]); assert.ok(Math.abs(c.half - Math.PI / 4) < 1e-12, 'a right angle');
  assert.match(cornerAt(G, [0, 0]), /two lines or arcs meet/, 'the end of one line is no corner');
  const g = roundGeom(G, [20, 0], 5);
  assert.deepEqual(g.arc, { k: 'arc', c: [15, 5], r: 5, a: [15, 0], b: [20, 5], sense: 'ccw' }, 'the arc, the short way round, counter-clockwise');
  const L = sketchStatementLines(doc, 'sk'); let e = roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 5);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [15, 0]);\nsk.line([20, 5], [20, 10]);\nsk.arc([15, 5], [15, 0], [20, 5], 'ccw');\n", 'the lines shortened, the arc after the later one');
  assert.equal(largestRound(G, [20, 0]), 10, 'as big as the shorter line');
  e = roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 10);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.arc([10, 10], [10, 0], [20, 10], 'ccw');\n", 'a round that uses up a line: the line goes');
  assert.match(roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 12), /does not fit between these lines; the largest is 10\./);
  // turning right (clockwise along the outline): the arc still runs counter-clockwise, from the other end
  const R = [{ k: 'line', a: [0, 10], b: [10, 10] }, { k: 'line', a: [10, 10], b: [10, 0] }];
  assert.deepEqual(roundGeom(R, [10, 10], 4).arc, { k: 'arc', c: [6, 6], r: 4, a: [10, 6], b: [6, 10], sense: 'ccw' });
  // a slanted corner: 60 degrees, so t = r / tan 30
  const S = [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [0, 0], b: [5, 5 * Math.sqrt(3)] }];
  const sg = roundGeom(S, [0, 0], 1); const t = 1 / Math.tan(Math.PI / 6);
  assert.deepEqual(sg.ends, [[+t.toFixed(9), 0], [+(t / 2).toFixed(9), +(t * Math.sqrt(3) / 2).toFixed(9)]], 'the round meets each line t from the corner, to 1e-9');
  assert.ok(sg.ends.every(p => Math.abs(Math.hypot(sg.arc.c[0] - p[0], sg.arc.c[1] - p[1]) - 1) < 1e-8), 'the centre 1 from where it meets each line, to well inside the 1e-6 reSHape asks of an arc');
  assert.match(cornerAt([{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [10, 0], b: [20, 0] }], [10, 0]), /straight on/, 'lines in a straight line');
  // a rectangle: written out as its four lines, with the round
  const rd = "const sk = sketch('top');\n  sk.rectangle([0, 0], [60, 40]);\nsk.circle([30, 20], { r: 5 });\n";
  const RG = [{ k: 'line', a: [0, 0], b: [60, 0] }, { k: 'line', a: [60, 0], b: [60, 40] }, { k: 'line', a: [60, 40], b: [0, 40] }, { k: 'line', a: [0, 40], b: [0, 0] }, { k: 'circle', c: [30, 20], r: 5 }];
  e = roundEdits(rd, 'sk', sketchStatementLines(rd, 'sk'), [0, 0, 0, 0, 1], RG, [60, 40], 10);
  assert.equal(apply(rd, e.edits), "const sk = sketch('top');\n  sk.line([0, 0], [60, 0]);\n  sk.line([60, 0], [60, 30]);\n  sk.line([50, 40], [0, 40]);\n  sk.line([0, 40], [0, 0]);\n  sk.arc([50, 30], [60, 30], [50, 40], 'ccw');\nsk.circle([30, 20], { r: 5 });\n", 'its four sides, each kept where it was, and the arc');
  // written with a variable: not changed
  const vd = "const w = 20;\nconst sk = sketch('top');\nsk.line([0, 0], [w, 0]);\nsk.line([20, 0], [20, 10]);\n";
  assert.match(roundEdits(vd, 'sk', sketchStatementLines(vd, 'sk'), [0, 1], G, [20, 0], 5), /written with a variable/);
  // three curves at the corner: not a corner of two
  assert.match(cornerAt([...G, { k: 'arc', c: [20, 5], r: 5, a: [20, 0], b: [25, 5], sense: 'ccw' }], [20, 0]), /two lines or arcs meet/);
}
console.log('PASS round: a corner of two lines rounded, in the drawing words');
{ // Round and Chamfer where a line meets an arc, or two arcs meet
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const near = (p, q, tol = 1e-3) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;
  // a line along the x axis to [20, 0], then an arc about [30, 0] turning clockwise from [20, 0] up to [30, 10]: a right angle, inside it outside the circle
  const doc = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.arc([30, 0], [20, 0], [30, 10], 'cw');\n";
  const G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'arc', c: [30, 0], r: 10, a: [20, 0], b: [30, 10], sense: 'cw' }];
  const L = sketchStatementLines(doc, 'sk');
  assert.deepEqual(cutCorners(G), [[0, 0], [20, 0], [30, 10]], 'the arc\'s ends are corners too');
  const c = cornerAt(G, [20, 0]); assert.ok(typeof c !== 'string' && c.arcs && Math.abs(c.half - Math.PI / 4) < 1e-12, 'a right angle between the line and the arc');
  // by hand: the centre is r above the line and 10 + r from [30, 0], so x = 30 - sqrt(100 + 20 r); for r = 5, [15.858, 5]
  const g = roundGeom(G, [20, 0], 5);
  assert.deepEqual(g.arc, { k: 'arc', c: [15.857864376, 5], r: 5, a: [15.857864376, 0], b: [20.571909584, 3.333333333], sense: 'ccw' }, 'the round, counter-clockwise past the corner, to 1e-9');
  let e = roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 5);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [15.857864376, 0]);\nsk.arc([30, 0], [30, 10], [20.571909584, 3.333333333], 'ccw');\nsk.arc([15.857864376, 5], [15.857864376, 0], [20.571909584, 3.333333333], 'ccw');\n", 'the line shortened, the arc written again from its far end (its radius stays 10), the round after');
  assert.equal(largestRound(G, [20, 0]), 40, 'as big as uses up the line: 30 - sqrt(100 + 20 r) = 0');
  e = roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 40);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.arc([30, 0], [30, 10], [24, 8], 'ccw');\nsk.arc([0, 40], [0, 0], [24, 8], 'ccw');\n", 'a round that uses up the line: the line goes');
  assert.match(roundEdits(doc, 'sk', L, [0, 1], G, [20, 0], 41), /A radius of 41 does not fit between the line and the arc; the largest is 40\./);
  const pv = cutPreview(G, [20, 0], g); assert.ok(near(pv[0], [0, 0]) && near(pv[pv.length - 1], [30, 10]) && pv.some(p => near(p, [15.857864376, 0])), 'the preview runs from the line\'s far end round to the arc\'s');
  // chamfer: 5 along the line, and on the arc the point 5 from the corner in a straight line
  const ch = chamferGeom(G, [20, 0], 5); assert.deepEqual(ch.ends, [[15, 0], [21.25, 4.841229183]]);
  assert.equal(largestChamfer(G, [20, 0]), 14.142, 'the chord to the arc\'s far end');
  e = chamferEdits(doc, 'sk', L, [0, 1], G, [20, 0], 5);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [15, 0]);\nsk.arc([30, 0], [30, 10], [21.25, 4.841229183], 'ccw');\nsk.line([15, 0], [21.25, 4.841229183]);\n");
  assert.match(chamferGeom(G, [20, 0], 15), /A distance of 15 does not fit along the line and the arc; the largest is 14\.142\./);
  // an arc that ends where the corner is written as its end (to): written again from its start, its sense kept
  const d2 = "const sk = sketch('top');\nsk.arc([30, 0], [30, 10], [20, 0], 'ccw');\nsk.line([20, 0], [0, 0]);\n";
  const G2 = [{ k: 'arc', c: [30, 0], r: 10, a: [30, 10], b: [20, 0], sense: 'ccw' }, { k: 'line', a: [20, 0], b: [0, 0] }];
  assert.equal(apply(d2, roundEdits(d2, 'sk', sketchStatementLines(d2, 'sk'), [0, 1], G2, [20, 0], 5).edits), "const sk = sketch('top');\nsk.arc([30, 0], [30, 10], [20.571909584, 3.333333333], 'ccw');\nsk.line([15.857864376, 0], [0, 0]);\nsk.arc([15.857864376, 5], [15.857864376, 0], [20.571909584, 3.333333333], 'ccw');\n");
  // where a line runs on smoothly into an arc (the arc's tangent there is the line's), or doubles back along it
  assert.match(cornerAt([{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'arc', c: [20, 10], r: 10, a: [20, 0], b: [30, 10], sense: 'ccw' }], [20, 0]), /They run on smoothly there: there is no corner to round\./);
  assert.match(cornerAt([{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'arc', c: [20, 10], r: 10, a: [20, 0], b: [10, 10], sense: 'cw' }], [20, 0], 'chamfer'), /no corner to chamfer/);
  // two arcs at a right angle: about [0, 0] (the corner outside it) and about [10, 10] (the corner inside it)
  const A = [{ k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [0, 10], sense: 'ccw' }, { k: 'arc', c: [10, 10], r: 10, a: [0, 10], b: [10, 20], sense: 'cw' }];
  const ga = roundGeom(A, [0, 10], 2);
  assert.ok(Math.abs(Math.hypot(ga.arc.c[0], ga.arc.c[1]) - 12) < 2e-3 && Math.abs(Math.hypot(ga.arc.c[0] - 10, ga.arc.c[1] - 10) - 8) < 2e-3, 'the round 2 outside one circle and 2 inside the other');
  assert.ok(ga.ends.every(p => Math.abs(Math.hypot(p[0] - ga.arc.c[0], p[1] - ga.arc.c[1]) - 2) < 2e-3), 'and meets both');
  assert.ok(near(ga.ends[0], [1.837, 9.83], 2e-3) && near(ga.ends[1], [0.255, 12.245], 2e-3), (JSON.stringify(ga.ends)));
  assert.match(roundGeom(A, [0, 10], 10), /does not fit between the two arcs/, 'no bigger than the inside circle');
  // every arc these write has its two ends on one circle to 1e-6 (reSHape's rule tolerance), whatever the angles
  const onCircle = code => [...code.matchAll(/\.arc\(\[([-\d.]+), ([-\d.]+)\], \[([-\d.]+), ([-\d.]+)\], \[([-\d.]+), ([-\d.]+)\]/g)].every(m => { const [cx, cy, ax, ay, bx, by] = m.slice(1).map(Number); return Math.abs(Math.hypot(ax - cx, ay - cy) - Math.hypot(bx - cx, by - cy)) < 1e-6; });
  for (const [r, q] of [[5, [20, 0]], [7.3, [20, 0]], [33.3, [20, 0]]]) assert.ok(onCircle(apply(doc, roundEdits(doc, 'sk', L, [0, 1], G, q, r).edits)), `round ${r}`);
  for (const d of [1, 5, 9.9, 14.142]) assert.ok(onCircle(apply(doc, chamferEdits(doc, 'sk', L, [0, 1], G, [20, 0], d).edits)), `chamfer ${d}`);
  const sl = "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([0, 0], [5, 7]);\n";
  for (const r of [0.5, 1, 2.7]) assert.ok(onCircle(apply(sl, roundEdits(sl, 'sk', sketchStatementLines(sl, 'sk'), [0, 1], [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [0, 0], b: [5, 7] }], [0, 0], r).edits)), `a slanted corner of two lines, round ${r}`);
  // an arc written with a name: not changed
  const vd = "const r = 10;\nconst sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.arc([20 + r, 0], [20, 0], [30, 10], 'cw');\n";
  assert.match(roundEdits(vd, 'sk', sketchStatementLines(vd, 'sk'), [0, 1], G, [20, 0], 5), /written with a variable/);
}
console.log('PASS round and chamfer where a line meets an arc, or two arcs meet');
{ // Trim: the piece of a curve between the two crossings nearest the pointer, cut away
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const run = (doc, G, owner, i, p) => { const e = trimEdits(doc, 'sk', sketchStatementLines(doc, 'sk'), owner, G, i, p); return typeof e === 'string' ? e : apply(doc, e.edits); };
  // a line crossed once: the side the pointer is on goes
  let doc = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([10, -5], [10, 5]);\n";
  let G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [10, -5], b: [10, 5] }];
  assert.deepEqual(crossings(G[0], G[1]), [[10, 0]]);
  assert.equal(run(doc, G, [0, 1], 0, [15, 0.3]), "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([10, -5], [10, 5]);\n", 'the right of the crossing goes');
  assert.equal(run(doc, G, [0, 1], 0, [4, 0]), "const sk = sketch('top');\nsk.line([10, 0], [20, 0]);\nsk.line([10, -5], [10, 5]);\n", 'the left');
  // crossed twice: the middle goes, the two ends stay
  doc = "const sk = sketch('top');\nsk.line([0, 0], [30, 0]);\nsk.line([10, -5], [10, 5]);\nsk.line([20, -5], [20, 5]);\n";
  G = [{ k: 'line', a: [0, 0], b: [30, 0] }, { k: 'line', a: [10, -5], b: [10, 5] }, { k: 'line', a: [20, -5], b: [20, 5] }];
  assert.equal(run(doc, G, [0, 1, 2], 0, [15, 0]), "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([20, 0], [30, 0]);\nsk.line([10, -5], [10, 5]);\nsk.line([20, -5], [20, 5]);\n");
  // a rectangle's side: the rectangle is written out as its lines
  doc = "const sk = sketch('top');\nsk.rectangle([0, 0], [20, 10]);\nsk.line([10, -5], [10, 5]);\n";
  G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, 10] }, { k: 'line', a: [20, 10], b: [0, 10] }, { k: 'line', a: [0, 10], b: [0, 0] }, { k: 'line', a: [10, -5], b: [10, 5] }];
  assert.equal(run(doc, G, [0, 0, 0, 0, 1], 0, [15, 0]), "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([20, 0], [20, 10]);\nsk.line([20, 10], [0, 10]);\nsk.line([0, 10], [0, 0]);\nsk.line([10, -5], [10, 5]);\n");
  // where another line ends on it: that end is a crossing too, and the line ends on it by value
  G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [10, 0], b: [10, 10] }];
  assert.deepEqual(trimGeom(G, 0, [15, 0]).keep, [{ k: 'line', a: [0, 0], b: [10, 0] }]);
  // a circle crossed by a line: the arc the pointer is on goes, the other half is left as an arc
  doc = "const sk = sketch('top');\nsk.circle([0, 0], { r: 5 });\nsk.line([-10, 0], [10, 0]);\n";
  G = [{ k: 'circle', c: [0, 0], r: 5 }, { k: 'line', a: [-10, 0], b: [10, 0] }];
  assert.equal(run(doc, G, [0, 1], 0, [0, 5]), "const sk = sketch('top');\nsk.arc([0, 0], [-5, 0], [5, 0], 'ccw');\nsk.line([-10, 0], [10, 0]);\n", 'the top half goes');
  assert.equal(run(doc, G, [0, 1], 0, [0.2, -4.9]), "const sk = sketch('top');\nsk.arc([0, 0], [5, 0], [-5, 0], 'ccw');\nsk.line([-10, 0], [10, 0]);\n", 'the bottom half');
  // the line through it, between the circle's two crossings
  assert.equal(run(doc, G, [0, 1], 1, [1, 0]), "const sk = sketch('top');\nsk.circle([0, 0], { r: 5 });\nsk.line([-10, 0], [-5, 0]);\nsk.line([5, 0], [10, 0]);\n");
  // an arc crossed by a slanted line: what is left keeps its sense, its ends on its circle to 1e-6
  doc = "const sk = sketch('top');\nsk.arc([0, 0], [10, 0], [0, 10], 'ccw');\nsk.line([0, 0], [10, 10]);\n";
  G = [{ k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [0, 10], sense: 'ccw' }, { k: 'line', a: [0, 0], b: [10, 10] }];
  assert.equal(run(doc, G, [0, 1], 0, [9.5, 3]), "const sk = sketch('top');\nsk.arc([0, 0], [7.071067812, 7.071067812], [0, 10], 'ccw');\nsk.line([0, 0], [10, 10]);\n");
  assert.equal(run(doc, G, [0, 1], 1, [8, 8]), "const sk = sketch('top');\nsk.arc([0, 0], [10, 0], [0, 10], 'ccw');\nsk.line([0, 0], [7.071067812, 7.071067812]);\n", 'the line beyond the arc goes');
  // a crossing on another curve's end written to 1e-9: that end exactly, so the two meet by value
  G = [{ k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [0, 10], sense: 'ccw' }, { k: 'line', a: [0, 0], b: [7.071067812, 7.071067812] }];
  assert.deepEqual(trimGeom(G, 0, [9.5, 3]).keep[0].a, [7.071067812, 7.071067812]);
  // nothing crosses it: the whole curve goes; lying along another line is no crossing
  doc = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([5, 0], [30, 0]);\nsk.circle([50, 0], { r: 5 });\n";
  G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [5, 0], b: [30, 0] }, { k: 'circle', c: [50, 0], r: 5 }];
  assert.ok(trimGeom(G, 0, [10, 0]).whole, 'along another line');
  assert.equal(run(doc, G, [0, 1, 2], 2, [55, 0]), "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([5, 0], [30, 0]);\n");
  // written with a variable
  doc = "const w = 20;\nconst sk = sketch('top');\nsk.line([0, 0], [w, 0]);\nsk.line([10, -5], [10, 5]);\n";
  assert.equal(run(doc, [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [10, -5], b: [10, 5] }], [0, 1], 0, [15, 0]), 'That line is written with a variable or a sum; change it in the code.');
  assert.equal(run("const sk = sketch('top');\nsk.circle([0, 0], { r: 5 });\nsk.line([-10, 0], [10, 0]);\n", [{ k: 'circle', c: [0, 0], r: 5 }, { k: 'line', a: [-10, 0], b: [10, 0] }, { k: 'point', p: [0, 0] }], [0, 1, 1], 2, [0, 0]), 'Only a line, an arc or a circle can be trimmed.');
}
console.log('PASS trim: the piece between two crossings cut away, lines, arcs and circles');
{ // Extend: a line or an arc grown from the end nearer the pointer to the first curve in its way
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const L = { k: 'line', a: [0, 0], b: [10, 0] };
  const walls = [L, { k: 'line', a: [30, -5], b: [30, 5] }, { k: 'line', a: [20, -5], b: [20, 5] }, { k: 'line', a: [15, 1], b: [15, 5] }];
  let e = extendGeom(walls, 0, [9, 0.2]);
  assert.deepEqual([e.grown, e.piece, e.to, e.kind], [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [10, 0], b: [20, 0] }, [20, 0], 'line'], 'to the nearer of two walls; one that does not reach the line is passed by');
  assert.equal(extendGeom(walls, 0, [1, 0]), 'Nothing lies ahead of this end of the line.', 'the other end: nothing behind it');
  e = extendGeom([...walls, { k: 'line', a: [-5, -5], b: [-5, 5] }], 0, [1, 0]); assert.deepEqual(e.grown, { k: 'line', a: [-5, 0], b: [10, 0] }, 'and with a wall behind it');
  e = extendGeom([L, { k: 'circle', c: [40, 0], r: 5 }], 0, [9, 0]); assert.deepEqual(e.to, [35, 0], 'to a circle: where it first meets it');
  e = extendGeom([L, { k: 'line', a: [10, 0], b: [10, 5] }, { k: 'line', a: [20, -5], b: [20, 5] }], 0, [9, 0]); assert.deepEqual(e.to, [20, 0], 'an end joined to another line is extended past the joint');
  const arc = { k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [0, 10], sense: 'ccw' }; const wall = { k: 'line', a: [-6, -20], b: [-6, 20] };
  e = extendGeom([arc, wall], 0, [1, 9.9]);
  assert.deepEqual([e.grown, e.to, e.kind], [{ k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [-6, 8], sense: 'ccw' }, [-6, 8], 'arc'], 'an arc on round its circle, its own way');
  assert.deepEqual(e.piece, { k: 'arc', c: [0, 0], r: 10, a: [0, 10], b: [-6, 8], sense: 'ccw' });
  e = extendGeom([arc, wall], 0, [9.9, 1]);
  assert.deepEqual([e.grown, e.piece.sense], [{ k: 'arc', c: [0, 0], r: 10, a: [-6, -8], b: [0, 10], sense: 'ccw' }, 'cw'], 'from its start: back round the circle the other way');
  e = extendGeom([arc, { k: 'line', a: [20, -1], b: [20, 1] }], 0, [1, 9.9]); assert.equal(e, 'Nothing lies ahead of this end of the arc.');
  assert.equal(extendGeom([{ k: 'circle', c: [0, 0], r: 3 }, wall], 0, [3, 0]), 'Only a line or an arc can be extended.');
  const doc = "const w = 10;\nconst sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([20, -5], [20, 5]);\nsk.line([0, 3], [w, 3]);\n";
  const G = [L, { k: 'line', a: [20, -5], b: [20, 5] }, { k: 'line', a: [0, 3], b: [10, 3] }]; const SL = sketchStatementLines(doc, 'sk');
  const r = extendEdits(doc, 'sk', SL, [0, 1, 2], G, 0, [9, 0]);
  assert.match(apply(doc, r.edits), /sk\.line\(\[0, 0\], \[20, 0\]\);\nsk\.line\(\[20, -5\], \[20, 5\]\);/, 'the code: the line written again to its new end'); assert.equal(r.code, 'sk.line([0, 0], [20, 0]);');
  assert.equal(extendEdits(doc, 'sk', SL, [0, 1, 2], G, 2, [9, 3]), 'That line is written with a variable or a sum; change it in the code.');
}
console.log('PASS extend: a line or an arc grown to the first curve in its way');
{ // Tangent arc: from a free end, leaving it without a corner
  const L = { k: 'line', a: [0, 0], b: [10, 0] };
  assert.deepEqual(tangentAt([L], [10, 0]), { t: [1, 0], i: 0 }, 'a line runs straight on past its end');
  assert.deepEqual(tangentAt([L], [0, 0]), { t: [-1, 0], i: 0 }, 'and the other way past its start');
  assert.equal(tangentAt([L, { k: 'line', a: [10, 0], b: [10, 5] }], [10, 0]), 'Two curves end there: click the free end of a line or arc.');
  assert.equal(tangentAt([L], [5, 0]), 'Click the end of a line or arc.');
  assert.deepEqual(tangentArc([10, 0], [1, 0], [10, 10]), { k: 'arc', c: [10, 5], r: 5, a: [10, 0], b: [10, 10], sense: 'ccw' }, 'a half circle up, to the left of the way on');
  assert.deepEqual(tangentArc([10, 0], [1, 0], [10, -10]), { k: 'arc', c: [10, -5], r: 5, a: [10, 0], b: [10, -10], sense: 'cw' }, 'and down, clockwise');
  assert.deepEqual(tangentArc([10, 0], [1, 0], [15, 5]), { k: 'arc', c: [10, 5], r: 5, a: [10, 0], b: [15, 5], sense: 'ccw' }, 'a quarter');
  assert.equal(tangentArc([10, 0], [1, 0], [20, 0]), null, 'straight on: no arc'); assert.equal(tangentArc([10, 0], [1, 0], [0, 0]), null, 'straight back: none');
  assert.equal(tangentArc([10, 0], [1, 0], [10, 0]), null, 'the end itself: none');
  const arc = { k: 'arc', c: [0, 0], r: 10, a: [10, 0], b: [0, 10], sense: 'ccw' };
  const ta = tangentAt([arc], [0, 10]); assert.deepEqual(ta.t.map(v => +v.toFixed(12) + 0), [-1, 0], 'an arc runs on along its tangent at its end');
  assert.deepEqual(tangentAt([arc], [10, 0]).t.map(v => +v.toFixed(12) + 0), [0, -1], 'and back along it at its start');
  const s = tangentArc([0, 10], ta.t, [-10, 20]); assert.deepEqual(s, { k: 'arc', c: [0, 20], r: 10, a: [0, 10], b: [-10, 20], sense: 'cw' }, 'an S: the next arc turns the other way');
  const g = tangentArc([10, 0], [1, 0], [13, 2]); // centre [10, 3.25], not on the grid: written to 1e-9, its two ends equally far from it
  assert.equal(curveCode('sk', g), "sk.arc([10, 3.25], [10, 0], [13, 2], 'ccw');");
  const g2 = tangentArc([0, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 7]);
  assert.ok(Math.abs(Math.hypot(g2.c[0], g2.c[1]) - Math.hypot(g2.c[0], g2.c[1] - 7)) < 2e-9, `a slanted start: both ends on the written circle, ${g2.c}`);
}
console.log('PASS tangent arc: from a free end without a corner');
{ // Mirror: a curve's mirror image about a line of the sketch
  const ax = { k: 'line', a: [30, 0], b: [30, 20] }; const about = [ax.a, ax.b];
  const G = [ax, { k: 'line', a: [10, 5], b: [20, 15] }, { k: 'arc', c: [20, 10], r: 5, a: [25, 10], b: [20, 15], sense: 'ccw' }, { k: 'circle', c: [20, 10], r: 3 },
    { k: 'line', a: [20, 5], b: [30, 5] }, { k: 'circle', c: [30, 10], r: 2 }, { k: 'line', a: [25, 18], b: [35, 18] }, { k: 'arc', c: [0, 0], r: 1, a: [1, 0], b: [0, 1], sense: 'ccw' }];
  assert.deepEqual(mirrorGeom(G, about, 1), { copy: { k: 'line', a: [50, 5], b: [40, 15] }, kind: 'line' }, 'a line: both ends');
  assert.deepEqual(mirrorGeom(G, about, 2), { copy: { k: 'arc', c: [40, 10], r: 5, a: [35, 10], b: [40, 15], sense: 'cw' }, kind: 'arc' }, 'an arc turns the other way');
  assert.deepEqual(mirrorGeom(G, about, 3).copy, { k: 'circle', c: [40, 10], r: 3 }, 'a circle');
  assert.deepEqual(mirrorGeom(G, about, 4).copy, { k: 'line', a: [40, 5], b: [30, 5] }, 'an end on the mirror line stays where it is, so the two meet');
  assert.equal(mirrorGeom(G, about, 5), 'This circle is its own mirror image.'); assert.equal(mirrorGeom(G, about, 6), 'This line is its own mirror image.');
  assert.equal(mirrorGeom(G, about, 0), 'This line is its own mirror image.', 'the mirror line itself');
  assert.equal(mirrorGeom([...G, { k: 'line', a: [40, 15], b: [50, 5] }], about, 1), 'Its mirror image is drawn already.', 'drawn already, either way round');
  assert.equal(mirrorGeom([...G, { k: 'arc', c: [40, 10], r: 5, a: [40, 15], b: [35, 10], sense: 'ccw' }], about, 2), 'Its mirror image is drawn already.', 'an arc drawn already the other way round');
  assert.deepEqual(mirrorGeom(G, [[0, 0], [10, 10]], 1).copy, { k: 'line', a: [5, 10], b: [15, 20] }, 'about a slanted line');
  assert.deepEqual(mirrorGeom(G, [[0, 0], [1, 2]], 7).copy, { k: 'arc', c: [0, 0], r: 1, a: [-0.6, 0.8], b: [0.8, 0.6], sense: 'cw' }, 'written to 1e-9');
  const near = [ax, { k: 'line', a: [20, 5], b: [29.99999999, 5] }, { k: 'line', a: [30.00000001, 5], b: [40, 0] }];
  assert.deepEqual(mirrorGeom(near, about, 1).copy, { k: 'line', a: [40, 5], b: [30.00000001, 5] }, 'a point within 1e-7 of an end is put on it');
}
console.log('PASS mirror: a curve\'s mirror image about a line');
{ // Offset: a curve, or the chain joined to it, a distance to one side, the corners sharp
  const rect = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, 10] }, { k: 'line', a: [20, 10], b: [0, 10] }, { k: 'line', a: [0, 10], b: [0, 0] }];
  assert.deepEqual(offsetGeoms(rect, 0, [10, 2], 2), { pieces: [{ k: 'line', a: [2, 2], b: [18, 2] }, { k: 'line', a: [18, 2], b: [18, 8] }, { k: 'line', a: [18, 8], b: [2, 8] }, { k: 'line', a: [2, 8], b: [2, 2] }], kind: 'outline' }, 'a rectangle inwards');
  assert.deepEqual(offsetGeoms(rect, 2, [10, 12], 1).pieces.map(q => [q.a, q.b]), [[[21, 11], [-1, 11]], [[-1, 11], [-1, -1]], [[-1, -1], [21, -1]], [[21, -1], [21, 11]]], 'and outwards, from another side: the chain starts at the side clicked');
  assert.equal(offsetGeoms(rect, 0, [10, 2], 5), 'At 5 the offset runs into itself; give a smaller distance.', 'inwards by half its height: two sides would close up');
  assert.equal(offsetGeoms(rect, 0, [10, 2], 6), 'At 6 the offset runs into itself; give a smaller distance.');
  const L = [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [10, 10], b: [10, 0] }];
  assert.deepEqual(offsetGeoms(L, 0, [5, 1], 1), { pieces: [{ k: 'line', a: [0, 1], b: [9, 1] }, { k: 'line', a: [9, 1], b: [9, 10] }], kind: 'curves' }, 'an open chain, the second line drawn the other way round');
  assert.deepEqual(offsetGeoms([L[0]], 0, [3, -4], 2), { pieces: [{ k: 'line', a: [0, -2], b: [10, -2] }], kind: 'line' }, 'one line, to the pointer\'s side');
  const C = [{ k: 'circle', c: [0, 0], r: 5 }];
  assert.deepEqual(offsetGeoms(C, 0, [1, 0], 2).pieces, [{ k: 'circle', c: [0, 0], r: 3 }]); assert.deepEqual(offsetGeoms(C, 0, [9, 0], 2).pieces, [{ k: 'circle', c: [0, 0], r: 7 }], 'a circle inside and out');
  assert.equal(offsetGeoms(C, 0, [1, 0], 5), 'At 5 the offset runs into itself; give a smaller distance.');
  const slot = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'arc', c: [20, 5], r: 5, a: [20, 0], b: [20, 10], sense: 'ccw' }, { k: 'line', a: [20, 10], b: [0, 10] }, { k: 'arc', c: [0, 5], r: 5, a: [0, 10], b: [0, 0], sense: 'ccw' }];
  assert.deepEqual(offsetGeoms(slot, 0, [10, -1], 1).pieces, [{ k: 'line', a: [0, -1], b: [20, -1] }, { k: 'arc', c: [20, 5], r: 6, a: [20, -1], b: [20, 11], sense: 'ccw' },
    { k: 'line', a: [20, 11], b: [0, 11] }, { k: 'arc', c: [0, 5], r: 6, a: [0, 11], b: [0, -1], sense: 'ccw' }], 'a slot outwards: its smooth joints stay smooth');
  assert.equal(offsetGeoms(slot, 0, [10, 1], 4).pieces[1].r, 1, 'inwards'); assert.equal(offsetGeoms(slot, 0, [10, 1], 5), 'At 5 the offset runs into itself; give a smaller distance.', 'to the arcs\' centres');
  const D = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'arc', c: [10, 0], r: 10, a: [20, 0], b: [0, 0], sense: 'ccw' }];
  const dOut = offsetGeoms(D, 0, [10, -1], 1); const x = 10 + Math.sqrt(120);
  assert.deepEqual(dOut.pieces, [{ k: 'line', a: [+(20 - x).toFixed(9), -1], b: [+x.toFixed(9), -1] }, { k: 'arc', c: [10, 0], r: 11, a: [+x.toFixed(9), -1], b: [+(20 - x).toFixed(9), -1], sense: 'ccw' }],
    'a half circle on a line, outwards: the line and the arc meet sharp where they cross, to 1e-9 (two curves meeting at both ends)');
  const br = offsetChain([...rect, { k: 'line', a: [20, 0], b: [30, 0] }], 0);
  assert.deepEqual([br.pieces.length, br.closed, br.pieces[0].a, br.pieces[3].b], [4, false, [20, 0], [20, 0]], 'a joint of three stops the chain there: it runs round the other way and stays open');
  assert.equal(offsetDistance(rect[0], [5, -3]), 3); assert.equal(offsetDistance(C[0], [1, 0]), 4);
}
console.log('PASS offset: a curve or its chain to one side, the corners sharp');
{ // Snaps and guides
  const G = [{ k: 'line', a: [0, 0], b: [28, 0] }, { k: 'line', a: [10, -5], b: [10, 5] }, { k: 'line', a: [20, 0], b: [20, 10] }, { k: 'circle', c: [30, 0], r: 5 }];
  assert.deepEqual(sketchCrossings(G), [[10, 0], [25, 0]], 'where two curves cross (an end on another curve is an end, snapped already)');
  assert.deepEqual(sketchCrossings([{ k: 'line', a: [0, 0], b: [10, 10] }, { k: 'line', a: [0, 10], b: [10, 0] }, { k: 'line', a: [0, 5], b: [10, 5] }]), [[5, 5]], 'three through one point: once');
  const A = [[10, 5], [30, 20]];
  assert.deepEqual(alignPoint([17.3, 5.4], A, 1, 5), { q: [15, 5], level: [10, 5], upright: null }, 'level with a point: its y, the x on the grid');
  assert.deepEqual(alignPoint([29.6, 12.1], A, 1, 5), { q: [30, 10], level: null, upright: [30, 20] }, 'upright from a point: its x');
  assert.deepEqual(alignPoint([30.4, 5.2], A, 1, 5), { q: [30, 5], level: [10, 5], upright: [30, 20] }, 'both at once: where the two guides cross');
  assert.deepEqual(alignPoint([22, 13], A, 1, 5), { q: [20, 15], level: null, upright: null }, 'lined up with none: on the grid');
  assert.deepEqual(alignPoint([17, 5.3], [[10, 5], [12, 5.2], [16, 5]], 1, 5).level, [12, 5.2], 'the nearest across');
  assert.deepEqual(alignPoint([17, 5.3], [[10, 5], [16, 5]], 1, 5).level, [16, 5], 'on a tie, the nearer along');
  assert.deepEqual(alignPoint([45, 10.1], [[37.27, 9.546]], 1.4, 5), { q: [45, 10], level: null, upright: null }, 'nearer a grid line than a point across: the grid wins, no guide');
  assert.deepEqual(alignPoint([45, 9.6], [[37.27, 9.546]], 1.4, 5), { q: [45, 9.546], level: [37.27, 9.546], upright: null }, 'nearer the point: level with it');
}
{ // a point lined up with an arc's end has more than three decimals: the tools write it to 1e-9, so an arc's centre and ends agree
  assert.equal(toolCode.line('sk', [45, 9.546387625], [55, 30]), 'sk.line([45, 9.546387625], [55, 30]);');
  assert.match(toolCode.slot('sk', [45, 9.546387625], [55, 30], 3), /sk\.arc\(\[45, 9\.546387625\], /, 'a slot\'s cap centred on it');
  assert.equal(toolCode.circle('sk', [1 / 3, 2], 4), 'sk.circle([0.333333333, 2], { r: 4 });');
  assert.equal(toolCode.line('sk', [10, 5], [30, 5]), 'sk.line([10, 5], [30, 5]);', 'a point on the grid is written as before');
}
console.log('PASS snaps and guides: crossings, and points lined up with the sketch\'s points');
{ // Polygon and Centre rectangle
  assert.deepEqual(polygonPoints([0, 0], [10, 0], 4), [[10, 0], [0, 10], [-10, 0], [0, -10]], 'a square on its corner');
  const hex = polygonPoints([20, 20], [30, 20], 6);
  assert.deepEqual(hex, [[30, 20], [25, 28.660254038], [15, 28.660254038], [10, 20], [15, 11.339745962], [25, 11.339745962]], 'a hexagon, to 1e-9');
  assert.equal(toolCode.polygon('sk', [0, 0], [10, 0], 4), 'sk.lines([[10, 0], [0, 10], [-10, 0], [0, -10], [10, 0]]);', 'written closed');
  assert.equal(toolCode.centreRectangle('sk', [20, 15], [30, 20]), 'sk.rectangle([10, 10], [30, 20]);', 'a rectangle about its centre');
  assert.equal(toolCode.centreRectangle('sk', [20, 15], [10, 10]), 'sk.rectangle([10, 10], [30, 20]);', 'from the other corner, the same');
  assert.deepEqual(typedPoint('crect', [[20, 15]], [25, 12], '10, 6'), [25, 12], 'typed width and height about the centre, towards the pointer');
  assert.deepEqual(typedPoint('polygon', [[0, 0]], [0, 3], '8'), [0, 8], 'a typed radius to a corner, towards the pointer');
  assert.equal(typedWords('polygon', [[0, 0]], '8'), 'radius 8'); assert.equal(typedWords('crect', [[0, 0]], '10, 6'), 'width 10, height 6');
}
console.log('PASS polygon and centre rectangle');
{ // Pattern: copies in a row or round a centre
  const C = [{ k: 'circle', c: [10, 5], r: 2 }];
  assert.deepEqual(patternGeoms(C, 0, { row: [12, 0] }, 4), { copies: [{ k: 'circle', c: [22, 5], r: 2 }, { k: 'circle', c: [34, 5], r: 2 }, { k: 'circle', c: [46, 5], r: 2 }], kind: 'circle' }, 'a row of holes');
  const ring = patternGeoms([{ k: 'circle', c: [30, 10], r: 1.5 }], 0, { centre: [30, 20] }, 4).copies.map(g => g.c);
  assert.deepEqual(ring, [[40, 20], [30, 30], [20, 20]], 'round a centre, a quarter turn each');
  assert.deepEqual(patternGeoms([{ k: 'circle', c: [30, 10], r: 1.5 }], 0, { centre: [30, 20] }, 6).copies[0].c, [38.660254038, 15], 'a sixth of a turn, to 1e-9');
  const sq = [{ k: 'line', a: [0, 0], b: [5, 0] }, { k: 'line', a: [5, 0], b: [5, 5] }, { k: 'line', a: [5, 5], b: [0, 5] }, { k: 'line', a: [0, 5], b: [0, 0] }];
  assert.deepEqual(patternSource(sq, 2).ref, [5, 5], 'an outline stands for itself by the first point of its chain from the side clicked');
  const row = patternGeoms(sq, 0, { row: [5, 0] }, 2);
  assert.deepEqual(row, { copies: [{ k: 'line', a: [5, 0], b: [10, 0] }, { k: 'line', a: [10, 0], b: [10, 5] }, { k: 'line', a: [10, 5], b: [5, 5] }], kind: 'outline' },
    'squares side by side: the shared side is drawn already, so it is left out');
  const arc = [{ k: 'arc', c: [0, 0], r: 3, a: [3, 0], b: [0, 3], sense: 'ccw' }];
  assert.deepEqual(patternSource(arc, 0).ref, [0, 0], 'one arc stands for itself by its centre');
  assert.deepEqual(patternGeoms(arc, 0, { centre: [0, 0] }, 4).copies[0], { k: 'arc', c: [0, 0], r: 3, a: [0, 3], b: [-3, 0], sense: 'ccw' }, 'an arc turned round its own centre');
  assert.equal(patternGeoms(C, 0, { row: [0, 0] }, 3), 'Click where the first copy goes, away from where it is now.');
  assert.equal(patternGeoms(C, 0, { row: [5, 0] }, 1), 'Give a count from 2 to 50.'); assert.equal(patternGeoms(C, 0, { row: [5, 0] }, 2.5), 'Give a count from 2 to 50.');
  assert.equal(patternGeoms([{ k: 'circle', c: [0, 0], r: 2 }], 0, { centre: [0, 0] }, 3), 'Every copy is drawn already.', 'a circle round its own centre');
}
console.log('PASS pattern: copies in a row or round a centre');
{ // Select, move and copy
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const doc = "const w = 3;\nconst sk = sketch('top');\nsk.rectangle([0, 0], [10, 5]);\nsk.circle([20, 5], { r: 2 });\nsk.lines([[30, 0], [40, 0], [40, 5]]);\nsk.arc([0, 20], [5, 20], [0, 25], 'ccw');\nsk.circle([50, 5], { r: w });\n";
  const L = sketchStatementLines(doc, 'sk');
  const G = [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [10, 0], b: [10, 5] }, { k: 'line', a: [10, 5], b: [0, 5] }, { k: 'line', a: [0, 5], b: [0, 0] },
    { k: 'circle', c: [20, 5], r: 2 }, { k: 'line', a: [30, 0], b: [40, 0] }, { k: 'line', a: [40, 0], b: [40, 5] }, { k: 'arc', c: [0, 20], r: 5, a: [5, 20], b: [0, 25], sense: 'ccw' }, { k: 'circle', c: [50, 5], r: 3 }];
  const O = [0, 0, 0, 0, 1, 2, 2, 3, 4];
  let r = moveEdits(doc, 'sk', L, O, G, [0, 1, 2, 3, 4], [5, 10], false);
  assert.match(apply(doc, r.edits), /sk\.rectangle\(\[5, 10\], \[15, 15\]\);\nsk\.circle\(\[25, 15\], \{ r: 2 \}\);\n/, 'a whole rectangle stays a rectangle, a circle keeps its radius');
  r = moveEdits(doc, 'sk', L, O, G, [7], [0.5, 1 / 3], false);
  assert.match(apply(doc, r.edits), /sk\.arc\(\[0\.5, 20\.333333333\], \[5\.5, 20\.333333333\], \[0\.5, 25\.333333333\], 'ccw'\);/, 'an arc: all three points, to 1e-9');
  r = moveEdits(doc, 'sk', L, O, G, [6], [5, 0], false);
  assert.match(apply(doc, r.edits), /sk\.line\(\[30, 0\], \[40, 0\]\);\nsk\.line\(\[45, 0\], \[45, 5\]\);/, 'part of a polyline: written out as its lines first');
  r = moveEdits(doc, 'sk', L, O, G, [0, 1, 2, 3, 4], [5, 10], true);
  assert.deepEqual([r.edits, r.added], [[], ['sk.rectangle([5, 10], [15, 15]);', 'sk.circle([25, 15], { r: 2 });']], 'a copy: the whole lines shifted, written after');
  r = moveEdits(doc, 'sk', L, O, G, [6], [5, 0], true); assert.deepEqual(r.added, ['sk.line([45, 0], [45, 5]);'], 'a copy of part: the curve alone');
  assert.equal(moveEdits(doc, 'sk', L, O, G, [8], [5, 0], false), 'That curve is written with a variable or a sum; change it in the code.');
  assert.equal(moveEdits(doc, 'sk', L, O, G, [], [5, 0], false), 'Choose a curve first.');
  assert.equal(moveEdits(doc, 'sk', L, O, G, [4], [0, 0], false), 'Click where they go, away from where they are.');
}
console.log('PASS select, move and copy');
{ // Revolve: the sketch turned about one of its own axes, as reSHape's spin
  const rect = (x0, y0, x1, y1) => [{ k: 'line', a: [x0, y0], b: [x1, y0] }, { k: 'line', a: [x1, y0], b: [x1, y1] }, { k: 'line', a: [x1, y1], b: [x0, y1] }, { k: 'line', a: [x0, y1], b: [x0, y0] }];
  const front = planeFrameOf({ plane: 'xz' }), top = planeFrameOf({ plane: 'xy' });
  assert.deepEqual(revolveSketch(rect(0, 0, 10, 20), front, 'y', 360, 'sk2', 'part2'), ["const sk2 = sketch('top');", 'sk2.polygon([[0, 0], [10, 0], [10, 20], [0, 20]]);', 'const part2 = spin(sk2, 360);'],
    'front, about its y axis (Z): a cylinder, the profile as spin reads it from the top plane');
  assert.deepEqual(revolveSketch(rect(-10, 0, 0, 20), front, 'y', 360, 's', 'p')[1], 's.polygon([[10, 0], [0, 0], [0, 20], [10, 20]]);', 'on the other side of the axis, a whole turn: the same');
  assert.equal(revolveSketch(rect(-10, 0, 0, 20), front, 'y', 90, 's', 'p'), 'For part of a turn, draw the profile on the positive side of the axis.');
  assert.equal(revolveSketch(rect(-5, 0, 5, 20), front, 'y', 360, 's', 'p'), 'The profile crosses the axis it turns about.');
  assert.deepEqual(revolveSketch(rect(0, 2, 10, 5), top, 'x', 90, 's', 'p'), ["const s = sketch('side');", 's.polygon([[2, 0], [2, 10], [5, 10], [5, 0]]);', 'const p = spin(s, 90);'], 'top, about its x axis (X), part way: spin from the side plane');
  assert.equal(revolveSketch(rect(0, 2, 10, 5), front, 'x', 90, 's', 'p'), 'From this plane only a whole turn can be written: give 360.');
  assert.deepEqual(revolveSketch(rect(0, 2, 10, 5), front, 'x', 360, 's', 'p')[1], 's.polygon([[2, 0], [2, 10], [5, 10], [5, 0]]);', 'front, about X, a whole turn: laid out by distance from the axis');
  assert.equal(revolveSketch(rect(0, 0, 10, 20), planeFrameOf({ plane: 'xz', offset: 5 }), 'y', 360, 's', 'p'), 'It turns only about X, Y or Z through the origin: draw it on a plane through the origin.');
  assert.deepEqual(revolveSketch([{ k: 'circle', c: [20, 10], r: 5 }], front, 'y', 360, 's', 'p')[1], 's.circle(10, { at: [20, 10] });', 'a circle: a ring');
  assert.equal(revolveSketch(rect(0, 0, 10, 20).slice(0, 3), front, 'y', 360, 's', 'p'), 'Revolve takes one closed outline of straight lines, or one circle.');
  assert.equal(revolveSketch(rect(0, 0, 10, 20), front, 'y', 0, 's', 'p'), 'Give an angle from 1 to 360 degrees.');
}
console.log('PASS revolve: a sketch turned about its own axis, as spin');
{ // Chamfer: a corner of two lines cut by a straight line, the same distance along each
  const apply = (doc, es) => { let d = doc; for (const e of [...es].sort((a, b) => b.from - a.from)) d = d.slice(0, e.from) + e.insert + d.slice(e.to); return d; };
  const doc = "const sk = sketch('top');\nsk.line([0, 0], [20, 0]);\nsk.line([20, 0], [20, 10]);\n";
  const G = [{ k: 'line', a: [0, 0], b: [20, 0] }, { k: 'line', a: [20, 0], b: [20, 10] }]; const L = sketchStatementLines(doc, 'sk');
  assert.deepEqual(chamferGeom(G, [20, 0], 4).cut, { k: 'line', a: [16, 0], b: [20, 4] });
  let e = chamferEdits(doc, 'sk', L, [0, 1], G, [20, 0], 4);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [16, 0]);\nsk.line([20, 4], [20, 10]);\nsk.line([16, 0], [20, 4]);\n", 'both lines shortened, the cut after them');
  e = chamferEdits(doc, 'sk', L, [0, 1], G, [20, 0], 10);
  assert.equal(apply(doc, e.edits), "const sk = sketch('top');\nsk.line([0, 0], [10, 0]);\nsk.line([10, 0], [20, 10]);\n", 'a chamfer that uses up a line: the line goes');
  assert.match(chamferEdits(doc, 'sk', L, [0, 1], G, [20, 0], 11), /A distance of 11 does not fit along these lines; the largest is 10\./);
  assert.match(chamferGeom(G, [0, 0], 1), /can be chamfered\./, 'its own words for a corner it cannot cut');
  assert.match(chamferGeom(G, [20, 0], 0), /above 0/);
  const S = [{ k: 'line', a: [0, 0], b: [10, 0] }, { k: 'line', a: [0, 0], b: [6, 8] }];
  assert.deepEqual(chamferGeom(S, [0, 0], 5).ends, [[5, 0], [3, 4]], 'along each line, whatever the angle');
  const rd = "const sk = sketch('top');\nsk.rectangle([0, 0], [60, 40]);\n";
  const RG = [{ k: 'line', a: [0, 0], b: [60, 0] }, { k: 'line', a: [60, 0], b: [60, 40] }, { k: 'line', a: [60, 40], b: [0, 40] }, { k: 'line', a: [0, 40], b: [0, 0] }];
  e = chamferEdits(rd, 'sk', sketchStatementLines(rd, 'sk'), [0, 0, 0, 0], RG, [0, 0], 5);
  assert.equal(apply(rd, e.edits), "const sk = sketch('top');\nsk.line([5, 0], [60, 0]);\nsk.line([60, 0], [60, 40]);\nsk.line([60, 40], [0, 40]);\nsk.line([0, 40], [0, 5]);\nsk.line([5, 0], [0, 5]);\n", 'a rectangle written out as its lines, with the cut');
}
console.log('PASS chamfer: a corner of two lines cut straight, in the drawing words');
console.log('Sketch plane points: planes, the screen-to-plane map, the active sketch and the written point pass.');
