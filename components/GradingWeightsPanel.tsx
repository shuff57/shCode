'use client';

// Teacher-facing editor for one class's grade-category weights. Mounted on
// /teacher?class=<id> alongside DueDatesPanel, whose card it sits next to.
//
// Much simpler than DueDatesPanel: 8 fixed categories, no scope/inheritance,
// no per-lesson rows -- just a number per category, saved on blur. `null`
// (the Reset button) deletes the override row and reverts to the
// curriculum default from lib/grading-weights.ts.

import { useEffect, useState } from 'react';
import { CATEGORY_LABEL, DEFAULT_WEIGHTS, GRADE_CATEGORIES, type GradeCategory } from '../lib/grading-weights';

interface WeightRow {
  category: GradeCategory;
  weight: number;
  isDefault: boolean;
}

const C = {
  border: '#44475a',
  dim: '#6272a4',
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
    } catch {
      setError('Could not save that weight.');
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
      <p style={{ margin: '0 0 12px', fontSize: 12, color: C.dim, maxWidth: 480 }}>
        How much each category counts toward this class&rsquo;s grade percentage on
        the home page. A category with no graded lessons yet (e.g. Final Exams)
        doesn&rsquo;t drag the percentage down &mdash; its weight is
        redistributed across whatever categories do have lessons.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
        {rows.map((r) => (
          <div key={r.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                width: 64,
                background: C.input,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: 13,
              }}
            />
            <span style={{ fontSize: 13, color: C.dim, width: 10 }}>%</span>
            {r.isDefault ? (
              <span style={{ fontSize: 11, color: C.dim, width: 52 }}>default</span>
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
                  width: 52,
                  textAlign: 'left',
                }}
              >
                Reset
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: total === 100 ? C.dim : C.warn }}>
        Total: {total}%
        {total !== 100 ? " — doesn't add up to 100, but nothing stops you saving it that way" : ''}
      </div>
      {saving && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Saving…</div>}
      {error && <div style={{ fontSize: 12, color: '#ff5555', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
