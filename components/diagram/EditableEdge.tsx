'use client';

// An arrow whose label can be typed on the diagram itself. React Flow's stock
// edge label is painted into the SVG and can't take focus, so the label is
// rendered through EdgeLabelRenderer — an HTML layer sitting over the canvas —
// where it can be a real input.

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

interface EditableEdgeData extends Record<string, unknown> {
  editing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  onEditEnd?: () => void;
  /** The chip lives in EdgeLabelRenderer's separate HTML layer, so a click on
   *  it never reaches React Flow's own onEdgeDoubleClick — it needs its own
   *  way to ask for the editor. */
  onBeginEdit?: (id: string) => void;
  /** Highlighted because dropping a shape here would splice it into the path. */
  spliceTarget?: boolean;
  /** This arrow leaves a diamond: offer a yes/no toggle while it is selected. */
  choice?: boolean;
  active?: boolean;
  onPickLabel?: (id: string, label: string) => void;
}

function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const d = (data ?? {}) as EditableEdgeData;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const text = typeof label === 'string' ? label : '';
  // The editor's own selection (a fresh arrow it selected for the student) counts
  // as selected even though React Flow's internal flag was never set.
  selected = selected || !!d.active;
  // An unlabelled arrow shows its chip only once selected, so a finished
  // diagram isn't littered with empty prompts.
  const showChip = d.editing || text.trim() !== '' || selected;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {showChip && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              whiteSpace: 'nowrap',
              zIndex: 5,
            }}
          >
            {d.editing ? (
              <input
                className="nodrag nopan"
                autoFocus
                value={text}
                placeholder="yes / no"
                onChange={(e) => d.onLabelChange?.(id, e.target.value)}
                onBlur={() => d.onEditEnd?.()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                size={8}
                style={{
                  width: 76,
                  background: 'var(--c-deep2)',
                  border: '1px dashed var(--c-pink)',
                  borderRadius: 4,
                  color: 'var(--c-fg)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'system-ui, sans-serif',
                  textAlign: 'center',
                  padding: '2px 4px',
                  outline: 'none',
                }}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  d.onBeginEdit?.(id);
                }}
                title="Double-click to label this arrow"
                style={{
                  display: 'inline-block',
                  background: 'var(--c-bg)',
                  border: `1px solid ${selected ? 'var(--c-pink)' : 'var(--c-line)'}`,
                  borderRadius: 4,
                  color: text.trim() ? 'var(--c-fg)' : 'var(--c-comment)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'system-ui, sans-serif',
                  padding: '2px 7px',
                  cursor: 'text',
                  whiteSpace: 'nowrap',
                }}
              >
                {text.trim() || 'label…'}
              </span>
            )}
            {selected && d.choice && !d.editing && (
              <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4 }}>
                {(['yes', 'no'] as const).map((answer) => {
                  const on = text.trim().toLowerCase() === answer;
                  return (
                    <button
                      key={answer}
                      type="button"
                      className="nodrag nopan"
                      aria-pressed={on}
                      aria-label={`Label this arrow ${answer}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        d.onPickLabel?.(id, answer);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        background: on ? 'var(--c-pink)' : 'var(--c-deep2)',
                        color: on ? 'var(--c-bg)' : 'var(--c-fg)',
                        border: '1px solid var(--c-line)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      {answer}
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { editable: EditableEdge };
