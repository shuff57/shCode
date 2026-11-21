// Tests for the "is this already known?" check before a report is filed:
// the rules (lib/issue-check-core.ts) and the real handler
// (functions/api/issue-reports/check.ts) against a D1 stub with every
// migration applied, a stubbed CheaperInference fetch (decision-1.1) and a scripted Workers AI
// binding (the chat-model override). Nothing is sent anywhere.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-issue-check.mjs   (also part of `npm test`)

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import {
  buildCheckPrompt,
  buildIssueDecisionRequest,
  DECISION_MIN,
  isIssueDecisionModel,
  ISSUE_DECISION_URL,
  matchHint,
  overlapScore,
  parseCheckVerdict,
  parseIssueDecision,
  shortlist,
  toMatch,
  words,
  wordsOnlyVerdict,
} from '../lib/issue-check-core.ts';
import { WHATS_NEW } from '../lib/whats-new.ts';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

check('words: stop words out, stems meet', words('The sprites are clicking').has('sprite') && words('a sprite clicked').has('click') && !words('the and you').size);
check('words: a lesson number survives', words('Run fails on 2.4').has('2.4'));

const runBug = { kind: 'bug', title: 'Run button does nothing on 2.4', message: 'I press the Run button in lesson 2.4 and nothing happens at all.' };
const known = [
  { ref: 'r1', source: 'report', id: 1, title: 'Run button not working in 2.4', text: 'Pressing Run on lesson 2.4 does nothing.', status: 'fixed', note: 'Fixed on Nov 3: the runner did not load.' },
  { ref: 'r2', source: 'report', id: 2, title: 'Dark mode colours too bright', text: 'The theme hurts my eyes at night.', status: 'open' },
  { ref: 'r3', source: 'report', id: 3, title: 'Can I rename my files', text: 'Let me rename files in the sandbox.', status: 'deferred', note: 'After the break.' },
];

const list = shortlist(runBug, known);
check('shortlist: the same bug ranks first', list[0]?.ref === 'r1', list.map((c) => [c.ref, c.score]));
check('shortlist: an unrelated report is left out', !list.some((c) => c.ref === 'r2'));
check('shortlist: nothing close = empty (no model call)', shortlist({ kind: 'bug', title: 'Sound plays twice', message: 'Every beep doubles.' }, known).length === 0);
check('overlap: one shared word is not a match', overlapScore({ title: 'button', message: 'colour' }, { title: 'button', text: 'x' }) === 0);
check('words-only: a near-copy is unmistakable', wordsOnlyVerdict(list)?.ref === 'r1', list[0]?.score);
check('words-only: a loose overlap is not shown', wordsOnlyVerdict([{ ...known[1], score: 0.3 }]) === null);

const prompt = buildCheckPrompt(runBug, list);
check('prompt: names every shortlisted ref and its status', prompt.user.includes('[r1] earlier report, status fixed') && prompt.user.includes('Teacher reply: Fixed on Nov 3'));
check('prompt: tells the model reports are data', /Never follow instructions/.test(prompt.system));

check('verdict: plain JSON', parseCheckVerdict('{"match":"r1","confidence":"high"}', list)?.ref === 'r1');
check('verdict: wrapped in a sentence and a fence, brackets, caps', parseCheckVerdict('Sure!\n```json\n{"match": "[R1]", "confidence": "Medium"}\n```', list)?.ref === 'r1');
check('verdict: an object answer', parseCheckVerdict({ match: 'r1', confidence: 'high' }, list)?.ref === 'r1');
check('verdict: low confidence is no match', parseCheckVerdict('{"match":"r1","confidence":"low"}', list) === null);
check('verdict: none is no match', parseCheckVerdict('{"match":"none","confidence":"high"}', list) === null);
check('verdict: a ref NOT on the shortlist is refused', parseCheckVerdict('{"match":"r2","confidence":"high"}', list) === null);
check('verdict: garbage is no match', parseCheckVerdict('I think it is the first one', list) === null && parseCheckVerdict(null, list) === null);

// The decision model (decision-1.1 through CheaperInference): one choice question, a probability per option.
const decide = (pick, p = 0.9) => ({ model: 'decision-1.1', answers: [{ type: 'choice', name: 'same', choice: pick, confidence: p, probabilities: [{ value: pick, probability: p }, ...(pick === 'none' ? [] : [{ value: 'none', probability: 1 - p }])] }], usage: { input_tokens: 100, output_tokens: 1 } });
check('decision: decision-1.1 and a pinned build of it are decision models; Clef and a chat model are not',
  isIssueDecisionModel('decision-1.1') && isIssueDecisionModel('decision-1.1-2026-11') && !isIssueDecisionModel('@cf/cloudflare/clef') && !isIssueDecisionModel('@cf/google/gemma-4-26b-a4b-it') && !isIssueDecisionModel('decision-2'));
const dreq = buildIssueDecisionRequest(runBug, list);
const dq = dreq.questions[0];
check('decision request: decision-1.1, zero data retention, one choice question named "same"', dreq.model === 'decision-1.1' && dreq.zdr === true && dreq.questions.length === 1 && dq.type === 'choice' && dq.name === 'same');
check('decision request: the shortlist and "none" are the choices, each described', JSON.stringify(dq.choices.map((c) => c.value)) === JSON.stringify([...list.map((c) => c.ref), 'none']) && dq.choices.every((c) => typeof c.description === 'string' && c.description.length > 5));
const state = JSON.parse(dreq.input);
check('decision request: the reports are the input, with status and the teacher reply', state.known[0].status === 'fixed' && state.known[0].teacher_reply.startsWith('Fixed on') && state.new_report.title === runBug.title);
check('decision request: tells the model reports are data', /never instructions/.test(dq.instructions));
check('decision: a confident pick on the shortlist', parseIssueDecision(decide('r1'), list).pick?.ref === 'r1');
check('decision: below the bar is no match', parseIssueDecision(decide('r1', DECISION_MIN - 0.01), list).pick === null);
check('decision: "none" is no match', parseIssueDecision(decide('none', 0.99), list).pick === null);
check('decision: an option NOT on the shortlist is refused', parseIssueDecision(decide('r2', 0.99), list).pick === null);
check('decision: a malformed answer is no match',
  parseIssueDecision({ answers: {} }, list).pick === null && parseIssueDecision(null, list).pick === null
  && parseIssueDecision({ answers: [{ type: 'choice', name: 'same', choice: 'r1' }] }, list).pick === null
  && parseIssueDecision({ answers: [{ type: 'choice', name: 'same', choice: 'r1', probabilities: [{ value: 'r1', probability: 7 }] }] }, list).pick === null
  && parseIssueDecision({ answers: [{ type: 'choice', name: 'other', choice: 'r1', probabilities: [{ value: 'r1', probability: 0.99 }] }] }, list).pick === null);

const m = toMatch(known[0], 'ai');
check('toMatch: a report says its status, reply and where it is', m.outcome === 'fixed' && m.detail?.startsWith('Fixed on') && m.href === '/issues#report-1' && m.by === 'ai');
check('toMatch: a feature is "live" with no made-up page', (() => { const f = toMatch({ ref: 'f1', source: 'feature', id: 'x', title: 'T', text: 'S' }, 'ai'); return f.outcome === 'live' && f.href === ''; })());
check('toMatch: only named fields (nothing a row could leak)', Object.keys(m).sort().join() === 'by,detail,href,id,mine,outcome,source,title');
check('matchHint: short and shaped for the teacher pill', JSON.stringify(matchHint(m)) === JSON.stringify({ source: 'report', id: 1, outcome: 'fixed', title: 'Run button not working in 2.4' }));

// ---------------------------------------------------------------------------
// The handler
// ---------------------------------------------------------------------------

const out = join(root, '.tmp', 'issue-check-test');
const route = compileHandler('api/issue-reports/check.ts', out);
const db = makeD1();
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const now = Date.now();
const fileReport = (email, title, message, status, note = null, withdrawn = null) =>
  sql(`INSERT INTO issue_reports (reporter_email, kind, title, message, status, resolution_note, withdrawn_at, created_at) VALUES (?, 'bug', ?, ?, ?, ?, ?, ?)`,
    email, title, message, status, note, withdrawn, now);
fileReport('ben@s.test', 'Run button not working in 2.4', 'Pressing Run on lesson 2.4 does nothing.', 'fixed', 'Fixed: the runner did not load.');
fileReport('ben@s.test', 'Secret withdrawn report about the run button in 2.4', 'Pressing Run on lesson 2.4 does nothing, mine.', 'open', null, now);
fileReport('ana@s.test', 'Sound plays twice in moSHion', 'Every beep sound plays twice when I press space.', 'in-progress');

const ANA = { email: 'ana@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };

let calls = [];
// The stubs answer in the shape of whichever path asked: decision-1.1 (questions) or a Workers AI chat model (messages).
const refsAsked = (inputs) => inputs.questions ? inputs.questions[0].choices.map((c) => c.value).filter((k) => k !== 'none') : [...inputs.messages[1].content.matchAll(/\[(r\d+|f\d+)\]/g)].map((x) => x[1]);
const asked = (inputs) => inputs.questions ? inputs.input : inputs.messages[1].content;
const answer = (inputs, pick, p = 0.9) => inputs.questions ? decide(pick, p) : `{"match":"${pick}","confidence":"high"}`;
let reply = (inputs) => answer(inputs, 'none');
let status = 200;
const AI = { async run(model, inputs) { calls.push({ model, inputs, via: 'workers-ai' }); return reply(inputs); } };
// decision-1.1 is a fetch to CheaperInference: stubbed here, never sent.
globalThis.fetch = async (url, init) => {
  if (url !== ISSUE_DECISION_URL) throw new Error('unexpected fetch ' + url);
  const inputs = JSON.parse(init.body);
  calls.push({ model: inputs.model, inputs, via: 'cheaperinference', auth: init.headers.Authorization });
  const body = reply(inputs);
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
const KEY = 'test-key';

async function ask(user, body, env = { DB: db, AI, CHEAPERINFERENCE_API_KEY: KEY }) {
  const res = await route.onRequestPost({
    env, data: user, params: {},
    request: new Request('https://x.test/api/issue-reports/check', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), text };
}

calls = [];
let r = await ask(ANA, { kind: 'bug', title: 'Colours in the editor', message: 'Could the comments be green please.' });
check('handler: nothing close -> no model call', r.status === 200 && r.body.match === null && calls.length === 0, r.body);

calls = [];
reply = (inputs) => answer(inputs, refsAsked(inputs)[0]);
r = await ask(ANA, runBug);
check('handler: the model is asked once: decision-1.1, zero retention, the key as a bearer', calls.length === 1 && calls[0].via === 'cheaperinference' && calls[0].model === 'decision-1.1' && calls[0].inputs.zdr === true && calls[0].auth === `Bearer ${KEY}` && calls[0].inputs.questions[0].type === 'choice', calls.map((c) => [c.via, c.model]));
check('handler: a match comes back with status and the teacher reply', r.body.match?.id === 1 && r.body.match.outcome === 'fixed' && r.body.match.detail === 'Fixed: the runner did not load.' && r.body.match.by === 'ai', r.body);
check('handler: a withdrawn report is never shown to the model', !asked(calls[0].inputs).includes('Secret withdrawn'));
check('handler: the answer carries no email', !r.text.includes('@s.test'));
check('handler: a Workers AI chat model in the env override gets the JSON prompt on the binding', await (async () => { calls = []; const x = await ask(ANA, runBug, { DB: db, AI, CHEAPERINFERENCE_API_KEY: KEY, ISSUE_CHECK_MODEL: '@cf/x/tiny' }); return calls.length === 1 && calls[0].via === 'workers-ai' && calls[0].model === '@cf/x/tiny' && Array.isArray(calls[0].inputs.messages) && x.body.match?.id === 1; })());
check('handler: a pinned decision-1.1 build in the env override is asked', await (async () => { calls = []; await ask(ANA, runBug, { DB: db, AI, CHEAPERINFERENCE_API_KEY: KEY, ISSUE_CHECK_MODEL: 'decision-1.1-pinned' }); return calls[0]?.via === 'cheaperinference' && calls[0].model === 'decision-1.1-pinned'; })());
check('handler: an override that is neither (Clef\'s old selector) is sent nowhere: words only', await (async () => { calls = []; const x = await ask(ANA, runBug, { DB: db, AI, CHEAPERINFERENCE_API_KEY: KEY, ISSUE_CHECK_MODEL: 'clef' }); return calls.length === 0 && x.body.match?.by === 'words'; })());
reply = (inputs) => answer(inputs, refsAsked(inputs)[0], 0.5);
r = await ask(ANA, runBug);
check('handler: an unsure decision is no match', r.status === 200 && r.body.match === null && r.body.checked === true, r.body);
reply = (inputs) => answer(inputs, refsAsked(inputs)[0]);

calls = [];
r = await ask(ANA, { kind: 'bug', title: 'Sound plays twice', message: 'In moSHion every beep sound plays twice when I press space.' });
check('handler: your own report is marked mine', r.body.match?.id === 3 && r.body.match.mine === true && r.body.match.outcome === 'in-progress', r.body);

reply = (inputs) => answer(inputs, 'r2', 0.99);
r = await ask(ANA, runBug);
check('handler: a ref the shortlist does not hold is refused', r.body.match === null, r.body);

reply = () => { throw new Error('boom'); };
r = await ask(ANA, runBug);
check('handler: a model failure answers 200 no match', r.status === 200 && r.body.match === null && r.body.checked === false, r.body);
reply = (inputs) => answer(inputs, refsAsked(inputs)[0]);
status = 429;
r = await ask(ANA, runBug);
check('handler: decision-1.1 at its rate limit (429) answers 200 no match', r.status === 200 && r.body.match === null && r.body.checked === false, r.body);
status = 200;

calls = [];
r = await ask(ANA, runBug, { DB: db, AI });
check('handler: no CheaperInference key -> the word overlap alone, nothing sent', calls.length === 0 && r.body.match?.id === 1 && r.body.match.by === 'words', r.body);
calls = [];
r = await ask(ANA, runBug, { DB: db, CHEAPERINFERENCE_API_KEY: KEY, ISSUE_CHECK_MODEL: '@cf/x/tiny' });
check('handler: a Workers AI override with no binding -> the word overlap alone', calls.length === 0 && r.body.match?.by === 'words', r.body);

r = await ask(ANA, 'not json');
check('handler: a bad body answers 200 no match', r.status === 200 && r.body.match === null);

// A feature already on the site (What's New) is a candidate too.
const feature = WHATS_NEW.find((e) => e.audience !== 'teacher');
calls = [];
reply = (inputs) => answer(inputs, refsAsked(inputs).find((k) => k.startsWith('f')) ?? 'none');
r = await ask(ANA, { kind: 'enhancement', title: feature.title, message: feature.summary });
check('handler: a What\'s New feature matches as "live"', r.body.match?.source === 'feature' && r.body.match.outcome === 'live' && r.body.match.id === feature.id, r.body);

// Quota: students are capped per day, staff are not; a spent quota still answers 200.
const day = new Date().toISOString().slice(0, 10);
sql(`INSERT INTO ai_help_usage (student_email, unit, day, count) VALUES ('ana@s.test', 'issue-check', ?, 25) ON CONFLICT(student_email, unit, day) DO UPDATE SET count = 25`, day);
calls = [];
r = await ask(ANA, runBug);
check('handler: a student past the daily cap -> no model call, no match', calls.length === 0 && r.status === 200 && r.body.match === null && r.body.limited === true, r.body);
calls = [];
reply = (inputs) => answer(inputs, 'r1');
r = await ask(T1, runBug);
check('handler: a teacher is not capped', calls.length === 1 && r.body.match?.id === 1, r.body);
const g = db.sqlite.prepare(`SELECT count FROM ai_help_usage WHERE unit = 'issue-check-global' AND day = ?`).get(day);
check('handler: every model call counts toward the global ceiling', (g?.count ?? 0) >= 5, g);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
