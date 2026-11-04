#!/usr/bin/env node
// Gate: every `carryFrom` names a real, earlier lesson, and the target's starter
// still looks like that lesson's reference solution.
//
// Fails on: a missing source, a self-link, a source that is NOT earlier in course
// order, or a malformed value. Warns (does not fail) when the starter no longer
// resembles the source's solution — that is a real upstream edit, and a human
// should confirm the link still means what it says.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');

const read = (p) => {
  try { return fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n'); } catch { return null; }
};
const codeLines = (text) =>
  text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));

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

const lessons = [];
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const dir = path.join(lessonsDir, d.name);
  const lj = path.join(dir, 'lesson.json');
  if (!fs.existsSync(lj)) continue;
  const json = JSON.parse(fs.readFileSync(lj, 'utf8'));
  const m = /^(\d+\.\d+\.\d+)/.exec(json.title ?? '');
  lessons.push({ folder: d.name, dir, json, num: m ? m[1] : null });
}
lessons.sort((a, b) => (a.num ?? '').localeCompare(b.num ?? '', undefined, { numeric: true }));
const indexOf = new Map(lessons.map((l, i) => [l.folder, i]));
const byFolder = new Map(lessons.map((l) => [l.folder, l]));

const problems = [];
const warnings = [];
let links = 0;

for (const target of lessons) {
  const src = target.json.carryFrom;
  if (!src) continue;
  links++;
  if (typeof src !== 'string' || !src) {
    problems.push(`${target.folder}: carryFrom is not a folder id`);
    continue;
  }
  if (src === target.folder) {
    problems.push(`${target.folder}: carryFrom points at itself`);
    continue;
  }
  const source = byFolder.get(src);
  if (!source) {
    problems.push(`${target.folder}: carryFrom names ${src}, which does not exist`);
    continue;
  }
  if (!(indexOf.get(src) < indexOf.get(target.folder))) {
    problems.push(`${target.folder}: carryFrom ${src} is not earlier in course order`);
    continue;
  }
  const starter = read(path.join(target.dir, 'script.js'));
  const solution = read(path.join(source.dir, 'solution.js'));
  if (!starter) {
    problems.push(`${target.folder}: carryFrom is set but the lesson has no script.js`);
    continue;
  }
  if (!solution) {
    warnings.push(`${target.folder}: carryFrom ${src}, but the source has no solution.js to compare`);
    continue;
  }
  const r = similarity(codeLines(solution), codeLines(starter));
  if (r < 0.8) {
    warnings.push(`${target.folder}: starter resembles ${src}'s solution only ${r.toFixed(2)} — confirm the link`);
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const p of problems) console.error(`FAIL  ${p}`);
console.log(
  `\n[check-carry-chain] ${links} link(s); ${problems.length} problem(s), ${warnings.length} warning(s)`,
);
process.exit(problems.length ? 1 : 0);
