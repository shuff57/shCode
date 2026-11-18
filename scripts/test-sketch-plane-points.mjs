// Points on a sketch's plane (lib/sketch-plane-points.ts): reSHape's plane frames, the projective map from the screen to a plane,
// which sketch the editor cursor is in, and what a picked point writes into the code. The pointer in the real view is a browser check.
import assert from 'node:assert/strict';
import { activeSketch, applyProjective, fromPlane, geomPath, geomSnaps, gridStep, planeFrameOf, planeWords, pointCode, pointInsertion, projective, sketchAtCursor, sketchBlockEnd, toGrid, toolCode, toPlane, viewAngles } from '../lib/sketch-plane-points.ts';

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
console.log('Sketch plane points: planes, the screen-to-plane map, the active sketch and the written point pass.');
