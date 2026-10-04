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
    // One student's paper, not every form's questions: a variant quiz is answered
    // as a single form, and its stored score is correct-out-of-that-form (see
    // formQuestionCount in lib/quiz-variant.ts, which this mirrors).
    const formCount = (quiz) => {
      const qs = quiz.questions;
      if (!Array.isArray(quiz.variants) || quiz.variants.length === 0) return qs.length;
      return Math.min(...quiz.variants.map((v) => qs.filter((q) => !q.variant || q.variant === v).length));
    };
    const quizCount =
      meta.quiz && Array.isArray(meta.quiz.questions) && meta.quiz.questions.length > 0
        ? formCount(meta.quiz)
        : null;
    // A CAPPED pass/fail rubric (every criterion 0 points: the group demos and charts,
    // 1.7.2, 1.7.5) is scored as criteria met out of criteria total (criteriaScore in
    // lib/grade-pass.ts; the server stores that as the part's best). Without a maxScore a
    // completed such part read as 100 whatever the AI found, so three junk demos were full
    // marks. An UNcapped pass/fail rubric keeps maxScore null: completing it on a pass
    // is still its whole grade. Mirrors app/page.tsx maxScoreFor().
    const capped = [meta.quiz, meta.aiGrader, meta.diagram, meta.grading].some(
      (b) => b && typeof b === 'object' && typeof b.maxSubmissions === 'number',
    );
    const capLimit =
      [meta.quiz, meta.aiGrader, meta.diagram, meta.grading]
        .map((b) => (b && typeof b === 'object' ? b.maxSubmissions : undefined))
        .find((n) => typeof n === 'number') ?? null;
    const passFailCount =
      capped && Array.isArray(rubric) && rubric.length > 0 && rubricPoints === 0 ? rubric.length : null;
    const maxScore = quizCount ?? (rubricPoints > 0 ? rubricPoints : passFailCount);
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
      // The part's try limit (null = unlimited). Not secret; the teacher drawer reads it to offer
      // 'Give back a try' on the parts that have one.
      maxSubmissions: capLimit,
      // scoreKind decides the GRADE CATEGORY (lib/grading-weights.ts: 'written' beats an
      // assignmentCode's 'lab'), so it stays rubric-POINTS based: a capped pass/fail rubric
      // gets a maxScore for its percent but must not move from Lab to Written.
      scoreKind: quizCount != null ? 'quiz' : rubricPoints > 0 ? 'written' : null,
    };
  }),
);

const lessons = results.filter((l) => l !== null);

// Sort by id for stable output.
lessons.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(outPath, JSON.stringify({ lessons }, null, 2));
console.log(`[generate-lessons-manifest] wrote ${lessons.length} lessons → public/lessons-manifest.json`);
