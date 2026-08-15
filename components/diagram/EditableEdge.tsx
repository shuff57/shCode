'use client';

// An arrow whose label can be typed on the diagram itself. React Flow's stock
// edge label is painted into the SVG and can't take focus, so the label is
// rendered through EdgeLabelRenderer — an HTML layer sitting over the canvas —
// where it can be a real input.

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export interface EditableEdgeData extends Record<string, unknown> {
  editing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  onEditEnd?: () => void;
  /** The chip lives in EdgeLabelRenderer's separate HTML layer, so a click on
   *  it never reaches React Flow's own onEdgeDoubleClick — it needs its own
   *  way to ask for the editor. */
  onBeginEdit?: (id: string) => void;
  /** Highlighted because dropping a shape here would splice it into the path. */
  spliceTarget?: boolean;
}

export default function EditableEdge({
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
                  background: '#21222c',
                  border: '1px dashed #ff79c6',
                  borderRadius: 4,
                  color: '#f8f8f2',
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
                  background: '#282a36',
                  border: `1px solid ${selected ? '#ff79c6' : '#44475a'}`,
                  borderRadius: 4,
                  color: text.trim() ? '#f8f8f2' : '#6272a4',
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
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { editable: EditableEdge };
