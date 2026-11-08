'use client';

// Teacher-facing editor for one class's grade-category weights. Mounted on
// /teacher?class=<id> alongside DueDatesPanel, whose card it sits next to.
//
// Much simpler than DueDatesPanel: 8 fixed categories, no scope/inheritance,
// no per-lesson rows -- just a number per category, saved on blur. `null`
// (the Reset button) deletes the override row and reverts to the
// curriculum default from lib/grading-weights.ts.

import { useEffect, useState } from 'react';
import { useFeedback } from './FeedbackProvider';
import { CATEGORY_LABEL, DEFAULT_WEIGHTS, GRADE_CATEGORIES, type GradeCategory } from '../lib/grading-weights';

interface WeightRow {
  category: GradeCategory;
  weight: number;
  isDefault: boolean;
}

const C = {
  border: '#44475a',
  dim: '#8393c4',
  text: '#f8f8f2',
  input: '#282a36',
  accent: '#8be9fd',
  warn: '#ffb86c',
};

async function fetchWeights(classId: string): Promise<WeightRow[]> {
  const res = await fetch(`/api/classes/${classId}/grading-weights`, { credentials: 'include' });
  if (!res.ok) throw new Error(`grading-weights GET ${res.status}`);
  const data = (await res.json()) as { weights: WeightRow[] };
  return data.weights;
}

export default function GradingWeightsPanel({ classId }: { classId: string }) {
  const [rows, setRows] = useState<WeightRow[] | null>(null);
  const { toast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    fetchWeights(classId)
      .then((weights) => {
        if (!cancelled) setRows(weights);
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
      setRows(data.weights);
      toast('Weight saved. Every grade in this class now uses it.');
    } catch {
      setError('Could not save that weight.');
      toast('Could not save that weight.', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (error && !rows) {
    return <div style={{ fontSize: 13, color: '#ff5555' }}>{error}</div>;
  }
  if (!rows) {
    return <div style={{ fontSize: 13, color: C.dim }}>Loading…</div>;
  }

  const total = rows.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Grading weights</h2>
        <span style={{ fontSize: 12, color: C.dim }}>Total <strong style={{ color: C.text }}>{total}</strong></span>
      </div>
      <p style={{ maxWidth: 720, margin: '0 0 12px', fontSize: 12, lineHeight: 1.5, color: C.dim }}>
        Each share is its weight divided by the total.<br />
        Only categories with work count toward a student’s grade; empty categories drop out.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '0 20px' }}>
        {rows.map((r) => (
          <div key={r.category} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 50px 76px 36px', alignItems: 'center', gap: 6, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1, fontSize: 13 }}>{CATEGORY_LABEL[r.category]}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={r.weight}
              onChange={(e) => {
                const v = e.target.value === '' ? 0 : Number(e.target.value);
                setRows((prev) => prev!.map((x) => (x.category === r.category ? { ...x, weight: v } : x)));
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== (GRADE_CATEGORIES.includes(r.category) ? r.weight : v)) {
                  write(r.category, v);
                }
              }}
              style={{
                width: 50, boxSizing: 'border-box',
                background: C.input,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: 13,
              }}
            />
            <span title="Effective share when all categories have work" style={{ fontSize: 12, color: C.dim, textAlign: 'right', whiteSpace: 'nowrap' }}>{total > 0 ? `${(r.weight / total * 100).toFixed(1)}% share` : '—'}</span>
            {r.isDefault ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={() => write(r.category, null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.accent,
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0,
                  width: 36,
                  textAlign: 'left',
                }}
              >
                Reset
              </button>
            )}
          </div>
        ))}
      </div>
      <div role="status" style={{ fontSize: 12, color: C.dim, marginTop: 10 }}>{saving ? 'Saving…' : 'Saves automatically on blur'}</div>
      {error && <div style={{ fontSize: 12, color: '#ff5555', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
