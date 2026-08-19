'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Circle, ListChecks } from 'lucide-react';
import type { QuizConfig } from '../lib/types';
import { recordLessonCompleted, useLessonState } from '../lib/progress';
import { getHrefsByLessonNumber, navigateToNextLesson } from '../lib/lesson-neighbors';
import { fetchDraft, saveDraft, recordSubmission } from '../lib/written-grader-store';
import { countCorrect, passThreshold } from '../lib/quiz-grade';
import { withInlineCode } from './InlineCode';
import { sourceHintNumbers, sourceHintParts } from '../lib/source-hint';

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

export default function QuizView({ lessonId, config }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [graded, setGraded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sourceHrefs, setSourceHrefs] = useState<Record<string, string>>({});
  const progress = useLessonState();

  const questions = config.questions ?? [];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
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
      const serverDraft = progress.authed ? await fetchDraft(lessonId) : null;
      if (cancelled) return;
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

  function pick(questionId: string, index: number) {
    // Stale marks mislead more than no marks, so changing anything clears them.
    setGraded(false);
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function submit() {
    if (!allAnswered) return;
    setGraded(true);
    const payload = JSON.stringify({ answers, graded: true });

    if (correctCount >= needed) {
      await recordLessonCompleted(lessonId, correctCount);
      setTimeout(() => navigateToNextLesson(lessonId), 1800);
    }
    if (progress.authed) {
      recordSubmission({
        lessonId,
        response: payload,
        gradeJson: {
          quiz: questions.map((q) => ({
            id: q.id,
            picked: answers[q.id],
            correct: answers[q.id] === q.answer,
          })),
        },
        score: correctCount,
        possible: questions.length,
      });
      saveDraft(lessonId, payload);
    }
  }

  if (!loaded) return null;
  if (!questions.length) return null;

  return (
    <section style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #44475a' }}>
      <h2
        style={{
          fontSize: 20,
          marginBottom: 6,
          color: '#f8f8f2',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <ListChecks size={18} color="#f1fa8c" />
        Check your understanding
      </h2>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>
        Pick the answer that fits best for each question. You need {needed} of {questions.length}{' '}
        right to move on, and you can change your answers and try again as many times as you like.
      </p>

      {questions.map((q, qi) => {
        const picked = answers[q.id];
        const isCorrect = graded && picked === q.answer;
        const isWrong = graded && picked !== undefined && picked !== q.answer;
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
              {q.options.map((opt, oi) => {
                const selected = picked === oi;
                // Green the right option only once it's been earned — either the
                // student picked it, or they've passed. Marking it on a failed
                // attempt turns "try again" into "click the green one".
                const markAsAnswer = graded && oi === q.answer && (isCorrect || passed);
                const markAsMistake = graded && selected && oi !== q.answer;
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
                      onChange={() => pick(q.id, oi)}
                      style={{ marginTop: 3, accentColor: '#bd93f9' }}
                    />
                    <span>{withInlineCode(opt)}</span>
                  </label>
                );
              })}
            </div>

            {graded ? (
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
                  {withInlineCode(q.explanation)}
                  {q.source ? (
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
          disabled={!allAnswered}
          style={{
            background: allAnswered ? '#bd93f9' : '#44475a',
            color: allAnswered ? '#282a36' : '#888',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
          }}
        >
          {graded ? 'Check again' : 'Check my answers'}
        </button>

        {!allAnswered ? (
          <span style={{ color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Circle size={14} color="#6272a4" />
            {answeredCount} of {questions.length} answered
          </span>
        ) : null}

        {graded ? (
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
    </section>
  );
}
