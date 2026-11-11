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
  // Category | Weight (the field) | Share | Reset — shared by the header row and every category row.
  // r7 T5: the Weight track holds the input and its "/ total" unit, so a weight reads as a share of the total.
  // r8 T2: the total is said once (the Weight heading and the Total row), not as "/ 115" on every row.
  const rowCols = desktop ? 'minmax(0, 1fr) 128px 104px 48px' : 'minmax(0, 1fr) 76px 56px 48px';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: desktop ? 'wrap' : undefined, gap: 12, marginBottom: 12 }}>
        {desktop ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Grading weights</h2>
            {/* The save state reads as part of the panel: a status with its mark, then the note that says how
                saving works, on its own quiet line under the heading (beside it, it crowded the title). */}
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--font-prose)', fontSize: 13 }}>
              <span role="status" style={{ fontWeight: 600, color: error ? 'var(--c-red)' : saving ? C.dim : dirty ? 'var(--c-orange)' : 'var(--c-green)' }}>
                {!error && !saving && !dirty && <span aria-hidden="true">✓ </span>}{error || (saving ? 'Saving…' : dirty ? 'Not saved' : 'Saved')}
              </span>
              {!error && <span style={{ color: C.dim }}>· changes save automatically</span>}
            </span>
          </div>
        ) : (
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Grading weights</h2>
        )}
      </div>
      <p style={{ maxWidth: 640, margin: '0 0 8px', fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, color: C.dim }}>
        <strong style={{ color: C.text, fontWeight: 600 }}>Weight</strong> is a number you choose; <strong style={{ color: C.text, fontWeight: 600 }}>Share</strong> is its percent of the total. Only categories with work count toward a student’s grade; empty categories drop out.
      </p>
      {/* One column, so the header row below lines up with every row's fields. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: 640 }}>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: rowCols, alignItems: 'end', gap: 8, padding: '8px 0 6px', borderBottom: `1px solid ${C.border}`, fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600, color: C.dim }}>
          <span>Category</span>
          <span style={{ whiteSpace: 'nowrap' }}>Weight{desktop && <span style={{ fontWeight: 500 }}> (total {total})</span>}</span>
          <span style={{ textAlign: 'right' }}>{desktop ? 'Share of grade' : 'Share'}</span>
          <span />
        </div>
        {rows.map((r) => (
          <div key={r.category} style={{ display: 'grid', gridTemplateColumns: rowCols, alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid color-mix(in srgb, ${C.border} 60%, transparent)` }}>
            {/* Label (what the row is) in the reading face; the share beside the input is the quiet helper. */}
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 500, lineHeight: 1.35, color: C.text }}>{CATEGORY_LABEL[r.category]}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <input
              type="number"
              aria-label={`${CATEGORY_LABEL[r.category]} weight, out of a total of ${total}`}
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
              className="teacher-weight-input"
              // A real number field, not a badge: an inset surface darker than the card, a 1px visible border,
              // regular weight, and a cyan focus ring (globals.css, climb4 r1 teacher).
              style={{
                width: 60, height: 32, boxSizing: 'border-box',
                background: 'color-mix(in srgb, var(--c-deep) 50%, var(--x-151515))',
                color: C.text,
                border: '1px solid var(--c-comment)',
                borderRadius: 4,
                padding: '4px 8px',
                fontFamily: 'var(--font-prose)',
                fontSize: 15,
                fontWeight: 400,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            </span>
            <span title="Effective share when all categories have work" style={{ fontFamily: 'var(--font-prose)', fontSize: 14, color: C.text, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{total > 0 ? `${(r.weight / total * 100).toFixed(1)}%` : '—'}</span>
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
        {/* Footer: the total sits under the Weight column it adds up, with how a share follows from it. */}
        <div style={{ display: 'grid', gridTemplateColumns: rowCols, alignItems: 'baseline', gap: 8, padding: '8px 0 0', fontFamily: 'var(--font-prose)', fontSize: 13, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ lineHeight: 1.4 }}><span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>Total</span></span>
          <strong style={{ width: 60, boxSizing: 'border-box', textAlign: 'right', paddingRight: 9, color: C.text, fontSize: 15, fontWeight: 600 }}>{total}</strong>
          <span style={{ textAlign: 'right', color: C.text, fontSize: 14 }}>{total > 0 ? '100%' : '—'}</span>
          <span />
        </div>
      </div>
      {!desktop && <div role="status" style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: C.dim, marginTop: 12 }}>{saving ? 'Saving…' : ''}</div>}
      {!desktop && error && <div style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: 'var(--c-red)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
