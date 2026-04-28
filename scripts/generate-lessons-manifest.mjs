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
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

const lessons = await Promise.all(
  dirs.map(async (id) => {
    const raw = await fs.readFile(path.join(lessonsDir, id, 'lesson.json'), 'utf8');
    const meta = JSON.parse(raw);
    return {
      id: meta.id ?? id,
      title: meta.title ?? id,
      unit: meta.unit ?? null,
      preview: meta.preview ?? null,
      // category is used client-side by HeaderLessonNav to scope prev/next
      // to lessons within the same unit.
      category: meta.category ?? null,
      week: typeof meta.week === 'number' ? meta.week : null,
    };
  }),
);

// Sort by id for stable output.
lessons.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(outPath, JSON.stringify({ lessons }, null, 2));
console.log(`[generate-lessons-manifest] wrote ${lessons.length} lessons → public/lessons-manifest.json`);
