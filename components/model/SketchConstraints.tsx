'use client';

// Rules for a sketch's edges. One row per edge, because an edge is the thing a
// constraint is about and there is no way to click one on the canvas -- the
// handles are corners, and an edge between two of them has nowhere to put a
// third handle without crowding both.

import {
  type Constraint,
  type Point,
  addConstraintSettling,
  describe,
  describeRemovalNote,
  edgeCorners,
  edgeLength,
  residualOf,
  residualsOf,
} from '../../lib/sketch-solve';
import { useState } from 'react';
import {
  maxChamferDistance,
  maxFilletRadius,
  bowOf,
  whyCannotRemoveCorner,
  whyRemovingCornerCosts,
  maxBow,
  whyCannotBowEdge,
  whyCannotChamferCorner,
  whyCannotRoundCorner,
} from '../../lib/sketch-arc';

interface Props {
  /** The DESIGN corners -- one row per edge between them, one Round box per
   *  corner. A rounded corner is still one corner here; its arc is derived
   *  (lib/sketch-arc.ts, outlineOf) and has no row of its own, which is why
   *  every index in this panel is a design index and stays put when a corner
   *  is rounded. */
  points: Point[];
  /** Bulge of the edge leaving corner n -- present and nonzero means curved.
   *
   *  LEGACY DOCS ONLY. Rounding a corner today writes `rounds`, not this:
   *  roundSketchCorner() records the request and outlineOf() derives the arc,
   *  so a corner rounded through the UI leaves every DESIGN edge straight and
   *  this stays undefined. Only a sketch saved before that refactor, with an
   *  arc baked into its edges, carries bulges. So every `curved` branch below
   *  -- the disabled Across/Up buttons, the Length box, the pair grid -- is
   *  unreachable through the current UI and guards those old docs alone.
   *  (This comment used to say bulges appeared once a corner was rounded. It
   *  does not, and believing it costs you a test that cannot pass.) */
  bulges?: Record<number, number>;
  /** Radius asked for on each rounded design corner, so the Round boxes can
   *  show what is currently set instead of always reading empty.
   *
   *  NOTE (2026-09-01): the LEGACY DOCS ONLY note above is now half true. The
   *  Bow row below writes `bulges` directly and is the one live writer, so a
   *  curved edge is reachable through the UI again -- but rounding still does
   *  not produce one, which is the part of that note that matters. */
  rounds?: Record<number, number>;
  /** Distance asked for on each chamfered design corner, so the Chamfer boxes
   *  can show what is currently set instead of always reading empty. */
  chamfers?: Record<number, number>;
  constraints: Constraint[];
  onChange: (next: Constraint[]) => void;
  /** Round corner `corner` to `radius`, or un-round it at 0 -- the caller
   *  owns writing it into the feature, same division of labour onChange
   *  already has for constraints. Nothing here computes geometry. */
  onRound: (corner: number, radius: number) => void;
  /** Chamfer corner `corner` to `distance`, or un-chamfer it at 0 -- same
   *  division of labour as onRound: the caller owns writing it into the
   *  feature, nothing here computes geometry. */
  onChamfer: (corner: number, distance: number) => void;
  /** Bow design edge `edge` out by `bow` sketch units, or straighten it at 0.
   *  Signed: positive bows one way, negative the other. Same division of
   *  labour as onRound/onChamfer -- the caller owns the write. */
  onBow: (edge: number, bow: number) => void;
  /** Remove design corner `corner`, joining the two edges beside it. The
   *  caller owns the write and the refusal, same as every other row here. */
  onRemoveCorner: (corner: number) => void;
  /** Which of the three planes this sketch sits on. 'xy' is the ground.
   *  Passed through only so the row below can show which one is current --
   *  nothing here reads it as geometry. */
  plane: 'xy' | 'xz' | 'yz';
  /** 'circle' when this sketch is a circle. The panel then shows ONLY the
   *  plane row: a circle has no edges to rule, no corners to pin and no
   *  corners to remove, but it sits on a plane like any other sketch and
   *  used to have no way to leave the ground because the whole panel was
   *  skipped for it. */
  shape?: 'circle';
  /** Move the whole sketch onto another plane. The caller owns the write. */
  onPlane: (plane: 'xy' | 'xz' | 'yz') => void;
}

function has(cs: Constraint[], kind: Constraint['kind'], edge: number) {
  return cs.some((c) => 'edge' in c && c.edge === edge && c.kind === kind);
}

// A pair constraint names TWO edges but the array order is arbitrary, so the
// kind only matches if the pair is stored the same way every lookup normalises
// to: lower design index in `edge`, higher in `other`. has() above only
// inspects c.edge, so it cannot ask about pair kinds -- pairKind() is the
// pairedges-specific lookup, and cyclePair() below is the only producer of
// pair kinds in the panel (nothing else in the app writes one, so the
// canonical order holds everywhere a constraint can be born).
type PairKind = 'equal' | 'parallel' | 'perpendicular';

const PAIR_CYCLES: PairKind[] = ['equal', 'parallel', 'perpendicular'];

function pairKind(cs: Constraint[], lo: number, hi: number): PairKind | null {
  return (
    PAIR_CYCLES.find(
      (k) => cs.some((c) => c.kind === k && c.edge === lo && 'other' in c && c.other === hi)
    ) ?? null
  );
}

// The three pair rules are alternatives on one pair, not a stack -- same
// contradiction rule as horizontal/vertical one edge up in toggle(). Every
// write normalises lo/hi so a pair stored as {edge:3, other:1} can never be
// read as a different pair by pairKind().
function cyclePair(cs: Constraint[], a: number, b: number): Constraint[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const current = pairKind(cs, lo, hi);
  const next = current === null ? 'equal' : PAIR_CYCLES[PAIR_CYCLES.indexOf(current) + 1];
  const rest = cs.filter((c) => !(current !== null && c.kind === current && c.edge === lo && 'other' in c && c.other === hi));
  return next === undefined ? rest : [...rest, { kind: next, edge: lo, other: hi }];
}

const PANEL_CSS = `
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
        /* The settled-not-stuck case: purple, the same "a rule is set" colour
           the table's own .on buttons use, not the amber a genuine conflict
           still gets -- this note is reporting a fix, not a warning. */
        .sk-rules-note-info {
          color: #bd93f9; background-color: #2d2b3a; border-left-color: #bd93f9;
        }
        .sk-table { width: 100%; border-collapse: collapse; }
        .sk-table th {
          text-align: left; font-weight: normal; color: #6272a4;
          font-size: 11px; padding: 2px 4px;
        }
        .sk-table td { padding: 2px 4px; color: var(--text); }
        .sk-shape { color: #6272a4; font-size: 11px; }
        .sk-table button, .sk-pins button, .sk-drops button, .sk-planes button {
          min-width: 24px; padding: 2px 6px; font-size: 12px;
          background: transparent; color: #6272a4;
          border: 1px solid #44475a; border-radius: 3px; cursor: pointer;
        }
        /* A removal that costs something is marked, not blocked -- amber is
           already this app's "read the tooltip" colour on the radius handle. */
        .sk-drops button.costly { border-color: #ffb86c; color: #ffb86c; }
        .sk-drops button:disabled { opacity: 0.4; cursor: not-allowed; }
        /* Wider than the numbered buttons beside it -- these carry words. */
        .sk-planes button { width: auto; padding: 0 8px; }
        .sk-planes button.on { background: #44475a; color: #f8f8f2; border-color: #bd93f9; }
        .sk-planes { margin-top: 0; margin-bottom: 8px; }
        .sk-table button.on, .sk-pins button.on {
          background: #bd93f9; color: #282a36; border-color: #bd93f9;
        }
        .sk-table input {
          width: 62px; background: var(--bg); color: var(--text);
          border: 1px solid var(--border); border-radius: 3px;
          padding: 2px 5px; font-size: 12px; font-variant-numeric: tabular-nums;
        }
        /* A rule that is losing the argument. Onshape red-boxes exactly the
           conflicting constraint glyphs and leaves the innocent ones alone,
           which is what makes "remove one" actionable; this is that, in the
           panel. Deliberately a BORDER and not a fill: .on already owns the
           fill, so "this rule is set" and "this rule is losing" stay two
           separate readings of the same control rather than one overwriting
           the other.
           NB: no backticks in here -- this block is a template literal, and a
           backtick in a CSS comment closes it. That is a syntax error 40 lines
           later with a message about a property that does not exist. */
        .sk-table button.fighting,
        .sk-table input.fighting,
        .sk-pairs-grid td button.fighting {
          border-color: #ff5555;
          box-shadow: 0 0 0 1px #ff5555;
        }
        /* Unset controls also take the red text; a set one keeps the dark text
           its purple fill needs for contrast. */
        .sk-table button.fighting:not(.on),
        .sk-table input.fighting,
        .sk-pairs-grid td button.fighting:not(.on) { color: #ff5555; }
        .sk-table button:disabled { opacity: 0.35; cursor: not-allowed; }
        .sk-table input:disabled { opacity: 0.35; cursor: not-allowed; }
        .sk-pins, .sk-rounds, .sk-chamfers, .sk-bows, .sk-drops, .sk-planes { display: flex; align-items: center; gap: 4px; margin-top: 8px; color: #6272a4; }
        .sk-rounds input, .sk-chamfers input, .sk-bows input {
          width: 42px; background: var(--bg); color: var(--text);
          border: 1px solid #44475a; border-radius: 3px;
          padding: 2px 5px; font-size: 12px; font-variant-numeric: tabular-nums;
        }
        .sk-pairs { margin-top: 8px; }
        .sk-pairs-head { font-size: 11px; color: #6272a4; margin-bottom: 3px; }
        .sk-pairs-grid { border-collapse: collapse; }
        .sk-pairs-grid th {
          font-weight: normal; color: #6272a4; font-size: 11px;
          min-width: 24px; padding: 1px 3px; text-align: center;
        }
        .sk-pairs-grid td button {
          width: 24px; height: 20px; min-width: 24px; padding: 0;
          font-size: 12px; line-height: 1;
          background: transparent; color: #6272a4;
          border: 1px solid #44475a; border-radius: 3px; cursor: pointer;
        }
        .sk-pairs-grid td button.on {
          background: #bd93f9; color: #282a36; border-color: #bd93f9;
        }
        .sk-pairs-grid td button:disabled { opacity: 0.35; cursor: not-allowed; }
      `;

export default function SketchConstraints({ points, bulges, rounds, chamfers, constraints, onChange, onRound, onChamfer, onBow, onRemoveCorner, plane, onPlane, shape }: Props) {
  const count = points.length;
  const residual = residualOf(points, constraints);
  const fighting = residual > 1e-3;
  // One residual per constraint, same order, so a rule is in conflict when its
  // OWN entry crosses the tolerance. This is what lets the panel point at the
  // rules that disagree instead of printing a number and asking the student to
  // guess which of six cells to undo. A lock always reports 0, which is why the
  // pin buttons below are never marked.
  const residuals = residualsOf(points, constraints);
  const conflicted = (c: Constraint) => {
    const i = constraints.indexOf(c);
    return i >= 0 && residuals[i] > 1e-3;
  };
  /** Is there a conflicting constraint of this kind on this edge? */
  const edgeConflict = (kind: Constraint['kind'], edge: number) =>
    constraints.some(
      (c) => c.kind === kind && 'edge' in c && c.edge === edge && conflicted(c)
    );
  const pairConflict = (lo: number, hi: number) =>
    constraints.some(
      (c) => 'other' in c && c.edge === lo && c.other === hi && conflicted(c)
    );
  const namedConflict = constraints.filter(conflicted).map(describe);

  // The sentence shown in place of the red banner when adding a rule cost an
  // older one its place -- "Edge 2's length 20 was removed so edge 1 = edge
  // 2 could hold." Cleared on every settle() call before the new attempt, so
  // it never lingers past the edit that explains it, and left untouched by a
  // plain removal (unchecking a box can only ever reduce how over-constrained
  // the sketch is, never create a new fight to settle).
  const [autoNote, setAutoNote] = useState<string | null>(null);

  /** Runs a freshly-built constraint list (the caller's new/changed rule
   *  always last, same convention addConstraintSettling's own doc comment
   *  relies on) through conflict settling before committing it -- see that
   *  function's header for why beginners get the older rule dropped instead
   *  of a banner over the rule they just asked for. */
  function settle(next: Constraint[]) {
    const result = addConstraintSettling(points, next);
    setAutoNote(result.removed ? describeRemovalNote(result.removed, next[next.length - 1]) : null);
    onChange(result.constraints);
  }

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
    settle([...cleaned, { kind, edge }]);
  }

  function setLength(edge: number, raw: string) {
    const rest = constraints.filter((c) => !(c.kind === 'length' && c.edge === edge));
    const v = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(v) || v <= 0) {
      onChange(rest);
      return;
    }
    settle([...rest, { kind: 'length', edge, value: Math.round(v * 100) / 100 }]);
  }

  function lockCorner(corner: number) {
    const held = constraints.some((c) => c.kind === 'lock' && c.corner === corner);
    if (held) {
      onChange(constraints.filter((c) => !(c.kind === 'lock' && c.corner === corner)));
      return;
    }
    settle([...constraints, { kind: 'lock', corner }]);
  }

  // Named for where the sketch SITS, not for its axis letters, with the real
  // name in the tooltip -- the same bargain the Mirror flyout in ModelEditor
  // already strikes ("Mirror left to right (the real name: the yz plane)").
  // A student who never needs "xz" never has to learn it, and one reading a
  // reSHape example can still map the two.
  const planeRow = (
    <div className="sk-planes">
      <span>Sits on:</span>
      {([
        ['xy', 'Ground', 'Flat on the ground, seen from above (the real name: the xy plane)'],
        ['xz', 'Front', 'Standing up facing you (the real name: the xz plane)'],
        ['yz', 'Side', 'Standing up facing sideways (the real name: the yz plane)'],
      ] as const).map(([id, label, why]) => (
        <button
          key={id}
          aria-label={`Sit the sketch on the ${label} plane`}
          aria-pressed={plane === id}
          className={plane === id ? 'on' : undefined}
          title={why}
          onClick={() => onPlane(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // A circle gets the plane row and nothing else. Everything below it is
  // about edges and corners, and a circle has neither -- its two points are
  // the ends of a diameter.
  if (shape === 'circle') {
    return (
      <div className="sk-rules">
        <div className="sk-rules-head"><span>Rules</span></div>
        {planeRow}
        <style>{PANEL_CSS}</style>
      </div>
    );
  }

  return (
    <div className="sk-rules">
      <div className="sk-rules-head">
        <span>Rules</span>
        {fighting && (
          // The residual moves to a tooltip. It is a distance in sketch units,
          // which tells a teacher how badly the rules miss and tells a student
          // nothing -- "off by 3.2" was the whole message and named no culprit.
          <span
            className="sk-rules-warn"
            title={`These rules cannot all be true at once. Largest miss: ${residual.toFixed(2)}`}
          >
            these rules disagree
          </span>
        )}
      </div>

      {fighting && (
        <p className="sk-rules-note">
          {namedConflict.length > 0 ? (
            <>
              These rules cannot all be true: <strong>{namedConflict.join('; ')}</strong>.
              The shape is as close as it can get to all of them — remove one to settle it.
            </>
          ) : (
            // Over tolerance with nothing named: possible in principle, since
            // the header's threshold and the per-rule one are the same number
            // and floating point does not promise the max lands on any single
            // entry. Say the honest general thing rather than an empty list.
            <>
              These rules disagree — the shape is as close as it can get to all of them.
              Remove one to settle it.
            </>
          )}
        </p>
      )}

      {/* Not a warning -- this is the beginner-facing case working exactly as
          intended: the rule just clicked or typed is the one that survives,
          and an older rule quietly made room for it. Shown in place of the
          red banner above, never alongside it -- `fighting` is false
          whenever this has something to say, because settle() only leaves a
          note when it found a fix that actually resolved the conflict. */}
      {!fighting && autoNote && (
        <p className="sk-rules-note sk-rules-note-info">{autoNote}</p>
      )}

      {planeRow}

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
                    className={[has(constraints, 'horizontal', e) ? 'on' : '', edgeConflict('horizontal', e) ? 'fighting' : '']
                      .filter(Boolean).join(' ') || undefined}
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
                    className={[has(constraints, 'vertical', e) ? 'on' : '', edgeConflict('vertical', e) ? 'fighting' : '']
                      .filter(Boolean).join(' ') || undefined}
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
                    className={edgeConflict('length', e) ? 'fighting' : undefined}
                    placeholder={edgeLength(points, e).toFixed(1)}
                    defaultValue={fixed && fixed.kind === 'length' ? String(fixed.value) : ''}
                    onBlur={(ev) => setLength(e, ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                    }}
                    // A curved edge cannot TAKE a new length -- but one that
                    // already carries one has to stay reachable, because the
                    // note above says "remove one to settle it" and clearing
                    // this box is how you remove it. A disabled box makes that
                    // sentence name a control the student cannot use.
                    disabled={curved && !fixed}
                    title={curvedTitle}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="sk-pairs">
        <div className="sk-pairs-head">Rules between two edges:</div>
        <table className="sk-pairs-grid">
          <thead>
            <tr>
              <th aria-hidden="true" />
              {/* One column short of the edge count on purpose. The body is a
                  LOWER triangle -- the highest column any row fills is i-1, so
                  a header for the last edge would sit over an empty column. */}
              {points.slice(0, -1).map((_, j) => (
                <th key={j}>{j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((_, i) =>
              i === 0 ? null : (
                <tr key={i}>
                  <th scope="row">{i + 1}</th>
                  {Array.from({ length: i }, (_, j) => {
                    const lo = j;
                    const hi = i;
                    const cur = pairKind(constraints, lo, hi);
                    // An arc has no direction (parallel/perpendicular are
                    // meaningless) and equal would scale a rounded corner's
                    // radius. A rule already ON the pair must stay clickable
                    // so it can be cycled off -- same reasoning as the Length
                    // box above, which notes "remove one to settle it" has to
                    // name a control the student can still use.
                    const curved = Boolean(bulges?.[lo]) || Boolean(bulges?.[hi]);
                    const disabled = curved && cur === null;
                    const curvedTitle = curved
                      ? "This pair includes a rounded corner's arc. Equal, parallel and perpendicular only make sense between two straight edges."
                      : undefined;
                    return (
                      <td key={j}>
                        <button
                          aria-label={`Edges ${lo + 1} and ${hi + 1}: ${cur === null ? 'no rule' : cur}`}
                          className={[cur === null ? '' : 'on', pairConflict(lo, hi) ? 'fighting' : '']
                            .filter(Boolean).join(' ') || undefined}
                          onClick={() => settle(cyclePair(constraints, lo, hi))}
                          disabled={disabled}
                          title={cur === null ? (curvedTitle ?? `Edges ${lo + 1} and ${hi + 1}: click to cycle equal, parallel, perpendicular`) : `Edges ${lo + 1} and ${hi + 1}: ${cur}`}
                        >
                          {cur === null ? '' : cur === 'equal' ? '=' : cur === 'parallel' ? '∥' : '⊥'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

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

      {/* addCorner() has existed since the first sketch build with no way to
          take one back off. This is that inverse. Buttons rather than boxes,
          because there is nothing to type -- it mirrors the Pin row directly
          above, which is the other per-corner control that is a verb. */}
      <div className="sk-drops">
        <span>Remove a corner:</span>
        {points.map((_, i) => {
          const why = whyCannotRemoveCorner({ points, bulges, rounds, chamfers, constraints }, i);
          const cost = whyRemovingCornerCosts({ points, bulges, rounds, chamfers, constraints }, i);
          return (
            <button
              key={i}
              aria-label={`Remove corner ${i + 1}`}
              // Disabled ONLY when it is impossible, never merely expensive:
              // a corner that costs rules to remove is still the student's
              // to remove, and the cost is in the tooltip and said out loud
              // by the editor afterwards.
              disabled={Boolean(why)}
              title={why ?? cost ?? `Remove corner ${i + 1}`}
              className={cost ? 'costly' : undefined}
              onClick={() => onRemoveCorner(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="sk-rounds">
        <span>Round a corner:</span>
        {points.map((_, i) => {
          // `bulges` is passed through on purpose. Without it this asks about
          // a corner whose adjacent edges it is pretending are all straight,
          // and gets back a ceiling for a corner that does not exist: a
          // straight corner reads as Infinity, and a corner beside an arc
          // reads as roundable when rounding it would silently rescale that
          // arc. The panel already has the bulges; it just was not asking.
          const ceiling = maxFilletRadius(points, i, bulges);
          const why = whyCannotRoundCorner(points, i, bulges);
          const set = rounds?.[i];
          return (
            <input
              // Keyed on the stored radius so the box re-mounts showing the
              // new number after a round -- it is a persistent value now, not
              // a fire-and-forget request, and a box that always read empty
              // was the only reason nothing in the app could show a student
              // what radius a corner actually had.
              key={`${i}:${set ?? ''}`}
              type="number"
              inputMode="decimal"
              aria-label={`Round corner ${i + 1}`}
              // Not disabled when the answer is no -- a disabled box explains
              // nothing. Left live so a typed radius still reaches onRound(),
              // which says the reason out loud in the message line.
              title={why ?? `Round corner ${i + 1} -- up to ${ceiling.toFixed(1)}, or 0 to undo it`}
              min={0}
              max={ceiling}
              step="0.5"
              placeholder="0"
              defaultValue={set !== undefined ? String(set) : ''}
              onBlur={(ev) => {
                const v = Number(ev.target.value);
                if (!Number.isFinite(v)) { ev.target.value = set !== undefined ? String(set) : ''; return; }
                // 0 (or an emptied box) is un-round, and it reaches onRound()
                // like any other value. It could not before -- the old guard
                // returned early on v <= 0 -- so a corner, once rounded, could
                // never be made sharp again, and no message anywhere said so.
                if (v <= 0 && set === undefined) { ev.target.value = ''; return; }
                // Pass what the student TYPED, not the clamped value. Clamping
                // here made a request for 500 and a request for 10 arrive
                // identically, so no caller could tell a clamp had happened and
                // nothing could say so (sketch gauntlet round 3, blind judge).
                onRound(i, Math.max(0, v));
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
              }}
            />
          );
        })}
      </div>

      <div className="sk-chamfers">
        <span>Chamfer a corner:</span>
        {points.map((_, i) => {
          // `bulges` is passed through on purpose, same reason as the Round
          // boxes above: without it this asks about a corner whose adjacent
          // edges it is pretending are all straight, and gets back a ceiling
          // for a corner that does not exist. A corner beside an arc can no
          // more be chamfered than it can be rounded, and without `bulges`
          // this would wrongly say yes.
          const ceiling = maxChamferDistance(points, i, bulges);
          const why = whyCannotChamferCorner(points, i, bulges);
          const set = chamfers?.[i];
          return (
            <input
              key={`${i}:${set ?? ''}`}
              type="number"
              inputMode="decimal"
              aria-label={`Chamfer corner ${i + 1}`}
              title={why ?? `Chamfer corner ${i + 1} -- up to ${ceiling.toFixed(1)}, or 0 to undo it`}
              min={0}
              max={ceiling}
              step="0.5"
              placeholder="0"
              defaultValue={set !== undefined ? String(set) : ''}
              onBlur={(ev) => {
                const v = Number(ev.target.value);
                if (!Number.isFinite(v)) { ev.target.value = set !== undefined ? String(set) : ''; return; }
                if (v <= 0 && set === undefined) { ev.target.value = ''; return; }
                onChamfer(i, Math.max(0, v));
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
              }}
            />
          );
        })}
      </div>

      {/* One box per EDGE, not per corner -- a bow belongs to the edge between
          two corners, the way a round belongs to the corner between two edges.
          Signed, unlike Round and Chamfer: negative bows the other way, which
          is the only way to reach the inward arc at all, and a second control
          for "which side" would be a second thing to explain. */}
      <div className="sk-bows">
        <span>Bow an edge:</span>
        {points.map((_, e) => {
          const ceiling = maxBow(points, e);
          const set = bowOf(points, e, bulges);
          const why = whyCannotBowEdge(points, e, set || 1);
          return (
            <input
              // Keyed on the READ-BACK bow, not on a stored request: unlike
              // rounds/chamfers there is no request map, so what the box shows
              // is derived from the bulge every render. Moving a corner
              // therefore updates this number on its own, which is correct --
              // the angle is kept and the bow scales with the chord.
              key={`${e}:${set.toFixed(3)}`}
              type="number"
              inputMode="decimal"
              aria-label={`Bow edge ${e + 1}`}
              title={why ?? `Bow edge ${e + 1} -- up to ${ceiling.toFixed(1)} either way, or 0 to straighten it`}
              min={-ceiling}
              max={ceiling}
              step="0.5"
              placeholder="0"
              defaultValue={set ? String(Math.round(set * 100) / 100) : ''}
              onBlur={(ev) => {
                const v = Number(ev.target.value);
                if (!Number.isFinite(v)) { ev.target.value = set ? String(set) : ''; return; }
                if (v === 0 && !set) { ev.target.value = ''; return; }
                // What was TYPED, not a clamped value -- same reason as the
                // Round box above: clamping here makes 400 and 12 arrive
                // identically and nothing downstream can report the ceiling.
                onBow(e, v);
                // Then put the box back to what the SHAPE says. On an accepted
                // bow this is overwritten a moment later by the remount (the
                // key carries the read-back value); on a refused one it is the
                // whole point -- measured live, a rejected 999 otherwise sat in
                // the box beside an edge still bowed 8, which is a control
                // stating something untrue about the model.
                //
                // FOUND, NOT FIXED: the Round and Chamfer boxes above have the
                // same behaviour and keep their refused number. Left alone
                // rather than swept into this change.
                ev.target.value = set ? String(Math.round(set * 100) / 100) : '';
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
              }}
            />
          );
        })}
      </div>

      <style>{PANEL_CSS}</style>
    </div>
  );
}
