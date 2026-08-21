'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Circle, Loader2, Lightbulb, Sparkles, Save } from 'lucide-react';
import { recordLessonCompleted, useLessonState } from '../lib/progress';
import { navigateToNextLesson } from '../lib/lesson-neighbors';
import {
  fetchDraft,
  saveDraft,
  recordSubmission,
} from '../lib/written-grader-store';

export interface AiRubricItem {
  id: string;
  title: string;
  description?: string;
  points: number;
}

export interface AiGraderConfig {
  rubricTitle?: string;
  model?: string;
  contextDocs?: string[];
  rubric: AiRubricItem[];
  promptSummary?: string;  // short reminder of what the student was asked
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  config: AiGraderConfig;
}

interface CriterionResult {
  id: string;
  earned: number;
  max: number;
  verdict: 'met' | 'partial' | 'missing';
  feedback: string;
}

interface GradeResult {
  ok: true;
  totalEarned: number;
  totalPossible: number;
  criteria: CriterionResult[];
  summary: string;
  hints: string[];
}

const STORAGE_PREFIX = 'shCode:written:';
const LEGACY_STORAGE_PREFIX = 'shCode_writtenGrader:';

interface StoredState {
  response: string;
  lastResult?: GradeResult;
  lastSubmittedAt?: number;
}

function loadState(lessonId: string): StoredState {
  // One-time migration from the legacy key so in-progress drafts survive.
  try {
    const legacyKey = LEGACY_STORAGE_PREFIX + lessonId;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      if (localStorage.getItem(STORAGE_PREFIX + lessonId) === null) {
        localStorage.setItem(STORAGE_PREFIX + lessonId, legacy);
      }
      localStorage.removeItem(legacyKey);
    }
  } catch {}

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + lessonId);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { response: '' };
}

function saveState(lessonId: string, state: StoredState) {
  try {
    localStorage.setItem(STORAGE_PREFIX + lessonId, JSON.stringify(state));
  } catch {}
}

// totalPossible === 0 ⇒ pass/fail rubric (all rubric points are 0). Pass when
// a majority of criteria are met-or-partial — loose threshold for very new
// students. Otherwise fall back to the points-based 70% threshold.
function isPassing(r: GradeResult): boolean {
  if (r.totalPossible === 0) {
    if (r.criteria.length === 0) return false;
    const ok = r.criteria.filter((c) => c.verdict === 'met' || c.verdict === 'partial').length;
    return ok >= Math.ceil(r.criteria.length / 2);
  }
  return r.totalEarned / r.totalPossible >= 0.7;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function WrittenGrader({ lessonId, lessonTitle, prompt, config }: Props) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const progress = useLessonState();
  const totalPossible = config.rubric.reduce((s, r) => s + r.points, 0);

  useEffect(() => {
    // Local cache is the always-available fallback; server draft is canonical
    // when signed in. Prefer server if it's newer (or exists at all).
    let cancelled = false;
    const local = loadState(lessonId);
    (async () => {
      const serverDraft = progress.authed ? await fetchDraft(lessonId) : null;
      if (cancelled) return;
      if (serverDraft && serverDraft.response) {
        setResponse(serverDraft.response);
      } else {
        setResponse(local.response);
      }
      if (local.lastResult) setResult(local.lastResult);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, progress.authed]);

  useEffect(() => {
    if (!loaded) return;
    saveState(lessonId, { response, lastResult: result ?? undefined, lastSubmittedAt: Date.now() });
  }, [response, result, lessonId, loaded]);

  async function saveNow() {
    setSaveStatus('saving');
    const ok = progress.authed ? await saveDraft(lessonId, response) : false;
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      const res = await fetch('/api/grade-written', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          lessonId,
          lessonTitle,
          prompt,
          response,
          rubric: config.rubric,
          model: config.model,
          contextDocs: config.contextDocs,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        setError(`Grader returned a non-JSON response (HTTP ${res.status}). Ask your teacher — the Ollama key or endpoint may not be configured.`);
        return;
      }
      if (!data || !data.ok) {
        setError(data?.error || `Grading failed (HTTP ${res.status}).`);
        if (data?.offline) setOffline(true);
        return;
      }
      setResult(data as GradeResult);
      const passed = isPassing(data as GradeResult);
      if (passed) {
        await recordLessonCompleted(lessonId, data.totalEarned);
      }
      if (progress.authed) {
        // Persist the submission + sync the draft so a resume shows the
        // text that was graded. Fire-and-forget — local cache already has it.
        recordSubmission({
          lessonId,
          response,
          gradeJson: data,
          score: data.totalEarned,
          possible: data.totalPossible,
        });
        saveDraft(lessonId, response);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) return null;

  return (
    <section style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #44475a' }}>
      <h2 style={{ fontSize: 20, marginBottom: 6, color: '#f8f8f2', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} color="#bd93f9" />
        {config.rubricTitle ?? 'Written response — AI-graded'}
      </h2>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
        Answer in your own everyday words — you are graded on having the right idea, not on
        exact wording, spelling or length. The AI grader checks each criterion and points you
        back at the lesson to reread if something is missing. You can revise and resubmit as
        many times as you want.
      </p>

      {prompt.trim() ? (
        <div
          style={{
            background: '#282a36',
            border: '1px solid #44475a',
            borderLeft: '4px solid #bd93f9',
            borderRadius: 6,
            padding: '14px 16px',
            margin: '0 0 16px',
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#bd93f9',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            What to answer
          </div>
          <div
            style={{
              color: '#f8f8f2',
              fontSize: 15,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {prompt.trim()}
          </div>
        </div>
      ) : null}

      <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 4 }}>
        Your response
      </label>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Write your response here. Full sentences preferred."
        rows={10}
        style={{
          width: '100%',
          background: '#282a36',
          color: '#f8f8f2',
          border: '1px solid #44475a',
          borderRadius: 6,
          padding: 12,
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.5,
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          onClick={submit}
          disabled={loading || response.trim().length < 20}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontWeight: 600,
            cursor: loading ? 'wait' : response.trim().length < 20 ? 'not-allowed' : 'pointer',
            background: loading ? '#44475a' : response.trim().length < 20 ? '#333' : '#bd93f9',
            color: '#282a36',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Grading…' : result ? 'Re-submit for feedback' : 'Submit for feedback'}
        </button>
        <button
          onClick={saveNow}
          disabled={!progress.authed || saveStatus === 'saving' || response.trim().length === 0}
          title={progress.authed ? 'Save your draft without submitting' : 'Sign in to save drafts'}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #44475a',
            fontWeight: 600,
            cursor: !progress.authed ? 'not-allowed' : saveStatus === 'saving' ? 'wait' : 'pointer',
            background: 'transparent',
            color: !progress.authed ? '#6272a4' : '#f8f8f2',
            opacity: !progress.authed ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Save failed' : 'Save draft'}
        </button>
        <span style={{ color: '#666', fontSize: 12 }}>
          {response.trim().length} chars · {response.trim().split(/\s+/).filter(Boolean).length} words
        </span>
        {config.model ? (
          <code style={{ color: '#6272a4', fontSize: 11, marginLeft: 'auto' }}>
            model: {config.model}
          </code>
        ) : null}
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: offline ? '#282a36' : '#4a2a2a',
            border: '1px solid ' + (offline ? '#6272a4' : '#ff5555'),
            borderRadius: 6,
            color: offline ? '#aaa' : '#ffd6d6',
            fontSize: 13,
          }}
        >
          <strong style={{ color: offline ? '#bd93f9' : '#ff5555' }}>
            {offline ? 'AI grader offline' : 'Error'}
          </strong>
          <p style={{ margin: '4px 0 0' }}>{error}</p>
        </div>
      )}

      {result && (() => {
        const passFail = result.totalPossible === 0;
        const passed = isPassing(result);
        const okCount = result.criteria.filter(
          (c) => c.verdict === 'met' || c.verdict === 'partial',
        ).length;
        return (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              color: '#aaa',
              fontSize: 14,
            }}
          >
            <span>
              <strong style={{ color: '#f8f8f2', fontSize: 16 }}>
                {passFail
                  ? `${okCount} / ${result.criteria.length} criteria met`
                  : `${result.totalEarned} / ${result.totalPossible}`}
              </strong>
              {!passFail && (
                <>
                  {' '}
                  ({Math.round((result.totalEarned / result.totalPossible) * 100)}%)
                </>
              )}
            </span>
            <span>{passed ? '✓ passing' : 'needs revision'}</span>
          </div>

          {result.summary && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderLeft: '3px solid #bd93f9',
                background: 'rgba(189,147,249,0.08)',
                borderRadius: 4,
                color: '#f8f8f2',
                fontStyle: 'italic',
              }}
            >
              {result.summary}
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {result.criteria.map((c, i) => {
              const label = config.rubric.find((r) => r.id === c.id);
              const color =
                c.verdict === 'met'     ? '#50fa7b'
              : c.verdict === 'partial' ? '#f1fa8c'
                                        : '#ff5555';
              const Icon =
                c.verdict === 'met'     ? CircleCheck
              : c.verdict === 'partial' ? Circle
                                        : CircleX;
              return (
                <div
                  key={c.id || i}
                  style={{
                    padding: 12,
                    background: '#282a36',
                    borderRadius: 6,
                    border: '1px solid ' + color + '55',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={18} color={color} />
                    <strong style={{ color: '#f8f8f2' }}>{label?.title || c.id}</strong>
                    <span style={{ marginLeft: 'auto', color, fontWeight: 600, fontSize: 13 }}>
                      {passFail
                        ? c.verdict === 'met' ? 'met' : c.verdict === 'partial' ? 'partial' : 'missing'
                        : `${c.earned} / ${c.max} pts`}
                    </span>
                  </div>
                  {c.feedback && (
                    <p style={{ margin: '4px 0 0 26px', color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>
                      {c.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {passed && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => navigateToNextLesson(lessonId)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 6,
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#50fa7b',
                  color: '#282a36',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Continue to next lesson →
              </button>
              <p style={{ margin: '8px 0 0', color: '#888', fontSize: 12 }}>
                You've passed — keep revising to push your score higher if you want, or move on whenever you're ready.
              </p>
            </div>
          )}

          {result.hints && result.hints.length > 0 && (
            <div style={{ marginTop: 14, padding: 12, background: '#282a36', borderRadius: 6, border: '1px solid #ffb86c55' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#ffb86c', fontWeight: 600 }}>
                <Lightbulb size={16} />
                Hints
              </div>
              <ul style={{ margin: 0, paddingLeft: 22, color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                {result.hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>
        );
      })()}
    </section>
  );
}
