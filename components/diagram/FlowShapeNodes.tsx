'use client';

// The four flowchart shapes from Table 1.5.2, as React Flow node types.
// Shapes are drawn with clip-path rather than rotation so a diamond can be
// wider than it is tall and the label never inherits a rotation.
//
// Each node exposes two target handles (top, left) and two source handles
// (bottom, right). A decision diamond therefore branches down and right,
// which is the layout the book's own figures use.

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowShape } from '../../lib/diagram-types';

export interface ShapeNodeData extends Record<string, unknown> {
  label: string;
  shape: FlowShape;
  /** Set by a failed structural check so the offending shape stands out. */
  flagged?: boolean;
  /** True while this shape's text is being typed directly on the canvas. */
  editing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  onEditEnd?: () => void;
}

const PALETTE: Record<FlowShape, { fill: string; stroke: string; text: string }> = {
  terminal: { fill: '#2f3b4d', stroke: '#8be9fd', text: '#e8f7fb' },
  process: { fill: '#343746', stroke: '#bd93f9', text: '#f2ecff' },
  decision: { fill: '#3d3a2c', stroke: '#f1fa8c', text: '#fbfbe6' },
  io: { fill: '#33403a', stroke: '#50fa7b', text: '#e6fbec' },
};

const SIZE: Record<FlowShape, { w: number; h: number }> = {
  terminal: { w: 150, h: 60 },
  process: { w: 176, h: 72 },
  decision: { w: 190, h: 108 },
  io: { w: 186, h: 70 },
};

const CLIP: Record<FlowShape, string | undefined> = {
  terminal: undefined,
  process: undefined,
  decision: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  io: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
};

const BORDER = 2;

/** The four attach points. Handle ids are `s-<side>` and `t-<side>`. */
export const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

export type SideId = (typeof SIDES)[number]['id'];

function handleStyle(color: string) {
  return {
    width: 11,
    height: 11,
    background: '#282a36',
    border: `2px solid ${color}`,
    borderRadius: 999,
  } as const;
}

function ShapeNode({ id, data, selected }: NodeProps) {
  const d = data as ShapeNodeData;
  const shape = d.shape ?? 'process';
  const colors = PALETTE[shape];
  const { w, h } = SIZE[shape];
  const clip = CLIP[shape];
  const stroke = d.flagged ? '#ff5555' : colors.stroke;

  // Layered clip-path fakes a border: the outer layer is the stroke colour,
  // the inner layer is inset by BORDER and carries the fill.
  const layers =
    clip !== undefined ? (
      <>
        <div style={{ position: 'absolute', inset: 0, background: stroke, clipPath: clip }} />
        <div
          style={{
            position: 'absolute',
            inset: BORDER,
            background: colors.fill,
            clipPath: clip,
          }}
        />
      </>
    ) : (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.fill,
          border: `${BORDER}px solid ${stroke}`,
          borderRadius: shape === 'terminal' ? 999 : 8,
        }}
      />
    );

  // The diamond's points are its extremes, so its text has to live in the
  // middle half or it spills past the clipped edges.
  const textInset = shape === 'decision' ? '0 24%' : shape === 'io' ? '0 18%' : '0 12px';

  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        filter: selected ? 'drop-shadow(0 0 0 2px #ff79c6)' : undefined,
        outline: selected && clip === undefined ? '2px solid #ff79c6' : undefined,
        outlineOffset: 2,
        borderRadius: shape === 'terminal' ? 999 : 8,
      }}
    >
      {layers}
      <div
        style={{
          position: 'absolute',
          inset: textInset,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: colors.text,
          fontSize: 13,
          lineHeight: 1.25,
          fontWeight: 500,
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
          wordBreak: 'break-word',
          // The label is inert so clicks reach the node beneath it — except
          // while editing, when the textarea has to receive them.
          pointerEvents: d.editing ? 'auto' : 'none',
        }}
      >
        {d.editing ? (
          // `nodrag`/`nopan` are React Flow's opt-outs: without them, typing
          // inside a node would pan the canvas and drag the shape.
          <textarea
            className="nodrag nopan nowheel"
            autoFocus
            value={d.label}
            rows={2}
            onChange={(e) => d.onLabelChange?.(id, e.target.value)}
            onBlur={() => d.onEditEnd?.()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') e.currentTarget.blur();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.35)',
              border: `1px dashed ${colors.stroke}`,
              borderRadius: 4,
              color: colors.text,
              font: 'inherit',
              textAlign: 'center',
              resize: 'none',
              outline: 'none',
              padding: 2,
            }}
          />
        ) : d.label?.trim() ? (
          d.label
        ) : (
          <span style={{ color: '#8b8fa3', fontStyle: 'italic' }}>double-click to label</span>
        )}
      </div>

      {/* Every side takes an arrow in and lets one out, so a connection lands
          on whichever dot it was dropped on rather than being forced to a
          particular side.

          Targets render first and are invisible with pointerEvents off, so a
          press always grabs the visible source dot stacked on top of them.
          That costs nothing: React Flow matches a dropped connection to the
          nearest target by stored position, not by hit-testing the element. */}
      {SIDES.map(({ id, position }) => (
        <Handle
          key={`t-${id}`}
          type="target"
          position={position}
          id={`t-${id}`}
          style={{ ...handleStyle(stroke), opacity: 0, pointerEvents: 'none' }}
        />
      ))}
      {SIDES.map(({ id, position }) => (
        <Handle
          key={`s-${id}`}
          type="source"
          position={position}
          id={`s-${id}`}
          style={handleStyle(stroke)}
        />
      ))}
    </div>
  );
}

const Memoized = memo(ShapeNode);

// One component, four registrations — React Flow keys nodeTypes by name and
// each node carries its own shape in data.
export const nodeTypes = {
  terminal: Memoized,
  process: Memoized,
  decision: Memoized,
  io: Memoized,
};

export { PALETTE as SHAPE_COLORS, SIZE as SHAPE_SIZE };
