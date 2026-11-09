'use client';

// Teacher-facing editor for one class's grade-category weights. Mounted on
// /teacher?class=<id> alongside DueDatesPanel, whose card it sits next to.
//
// Much simpler than DueDatesPanel: 8 fixed categories, no scope/inheritance,
// no per-lesson rows -- just a number per category, saved on blur. `null`
// (the Reset button) deletes the override row and reverts to the
// curriculum default from lib/grading-weights.ts.

import { useEffect, useRef, useState } from 'react';
import { useFeedback } from './FeedbackProvider';
import { CATEGORY_LABEL, DEFAULT_WEIGHTS, type GradeCategory } from '../lib/grading-weights';

interface WeightRow {
  category: GradeCategory;
  weight: number;
  isDefault: boolean;
}

const C = {
  border: 'var(--c-line)',
  dim: 'var(--c-meta)',
  text: 'var(--c-fg)',
  input: 'var(--c-bg)',
  accent: 'var(--c-cyan)',
  warn: 'var(--c-orange)',
};

async function fetchWeights(classId: string): Promise<WeightRow[]> {
  const res = await fetch(`/api/classes/${classId}/grading-weights`, { credentials: 'include' });
  if (!res.ok) throw new Error(`grading-weights GET ${res.status}`);
  const data = (await res.json()) as { weights: WeightRow[] };
  return data.weights;
}

export default function GradingWeightsPanel({ classId, desktop = false }: { classId: string; desktop?: boolean }) {
  const [rows, setRows] = useState<WeightRow[] | null>(null);
  const { toast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True once a weight is edited and until a save actually succeeds, so the status never claims "Saved" for an unsaved edit.
  const [dirty, setDirty] = useState(false);
  // The weights the server last confirmed. onBlur compares against these: the row itself already holds the
  // edited value (onChange updates it), so comparing against the row meant a changed weight was never saved.
  const savedRef = useRef<Partial<Record<GradeCategory, number>>>({});
  const remember = (weights: WeightRow[]) => { savedRef.current = Object.fromEntries(weights.map((w) => [w.category, w.weight])); };

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    fetchWeights(classId)
      .then((weights) => {
        if (!cancelled) { remember(weights); setRows(weights); }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load grading weights.');
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  async function write(category: GradeCategory, weight: number | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/grading-weights`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [{ category, weight }] }),
      });
      if (!res.ok) throw new Error(`grading-weights PUT ${res.status}`);
      const data = (await res.json()) as { weights: WeightRow[] };
      remember(data.weights);
      setRows(data.weights);
      setDirty(false);
      toast('Weight saved. Every grade in this class now uses it.');
    } catch {
      setError('Could not save that weight.');
      toast('Could not save that weight.', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (error && !rows) {
    return <div style={{ fontSize: 13, color: 'var(--c-red)' }}>{error}</div>;
  }
  if (!rows) {
    return <div style={{ fontSize: 13, color: C.dim }}>Loading…</div>;
  }

  const total = rows.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: desktop ? 'wrap' : undefined, gap: 12, marginBottom: 12 }}>
        {desktop ? (
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 12px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Grading weights</h2>
            <span role="status" style={{ fontSize: 13, color: error ? 'var(--c-red)' : saving ? C.dim : dirty ? 'var(--c-orange)' : 'var(--c-green)' }}>
              {error || (saving ? 'Saving…' : dirty ? 'Not saved' : 'Saved')}
            </span>
          </div>
        ) : (
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Grading weights</h2>
        )}
        <span style={{ fontSize: 13, color: C.dim }}>Total <strong style={{ color: C.text }}>{total}</strong></span>
      </div>
      <p style={{ maxWidth: 720, margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: C.dim }}>
        Each share is its weight divided by the total.<br />
        Only categories with work count toward a student’s grade; empty categories drop out.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '0 24px' }}>
        {rows.map((r) => (
          <div key={r.category} style={{ display: 'grid', gridTemplateColumns: desktop ? 'minmax(0, 1fr) 50px 96px 48px' : 'minmax(0, 1fr) 50px 88px 48px', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1, fontSize: 13 }}>{CATEGORY_LABEL[r.category]}</span>
            <input
              type="number"
              aria-label={`${CATEGORY_LABEL[r.category]} weight`}
              min={0}
              max={100}
              value={r.weight}
              onChange={(e) => {
                const v = e.target.value === '' ? 0 : Number(e.target.value);
                setRows((prev) => prev!.map((x) => (x.category === r.category ? { ...x, weight: v } : x)));
                setDirty(true);
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== savedRef.current[r.category]) {
                  write(r.category, v);
                }
              }}
              style={{
                width: 50, height: 32, boxSizing: 'border-box',
                background: C.input,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 13,
              }}
            />
            <span title="Effective share when all categories have work" style={{ fontSize: desktop ? 14 : 13, color: desktop ? C.text : C.dim, textAlign: 'right', whiteSpace: 'nowrap' }}>{total > 0 ? `${(r.weight / total * 100).toFixed(1)}% share` : '—'}</span>
            {r.isDefault ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={() => write(r.category, null)}
                style={{
                  background: 'none',
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  height: 32,
                  color: C.accent,
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: 0,
                  width: 48,
                  textAlign: 'center',
                }}
              >
                Reset
              </button>
            )}
          </div>
        ))}
      </div>
      {!desktop && <div role="status" style={{ fontSize: 13, color: C.dim, marginTop: 12 }}>{saving ? 'Saving…' : ''}</div>}
      {!desktop && error && <div style={{ fontSize: 13, color: 'var(--c-red)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
