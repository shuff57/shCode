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
    // maxScore: quiz question count, or the written/diagram rubric's point
    // total. Null when every criterion is 0 points (a pass/fail rubric), which
    // is most of them -- see lib/grade-pass.ts. Mirrors app/page.tsx's
    // maxScoreFor()/scoreKindFor() so the Pages Functions can compute the same
    // weighted grade percentage the student's own badge shows without being
    // able to read lessons/*/lesson.json at runtime.
    const rubric = meta.aiGrader?.rubric ?? meta.diagram?.aiGrader?.rubric;
    const rubricPoints = Array.isArray(rubric)
      ? rubric.reduce((sum, r) => sum + (r?.points ?? 0), 0)
      : 0;
    const quizCount =
      meta.quiz && Array.isArray(meta.quiz.questions) && meta.quiz.questions.length > 0
        ? meta.quiz.questions.length
        : null;
    const maxScore = quizCount ?? (rubricPoints > 0 ? rubricPoints : null);
    return {
      id: meta.id ?? id,
      title: meta.title ?? id,
      unit: meta.unit ?? null,
      preview: meta.preview ?? null,
      // type decides the route prefix (/assignment vs /lesson). Client-side
      // navigation has no other way to know it -- see lib/lesson-href.ts.
      type: meta.type ?? 'lesson',
      // category is used client-side by HeaderLessonNav to scope prev/next
      // to lessons within the same unit.
      category: meta.category ?? null,
      week: typeof meta.week === 'number' ? meta.week : null,
      // Grade-category classification inputs (lib/grading-weights.ts). A lab
      // is recognised by its assignmentCode and nothing else, so leaving this
      // out silently drops every lab from any weighted percentage.
      assignmentCode: meta.assignmentCode ?? null,
      maxScore,
      scoreKind: quizCount != null ? 'quiz' : maxScore != null ? 'written' : null,
    };
  }),
);

const lessons = results.filter((l) => l !== null);

// Sort by id for stable output.
lessons.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(outPath, JSON.stringify({ lessons }, null, 2));
console.log(`[generate-lessons-manifest] wrote ${lessons.length} lessons → public/lessons-manifest.json`);
