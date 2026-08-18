// Generates public/lessons-manifest.json — a lightweight client-safe index
// of all lessons (id + title + unit only, no file contents). Run as part of
// `npm run prebuild` so the static export always has a current copy.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'lessons');
const outPath = path.join(root, 'public', 'lessons-manifest.json');

const entries = await fs.readdir(lessonsDir, { withFileTypes: true });
const dirs = entries
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const results = await Promise.all(
  dirs.map(async (id) => {
    // A folder with no lesson.json directly inside it (e.g. lessons/_retired/,
    // which nests retired lesson folders one level deeper) isn't a lesson —
    // skip it rather than error, same as readIfExists() in lib/curriculum.ts.
    let raw;
    try {
      raw = await fs.readFile(path.join(lessonsDir, id, 'lesson.json'), 'utf8');
    } catch {
      return null;
    }
    const meta = JSON.parse(raw);
    return {
      id: meta.id ?? id,
      title: meta.title ?? id,
      unit: meta.unit ?? null,
      preview: meta.preview ?? null,
      // type decides the route prefix (/assignment vs /lesson). Client-side
      // navigation has no other way to know it — see lib/lesson-href.ts.
      type: meta.type ?? 'lesson',
      // category is used client-side by HeaderLessonNav to scope prev/next
      // to lessons within the same unit.
      category: meta.category ?? null,
      week: typeof meta.week === 'number' ? meta.week : null,
    };
  }),
);

const lessons = results.filter((l) => l !== null);

// Sort by id for stable output.
lessons.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(outPath, JSON.stringify({ lessons }, null, 2));
console.log(`[generate-lessons-manifest] wrote ${lessons.length} lessons → public/lessons-manifest.json`);
