'use client';

// What a student sees after the AI grader marks a console part they handed in:
// the per-criterion verdicts, the short note, and the hints. Presentational only;
// the caller owns the request, the try count and the score. Used by the
// find-and-fix parts of the chapter tests (LessonWorkspace). The flowchart and
// written parts draw the same shape inline in their own components.

import { Circle, CircleCheck, CircleX, Lightbulb, Sparkles } from 'lucide-react';

export interface AiCriterion {
  id: string;
  earned: number;
  max: number;
  verdict: 'met' | 'partial' | 'missing';
  feedback: string;
}

export interface AiGradeResultData {
  totalEarned: number;
  totalPossible: number;
  criteria: AiCriterion[];
  summary: string;
  hints: string[];
}

interface Props {
  title: string;
  /** criterion id -> the title shown beside its verdict (from the redacted rubric). */
  titles: Record<string, string>;
  result: AiGradeResultData | null;
  grading: boolean;
  stage: string | null;
  error: string | null;
}

export default function AiGradeResultPanel({ title, titles, result, grading, stage, error }: Props) {
  if (!grading && !result && !error) return null;
  return (
    <section data-testid="ai-grade-panel" style={{ margin: '18px 0' }}>
      {grading ? (
        <p role="status" style={{ color: '#bd93f9', fontSize: 14 }}>
          Grading your file{stage ? ` (${stage})` : ''}. This takes a few seconds.
        </p>
      ) : null}
      {error ? (
        <div style={{ padding: 12, background: '#4a2a2a', border: '1px solid #ff5555', borderRadius: 6, color: '#ffd6d6', fontSize: 13 }}>
          <strong style={{ color: '#ff5555' }}>Could not grade</strong>
          <p style={{ margin: '4px 0 0' }}>{error} That did not use up a try.</p>
        </div>
      ) : null}
      {result ? (
        <div>
          <h3 style={{ fontSize: 14, color: '#bd93f9', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} />
            {title}
          </h3>
          {result.summary ? (
            <div style={{ marginBottom: 12, padding: 12, borderLeft: '3px solid #bd93f9', background: 'rgba(189,147,249,0.08)', borderRadius: 4, color: '#f8f8f2', fontStyle: 'italic' }}>
              {result.summary}
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 10 }}>
            {result.criteria.map((c, i) => {
              const color = c.verdict === 'met' ? '#50fa7b' : c.verdict === 'partial' ? '#f1fa8c' : '#ff5555';
              const Icon = c.verdict === 'met' ? CircleCheck : c.verdict === 'partial' ? Circle : CircleX;
              return (
                <div key={c.id || i} style={{ padding: 12, background: '#282a36', borderRadius: 6, border: '1px solid ' + color + '55' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={18} color={color} />
                    <strong style={{ color: '#f8f8f2' }}>{titles[c.id] || c.id}</strong>
                    <span style={{ marginLeft: 'auto', color, fontWeight: 600, fontSize: 13 }}>
                      {result.totalPossible === 0 ? c.verdict : `${c.earned} / ${c.max} pts`}
                    </span>
                  </div>
                  {c.feedback ? <p style={{ margin: '4px 0 0 26px', color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>{c.feedback}</p> : null}
                </div>
              );
            })}
          </div>
          {result.totalPossible > 0 ? (
            <p style={{ marginTop: 10, color: '#f8f8f2', fontSize: 14 }}>
              This try: {result.totalEarned} of {result.totalPossible}.
            </p>
          ) : null}
          {result.hints?.length > 0 ? (
            <div style={{ marginTop: 14, padding: 12, background: '#282a36', borderRadius: 6, border: '1px solid #ffb86c55' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#ffb86c', fontWeight: 600 }}>
                <Lightbulb size={16} />
                Hints
              </div>
              <ul style={{ margin: 0, paddingLeft: 22, color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                {result.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
