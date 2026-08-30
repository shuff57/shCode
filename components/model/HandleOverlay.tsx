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
import { type Constraint, residualsOf } from '../../lib/sketch-solve';

/**
 * One selected sketch's outline, in plane coordinates -- what the overlay
 * needs to draw it, alongside the corner param names used to look up each
 * corner's projected anchor. `shape`/`bulges` mirror SketchFeature exactly;
 * this is a plain data carrier, not a re-derivation of the doc.
 */
export interface SketchOutline {
  /** Param name of each DESIGN corner's u-value, in order -- the key
   *  AnchorPoint is looked up by. One per corner the student placed; a
   *  rounded corner is still one entry, not two. */
  corners: string[];
  /** The same design corners' plane coordinates, parallel to `corners`. */
  design: Point[];
  /** The DERIVED outline in plane coordinates -- what actually gets drawn.
   *  Equal to `design` for a sketch with nothing rounded. Never a source of
   *  truth: outlineOf() produces it, and nothing may write it back. */
  points: Point[];
  /** Parallel to `points`: which design corner each outline point projects
   *  through. Both trim points of a rounded corner carry that corner, which
   *  is what lets a derived point ride a real anchor -- there is no anchor of
   *  its own to ride, and that is the whole point of the split. */
  basis: number[];
  shape?: 'circle';
  bulges?: Record<number, number>;
  /** The sketch's constraints, so the overlay can mark which edges carry one.
   *  Plain data like everything else here -- the overlay never writes them. */
  constraints?: Constraint[];
}

export interface AnchorPoint {
  param: string;
  label: string;
  kind?: 'size' | 'move' | 'turn' | 'point' | 'radius';
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
  /** When true, a click-to-draw tool is active: a transparent catcher fills
   *  the layer and reports each click's plane coordinates via `onPlace`. */
  drawing?: boolean;
  /** Plane (u, v) of a click while `drawing` is true. */
  onPlace?: (u: number, v: number) => void;
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

/**
 * Where a constraint glyph goes, as `{x, y}` screen pixels, or null: the
 * anchor lookups and the perpendicular-offset arithmetic can both decline.
 *
 * Design edge `e` runs between design corners e and (e+1); each corner's
 * projected anchor lives in `at` keyed by its param name. The glyph sits at
 * the midpoint of those two anchors, pushed ~10px along the edge's screen
 * normal so it does not sit on the line itself.
 */
function glyphAt(
  at: Map<string, AnchorPoint>,
  params: string[],
  e: number,
): { x: number; y: number } | null {
  const a = at.get(params[e]);
  const b = at.get(params[(e + 1) % params.length]);
  if (!a || !b) return null;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  return {
    x: mx + (-dy / len) * 10,
    y: my + (dx / len) * 10,
  };
}

const GLYPH_TEXT: Record<Exclude<Constraint['kind'], 'lock'>, string> = {
  horizontal: '—',
  vertical: '|',
  length: '↔',
  equal: '=',
  parallel: '∥',
  perpendicular: '⊥',
};

/**
 * One entry per (constraint × edge it names), in draw order. Locks are
 * corners and carry no edge, so they are dropped here: the panel is where a
 * pin reads, and a glyph floating at a corner would crowd the corner handle
 * it sat under for no information the panel does not already give.
 *
 * `losing` is the constraint's own residual crossing tolerance -- the same
 * test the Rules panel marks a control with, so the canvas and the panel
 * cannot disagree about which rule is in trouble. Onshape reddens exactly the
 * offending glyphs and leaves the innocent ones be; this is that.
 */
function edgeGlyphs(
  design: Point[],
  constraints: Constraint[],
): { edge: number; text: string; losing: boolean }[] {
  const residuals = residualsOf(design, constraints);
  const out: { edge: number; text: string; losing: boolean }[] = [];
  constraints.forEach((c, i) => {
    if (c.kind === 'lock') return;
    const losing = residuals[i] > 1e-3;
    out.push({ edge: c.edge, text: GLYPH_TEXT[c.kind], losing });
    if (c.kind === 'equal' || c.kind === 'parallel' || c.kind === 'perpendicular') {
      out.push({ edge: c.other, text: GLYPH_TEXT[c.kind], losing });
    }
  });
  return out;
}

/** The outline's screen points, or null when a corner anchor is not on
 *  screen (edge-on plane, same fallback the old flat rendering already had
 *  via its `pts.length < 2` skip). */
function projectOutline(o: SketchOutline, at: Map<string, AnchorPoint>): { x: number; y: number }[] | null {
  const anchors = o.corners.map((c) => at.get(c));
  if (anchors.some((a) => !a || a.ux === undefined || a.uy === undefined)) return null;
  const A = anchors as AnchorPoint[];

  if (o.shape === 'circle' && o.points.length === 2) {
    const [c0, c1] = o.design;
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
      out.push(projectFrom(A[half], o.design[half], q));
    }
    return out;
  }

  const out: { x: number; y: number }[] = [];
  const count = o.points.length;
  // Every point is projected through its BASIS corner's anchor, not through
  // an anchor of its own: an outline point derived from a fillet has no
  // anchor, because it is not a handle and must never become one.
  const basisOf = (i: number) => {
    const b = o.basis[i];
    return Number.isInteger(b) && b >= 0 && b < A.length ? b : 0;
  };
  for (let i = 0; i < count; i++) {
    const bi = basisOf(i);
    out.push(projectFrom(A[bi], o.design[bi], o.points[i]));
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
      // The edge's own start point rides its basis corner, and so does every
      // sample along it -- which for a fillet arc is the corner it rounded.
      out.push(projectFrom(A[bi], o.design[bi], q));
    }
  }
  return out;
}

export default function HandleOverlay({
  points, values, scales, onDrag, onCommit, outlines, drawing, onPlace,
}: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  // The layer's own DOM node, so a click's viewport position can be converted
  // to the same container-relative space the anchor x/y already use. Handles
  // only ever need DELTAS from their own pointerdown, so nothing needed this
  // before -- the click-catcher is the first consumer of an absolute position.
  const layerRef = useRef<HTMLDivElement>(null);
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

  // A click (not a drag) measured against the plane anchor's own screen
  // position. The anchor sits at plane-coordinate (0,0), so this is the
  // click's absolute (u, v), not a delta -- the same inverse projection the
  // two-axis drag uses, with dx,dy being the click's offset from the anchor.
  function handleCanvasClick(e: React.MouseEvent) {
    if (!drawing || !onPlace || !layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const origin = points.find((p) => p.param === '__planeOrigin');
    if (!origin || origin.ux === undefined || origin.uy === undefined
        || origin.vx === undefined || origin.vy === undefined) return;
    const dx = localX - origin.x;
    const dy = localY - origin.y;
    const det = origin.ux * origin.vy - origin.uy * origin.vx;
    if (Math.abs(det) < 1e-6) return;
    const u = (dx * origin.vy - dy * origin.vx) / det;
    const v = (origin.ux * dy - origin.uy * dx) / det;
    onPlace(u, v);
  }

  return (
    <div className="handle-layer" ref={layerRef}>
      {/* The outline is drawn, not built. A sketch is a flat profile, not a
          solid, so the renderer has nothing to show for it until something
          extrudes it -- but a student needs to see what they are drawing. */}
      {outlines && outlines.length > 0 && (
        <svg className="sketch-lines" aria-hidden="true">
          {outlines.map((o, n) => {
            const pts = projectOutline(o, at);
            if (!pts || pts.length < 2) return null;
            // A chip groups the glyphs on one edge and gives them a backdrop,
            // so they stay readable sitting over the outline.
            //
            // Colour is PER GLYPH, not per chip. Reddening the whole chip is
            // one line shorter and wrong: an edge can carry a satisfied length
            // rule and a losing equal rule at once, and painting both red says
            // the length is a culprit when it is not. Naming the guilty rule
            // exactly is the entire point of this feature -- Onshape reddens
            // the offending glyph and leaves the innocent one alone, and a
            // first pass here got that backwards.
            const chips = new Map<number, { text: string; losing: boolean }[]>();
            for (const g of edgeGlyphs(o.design, o.constraints ?? [])) {
              if (!glyphAt(at, o.corners, g.edge)) continue;
              chips.set(g.edge, [...(chips.get(g.edge) ?? []), { text: g.text, losing: g.losing }]);
            }
            return (
              <g key={n}>
                <polygon
                  points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                />
                {[...chips].map(([edge, glyphs]) => {
                  const spot = glyphAt(at, o.corners, edge)!;
                  // #bd93f9 is the same purple the panel paints a set control
                  // with, so "this rule is on" looks the same in both places.
                  // The first pass used #6272a4 and measured unreadable at 4x
                  // against the sketch outline -- a marker nobody notices is
                  // the one failure this whole feature exists to avoid.
                  const STEP = 13;
                  const w = glyphs.length * STEP + 8;
                  // The chip's own outline follows the worst rule on the edge:
                  // it is the "look over here" cue, and it has to fire even
                  // when only one of several glyphs inside it is red.
                  const anyLosing = glyphs.some((g) => g.losing);
                  return (
                    <g key={edge} transform={`translate(${spot.x}, ${spot.y})`}>
                      <rect
                        x={-w / 2}
                        y={-9}
                        width={w}
                        height={18}
                        rx={3}
                        fill="#282a36"
                        stroke={anyLosing ? '#ff5555' : '#44475a'}
                        strokeWidth={1}
                        opacity={0.95}
                      />
                      {glyphs.map((g, gi) => (
                        <text
                          key={gi}
                          x={-w / 2 + 4 + STEP * gi + STEP / 2}
                          fill={g.losing ? '#ff5555' : '#bd93f9'}
                          fontSize={12}
                          fontWeight={600}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {g.text}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </g>
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
                 : a.kind === 'point' ? ' is-point'
                 : a.kind === 'radius' ? ' is-radius' : '')
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
      {drawing && (
        <div
          className="draw-catcher"
          onClick={handleCanvasClick}
          aria-label="Click to place a point on the sketch plane"
        />
      )}
      <style>{`
        /* The layer must not eat orbit drags — only the handles themselves do. */
        .handle-layer { position: absolute; inset: 0; pointer-events: none; }
        /* The click-to-draw catcher: transparent, fills the layer, and is the
           only thing that eats pointer events while a draw tool is active. It
           renders AFTER the handles in the DOM, so it paints on top and the
           plane-origin dot is not independently draggable mid-draw. */
        .draw-catcher {
          position: absolute; inset: 0;
          pointer-events: auto; cursor: crosshair;
        }
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
        /* Round, not square, and orange: it sits ON the outline where a corner
           handle would look like a corner, and it drives a radius rather than a
           position. The title attribute above carries the live number, which is
           the only place in the app a student could read a fillet radius. */
        .handle.is-radius {
          background: transparent; border-color: #ffb86c;
          width: 11px; height: 11px; margin: -6px 0 0 -6px;
        }
        .handle.is-radius:hover, .handle.is-radius.is-on { background: #ffb86c; }
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
