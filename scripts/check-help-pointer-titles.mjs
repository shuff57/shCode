// A "Help: 3.2.11 (Getting a Value Back with `return`)" pointer carries the TITLE of the
// lesson it names in parentheses. After a renumber (scripts/renumber-module.mjs) or a merge
// of two branches that numbered things differently, a pointer can still resolve to a real
// lesson and name the wrong one: check-lesson-citations only proves the number exists.
// This check proves the number and the words still agree: the lesson numbered N must have
// the parenthesised text in its title (ignoring case, backticks and punctuation).
//
// Run: node scripts/check-help-pointer-titles.mjs [--only 3.2,3.3]   (read-only; exit 1 on any mismatch)
// --only limits the check to pointers whose NUMBER is in those modules. The whole course has
// a handful of older loose paraphrases (e.g. "(the three structures)" for a longer title), so
// the gate that matters after touching 3.2/3.3 is `--only 3.2,3.3`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const oi = process.argv.indexOf('--only');
const only = oi >= 0 ? process.argv[oi + 1].split(',').map((m) => m + '.') : null;
const norm = (s) => s.toLowerCase().replace(/[`*_]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const titles = new Map();   // number -> normalised title
const dirs = fs.readdirSync(lessonsDir).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(lessonsDir, d, 'lesson.json')));
for (const d of dirs) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(lessonsDir, d, 'lesson.json'), 'utf8'));
    const m = /^(\d+\.\d+\.\d+)\s+(.*)$/.exec(j.title ?? '');
    if (m) titles.set(m[1], norm(m[2]));
  } catch { /* another check reports an unparseable lesson */ }
}

// "Help: 3.2.9 (Title)" and "3.2.9 (Title)" after "and"/"or"/","; the title may itself
// contain one level of parentheses, e.g. "(Lab: findRectangleArea (multi-parameter))".
const POINTER = /\b(\d+\.\d+\.\d+)\s+\(((?:[^()]|\([^()]*\))+)\)/g;
let checked = 0;
const bad = [];
for (const d of dirs) {
  for (const f of ['lesson.json', 'content.md']) {
    const p = path.join(lessonsDir, d, f);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const m of text.matchAll(POINTER)) {
      if (only && !only.some((o) => m[1].startsWith(o))) continue;
      const want = titles.get(m[1]);
      if (want === undefined) continue;          // an unresolved number is check-lesson-citations' job
      const said = norm(m[2]);
      // Only treat it as a title pointer when it looks like one of ours: preceded by Help:/and/or.
      if (!/(?:Help:|and|or|,)\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
      checked++;
      if (!want.includes(said) && !said.includes(want)) bad.push(`${d}/${f}: ${m[1]} (${m[2]}) but ${m[1]} is "${want}"`);
    }
  }
}
for (const b of bad) console.error(`MISMATCH ${b}`);
if (bad.length) { console.error(`\n[check-help-pointer-titles] ${bad.length} pointer(s) name a different lesson than their number`); process.exit(1); }
console.log(`[check-help-pointer-titles] ${checked} "N.N.N (Title)" pointers, number and title agree`);
