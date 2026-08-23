'use client';

// The mouse half of the JSCAD workspace: a toolbar of shapes and operations,
// and the ordered list of what they built.
//
// The list is the point. Each row is a statement, the order decides the result,
// and Cut 1 reading "Box 1 - Cylinder 1" is the same fact as
// booleans.subtract(box1, cyl1) in the generated file next to it.

import { useState } from 'react';
import {
  Box as BoxIcon,
  Circle,
  Cylinder as CylIcon,
  Combine,
  Scissors,
  SquareDashedBottom,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  type Feature,
  type ModelDoc,
  type RoundStyle,
  isRoundable,
  maxRound,
  nameMap,
  newShape,
  nextId,
  topLevel,
  whyCannotRound,
} from '../../lib/model-types';

interface Props {
  doc: ModelDoc;
  onChange: (next: ModelDoc) => void;
}

export default function ModelEditor({ doc, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const chosen = doc.features.filter((f) => selected.includes(f.id));
  const names = nameMap(doc);
  const shownIds = new Set(topLevel(doc).map((f) => f.id));

  function say(msg: string | null) {
    setNote(msg);
  }

  function addShape(kind: 'box' | 'cylinder' | 'sphere') {
    const f = newShape(doc, kind);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    say(null);
  }

  function combine(op: 'union' | 'subtract' | 'intersect') {
    if (chosen.length < 2) {
      say('Pick two shapes first — click one, then hold Ctrl and click another.');
      return;
    }
    // Selection order, not list order: subtract(a, b) is not subtract(b, a),
    // and the first one clicked is the body being cut.
    const targets = selected.filter((id) => doc.features.some((f) => f.id === id));
    const f: Feature = { id: nextId(doc, 'op'), kind: 'combine', op, targets };
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    say(null);
  }

  function round(style: RoundStyle) {
    if (chosen.length !== 1) {
      say('Pick one shape to round.');
      return;
    }
    const f = chosen[0];
    const why = whyCannotRound(f);
    if (why) {
      say(why);
      return;
    }
    if (!isRoundable(f)) return;
    const size = Math.min(maxRound(f), 4);
    onChange({
      ...doc,
      features: doc.features.map((x) =>
        x.id === f.id ? { ...x, round: size, roundStyle: style } : x
      ),
    });
    say(null);
  }

  function remove() {
    if (!chosen.length) return;
    const gone = new Set(selected);
    const features = doc.features
      .filter((f) => !gone.has(f.id))
      // A combine that lost an input is not a combine any more.
      .filter((f) => f.kind !== 'combine' || f.targets.every((t) => !gone.has(t)));
    onChange({ ...doc, features });
    setSelected([]);
    say(null);
  }

  function move(id: string, by: -1 | 1) {
    const i = doc.features.findIndex((f) => f.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= doc.features.length) return;
    const features = [...doc.features];
    [features[i], features[j]] = [features[j], features[i]];
    // A feature cannot be built before what it is made of.
    const seen = new Set<string>();
    for (const f of features) {
      if (f.kind === 'combine' && f.targets.some((t) => !seen.has(t))) {
        say('That would put a combination before the shapes it uses.');
        return;
      }
      seen.add(f.id);
    }
    onChange({ ...doc, features });
    say(null);
  }

  function pick(id: string, additive: boolean) {
    setSelected((prev) =>
      additive
        ? prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        : [id]
    );
    say(null);
  }

  const canCombine = chosen.length >= 2;
  const canRound = chosen.length === 1 && whyCannotRound(chosen[0]) === null;
  const roundBlockedBy = chosen.length === 1 ? whyCannotRound(chosen[0]) : null;

  return (
    <div className="model-editor">
      <div className="model-tools">
        <div className="model-tool-group">
          <button onClick={() => addShape('box')} title="Add a box">
            <BoxIcon size={14} /> Box
          </button>
          <button onClick={() => addShape('cylinder')} title="Add a cylinder">
            <CylIcon size={14} /> Cylinder
          </button>
          <button onClick={() => addShape('sphere')} title="Add a sphere">
            <Circle size={14} /> Sphere
          </button>
        </div>

        <div className="model-tool-group">
          <button onClick={() => combine('union')} disabled={!canCombine} title="Join the selected shapes into one">
            <Combine size={14} /> Join
          </button>
          <button onClick={() => combine('subtract')} disabled={!canCombine} title="Cut the later shapes out of the first">
            <Scissors size={14} /> Cut
          </button>
          <button onClick={() => combine('intersect')} disabled={!canCombine} title="Keep only where they overlap">
            <SquareDashedBottom size={14} /> Overlap
          </button>
        </div>

        <div className="model-tool-group">
          <button
            onClick={() => round('fillet')}
            disabled={!canRound}
            title={roundBlockedBy ?? 'Round the edges off'}
          >
            Fillet
          </button>
          <button
            onClick={() => round('chamfer')}
            disabled={!canRound}
            title={roundBlockedBy ?? 'Slice the edges off flat'}
          >
            Chamfer
          </button>
        </div>

        <div className="model-tool-group model-tool-end">
          <button onClick={remove} disabled={!chosen.length} title="Delete the selected">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {note && <p className="model-note">{note}</p>}

      <ol className="model-list">
        {doc.features.length === 0 && (
          <li className="model-empty">
            Nothing here yet. Add a box, then a cylinder, select both and press{' '}
            <strong>Cut</strong> to drill a hole through it.
          </li>
        )}
        {doc.features.map((f, i) => {
          const on = selected.includes(f.id);
          return (
            <li
              key={f.id}
              className={
                'model-row' + (on ? ' is-on' : '') + (shownIds.has(f.id) ? '' : ' is-consumed')
              }
              onClick={(e) => pick(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
            >
              <span className="model-step">{i + 1}</span>
              <span className="model-name">
                {names[f.id]}
                {f.kind === 'combine' && (
                  <em className="model-detail">
                    {' '}
                    {f.targets.map((t) => names[t] ?? t).join(f.op === 'subtract' ? ' − ' : f.op === 'union' ? ' + ' : ' ∩ ')}
                  </em>
                )}
                {'round' in f && f.round ? (
                  <em className="model-detail"> {f.roundStyle === 'chamfer' ? 'chamfered' : 'filleted'}</em>
                ) : null}
              </span>
              <span className="model-move">
                <button
                  onClick={(e) => { e.stopPropagation(); move(f.id, -1); }}
                  disabled={i === 0}
                  aria-label={`Move ${names[f.id]} earlier`}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); move(f.id, 1); }}
                  disabled={i === doc.features.length - 1}
                  aria-label={`Move ${names[f.id]} later`}
                >
                  <ChevronDown size={12} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <style>{`
        .model-editor { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
        .model-tools {
          display: flex; flex-wrap: wrap; gap: 6px; padding: 8px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .model-tool-group { display: inline-flex; gap: 4px; }
        .model-tool-end { margin-left: auto; }
        .model-tools button {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; font-size: 12px;
          background: transparent; color: var(--text);
          border: 1px solid #44475a; border-radius: 4px; cursor: pointer;
        }
        .model-tools button:hover:not(:disabled) { background: #44475a; }
        .model-tools button:disabled { opacity: 0.4; cursor: not-allowed; }
        .model-note {
          margin: 0; padding: 7px 10px; font-size: 12px; line-height: 1.45;
          color: #ffb86c; background-color: #3a2f22;
          border-left: 2px solid #ffb86c; flex-shrink: 0;
        }
        .model-list { margin: 0; padding: 6px; list-style: none; overflow-y: auto; flex: 1 1 auto; }
        .model-empty { padding: 14px 10px; color: #6272a4; font-size: 12px; line-height: 1.6; }
        .model-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px; border-radius: 4px; cursor: pointer;
          font-size: 12px; color: var(--text);
        }
        .model-row:hover { background: #343746; }
        .model-row.is-on { background: #44475a; }
        /* Consumed by a later step, so it is no longer its own shape. */
        .model-row.is-consumed .model-name { color: #6272a4; }
        .model-step {
          flex: 0 0 18px; text-align: right; color: #6272a4;
          font-variant-numeric: tabular-nums; font-size: 11px;
        }
        .model-name { flex: 1 1 auto; min-width: 0; }
        .model-detail { color: #6272a4; font-style: normal; }
        .model-move { display: inline-flex; gap: 2px; }
        .model-move button {
          padding: 2px; line-height: 0; background: transparent;
          border: 0; color: #6272a4; cursor: pointer; border-radius: 3px;
        }
        .model-move button:hover:not(:disabled) { color: var(--text); background: #6272a4; }
        .model-move button:disabled { opacity: 0.25; cursor: default; }
      `}</style>
    </div>
  );
}
