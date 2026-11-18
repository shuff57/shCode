// The fast Check (lib/clef-check-core.ts, functions/api/clef-check.ts) and the notes request's
// `onlyIds` in functions/api/grade-written.ts, through the real Pages Functions with a fake `AI`
// binding over SQLite (every migration applied).
//
// What it pins down:
//   1. The band: only a sure answer decides a card; anything else (in between, missing, malformed)
//      is unsure and goes to the pattern check, never green.
//   2. The colours: Clef where sure, the pattern check where not. The AI's notes are kept only where
//      the AI agrees with the colour, and never change it.
//   3. The route reads its questions from the server config, never the body; refuses plainly
//      (no config 404, no binding 503, outage 503, too long 400); counts its own daily allowance
//      for students only.
//   4. grade-written honours `onlyIds` only on a lesson with Clef questions, only as a subset.
//   5. The three spike labs carry a question for every card.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-clef-check.mjs   (also part of `npm test`)

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeD1 } from './_d1-sqlite.mjs';
import {
  BAND, band, cardsFromAnswer, clefInputs, clefTask, mergeClefNotes, onlyCards, redIds, resolveClefCards, withHints,
} from '../lib/clef-check-core.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, failures = 0;
const check = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { failures++; console.error(`FAIL: ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
};

// ---------------------------------------------------------------- 1. the band
check('at HI is green', band(BAND.hi), 'met');
check('just under HI is unsure', band(BAND.hi - 0.001), 'unsure');
check('at LO is red', band(BAND.lo), 'missing');
check('just over LO is unsure', band(BAND.lo + 0.001), 'unsure');
check('no number is unsure, never green', [band(null), band(NaN)], ['unsure', 'unsure']);
check('a whole answer that is not Clef-shaped is unusable', [cardsFromAnswer(null, ['a']), cardsFromAnswer({ x: 1 }, ['a'])], [null, null]);
check('a card missing from the answer, or out of range, is unsure',
  cardsFromAnswer({ answers: { a: { noul: 0.99 }, c: { noul: 1.7 } } }, ['a', 'b', 'c']).map((c) => c.verdict),
  ['met', 'unsure', 'unsure']);

// ---------------------------------------------------------------- 2. colours and notes
const report = (passed) => ({ results: Object.entries(passed).map(([id, ok]) => ({ id, status: ok ? 'passed' : 'failed' })) });
const cards = [{ id: 'a', verdict: 'met', p: 0.97 }, { id: 'b', verdict: 'missing', p: 0.02 }, { id: 'c', verdict: 'unsure', p: 0.5 }, { id: 'd', verdict: 'unsure', p: 0.4 }];
const { verdicts: colours, decidedBy } = resolveClefCards(cards, report({ a: false, b: true, c: true, d: false }));
check('Clef decides sure cards whatever the pattern check says', [colours.a.passed, colours.b.passed], [true, false]);
check('the pattern check decides unsure cards', [colours.c.passed, colours.d.passed], [true, false]);
check('decidedBy says which', decidedBy, { a: 'clef', b: 'clef', c: 'pattern', d: 'pattern' });
check('an unsure card the pattern check has no result for stays red',
  resolveClefCards([{ id: 'z', verdict: 'unsure', p: 0.5 }], report({})).verdicts.z.passed, false);
const reqs = [{ id: 'a' }, { id: 'b', hint: 'Look at the else.' }, { id: 'c' }, { id: 'd' }];
check('red cards show their hint before the notes arrive', withHints(colours, reqs),
  { a: { passed: true, feedback: '' }, b: { passed: false, feedback: 'Look at the else.' }, c: { passed: true, feedback: '' }, d: { passed: false, feedback: '' } });
const ai = { a: { passed: false, feedback: 'Missing the switch.' }, b: { passed: false, feedback: 'Add a default label.' }, d: { passed: true, feedback: 'Looks done.' } };
const merged = mergeClefNotes(colours, ai, reqs);
check('notes never change a colour', Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v.passed])),
  Object.fromEntries(Object.entries(colours).map(([k, v]) => [k, v.passed])));
check('an agreeing note is kept', merged.b.feedback, 'Add a default label.');
check('a disagreeing note is dropped (green card, AI says missing)', merged.a.feedback, '');
check('a disagreeing note is dropped (red card, AI says met)', merged.d.feedback, '');
check('redIds lists the red cards', redIds(colours), ['b', 'd']);

// ---------------------------------------------------------------- 4 (pure half). onlyCards
const rub = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
check('onlyCards picks a subset', onlyCards(rub, ['c', 'a']).map((r) => r.id), ['a', 'c']);
check('onlyCards ignores ids it does not know', onlyCards(rub, ['b', 'nope', 7]).map((r) => r.id), ['b']);
check('onlyCards with nothing matching, or no list, is the whole rubric',
  [onlyCards(rub, ['zz']).length, onlyCards(rub, undefined).length, onlyCards(rub, 'a').length], [3, 3, 3]);

check('the task is cut from the prompt before "You cannot run their code"',
  clefTask({ questions: {} }, 'Do the thing. You cannot run their code: read it.'), 'Do the thing.');
check('an authored task wins; a prompt with nothing to cut gives none',
  [clefTask({ questions: {}, task: ' Mine. ' }, 'x'), clefTask({ questions: {} }, 'No marker here.')], ['Mine.', null]);
const inputs = clefInputs({ task: 'T', kind: 'moshion', questions: { a: 'Is it there?' } }, 'code!');
check('the Clef body carries the code as data and every question as noul',
  [inputs.model, inputs.state.student_code, inputs.questions.a, /update\(\)/.test(inputs.state.about)],
  ['clef', 'code!', { type: 'noul', instructions: 'Is it there?' }, true]);

// ---------------------------------------------------------------- 3 + 4. the real handlers
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-clef-'));
try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'functions/api/clef-check.ts', 'functions/api/grade-written.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    '--esModuleInterop', '--moduleResolution', 'node', '--types', '@cloudflare/workers-types', '--noCheck',
  ], { cwd: root, stdio: 'pipe' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const RUBRIC = [
    { id: 'a', title: 'Has a loop', description: 'A loop runs.', points: 0 },
    { id: 'b', title: 'Logs', description: 'It logs.', points: 0 },
  ];
  writeFileSync(
    path.join(out, 'functions', '_shared', 'ai-graders.generated.js'),
    'Object.defineProperty(exports, "__esModule", { value: true });\nexports.AI_GRADERS = ' + JSON.stringify({
      fast: {
        lessonTitle: 'Fast lab', prompt: 'Write a loop. You cannot run their code.', rubric: RUBRIC, contextDocs: [],
        clef: { task: 'Write a loop.', kind: 'console', questions: { a: 'SERVER QUESTION A', b: 'SERVER QUESTION B' } },
      },
      plain: { lessonTitle: 'Plain lab', prompt: 'Write a loop.', rubric: RUBRIC, contextDocs: [] },
    }) + ';\n',
  );
  const load = (f) => import('file://' + path.join(out, 'functions', 'api', f).split(path.sep).join('/'));
  const clefRoute = await load('clef-check.js');
  const gradeRoute = await load('grade-written.js');

  const db = makeD1();
  const ASSETS = {
    fetch: async (req) => {
      const p = new URL(typeof req === 'string' ? req : req.url).pathname;
      const body = p.includes('lessons-manifest') ? JSON.stringify({ lessons: [{ id: 'fast', title: '1.1.1 Fast' }, { id: 'plain', title: '1.2.1 Plain' }] }) : '{}';
      return new Response(body, { headers: { 'Content-Type': 'application/json' } });
    },
  };
  const seen = [];
  let answer = () => ({ answers: { a: { noul: 0.99 }, b: { noul: 0.5 } }, usage: { input_tokens: 900 } });
  const AI = { async run(model, inputs) { seen.push({ model, inputs }); return answer(model, inputs); } };
  const env = (extra = {}) => ({ DB: db, ASSETS, AI, CLEF_CHECK_DAILY_LIMIT: '2', OLLAMA_API_KEY: 'unused', OLLAMA_HOST: 'http://127.0.0.1:9', ...extra });
  const post = async (route, url, body, { role = 'student', email = 'kid@example.test', e = env() } = {}) => {
    const res = await route.onRequestPost({
      request: new Request('https://example.test' + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      env: e, data: { email, role }, params: {}, waitUntil: () => {}, next: async () => new Response(''), functionPath: url,
    });
    return { status: res.status, body: await res.json() };
  };
  const code = 'for (let i = 0; i < 3; i++) console.log(i);';

  let r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code, questions: { a: 'INJECTED' } });
  check('fast Check answers cards in question order with the band applied',
    [r.status, r.body.ok, r.body.cards.map((c) => [c.id, c.verdict])], [200, true, [['a', 'met'], ['b', 'unsure']]]);
  check('it asks Clef with the SERVER questions, never the body\'s',
    [seen.at(-1).model, seen.at(-1).inputs.questions.a.instructions, JSON.stringify(seen.at(-1).inputs).includes('INJECTED')],
    ['@cf/cloudflare/clef', 'SERVER QUESTION A', false]);
  check('the student code reaches Clef only as state', seen.at(-1).inputs.state.student_code, code);

  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code });
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code });
  check('a student past the daily allowance gets 429 + offline (the browser then runs the slow Check)',
    [r.status, r.body.rateLimited, r.body.offline], [429, true, true]);
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code }, { role: 'teacher', email: 't@example.test' });
  check('a teacher is not counted', r.status, 200);
  check('the allowance is its own bucket, not grade-written\'s',
    db.sqlite.prepare("SELECT unit, count FROM ai_help_usage WHERE student_email = 'kid@example.test'").all().map((x) => [x.unit, x.count]),
    [['clef-check', 2]]);

  r = await post(clefRoute, '/api/clef-check', { lessonId: 'plain', response: code }, { email: 'b@example.test' });
  check('a lesson with no Clef questions is 404 + offline', [r.status, r.body.offline], [404, true]);
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code }, { email: 'c@example.test', e: env({ AI: undefined }) });
  check('no binding is 503 + offline', [r.status, r.body.offline], [503, true]);
  answer = () => { throw new Error('boom'); };
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code }, { email: 'd@example.test' });
  check('a Clef outage is 503 + offline, never a grade', [r.status, r.body.ok, r.body.offline], [503, false, true]);
  answer = () => ({ response: 'not a decision' });
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: code }, { email: 'e@example.test' });
  check('an answer with no probabilities is 503 + offline', [r.status, r.body.offline], [503, true]);
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: 'x'.repeat(9000) }, { email: 'f@example.test' });
  check('code over the size limit is 400 before any model call', r.status, 400);
  r = await post(clefRoute, '/api/clef-check', { lessonId: 'fast', response: '   ' }, { email: 'g@example.test' });
  check('empty code is 400', r.status, 400);

  // ---- grade-written `onlyIds`
  answer = (_m, inputs) => ({ response: JSON.stringify({ criteria: [{ id: 'a', earned: 0, verdict: 'missing', feedback: 'n' }, { id: 'b', earned: 0, verdict: 'missing', feedback: 'n' }], summary: 's', hints: [] }), _prompt: inputs });
  const lastPrompt = () => JSON.stringify(seen.at(-1).inputs.messages);
  r = await post(gradeRoute, '/api/grade-written', { lessonId: 'fast', response: code + ' // long enough to grade', onlyIds: ['b'] }, { email: 'h@example.test' });
  check('on a Clef lab the notes request grades only the asked cards',
    [r.status, r.body.criteria.map((c) => c.id), lastPrompt().includes('Has a loop'), lastPrompt().includes('Logs')], [200, ['b'], false, true]);
  r = await post(gradeRoute, '/api/grade-written', { lessonId: 'plain', response: code + ' // long enough to grade', onlyIds: ['b'] }, { email: 'i@example.test' });
  check('on any other lesson onlyIds is ignored (whole rubric)', [r.status, r.body.criteria.map((c) => c.id)], [200, ['a', 'b']]);
  r = await post(gradeRoute, '/api/grade-written', { lessonId: 'fast', response: code + ' // long enough to grade', onlyIds: ['zz'] }, { email: 'j@example.test' });
  check('ids that match nothing grade the whole rubric', r.body.criteria.map((c) => c.id), ['a', 'b']);
} finally {
  rmSync(out, { recursive: true, force: true });
}

// ---------------------------------------------------------------- 5. the spike labs are wired
const gts = readFileSync(path.join(root, 'functions/_shared/ai-graders.generated.ts'), 'utf8');
const G = JSON.parse(gts.slice(gts.indexOf('= {') + 2, gts.lastIndexOf(';')));
for (const id of ['2-3-29-a2-3-1-print-settings-advisor', '5-1-20-moshion-move-keys', '2-2-16-a2-2-1-loop-program']) {
  const g = G[id];
  check(`${id}: a Clef question for every card, task set`,
    [!!g?.clef, g?.rubric.every((r) => (g.clef?.questions[r.id] ?? '').length >= 20), !!g?.clef?.task], [true, true, true]);
}
check('5.1.20 is told moSHion engine facts', G['5-1-20-moshion-move-keys'].clef.kind, 'moshion');

// Chapters 1-3 (2026-11-18): every AI Check lab has a question on each PATTERN card and none on a card
// that runs the code (`tests`), which keeps its runtime result.
{
  const { readdirSync, existsSync } = await import('fs');
  let labs = 0; const wrong = [];
  for (const id of readdirSync(path.join(root, 'lessons'))) {
    if (!/^[123]-/.test(id)) continue;
    const lp = path.join(root, 'lessons', id, 'lesson.json');
    if (!existsSync(lp)) continue;
    const l = JSON.parse(readFileSync(lp, 'utf8'));
    if (!l.aiCheck) continue;
    labs++;
    const g = G[id];
    const rubric = new Set(l.aiCheck.rubric.map((r) => r.id));
    for (const r of l.requirements.filter((r) => rubric.has(r.id))) {
      const pattern = !r.type || r.type === 'regex' || r.type === 'inFunction';
      const has = !!g?.clef?.questions?.[r.id];
      if (pattern !== has) wrong.push(`${id} ${r.id}`);
    }
  }
  check(`chapters 1-3: ${labs} AI Check labs, a question on every pattern card and none on a runtime card`, wrong.slice(0, 5), []);
}

console.log(failures ? `\n${failures} FAILED` : `\nall ${n} passed`);
process.exit(failures ? 1 : 0);
