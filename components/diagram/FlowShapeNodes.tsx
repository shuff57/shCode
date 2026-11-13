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

interface ShapeNodeData extends Record<string, unknown> {
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
  terminal: { fill: 'var(--x-2f3b4d)', stroke: 'var(--c-cyan)', text: 'var(--x-e8f7fb)' },
  process: { fill: 'var(--x-343746)', stroke: 'var(--c-purple)', text: 'var(--x-f2ecff)' },
  decision: { fill: 'var(--x-3d3a2c)', stroke: 'var(--c-yellow)', text: 'var(--x-fbfbe6)' },
  io: { fill: 'var(--x-33403a)', stroke: 'var(--c-green)', text: 'var(--x-e6fbec)' },
  subroutine: { fill: 'var(--x-3f3628)', stroke: 'var(--c-orange)', text: 'var(--x-fdf0e2)' },
  preparation: { fill: 'var(--x-3d2d38)', stroke: 'var(--x-ff92d0)', text: 'var(--x-fdeaf6)' },
  connector: { fill: 'var(--x-2c3145)', stroke: 'var(--x-7d8bb5)', text: 'var(--x-dfe4f2)' },
  comment: { fill: 'transparent', stroke: 'var(--c-comment)', text: 'var(--x-aeb7d0)' },
};

const SIZE: Record<FlowShape, { w: number; h: number }> = {
  terminal: { w: 150, h: 60 },
  process: { w: 176, h: 72 },
  decision: { w: 190, h: 108 },
  io: { w: 186, h: 70 },
  subroutine: { w: 190, h: 72 },
  preparation: { w: 194, h: 76 },
  connector: { w: 62, h: 62 },
  comment: { w: 190, h: 66 },
};

const CLIP: Record<FlowShape, string | undefined> = {
  terminal: undefined,
  process: undefined,
  decision: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  io: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
  subroutine: undefined,
  preparation: 'polygon(18% 0%, 82% 0%, 100% 50%, 82% 100%, 18% 100%, 0% 50%)',
  connector: undefined,
  comment: undefined,
};

/** Fully round for the stadium and the connector circle, softly round elsewhere. */
function cornerRadius(shape: FlowShape): number {
  return shape === 'terminal' || shape === 'connector' ? 999 : 8;
}

const BORDER = 2;

/** The four attach points. Handle ids are `s-<side>` and `t-<side>`. */
const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

type SideId = (typeof SIDES)[number]['id'];

function handleStyle(color: string) {
  return {
    width: 11,
    height: 11,
    background: 'var(--c-bg)',
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
  const stroke = d.flagged ? 'var(--c-red)' : colors.stroke;

  // Layered clip-path fakes a border: the outer layer is the stroke colour,
  // the inner layer is inset by BORDER and carries the fill.
  const layers =
    shape === 'comment' ? (
      // A note is drawn as a bracket, not a box — it deliberately does not
      // look like something an arrow connects to.
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderLeft: `3px solid ${stroke}`,
          borderTop: `1px dashed ${stroke}`,
          borderBottom: `1px dashed ${stroke}`,
          borderRadius: 3,
          background: 'color-mix(in srgb, var(--c-comment) 10.0%, transparent)',
        }}
      />
    ) : clip !== undefined ? (
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
      <>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: colors.fill,
            border: `${BORDER}px solid ${stroke}`,
            borderRadius: cornerRadius(shape),
          }}
        />
        {/* The two inner rails are what make a subroutine box read as "this
            work is defined somewhere else". */}
        {shape === 'subroutine' && (
          <>
            <div style={{ position: 'absolute', top: BORDER, bottom: BORDER, left: 11, width: 2, background: stroke }} />
            <div style={{ position: 'absolute', top: BORDER, bottom: BORDER, right: 11, width: 2, background: stroke }} />
          </>
        )}
      </>
    );

  // The diamond's points are its extremes, so its text has to live in the
  // middle half or it spills past the clipped edges.
  const textInset =
    shape === 'decision' ? '0 24%'
    : shape === 'io' ? '0 18%'
    : shape === 'preparation' ? '0 20%'
    : shape === 'subroutine' ? '0 18px'
    : shape === 'connector' ? '0 6px'
    : shape === 'comment' ? '0 10px 0 12px'
    : '0 12px';

  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: shape === 'comment' ? 'auto' : h,
        minHeight: shape === 'comment' ? h : undefined,
        filter: selected ? 'drop-shadow(0 0 0 2px var(--c-pink))' : undefined,
        outline: selected && clip === undefined ? '2px solid var(--c-pink)' : undefined,
        outlineOffset: 2,
        borderRadius: cornerRadius(shape),
      }}
    >
      {layers}
      <div
        style={{
          position: shape === 'comment' ? 'relative' : 'absolute',
          inset: shape === 'comment' ? undefined : textInset,
          padding: shape === 'comment' ? '8px 10px 8px 12px' : undefined,
          minHeight: shape === 'comment' ? h : undefined,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: colors.text,
          fontSize: 13,
          lineHeight: 1.25,
          fontWeight: 500,
          fontFamily: 'system-ui, sans-serif',
          overflow: shape === 'comment' ? 'visible' : 'hidden',
          wordBreak: 'break-word',
          // A label's own line breaks show (a generated chart, e.g. a game's
          // family tree, puts title / maker / date on three lines). Labels
          // typed in one line are unaffected.
          whiteSpace: 'pre-line',
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
            rows={shape === 'comment' ? Math.max(2, (d.label || '').split('\n').length + Math.floor((d.label || '').length / 24)) : 2}
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
              height: shape === 'comment' ? undefined : '100%',
              background: 'rgba(0, 0, 0, 0.35)',
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
          <span style={{ color: 'var(--x-8b8fa3)', fontStyle: 'italic' }}>double-click to label</span>
        )}
      </div>

      {/* Every side takes an arrow in and lets one out, so a connection lands
          on whichever dot it was dropped on rather than being forced to a
          particular side.

          Targets render first and are invisible with pointerEvents off, so a
          press always grabs the visible source dot stacked on top of them.
          That costs nothing: React Flow matches a dropped connection to the
          nearest target by stored position, not by hit-testing the element. */}
      {/* A note is not part of the flow, so it offers nothing to connect to —
          no dots at all, rather than dots that produce an illegal arrow. */}
      {shape !== 'comment' && (
        <>
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
        </>
      )}
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
  subroutine: Memoized,
  preparation: Memoized,
  connector: Memoized,
  comment: Memoized,
};

export { PALETTE as SHAPE_COLORS, SIZE as SHAPE_SIZE };
