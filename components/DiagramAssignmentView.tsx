'use client';

// A flowchart assignment: draw it, check it, submit it.
//
// Two graders, deliberately split. The structural checks run in this browser
// against the graph and answer "is this a legal flowchart" — instantly, free,
// and the same every time. The AI grader answers the question no rule can:
// does this diagram actually solve the problem it was set. It only runs once
// the structure is clean, so students never spend a model call on a diagram
// with a floating box in it.
//
// Persistence rides the existing free-response pipeline — the diagram JSON is
// the `response` string in lesson_drafts / lesson_submissions, so autosave,
// submit history, and the teacher gradebook all work with no new table.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CircleCheck,
  CircleX,
  Circle,
  Loader2,
  Lightbulb,
  Sparkles,
  Save,
  ListChecks,
} from 'lucide-react';

import EditorPlaceholder from './diagram/EditorPlaceholder';

// React Flow is a large chunk of the client bundle. Loading it lazily keeps it
// out of the 270-odd lesson pages that have no diagram on them at all.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => <EditorPlaceholder height={570} />,
});
import { recordLessonCompleted, useLessonState } from '../lib/progress';
import { navigateToNextLesson } from '../lib/lesson-neighbors';
import { fetchDraft, saveDraft, recordSubmission } from '../lib/written-grader-store';
import { checkDiagram, allPassed, type CheckResult } from '../lib/diagram-check';
import { describeDiagram, fromMermaid } from '../lib/diagram-mermaid';
import { DEFAULT_RULES, emptyDiagram, type DiagramConfig, type DiagramDoc } from '../lib/diagram-types';

const STORAGE_PREFIX = 'shCode:diagram:';

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

interface Props {
  lessonId: string;
  lessonTitle: string;
  config: DiagramConfig;
  /** Falls back to this when config.prompt is unset. */
  fallbackPrompt?: string;
}

function parseDoc(raw: string | null): DiagramDoc | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return { version: 1, nodes: parsed.nodes, edges: parsed.edges };
    }
  } catch {}
  return null;
}

// Same loose threshold WrittenGrader uses: these rubrics are all zero-point
// under the green-to-advance model, so passing means a majority of criteria
// came back met-or-partial.
function isPassing(r: GradeResult): boolean {
  if (r.totalPossible === 0) {
    if (r.criteria.length === 0) return false;
    const ok = r.criteria.filter((c) => c.verdict === 'met' || c.verdict === 'partial').length;
    return ok >= Math.ceil(r.criteria.length / 2);
  }
  return r.totalEarned / r.totalPossible >= 0.7;
}

export default function DiagramAssignmentView({
  lessonId,
  lessonTitle,
  config,
  fallbackPrompt,
}: Props) {
  const starter = useMemo(
    () => (config.starter ? fromMermaid(config.starter) : emptyDiagram()),
    [config.starter],
  );
  const rules = config.rules ?? DEFAULT_RULES;

  const [doc, setDoc] = useState<DiagramDoc>(starter);
  const [loaded, setLoaded] = useState(false);
  const [checks, setChecks] = useState<CheckResult[] | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const progress = useLessonState();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- load: server draft wins over the local cache, starter is the floor
  useEffect(() => {
    let cancelled = false;
    const local = parseDoc(
      typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_PREFIX + lessonId),
    );
    (async () => {
      const server = progress.authed ? await fetchDraft(lessonId) : null;
      if (cancelled) return;
      const remote = parseDoc(server?.response ?? null);
      setDoc(remote ?? local ?? starter);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, progress.authed, starter]);

  // ---- local cache on every edit; server draft debounced
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + lessonId, JSON.stringify(doc));
    } catch {}
    if (!progress.authed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(lessonId, JSON.stringify(doc));
    }, 2500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, lessonId, loaded, progress.authed]);

  // Stale results mislead more than no results, so any edit clears them.
  const onChange = useCallback((next: DiagramDoc) => {
    setDoc(next);
    setChecks(null);
    setError(null);
  }, []);

  const runChecks = useCallback((): CheckResult[] => {
    const results = checkDiagram(doc, rules);
    setChecks(results);
    return results;
  }, [doc, rules]);

  async function saveNow() {
    setSaveStatus('saving');
    const ok = progress.authed ? await saveDraft(lessonId, JSON.stringify(doc)) : false;
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  async function submit() {
    const results = runChecks();
    if (!allPassed(results)) return;

    // Structure-only lesson: the checks are the whole grade.
    if (!config.aiGrader) {
      await recordLessonCompleted(lessonId, 0);
      if (progress.authed) {
        recordSubmission({
          lessonId,
          response: JSON.stringify(doc),
          gradeJson: { structural: results },
          score: results.length,
          possible: results.length,
        });
        saveDraft(lessonId, JSON.stringify(doc));
      }
      setTimeout(() => navigateToNextLesson(lessonId), 1200);
      return;
    }

    setGrading(true);
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
          prompt: config.aiGrader.prompt ?? config.prompt ?? fallbackPrompt ?? '',
          // The grader endpoint is text-in/text-out, so the diagram goes
          // across as Mermaid plus a shape-by-shape walk.
          response: describeDiagram(doc),
          rubric: config.aiGrader.rubric,
          model: config.aiGrader.model,
          contextDocs: config.aiGrader.contextDocs,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        setError(
          `Grader returned a non-JSON response (HTTP ${res.status}). Ask your teacher — the Ollama key or endpoint may not be configured.`,
        );
        return;
      }
      if (!data || !data.ok) {
        setError(data?.error || `Grading failed (HTTP ${res.status}).`);
        if (data?.offline) setOffline(true);
        return;
      }
      setResult(data as GradeResult);
      if (isPassing(data as GradeResult)) {
        await recordLessonCompleted(lessonId, data.totalEarned);
        setTimeout(() => navigateToNextLesson(lessonId), 1500);
      }
      if (progress.authed) {
        recordSubmission({
          lessonId,
          response: JSON.stringify(doc),
          gradeJson: { structural: results, ai: data },
          score: data.totalEarned,
          possible: data.totalPossible,
        });
        saveDraft(lessonId, JSON.stringify(doc));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGrading(false);
    }
  }

  const highlight = useMemo(
    () => (checks ?? []).filter((c) => !c.passed).flatMap((c) => c.offenders),
    [checks],
  );
  const structureOk = checks !== null && allPassed(checks);
  const promptText = config.prompt ?? fallbackPrompt ?? '';

  if (!loaded) return null;

  return (
    <section style={{ marginTop: 28 }}>
      {promptText && !fallbackPrompt ? (
        <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>
          {promptText}
        </p>
      ) : null}

      <DiagramEditor
        value={doc}
        onChange={onChange}
        highlight={highlight}
        height={480}
        onReset={
          config.starter
            ? () => {
                if (confirm('Throw away your work and reload the starter diagram?')) {
                  setDoc(fromMermaid(config.starter!));
                  setChecks(null);
                }
              }
            : undefined
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={runChecks}
          style={{
            padding: '8px 15px',
            borderRadius: 6,
            border: '1px solid #8be9fd',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'transparent',
            color: '#8be9fd',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13.5,
          }}
        >
          <ListChecks size={16} />
          Check my diagram
        </button>

        <button
          onClick={submit}
          disabled={grading || doc.nodes.length === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontWeight: 600,
            cursor: grading ? 'wait' : doc.nodes.length === 0 ? 'not-allowed' : 'pointer',
            background: grading ? '#44475a' : doc.nodes.length === 0 ? '#333' : '#bd93f9',
            color: '#282a36',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {grading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {grading ? 'Grading…' : result ? 'Re-submit for feedback' : 'Submit for feedback'}
        </button>

        <button
          onClick={saveNow}
          disabled={!progress.authed || saveStatus === 'saving'}
          title={progress.authed ? 'Save without submitting' : 'Sign in to save'}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #44475a',
            fontWeight: 600,
            cursor: !progress.authed ? 'not-allowed' : 'pointer',
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
          {doc.nodes.length} shapes · {doc.edges.length} arrows
        </span>
      </div>

      {checks && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, color: '#8be9fd', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListChecks size={16} />
            Flowchart structure — {checks.filter((c) => c.passed).length} / {checks.length} checks passed
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {checks.map((c) => (
              <div
                key={c.id + c.title}
                style={{
                  padding: '9px 12px',
                  background: '#282a36',
                  borderRadius: 6,
                  border: '1px solid ' + (c.passed ? '#50fa7b44' : '#ff555577'),
                  display: 'flex',
                  gap: 9,
                  alignItems: 'flex-start',
                }}
              >
                {c.passed ? (
                  <CircleCheck size={17} color="#50fa7b" style={{ flex: '0 0 auto', marginTop: 1 }} />
                ) : (
                  <CircleX size={17} color="#ff5555" style={{ flex: '0 0 auto', marginTop: 1 }} />
                )}
                <div>
                  <strong style={{ color: '#f8f8f2', fontSize: 13.5 }}>{c.title}</strong>
                  <p style={{ margin: '2px 0 0', color: '#bbb', fontSize: 12.5, lineHeight: 1.5 }}>
                    {c.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!structureOk && (
            <p style={{ color: '#ffb86c', fontSize: 12.5, marginTop: 8 }}>
              Shapes with a problem are outlined in red on the canvas. Fix the structure and the
              diagram goes to the AI grader.
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
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

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, color: '#bd93f9', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} />
            {config.aiGrader?.rubricTitle ?? 'AI feedback on your logic'}
          </h3>
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
              const label = config.aiGrader?.rubric.find((r) => r.id === c.id);
              const color =
                c.verdict === 'met' ? '#50fa7b' : c.verdict === 'partial' ? '#f1fa8c' : '#ff5555';
              const Icon =
                c.verdict === 'met' ? CircleCheck : c.verdict === 'partial' ? Circle : CircleX;
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
                      {result.totalPossible === 0 ? c.verdict : `${c.earned} / ${c.max} pts`}
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
          {result.hints?.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: '#282a36',
                borderRadius: 6,
                border: '1px solid #ffb86c55',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                  color: '#ffb86c',
                  fontWeight: 600,
                }}
              >
                <Lightbulb size={16} />
                Hints
              </div>
              <ul style={{ margin: 0, paddingLeft: 22, color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                {result.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
