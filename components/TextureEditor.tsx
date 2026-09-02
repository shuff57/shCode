'use client';

// A pixel editor for moSHion textures.
//
// Why this and not Piskel / pixel-art-react (the app behind pixelartcss.com):
// neither is a component. Piskel (Apache-2.0) builds to a self-contained app
// with no host API -- the only 7 postMessage hits in its repo are internal web
// workers -- so embedding it means an iframe plus a reach-in against private
// internals. pixel-art-react (MIT) is React 16.8 + Redux 4 and cannot mount
// inside React 19, so it would be an iframe too. Both are whole applications
// behind a frame; what this needs is a grid, a palette and a save button that
// writes where the engine already reads.
//
// Feature parity with pixelartcss.com is deliberate, with ONE refusal: it
// emits CSS box-shadow, which is that project's entire reason to exist and is
// useless to a sprite engine. Its animated-GIF export is replaced by a
// horizontal frame STRIP, because moSHion's Ani already slices exactly that --
// so an animation saved here becomes `sprite.texture = 'walk'` and simply
// moves, with no new engine path.
//
// The save path is the reason this is small. A texture lives in the SAME
// localStorage store the preview bridge already hydrates into the sandboxed
// runner (lib/moshion-storage.ts), under `texture:<name>`. So:
//
//   editor (app origin) --write--> moshion.store.v1 --bridge--> sketch
//
// No API route, no R2, no upload quota, nothing new to authorize. The art
// never leaves the student's browser, which is also why it is not shared
// between machines -- a real limit, stated in the UI rather than hidden.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listSavedTextures,
  saveTexture,
  deleteSavedTexture,
  SavedTexture,
} from '../lib/moshion-storage';

interface CatalogEntry { file: string; w: number; h: number; group: string }
interface Catalog {
  tile: number;
  base: string;
  source: string;
  groups: Record<string, string[]>;
  textures: Record<string, CatalogEntry>;
}

const TRANSPARENT = '';

// The Kenney pack's own working palette, plus black and white. A fixed palette
// is the single biggest reason beginner pixel art looks coherent -- a free
// colour picker produces 40 muddy near-greys.
const PALETTE: string[] = [
  '#000000', '#ffffff', '#5d5d5d', '#a8a8a8',
  '#7ec850', '#4a9b2f', '#2d6b1a', '#c8e090',
  '#6ab7e8', '#3a7fc4', '#1f4f8b', '#a8d8f0',
  '#f4c542', '#e09b23', '#b8681f', '#ffe9a8',
  '#e8607a', '#c43a52', '#8b1f36', '#f5a8b8',
  '#c48ae0', '#8b4fb8', '#5a2d7a', '#e0c0f0',
  '#e8a878', '#b87848', '#8b5a2f', '#f0d8b8',
];

const PRESETS = [8, 16, 21, 32, 48];
const MAX_DIM = 64;

type Tool = 'pencil' | 'eraser' | 'fill' | 'pick' | 'move';
type Frame = string[];

// One undo entry is the WHOLE document (frames + which one is showing), not a
// cell diff. At 64x64x8 frames that is ~32k short strings per entry, which is
// nothing next to the clarity of never having to invert an operation -- and
// move/resize/fill would each need their own inverse otherwise.
interface Snapshot { frames: Frame[]; index: number; w: number; h: number }

const blank = (w: number, h: number): Frame => Array(w * h).fill(TRANSPARENT);

export default function TextureEditor() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [saved, setSaved] = useState<SavedTexture[]>([]);

  const [w, setW] = useState(21);
  const [h, setH] = useState(21);
  const [frames, setFrames] = useState<Frame[]>(() => [blank(21, 21)]);
  const [index, setIndex] = useState(0);

  const [color, setColor] = useState('#7ec850');
  const [recent, setRecent] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);

  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);

  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [onion, setOnion] = useState(true);
  // Per-frame holds, in GAME frames, one per frame. pixelartcss.com calls this
  // Duration and expresses it as a share of the loop; game frames is the unit
  // moSHion's Ani actually speaks, so it round-trips without a conversion that
  // could drift. null = every frame uses the single fps above.
  const [holds, setHolds] = useState<number[] | null>(null);
  // Manual zoom, their "Pixel Size". null = fit the container, which is what
  // makes the same component work in a 240px drawer and on a full page.
  const [zoom, setZoom] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const painting = useRef(false);
  const strokeStart = useRef<Snapshot | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState(560);

  const grid = frames[index] ?? blank(w, h);

  // ---- adaptive cell size ------------------------------------------------
  // The same component mounts on the full-width page AND inside the sandbox's
  // right drawer, which the user can drag between 240 and 600px. Measuring the
  // container beats a `compact` prop: one code path, and it stays correct
  // while the drawer is being dragged.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Measure the PARENT, not ourselves. Our own width is influenced by our
    // content, so measuring it is a feedback loop: a wide grid makes the
    // wrapper wide, which reports room for a wide grid. Measured in the
    // sandbox drawer -- a 319px panel reported clientWidth 486 and the grid
    // rendered 462px across, scrolling most of the editor out of reach.
    const target = el.parentElement ?? el;
    const measure = () => setAvail(target.clientWidth || 560);
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    measure();
    return () => ro.disconnect();
  }, []);

  const narrow = avail < 720;
  // Budget every horizontal inset the grid sits inside, not just the outer
  // padding: wrapper padding (12 or 20 a side), the card's own 12 a side, and
  // its 1px borders. Missing the card's share overflowed the sandbox drawer by
  // ~26px, which cut the last tool button and the size row off the edge.
  const inset = (narrow ? 12 : 20) * 2 + 12 * 2 + 2;
  const fitCell = Math.max(3, Math.min(22, Math.floor((Math.min(avail, 700) - inset) / w)));
  const cell = zoom ?? fitCell;
  // The keydown handler is registered once, so it cannot close over the
  // current cell size. Without this ref, "[" pressed on a fitted 20px grid
  // jumped to a hardcoded base instead of stepping down from what is showing.
  const cellRef = useRef(cell);
  cellRef.current = cell;

  // ---- catalog -----------------------------------------------------------

  useEffect(() => {
    let alive = true;
    // Say why it is empty. An earlier version swallowed this, and a page that
    // had simply never hydrated looked identical to a missing catalog -- which
    // cost a debugging cycle. A silent catch is not resilience, it is a hidden
    // failure mode.
    fetch('/moshion/textures/textures.json')
      .then((r) => {
        if (!r.ok) throw new Error(`the catalog returned ${r.status}`);
        return r.json();
      })
      .then((j) => { if (alive) setCatalog(j); })
      .catch((e) => {
        if (!alive) return;
        setMessage({
          text: `Built-in textures unavailable (${e.message}). Run: python scripts/make-moshion-textures.py. Drawing and saving still work.`,
          bad: true,
        });
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => { setSaved(listSavedTextures()); }, []);
  const refreshSaved = useCallback(() => setSaved(listSavedTextures()), []);

  // ---- history -----------------------------------------------------------

  const snapshot = useCallback(
    (): Snapshot => ({ frames: frames.map((f) => f.slice()), index, w, h }),
    [frames, index, w, h]
  );

  const commit = useCallback((before: Snapshot) => {
    setUndoStack((s) => [...s.slice(-39), before]);
    setRedoStack([]);   // a new edit forks history; the old redo path is gone
  }, []);

  const restore = useCallback((s: Snapshot) => {
    setFrames(s.frames.map((f) => f.slice()));
    setIndex(Math.min(s.index, s.frames.length - 1));
    setW(s.w);
    setH(s.h);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const prev = stack[stack.length - 1];
      setRedoStack((r) => [...r, { frames: frames.map((f) => f.slice()), index, w, h }]);
      restore(prev);
      return stack.slice(0, -1);
    });
  }, [frames, index, w, h, restore]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (!stack.length) return stack;
      const next = stack[stack.length - 1];
      setUndoStack((u) => [...u, { frames: frames.map((f) => f.slice()), index, w, h }]);
      restore(next);
      return stack.slice(0, -1);
    });
  }, [frames, index, w, h, restore]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        return;
      }
      // Unmodified single keys, the way every pixel editor does it. Listed in
      // the "? Keys" panel -- a shortcut nothing documents may as well not
      // exist, which is why the panel and this switch were written together.
      const toolKey: Record<string, Tool> = { b: 'pencil', e: 'eraser', g: 'fill', i: 'pick', v: 'move' };
      if (toolKey[k]) { e.preventDefault(); setTool(toolKey[k]); return; }
      if (k === '[') { e.preventDefault(); setZoom(Math.max(3, cellRef.current - 2)); return; }
      if (k === ']') { e.preventDefault(); setZoom(Math.min(40, cellRef.current + 2)); return; }
      if (e.key === ' ') { e.preventDefault(); setPlaying((pv) => !pv); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---- geometry ----------------------------------------------------------

  // Resizing keeps what fits, anchored top-left, rather than clearing. Losing
  // a drawing to a mis-click on a size button is the kind of thing that makes
  // people stop trusting a tool.
  function resize(nw: number, nh: number) {
    const cw = Math.max(1, Math.min(MAX_DIM, nw));
    const ch = Math.max(1, Math.min(MAX_DIM, nh));
    if (cw === w && ch === h) return;
    commit(snapshot());
    setFrames((fs) =>
      fs.map((f) => {
        const out = blank(cw, ch);
        for (let y = 0; y < Math.min(h, ch); y++) {
          for (let x = 0; x < Math.min(w, cw); x++) out[y * cw + x] = f[y * w + x];
        }
        return out;
      })
    );
    setW(cw);
    setH(ch);
  }

  function shift(dx: number, dy: number) {
    commit(snapshot());
    setFrames((fs) =>
      fs.map((f, i) => {
        if (i !== index) return f;
        const out = blank(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const sx = x - dx, sy = y - dy;
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) out[y * w + x] = f[sy * w + sx];
          }
        }
        return out;
      })
    );
  }

  // ---- frames ------------------------------------------------------------

  function addFrame(copy: boolean) {
    commit(snapshot());
    setFrames((fs) => {
      const next = fs.slice();
      next.splice(index + 1, 0, copy ? fs[index].slice() : blank(w, h));
      return next;
    });
    setIndex((i) => i + 1);
  }

  function removeFrame() {
    if (frames.length <= 1) { setMessage({ text: 'A texture needs at least one frame.', bad: true }); return; }
    commit(snapshot());
    setFrames((fs) => fs.filter((_, i) => i !== index));
    setIndex((i) => Math.max(0, i - 1));
  }

  function moveFrame(dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= frames.length) return;
    commit(snapshot());
    setFrames((fs) => {
      const next = fs.slice();
      const [f] = next.splice(index, 1);
      next.splice(to, 0, f);
      return next;
    });
    setIndex(to);
  }

  // The holds array must stay exactly as long as the frame list, or the engine
  // ignores it wholesale (a mismatched array is treated as absent). Adding or
  // deleting a frame therefore has to fix it up here rather than at save time.
  useEffect(() => {
    setHolds((hs) => {
      if (!hs) return hs;
      if (hs.length === frames.length) return hs;
      const uniform = Math.max(1, Math.round(60 / fps));
      const next = frames.map((_, i) => hs[i] ?? uniform);
      return next;
    });
  }, [frames.length, fps]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    // A timeout chain, not one interval: with per-frame holds each step waits a
    // different amount, and the preview has to show the same timing the sketch
    // will -- otherwise the editor lies about what you just made.
    let id = 0;
    const step = () => {
      const hold = holds ? holds[index] : Math.max(1, Math.round(60 / fps));
      id = window.setTimeout(() => {
        setIndex((i) => (i + 1) % frames.length);
      }, Math.max(30, Math.round((hold / 60) * 1000)));
    };
    step();
    return () => window.clearTimeout(id);
  }, [playing, frames.length, fps, holds, index]);

  // ---- loading -----------------------------------------------------------

  // Drawing a PNG to a canvas and reading it back only works because these
  // images are same-origin (/moshion/textures/*.png on the app's own origin,
  // and data: URLs for saved ones). A cross-origin image would taint the
  // canvas and getImageData would throw -- which is why the catalog is
  // vendored here rather than hot-linked from a CDN.
  const loadImage = useCallback((
    src: string,
    label: string,
    frameCount = 1,
    delay = 4,
    loadedHolds: number[] | null = null
  ) => {
    const img = new Image();
    img.onload = () => {
      const fw = Math.round(img.naturalWidth / frameCount);
      const fh = img.naturalHeight;
      if (fw < 1 || fw > MAX_DIM || fh > MAX_DIM) {
        setMessage({ text: `${label} is ${fw}x${fh} per frame; this editor handles up to ${MAX_DIM}x${MAX_DIM}.`, bad: true });
        return;
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = fh;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, img.naturalWidth, fh).data;
      } catch {
        setMessage({ text: 'That image could not be read (cross-origin).', bad: true });
        return;
      }
      const hex = (v: number) => v.toString(16).padStart(2, '0');
      const out: Frame[] = [];
      for (let f = 0; f < frameCount; f++) {
        const cells = blank(fw, fh);
        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const i = (y * img.naturalWidth + f * fw + x) * 4;
            if (data[i + 3] < 24) continue;
            cells[y * fw + x] = `#${hex(data[i])}${hex(data[i + 1])}${hex(data[i + 2])}`;
          }
        }
        out.push(cells);
      }
      commit(snapshot());
      setW(fw); setH(fh);
      setFrames(out);
      setIndex(0);
      setName(label);
      setFps(Math.max(1, Math.round(60 / delay)));
      setHolds(loadedHolds && loadedHolds.length === frameCount ? loadedHolds.slice() : null);
      setMessage({
        text: `Loaded ${label} (${fw}x${fh}${frameCount > 1 ? `, ${frameCount} frames` : ''}). Edit and save under any name.`,
        bad: false,
      });
    };
    img.onerror = () => setMessage({ text: `Could not load ${label}.`, bad: true });
    img.src = src;
  }, [commit, snapshot]);

  // ---- painting ----------------------------------------------------------

  function floodFill(from: Frame, i0: number, to: string): Frame {
    const target = from[i0];
    if (target === to) return from;
    const out = from.slice();
    const stack = [i0];
    while (stack.length) {
      const i = stack.pop() as number;
      if (out[i] !== target) continue;
      out[i] = to;
      const x = i % w, y = Math.floor(i / w);
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - w);
      if (y < h - 1) stack.push(i + w);
    }
    return out;
  }

  function noteColor(c: string) {
    setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 16));
  }

  function applyAt(i: number) {
    if (tool === 'pick') {
      const c = grid[i];
      if (c) { setColor(c); noteColor(c); }
      return;
    }
    if (tool === 'move') return;
    setFrames((fs) =>
      fs.map((f, fi) => {
        if (fi !== index) return f;
        if (tool === 'fill') return floodFill(f, i, color);
        const want = tool === 'eraser' ? TRANSPARENT : color;
        if (f[i] === want) return f;
        const out = f.slice();
        out[i] = want;
        return out;
      })
    );
    if (tool === 'pencil') noteColor(color);
  }

  function onCellDown(i: number) {
    if (tool !== 'pick' && tool !== 'move') {
      strokeStart.current = snapshot();
      painting.current = true;
    }
    applyAt(i);
  }
  function onCellEnter(i: number) {
    if (!painting.current || tool === 'fill') return;
    applyAt(i);
  }
  const endStroke = useCallback(() => {
    if (painting.current && strokeStart.current) commit(strokeStart.current);
    painting.current = false;
    strokeStart.current = null;
  }, [commit]);

  useEffect(() => {
    window.addEventListener('mouseup', endStroke);
    return () => window.removeEventListener('mouseup', endStroke);
  }, [endStroke]);

  // ---- export ------------------------------------------------------------

  // One canvas w*frames wide: still art is just the frames === 1 case, which
  // is why there is no second code path for it.
  const toStrip = useCallback((): string | null => {
    const c = document.createElement('canvas');
    c.width = w * frames.length; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    frames.forEach((f, fi) => {
      for (let i = 0; i < f.length; i++) {
        if (!f[i]) continue;
        ctx.fillStyle = f[i];
        ctx.fillRect(fi * w + (i % w), Math.floor(i / w), 1, 1);
      }
    });
    return c.toDataURL('image/png');
  }, [frames, w, h]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setMessage({ text: 'Give the texture a name first.', bad: true }); return; }
    if (frames.every((f) => f.every((c) => !c))) {
      setMessage({ text: 'Every frame is empty — draw something first.', bad: true });
      return;
    }
    const url = toStrip();
    if (!url) { setMessage({ text: 'Could not render the image.', bad: true }); return; }
    const frameDelay = Math.max(1, Math.round(60 / fps));
    const problem = saveTexture(
      trimmed,
      url,
      frames.length > 1
        ? { frames: frames.length, frameDelay, delays: holds }
        : undefined
    );
    if (problem) { setMessage({ text: problem, bad: true }); return; }
    refreshSaved();
    const shadows = catalog && catalog.textures[trimmed];
    setMessage({
      text:
        (frames.length > 1
          ? `Saved ${frames.length} frames. sprite.texture = '${trimmed}' now animates.`
          : `Saved. Use it with  sprite.texture = '${trimmed}'`) +
        (shadows ? '  (this replaces the built-in of the same name)' : ''),
      bad: false,
    });
  }

  function download() {
    const url = toStrip();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.trim() || 'texture'}${frames.length > 1 ? `_${frames.length}f` : ''}.png`;
    a.click();
  }

  function handleDelete(n: string) {
    deleteSavedTexture(n);
    refreshSaved();
    setMessage({ text: `Deleted "${n}".`, bad: false });
  }

  const totalBytes = useMemo(() => saved.reduce((a, t) => a + t.bytes, 0), [saved]);

  // ---- styling -----------------------------------------------------------

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 12,
  };
  const btn = (active = false, disabled = false): React.CSSProperties => ({
    background: active ? 'var(--brand)' : 'var(--muted)',
    color: active ? '#0d1b2a' : 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '5px 9px', fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontWeight: active ? 600 : 400,
  });
  const label: React.CSSProperties = {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
    opacity: 0.5, marginBottom: 5,
  };
  const checker = {
    backgroundImage:
      'linear-gradient(45deg,#2a2a2a 25%,transparent 25%,transparent 75%,#2a2a2a 75%),' +
      'linear-gradient(45deg,#2a2a2a 25%,transparent 25%,transparent 75%,#2a2a2a 75%)',
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 5px 5px',
    backgroundColor: '#202020',
  };

  const swatches = [...recent, ...PALETTE.filter((c) => !recent.includes(c))];

  function MiniFrame({ cells, size }: { cells: Frame; size: number }) {
    return (
      <div style={{
        width: size, height: size, display: 'grid',
        gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)`,
        ...checker,
      }}>
        {cells.map((c, i) => <div key={i} style={{ background: c || 'transparent' }} />)}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        padding: narrow ? 12 : 20, color: 'var(--text)', maxWidth: 1240, margin: '0 auto',
        // width + minWidth:0 so this can never be sized by its own content --
        // the other half of the feedback loop above.
        width: '100%', minWidth: 0, boxSizing: 'border-box',
        // A belt to the cell-size braces above: if any row still measures wider
        // than the drawer, it scrolls inside the panel rather than vanishing
        // off the edge with no way to reach it.
        overflowX: 'hidden',
      }}
    >
      <h1 style={{ fontSize: narrow ? 16 : 22, margin: '0 0 4px' }}>Texture editor</h1>
      <p style={{ fontSize: 12, opacity: 0.72, margin: '0 0 14px', lineHeight: 1.5 }}>
        Draw a texture, or open a built-in one and change it. Saving puts it under a name{' '}
        <code style={{ color: 'var(--brand)' }}>sprite.texture</code> can use. More than one frame
        saves as an animation — the sprite moves on its own. Saved art lives in this browser only.
      </p>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ---- canvas + frames ---- */}
        <div style={{ ...card, maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
            {([['pencil', 'Pencil'], ['eraser', 'Eraser'], ['fill', 'Fill'], ['pick', 'Pick'], ['move', 'Move']] as [Tool, string][])
              .map(([t, lab]) => (
                <button key={t} style={btn(tool === t)} onClick={() => setTool(t)}>{lab}</button>
              ))}
            <button style={btn(false, !undoStack.length)} onClick={undo} disabled={!undoStack.length} title="Ctrl+Z">
              ↶ Undo{undoStack.length ? ` ${undoStack.length}` : ''}
            </button>
            <button style={btn(false, !redoStack.length)} onClick={redo} disabled={!redoStack.length} title="Ctrl+Y">
              ↷ Redo{redoStack.length ? ` ${redoStack.length}` : ''}
            </button>
            <button
              style={btn()}
              onClick={() => {
                commit(snapshot());
                setFrames((fs) => fs.map((f, i) => (i === index ? blank(w, h) : f)));
              }}
            >
              Clear
            </button>
          </div>

          {tool === 'move' && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, opacity: 0.6 }}>Shift this frame</span>
              <button style={btn()} onClick={() => shift(-1, 0)}>←</button>
              <button style={btn()} onClick={() => shift(1, 0)}>→</button>
              <button style={btn()} onClick={() => shift(0, -1)}>↑</button>
              <button style={btn()} onClick={() => shift(0, 1)}>↓</button>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${w}, ${cell}px)`,
              ...checker,
              backgroundSize: `${cell}px ${cell}px`,
              backgroundPosition: `0 0, ${cell / 2}px ${cell / 2}px`,
              border: '1px solid var(--border)',
              width: w * cell,
              cursor: tool === 'pick' ? 'crosshair' : tool === 'move' ? 'default' : 'pointer',
              userSelect: 'none',
              position: 'relative',
            }}
            // A stable hook for scripts/drive-textures.py. Cell size is
            // adaptive, so a driver matching on "width: 18px" silently counts
            // zero cells and reports a feature broken that is not.
            data-texture-grid={`${w}x${h}`}
            onDragStart={(e) => e.preventDefault()}
          >
            {grid.map((c, i) => {
              // Onion skin: the previous frame, faint, under the live one. It
              // is what makes hand-drawn animation possible at all -- without
              // it every frame is drawn blind.
              const ghost = onion && frames.length > 1 && !c
                ? frames[(index - 1 + frames.length) % frames.length][i]
                : '';
              return (
                <div
                  key={i}
                  onMouseDown={() => onCellDown(i)}
                  onMouseEnter={() => onCellEnter(i)}
                  style={{
                    width: cell, height: cell,
                    background: c || (ghost || 'transparent'),
                    opacity: !c && ghost ? 0.22 : 1,
                    boxShadow: cell >= 8 ? 'inset 0 0 0 0.5px rgba(255,255,255,0.06)' : undefined,
                  }}
                />
              );
            })}
          </div>

          {/* frames strip */}
          <div style={{ marginTop: 10 }}>
            <div style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
              <span>Frames ({frames.length})</span>
              {frames.length > 1 && <span>{fps} fps</span>}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              {frames.map((f, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => { setPlaying(false); setIndex(i); }}
                    title={`Frame ${i + 1}`}
                    style={{
                      padding: 2, cursor: 'pointer', borderRadius: 5,
                      background: '#202020',
                      border: i === index ? '2px solid var(--brand)' : '1px solid var(--border)',
                    }}
                  >
                    <MiniFrame cells={f} size={34} />
                  </button>
                  {frames.length > 1 && (
                    <input
                      type="number" min={1} max={60}
                      aria-label={`Frame ${i + 1} duration`}
                      value={holds ? holds[i] : Math.max(1, Math.round(60 / fps))}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                        const uniform = Math.max(1, Math.round(60 / fps));
                        setHolds((hs) => {
                          const base = hs ?? frames.map(() => uniform);
                          const next = base.slice();
                          next[i] = v;
                          return next;
                        });
                      }}
                      style={{
                        width: 38, marginTop: 2, textAlign: 'center',
                        background: 'var(--muted)', color: 'var(--text)',
                        border: '1px solid var(--border)', borderRadius: 4,
                        fontSize: 10, padding: '1px 2px',
                      }}
                    />
                  )}
                </div>
              ))}
              <button style={btn()} onClick={() => addFrame(false)} title="Add an empty frame">+</button>
              <button style={btn()} onClick={() => addFrame(true)} title="Duplicate this frame">⧉</button>
              <button style={btn(false, frames.length < 2)} onClick={removeFrame} title="Delete this frame">🗑</button>
              <button style={btn(false, index === 0)} onClick={() => moveFrame(-1)} title="Move earlier">‹</button>
              <button style={btn(false, index === frames.length - 1)} onClick={() => moveFrame(1)} title="Move later">›</button>
            </div>
            {frames.length > 1 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <button style={btn(playing)} onClick={() => setPlaying((p) => !p)}>
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <input
                  type="range" min={1} max={30} value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  style={{ width: 110 }}
                />
                <label style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={onion} onChange={(e) => setOnion(e.target.checked)} />
                  onion skin
                </label>
              </div>
            )}
          </div>

          {/* size */}
          <div style={{ display: 'flex', gap: 5, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Size</span>
            {PRESETS.map((n) => (
              <button key={n} style={btn(w === n && h === n)} onClick={() => resize(n, n)}>{n}²</button>
            ))}
            <input
              type="number" min={1} max={MAX_DIM} value={w} aria-label="width"
              onChange={(e) => resize(Number(e.target.value) || 1, h)}
              style={{ width: 48, background: 'var(--muted)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 5px', fontSize: 12 }}
            />
            <span style={{ fontSize: 11, opacity: 0.5 }}>×</span>
            <input
              type="number" min={1} max={MAX_DIM} value={h} aria-label="height"
              onChange={(e) => resize(w, Number(e.target.value) || 1)}
              style={{ width: 48, background: 'var(--muted)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 5px', fontSize: 12 }}
            />
            <span style={{ fontSize: 10, opacity: 0.45 }}>21² matches the built-ins · resizing keeps your art</span>
          </div>

          <div style={{ display: 'flex', gap: 5, marginTop: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Pixel size</span>
            <button style={btn(false, cell <= 3)} onClick={() => setZoom(Math.max(3, cell - 2))} aria-label="zoom out">−</button>
            <span style={{ fontSize: 11, width: 22, textAlign: 'center' }}>{cell}</span>
            <button style={btn(false, cell >= 40)} onClick={() => setZoom(Math.min(40, cell + 2))} aria-label="zoom in">+</button>
            <button style={btn(zoom === null)} onClick={() => setZoom(null)} title="Shrink to fit the panel">
              Fit
            </button>
            {holds && (
              <button
                style={btn()}
                onClick={() => setHolds(null)}
                title="Drop per-frame durations and use one speed for every frame"
              >
                Even out timing
              </button>
            )}
            <button style={btn(showHelp)} onClick={() => setShowHelp((v) => !v)} aria-label="keyboard shortcuts">
              ? Keys
            </button>
          </div>

          {showHelp && (
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 6,
              background: 'var(--muted)', border: '1px solid var(--border)',
              fontSize: 11, lineHeight: 1.7,
            }}>
              <div style={{ ...label, marginBottom: 6 }}>Keyboard</div>
              {[
                ['Ctrl+Z', 'undo'],
                ['Ctrl+Y  /  Ctrl+Shift+Z', 'redo'],
                ['B', 'pencil'],
                ['E', 'eraser'],
                ['G', 'fill'],
                ['I', 'pick colour'],
                ['V', 'move'],
                ['[  ]', 'zoom out / in'],
                ['Space', 'play / pause'],
              ].map(([k, what]) => (
                <div key={k} style={{ display: 'flex', gap: 8 }}>
                  <code style={{ color: 'var(--brand)', minWidth: 128, display: 'inline-block' }}>{k}</code>
                  <span style={{ opacity: 0.8 }}>{what}</span>
                </div>
              ))}
              <div style={{ ...label, margin: '8px 0 4px' }}>Durations</div>
              <div style={{ opacity: 0.8 }}>
                The number under each frame is how long it is held, in game frames (60 = one
                second). Leave them alone and every frame uses the one speed slider.
              </div>
            </div>
          )}
        </div>

        {/* ---- palette + save ---- */}
        <div style={{ ...card, width: narrow ? '100%' : 288, boxSizing: 'border-box' }}>
          <div style={label}>Colour {recent.length > 0 && <span style={{ textTransform: 'none' }}>· recent first</span>}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {swatches.slice(0, 32).map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); noteColor(c); if (tool === 'eraser' || tool === 'move') setTool('pencil'); }}
                title={c}
                style={{
                  height: 24, background: c, cursor: 'pointer', borderRadius: 4,
                  border: color === c ? '2px solid var(--brand)' : '1px solid var(--border)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="color" value={color} aria-label="custom colour"
              onChange={(e) => { setColor(e.target.value); noteColor(e.target.value); }}
              style={{ width: 38, height: 26, background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
            />
            <code style={{ fontSize: 11, opacity: 0.8 }}>{color}</code>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

          <div style={label}>Preview at sprite size</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {[24, 50, 88].map((px) => (
              <div key={px} style={{ textAlign: 'center' }}>
                <div style={{ width: px, height: px, border: '1px solid var(--border)' }}>
                  <MiniFrame cells={grid} size={px} />
                </div>
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3 }}>{px}px</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

          <div style={label}>Save as</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="myGuy"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px',
              background: 'var(--muted)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 6, fontSize: 13,
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
            <button style={{ ...btn(true), flex: 1, padding: '7px 0' }} onClick={handleSave}>Save texture</button>
            <button style={btn()} onClick={download} title="Download the PNG (a strip, if animated)">↓ PNG</button>
          </div>
          {message && (
            <p style={{
              fontSize: 12, lineHeight: 1.45, marginTop: 9, marginBottom: 0,
              color: message.bad ? '#e8607a' : '#7ec850',
            }}>
              {message.text}
            </p>
          )}
          <p style={{ fontSize: 10, opacity: 0.4, lineHeight: 1.4, marginTop: 9, marginBottom: 0 }}>
            No CSS output: pixelartcss.com exists to emit <code>box-shadow</code>, which a sprite
            engine cannot use. Its animated GIF is a frame strip here instead — that is what
            moSHion already slices.
          </p>
        </div>

        {/* ---- library ---- */}
        <div style={{ ...card, flex: '1 1 280px', minWidth: narrow ? '100%' : 280, boxSizing: 'border-box' }}>
          <div style={label}>
            Your textures {saved.length ? `(${saved.length})` : ''}
            {saved.length > 0 && (
              <span style={{ textTransform: 'none', marginLeft: 6 }}>
                · {totalBytes < 1024 ? `${totalBytes} bytes` : `${Math.round(totalBytes / 1024)} KB`}
              </span>
            )}
          </div>
          {saved.length === 0 && <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 12 }}>Nothing saved yet.</div>}
          {saved.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
              {saved.map((t) => (
                <div key={t.name} style={{ textAlign: 'center', width: 62 }}>
                  <button
                    onClick={() => loadImage(t.dataUrl, t.name, t.frames, t.frameDelay, t.delays)}
                    title={`Edit ${t.name}${t.frames > 1 ? ` (${t.frames} frames)` : ''}`}
                    style={{
                      width: 54, height: 54, padding: 2, cursor: 'pointer',
                      background: '#202020', border: '1px solid var(--border)', borderRadius: 6,
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.dataUrl} alt={t.name}
                      style={{
                        height: 48, imageRendering: 'pixelated',
                        // A strip is N frames wide; show the first one only.
                        width: 48 * t.frames, objectFit: 'none', objectPosition: 'left',
                        maxWidth: 'none', marginLeft: 0,
                      }}
                    />
                    {t.frames > 1 && (
                      <span style={{
                        position: 'absolute', right: 2, bottom: 1, fontSize: 9,
                        background: 'rgba(0,0,0,0.7)', borderRadius: 3, padding: '0 3px',
                      }}>
                        {t.frames}f
                      </span>
                    )}
                  </button>
                  <div style={{ fontSize: 10, marginTop: 2, wordBreak: 'break-all' }}>{t.name}</div>
                  <button
                    onClick={() => handleDelete(t.name)}
                    style={{ fontSize: 10, background: 'none', border: 'none', color: '#e8607a', cursor: 'pointer', padding: 0 }}
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={label}>Start from a built-in</div>
          <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 9 }}>
            {catalog ? catalog.source : 'Catalog not generated yet.'}
          </div>
          {catalog && Object.entries(catalog.groups).map(([group, names]) => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ ...label, marginBottom: 4 }}>{group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {names.map((n) => (
                  <button
                    key={n}
                    onClick={() => loadImage(catalog.base + catalog.textures[n].file, n)}
                    title={n}
                    style={{
                      width: 36, height: 36, padding: 2, cursor: 'pointer',
                      background: '#202020', border: '1px solid var(--border)', borderRadius: 5,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={catalog.base + catalog.textures[n].file}
                      alt={n} width={30} height={30}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
