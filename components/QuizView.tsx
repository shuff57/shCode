'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, Circle, ListChecks } from 'lucide-react';
import type { QuizConfig } from '../lib/types';
import { bestOfScore, bypassesLessonLock, recordLessonCompleted, useLessonState } from '../lib/progress';
import { getHrefsByLessonNumber } from '../lib/lesson-neighbors';
import LessonOutcome, { NextLessonButton } from './LessonOutcome';
import { quizScoreLine, ranWhen } from '../lib/outcome-words';
import { fetchDraft, saveDraft, recordSubmission } from '../lib/written-grader-store';
import { changedSinceCheck, countCorrect, passThreshold, restoreQuizState } from '../lib/quiz-grade';
import { withInlineCode } from './InlineCode';
import { sourceHintNumbers, sourceHintParts } from '../lib/source-hint';
import { buildQuizView } from '../lib/quiz-variant';
import { getCurrentUser } from '../lib/auth';
import SolutionPanel from './SolutionPanel';
import { AttemptBanner, PseudocodePanel, SolutionWait, parseRevealWait, type RevealWait } from './AttemptCap';
import { useAttemptCap } from '../lib/use-attempt-cap';
import { loadQuizRecord, saveQuizRecord, type QuizAnswers, type QuizRecord } from '../lib/work-records';

interface Props {
  lessonId: string;
  config: QuizConfig;
}

// This browser's copy of the picks lives under the page's owner
// (`w1:<owner>:quiz:<lessonId>`, lib/work-records.ts, lib/owned-storage.ts).
type Answers = QuizAnswers;
type StoredState = QuizRecord;
const loadState = loadQuizRecord;
function saveState(lessonId: string, state: StoredState) {
  saveQuizRecord(lessonId, state);
}
// The marking the server hands back after a summative hand-in, keyed by
// question id. `answer` is the option's AUTHORED index, directly comparable
// with a stored pick. The route refuses (403) until a submission row exists
// for this student, so a null here just means "no marking yet".
interface RevealAnswer {
  id: string;
  answer: number;
  optionText: string;
  explanation: string;
}

// What the reveal route returns. On a CAPPED quiz it answers between tries with
// the totals only (`answers` absent) and adds the key once the last try is spent.
interface TriesSummary {
  attempts: number;
  maxSubmissions: number;
  last: { correct: number; total: number };
  best: { correct: number; total: number };
}
interface RevealResult {
  answers: Record<string, RevealAnswer> | null;
  summary: TriesSummary | null;
  /** Every try is spent but the teacher has not released the key (`answersWithheld`). */
  wait: RevealWait | null;
}

async function fetchReveal(lessonId: string): Promise<RevealResult> {
  try {
    const res = await fetch(`/api/quiz-reveal?lessonId=${encodeURIComponent(lessonId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return { answers: null, summary: null, wait: null }; // 403 = not handed in yet — quiet, not an error
    const data = (await res.json()) as { answers?: RevealAnswer[]; answersWithheld?: unknown } & Partial<TriesSummary>;
    return {
      answers: data.answers ? Object.fromEntries(data.answers.map((a) => [a.id, a])) : null,
      summary: typeof data.attempts === 'number' ? (data as TriesSummary) : null,
      wait: parseRevealWait(data.answersWithheld),
    };
  } catch {
    return { answers: null, summary: null, wait: null };
  }
}

export default function QuizView({ lessonId, config }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  // The answers as they stood at the last Check, or null before any. A question whose answer has
  // changed since keeps no mark; the others keep theirs until the next Check (ux2 S2).
  const [checked, setChecked] = useState<Answers | null>(null);
  const graded = checked !== null;
  const [loaded, setLoaded] = useState(false);
  const [sourceHrefs, setSourceHrefs] = useState<Record<string, string>>({});
  const [identity, setIdentity] = useState('guest');
  const [reveal, setReveal] = useState<Record<string, RevealAnswer> | null>(null);
  // Capped quiz only: the server's running totals, between tries.
  const [tries, setTries] = useState<TriesSummary | null>(null);
  // Capped quiz, every try spent, key not yet released by the teacher.
  const [wait, setWait] = useState<RevealWait | null>(null);
  // Set by each Check in THIS visit (ux1 B1/B3/B4): what the score line says when it ran, and where
  // the page scrolls afterwards. A return visit reads the saved state instead and steals no focus.
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const progress = useLessonState();
  // Tries, counted on the server. A capped quiz replaces the one-shot lock.
  const cap = useAttemptCap(lessonId, config.maxSubmissions, progress.authed, bypassesLessonLock(progress.role));
  const capped = cap.max !== null;

  // Which paper this student sits. Identical to the authored order unless the
  // lesson opts into `shuffle` or `variants`; see lib/quiz-variant.ts.
  const view = useMemo(
    () => buildQuizView(config, lessonId, identity),
    [config, lessonId, identity],
  );
  const questions = view.questions.map((v) => v.question);
  // A test, not a module quiz: see QuizConfig.summative.
  const summative = !!config.summative;
  // Opt-in, and the generator only bakes a key for a quiz that asks. Off means
  // no request is made at all rather than a request that is expected to fail.
  // A capped quiz always reveals: totals between tries, the key after the last.
  const revealAfterSubmit = !!config.revealAfterSubmit || capped;
  // A summative quiz arrives with its answer key stripped (lib/quiz-redact.ts),
  // so the browser cannot mark it and must not pretend to. Everything that
  // reports or records a score is switched off rather than left to report 0.
  const hasKey = questions.some((q) => q.answer !== undefined);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  // On a test, Submit is never withheld for blanks -- see Grading.summative.
  // A student who cannot do question 4 must still be able to hand in 1-3 and
  // reach the next part, or the lock costs them the marks they had.
  const canSubmit = summative ? answeredCount > 0 && !cap.unknown && !cap.reached : allAnswered;
  // ...and the paper only becomes final once it is FULLY answered. Locking on
  // a partial hand-in would trade one trap for another: submit five of eight
  // to unlock Part 2, then never be allowed back to finish the other three.
  // On a capped quiz the paper stays open until the last try is spent, and a
  // hand-in is never final before that: the lock is the try count.
  const locked = capped ? cap.reached : summative && graded && allAnswered;
  // The score is the CHECKED answers' score: a change after a Check does not move it until the next one.
  const correctCount = countCorrect(questions, checked ?? answers);
  const needed = passThreshold(questions.length, config.passPercent);
  const passed = graded && correctCount >= needed;
  const changedIds = summative ? [] : changedSinceCheck(questions, answers, checked);
  const changed = new Set(changedIds);
  const scoreStale = changedIds.length > 0;
  // Done on an earlier visit (or earlier in this one): the saved lesson state, read the way the
  // header's progress already reads it. A practice quiz only: a test reports "sat", not "passed".
  const doneBefore = !summative && !capped && progress.states[lessonId] === 'completed';
  const bestScore = progress.scores[lessonId];
  const justPassed = !summative && hasKey && passed && checkCount > 0;
  const scoreLine = graded && !summative && hasKey ? quizScoreLine(correctCount, questions.length, needed) : null;

  // "Checked just now" turns into a clock time after a minute.
  useEffect(() => {
    if (!checkedAt) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [checkedAt]);

  // After a practice Check: to the first question that is not right yet, so the fix is in view. A pass
  // scrolls to its result instead (LessonOutcome moves focus to Next).
  useEffect(() => {
    if (!checkCount || summative || !hasKey || !graded) return;
    if (correctCount >= needed) return;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`.student-quiz[data-lesson="${CSS.escape(lessonId)}"] .quiz-question-card.is-wrong`);
      if (!el) return;
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkCount]);

  // The reread hints name lessons by number; the manifest is what turns those
  // into hrefs, and it is already cached by the header nav on most pages.
  useEffect(() => {
    let cancelled = false;
    const numbers = Array.from(
      new Set((config.questions ?? []).flatMap((q) => (q.source ? sourceHintNumbers(q.source) : []))),
    );
    if (numbers.length === 0) return;
    getHrefsByLessonNumber(numbers).then((hrefs) => {
      if (!cancelled) setSourceHrefs(hrefs);
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const local = loadState(lessonId);
    (async () => {
      // The email seeds the form assignment, so it has to land before the
      // first paint -- a quiz drawn as 'guest' and then re-drawn as the
      // student would visibly re-order itself under them.
      const [user, serverDraft] = await Promise.all([
        getCurrentUser(),
        progress.authed ? fetchDraft(lessonId) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (user?.email) setIdentity(user.email);
      let next: StoredState = local;
      let fromServer = false;
      if (serverDraft?.response) {
        try {
          const parsed = JSON.parse(serverDraft.response);
          if (parsed && typeof parsed === 'object' && parsed.answers) {
            next = parsed;
            fromServer = true;
          }
        } catch {
          // A draft written by an earlier, non-quiz version of this lesson is
          // prose, not JSON. Keep the local answers rather than throwing it away.
        }
      }
      // Answers may come back from this browser; marks and the score only from the server's saved
      // copy for the signed-in account (a shared computer's browser may hold someone else's
      // checked quiz): see restoreQuizState.
      const restored = restoreQuizState(next, fromServer);
      setAnswers(restored.answers);
      setChecked(restored.checked);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, progress.authed]);

  useEffect(() => {
    if (!loaded) return;
    saveState(lessonId, { answers, graded, checked });
  }, [answers, graded, checked, lessonId, loaded]);

  // A test's marking is server-held: once this student has a hand-in the
  // route returns the key for their form; before that it refuses. Both
  // states stay quiet here — no marking yet is not an error on a live test.
  useEffect(() => {
    if (!revealAfterSubmit || !loaded) return;
    let cancelled = false;
    fetchReveal(lessonId).then((r) => {
      if (cancelled) return;
      setReveal(r.answers);
      setTries(r.summary);
      setWait(r.wait);
    });
    return () => {
      cancelled = true;
    };
  }, [revealAfterSubmit, loaded, lessonId]);

  // `index` is the option's index in the AUTHORED options array, never where
  // it was drawn. That is what lets a shuffled quiz share its storage, its
  // grading and its submission record with an unshuffled one.
  function pick(questionId: string, index: number) {
    // A submitted test is final -- the paper does not reopen.
    if (locked) return;
    // A test's hand-in state is all or nothing, so a change clears it. A practice quiz keeps the
    // marks on every question not touched (ux2 S2): `changed` hides only this one's.
    if (summative) setChecked(null);
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function submit() {
    if (!canSubmit) return;
    setChecked({ ...answers });
    // This Check's score, from the answers being checked (state updates land after this call).
    const correctCount = countCorrect(questions, answers);
    setCheckedAt(Date.now());
    setNow(Date.now());
    setCheckCount((n) => n + 1);
    const payload = JSON.stringify({ answers, graded: true });

    // Green-to-advance on a test means "you sat it", never "you passed it".
    // Gating the next part behind a score would strand a student halfway
    // through their own exam. A capped quiz records its completion AFTER the
    // row is in, because the score it records is the server's best total.
    if (!capped && (summative || correctCount >= needed)) {
      await recordLessonCompleted(lessonId, hasKey ? bestOfScore(progress.scores[lessonId], correctCount) : undefined);
      // No auto-advance (ux1 B1): the student sees the result and chooses Next, which is beside it.
    }
    let recorded = false;
    if (progress.authed) {
      recorded = await recordSubmission({
        lessonId,
        response: payload,
        gradeJson: {
          variant: view.variant,
          quiz: questions.map((q) => ({
            id: q.id,
            picked: answers[q.id],
            ...(hasKey ? { correct: answers[q.id] === q.answer } : {}),
          })),
        },
        // No key in the browser means no score from the browser. The row goes
        // in unscored, which is what the teacher queue already renders as
        // "needs marking"; scripts/score-quiz.mjs turns the picks into marks.
        // (A capped quiz is the exception: the server scores it on the way in.)
        ...(hasKey ? { score: correctCount } : {}),
        possible: questions.length,
      });
      saveDraft(lessonId, payload);
      // Only a row the server accepted spends a try. A refusal (409: every try is
      // already used, e.g. from a second tab) spends nothing here, and the count is
      // re-read so the page shows what the server holds.
      if (capped) {
        if (recorded) cap.spend();
        else cap.refresh();
      }
    }
    if (revealAfterSubmit && progress.authed) {
      // The row is in, so the route can hand back the marking for this form.
      const r = await fetchReveal(lessonId);
      setReveal(r.answers);
      setTries(r.summary);
      setWait(r.wait);
      // Best try counts. The server derives it from the stored rows and the
      // lesson_state upsert never lowers it (functions/api/lesson-state).
      //
      // Completion follows the RECORDED ROW, not the reveal fetch: a transient
      // failure of the reveal must not strand the student with the next part
      // locked. (The mount effect below repairs the same case after a reload.)
      if (capped && recorded) await recordLessonCompleted(lessonId, r.summary?.best.correct);
    } else if (capped && recorded) {
      await recordLessonCompleted(lessonId);
    }
  }

  // A capped quiz completes when a counted row exists on the server. If the
  // hand-in landed but the completion call did not (a dropped request, a closed
  // tab), the next part would stay locked with no way forward except spending
  // another try. Repair it once per mount; the server keeps the best score.
  const repairedRef = useRef(false);
  useEffect(() => {
    if (!capped || !loaded || !progress.authed || repairedRef.current) return;
    if (cap.used === null || cap.used < 1) return;
    if (progress.states[lessonId] === 'completed') return;
    repairedRef.current = true;
    void recordLessonCompleted(lessonId);
  }, [capped, loaded, progress.authed, progress.states, cap.used, lessonId]);

  // Phone only (CSS): the quiz's instructions open as one line with "more".
  const [guideOpen, setGuideOpen] = useState(false);

  if (!loaded) return null;
  if (!questions.length) return null;

  return (
    <section className="student-quiz" data-lesson={lessonId} style={{ marginTop: 16, paddingTop: 12, borderTop: '2px solid var(--c-line)' }}>
      <div className="quiz-head" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2
          style={{
            fontSize: 20,
            margin: 0,
            color: 'var(--c-fg)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ListChecks size={18} color="var(--c-yellow)" />
          Check your understanding
        </h2>
        <span
          className={`quiz-answered-count${allAnswered ? ' is-complete' : ''}`}
          aria-live="polite"
        >
          {answeredCount} of {questions.length} answered
          {/* Wide screens only (CSS): the same count as a bar inside the pill. */}
          <span className="quiz-answered-bar" aria-hidden="true"><span style={{ width: `${questions.length ? Math.round((answeredCount / questions.length) * 100) : 0}%` }} /></span>
        </span>
        {/* After a Check the score sits here, in the sticky row the eye is on (ux1 B3). Announced once,
            by the line beside the Check button; this copy is for sighted readers. */}
        {scoreLine ? (
          <a className={`quiz-head-score${passed ? ' is-pass' : ' is-fail'}${scoreStale ? ' is-stale' : ''}`} href={`#quiz-submit-${lessonId}`} aria-hidden="true" tabIndex={-1}>
            {passed ? <CircleCheck size={15} /> : <CircleX size={15} />}
            <span>{scoreLine}</span>
            {scoreStale
              ? <span className="quiz-head-when ux2-stale-word">Out of date: check again</span>
              : checkedAt ? <span className="quiz-head-when">checked {ranWhen(checkedAt, now)}</span> : null}
          </a>
        ) : null}
        {/* Wide screens only (CSS): where the hand-in button is, as a jump to it. */}
        <a className="quiz-submit-hint" href={`#quiz-submit-${lessonId}`}>
          {summative ? 'Submit' : 'Check answers'} <span aria-hidden="true">↓</span>
        </a>
        {summative && (
          <div style={{ marginLeft: 'auto' }}>
            <SolutionPanel lessonId={lessonId} readOnly />
          </div>
        )}
      </div>
      {/* Desktop >= 1200px only (CSS): the same count, kept in view in the empty column beside the
          questions. The pill above stays the announced one (aria-live), so this copy is hidden from
          screen readers. */}
      <div className="quiz-progress-float" aria-hidden="true">
        <span className={`quiz-answered-count${allAnswered ? ' is-complete' : ''}`}>
          {answeredCount} of {questions.length} answered
        </span>
        <span className="quiz-progress-track"><span style={{ width: `${questions.length ? Math.round((answeredCount / questions.length) * 100) : 0}%` }} /></span>
      </div>
      {/* Once passed, the result block below says what is left to do (redo is optional), so the
          "You need 4 of 5" instructions no longer stand at the top contradicting it (ux1 B2). */}
      {doneBefore ? null : <div className={`quiz-guidance is-expanded r7-guide${guideOpen ? ' is-open' : ''}`}><p id={`quiz-guide-${lessonId}`} style={{ color: 'var(--c-meta)', fontSize: 13, margin: '0 0 20px' }}>
        {capped
          ? `Answer all ${questions.length}. After each try you see your total, not which ones were wrong. Submit what you have if one has you stuck: the next part unlocks and you can come back and use your other tries.`
          : summative
          ? `Answer all ${questions.length}. Nothing is marked here — your teacher hands the score back. If one has you stuck, submit what you have and move on: the next part unlocks and you can come back to this one. Once all ${questions.length} are answered, submitting is final.`
          : <><strong className="quiz-pass-mark">You need {needed} of {questions.length} right to move on.</strong>{' '}<span className="quiz-guide-rest">Change your answers and try again as often as you like.</span></>}
      </p>
        <button type="button" className="quiz-guidance-more" aria-expanded={guideOpen} aria-controls={`quiz-guide-${lessonId}`} onClick={() => setGuideOpen((v) => !v)}>
          {guideOpen ? 'less' : 'more'}
        </button>
      </div>}
      {doneBefore && !justPassed ? (
        <LessonOutcome
          lessonId={lessonId}
          title={typeof bestScore === 'number' && hasKey ? `Passed: ${bestScore} of ${questions.length} right` : 'Passed'}
          detail="You can change your answers and check again to practise. Your best score is kept."
        />
      ) : null}
      <AttemptBanner
        max={cap.max}
        used={cap.used}
        loading={cap.loading}
        note={
          capped && tries
            ? `Last try: ${tries.last.correct} of ${tries.last.total}. Best so far: ${tries.best.correct} of ${tries.best.total}.`
            : undefined
        }
      />

      {view.questions.map(({ question: q, order }, qi) => {
        const picked = answers[q.id];
        // Summative marking comes from the server's reveal, not the stripped key.
        const rv = summative ? reveal?.[q.id] : undefined;
        // Marks draw only after a hand-in (graded) and, on a test, only once the
        // server has handed back the key for this student's own form.
        // A practice question whose answer changed since the Check keeps no mark (ux2 S2).
        const isChanged = changed.has(q.id);
        const showMarks = graded && !isChanged && (summative ? !!rv : true);
        const answerIndex = rv ? rv.answer : q.answer;
        const isCorrect = showMarks && picked === answerIndex;
        const isWrong = showMarks && picked !== undefined && picked !== answerIndex;
        return (
          <div
            key={q.id}
            id={`quiz-q-${lessonId}-${q.id}`}
            className={`quiz-question-card${isCorrect ? ' is-correct' : isWrong ? ' is-wrong' : ''}${isChanged ? ' is-changed' : ''}`}
            style={{
              background: 'var(--c-bg)',
              border: '1px solid var(--c-line)',
              borderLeft: `4px solid ${isCorrect ? 'var(--c-green)' : isWrong ? 'var(--c-red)' : 'var(--c-line)'}`,
              borderRadius: 6,
              padding: '12px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                color: 'var(--c-fg)',
                fontSize: 15,
                lineHeight: 1.55,
                marginBottom: q.code ? 10 : 12,
              }}
            >
              <span style={{ color: 'var(--c-meta)', fontWeight: 600, minWidth: 22 }}>{qi + 1}.</span>
              <span className="prose-copy">{withInlineCode(q.question)}</span>
              {/* Colour alone said right or wrong: say it in words, at the question (ux1 B3). */}
              {isCorrect ? <span className="quiz-q-verdict is-right">Right</span> : isWrong ? <span className="quiz-q-verdict is-wrong">Not right yet</span> : isChanged ? <span className="quiz-q-verdict is-changed">Changed, not checked yet</span> : null}
            </div>

            {q.code ? (
              <pre
                style={{
                  background: 'var(--c-deep2)',
                  border: '1px solid var(--c-line)',
                  borderRadius: 4,
                  padding: '10px 12px',
                  margin: '0 0 12px 30px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--c-fg)',
                  overflowX: 'auto',
                }}
              >
                {q.code}
              </pre>
            ) : null}

            {/* Short options (every one <= 40 characters) sit two to a row on a wide screen (CSS). */}
            <div className={`quiz-options${q.options.every((o) => o.length <= 40) ? ' is-short' : ''}`}>
              {order.map((oi) => {
                const opt = q.options[oi];
                const selected = picked === oi;
                // Green the right option only once it's been earned — either the
                // student picked it, or they've passed. Marking it on a failed
                // attempt turns "try again" into "click the green one".
                const markAsAnswer = graded && (summative
                  ? !!rv && oi === rv.answer // after a test hand-in the right option is shown
                  : !isChanged && oi === q.answer && (isCorrect || passed));
                const markAsMistake = showMarks && selected && oi !== answerIndex;
                return (
                  <label
                    className={`prose-copy quiz-option${selected ? ' is-selected' : ''}${markAsAnswer ? ' is-correct' : ''}${markAsMistake ? ' is-mistake' : ''}${locked ? ' is-locked' : ''}`}
                    key={oi}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      disabled={locked}
                      onChange={() => pick(q.id, oi)}
                      className="quiz-option-radio"
                    />
                    <span>{withInlineCode(opt)}</span>
                  </label>
                );
              })}
            </div>

            {showMarks ? (
              <div
                style={{
                  marginLeft: 0,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid var(--c-line)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--x-cccccc)',
                }}
              >
                {isCorrect ? (
                  <CircleCheck size={16} color="var(--c-green)" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <CircleX size={16} color="var(--c-red)" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <span>
                  {withInlineCode((rv ? rv.explanation : q.explanation) ?? '')}
                  {!summative && q.source ? (
                    <span style={{ color: 'var(--c-meta)' }}>
                      {' (reread '}
                      {sourceHintParts(q.source).map((part, pi) => {
                        const href = part.isNumber ? sourceHrefs[part.text] : undefined;
                        return href ? (
                          <a
                            key={pi}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open this lesson in a new tab"
                            style={{ color: 'var(--c-cyan)', textDecoration: 'underline' }}
                          >
                            {part.text}
                          </a>
                        ) : (
                          <span key={pi}>{part.text}</span>
                        );
                      })}
                      {')'}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}

      <div id={`quiz-submit-${lessonId}`} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap', scrollMarginTop: 80 }}>
        <button
          onClick={submit}
          disabled={!canSubmit || locked}
          style={{
            background: canSubmit ? 'var(--c-purple)' : 'var(--c-line)',
            color: canSubmit ? 'var(--c-bg)' : 'var(--x-888888)',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 15,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {summative
            ? locked
              ? capped
                ? 'No tries left'
                : 'Submitted'
              : allAnswered
                ? 'Submit my answers'
                : `Submit what I have (${answeredCount} of ${questions.length})`
            : graded
              ? 'Check again'
              : 'Check my answers'}
        </button>

        {!allAnswered ? (
          <span style={{ color: 'var(--c-meta)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Circle size={14} color="var(--c-comment)" />
            {answeredCount} of {questions.length} answered
          </span>
        ) : null}

        {graded && summative ? (
          <span
            style={{
              color: allAnswered ? 'var(--c-green)' : 'var(--c-orange)',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CircleCheck size={16} />
            {capped
              ? cap.reached
                ? 'Last try handed in. Your best one is your score.'
                : `Try ${cap.used ?? '?'} of ${cap.max} handed in.${allAnswered ? '' : ` ${answeredCount} of ${questions.length} answered.`}`
              : allAnswered
              ? `Submitted — all ${questions.length} answers are with your teacher.`
              : `Submitted ${answeredCount} of ${questions.length}. The next part is unlocked, and this one stays open — come back and answer the rest if you have time.`}
          </span>
        ) : null}

        {graded && !summative && !justPassed ? (
          <span
            role="status"
            aria-live="polite"
            style={{
              color: passed ? 'var(--c-green)' : 'var(--c-orange)',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {passed ? <CircleCheck size={16} /> : <CircleX size={16} />}
            {correctCount} of {questions.length} right
            {scoreStale
              ? `${passed ? '. Passed' : ''} at your last check. You changed ${changedIds.length === 1 ? 'an answer' : `${changedIds.length} answers`} since: press Check again to mark ${changedIds.length === 1 ? 'it' : 'them'}.`
              : passed
              ? '. Passed.'
              : `. You need ${needed}. The questions marked "Not right yet" have a note: change those answers and check again.`}
            {checkedAt && !scoreStale ? <span className="quiz-head-when">Checked {ranWhen(checkedAt, now)}{checkCount > 1 ? ` (check ${checkCount})` : ''}</span> : null}
          </span>
        ) : null}
        {graded && summative && progress.states[lessonId] === 'completed' && !capped ? <NextLessonButton lessonId={lessonId} focusKey={checkCount || null} /> : null}
      </div>
      {justPassed ? (
        <LessonOutcome
          lessonId={lessonId}
          title={`Passed: ${correctCount} of ${questions.length} right`}
          detail={<>Checked {checkedAt ? ranWhen(checkedAt, now) : 'just now'}. The next lesson is unlocked. You can still change answers and check again; your best score is kept.</>}
          focusKey={checkCount}
        />
      ) : null}
      {wait ? (
        <SolutionWait
          wait={wait}
          onRefresh={() => void fetchReveal(lessonId).then((r) => { setReveal(r.answers); setTries(r.summary); setWait(r.wait); })}
        />
      ) : null}
      <PseudocodePanel lessonId={lessonId} show={capped && cap.reached} />
    </section>
  );
}
