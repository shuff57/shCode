'use client';

// Rules for a sketch's edges. One row per edge, because an edge is the thing a
// constraint is about and there is no way to click one on the canvas -- the
// handles are corners, and an edge between two of them has nowhere to put a
// third handle without crowding both.

import {
  type Constraint,
  type Point,
  edgeCorners,
  edgeLength,
  residualOf,
} from '../../lib/sketch-solve';
import { maxFilletRadius } from '../../lib/sketch-arc';

interface Props {
  points: Point[];
  /** Bulge of the edge leaving corner n -- present and nonzero means curved.
   *  Absent entirely for a sketch that has never had a corner rounded. */
  bulges?: Record<number, number>;
  constraints: Constraint[];
  onChange: (next: Constraint[]) => void;
  /** Round corner `corner` to `radius` -- the caller owns the actual
   *  point/bulge rewrite (lib/sketch-arc.ts's filletCorner), same division
   *  of labour onChange already has for constraints. */
  onRound: (corner: number, radius: number) => void;
}

function has(cs: Constraint[], kind: Constraint['kind'], edge: number) {
  return cs.some((c) => 'edge' in c && c.edge === edge && c.kind === kind);
}

export default function SketchConstraints({ points, bulges, constraints, onChange, onRound }: Props) {
  const count = points.length;
  const residual = residualOf(points, constraints);
  const fighting = residual > 1e-3;

  function toggle(kind: 'horizontal' | 'vertical', edge: number) {
    if (has(constraints, kind, edge)) {
      onChange(constraints.filter((c) => !('edge' in c && c.edge === edge && c.kind === kind)));
      return;
    }
    // Horizontal and vertical on one edge is a contradiction, not a stack, so
    // the other one comes off rather than both fighting forever.
    const other = kind === 'horizontal' ? 'vertical' : 'horizontal';
    const cleaned = constraints.filter(
      (c) => !('edge' in c && c.edge === edge && c.kind === other)
    );
    onChange([...cleaned, { kind, edge }]);
  }

  function setLength(edge: number, raw: string) {
    const rest = constraints.filter((c) => !(c.kind === 'length' && c.edge === edge));
    const v = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(v) || v <= 0) {
      onChange(rest);
      return;
    }
    onChange([...rest, { kind: 'length', edge, value: Math.round(v * 100) / 100 }]);
  }

  function lockCorner(corner: number) {
    const held = constraints.some((c) => c.kind === 'lock' && c.corner === corner);
    onChange(
      held
        ? constraints.filter((c) => !(c.kind === 'lock' && c.corner === corner))
        : [...constraints, { kind: 'lock', corner }]
    );
  }

  return (
    <div className="sk-rules">
      <div className="sk-rules-head">
        <span>Rules</span>
        {fighting && (
          <span className="sk-rules-warn" title="These rules cannot all be true at once">
            off by {residual.toFixed(1)}
          </span>
        )}
      </div>

      {fighting && (
        <p className="sk-rules-note">
          These rules disagree — the shape is as close as it can get to all of them.
          Remove one to settle it.
        </p>
      )}

      <table className="sk-table">
        <thead>
          <tr>
            <th>Edge</th>
            <th>Shape</th>
            <th>Across</th>
            <th>Up</th>
            <th>Length</th>
          </tr>
        </thead>
        <tbody>
          {points.map((_, e) => {
            const [a, b] = edgeCorners(e, count);
            const fixed = constraints.find((c) => c.kind === 'length' && c.edge === e);
            // A rounded corner's arc has no single across/up/length to hold --
            // Length would stretch the chord at a fixed bulge, which scales
            // the radius and breaks tangency with both neighbouring edges.
            const curved = Boolean(bulges?.[e]);
            const curvedTitle = curved
              ? "This edge is a rounded corner's arc. Across, Up and Length only make sense on a straight edge."
              : undefined;
            return (
              <tr key={e}>
                <td title={`corner ${a + 1} to corner ${b + 1}`}>{e + 1}</td>
                <td className="sk-shape">{curved ? 'curved' : 'straight'}</td>
                <td>
                  <button
                    aria-label={`Edge ${e + 1} across`}
                    aria-pressed={has(constraints, 'horizontal', e)}
                    className={has(constraints, 'horizontal', e) ? 'on' : undefined}
                    onClick={() => toggle('horizontal', e)}
                    disabled={curved}
                    title={curvedTitle}
                  >
                    ↔
                  </button>
                </td>
                <td>
                  <button
                    aria-label={`Edge ${e + 1} up`}
                    aria-pressed={has(constraints, 'vertical', e)}
                    className={has(constraints, 'vertical', e) ? 'on' : undefined}
                    onClick={() => toggle('vertical', e)}
                    disabled={curved}
                    title={curvedTitle}
                  >
                    ↕
                  </button>
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Edge ${e + 1} length`}
                    placeholder={edgeLength(points, e).toFixed(1)}
                    defaultValue={fixed && fixed.kind === 'length' ? String(fixed.value) : ''}
                    onBlur={(ev) => setLength(e, ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                    }}
                    disabled={curved}
                    title={curvedTitle}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="sk-pins">
        <span>Pin a corner:</span>
        {points.map((_, i) => (
          <button
            key={i}
            aria-label={`Pin corner ${i + 1}`}
            aria-pressed={constraints.some((c) => c.kind === 'lock' && c.corner === i)}
            className={constraints.some((c) => c.kind === 'lock' && c.corner === i) ? 'on' : undefined}
            onClick={() => lockCorner(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="sk-rounds">
        <span>Round a corner:</span>
        {points.map((_, i) => (
          <input
            key={i}
            type="number"
            inputMode="decimal"
            aria-label={`Round corner ${i + 1}`}
            title={`Round corner ${i + 1} -- up to ${maxFilletRadius(points, i).toFixed(1)}`}
            min={0}
            max={maxFilletRadius(points, i)}
            step="0.5"
            placeholder="0"
            onBlur={(ev) => {
              const v = Number(ev.target.value);
              ev.target.value = '';
              if (!Number.isFinite(v) || v <= 0) return;
              onRound(i, Math.min(v, maxFilletRadius(points, i)));
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
            }}
          />
        ))}
      </div>

      <style>{`
        .sk-rules { border-top: 1px solid var(--border); padding: 8px 10px; font-size: 12px; }
        .sk-rules-head {
          display: flex; justify-content: space-between; align-items: baseline;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          color: #6272a4; margin-bottom: 6px;
        }
        .sk-rules-warn { color: #ffb86c; text-transform: none; letter-spacing: 0; }
        .sk-rules-note {
          margin: 0 0 8px; padding: 6px 8px; font-size: 11px; line-height: 1.45;
          color: #ffb86c; background-color: #3a2f22; border-left: 2px solid #ffb86c;
        }
        .sk-table { width: 100%; border-collapse: collapse; }
        .sk-table th {
          text-align: left; font-weight: normal; color: #6272a4;
          font-size: 11px; padding: 2px 4px;
        }
        .sk-table td { padding: 2px 4px; color: var(--text); }
        .sk-shape { color: #6272a4; font-size: 11px; }
        .sk-table button, .sk-pins button {
          min-width: 24px; padding: 2px 6px; font-size: 12px;
          background: transparent; color: #6272a4;
          border: 1px solid #44475a; border-radius: 3px; cursor: pointer;
        }
        .sk-table button.on, .sk-pins button.on {
          background: #bd93f9; color: #282a36; border-color: #bd93f9;
        }
        .sk-table input {
          width: 62px; background: var(--bg); color: var(--text);
          border: 1px solid var(--border); border-radius: 3px;
          padding: 2px 5px; font-size: 12px; font-variant-numeric: tabular-nums;
        }
        .sk-table button:disabled { opacity: 0.35; cursor: not-allowed; }
        .sk-table input:disabled { opacity: 0.35; cursor: not-allowed; }
        .sk-pins, .sk-rounds { display: flex; align-items: center; gap: 4px; margin-top: 8px; color: #6272a4; }
        .sk-rounds input {
          width: 42px; background: var(--bg); color: var(--text);
          border: 1px solid #44475a; border-radius: 3px;
          padding: 2px 5px; font-size: 12px; font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
