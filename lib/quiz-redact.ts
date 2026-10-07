// Keeps a summative quiz's answer key, and a summative written item's grading
// rubric, out of the browser.
//
// WHY THIS EXISTS. `/lesson/[lessonId]/` is a statically exported page whose
// body is a client component, so the whole Lesson object — `quiz` and
// `aiGrader` included — is serialised into the page's RSC payload. Every
// hiding rule in QuizView (`isCorrect`, `markAsAnswer`, `graded && !summative`)
// and in WrittenGrader (`result && !oneShot`) governs what is DRAWN, and
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
// never rendered back to the student (see `oneShot` in WrittenGrader.tsx)
// even though the server does compute one. An item marked `revisable` is the
// exception: its feedback is shown on purpose, so it keeps its criterion
// titles (see `redactAiGrader`).

import type { AiGraderConfig, Grading, Lesson, QuizConfig, QuizQuestion, Requirement } from './types';
import type { DiagramConfig } from './diagram-types';

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
function isSummativeAiGrader(cfg: AiGraderConfig | undefined): boolean {
  return !!cfg?.summative;
}

/** True when this diagram's grader config must not reach the browser. */
function isSummativeDiagramAiGrader(cfg: DiagramConfig | undefined): boolean {
  // The grader's own `summative` counts too: a group chart keeps its structural
  // gate (the diagram is not `summative`, so Build opens only on a green chart)
  // but its AI grading brief is still a key and must not ship to the browser.
  return !!cfg?.summative || !!cfg?.aiGrader?.summative;
}

/** True when a lesson's requirements contain the answer key for a summative assessment. */
function isSummativeGrading(grading: Grading | undefined): boolean {
  return !!grading?.summative;
}

/**
 * The requirements as the student's browser may see them: enough to render
 * the checklist (`title`, `description`, `hint`, `type`, `status`, etc.),
 * with `pattern`, `expected`, `testFn`, `expect` removed — those are the
 * answer key. Returns the input unchanged for a non-summative lesson.
 */
function redactRequirements(reqs: Requirement[]): Requirement[] {
  return reqs.map((r) => ({
    ...r,
    pattern: undefined,
    expected: undefined,
    testFn: undefined,
    expect: undefined,
  }));
}

/**
 * The AI-grader config as the student's browser may see it: enough to render
 * the widget (`rubricTitle`, `model`), with `prompt` (the grading brief — it
 * names every accepted answer) and `contextDocs` removed. `rubric` becomes an
 * empty array rather than being dropped, because WrittenGrader still reduces
 * over it. Returns the input unchanged for a formative item.
 *
 * A `revisable` item is the exception to the empty rubric: its feedback is
 * drawn, and WrittenGrader labels each verdict with the criterion title from
 * this list. It gets `{id, title, points}` and nothing else. `description` is
 * the key (it says what an accepted answer contains) and stays behind; the
 * list is rebuilt field by field for the reason given in `stripKey`.
 *
 * `input` ('code' draws the JavaScript editor) says how the widget is drawn and
 * carries no key. It has to be copied across by hand like everything else here,
 * or a summative item silently falls back to the plain textarea.
 */
function redactAiGrader(cfg: AiGraderConfig): AiGraderConfig {
  if (!isSummativeAiGrader(cfg)) return cfg;
  const out: AiGraderConfig = {
    summative: true,
    rubricTitle: cfg.rubricTitle,
    model: cfg.model,
    rubric: [],
  };
  if (cfg.revisable) {
    out.revisable = true;
    out.rubric = (cfg.rubric ?? []).map(({ id, title, points }) => ({ id, title, points }));
  }
  if (typeof cfg.maxSubmissions === 'number') out.maxSubmissions = cfg.maxSubmissions;
  if (cfg.input) out.input = cfg.input;
  return out;
}

/**
 * A formative chart's grader as the browser may see it: the title and model, and
 * each criterion's `{id, title, points}` so feedback can be labelled. `prompt`,
 * `contextDocs`, rubric `description` and `strict` stay on the server. Rebuilt
 * field by field, like `stripKey`.
 */
function redactFormativeDiagramAiGrader(g: NonNullable<DiagramConfig['aiGrader']>): NonNullable<DiagramConfig['aiGrader']> {
  const out: NonNullable<DiagramConfig['aiGrader']> = {
    rubric: (g.rubric ?? []).map(({ id, title, points }) => ({ id, title, points })),
  };
  if (g.rubricTitle !== undefined) out.rubricTitle = g.rubricTitle;
  if (g.model !== undefined) out.model = g.model;
  return out;
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
  if (isSummativeDiagramAiGrader(out.diagram)) {
    // A summative chart's grader is a key whether or not ITS OWN `summative` is set:
    // redactAiGrader only strips when the config it is handed says so, so a chart
    // with diagram.summative true and an aiGrader that forgot the flag shipped its
    // prompt, rubric and contextDocs to the browser. Force it here, and
    // scripts/check-summative-parts.mjs fails a lesson authored that way.
    const g = out.diagram!.aiGrader;
    if (g) out = { ...out, diagram: { ...out.diagram, aiGrader: redactAiGrader({ ...(g as AiGraderConfig), summative: true }) } };
  } else if (out.diagram?.aiGrader) {
    // A FORMATIVE chart still ships a brief that describes the correct structure
    // (measured 2026-10-06 on 3-2-8, 3-2-18, 3-3-11, 2-2-12: 'Withhold if', 'sets-base',
    // 'Credit any wording' were all in the student page). The client needs only the
    // feedback labels; grading reads the server copy by lessonId.
    out = { ...out, diagram: { ...out.diagram, aiGrader: redactFormativeDiagramAiGrader(out.diagram.aiGrader) } };
  }
  if (isSummativeGrading(out.grading)) {
    out = { ...out, requirements: redactRequirements(out.requirements ?? []) };
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
