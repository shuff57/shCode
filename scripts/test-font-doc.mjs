#!/usr/bin/env node
// lib/font-doc.ts: the Font maker's drawing -> merged letter outlines -> a real font.
//
// Pins: each tool's piece covers what it should (areas within a few percent),
// overlapping strokes merge into ONE outline, an outlined box or ellipse keeps
// its hole (outer counter-clockwise, hole clockwise), grid squares side by side
// become one rectangle, an arc goes through its middle point, and a whole
// drawing builds a font that opentype.js reads back with the right letters,
// widths and shapes. The saved drawing round-trips and refuses junk.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-font-doc.mjs

import opentype from 'opentype.js';
import * as fd from '../lib/font-doc.ts';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail)}` : ''}`); }
}
const area = (r) => { let a = 0; for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return a / 2; };
const covered = (polys) => polys.reduce((s, p) => s + p.reduce((t, r) => t + area(r), 0), 0);
const near = (a, b, pct) => Math.abs(a - b) <= Math.abs(b) * pct / 100;
const glyph = (...pieces) => ({ adv: 600, pieces });

// ---- one piece at a time ----
let o = fd.glyphOutline(glyph({ t: 'box', a: [100, 0], b: [500, 700], w: 0 }));
check('a filled box is one rectangle of its own area', o.length === 1 && o[0].length === 1 && covered(o) === 400 * 700, covered(o));

o = fd.glyphOutline(glyph({ t: 'box', a: [100, 100], b: [500, 600], w: 40 }));
check('an outlined box is a ring: outer counter-clockwise, hole clockwise',
  o.length === 1 && o[0].length === 2 && area(o[0][0]) > 0 && area(o[0][1]) < 0, o.map((p) => p.map(area)));
check('the ring covers outer minus hole', covered(o) === 440 * 540 - 360 * 460, covered(o));

o = fd.glyphOutline(glyph({ t: 'ellipse', a: [100, 0], b: [500, 400], w: 0 }));
check('a filled circle covers pi r^2 within 1%', o.length === 1 && near(covered(o), Math.PI * 200 * 200, 1), covered(o));
o = fd.glyphOutline(glyph({ t: 'ellipse', a: [100, 0], b: [500, 400], w: 60 }));
check('an outlined circle (an O) has a hole', o.length === 1 && o[0].length === 2 && area(o[0][1]) < 0);

o = fd.glyphOutline(glyph({ t: 'line', a: [100, 0], b: [100, 700], w: 80 }));
check('a line is a capsule: length x thickness plus round ends, within 1%', o.length === 1 && near(covered(o), 700 * 80 + Math.PI * 40 * 40, 1), covered(o));

o = fd.glyphOutline(glyph({ t: 'line', a: [100, 0], b: [100, 700], w: 80 }, { t: 'line', a: [100, 350], b: [500, 350], w: 80 }));
check('two crossing strokes merge into one outline', o.length === 1 && o[0].length === 1, o.length);

o = fd.glyphOutline(glyph({ t: 'pen', p: [[100, 100], [200, 300], [300, 100], [400, 300]], w: 50 }));
check('a pen stroke of several segments is one outline', o.length === 1 && o[0].length === 1);

o = fd.glyphOutline(glyph({ t: 'grid', s: 100, c: [[0, 0], [1, 0], [2, 0]] }));
check('three grid squares in a row become one rectangle with 4 corners', o.length === 1 && o[0][0].length === 5 && covered(o) === 30000, o[0]?.[0]);
o = fd.glyphOutline(glyph({ t: 'grid', s: 100, c: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]] }));
check('a square of grid squares round a gap keeps the gap as a hole', o.length === 1 && o[0].length === 2 && covered(o) === 80000);

const arc = fd.arcPoints([0, 0], [100, 100], [200, 0]);
check('an arc runs from its first point to its last', Math.hypot(arc[0][0], arc[0][1]) < 0.01 && Math.hypot(arc.at(-1)[0] - 200, arc.at(-1)[1]) < 0.01);
check('an arc bends through its middle point: every point on its circle, and it reaches the top', arc.every(([x, y]) => Math.abs(Math.hypot(x - 100, y) - 100) < 0.01) && Math.max(...arc.map(([, y]) => y)) > 98);
const arc2 = fd.arcPoints([0, 0], [100, -100], [200, 0]);
check('an arc bent the other way goes the other way round', arc2.every(([, y]) => y <= 0.01) && arc2.some(([, y]) => y < -90));
check('three points in a row are a straight line', fd.arcPoints([0, 0], [100, 0], [200, 0]).length === 2);
check('an empty letter has no outline', fd.glyphOutline(glyph()).length === 0);

// ---- a whole font ----
const doc = fd.emptyDoc();
doc.glyphs.A = { adv: 650, pieces: [
  { t: 'line', a: [80, 0], b: [325, 700], w: 80 }, { t: 'line', a: [325, 700], b: [570, 0], w: 80 },
  { t: 'line', a: [180, 250], b: [470, 250], w: 70 },
] };
doc.glyphs.o = { adv: 560, pieces: [{ t: 'ellipse', a: [60, 0], b: [500, 500], w: 70 }] };
doc.glyphs['1'] = { adv: 400, pieces: [{ t: 'grid', s: 100, c: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [0, 5]] }] };
const buf = fd.buildFont(doc, 'TestFont');
const font = opentype.parse(buf);
check('the font reads back with .notdef, space and the 3 drawn letters', font.glyphs.length === 5, font.glyphs.length);
check('its name is the one given', font.names.fontFamily?.en === 'TestFont', font.names.fontFamily);
const gA = font.charToGlyph('A');
check('A keeps its width', gA.advanceWidth === 650, gA.advanceWidth);
const bb = gA.getBoundingBox();
check('A sits on the baseline and reaches the cap height (plus half a stroke)', near(bb.y1, -40, 30) && bb.y2 > 700 && bb.y2 < 760, bb);
check('a letter not drawn is not in the font', font.charToGlyph('B').name === '.notdef');
const pO = font.charToGlyph('o').path.commands.filter((c) => c.type === 'M').length;
check('o has two contours: its outside and its hole', pO === 2, pO);
check('a small font: 3 letters in under 6 KB', buf.byteLength < 6 * 1024, buf.byteLength);
const uri = fd.fontDataUri(buf);
check('the data URI is a base64 OTF', uri.startsWith('data:font/otf;base64,T1RUTw'), uri.slice(0, 30));

// ---- the saved drawing ----
const json = fd.serializeDoc(doc);
const back = fd.parseDoc(json);
check('the drawing round-trips', back && JSON.stringify(back.glyphs.A) === JSON.stringify(doc.glyphs.A) && back.glyphs['1'].adv === 400);
check('it is small: 3 letters in under 1 KB', json.length < 1024, json.length);
check('a fraction is saved as a whole unit', JSON.parse(fd.serializeDoc({ v: 1, glyphs: { A: { adv: 600.4, pieces: [{ t: 'line', a: [1.6, 2], b: [3, 4], w: 50 }] } } })).glyphs.A.pieces[0].a[0] === 2);
check('junk is refused, not half-read', fd.parseDoc('not json') === null && fd.parseDoc('{"v":2,"glyphs":{}}') === null && fd.parseDoc(null) === null);
const mixed = fd.parseDoc(JSON.stringify({ v: 1, glyphs: { A: { adv: 600, pieces: [{ t: 'line', a: [0, 0], b: [1, 1], w: 50 }, { t: 'rocket' }, { t: 'pen', p: 'x', w: 5 }] }, '☃': { adv: 600, pieces: [] } } }));
check('unknown pieces and characters are dropped, good ones kept', mixed.glyphs.A.pieces.length === 1 && !mixed.glyphs['☃']);

// ---- size: a full alphabet stays well under the 150 KB font limit ----
const big = fd.emptyDoc();
for (const ch of fd.CHARSET) {
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push([100 + i * 10, 350 + Math.sin(i / 3) * 300]);
  big.glyphs[ch] = { adv: 600, pieces: [{ t: 'pen', p: fd.simplify(pts, 3), w: 60 }, { t: 'ellipse', a: [100, 0], b: [500, 400], w: 50 }] };
}
const bigBuf = fd.buildFont(big, 'Big');
check(`every character drawn with curves: ${Math.round(bigBuf.byteLength / 1024)} KB, under 150 KB`, bigBuf.byteLength < 150 * 1024, bigBuf.byteLength);
check('and its drawing fits the 48 KB the server keeps', fd.serializeDoc(big).length < fd.MAX_DOC_BYTES, fd.serializeDoc(big).length);

console.log(`\ntest-font-doc: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
