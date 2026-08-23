'use client';

// Drag handles, drawn as plain divs on top of the preview frame.
//
// The runner projects each anchor and hands back where it landed, which way it
// slides on screen, and how many pixels one unit covers there. So a drag is
// arithmetic: project the pointer movement onto that direction and divide.
//
// The frame is sandboxed and would swallow every pointer event, so the handle
// captures the pointer on mousedown. That also stops the orbit controls seeing
// the drag, which is what keeps the model still while a dimension moves.

import { useEffect, useRef, useState } from 'react';

export interface AnchorPoint {
  param: string;
  label: string;
  kind?: 'size' | 'move' | 'turn';
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  pxPerUnit: number;
}

interface Props {
  points: AnchorPoint[];
  /** Current model value per parameter — the drag starts from this. */
  values: Record<string, unknown>;
  /** How much the dimension moves per unit the handle moves. */
  scales: Record<string, number>;
  onDrag: (param: string, value: number) => void;
  /** Called once when the drag ends, to fold the result back into the doc. */
  onCommit: () => void;
}

export default function HandleOverlay({ points, values, scales, onDrag, onCommit }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  // Pixels the pointer has travelled along the handle's axis. The dragged
  // handle is drawn from this rather than from the runner's next reply, so its
  // position owes nothing to the rebuild round-trip.
  const [alongPx, setAlongPx] = useState(0);
  const start = useRef({ x: 0, y: 0, value: 0, ax: 0, ay: 0 });
  const raf = useRef<number | null>(null);
  const pending = useRef<{ param: string; value: number } | null>(null);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  // One update per frame. A pointer can fire far faster than a rebuild
  // finishes, and every extra send is geometry that is stale before it lands.
  function push(param: string, value: number) {
    pending.current = { param, value };
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const p = pending.current;
      pending.current = null;
      if (p) onDrag(p.param, p.value);
    });
  }

  if (!points.length) return null;

  return (
    <div className="handle-layer">
      {points.map((a) => {
        const on = dragging === a.param;
        const raw = values[a.param];
        // While dragging, the anchor is frozen at where it was when the drag
        // began and offset by the pointer. Measured before this: the handle
        // trailed the pointer by 13px on average and 27px at worst, because
        // every position came back over a round-trip.
        const left = on ? start.current.ax + alongPx * a.dirX : a.x;
        const top = on ? start.current.ay + alongPx * a.dirY : a.y;
        return (
          <button
            key={a.param}
            type="button"
            className={
              'handle'
              + (a.kind === 'move' ? ' is-move' : a.kind === 'turn' ? ' is-turn' : '')
              + (on ? ' is-on' : '')
            }
            style={{ left, top }}
            aria-label={`Drag ${a.label}`}
            title={`${a.label}${typeof raw === 'number' ? ` — ${Math.round(raw * 100) / 100}` : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const v = typeof raw === 'number' ? raw : 0;
              start.current = { x: e.clientX, y: e.clientY, value: v, ax: a.x, ay: a.y };
              setAlongPx(0);
              setDragging(a.param);
            }}
            onPointerMove={(e) => {
              if (dragging !== a.param) return;
              const dx = e.clientX - start.current.x;
              const dy = e.clientY - start.current.y;
              // Movement along the handle's own screen direction, in units.
              const px = dx * a.dirX + dy * a.dirY;
              setAlongPx(px);
              const next = start.current.value + (px / a.pxPerUnit) * (scales[a.param] ?? 1);
              push(a.param, Math.max(0.1, Math.round(next * 100) / 100));
            }}
            onPointerUp={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* gone */ }
              setDragging(null);
              setAlongPx(0);
              onCommit();
            }}
            onPointerCancel={() => { setDragging(null); setAlongPx(0); onCommit(); }}
          />
        );
      })}
      <style>{`
        /* The layer must not eat orbit drags — only the handles themselves do. */
        .handle-layer { position: absolute; inset: 0; pointer-events: none; }
        .handle {
          position: absolute;
          width: 13px; height: 13px; margin: -7px 0 0 -7px; padding: 0;
          border-radius: 50%;
          background: #50fa7b; border: 2px solid #282a36;
          cursor: grab; pointer-events: auto;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
        }
        .handle:hover { background: #8be9fd; }
        /* Position reads as a different job from size, so it gets a different
           shape and colour rather than another green dot to guess at. */
        .handle.is-move {
          background: #bd93f9;
          border-radius: 2px;
          transform: rotate(45deg);
          width: 11px; height: 11px; margin: -6px 0 0 -6px;
        }
        .handle.is-move:hover { background: #ff79c6; }
        .handle.is-move.is-on { background: #ff79c6; transform: rotate(45deg) scale(1.25); }
        /* Turn is a ring, because that is the shape of what it does. */
        .handle.is-turn {
          background: transparent;
          border: 3px solid #f1fa8c;
          width: 15px; height: 15px; margin: -8px 0 0 -8px;
        }
        .handle.is-turn:hover { border-color: #ffb86c; background: transparent; }
        .handle.is-turn.is-on { border-color: #ffb86c; background: transparent; transform: scale(1.25); }
        .handle:focus-visible { outline: 2px solid #bd93f9; outline-offset: 2px; }
        .handle.is-on { background: #8be9fd; cursor: grabbing; transform: scale(1.25); }
      `}</style>
    </div>
  );
}
