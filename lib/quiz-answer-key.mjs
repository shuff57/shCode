// Formats a summative quiz's answer key as plain text, from the SOURCE
// lesson.json (which still has answer/explanation -- lib/quiz-redact.ts is
// what strips them for the client, and it never touches this file).
//
// Shared by scripts/generate-solutions.mjs (production: bakes the key into
// functions/_shared/solutions.generated.ts) and server.js's dev route (via
// lib/lesson-solution-fs.mjs), so the two implementations cannot drift the
// way they already have once before -- see
// scripts/test-lesson-solution-parity.mjs.

// One question, formatted with a star on the correct option and the
// explanation underneath -- the same information lib/quiz-redact.ts removes
// before the client ever sees this question.
function formatQuestion(q) {
  const lines = [`[${q.id}]  ${q.question}`];
  if (q.code) {
    lines.push('  code:');
    for (const codeLine of q.code.split('\n')) lines.push(`    ${codeLine}`);
  }
  (q.options ?? []).forEach((opt, i) => {
    lines.push(`  ${i === q.answer ? '★' : ' '} ${i}. ${opt}`);
  });
  if (q.explanation) lines.push(`  why: ${q.explanation}`);
  lines.push('');
  return lines;
}

// A plain-text answer key for a summative quiz, grouped by form so a teacher
// grading one student's paper can jump straight to the form that student got.
// ★ marks the correct option; everything here is exactly what
// lib/quiz-redact.ts strips before the page is built.
export function buildQuizAnswerKey(lesson) {
  const quiz = lesson.quiz;
  const questions = quiz.questions ?? [];
  const variants = Array.isArray(quiz.variants) ? quiz.variants : [];
  const lines = [
    `Answer key — ${lesson.title ?? lesson.id}`,
    'Synthesised from lesson.json. Never shipped to a student --',
    'lib/quiz-redact.ts strips answer/explanation before the page is built.',
    '★ marks the correct option.',
    '',
  ];

  const common = questions.filter((q) => !q.variant);
  if (common.length) {
    lines.push('== Every form ==', '');
    for (const q of common) lines.push(...formatQuestion(q));
  }

  const seen = new Set();
  for (const v of variants) {
    const qs = questions.filter((q) => q.variant === v);
    if (!qs.length) continue;
    seen.add(v);
    lines.push(`== Form ${String(v).toUpperCase()} ==`, '');
    for (const q of qs) lines.push(...formatQuestion(q));
  }

  // A variant tag that names no declared form still has to show up somewhere,
  // or a question silently goes missing from this key.
  const stray = questions.filter((q) => q.variant && !seen.has(q.variant));
  if (stray.length) {
    lines.push('== Other ==', '');
    for (const q of stray) lines.push(...formatQuestion(q));
  }

  return lines.join('\n');
}
