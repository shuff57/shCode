#!/usr/bin/env node
// Derive `carryFrom` for every lab: the earlier lesson whose reference solution
// this lab's starter was copied from.
//
// Why. The chain already exists on disk — most labs' `script.js` IS an earlier
// lab's `solution.js` — but nothing records it. `carryFrom` makes it data so the
// strip can offer the student their own saved version.
//
// Comparison strips comment-only and blank lines, because a starter is the
// previous solution plus a new header and `// STEP n` comments. A lab's own
// solution.js is never a candidate for itself, and only EARLIER lessons are, so
// the chain can never form a cycle.
//
//   node scripts/derive-carry-chain.mjs             # print, write nothing
//   node scripts/derive-carry-chain.mjs --write     # set carryFrom in lesson.json
//   node scripts/derive-carry-chain.mjs --min 0.97  # tighter threshold
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const minArg = args.indexOf('--min');
const MIN = minArg >= 0 ? Number(args[minArg + 1]) : 0.93;
const unitsArg = args.indexOf('--units');
const UNITS = unitsArg >= 0 ? String(args[unitsArg + 1]).split(',').map((s) => s.trim()) : null;

const read = (p) => {
  try { return fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n'); } catch { return null; }
};
const codeLines = (text) =>
  text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));

/** Dice coefficient over the multiset of code lines: 1 for identical code. */
function similarity(a, b) {
  const A = new Map();
  const B = new Map();
  for (const l of a) A.set(l, (A.get(l) ?? 0) + 1);
  for (const l of b) B.set(l, (B.get(l) ?? 0) + 1);
  let total = 0;
  let inter = 0;
  for (const [l, n] of A) { total += n; inter += Math.min(n, B.get(l) ?? 0); }
  for (const [, n] of B) total += n;
  return total === 0 ? 0 : (2 * inter) / total;
}

const parseNum = (title) => {
  const m = /^(\d+\.\d+\.\d+)/.exec(title ?? '');
  return m ? m[1] : null;
};

const lessons = [];
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const dir = path.join(lessonsDir, d.name);
  const lj = path.join(dir, 'lesson.json');
  if (!fs.existsSync(lj)) continue;
  const json = JSON.parse(fs.readFileSync(lj, 'utf8'));
  const num = parseNum(json.title);
  if (!num) continue;
  const starter = read(path.join(dir, 'script.js'));
  if (starter === null) continue; // readings and plans have no code
  lessons.push({
    folder: d.name,
    dir,
    json,
    num,
    type: json.type ?? '',
    starter: codeLines(starter),
  });
}
lessons.sort((a, b) => a.num.localeCompare(b.num, undefined, { numeric: true }));

let linked = 0;
let near = 0;
for (let i = 0; i < lessons.length; i++) {
  const target = lessons[i];
  const targetUnit = target.num.split('.')[0];
  if (UNITS && !UNITS.includes(targetUnit)) continue;
  let best = null;
  for (let j = 0; j < i; j++) {
    const source = lessons[j];
    const sol = read(path.join(source.dir, 'solution.js'));
    if (sol === null) continue;
    const r = similarity(codeLines(sol), target.starter);
    if (!best || r > best.ratio) best = { source, ratio: r };
  }
  if (!best) continue;
  const tag = best.ratio === 1 ? 'exact' : best.ratio >= MIN ? 'near ' : 'below';
  if (best.ratio >= MIN) linked++;
  else if (best.ratio >= 0.3) near++;
  if (best.ratio >= 0.3) {
    console.log(
      `${target.num.padEnd(8)} <- ${best.source.num.padEnd(8)} ${best.ratio.toFixed(3)} ${tag.padEnd(6)} ${target.folder}`,
    );
  }
  if (WRITE && best.ratio >= MIN) {
    const next = { ...target.json, carryFrom: best.source.folder };
    // keep field order stable: carryFrom right after starterVariants-style keys
    fs.writeFileSync(path.join(target.dir, 'lesson.json'), JSON.stringify(next, null, 2) + '\n');
    linked += 0;
  }
}

console.log(
  `\n${lessons.length} code lessons; ${linked} link(s) at or above ${MIN}` +
  `${near ? `, ${near} between 0.30 and ${MIN} for a human to review` : ''}.` +
  `${WRITE ? ' carryFrom written.' : ' dry run: nothing written (use --write).'}`,
);
