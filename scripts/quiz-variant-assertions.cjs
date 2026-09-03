// Assertions for lib/quiz-variant.ts. Run via `npm run test:quiz-variant`,
// which compiles the TypeScript to CommonJS in a temp dir first and passes
// that dir in.
//
// What these are guarding, in one line each:
//   - a student's paper must not change between reloads
//   - two students must not reliably get the same paper
//   - every form must ask the same number of questions
//   - a shuffled option list must still contain every option exactly once
//   - the stored answer index must keep pointing at the authored option

const LIB = process.env.QUIZ_VARIANT_LIB_DIR;
if (!LIB) {
  console.error('Set QUIZ_VARIANT_LIB_DIR, or run `npm run test:quiz-variant`.');
  process.exit(2);
}

const {
  hashSeed,
  mulberry32,
  shuffle,
  assignVariant,
  buildQuizView,
} = require(LIB + '/quiz-variant.js');

let failures = 0;
const fail = (where, msg) => {
  failures++;
  console.log(`FAIL ${where}: ${msg}`);
};
const ok = (cond, where, msg) => {
  if (!cond) fail(where, msg);
};
const eq = (got, want, where) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) fail(where, `got ${g}, want ${w}`);
};

// ---- hashSeed ---------------------------------------------------------------
eq(hashSeed('abc'), hashSeed('abc'), 'hashSeed/stable');
ok(hashSeed('abc') !== hashSeed('abd'), 'hashSeed/spread', 'one-char change collided');
ok(Number.isInteger(hashSeed('')) && hashSeed('') >= 0, 'hashSeed/empty', 'empty input is not a uint32');

// ---- mulberry32 -------------------------------------------------------------
{
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  eq(seqA, seqB, 'mulberry32/deterministic');
  ok(
    seqA.every((n) => n >= 0 && n < 1),
    'mulberry32/range',
    `out of [0,1): ${JSON.stringify(seqA)}`,
  );
  const c = mulberry32(43);
  ok(c() !== seqA[0], 'mulberry32/seeded', 'different seeds produced the same first draw');
}

// ---- shuffle ----------------------------------------------------------------
{
  const input = [0, 1, 2, 3, 4, 5];
  const out = shuffle(input, mulberry32(7));
  eq(input, [0, 1, 2, 3, 4, 5], 'shuffle/pure');
  eq(out.slice().sort((x, y) => x - y), [0, 1, 2, 3, 4, 5], 'shuffle/permutation');
  eq(shuffle(input, mulberry32(7)), out, 'shuffle/deterministic');
  eq(shuffle([], mulberry32(1)), [], 'shuffle/empty');
  eq(shuffle([9], mulberry32(1)), [9], 'shuffle/single');
}

// ---- assignVariant ----------------------------------------------------------
{
  eq(assignVariant(undefined, 12345), null, 'assignVariant/none');
  eq(assignVariant([], 12345), null, 'assignVariant/empty');
  const forms = ['a', 'b', 'c'];
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(assignVariant(forms, hashSeed(`student${i}@school.org`)));
  eq([...seen].sort(), ['a', 'b', 'c'], 'assignVariant/covers every form');
}

// ---- buildQuizView ----------------------------------------------------------
const q = (id, variant) => ({
  id,
  question: `Q ${id}`,
  options: ['w', 'x', 'y', 'z'],
  answer: 1,
  explanation: 'because',
  ...(variant ? { variant } : {}),
});

// Plain quiz: untouched. This is the whole existing library of module quizzes,
// and it must come out byte-identical to how it was authored.
{
  const config = { questions: [q('q1'), q('q2'), q('q3')] };
  const view = buildQuizView(config, '1-2-31-unit-quiz', 'kid@school.org');
  eq(view.variant, null, 'plain/variant');
  eq(view.questions.map((v) => v.question.id), ['q1', 'q2', 'q3'], 'plain/order');
  eq(view.questions.map((v) => v.order), [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]], 'plain/options');
}

// Variants: every student sees the common questions plus exactly one form's.
{
  const config = {
    variants: ['a', 'b', 'c'],
    questions: [
      q('common1'),
      q('a1', 'a'), q('a2', 'a'),
      q('b1', 'b'), q('b2', 'b'),
      q('c1', 'c'), q('c2', 'c'),
    ],
  };
  const forms = new Set();
  for (let i = 0; i < 60; i++) {
    const who = `kid${i}@school.org`;
    const view = buildQuizView(config, '1-7-1-ch1-test-concepts', who);
    forms.add(view.variant);
    const ids = view.questions.map((v) => v.question.id);
    eq(ids.length, 3, `variants/${who}/count`);
    ok(ids.includes('common1'), `variants/${who}`, 'lost the untagged question');
    const tags = view.questions.map((v) => v.question.variant).filter(Boolean);
    ok(
      new Set(tags).size === 1 && tags[0] === view.variant,
      `variants/${who}`,
      `saw questions from ${JSON.stringify([...new Set(tags)])} on form ${view.variant}`,
    );
  }
  eq([...forms].sort(), ['a', 'b', 'c'], 'variants/spread');

  // Same student, same paper. This is the one that matters during a test.
  const first = buildQuizView(config, '1-7-1-ch1-test-concepts', 'kid7@school.org');
  const again = buildQuizView(config, '1-7-1-ch1-test-concepts', 'kid7@school.org');
  eq(again, first, 'variants/stable across reloads');

  // A different lesson is a different draw, so one student is not pinned to
  // form "a" for the whole year. Sampled over enough lessons to be a claim
  // about the hash rather than about luck -- six lessons landing on one form
  // is a 1-in-243 coincidence that a real seed will hand you eventually.
  const elsewhere = new Set();
  for (let i = 0; i < 60; i++) {
    elsewhere.add(buildQuizView(config, `unit-quiz-${i}`, 'kid7@school.org').variant);
  }
  eq([...elsewhere].sort(), ['a', 'b', 'c'], 'variants/per lesson');
}

// Shuffle: a permutation, never a loss.
{
  const config = { shuffle: true, questions: [q('q1'), q('q2'), q('q3'), q('q4')] };
  const view = buildQuizView(config, '1-7-1-ch1-test-concepts', 'kid@school.org');
  eq(
    view.questions.map((v) => v.question.id).sort(),
    ['q1', 'q2', 'q3', 'q4'],
    'shuffle/keeps every question',
  );
  for (const v of view.questions) {
    eq(v.order.slice().sort(), [0, 1, 2, 3], `shuffle/${v.question.id}/permutation`);
    // The correct answer is still an authored index and is still drawn.
    ok(v.order.includes(v.question.answer), `shuffle/${v.question.id}`, 'the answer was not drawn');
  }
  eq(buildQuizView(config, '1-7-1-ch1-test-concepts', 'kid@school.org'), view, 'shuffle/stable');

  // Two students should not be reading the same paper. Not a guarantee for any
  // single pair -- it is a guarantee across a class.
  const papers = new Set();
  for (let i = 0; i < 25; i++) {
    papers.add(
      JSON.stringify(
        buildQuizView(config, '1-7-1-ch1-test-concepts', `kid${i}@school.org`).questions.map((v) => [
          v.question.id,
          v.order,
        ]),
      ),
    );
  }
  ok(papers.size > 20, 'shuffle/spread', `25 students produced only ${papers.size} distinct papers`);
}

// Shuffle + variants together, which is how a chapter test actually runs.
{
  const config = {
    shuffle: true,
    variants: ['a', 'b'],
    questions: [q('common1'), q('common2'), q('a1', 'a'), q('b1', 'b')],
  };
  for (let i = 0; i < 40; i++) {
    const view = buildQuizView(config, '1-7-1', `kid${i}@school.org`);
    eq(view.questions.length, 3, `both/${i}/count`);
    const ids = view.questions.map((v) => v.question.id);
    ok(ids.includes('common1') && ids.includes('common2'), `both/${i}`, 'lost a common question');
  }
}

// A guest -- nobody signed in -- still gets a stable, complete paper.
{
  const config = { shuffle: true, variants: ['a', 'b'], questions: [q('c1'), q('a1', 'a'), q('b1', 'b')] };
  const g1 = buildQuizView(config, '1-7-1', 'guest');
  const g2 = buildQuizView(config, '1-7-1', 'guest');
  eq(g2, g1, 'guest/stable');
  eq(g1.questions.length, 2, 'guest/count');
}

// An empty quiz is not a crash.
eq(buildQuizView({ questions: [] }, 'x', 'y').questions, [], 'empty/questions');
eq(buildQuizView({}, 'x', 'y').questions, [], 'empty/config');

// ---- redaction: the answer key must not leave the server -------------------
const { redactQuiz, redactLessonForClient, isSummativeQuiz } = require(LIB + '/quiz-redact.js');

{
  const authored = {
    summative: true,
    shuffle: true,
    variants: ['a', 'b'],
    questions: [
      { id: 'q1', question: 'Q1', code: 'let x = 1;', options: ['a', 'b', 'c'], answer: 2,
        explanation: 'because c', source: '1.2.7', variant: 'a' },
      { id: 'q2', question: 'Q2', options: ['a', 'b', 'c'], answer: 0,
        explanation: 'because a', source: '1.2.9', variant: 'b' },
    ],
  };
  const out = redactQuiz(authored);
  const blob = JSON.stringify(out);

  ok(!/"answer"/.test(blob), 'redact/answer', 'an answer index survived redaction');
  ok(!/"explanation"/.test(blob), 'redact/explanation', 'an explanation survived redaction');
  ok(!/because/.test(blob), 'redact/explanation text', 'explanation prose survived redaction');
  ok(!/"source"/.test(blob), 'redact/source', 'the reread hint survived -- it names the topic');

  // Everything a student needs in order to ANSWER must still be there.
  eq(out.questions.map((q) => q.id), ['q1', 'q2'], 'redact/keeps questions');
  eq(out.questions[0].options, ['a', 'b', 'c'], 'redact/keeps options');
  eq(out.questions[0].code, 'let x = 1;', 'redact/keeps code');
  eq(out.questions[0].variant, 'a', 'redact/keeps variant');
  eq(out.variants, ['a', 'b'], 'redact/keeps forms');
  eq(out.summative, true, 'redact/keeps summative');
  eq(out.shuffle, true, 'redact/keeps shuffle');

  // The authored object is untouched -- the server still holds the key.
  eq(authored.questions[0].answer, 2, 'redact/pure');
  eq(authored.questions[0].explanation, 'because c', 'redact/pure explanation');
}

{
  // A module quiz is formative and keeps its marking.
  const formative = { questions: [{ id: 'q1', question: 'Q', options: ['a', 'b', 'c'],
    answer: 1, explanation: 'why' }] };
  eq(isSummativeQuiz(formative), false, 'redact/formative detection');
  eq(redactQuiz(formative), formative, 'redact/formative untouched');
}

{
  // The lesson wrapper is what the server page actually calls.
  const lesson = { id: 'l1', title: 'T', quiz: { summative: true,
    questions: [{ id: 'q1', question: 'Q', options: ['a', 'b'], answer: 1, explanation: 'why' }] } };
  const sent = redactLessonForClient(lesson);
  ok(!/"answer"/.test(JSON.stringify(sent)), 'redact/lesson', 'the key reached the client object');
  eq(sent.title, 'T', 'redact/lesson keeps the rest');
  eq(lesson.quiz.questions[0].answer, 1, 'redact/lesson pure');
  const plain = { id: 'l2', title: 'T2' };
  eq(redactLessonForClient(plain), plain, 'redact/lesson without a quiz');
}

console.log(
  failures ? `\n${failures} FAILURE(S)` : '\nALL PASS  (quiz-variant: seeding, forms, shuffling, redaction)',
);
process.exit(failures ? 1 : 0);
