'use client';

// The Font maker's drawing tool (phase 3a of the fonts work, 2026-11-12).
//
// Pick a letter from the strip, draw it on the canvas with any mix of tools,
// watch a test sentence redraw in your font, and save it as a real font that
// textFont('name') uses. The drawing is kept beside the font (fontmeta:<name>,
// the Library item's meta), so Edit reopens it.
//
// Tools: Pen (freehand, smoothed), Line, Arc (drag, then bend it with its
// middle handle in Select), Ellipse and Box (outlined or filled), Grid (squares
// on a grid, click again to erase) and Select (move a piece, drag its handles,
// Delete). Thickness is shared by the line tools. Undo / Redo, the letter's
// width (a handle at its right edge, or the number), and "Copy from" another
// letter. Curve (phase 3b): click to place points, drag while placing one to
// bend the line through it, click the first point (or Enter) to close the
// shape; a curve shape inside another is a hole. In Select, a curve shape's
// points and their handles can be dragged.
//
// Everything is in font units (lib/font-doc.ts): 1000 to the em, y up from the
// baseline. The canvas is an SVG flipped so y goes up; pointer positions are
// turned into font units with the SVG's own matrix. Work in progress is kept in
// localStorage (shCode:font-maker-draft) so a refresh loses nothing.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ASCENDER, CAP_HEIGHT, CHARSET, DEFAULT_ADVANCE, DESCENDER, MAX_DOC_BYTES, X_HEIGHT,
  arcPoints, buildFont, drawn, emptyDoc, fontDataUri, glyphOutline, piecePolys, serializeDoc, simplify,
  type CurvePt, type FontDoc, type Glyph, type P, type Piece,
} from '../lib/font-doc';
import { FONT_LIMITS, listSavedFonts, saveFont } from '../lib/moshion-storage';

type Tool = 'pen' | 'line' | 'arc' | 'ellipse' | 'box' | 'grid' | 'curve' | 'select';
const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'pen', label: 'Pen', hint: 'Draw freehand. Your line is smoothed when you let go.' },
  { id: 'line', label: 'Line', hint: 'Drag from one end to the other.' },
  { id: 'arc', label: 'Arc', hint: 'Drag from one end to the other, then bend it with Select (drag its middle dot).' },
  { id: 'ellipse', label: 'Ellipse', hint: 'Drag from one corner to the other. Tick Filled for a solid shape.' },
  { id: 'box', label: 'Box', hint: 'Drag from one corner to the other. Tick Filled for a solid shape.' },
  { id: 'grid', label: 'Grid', hint: 'Click or drag to fill squares. Click a filled square to empty it.' },
  { id: 'curve', label: 'Curve', hint: 'Click to place points; drag while placing one to bend the line through it. Click the first point (or press Enter) to close the shape. A shape drawn inside another becomes a hole. Esc cancels, Backspace takes back a point.' },
  { id: 'select', label: 'Select', hint: 'Click a piece to pick it. Drag it to move, drag a dot to reshape, Delete to remove.' },
];
const DRAFT_KEY = 'shCode:font-maker-draft';
const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

const btn: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};
const on: React.CSSProperties = { ...btn, background: 'var(--c-purple)', color: 'var(--c-bg)', border: '1px solid var(--c-purple)', fontWeight: 700 };
const field: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, border: '1px solid var(--c-line)', background: 'var(--c-deep)', color: 'var(--c-fg)', fontSize: 13,
};

// ---- piece helpers ----------------------------------------------------------

function movePiece(p: Piece, dx: number, dy: number): Piece {
  const m = (q: P): P => [q[0] + dx, q[1] + dy];
  switch (p.t) {
    case 'pen': return { ...p, p: p.p.map(m) };
    case 'line': return { ...p, a: m(p.a), b: m(p.b) };
    case 'arc': return { ...p, a: m(p.a), m: m(p.m), b: m(p.b) };
    case 'ellipse': case 'box': return { ...p, a: m(p.a), b: m(p.b) };
    case 'grid': return p; // grid squares stay on their grid
    case 'curve': return { ...p, p: p.p.map(([x, y, hx, hy]) => [x + dx, y + dy, hx, hy] as CurvePt) };
  }
}

// 'a' | 'm' | 'b' for a line, arc, ellipse or box; 'p<i>' (a point) and 'h<i>' (its curve handle) for a curve shape.
type Handle = string;
function handlesOf(p: Piece): { id: Handle; at: P; small?: boolean; from?: P }[] {
  if (p.t === 'line' || p.t === 'ellipse' || p.t === 'box') return [{ id: 'a', at: p.a }, { id: 'b', at: p.b }];
  if (p.t === 'arc') return [{ id: 'a', at: p.a }, { id: 'm', at: p.m }, { id: 'b', at: p.b }];
  if (p.t === 'curve') {
    const out: { id: Handle; at: P; small?: boolean; from?: P }[] = [];
    p.p.forEach(([x, y, hx, hy], i) => {
      out.push({ id: 'p' + i, at: [x, y] });
      // A corner's handle sits a little way off the point so it can be grabbed to make the corner round.
      const h: P = hx === 0 && hy === 0 ? [x + 60, y] : [x + hx, y + hy];
      out.push({ id: 'h' + i, at: h, small: true, from: [x, y] });
    });
    return out;
  }
  return [];
}
function setHandle(p: Piece, h: Handle, at: P): Piece {
  if (p.t === 'arc' && (h === 'a' || h === 'm' || h === 'b')) return { ...p, [h]: at };
  if ((p.t === 'line' || p.t === 'ellipse' || p.t === 'box') && (h === 'a' || h === 'b')) return { ...p, [h]: at };
  if (p.t === 'curve') {
    const i = Number(h.slice(1));
    if (!(i >= 0 && i < p.p.length)) return p;
    const pts = p.p.slice();
    const [x, y, hx, hy] = pts[i];
    if (h[0] === 'p') pts[i] = [at[0], at[1], hx, hy];
    else {
      const dx = at[0] - x, dy = at[1] - y;
      // Dragged back onto its point: a sharp corner again.
      pts[i] = Math.hypot(dx, dy) < 12 ? [x, y, 0, 0] : [x, y, dx, dy];
    }
    return { ...p, p: pts };
  }
  return p;
}

/** An unfinished curve shape as an SVG path (its points so far, not closed). */
function openCurvePath(pts: CurvePt[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, h0x, h0y] = pts[i - 1];
    const [x3, y3, h3x, h3y] = pts[i];
    d += `C${x0 + h0x} ${y0 + h0y} ${x3 - h3x} ${y3 - h3y} ${x3} ${y3}`;
  }
  return d;
}

function polysPath(polys: P[][][]): string {
  let d = '';
  for (const poly of polys) for (const ring of poly) {
    d += 'M' + ring.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L') + 'Z';
  }
  return d;
}

/** A pen stroke's raw points smoothed (a 3-point average) and thinned. */
function finishPen(raw: P[]): P[] {
  if (raw.length < 3) return raw.map(([x, y]) => [Math.round(x), Math.round(y)] as P);
  const sm: P[] = raw.map((q, i) => {
    if (i === 0 || i === raw.length - 1) return q;
    return [(raw[i - 1][0] + q[0] + raw[i + 1][0]) / 3, (raw[i - 1][1] + q[1] + raw[i + 1][1]) / 3];
  });
  return simplify(sm, 3).map(([x, y]) => [Math.round(x), Math.round(y)] as P);
}

function defaultArcMiddle(a: P, b: P): P {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  // Bulge to the left of the drag, a third of its length.
  return [Math.round(mx - dy / 3), Math.round(my + dx / 3)];
}

function readDraft(): { doc: FontDoc; name: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { doc?: FontDoc; name?: string };
    if (!v || !v.doc || v.doc.v !== 1 || typeof v.doc.glyphs !== 'object') return null;
    return { doc: v.doc, name: typeof v.name === 'string' ? v.name : '' };
  } catch {
    return null;
  }
}

// ---- the editor -------------------------------------------------------------

export default function FontEditor({ start, onSaved }: {
  /** A saved font to edit: its name and its drawing. Without it, the last draft (or a blank font). */
  start?: { name: string; doc: FontDoc } | null;
  onSaved?: (name: string) => void;
}) {
  const [doc, setDoc] = useState<FontDoc>(() => start?.doc ?? emptyDoc());
  const [name, setName] = useState(start?.name ?? 'myFont');
  /** The saved font this drawing came from (Save may write over it), or null for a new font. */
  const [editing, setEditing] = useState<string | null>(start?.name ?? null);
  const [ch, setCh] = useState('A');
  const [tool, setTool] = useState<Tool>('pen');
  const [thick, setThick] = useState(80);
  const [filled, setFilled] = useState(false);
  const [gridSize, setGridSize] = useState(100);
  const [sel, setSel] = useState<number | null>(null);
  const [past, setPast] = useState<FontDoc[]>([]);
  const [future, setFuture] = useState<FontDoc[]>([]);
  const [draft, setDraft] = useState<Piece | null>(null);
  /** The curve shape being placed, point by point, and where the pointer is (for the line to the next point). */
  const [building, setBuilding] = useState<CurvePt[] | null>(null);
  const [hover, setHover] = useState<P | null>(null);
  const [sample, setSample] = useState('Hello! My own font 123');
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [replaceName, setReplaceName] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<
    | { kind: 'pen'; pts: P[] }
    | { kind: 'shape'; from: P }
    | { kind: 'grid'; erase: boolean; s: number; done: Set<string> }
    | { kind: 'move'; index: number; from: P; orig: Piece }
    | { kind: 'handle'; index: number; handle: Handle }
    | { kind: 'curvePt'; index: number; from: P }
    | { kind: 'width' }
    | null
  >(null);

  // A draft from last time, unless we were handed a font to edit.
  useEffect(() => {
    if (start) return;
    const d = readDraft();
    if (d) { setDoc(d.doc); if (d.name) setName(d.name); }
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ doc, name })); } catch { /* full or blocked: the drawing is still on screen */ }
  }, [doc, name]);

  const glyph: Glyph = doc.glyphs[ch] ?? { adv: ch === ' ' ? 300 : DEFAULT_ADVANCE, pieces: [] };

  /** Change the drawing, remembering the old one for Undo. */
  const commit = useCallback((next: FontDoc) => {
    setPast((p) => [...p.slice(-99), doc]);
    setFuture([]);
    setDoc(next);
  }, [doc]);
  const withGlyph = useCallback((g: Glyph, base: FontDoc = doc): FontDoc => ({ ...base, glyphs: { ...base.glyphs, [ch]: g } }), [doc, ch]);
  const undo = () => { if (!past.length) return; setFuture((f) => [doc, ...f]); setDoc(past[past.length - 1]); setPast((p) => p.slice(0, -1)); setSel(null); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, doc]); setDoc(future[0]); setFuture((f) => f.slice(1)); setSel(null); };

  // Outlines, one letter at a time, recomputed only when that letter changes.
  const cache = useRef(new Map<string, { key: string; polys: P[][][] }>());
  const outlineOf = useCallback((c: string, g: Glyph | undefined): P[][][] => {
    if (!g || !drawn(g)) return [];
    const key = JSON.stringify(g.pieces);
    const hit = cache.current.get(c);
    if (hit && hit.key === key) return hit.polys;
    const polys = glyphOutline(g);
    cache.current.set(c, { key, polys });
    return polys;
  }, []);
  const outline = useMemo(() => outlineOf(ch, doc.glyphs[ch]), [outlineOf, ch, doc]);
  // In Select, each piece's own merged outline, so a picked piece is one smooth shape, not its parts.
  const pieceOutlines = useMemo(
    () => (tool === 'select' ? glyph.pieces.map((p) => polysPath(glyphOutline({ adv: glyph.adv, pieces: [p] }))) : []),
    [tool, glyph],
  );

  // The test sentence in the font as it is now, rebuilt a moment after each change.
  useEffect(() => {
    let face: FontFace | null = null;
    const t = setTimeout(() => {
      try {
        const outlines = new Map<string, P[][][]>();
        for (const [c, g] of Object.entries(doc.glyphs)) if (drawn(g)) outlines.set(c, outlineOf(c, g));
        const fam = `shcode-fontmaker-${Date.now()}`;
        face = new FontFace(fam, buildFont(doc, 'preview', outlines));
        void face.load().then((f) => { document.fonts.add(f); setPreview(fam); }, () => setPreview(null));
      } catch { setPreview(null); }
    }, 350);
    return () => { clearTimeout(t); if (face) document.fonts.delete(face); };
  }, [doc, outlineOf]);

  // ---- pointer ----
  const toFont = (e: React.PointerEvent): P => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [Math.round(pt.x), Math.round(-pt.y)];
  };

  const gridToggle = (at: P, d: { erase: boolean; s: number; done: Set<string> }, base: Glyph): Glyph => {
    const cell: P = [Math.floor(at[0] / d.s), Math.floor(at[1] / d.s)];
    const k = cell.join(',');
    if (d.done.has(k)) return base;
    d.done.add(k);
    const pieces = base.pieces.slice();
    let gi = pieces.findIndex((p) => p.t === 'grid' && p.s === d.s);
    if (gi < 0) { pieces.push({ t: 'grid', s: d.s, c: [] }); gi = pieces.length - 1; }
    const g = pieces[gi] as Extract<Piece, { t: 'grid' }>;
    const has = g.c.some((c) => c[0] === cell[0] && c[1] === cell[1]);
    const c = d.erase ? g.c.filter((q) => !(q[0] === cell[0] && q[1] === cell[1])) : has ? g.c : [...g.c, cell];
    pieces[gi] = { ...g, c };
    return { ...base, pieces: pieces.filter((p) => p.t !== 'grid' || p.c.length > 0) };
  };

  function down(e: React.PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const at = toFont(e);
    setNote(null);
    if (tool === 'pen') { drag.current = { kind: 'pen', pts: [at] }; setDraft({ t: 'pen', p: [at], w: thick }); return; }
    if (tool === 'line' || tool === 'arc' || tool === 'ellipse' || tool === 'box') { drag.current = { kind: 'shape', from: at }; return; }
    if (tool === 'grid') {
      const cell: P = [Math.floor(at[0] / gridSize), Math.floor(at[1] / gridSize)];
      const g = glyph.pieces.find((p) => p.t === 'grid' && p.s === gridSize) as Extract<Piece, { t: 'grid' }> | undefined;
      const erase = !!g && g.c.some((c) => c[0] === cell[0] && c[1] === cell[1]);
      const d = { kind: 'grid' as const, erase, s: gridSize, done: new Set<string>() };
      drag.current = d;
      commit(withGlyph(gridToggle(at, d, glyph)));
      return;
    }
    if (tool === 'curve') {
      const pts = building ?? [];
      // Back on the first point: the shape is closed.
      if (pts.length >= 3 && Math.hypot(at[0] - pts[0][0], at[1] - pts[0][1]) < 30) { finishCurve(pts); return; }
      const next: CurvePt[] = [...pts, [at[0], at[1], 0, 0]];
      setBuilding(next);
      drag.current = { kind: 'curvePt', index: next.length - 1, from: at };
      return;
    }
    if (tool === 'select') setSel(null);
  }

  /** Close the curve shape being placed and add it to the letter (3 points at least). */
  function finishCurve(pts: CurvePt[] | null = building) {
    setBuilding(null);
    setHover(null);
    if (!pts || pts.length < 3) return;
    commit(withGlyph({ ...glyph, pieces: [...glyph.pieces, { t: 'curve', p: pts.map((q) => q.map(Math.round) as CurvePt) }] }));
  }

  function pieceDown(e: React.PointerEvent, index: number) {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    (svgRef.current as Element).setPointerCapture(e.pointerId);
    setSel(index);
    setPast((p) => [...p.slice(-99), doc]);
    setFuture([]);
    drag.current = { kind: 'move', index, from: toFont(e), orig: glyph.pieces[index] };
  }
  function handleDown(e: React.PointerEvent, index: number, handle: Handle) {
    e.stopPropagation();
    (svgRef.current as Element).setPointerCapture(e.pointerId);
    setPast((p) => [...p.slice(-99), doc]);
    setFuture([]);
    drag.current = { kind: 'handle', index, handle };
  }
  function widthDown(e: React.PointerEvent) {
    e.stopPropagation();
    (svgRef.current as Element).setPointerCapture(e.pointerId);
    setPast((p) => [...p.slice(-99), doc]);
    setFuture([]);
    drag.current = { kind: 'width' };
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (tool === 'curve' && building) setHover(toFont(e));
    if (!d) return;
    const at = toFont(e);
    if (d.kind === 'curvePt') {
      // Dragging while placing a point bends the line through it (its handle).
      const dx = at[0] - d.from[0], dy = at[1] - d.from[1];
      const smooth = Math.hypot(dx, dy) >= 10;
      setBuilding((b) => b && b.map((q, i) => (i === d.index ? [q[0], q[1], smooth ? dx : 0, smooth ? dy : 0] : q)));
      return;
    }
    if (d.kind === 'pen') {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(at[0] - last[0], at[1] - last[1]) >= 4) { d.pts.push(at); setDraft({ t: 'pen', p: d.pts.slice(), w: thick }); }
    } else if (d.kind === 'shape') {
      setDraft(shapeFrom(d.from, at));
    } else if (d.kind === 'grid') {
      setDoc((cur) => ({ ...cur, glyphs: { ...cur.glyphs, [ch]: gridToggle(at, d, cur.glyphs[ch] ?? glyph) } }));
    } else if (d.kind === 'move') {
      const moved = movePiece(d.orig, at[0] - d.from[0], at[1] - d.from[1]);
      setDoc((cur) => {
        const g = cur.glyphs[ch];
        if (!g) return cur;
        const pieces = g.pieces.slice();
        pieces[d.index] = moved;
        return { ...cur, glyphs: { ...cur.glyphs, [ch]: { ...g, pieces } } };
      });
    } else if (d.kind === 'handle') {
      setDoc((cur) => {
        const g = cur.glyphs[ch];
        if (!g) return cur;
        const pieces = g.pieces.slice();
        pieces[d.index] = setHandle(pieces[d.index], d.handle, at);
        return { ...cur, glyphs: { ...cur.glyphs, [ch]: { ...g, pieces } } };
      });
    } else if (d.kind === 'width') {
      const adv = Math.max(50, Math.min(1500, at[0]));
      setDoc((cur) => ({ ...cur, glyphs: { ...cur.glyphs, [ch]: { ...(cur.glyphs[ch] ?? glyph), adv } } }));
    }
  }

  function shapeFrom(a: P, b: P): Piece | null {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) return null;
    if (tool === 'line') return { t: 'line', a, b, w: thick };
    if (tool === 'arc') return { t: 'arc', a, m: defaultArcMiddle(a, b), b, w: thick };
    if (tool === 'ellipse') return { t: 'ellipse', a, b, w: filled ? 0 : thick };
    if (tool === 'box') return { t: 'box', a, b, w: filled ? 0 : thick };
    return null;
  }

  function up(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === 'pen') {
      setDraft(null);
      commit(withGlyph({ ...glyph, pieces: [...glyph.pieces, { t: 'pen', p: finishPen(d.pts), w: thick }] }));
    } else if (d.kind === 'shape') {
      setDraft(null);
      const piece = shapeFrom(d.from, toFont(e));
      if (piece) commit(withGlyph({ ...glyph, pieces: [...glyph.pieces, piece] }));
    }
  }

  // Delete / Undo / Redo from the keyboard, unless the student is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (building) {
        // While placing a curve shape: Enter closes it, Esc drops it, Backspace takes back a point.
        if (e.key === 'Enter') { e.preventDefault(); finishCurve(); return; }
        if (e.key === 'Escape') { e.preventDefault(); setBuilding(null); setHover(null); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); setBuilding(building.length > 1 ? building.slice(0, -1) : null); return; }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel !== null) {
        e.preventDefault();
        commit(withGlyph({ ...glyph, pieces: glyph.pieces.filter((_, i) => i !== sel) }));
        setSel(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function save(replace = false) {
    if (!NAME_RE.test(name)) { setNote({ text: 'The name must start with a letter and use only letters, digits and _.', bad: true }); return; }
    if (!Object.values(doc.glyphs).some(drawn)) { setNote({ text: 'Draw at least one letter first.', bad: true }); return; }
    // #106: saving over another font you have asks once; Replace is the yes.
    if (name !== editing && !replace && listSavedFonts().some((f) => f.name === name)) {
      setReplaceName(name);
      setNote({ text: `You already have a font called ${name}. Replace it with this drawing, pick another name, or open that one with Edit.`, bad: true });
      return;
    }
    setReplaceName(null);
    const json = serializeDoc(doc);
    if (json.length > MAX_DOC_BYTES) { setNote({ text: 'This drawing is too big to keep. Remove some pieces (long pen lines are the biggest) and save again.', bad: true }); return; }
    let buf: ArrayBuffer;
    try { buf = buildFont(doc, name); } catch { setNote({ text: 'Something in the drawing could not be made into a font. Undo the last change and try again.', bad: true }); return; }
    if (buf.byteLength > FONT_LIMITS.fileBytes) { setNote({ text: `This font would be ${Math.round(buf.byteLength / 1024)} KB; the limit is ${FONT_LIMITS.fileBytes / 1024} KB. Remove some pieces and save again.`, bad: true }); return; }
    const err = saveFont(name, fontDataUri(buf), json);
    if (err) { setNote({ text: err, bad: true }); return; }
    setEditing(name);
    setNote({ text: `Saved ${name}. Use it in a sketch with textFont('${name}');`, bad: false });
    onSaved?.(name);
  }

  function newFont() {
    commit(emptyDoc());
    setEditing(null);
    setName('myFont');
    setSel(null);
    setCh('A');
  }

  // ---- the view ----
  const x0 = -120, x1 = Math.max(glyph.adv + 120, 900);
  const yTop = ASCENDER + 80, yBottom = DESCENDER - 80;
  const guides: { y: number; label: string; strong?: boolean }[] = [
    { y: ASCENDER, label: 'top' }, { y: CAP_HEIGHT, label: 'capitals' }, { y: X_HEIGHT, label: 'small letters' },
    { y: 0, label: 'baseline', strong: true }, { y: DESCENDER, label: 'tails' },
  ];
  const selected = sel !== null ? glyph.pieces[sel] : undefined;
  const handleR = 18;
  const drawnCount = CHARSET.filter((c) => drawn(doc.glyphs[c])).length;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* The letters: the one being drawn is highlighted, drawn ones are marked. */}
      <div role="group" aria-label="Letters" style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...CHARSET, ' '].map((c) => {
          const has = drawn(doc.glyphs[c]);
          const cur = c === ch;
          return (
            <button key={c} type="button" aria-pressed={cur}
              aria-label={`${c === ' ' ? 'Space' : `Letter ${c}`}${has ? ', drawn' : ''}`}
              onClick={() => { finishCurve(); setCh(c); setSel(null); }}
              style={{
                minWidth: c === ' ' ? 54 : 28, height: 28, padding: '0 4px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                fontFamily: 'monospace', position: 'relative',
                background: cur ? 'var(--c-purple)' : has ? 'color-mix(in srgb, var(--c-green) 18%, transparent)' : 'transparent',
                color: cur ? 'var(--c-bg)' : 'var(--c-fg)',
                border: `1px solid ${cur ? 'var(--c-purple)' : has ? 'color-mix(in srgb, var(--c-green) 60%, transparent)' : 'var(--c-line)'}`,
              }}>
              {c === ' ' ? 'space' : c}
            </button>
          );
        })}
      </div>

      {/* Tools and their settings. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <div role="group" aria-label="Tools" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {TOOLS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tool === t.id} title={t.hint}
              onClick={() => { if (t.id !== 'curve') finishCurve(); setTool(t.id); if (t.id !== 'select') setSel(null); }} style={tool === t.id ? on : btn}>
              {t.label}
            </button>
          ))}
        </div>
        {(tool === 'pen' || tool === 'line' || tool === 'arc' || ((tool === 'ellipse' || tool === 'box') && !filled)) && (
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            Thickness
            <input type="range" min={10} max={220} step={5} value={thick} onChange={(e) => setThick(Number(e.target.value))} />
            <span style={{ width: 28 }}>{thick}</span>
          </label>
        )}
        {(tool === 'ellipse' || tool === 'box') && (
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} /> Filled
          </label>
        )}
        {tool === 'grid' && (
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            Squares
            <select value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} style={field}>
              <option value={100}>Big (7 to a capital)</option>
              <option value={50}>Small (14 to a capital)</option>
            </select>
          </label>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn} onClick={undo} disabled={!past.length} aria-label="Undo">Undo</button>
        <button type="button" style={btn} onClick={redo} disabled={!future.length} aria-label="Redo">Redo</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-dim)' }}>{TOOLS.find((t) => t.id === tool)?.hint}</div>

      {/* The canvas: font units, y up. */}
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Drawing area for ${ch === ' ' ? 'the space' : `the letter ${ch}`}`}
        viewBox={`${x0} ${-yTop} ${x1 - x0} ${yTop - yBottom}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { drag.current = null; setDraft(null); }}
        style={{
          width: '100%', maxHeight: '58vh', background: 'var(--c-deep)', border: '1px solid var(--c-line)', borderRadius: 6,
          touchAction: 'none', cursor: tool === 'select' ? 'default' : 'crosshair', userSelect: 'none',
        }}
      >
        <g transform="scale(1,-1)">
          {tool === 'grid' && (() => {
            const lines = [];
            for (let x = Math.ceil(x0 / gridSize) * gridSize; x <= x1; x += gridSize) lines.push(<line key={'gx' + x} x1={x} x2={x} y1={yBottom} y2={yTop} stroke="var(--c-line)" strokeWidth={2} />);
            for (let y = Math.ceil(yBottom / gridSize) * gridSize; y <= yTop; y += gridSize) lines.push(<line key={'gy' + y} x1={x0} x2={x1} y1={y} y2={y} stroke="var(--c-line)" strokeWidth={2} />);
            return lines;
          })()}
          {guides.map((g) => (
            <line key={g.label} x1={x0} x2={x1} y1={g.y} y2={g.y} stroke={g.strong ? 'var(--c-cyan)' : 'var(--c-dim)'}
              strokeWidth={g.strong ? 4 : 2} strokeDasharray={g.strong ? undefined : '14 10'} opacity={0.7} />
          ))}
          <line x1={0} x2={0} y1={yBottom} y2={yTop} stroke="var(--c-dim)" strokeWidth={2} opacity={0.6} />

          {/* The letter as the font will have it. */}
          <path d={polysPath(outline)} fill="var(--c-fg)" fillRule="nonzero" opacity={tool === 'select' ? 0.55 : 0.92} />

          {/* In Select, every piece can be picked; the picked one shows its outline and dots. */}
          {tool === 'select' && glyph.pieces.map((p, i) => (
            <path key={i} d={pieceOutlines[i] ?? polysPath(piecePolys(p))} fill={i === sel ? 'color-mix(in srgb, var(--c-purple) 45%, transparent)' : 'transparent'}
              stroke={i === sel ? 'var(--c-purple)' : 'transparent'} strokeWidth={4}
              onPointerDown={(e) => pieceDown(e, i)} style={{ cursor: 'move' }} />
          ))}
          {draft && <path d={polysPath(piecePolys(draft.t === 'pen' ? { ...draft, p: draft.p } : draft))} fill="var(--c-purple)" opacity={0.6} />}
          {building && (
            <>
              {building.length >= 3 && <path d={polysPath(piecePolys({ t: 'curve', p: building }))} fill="var(--c-purple)" opacity={0.25} />}
              <path d={openCurvePath(building)} fill="none" stroke="var(--c-purple)" strokeWidth={6} />
              {hover && (() => {
                const l = building[building.length - 1];
                return <line x1={l[0]} y1={l[1]} x2={hover[0]} y2={hover[1]} stroke="var(--c-purple)" strokeWidth={3} strokeDasharray="12 8" />;
              })()}
              {building.map((q, i) => (
                <g key={i}>
                  {(q[2] !== 0 || q[3] !== 0) && (
                    <line x1={q[0] - q[2]} y1={q[1] - q[3]} x2={q[0] + q[2]} y2={q[1] + q[3]} stroke="var(--c-yellow)" strokeWidth={3} />
                  )}
                  <circle cx={q[0]} cy={q[1]} r={i === 0 ? 22 : 14} fill={i === 0 ? 'var(--c-green)' : 'var(--c-bg)'} stroke="var(--c-purple)" strokeWidth={5}>
                    {i === 0 && <title>Click here to close the shape</title>}
                  </circle>
                </g>
              ))}
            </>
          )}
          {tool === 'select' && selected && handlesOf(selected).map((h) => (
            <g key={h.id}>
              {h.from && <line x1={h.from[0]} y1={h.from[1]} x2={h.at[0]} y2={h.at[1]} stroke="var(--c-yellow)" strokeWidth={3} opacity={0.7} />}
              <circle cx={h.at[0]} cy={h.at[1]} r={h.small ? 11 : handleR} fill={h.small ? 'var(--c-yellow)' : 'var(--c-bg)'} stroke="var(--c-yellow)" strokeWidth={6}
                onPointerDown={(e) => handleDown(e, sel!, h.id)} style={{ cursor: 'grab' }}>
                <title>{h.small ? 'Drag to bend the line through this point (back onto the point for a sharp corner)' : 'Drag to move this point'}</title>
              </circle>
            </g>
          ))}
          {selected?.t === 'arc' && tool === 'select' && (
            <polyline points={arcPoints(selected.a, selected.m, selected.b).map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="var(--c-yellow)" strokeWidth={3} strokeDasharray="10 8" />
          )}

          {/* The letter's width: drag the right-hand edge. */}
          <line x1={glyph.adv} x2={glyph.adv} y1={yBottom} y2={yTop} stroke="var(--c-orange)" strokeWidth={4} opacity={0.8} />
          <rect x={glyph.adv - 22} y={-40} width={44} height={80} rx={10} fill="var(--c-orange)" onPointerDown={widthDown} style={{ cursor: 'ew-resize' }}>
            <title>Drag to make the letter wider or narrower</title>
          </rect>
        </g>
        {guides.map((g) => (
          <text key={g.label} x={x0 + 8} y={-g.y - 8} fontSize={26} fill="var(--c-dim)" style={{ pointerEvents: 'none' }}>{g.label}</text>
        ))}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Width
          <input type="number" min={50} max={1500} step={10} value={glyph.adv} style={{ ...field, width: 80 }}
            onChange={(e) => { const v = Number(e.target.value); if (v >= 50 && v <= 1500) commit(withGlyph({ ...glyph, adv: v })); }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Copy from
          <select value="" style={field} onChange={(e) => {
            const from = doc.glyphs[e.target.value];
            if (from) commit(withGlyph({ adv: from.adv, pieces: [...glyph.pieces, ...from.pieces] }));
          }}>
            <option value="">a letter you drew…</option>
            {CHARSET.filter((c) => c !== ch && drawn(doc.glyphs[c])).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {tool === 'select' && sel !== null && (
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} onClick={() => { commit(withGlyph({ ...glyph, pieces: glyph.pieces.filter((_, i) => i !== sel) })); setSel(null); }}>
            Delete piece
          </button>
        )}
        <button type="button" style={btn} disabled={!glyph.pieces.length}
          onClick={() => { commit(withGlyph({ ...glyph, pieces: [] })); setSel(null); }}>
          Clear this letter
        </button>
      </div>

      {/* The test sentence, in the font being made. */}
      <div style={{ border: '1px solid var(--c-line)', borderRadius: 6, padding: 10, background: 'var(--c-deep2)' }}>
        <label htmlFor="fm-sample" style={{ fontSize: 12, color: 'var(--c-dim)' }}>Test your font ({drawnCount} of {CHARSET.length} drawn; the rest show in the default font)</label>
        <input id="fm-sample" value={sample} onChange={(e) => setSample(e.target.value)} maxLength={80}
          style={{ ...field, width: '100%', boxSizing: 'border-box', margin: '4px 0 8px' }} />
        <div aria-hidden="true" style={{ fontFamily: preview ? `"${preview}", monospace` : 'monospace', fontSize: 40, lineHeight: 1.3, overflowWrap: 'anywhere', minHeight: 52 }}>
          {sample}
        </div>
      </div>

      {/* Name and save. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label htmlFor="fm-name" style={{ fontSize: 13 }}>Name</label>
        <input id="fm-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} spellCheck={false} style={{ ...field, width: 180 }} />
        <button type="button" className="btn-run" onClick={() => save()}>{editing && editing === name ? 'Save changes' : 'Save font'}</button>
        {replaceName === name && name !== editing && (
          <button type="button" style={btn} onClick={() => save(true)}>Replace {name}</button>
        )}
        <button type="button" style={btn} onClick={newFont}>Start a new font</button>
        <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>You will write <code>textFont(&apos;{NAME_RE.test(name) ? name : 'name'}&apos;)</code></span>
      </div>
      {note && <div role="status" style={{ fontSize: 13, color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{note.text}</div>}
    </div>
  );
}
