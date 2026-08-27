'use client';

// The Dimensions panel. Reads the list a sketch declares in
// getParameterDefinitions() and drives main(params) directly, so changing a
// number rebuilds the model without reloading the runner.

import { useEffect, useRef, useState } from 'react';

export interface ParamDef {
  name: string;
  type?: string;
  caption?: string;
  initial?: unknown;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  values?: unknown[];
  captions?: string[];
}

export type ParamValues = Record<string, unknown>;

interface Props {
  defs: ParamDef[];
  values: ParamValues;
  onChange: (next: ParamValues) => void;
  /** End of a gesture — a whole slider drag is one undo, not sixty. */
  onCommit: () => void;
  lastMs: number | null;
  /** Why the shape on screen no longer matches the numbers, if it doesn't. */
  stale?: 'empty' | 'error' | null;
}

const NUMERIC = new Set(['float', 'int', 'number', 'slider', 'range']);

function isNumeric(d: ParamDef) {
  // A def carrying min/max and a numeric initial is a slider on jscad.app too,
  // even with no type field.
  return NUMERIC.has(String(d.type ?? '').toLowerCase())
    || (d.type === undefined && typeof d.initial === 'number');
}

function isInt(d: ParamDef) {
  return String(d.type ?? '').toLowerCase() === 'int';
}

// Applied on the way out of a field, never while typing. Snapping to step is
// what makes a declared `step: 1` mean something -- without it a typed 7.37
// sailed straight into an int-typed dimension and main() got a fraction.
function settle(n: number, d: ParamDef) {
  let v = n;
  const step = typeof d.step === 'number' && d.step > 0 ? d.step : isInt(d) ? 1 : 0;
  if (step > 0) {
    const base = typeof d.min === 'number' ? d.min : 0;
    v = base + Math.round((v - base) / step) * step;
    // Re-round: floating point turns 5 + 3*0.1 into 5.300000000000001.
    v = Number(v.toFixed(10));
  }
  if (isInt(d)) v = Math.round(v);
  if (typeof d.min === 'number') v = Math.max(d.min, v);
  if (typeof d.max === 'number') v = Math.min(d.max, v);
  return v;
}

export default function ReshapeParamsPanel({
  defs, values, onChange, onCommit, lastMs, stale,
}: Props) {
  // What is in the text box, deliberately NOT the same as the model value:
  // half-typed input like "" or "-" has to survive on screen without being
  // pushed into the model or snapped to min.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<ParamValues | null>(null);

  useEffect(() => {
    setDraft({});
  }, [defs]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Slider drags fire far faster than a rebuild completes; coalesce to one per
  // frame so a fast drag cannot queue a backlog of stale geometry.
  function push(name: string, value: unknown) {
    pendingRef.current = { ...(pendingRef.current ?? {}), [name]: value };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) onChange(next);
    });
  }

  // End of a gesture. The value is carried by the frame callback above, which
  // has NOT run yet when a blur or a pointerup arrives — those fire
  // synchronously. Committing without flushing first therefore commits an empty
  // queue, and the edit is dropped at the next structural change with nothing
  // on screen admitting it.
  function commit() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next) onChange(next);
    onCommit();
  }

  if (defs.length === 0) {
    return (
      <div className="reshape-params-empty">
        No dimensions declared. Add a <code>getParameterDefinitions()</code> function
        returning a list of names and this panel fills in.
        <style>{`
          .reshape-params-empty { padding: 10px 12px; color: #6272a4; font-size: 12px; line-height: 1.5; }
          .reshape-params-empty code { color: #8be9fd; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="reshape-params">
      <div className="reshape-params-head">
        <span>Dimensions</span>
        {lastMs !== null && (
          <span className="reshape-params-ms" title="Time for the last rebuild">
            {lastMs < 1 ? '<1' : Math.round(lastMs)} ms
          </span>
        )}
      </div>

      {stale && (
        <p className="reshape-params-empty-warn">
          {stale === 'empty'
            ? 'These numbers leave nothing behind — the cut is bigger than the part it is cutting. '
            : 'These numbers stopped the code before it produced a shape. '}
          What is on screen is the last version that worked.
        </p>
      )}

      {defs.map((d) => {
        const label = d.caption || d.name;
        const raw = values[d.name];

        if (String(d.type).toLowerCase() === 'checkbox') {
          return (
            <label key={d.name} className="reshape-param-row reshape-param-check">
              <input
                type="checkbox"
                checked={Boolean(raw)}
                onChange={(e) => { push(d.name, e.target.checked); commit(); }}
              />
              <span>{label}</span>
            </label>
          );
        }

        if (Array.isArray(d.values)) {
          return (
            <div key={d.name} className="reshape-param-row">
              <label htmlFor={`p-${d.name}`}>{label}</label>
              <select
                id={`p-${d.name}`}
                value={String(raw ?? '')}
                onChange={(e) => {
                  const i = d.values!.findIndex((v) => String(v) === e.target.value);
                  push(d.name, i >= 0 ? d.values![i] : e.target.value);
                }}
              >
                {d.values.map((v, i) => (
                  <option key={String(v)} value={String(v)}>
                    {d.captions?.[i] ?? String(v)}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (!isNumeric(d)) {
          return (
            <div key={d.name} className="reshape-param-row">
              <label htmlFor={`p-${d.name}`}>{label}</label>
              <input
                id={`p-${d.name}`}
                type="text"
                value={String(raw ?? '')}
                onChange={(e) => push(d.name, e.target.value)}
              />
            </div>
          );
        }

        const num = typeof raw === 'number' ? raw : Number(raw) || 0;
        const text = draft[d.name] ?? String(num);
        const parsed = Number(text);
        const bad = text.trim() === '' || !Number.isFinite(parsed);
        const hasRange = typeof d.min === 'number' && typeof d.max === 'number';

        return (
          <div key={d.name} className="reshape-param-row">
            <label htmlFor={`p-${d.name}`}>{label}</label>
            <div className="reshape-param-controls">
              {hasRange && (
                <input
                  type="range"
                  aria-label={`${label} slider`}
                  min={d.min}
                  max={d.max}
                  step={d.step ?? 'any'}
                  value={num}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDraft((p) => ({ ...p, [d.name]: String(v) }));
                    push(d.name, v);
                  }}
                />
              )}
              <input
                id={`p-${d.name}`}
                type="text"
                inputMode="decimal"
                className={bad ? 'is-bad' : undefined}
                aria-invalid={bad || undefined}
                value={text}
                onChange={(e) => {
                  const t = e.target.value;
                  setDraft((p) => ({ ...p, [d.name]: t }));
                  const v = Number(t);
                  // Push only what parses. An empty or half-typed box leaves the
                  // model exactly as it was rather than collapsing it to zero.
                  if (t.trim() !== '' && Number.isFinite(v)) push(d.name, v);
                }}
                onBlur={() => {
                  // Clamp on the way out, never mid-keystroke: snapping while
                  // typing eats the first digit of any value below min.
                  setDraft((p) => {
                    const rest = { ...p };
                    delete rest[d.name];
                    return rest;
                  });
                  if (!bad) {
                    const v = settle(parsed, d);
                    if (v !== num) push(d.name, v);
                  }
                  // Leaving the field ends the gesture. Without this the typed
                  // value lives only in the panel's optimistic state and is
                  // dropped the next time the doc is regenerated.
                  commit();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                    return;
                  }
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                  e.preventDefault();
                  const unit = (typeof d.step === 'number' && d.step > 0 ? d.step : 1)
                    * (e.shiftKey ? 10 : 1);
                  const from = Number.isFinite(parsed) ? parsed : num;
                  const next = settle(from + (e.key === 'ArrowUp' ? unit : -unit), d);
                  setDraft((p) => ({ ...p, [d.name]: String(next) }));
                  push(d.name, next);
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        .reshape-params { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; overflow-y: auto; }
        .reshape-params-head {
          display: flex; align-items: baseline; justify-content: space-between;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          color: #6272a4; padding-bottom: 6px; margin-bottom: 4px;
          border-bottom: 1px solid var(--border);
        }
        .reshape-params-ms {
          font-variant-numeric: tabular-nums; color: #50fa7b;
          text-transform: none; letter-spacing: 0;
        }
        .reshape-params-empty-warn {
          /* Sticky: the panel scrolls, and a student who has scrolled down to a
             field is exactly the person who needs to know why the shape went
             away. Pinned to the top it stays with them. */
          position: sticky; top: 0; z-index: 1;
          margin: 0 0 6px; padding: 6px 8px;
          background-color: #3a2f22;
          border-left: 2px solid #ffb86c;
          color: #ffb86c; font-size: 11px; line-height: 1.45;
        }
        .reshape-param-row { display: flex; flex-direction: column; gap: 3px; padding: 5px 0; }
        .reshape-param-row > label { font-size: 12px; color: var(--text); }
        /* Slider on its own line. Sharing a row with the number box inside a
           208px panel collapsed it to a ~14px dot — still draggable by a test
           driving its bounding box, useless to a hand. */
        .reshape-param-controls { display: flex; flex-direction: column; gap: 5px; }
        .reshape-param-controls input[type="range"] {
          width: 100%; min-width: 0; margin: 0; accent-color: #bd93f9;
        }
        .reshape-param-controls input[type="text"] { width: 100%; }
        .reshape-param-row input[type="text"], .reshape-param-row select {
          background: var(--bg); color: var(--text);
          border: 1px solid var(--border); border-radius: 3px;
          padding: 3px 6px; font-size: 12px; font-variant-numeric: tabular-nums;
        }
        .reshape-param-row input.is-bad { border-color: #ff5555; color: #ff5555; }
        .reshape-param-check { flex-direction: row; align-items: center; gap: 7px; }
        .reshape-param-check span { font-size: 12px; color: var(--text); }
      `}</style>
    </div>
  );
}
