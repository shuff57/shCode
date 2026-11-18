// Points on a sketch's plane (lib/sketch-plane-points.ts): reSHape's plane frames, the projective map from the screen to a plane,
// which sketch the editor cursor is in, and what a picked point writes into the code. The pointer in the real view is a browser check.
import assert from 'node:assert/strict';
import { arcCode, faceSketchArgs, finishDirections, freshName, movePointEdits, planeOutlines, sweepOf, activeSketch, applyProjective, fromPlane, geomPath, geomSnaps, gridStep, planeFrameOf, planeWords, pointCode, pointInsertion, projective, sketchAtCursor, sketchBlockEnd, toGrid, toolCode, toPlane, viewAngles } from '../lib/sketch-plane-points.ts';

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
console.log('Sketch plane points: planes, the screen-to-plane map, the active sketch and the written point pass.');
