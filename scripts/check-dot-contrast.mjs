// Every lesson-progress dot must stay readable against the strip it sits on.
//
// A student filed report #10 ("the uncompleted circles ... are hard to see")
// because locked dots were #2a2d3a at 0.4 opacity. That was fixed by eye once
// and regressed toward "locked should look dim" once, so the floor lives here
// now instead of in a comment: 3.0:1 is the WCAG 2.1 non-text minimum, and the
// check reads the colours out of the component rather than restating them.
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

// The whole ternary chain, from `const borderColor =` to its semicolon.
const block = src.match(/const borderColor\s*=([\s\S]*?);/);
if (!block) {
  console.error(`FAIL  ${FILE}: no \`const borderColor =\` assignment found.`);
  console.error('      The dot colours moved. Point this check at them again.');
  process.exit(1);
}

const colors = [...new Set(block[1].match(/#[0-9a-fA-F]{6}/g) ?? [])];
if (colors.length === 0) {
  console.error(`FAIL  ${FILE}: borderColor holds no hex literals to measure.`);
  process.exit(1);
}

// Opacity would undo everything measured here, so refuse it on the dot itself.
const dotStyle = src.match(/const dotStyle[\s\S]*?\};/);
const dimmed = dotStyle && /\bopacity\b/.test(dotStyle[0]);

const failures = [];
for (const color of colors) {
  const ratio = contrast(color, STRIP_BG);
  const ok = ratio >= MIN_RATIO;
  if (!ok) failures.push({ color, ratio });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${color} on ${STRIP_BG}  ${ratio.toFixed(2)}:1`);
}

if (dimmed) {
  failures.push({ color: 'dotStyle.opacity', ratio: 0 });
  console.log(`FAIL  dotStyle sets opacity — that lowers every ratio above.`);
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} dot colour(s) below the ${MIN_RATIO.toFixed(1)}:1 non-text minimum in ${FILE}.`,
  );
  console.error('A locked lesson may look duller than an open one, but not invisible.');
  process.exit(1);
}

console.log(`\nAll ${colors.length} dot colours clear ${MIN_RATIO.toFixed(1)}:1 on ${STRIP_BG}.`);
