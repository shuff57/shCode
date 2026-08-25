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
import { arcFromBulge, type Point } from '../../lib/sketch-arc';

/**
 * One selected sketch's outline, in plane coordinates -- what the overlay
 * needs to draw it, alongside the corner param names used to look up each
 * corner's projected anchor. `shape`/`bulges` mirror SketchFeature exactly;
 * this is a plain data carrier, not a re-derivation of the doc.
 */
export interface SketchOutline {
  /** Param name of each corner's u-value, in order -- the key AnchorPoint is
   *  looked up by, same as before this carried plane geometry too. */
  corners: string[];
  /** The same corners' plane coordinates, parallel to `corners`. */
  points: Point[];
  shape?: 'circle';
  bulges?: Record<number, number>;
}

export interface AnchorPoint {
  param: string;
  label: string;
  kind?: 'size' | 'move' | 'turn' | 'point';
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  pxPerUnit: number;
  /** Screen pixels per world unit along the handle's axis, as a vector. */
  ux?: number;
  uy?: number;
  /** Present only for handles that move in a plane rather than along a line. */
  paramV?: string;
  vx?: number;
  vy?: number;
}

interface Props {
  points: AnchorPoint[];
  /** Current model value per parameter — the drag starts from this. */
  values: Record<string, unknown>;
  /** How much the dimension moves per unit the handle moves. */
  scales: Record<string, number>;
  onDrag: (param: string, value: number) => void;
  /** Any sketch on screen, so the outline can be drawn. */
  outlines?: SketchOutline[];
  /** Called once when the drag ends, to fold the result back into the doc. */
  onCommit: () => void;
}

/**
 * A plane point Q, projected through corner `basis`'s own screen anchor --
 * P0.screen + (Q.u - P0.u)*(ux,uy) + (Q.v - P0.v)*(vx,vy). Pure client
 * arithmetic: the runner projects only the real corner anchors, and this
 * reuses that one affine step for every sampled point along a curve, rather
 * than round-tripping 48 points per circle through the runner every frame.
 *
 * `basis` is deliberately the curve's OWN nearby corner, not one shared
 * origin for the whole sketch -- that bounds how far the affine assumption
 * has to carry a point before perspective drift shows up on screen.
 */
function projectFrom(basis: AnchorPoint, basisPlane: Point, q: Point): { x: number; y: number } {
  const du = q[0] - basisPlane[0];
  const dv = q[1] - basisPlane[1];
  return {
    x: basis.x + du * (basis.ux ?? 0) + dv * (basis.vx ?? 0),
    y: basis.y + du * (basis.uy ?? 0) + dv * (basis.vy ?? 0),
  };
}

/** The outline's screen points, or null when a corner anchor is not on
 *  screen (edge-on plane, same fallback the old flat rendering already had
 *  via its `pts.length < 2` skip). */
function projectOutline(o: SketchOutline, at: Map<string, AnchorPoint>): { x: number; y: number }[] | null {
  const anchors = o.corners.map((c) => at.get(c));
  if (anchors.some((a) => !a || a.ux === undefined || a.uy === undefined)) return null;
  const A = anchors as AnchorPoint[];

  if (o.shape === 'circle' && o.points.length === 2) {
    const [c0, c1] = o.points;
    const center: Point = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
    const radius = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / 2;
    const start = Math.atan2(c0[1] - center[1], c0[0] - center[0]);
    const samples = 48;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < samples; i++) {
      const t = start + (i / samples) * Math.PI * 2;
      const q: Point = [center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)];
      // Half the ring off each real anchor's own basis, so neither half ever
      // carries the affine assumption further than a quarter turn.
      const half = i < samples / 2 ? 0 : 1;
      out.push(projectFrom(A[half], o.points[half], q));
    }
    return out;
  }

  const out: { x: number; y: number }[] = [];
  const count = o.points.length;
  for (let i = 0; i < count; i++) {
    out.push(projectFrom(A[i], o.points[i], o.points[i]));
    const bulge = o.bulges?.[i];
    if (!bulge) continue;
    const a = o.points[i];
    const b = o.points[(i + 1) % count];
    const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
    let sweep = endAngle - startAngle;
    if (bulge > 0 && sweep < 0) sweep += Math.PI * 2;
    if (bulge < 0 && sweep > 0) sweep -= Math.PI * 2;
    const samples = Math.max(8, Math.ceil(Math.abs(sweep) / ((7.5 * Math.PI) / 180)));
    for (let s = 1; s < samples; s++) {
      const t = startAngle + sweep * (s / samples);
      const q: Point = [center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)];
      // The edge's OWN start corner is the basis for every sample on it.
      out.push(projectFrom(A[i], o.points[i], q));
    }
  }
  return out;
}

export default function HandleOverlay({
  points, values, scales, onDrag, onCommit, outlines,
}: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  // Pixels the pointer has travelled along the handle's axis. The dragged
  // handle is drawn from this rather than from the runner's next reply, so its
  // position owes nothing to the rebuild round-trip.
  const [alongPx, setAlongPx] = useState(0);
  const start = useRef({ x: 0, y: 0, value: 0, valueV: 0, ax: 0, ay: 0 });
  const [alongV, setAlongV] = useState(0);
  const raf = useRef<number | null>(null);
  const pending = useRef<{ param: string; value: number } | null>(null);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  // One update per frame. A pointer can fire far faster than a rebuild
  // finishes, and every extra send is geometry that is stale before it lands.
  const pendingV = useRef<{ param: string; value: number } | null>(null);

  function push(param: string, value: number, paramV?: string, valueV?: number) {
    pending.current = { param, value };
    pendingV.current = paramV !== undefined && valueV !== undefined
      ? { param: paramV, value: valueV }
      : null;
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const p = pending.current;
      const q = pendingV.current;
      pending.current = null;
      pendingV.current = null;
      if (p) onDrag(p.param, p.value);
      if (q) onDrag(q.param, q.value);
    });
  }

  // Same trap as the panel: pointerup is synchronous and the frame callback
  // above has not run, so committing without flushing commits nothing.
  function commit() {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    const p = pending.current;
    const q = pendingV.current;
    pending.current = null;
    pendingV.current = null;
    if (p) onDrag(p.param, p.value);
    if (q) onDrag(q.param, q.value);
    onCommit();
  }

  if (!points.length) return null;

  const at = new Map(points.map((p) => [p.param, p]));

  return (
    <div className="handle-layer">
      {/* The outline is drawn, not built. A sketch is a flat profile, not a
          solid, so the renderer has nothing to show for it until something
          extrudes it -- but a student needs to see what they are drawing. */}
      {outlines && outlines.length > 0 && (
        <svg className="sketch-lines" aria-hidden="true">
          {outlines.map((o, n) => {
            const pts = projectOutline(o, at);
            if (!pts || pts.length < 2) return null;
            return (
              <polygon
                key={n}
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              />
            );
          })}
        </svg>
      )}
      {points.map((a) => {
        const on = dragging === a.param;
        const raw = values[a.param];
        // While dragging, the anchor is frozen at where it was when the drag
        // began and offset by the pointer. Measured before this: the handle
        // trailed the pointer by 13px on average and 27px at worst, because
        // every position came back over a round-trip.
        // A plane handle already has its offset in screen pixels; a line handle
        // still has to be pushed along its direction.
        const planar = Boolean(a.paramV);
        const left = on ? start.current.ax + (planar ? alongPx : alongPx * a.dirX) : a.x;
        const top = on ? start.current.ay + (planar ? alongV : alongPx * a.dirY) : a.y;
        return (
          <button
            key={a.param}
            type="button"
            className={
              'handle'
              + (a.kind === 'move' ? ' is-move'
                 : a.kind === 'turn' ? ' is-turn'
                 : a.kind === 'point' ? ' is-point' : '')
              + (on ? ' is-on' : '')
            }
            style={{ left, top }}
            aria-label={`Drag ${a.label}`}
            title={`${a.label}${typeof raw === 'number' ? ` — ${Math.round(raw * 100) / 100}` : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const v = typeof raw === 'number' ? raw : 0;
              const rawV = a.paramV ? values[a.paramV] : undefined;
              start.current = {
                x: e.clientX, y: e.clientY, value: v,
                valueV: typeof rawV === 'number' ? rawV : 0,
                ax: a.x, ay: a.y,
              };
              setAlongPx(0);
              setAlongV(0);
              setDragging(a.param);
            }}
            onPointerMove={(e) => {
              if (dragging !== a.param) return;
              const dx = e.clientX - start.current.x;
              const dy = e.clientY - start.current.y;
              // Movement along the handle's own screen direction, in units.
              // Two directions at once for a sketch corner. The projected axes
              // are not perpendicular on screen once the camera turns, so the
              // pointer has to be solved onto them rather than dotted with each.
              if (a.paramV && a.vx !== undefined && a.vy !== undefined
                  && a.ux !== undefined && a.uy !== undefined) {
                const det = a.ux * a.vy - a.uy * a.vx;
                if (Math.abs(det) < 1e-6) return;  // plane seen edge-on
                const du = (dx * a.vy - dy * a.vx) / det;
                const dv = (a.ux * dy - a.uy * dx) / det;
                setAlongPx(du * a.ux + dv * a.vx);
                setAlongV(du * a.uy + dv * a.vy);
                push(
                  a.param, Math.round((start.current.value + du) * 100) / 100,
                  a.paramV, Math.round((start.current.valueV + dv) * 100) / 100
                );
                return;
              }
              const px = dx * a.dirX + dy * a.dirY;
              setAlongPx(px);
              const next = start.current.value + (px / a.pxPerUnit) * (scales[a.param] ?? 1);
              push(a.param, Math.max(0.1, Math.round(next * 100) / 100));
            }}
            onPointerUp={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* gone */ }
              setDragging(null);
              setAlongPx(0);
              setAlongV(0);
              commit();
            }}
            onPointerCancel={() => {
              setDragging(null); setAlongPx(0); setAlongV(0); commit();
            }}
          />
        );
      })}
      <style>{`
        /* The layer must not eat orbit drags — only the handles themselves do. */
        .handle-layer { position: absolute; inset: 0; pointer-events: none; }
        .sketch-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
        .sketch-lines polygon {
          fill: rgba(139, 233, 253, 0.12);
          stroke: #8be9fd; stroke-width: 1.5; stroke-dasharray: 5 3;
        }
        .handle.is-point {
          background: #8be9fd; border-radius: 2px;
          width: 10px; height: 10px; margin: -5px 0 0 -5px;
        }
        .handle.is-point:hover, .handle.is-point.is-on { background: #ff79c6; }
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
