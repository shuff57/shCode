// Generates public/lessons-manifest.json — a lightweight client-safe index
// of all lessons (id + title + unit only, no file contents). Run as part of
// `npm run prebuild` so the static export always has a current copy.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { lessonScoreFields } from './lesson-score-fields.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'lessons');
const outPath = path.join(root, 'public', 'lessons-manifest.json');
// Requirement titles per lesson, for the teacher's "Most missed" panel only (id + title; no patterns).
const reqPath = path.join(root, 'public', 'lesson-requirements.json');
const reqTitles = {};

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
    if (Array.isArray(meta.requirements) && meta.requirements.length > 0) {
      reqTitles[meta.id ?? id] = meta.requirements
        .filter((r) => r && typeof r.id === 'string')
        .map((r) => ({ id: r.id, title: String(r.title ?? r.id) }));
    }
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
    // A pass/fail rubric (every criterion 0 points) is scored as criteria met out of criteria
    // total (criteriaScore in lib/grade-pass.ts), capped or not. Without a maxScore a completed
    // such part read as 100 whatever the AI found, so three junk demos were full marks.
    // 2026-10-04: uncapped pass/fail lessons get the same fraction, with students who completed
    // them before then grandfathered at full by scripts/backfill-passfail-fraction.mjs.
    // Mirrors app/page.tsx maxScoreFor().
    const capLimit =
      [meta.quiz, meta.aiGrader, meta.diagram, meta.grading]
        .map((b) => (b && typeof b === 'object' ? b.maxSubmissions : undefined))
        .find((n) => typeof n === 'number') ?? null;
    const { maxScore, scoreKind } = lessonScoreFields(meta, quizCount);
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
      scoreKind,
    };
  }),
);

const lessons = results.filter((l) => l !== null);

// Sort by id for stable output.
lessons.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(outPath, JSON.stringify({ lessons }, null, 2));
const sortedReqs = Object.fromEntries(Object.keys(reqTitles).sort().map((k) => [k, reqTitles[k]]));
await fs.writeFile(reqPath, JSON.stringify(sortedReqs));
console.log(`[generate-lessons-manifest] wrote ${lessons.length} lessons → public/lessons-manifest.json`);
