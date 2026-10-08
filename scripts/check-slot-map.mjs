// The "Numbered Lesson List" table in curriculum/modules/3.2_*.md and 3.3_*.md is the slot map authors
// work from. This fails when a row (slot, title, slug) disagrees with lessons/<slug>/lesson.json: the
// folder is missing, the title differs, or the title does not start with the slot number.
// Run: node scripts/check-slot-map.mjs   (read-only; exit 1 on any mismatch)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modDir = path.join(root, 'curriculum', 'modules');
const strip = (s) => s.trim().replace(/^`|`$/g, '');
const bad = [];
let rows = 0;
for (const f of fs.readdirSync(modDir).filter((n) => /^3\.[23]_.*\.md$/.test(n))) {
  const lines = fs.readFileSync(path.join(modDir, f), 'utf8').split('\n');
  let i = lines.findIndex((l) => /^#+\s*Numbered Lesson List/.test(l));
  if (i < 0) { bad.push(`${f}: no "Numbered Lesson List" heading`); continue; }
  for (i++; i < lines.length && !/^#/.test(lines[i]); i++) {
    const cells = lines[i].split('|').map((c) => c.trim());
    if (cells.length < 6 || !/^\d+\.\d+\.\d+$/.test(cells[1])) continue; // header, separator, prose
    const slot = cells[1], title = cells[3], slug = strip(cells[4]);
    rows++;
    const file = path.join(root, 'lessons', slug, 'lesson.json');
    if (!fs.existsSync(file)) { bad.push(`${f} ${slot}: lessons/${slug}/ has no lesson.json`); continue; }
    const actual = JSON.parse(fs.readFileSync(file, 'utf8')).title;
    if (actual !== title) bad.push(`${f} ${slot}: table says "${title}", lesson.json says "${actual}" (${slug})`);
    if (!actual.startsWith(slot + ' ')) bad.push(`${f} ${slot}: title "${actual}" does not start with its slot number (${slug})`);
  }
}
if (bad.length || rows === 0) {
  console.error(bad.join('\n') || 'check-slot-map: no rows read');
  console.error(`check-slot-map: ${bad.length} problem(s) in ${rows} rows`);
  process.exit(1);
}
console.log(`check-slot-map: ${rows}/${rows} rows agree with lessons/*/lesson.json`);
