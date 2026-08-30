// Every lesson-progress segment must stay readable against the strip it sits on.
//
// A student filed report #10 ("the uncompleted circles ... are hard to see")
// because locked dots were #2a2d3a at 0.4 opacity. That was fixed by eye once
// and regressed toward "locked should look dim" once, so the floor lives here
// now instead of in a comment: 3.0:1 is the WCAG 2.1 non-text minimum, and the
// check reads the colours out of the component rather than restating them.
//
// The dots became segments and the colour moved from a border to a fill. The
// measurement is identical -- a fill on #21222c is the same non-text contrast
// question a border was -- and the rename brought the current lesson's #ff79c6
// into the chain, which the old borderColor-only read never measured.
//
//   node scripts/check-dot-contrast.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'components/LessonProgressFooter.tsx';
const STRIP_BG = '#21222c';
const MIN_RATIO = 3.0;

function channel(eight) {
  const c = eight / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const src = readFileSync(resolve(root, FILE), 'utf8');

// The whole ternary chain, from `const stateColor =` to its semicolon.
const block = src.match(/const stateColor\s*=([\s\S]*?);/);
if (!block) {
  console.error(`FAIL  ${FILE}: no \`const stateColor =\` assignment found.`);
  console.error('      The segment colours moved. Point this check at them again.');
  process.exit(1);
}

const colors = [...new Set(block[1].match(/#[0-9a-fA-F]{6}/g) ?? [])];
if (colors.length === 0) {
  console.error(`FAIL  ${FILE}: stateColor holds no hex literals to measure.`);
  process.exit(1);
}

// Opacity would undo everything measured here, so refuse it on the segment.
const segStyle = src.match(/const segStyle[\s\S]*?\};/);
const dimmed = segStyle && /\bopacity\b/.test(segStyle[0]);

// A segment paints only its bottom 6px; the padding above it is an invisible
// but clickable target. That depends on `background-clip: content-box`, and
// the `background` SHORTHAND resets background-clip to border-box — so
// writing `background:` next to `backgroundClip` silently fills the padding
// and every segment renders as a 16px block. It shipped that way once and no
// test noticed: the geometry still measures 6px, only the pixels differ.
const clipped = segStyle && /backgroundClip/.test(segStyle[0]);
const shorthand = segStyle && /\bbackground:\s/.test(segStyle[0]);

const failures = [];
for (const color of colors) {
  const ratio = contrast(color, STRIP_BG);
  const ok = ratio >= MIN_RATIO;
  if (!ok) failures.push({ color, ratio });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${color} on ${STRIP_BG}  ${ratio.toFixed(2)}:1`);
}

if (dimmed) {
  failures.push({ color: 'segStyle.opacity', ratio: 0 });
  console.log('FAIL  segStyle sets opacity — that lowers every ratio above.');
}

if (clipped && shorthand) {
  failures.push({ color: 'segStyle.background', ratio: 0 });
  console.log('FAIL  segStyle uses the `background` shorthand next to backgroundClip.');
  console.log('      The shorthand resets background-clip; use backgroundColor.');
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} problem(s) with the ${MIN_RATIO.toFixed(1)}:1 non-text minimum in ${FILE}.`,
  );
  console.error('A locked lesson may look duller than an open one, but not invisible.');
  process.exit(1);
}

console.log(`\nAll ${colors.length} segment colours clear ${MIN_RATIO.toFixed(1)}:1 on ${STRIP_BG}.`);
