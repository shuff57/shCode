#!/usr/bin/env node
// Validates every multiple-choice quiz lesson, and the pass arithmetic behind
// them. A quiz is graded in the browser off lesson.json, so a bad `answer`
// index or a missing explanation is a silent wrong-answer-forever bug that no
// other check would catch.
//
//   node scripts/test-quiz.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');

let failures = 0;
const fail = (where, msg) => {
  failures++;
  console.log(`FAIL ${where}: ${msg}`);
};

// ---- pass arithmetic (mirrors lib/quiz-grade.ts) ----------------------------
const DEFAULT_PASS_PERCENT = 70;
const passThreshold = (total, pct = DEFAULT_PASS_PERCENT) =>
  total <= 0 ? 0 : Math.min(total, Math.ceil((total * pct) / 100));

const THRESHOLD_CASES = [
  [6, undefined, 5], // 70% of 6 = 4.2 -> 5, never rounded down to 4
  [8, undefined, 6], // 70% of 8 = 5.6 -> 6
  [10, undefined, 7],
  [3, undefined, 3], // 70% of 3 = 2.1 -> 3
  [5, 100, 5], // a teacher can demand every one
  [5, 50, 3], // ...or a bare majority
  [0, undefined, 0], // empty quiz can't be passed by arithmetic accident
  [4, 200, 4], // nonsense percent still can't exceed the question count
];
for (const [total, pct, want] of THRESHOLD_CASES) {
  const got = passThreshold(total, pct);
  if (got !== want) fail('passThreshold', `(${total}, ${pct}) -> ${got}, want ${want}`);
}

// ---- every quiz lesson ------------------------------------------------------
let quizCount = 0;
let questionCount = 0;

for (const dir of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, dir, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (lesson.preview === 'quiz' && !lesson.quiz) {
    fail(dir, 'preview is "quiz" but there is no `quiz` block');
    continue;
  }
  if (!lesson.quiz) continue;
  quizCount++;

  if (lesson.preview !== 'quiz') fail(dir, `has a \`quiz\` block but preview is "${lesson.preview}"`);
  // Both would render; QuizView wins, so the aiGrader would be dead config that
  // still reads like the lesson is AI-graded.
  if (lesson.aiGrader) fail(dir, 'has both `quiz` and `aiGrader` — the aiGrader is dead config');

  const { passPercent, questions, shuffle, variants } = lesson.quiz;
  if (passPercent !== undefined && (!Number.isFinite(passPercent) || passPercent <= 0 || passPercent > 100)) {
    fail(dir, `passPercent ${passPercent} is not a percentage between 1 and 100`);
  }
  if (shuffle !== undefined && typeof shuffle !== 'boolean') {
    fail(dir, `shuffle must be true or false, not ${JSON.stringify(shuffle)}`);
  }
  if (variants !== undefined) {
    if (!Array.isArray(variants) || variants.length < 2) {
      fail(dir, 'variants must list at least two form labels, e.g. ["a", "b", "c"]');
    } else if (variants.some((v) => typeof v !== 'string' || !v.trim())) {
      fail(dir, 'a variant label is empty or not a string');
    } else if (new Set(variants).size !== variants.length) {
      fail(dir, `duplicate variant label in ${JSON.stringify(variants)}`);
    }
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    fail(dir, 'quiz.questions is missing or empty');
    continue;
  }

  const seenIds = new Set();
  questions.forEach((q, i) => {
    questionCount++;
    const at = `${dir} q[${i}]${q.id ? ` (${q.id})` : ''}`;

    if (!q.id) fail(at, 'missing id — the id is the answer key, and also the radio-group name');
    else if (seenIds.has(q.id)) fail(at, `duplicate question id "${q.id}"`);
    else seenIds.add(q.id);

    if (!q.question || !q.question.trim()) fail(at, 'empty question text');
    if (!q.explanation || !q.explanation.trim()) {
      fail(at, 'no explanation — a wrong answer would show a blank note');
    }

    if (!Array.isArray(q.options) || q.options.length < 3) {
      fail(at, `needs at least 3 options, has ${q.options?.length ?? 0}`);
      return;
    }
    if (q.options.some((o) => typeof o !== 'string' || !o.trim())) {
      fail(at, 'an option is empty or not a string');
    }
    const norm = q.options.map((o) => String(o).trim().toLowerCase());
    if (new Set(norm).size !== norm.length) fail(at, 'two options are the same');

    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
      fail(at, `answer ${q.answer} is not a valid index into ${q.options.length} options`);
    }

    if (q.variant !== undefined) {
      if (!Array.isArray(variants) || !variants.includes(q.variant)) {
        fail(at, `variant "${q.variant}" is not one of the quiz's ${JSON.stringify(variants ?? null)}`);
      }
    }

    // Under shuffling an option has no fixed position, so prose that points at
    // one becomes a lie. This is strict on purpose: shuffle is opt-in, so the
    // cost of a false positive is one rewritten sentence in a lesson the
    // author is already writing, and the cost of a miss is a graded test
    // telling a student to look at an option that moved.
    if (shuffle) {
      const prose = [q.question, q.explanation, ...(q.options ?? [])].join(' ');
      const ordinal = prose.match(/\b(first|second|third|fourth|fifth|last)\b/i);
      if (ordinal) {
        fail(at, `shuffled quiz, but the wording says "${ordinal[0]}" -- positions move per student`);
      }
      if (/\boption\s*\d/i.test(prose)) {
        fail(at, 'shuffled quiz, but the wording numbers an option -- positions move per student');
      }
    }
  });

  // Every form has to be the same test. A student on form "b" answering four
  // questions while form "a" answers six is not a retake, it is a different
  // exam, and passThreshold would quietly move under them too.
  if (Array.isArray(variants) && variants.length >= 2) {
    const common = questions.filter((q) => q.variant === undefined).length;
    const sizes = variants.map((v) => ({
      variant: v,
      size: common + questions.filter((q) => q.variant === v).length,
    }));
    const distinct = new Set(sizes.map((s) => s.size));
    if (distinct.size !== 1) {
      fail(dir, `forms are different lengths: ${sizes.map((s) => `${s.variant}=${s.size}`).join(', ')}`);
    }
    const orphan = questions.find((q) => q.variant !== undefined && !variants.includes(q.variant));
    if (orphan) fail(dir, `question "${orphan.id}" is tagged for a form that does not exist`);
  } else if (questions.some((q) => q.variant !== undefined)) {
    fail(dir, 'questions are tagged with a variant but the quiz declares no `variants` -- every student would see all of them');
  }

  // A quiz whose correct answers are all in the same slot is guessable without
  // reading a word of it.
  // Shuffling already scatters them, so the check only applies to a fixed quiz.
  const slots = questions.map((q) => q.answer);
  if (!shuffle && questions.length >= 4 && new Set(slots).size === 1) {
    fail(dir, `every correct answer is option ${slots[0] + 1} — shuffle them`);
  }
}

console.log(
  failures
    ? `\n${failures} FAILURE(S) across ${quizCount} quizzes / ${questionCount} questions`
    : `\nALL PASS  (${THRESHOLD_CASES.length} threshold cases, ${quizCount} quizzes, ${questionCount} questions)`,
);
process.exit(failures ? 1 : 0);
