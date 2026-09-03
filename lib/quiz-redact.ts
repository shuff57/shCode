// Keeps a summative quiz's answer key, and a summative written item's grading
// rubric, out of the browser.
//
// WHY THIS EXISTS. `/lesson/[lessonId]/` is a statically exported page whose
// body is a client component, so the whole Lesson object — `quiz` and
// `aiGrader` included — is serialised into the page's RSC payload. Every
// hiding rule in QuizView (`isCorrect`, `markAsAnswer`, `graded && !summative`)
// and in WrittenGrader (`result && !summative`) governs what is DRAWN, and
// none of them governs what is SHIPPED. Measured 2026-09-02 on
// 1-7-1-ch1-individual-pa-concepts: View Source on the built page returned all
// three forms, all 18 `"answer"` indices and every `explanation`, verbatim,
// before a single question had been answered. Measured again 2026-09-03 on
// 1-7-2-ch1-individual-pa-own-words: even after WrittenGrader stopped
// RENDERING `aiGrader.prompt` as on-page instructions, the raw rubric text —
// naming every accepted answer, including all six umbrella-activity terms —
// was still sitting in the built page, because `config={meta.aiGrader}` still
// carried the untouched object. A chapter test whose key travels with the
// question paper is not a test.
//
// A module quiz or a formative written item is left alone on purpose. Both are
// formative: they mark and explain (or, for a written one, show the rubric
// feedback students are meant to read and revise against), and a student who
// digs the key out of the page source has gone to more trouble than reading
// the lesson would have taken.
//
// What this does NOT do: score the quiz, or grade the written item, in the
// browser. With the key/rubric gone the browser cannot, so a summative
// submission records the raw answer with no score. `scripts/score-quiz.mjs`
// turns quiz picks into marks afterwards; a summative written submission is
// graded server-side in functions/api/grade-written.ts from the SAME
// lesson.json this file redacts a copy of, and the result is deliberately
// never rendered back to the student (see `result && !summative` in
// WrittenGrader.tsx) even though the server does compute one.

import type { AiGraderConfig, Lesson, QuizConfig, QuizQuestion } from './types';

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

/** True when this written item's grading rubric must not reach the browser. */
export function isSummativeAiGrader(cfg: AiGraderConfig | undefined): boolean {
  return !!cfg?.summative;
}

/**
 * The AI-grader config as the student's browser may see it: enough to render
 * the widget (`rubricTitle`, `model`), with `prompt` (the grading brief — it
 * names every accepted answer) and `contextDocs` removed. `rubric` becomes an
 * empty array rather than being dropped, because WrittenGrader still reduces
 * over it for a totals figure that is never displayed once `summative` is
 * true — every point value on every PA rubric is 0, so this changes nothing
 * that reaches the screen. Returns the input unchanged for a formative item.
 */
export function redactAiGrader(cfg: AiGraderConfig): AiGraderConfig {
  if (!isSummativeAiGrader(cfg)) return cfg;
  return {
    summative: true,
    rubricTitle: cfg.rubricTitle,
    model: cfg.model,
    rubric: [],
  };
}

/**
 * The lesson as the client component may receive it. Call this in the SERVER
 * page, before the object crosses into a `'use client'` tree — after that
 * boundary it has already been serialised and it is too late.
 */
export function redactLessonForClient(lesson: Lesson): Lesson {
  let out = lesson;
  if (isSummativeQuiz(out.quiz)) {
    out = { ...out, quiz: redactQuiz(out.quiz as QuizConfig) };
  }
  if (isSummativeAiGrader(out.aiGrader)) {
    out = { ...out, aiGrader: redactAiGrader(out.aiGrader as AiGraderConfig) };
  }
  return out;
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
