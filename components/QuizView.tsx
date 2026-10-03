'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleX, Circle, ListChecks } from 'lucide-react';
import type { QuizConfig } from '../lib/types';
import { recordLessonCompleted, useLessonState } from '../lib/progress';
import { getHrefsByLessonNumber, navigateToNextLesson } from '../lib/lesson-neighbors';
import { fetchDraft, saveDraft, recordSubmission } from '../lib/written-grader-store';
import { countCorrect, passThreshold } from '../lib/quiz-grade';
import { withInlineCode } from './InlineCode';
import { sourceHintNumbers, sourceHintParts } from '../lib/source-hint';
import { buildQuizView } from '../lib/quiz-variant';
import { getCurrentUser } from '../lib/auth';
import SolutionPanel from './SolutionPanel';
import { AttemptBanner, PseudocodePanel } from './AttemptCap';
import { useAttemptCap } from '../lib/use-attempt-cap';

interface Props {
  lessonId: string;
  config: QuizConfig;
}

const STORAGE_PREFIX = 'shCode:quiz:';

// An absent key means "not answered yet" — 0 is a real first option, so it can
// never stand in for "unanswered".
type Answers = Record<string, number>;

interface StoredState {
  answers: Answers;
  graded?: boolean;
}

function loadState(lessonId: string): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + lessonId);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { answers: {} };
}

function saveState(lessonId: string, state: StoredState) {
  try {
    localStorage.setItem(STORAGE_PREFIX + lessonId, JSON.stringify(state));
  } catch {}
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
}

async function fetchReveal(lessonId: string): Promise<RevealResult> {
  try {
    const res = await fetch(`/api/quiz-reveal?lessonId=${encodeURIComponent(lessonId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return { answers: null, summary: null }; // 403 = not handed in yet — quiet, not an error
    const data = (await res.json()) as { answers?: RevealAnswer[] } & Partial<TriesSummary>;
    return {
      answers: data.answers ? Object.fromEntries(data.answers.map((a) => [a.id, a])) : null,
      summary: typeof data.attempts === 'number' ? (data as TriesSummary) : null,
    };
  } catch {
    return { answers: null, summary: null };
  }
}

export default function QuizView({ lessonId, config }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [graded, setGraded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sourceHrefs, setSourceHrefs] = useState<Record<string, string>>({});
  const [identity, setIdentity] = useState('guest');
  const [reveal, setReveal] = useState<Record<string, RevealAnswer> | null>(null);
  // Capped quiz only: the server's running totals, between tries.
  const [tries, setTries] = useState<TriesSummary | null>(null);
  const progress = useLessonState();
  // Tries, counted on the server. A capped quiz replaces the one-shot lock.
  const cap = useAttemptCap(lessonId, config.maxSubmissions, progress.authed);
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
  const correctCount = countCorrect(questions, answers);
  const needed = passThreshold(questions.length, config.passPercent);
  const passed = graded && correctCount >= needed;

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
      if (serverDraft?.response) {
        try {
          const parsed = JSON.parse(serverDraft.response);
          if (parsed && typeof parsed === 'object' && parsed.answers) next = parsed;
        } catch {
          // A draft written by an earlier, non-quiz version of this lesson is
          // prose, not JSON. Keep the local answers rather than throwing it away.
        }
      }
      setAnswers(next.answers ?? {});
      setGraded(!!next.graded);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, progress.authed]);

  useEffect(() => {
    if (!loaded) return;
    saveState(lessonId, { answers, graded });
  }, [answers, graded, lessonId, loaded]);

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
    // Stale marks mislead more than no marks, so changing anything clears them.
    setGraded(false);
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function submit() {
    if (!canSubmit) return;
    setGraded(true);
    const payload = JSON.stringify({ answers, graded: true });

    // Green-to-advance on a test means "you sat it", never "you passed it".
    // Gating the next part behind a score would strand a student halfway
    // through their own exam. A capped quiz records its completion AFTER the
    // row is in, because the score it records is the server's best total.
    if (!capped && (summative || correctCount >= needed)) {
      await recordLessonCompleted(lessonId, hasKey ? correctCount : undefined);
      // Skipped when the marking is about to be revealed. 1800ms is enough to
      // notice a screen change and not enough to read eight answers and their
      // explanations, so navigating here would take the paper away at exactly
      // the moment it became worth reading. The part still unlocks -- it unlocked
      // on the line above -- and the next-lesson nav is on the page.
      if (!revealAfterSubmit) setTimeout(() => navigateToNextLesson(lessonId), 1800);

    }
    if (progress.authed) {
      await recordSubmission({
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
      if (capped) cap.spend();
    }
    if (revealAfterSubmit && progress.authed) {
      // The row is in, so the route can hand back the marking for this form.
      const r = await fetchReveal(lessonId);
      setReveal(r.answers);
      setTries(r.summary);
      // Best try counts. The server computed it from the stored picks; the
      // lesson_state upsert also refuses to lower it (functions/api/lesson-state).
      if (capped && r.summary) await recordLessonCompleted(lessonId, r.summary.best.correct);
    } else if (capped) {
      await recordLessonCompleted(lessonId);
    }
  }

  if (!loaded) return null;
  if (!questions.length) return null;

  return (
    <section style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #44475a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2
          style={{
            fontSize: 20,
            margin: 0,
            color: '#f8f8f2',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ListChecks size={18} color="#f1fa8c" />
          Check your understanding
        </h2>
        {summative && (
          <div style={{ marginLeft: 'auto' }}>
            <SolutionPanel lessonId={lessonId} readOnly />
          </div>
        )}
      </div>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>
        {capped
          ? `Answer all ${questions.length}. After each try you see your total, not which ones were wrong. Submit what you have if one has you stuck: the next part unlocks and you can come back and use your other tries.`
          : summative
          ? `Answer all ${questions.length}. Nothing is marked here — your teacher hands the score back. If one has you stuck, submit what you have and move on: the next part unlocks and you can come back to this one. Once all ${questions.length} are answered, submitting is final.`
          : `Pick the answer that fits best for each question. You need ${needed} of ${questions.length} right to move on, and you can change your answers and try again as many times as you like.`}
      </p>
      <AttemptBanner
        max={cap.max}
        used={cap.used}
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
        const showMarks = graded && (summative ? !!rv : true);
        const answerIndex = rv ? rv.answer : q.answer;
        const isCorrect = showMarks && picked === answerIndex;
        const isWrong = showMarks && picked !== undefined && picked !== answerIndex;
        return (
          <div
            key={q.id}
            style={{
              background: '#282a36',
              border: '1px solid #44475a',
              borderLeft: `4px solid ${isCorrect ? '#50fa7b' : isWrong ? '#ff5555' : '#44475a'}`,
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                color: '#f8f8f2',
                fontSize: 15,
                lineHeight: 1.55,
                marginBottom: q.code ? 10 : 12,
              }}
            >
              <span style={{ color: '#6272a4', fontWeight: 600, minWidth: 22 }}>{qi + 1}.</span>
              <span>{withInlineCode(q.question)}</span>
            </div>

            {q.code ? (
              <pre
                style={{
                  background: '#21222c',
                  border: '1px solid #44475a',
                  borderRadius: 4,
                  padding: '10px 12px',
                  margin: '0 0 12px 30px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#f8f8f2',
                  overflowX: 'auto',
                }}
              >
                {q.code}
              </pre>
            ) : null}

            <div style={{ marginLeft: 30 }}>
              {order.map((oi) => {
                const opt = q.options[oi];
                const selected = picked === oi;
                // Green the right option only once it's been earned — either the
                // student picked it, or they've passed. Marking it on a failed
                // attempt turns "try again" into "click the green one".
                const markAsAnswer = graded && (summative
                  ? !!rv && oi === rv.answer // after a test hand-in the right option is shown
                  : oi === q.answer && (isCorrect || passed));
                const markAsMistake = showMarks && selected && oi !== answerIndex;
                return (
                  <label
                    key={oi}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '7px 10px',
                      marginBottom: 4,
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: markAsAnswer
                        ? 'rgba(80, 250, 123, 0.12)'
                        : markAsMistake
                          ? 'rgba(255, 85, 85, 0.12)'
                          : selected
                            ? '#44475a'
                            : 'transparent',
                      color: '#f8f8f2',
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      disabled={locked}
                      onChange={() => pick(q.id, oi)}
                      style={{ marginTop: 3, accentColor: '#bd93f9' }}
                    />
                    <span>{withInlineCode(opt)}</span>
                  </label>
                );
              })}
            </div>

            {showMarks ? (
              <div
                style={{
                  marginLeft: 30,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid #44475a',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#ccc',
                }}
              >
                {isCorrect ? (
                  <CircleCheck size={16} color="#50fa7b" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <CircleX size={16} color="#ff5555" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <span>
                  {withInlineCode((rv ? rv.explanation : q.explanation) ?? '')}
                  {!summative && q.source ? (
                    <span style={{ color: '#6272a4' }}>
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
                            style={{ color: '#8be9fd', textDecoration: 'underline' }}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          onClick={submit}
          disabled={!canSubmit || locked}
          style={{
            background: canSubmit ? '#bd93f9' : '#44475a',
            color: canSubmit ? '#282a36' : '#888',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
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
          <span style={{ color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Circle size={14} color="#6272a4" />
            {answeredCount} of {questions.length} answered
          </span>
        ) : null}

        {graded && summative ? (
          <span
            style={{
              color: allAnswered ? '#50fa7b' : '#ffb86c',
              fontSize: 14,
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

        {graded && !summative ? (
          <span
            style={{
              color: passed ? '#50fa7b' : '#ffb86c',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {passed ? <CircleCheck size={16} /> : <CircleX size={16} />}
            {correctCount} of {questions.length} right
            {passed
              ? ' — passed, moving on.'
              : ` — you need ${needed}. Read the notes above, change your answers and check again.`}
          </span>
        ) : null}
      </div>
      <PseudocodePanel lessonId={lessonId} show={capped && cap.reached} />
    </section>
  );
}
