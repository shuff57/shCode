// lib/decision-check-core.ts (the DRAFT CheaperInference adapter), offline: no network, no key.
// Pins down the request shape and that every malformed answer degrades to "unsure", never green.
// Run: node --import ./scripts/register-ts.mjs scripts/test-decision-check.mjs
// Not in `npm test`: the module is not wired into any route yet.

import { DECISION_MODEL, DECISION_URL, askDecision, decisionBand, decisionRequest, cardsFromDecisionAnswer } from '../lib/decision-check-core.ts';
import { BAND, band } from '../lib/clef-check-core.ts';

let n = 0, failures = 0;
const check = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { failures++; console.error(`FAIL: ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
};

const cfg = { task: 'Make a sprite move.', kind: 'moshion', questions: { r1: 'Is there a canvas?', r2: 'Does it move?' } };
const req = decisionRequest(cfg, 'let x = 1;');
check('model is decision-1.1 by default', req.model, DECISION_MODEL);
check('one named predicate per card, in order', req.questions.map((q) => [q.type, q.name]), [['predicate', 'r1'], ['predicate', 'r2']]);
check('the question text is the config\'s own', req.questions[1].instructions, 'Does it move?');
const state = JSON.parse(req.input);
check('state carries the engine facts, the task and the code', [typeof state.about, state.task, state.student_code], ['string', 'Make a sprite move.', 'let x = 1;']);
check('the body holds nothing else the caller could steer', Object.keys(req).sort(), ['input', 'model', 'questions', 'zdr']);
check('every request asks for zero data retention', req.zdr, true);

const ok = { answers: [{ type: 'predicate', name: 'r1', probability: 0.97 }, { type: 'predicate', name: 'r2', probability: 0.04 }] };
check('sure answers: met and missing', cardsFromDecisionAnswer(ok, ['r1', 'r2']).map((c) => c.verdict), ['met', 'missing']);
check('order of the answers does not matter (matched by name)',
  cardsFromDecisionAnswer({ answers: [...ok.answers].reverse() }, ['r1', 'r2']).map((c) => [c.id, c.verdict]), [['r1', 'met'], ['r2', 'missing']]);
check('in between is unsure', cardsFromDecisionAnswer({ answers: [{ type: 'predicate', name: 'r1', probability: 0.5 }] }, ['r1'])[0].verdict, 'unsure');
check('a refusal is unsure, never green', cardsFromDecisionAnswer({ answers: [{ type: 'refusal', name: 'r1' }] }, ['r1'])[0].verdict, 'unsure');
check('a missing answer is unsure', cardsFromDecisionAnswer({ answers: [] }, ['r1'])[0].verdict, 'unsure');
check('a probability out of range is unsure', cardsFromDecisionAnswer({ answers: [{ type: 'predicate', name: 'r1', probability: 1.5 }] }, ['r1'])[0].verdict, 'unsure');
check('a probability that is not a number is unsure', cardsFromDecisionAnswer({ answers: [{ type: 'predicate', name: 'r1', probability: '0.99' }] }, ['r1'])[0].verdict, 'unsure');
check('a choice answer is not read as a yes', cardsFromDecisionAnswer({ answers: [{ type: 'choice', name: 'r1', choice: true }] }, ['r1'])[0].verdict, 'unsure');
check('a whole answer that is not an array is unusable', [cardsFromDecisionAnswer(null, ['r1']), cardsFromDecisionAnswer({ answers: {} }, ['r1']), cardsFromDecisionAnswer('x', ['r1'])], [null, null, null]);

// this model's own band (0.80 / 0.15), distinct from Clef's 0.85 / 0.15
check('0.80 is met here (it is unsure at Clef\'s 0.85)', [decisionBand(0.8), band(0.8)], ['met', 'unsure']);
check('just under 0.80 is unsure', decisionBand(0.799), 'unsure');
check('0.15 is missing, 0.16 is unsure', [decisionBand(0.15), decisionBand(0.16)], ['missing', 'unsure']);
check('no number is unsure, never green', [decisionBand(null), decisionBand(NaN)], ['unsure', 'unsure']);
check('cards from an answer use this model\'s band', cardsFromDecisionAnswer({ answers: [{ type: 'predicate', name: 'r1', probability: 0.82 }] }, ['r1'])[0].verdict, 'met');
check('Clef\'s own band is untouched', [BAND.hi, BAND.lo], [0.85, 0.15]);

// askDecision: every failure is null (the route then answers offline), never a throw and never a guess
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const seen = [];
const spy = async (url, init) => { seen.push([url, init.method, init.headers.Authorization, JSON.parse(init.body).model]); return reply(200, ok)(); };
check('a good answer gives cards', (await askDecision(spy, 'k', cfg, 'x')).map((c) => c.verdict), ['met', 'missing']);
check('it posts to the decisions URL with the bearer key and the model', seen[0], [DECISION_URL, 'POST', 'Bearer k', DECISION_MODEL]);
check('429 (the per-minute limit) is null, so the browser runs the slow Check', await askDecision(reply(429, { error: 'rate' }), 'k', cfg, 'x'), null);
check('503 is null', await askDecision(reply(503, {}), 'k', cfg, 'x'), null);
check('401 is null', await askDecision(reply(401, {}), 'k', cfg, 'x'), null);
check('a network error is null, not a throw', await askDecision(async () => { throw new Error('down'); }, 'k', cfg, 'x'), null);
check('a body that is not JSON is null', await askDecision(async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad'); } }), 'k', cfg, 'x'), null);
check('a 200 with no answers array is null', await askDecision(reply(200, { nope: 1 }), 'k', cfg, 'x'), null);

// ---------------------------------------------------------------- the route (functions/api/clef-check.ts)
// The REAL handler over an in-memory D1, with fetch stubbed: no network, no key.
{
  const { makeD1 } = await import('./_d1-sqlite.mjs');
  const { onRequestPost } = await import('../functions/api/clef-check.ts');
  const LAB = '2-1-36-lab-settings-advisor';
  const generated = (await import('../functions/_shared/ai-graders.generated.ts')).default ?? (await import('../functions/_shared/ai-graders.generated.ts'));
  const cfgQs = (generated.AI_GRADERS ?? generated.default ?? generated)[LAB]?.clef?.questions;
  const NO_ASSETS = { async fetch() { return new Response('not found', { status: 404 }); } };
  const call = async (env, body, role = 'student') => {
    const request = new Request('http://localhost/api/clef-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const res = await onRequestPost({ request, params: {}, data: { email: 'a@b.c', role }, env: { DB: makeD1(), ASSETS: NO_ASSETS, ...env } });
    return { status: res.status, json: await res.json() };
  };
  const realFetch = globalThis.fetch;
  const sent = [];
  const stub = (status, body, throws) => { globalThis.fetch = async (url, init) => { sent.push({ url: String(url), init }); if (throws) throw new Error('down'); return new Response(JSON.stringify(body), { status }); }; };
  try {
    check('route: no CHEAPERINFERENCE_API_KEY is 503 offline (the slow Check)', await call({}, { lessonId: LAB, response: 'let a = 1;' }).then((r) => [r.status, r.json.offline]), [503, true]);
    const ids = Object.keys(cfgQs);
    stub(200, { answers: ids.map((id, i) => ({ type: 'predicate', name: id, probability: i === 0 ? 0.97 : 0.02 })) });
    const ok = await call({ CHEAPERINFERENCE_API_KEY: 'k1' }, { lessonId: LAB, response: 'let a = 1;', questions: { x: 'steer me' }, model: 'evil' });
    check('route: a good answer is 200 with the cards, banded at this model\'s lines', [ok.status, ok.json.cards.map((c) => c.verdict)], [200, ids.map((_, i) => (i === 0 ? 'met' : 'missing'))]);
    const posted = JSON.parse(sent.at(-1).init.body);
    check('route: it calls the decisions URL with the bearer key', [sent.at(-1).url, sent.at(-1).init.headers.Authorization], [DECISION_URL, 'Bearer k1']);
    check('route: zero data retention is on the wire', posted.zdr, true);
    check('route: questions and model are the server\'s, never the body\'s', [posted.model, posted.questions.map((q) => q.name), posted.questions.map((q) => q.instructions)], [DECISION_MODEL, ids, ids.map((id) => cfgQs[id])]);
    stub(429, { error: 'rate' });
    check('route: the provider\'s 429 is 503 offline, not a 429 to the student', await call({ CHEAPERINFERENCE_API_KEY: 'k1' }, { lessonId: LAB, response: 'let a = 1;' }).then((r) => [r.status, r.json.offline]), [503, true]);
    stub(0, null, true);
    check('route: a network failure is 503 offline', await call({ CHEAPERINFERENCE_API_KEY: 'k1' }, { lessonId: LAB, response: 'let a = 1;' }).then((r) => [r.status, r.json.offline]), [503, true]);
    stub(200, { nope: 1 });
    check('route: an unusable answer is 503 offline', await call({ CHEAPERINFERENCE_API_KEY: 'k1' }, { lessonId: LAB, response: 'let a = 1;' }).then((r) => [r.status, r.json.offline]), [503, true]);
    const before = sent.length;
    check('route: a lesson with no fast check is 404 and makes no call', await call({ CHEAPERINFERENCE_API_KEY: 'k1' }, { lessonId: 'no-such-lesson', response: 'x' }).then((r) => [r.status, sent.length === before]), [404, true]);
  } finally {
    globalThis.fetch = realFetch;
  }
}

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log(`\n${n} checks passed`);
