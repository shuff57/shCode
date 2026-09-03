// Keeps a summative quiz's answer key out of the browser.
//
// WHY THIS EXISTS. `/lesson/[lessonId]/` is a statically exported page whose
// body is a client component, so the whole Lesson object — `quiz` included —
// is serialised into the page's RSC payload. Every hiding rule in QuizView
// (`isCorrect`, `markAsAnswer`, `graded && !summative`) governs what is DRAWN,
// and none of them governs what is SHIPPED. Measured 2026-09-02 on
// 1-7-1-ch1-individual-pa-concepts: View Source on the built page returned all
// three forms, all 18 `"answer"` indices and every `explanation`, verbatim,
// before a single question had been answered. A chapter test whose key travels
// with the question paper is not a test.
//
// A module quiz is left alone on purpose. It is formative: it marks each answer
// and explains why, and a student who digs the key out of the page source has
// gone to more trouble than reading the lesson would have taken.
//
// What this does NOT do: score the quiz. With the key gone the browser cannot,
// so a summative submission records the options the student picked and no
// score. `scripts/score-quiz.mjs` turns those picks into marks afterwards. The
// eventual fix is grading inside a Pages Function; this is the fix that does
// not change where a score comes from on the night before an assessment.

import type { Lesson, QuizConfig, QuizQuestion } from './types';

/** True when this quiz's key must not reach the browser. */
export function isSummativeQuiz(quiz: QuizConfig | undefined): boolean {
  return !!quiz?.summative;
}

/**
 * The quiz as the student's browser may see it: questions, code and options,
 * with `answer` and `explanation` removed. Returns the input unchanged for a
 * formative quiz.
 */
export function redactQuiz(quiz: QuizConfig): QuizConfig {
  if (!isSummativeQuiz(quiz)) return quiz;
  return {
    ...quiz,
    questions: (quiz.questions ?? []).map(stripKey),
  };
}

/**
 * The lesson as the client component may receive it. Call this in the SERVER
 * page, before the object crosses into a `'use client'` tree — after that
 * boundary it has already been serialised and it is too late.
 */
export function redactLessonForClient(lesson: Lesson): Lesson {
  if (!isSummativeQuiz(lesson.quiz)) return lesson;
  return { ...lesson, quiz: redactQuiz(lesson.quiz as QuizConfig) };
}

function stripKey(q: QuizQuestion): QuizQuestion {
  // Deliberately rebuilt field by field rather than delete-from-a-copy: a
  // question that grows a new key-bearing field later should have to be added
  // here on purpose, not inherited by a spread.
  const out: QuizQuestion = {
    id: q.id,
    question: q.question,
    options: q.options,
  };
  if (q.code !== undefined) out.code = q.code;
  if (q.variant !== undefined) out.variant = q.variant;
  // `source` goes too. It is only ever drawn inside the explanation block that
  // summative marking hides, and "reread 1.2.7" beside a question is a hint.
  return out;
}
