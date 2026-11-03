// The "Grade with AI" button's pure halves (lib/ai-check.ts): turning the grader's criteria into
// verdicts, laying them over the Quest cards, and what Submit records. Also measures that the
// lessons carrying `aiCheck` are wired: every rubric id is a requirement id, the server has the
// grader (functions/_shared/ai-graders.generated.ts), and the lesson is NOT an `aiGrader` lesson
// (that field makes it a scored written part everywhere).
// Run: node --import ./scripts/register-ts.mjs scripts/test-ai-check.mjs

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as aiCheckLib from '../lib/ai-check.ts';
const { applyAiVerdicts, reportFromRequirements, verdictsFromCriteria } = aiCheckLib;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, failures = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.log('  FAIL  ' + msg); } };

const reqs = ['r1', 'r2', 'r3'].map((id) => ({ id, title: id, description: '', status: 'failed', messages: ['regex says no'] }));

// verdicts: only a clear "met" is green; unknown ids and junk are ignored
const v = verdictsFromCriteria(
  [
    { id: 'r1', verdict: 'met', feedback: ' good ' },
    { id: 'r2', verdict: 'partial', feedback: 'close' },
    { id: 'r3', verdict: 'missing' },
    { id: 'zz', verdict: 'met' },
  ],
  ['r1', 'r2', 'r3'],
);
check(v.r1.passed === true && v.r1.feedback === 'good', 'met is green, feedback trimmed');
check(v.r2.passed === false && v.r3.passed === false, 'partial and missing stay red');
check(!('zz' in v), 'an id that is not a requirement is ignored');

// overlay
const out = applyAiVerdicts(reqs, v);
check(out[0].status === 'passed' && out[0].messages[0] === 'good', 'a met card turns green and shows the AI note');
check(out[1].status === 'failed' && out[1].messages[0] === 'close', 'a partial card is red with the AI note');
check(out[2].status === 'failed' && out[2].messages.length === 0, 'a missing card with no note has no message (the regex hint is replaced, not stacked)');
check(applyAiVerdicts(reqs, null) === reqs, 'no verdicts: the cards are untouched');
check(applyAiVerdicts(reqs, { r1: { passed: true, feedback: '' } })[1] === reqs[1], 'a card with no verdict keeps what it had');

// submit report
const rep = reportFromRequirements(out);
check(rep.passed === false && rep.results.length === 3 && rep.totalPossible === 0, 'report: one red card means not passed, 0-point lab');
const allGreen = applyAiVerdicts(reqs, Object.fromEntries(reqs.map((r) => [r.id, { passed: true, feedback: '' }])));
check(reportFromRequirements(allGreen).passed === true, 'report: all green is passed');
check(reportFromRequirements([]).passed === false, 'report: no cards is not passed');
// a scored lab keeps its points when the AI's verdicts replace the pattern check's
const scored = [
  { id: 'a', title: 'a', description: '', status: 'passed', points: 10 },
  { id: 'b', title: 'b', description: '', status: 'failed', points: 5 },
  { id: 'c', title: 'c', description: '', status: 'passed', points: 15 },
];
const sr = reportFromRequirements(scored, 20);
check(sr.totalScore === 25 && sr.totalPossible === 30, 'report: green cards earn their points');
check(sr.passed === true && sr.passingScore === 20, 'report: a scored lab passes on its passing score, not on every card');
check(reportFromRequirements(scored, 28).passed === false, 'report: below the passing score is not passed');

// The pattern-check fallback (AI unreachable) grades through the runner a plain Run of the lab uses.
// It used to call the console runner on every code lab, so a moSHion sketch with top-level sprite
// code showed "ReferenceError: Canvas is not defined" after Check and Submit locked.
const { fallbackRunner } = aiCheckLib;
check(typeof fallbackRunner === 'function', 'lib/ai-check.ts exports fallbackRunner');
if (typeof fallbackRunner === 'function') {
  check(fallbackRunner({ preview: 'moshion' }) === 'moshion', 'fallback: a moSHion lab runs in the moSHion runner');
  check(fallbackRunner({ preview: 'console' }) === 'console', 'fallback: a console lab runs in the console runner (unchanged)');
  check(fallbackRunner({ editor: 'text', preview: 'console' }) === 'grade', 'fallback: a text lab only grades the file (unchanged)');
}
{
  const lw = readFileSync(path.join(root, 'components/LessonWorkspace.tsx'), 'utf8');
  const start = lw.indexOf('const fallBackToPatternCheck');
  const body = start < 0 ? '' : lw.slice(start, lw.indexOf('\n  };', start));
  check(body.includes('fallbackRunner(lesson)'), 'LessonWorkspace: the fallback picks its runner with fallbackRunner(lesson)');
  check(/runner === 'moshion'\)\s*runQ5\(\)/.test(body), 'LessonWorkspace: the fallback runs a moSHion lab through runQ5()');
  check(!/^\s*else runCode\(\);\s*$/m.test(body.split('fallbackRunner')[0] ?? ''), 'LessonWorkspace: no unconditional runCode() before the runner is picked');
}

// A sketch that threw is not submittable through Check (5.1.25, 2026-11-03). With the AI
// unreachable, Check's fallback re-runs the sketch (runQ5 clears the run error) and marks the cards
// 400 ms later. On a cold load the frame had not reported by then, so `!runtimeError` alone let
// Submit through with four green cards until the error arrived. The run is now "pending" until its
// frame reports: an error, or `preview-status` once the first frame ran clean.
const { runLetsSubmit } = aiCheckLib;
check(typeof runLetsSubmit === 'function', 'lib/ai-check.ts exports runLetsSubmit');
if (typeof runLetsSubmit === 'function') {
  const ERR = "Error: world.origin = 'math' must come before any sprite is made (line 7, col 16)";
  // The Check-fallback sequence on a sketch that throws, step by step.
  const afterRunQ5 = { error: null, pending: true };        // runQ5(): error cleared, frame loading
  check(!runLetsSubmit(afterRunQ5), 'fallback on a throwing sketch: Submit stays shut while the re-run has not reported (cards already green at 400 ms)');
  const oldGate = (run) => !run.error;
  check(oldGate(afterRunQ5) === true, 'calibration: the old gate (!runtimeError alone) was open at that moment');
  const afterError = { error: ERR, pending: false };         // the frame posts preview-error
  check(!runLetsSubmit(afterError), 'fallback on a throwing sketch: Submit stays shut once the error arrives');
  // The same sequence on a sketch that runs clean: only the grading failed.
  check(runLetsSubmit({ error: null, pending: false }), 'fallback on a clean sketch: Submit opens once the frame reports it came up');
  // Everything else keeps its old answer.
  check(runLetsSubmit({ error: null, pending: false }) === true, 'no run yet, or a clean run: open (unchanged)');
  check(runLetsSubmit({ error: ERR, pending: false }) === false, 'a run error: shut (unchanged)');
  check(runLetsSubmit({ error: ERR, pending: false }, true) === true, 'expectsRuntimeError accepts the error (unchanged)');
  check(runLetsSubmit({ error: null, pending: true }, true) === false, 'expectsRuntimeError does not accept a run that has not reported');
}
// The moSHion Submit gate (owner decision 2026-11-03): green cards AND a clean Run of the SAME
// code. Check's AI path reads the text and never runs it: with the grader mocked all-met, a sketch
// with `nope();` first in setup() lit Submit 2.2 s after Check with no frame ever mounted (5.1 walk,
// round 2, N1). The record is exact text; a late error clears it (N7).
const { canSubmitMoshion, moshionRunNeed, moshionRunStep, moshionSubmitWords, NO_MOSHION_RUN } = aiCheckLib;
check(typeof canSubmitMoshion === 'function' && typeof moshionRunStep === 'function', 'lib/ai-check.ts exports canSubmitMoshion and moshionRunStep');
if (typeof canSubmitMoshion === 'function' && typeof moshionRunStep === 'function') {
  const CODE = "let box;\nfunction setup() {\n  new Canvas(400, 400);\n  box = new Sprite(100, 50, 40, 40);\n}\n";
  const step = (run, ...evs) => evs.reduce((r, ev) => moshionRunStep(r, ev), run);
  const gate = (run, currentText = CODE, cardsOk = true, expectsRuntimeError = false) => canSubmitMoshion({ cardsOk, run, currentText, expectsRuntimeError });
  const ran = step(NO_MOSHION_RUN, { type: 'run', text: CODE });
  const clean = step(ran, { type: 'came-up' });

  check(!gate(NO_MOSHION_RUN), 'never ran: shut, even with every card green');
  check(moshionRunNeed(NO_MOSHION_RUN, CODE) === 'run', 'never ran: the need is "run"');
  check(!gate(NO_MOSHION_RUN, CODE, true), 'AI green + never ran = blocked (the N1 hole)');
  check(!gate(ran), 'a run in flight (frame has not reported): shut');
  check(moshionRunNeed(ran, CODE) === 'wait', 'a run in flight: the need is "wait"');
  check(gate(clean), 'ran clean, same text, green cards: open');
  check(!gate(clean, CODE, false), 'ran clean, cards not green: shut');
  check(!gate(clean, CODE + '  nope();\n'), 'ran clean then edited: shut');
  check(moshionRunNeed(clean, CODE + 'x') === 'rerun', 'ran clean then edited: the need is "rerun"');
  check(!gate(clean, CODE + ' '), 'a whitespace-only edit also needs a new Run (exact text, as the AI marks)');
  check(gate(clean, CODE), 'edited and typed back to the run text: open again (it is the same code)');
  const late = step(clean, { type: 'error' });
  check(!gate(late), 'ran clean then a late error (frame 30, a timer): shut at once');
  check(moshionRunNeed(late, CODE) === 'fix', 'a late error: the need is "fix"');
  check(!gate(step(late, { type: 'stop' })), 'Stop after a late error keeps it shut (the code crashed)');
  check(!gate(step(late, { type: 'came-up' })), 'a "came up" after an error does not re-open it');
  check(gate(step(late, { type: 'run', text: CODE }, { type: 'came-up' })), 'a fresh clean Run of the code re-opens it');
  check(gate(step(clean, { type: 'stop' })), 'Stop after a clean run: still open (that code ran clean)');
  check(!gate(step(ran, { type: 'stop' })), 'Stop before the frame reported: shut (it never came up)');
  check(moshionRunNeed(step(ran, { type: 'stop' }), CODE) === 'run', 'Stop before the frame reported: the need is "run"');
  const crashed = step(ran, { type: 'error' });
  check(!gate(crashed), 'a run that threw at boot: shut');
  check(gate(crashed, CODE, true, true), 'expectsRuntimeError: a run that threw, of the same code, counts');
  check(!gate(ran, CODE, true, true), 'expectsRuntimeError: a run that has not reported does not');
  check(!gate(crashed, CODE + 'x', true, true), 'expectsRuntimeError: an edit after the run still needs a new Run');
  // A new Run of edited code replaces the record; the old clean run does not carry over.
  check(!gate(step(clean, { type: 'run', text: CODE + 'x' }), CODE + 'x'), 'Run again after an edit: shut until that run reports');

  // The words beside a shut Submit.
  const w = (need, cardsOk, aiCheck = true) => moshionSubmitWords({ need, cardsOk, aiCheck });
  check(w('run', false).note === 'press Run, then Check', 'header: neither Run nor Check yet says "press Run, then Check"');
  check(w(null, false).note === 'press Check to mark them', 'header: ran clean, cards not marked keeps "press Check to mark them"');
  check(w('wait', false).note === 'press Check to mark them', 'header: a run in flight does not ask for another Run');
  check(w('rerun', false).note === 'press Run, then Check' && w('fix', false).note === 'press Run, then Check', 'header: an edit or a crash asks for Run, then Check');
  check(w('run', true).line === 'Press Run so we can see your sketch work, then Submit.', 'header, cards green, never ran: the plain sentence');
  check(/changed your code since the last Run/.test(w('rerun', true).line ?? ''), 'header, cards green, edited since the run: says so');
  check(/stopped with an error/.test(w('fix', true).line ?? ''), 'header, cards green, the run crashed: says so');
  check(w('wait', true).line === undefined && /starting/.test(w('wait', true).title ?? ''), 'a run in flight: no header line (it would flash on every Run), but Submit\'s hover says why');
  check(Object.keys(w(null, true)).length === 0, 'nothing in the way: no words at all');
  check(/Press Run, then Check/.test(w('run', false).title ?? ''), 'Submit hover, neither yet: "Press Run, then Check"');
  check(/Press Check/.test(w(null, false).title ?? ''), 'Submit hover, ran clean, cards red: "Press Check"');
  check(w('run', false, false).note === 'press Run to mark them' && w(null, false, false).note === undefined, 'a lab with no AI Check: Run marks the cards, so the note says Run');
}
{
  const lw = readFileSync(path.join(root, 'components/LessonWorkspace.tsx'), 'utf8');
  const fn = (name) => { const s = lw.indexOf(`function ${name}(`); return s < 0 ? '' : lw.slice(s, lw.indexOf('\n  }', s)); };
  const q5 = fn('runQ5');
  check(/moshionRunStep\(r, \{ type: 'run', text: code \}\)/.test(q5), 'LessonWorkspace: runQ5() records the text it runs');
  check(/useLessonStore\.getState\(\)\.fileContents\['script\.js'\]/.test(q5), 'LessonWorkspace: runQ5() runs the store\'s text, not a stale render\'s');
  check(/setQ5Code\(code\)/.test(q5), 'LessonWorkspace: runQ5() runs exactly the text it records');
  check(/moshionRunStep\(r, \{ type: 'stop' \}\)/.test(fn('stopRun')), 'LessonWorkspace: Stop ends a pending run without forgetting a crash');
  const handler = lw.slice(lw.indexOf("data.source === 'preview-status'"), lw.indexOf('setRuntimeError(err.hint'));
  check(/if \(fromLabFrame\) setMoshionRun\(\(r\) => moshionRunStep\(r, \{ type: 'came-up' \}\)\)/.test(handler), "LessonWorkspace: only the lab's own frame's preview-status counts as a clean run");
  check(/if \(isMoshionRef\.current && !fromLabFrame\) return;\s*(\/\/[^\n]*\s*)*setMoshionRun\(\(r\) => moshionRunStep\(r, \{ type: 'error' \}\)\)/.test(handler), "LessonWorkspace: a preview-error from the lab's frame clears the clean-run record");
  check(/canSubmitMoshion\(\{ cardsOk: allRequirementsPassed, run: moshionRun, currentText: moshionText, expectsRuntimeError \}\)/.test(lw), 'LessonWorkspace: a moSHion lab gates Submit on canSubmitMoshion');
  const ai = lw.slice(lw.indexOf('const runAiCheck = async'), lw.indexOf('runAiCheckRef.current = runAiCheck'));
  check(!/runQ5|setMoshionRun/.test(ai.split('fallBackToPatternCheck(')[0]), 'LessonWorkspace: Check\'s AI path neither runs nor touches the run record');
  check(/const text = aiText\(useLessonStore\.getState\(\)\.fileContents\)/.test(ai), 'LessonWorkspace: Check reads the store\'s text (no stale closure)');
  const fb = lw.slice(lw.indexOf('const fallBackToPatternCheck'), lw.indexOf('const runAiCheck = async'));
  check(/aiText\(useLessonStore\.getState\(\)\.fileContents\) !== text\) \{[\s\S]*?return;/.test(fb), 'LessonWorkspace: the fallback refuses to mark text the student has since changed');
  check(/ref=\{labFrameRef\}/.test(lw), 'LessonWorkspace: the lab frame is known by ref');
  // Ctrl+Enter's handler is registered once, so a direct runCode() there runs the page-load text.
  const keys = lw.slice(lw.indexOf("if (e.ctrlKey && e.key === 'Enter')"), lw.indexOf("if (e.ctrlKey && e.shiftKey && e.key === 'H')"));
  check(/isConsoleMode\) \{\s*runCodeRef\.current\(\);/.test(keys) && !/(^|[^.\w])runCode\(\)/.test(keys), 'LessonWorkspace: Ctrl+Enter on a console lab runs the latest runCode (the current text), not the first render\'s');
  check(/useEffect\(\(\) => \{ runCodeRef\.current = runCode; \}\);/.test(lw), 'LessonWorkspace: runCodeRef follows every render');
  const runner = readFileSync(path.join(root, 'public/moshion/runner.html'), 'utf8');
  check(runner.includes("source: 'preview-status', status: 'running'"), "runner.html posts preview-status 'running' (scripts/test-runner-errors.mjs measures when)");
}

// wiring of every lesson that carries aiCheck
const gen =readFileSync(path.join(root, 'functions/_shared/ai-graders.generated.ts'), 'utf8');
let labs = 0;
for (const id of readdirSync(path.join(root, 'lessons'))) {
  const f = path.join(root, 'lessons', id, 'lesson.json');
  if (!existsSync(f)) continue;
  const l = JSON.parse(readFileSync(f, 'utf8'));
  if (!l.aiCheck) continue;
  labs++;
  const reqIds = new Set(l.requirements.map((r) => r.id));
  check(!l.aiGrader && !(l.diagram && l.diagram.aiGrader), `${id}: aiCheck lab must not also carry aiGrader`);
  check(l.aiCheck.rubric.every((r) => reqIds.has(r.id)), `${id}: every aiCheck rubric id is a requirement id`);
  check(l.aiCheck.rubric.length === l.requirements.length, `${id}: aiCheck covers every requirement`);
  check(typeof l.aiCheck.prompt === 'string' && l.aiCheck.prompt.length > 40, `${id}: aiCheck has a grading brief`);
  check(gen.includes(JSON.stringify(id) + ':'), `${id}: the server-side grader config was generated`);
  if (l.preview === 'moshion' && typeof fallbackRunner === 'function') {
    check(fallbackRunner(l) === 'moshion', `${id}: a moSHion aiCheck lab falls back to the moSHion runner`);
  }
}
{
  const { aiNoteForRun, GREEN_BUT_RUN_ERROR } = aiCheckLib;
  const ok = { kind: 'ok', text: 'Great job! (5 of 5 green)' };
  check(aiNoteForRun(null, { allGreen: true, runErrored: true }) === null, 'no note stays no note');
  check(aiNoteForRun(ok, { allGreen: true, runErrored: true }) === GREEN_BUT_RUN_ERROR, 'green cards + run error: one plain sentence');
  check(aiNoteForRun(ok, { allGreen: true, runErrored: false }) === ok.text, 'green and clean run: AI note unchanged');
  check(aiNoteForRun(ok, { allGreen: false, runErrored: true }) === ok.text, 'red cards: AI note unchanged');
  check(aiNoteForRun({ kind: 'error', text: 'x' }, { allGreen: true, runErrored: true }) === 'x', 'error note unchanged');
}
check(labs >= 1, 'at least one lesson carries aiCheck');

console.log(failures ? `[test-ai-check] ${failures} FAILED of ${n}` : `[test-ai-check] ${n}/${n} checks passed`);
process.exit(failures ? 1 : 0);
