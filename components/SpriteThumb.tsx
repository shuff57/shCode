'use client';

// A picture in the Library: a still, or an animation (a horizontal strip of
// frames) that LOOPS in its card the way it plays in a sketch. The loop is a
// CSS steps() animation of the strip's background position (one rule in
// app/globals.css, .sprite-thumb), so a page of animated cards costs no script;
// with reduced motion the first frame stands still.
//
// SpriteViewer is the expanded view: the animation big, every frame numbered,
// and the card's own actions (Copy code, Remix, Edit, Copy to mine) passed in.

import { useEffect, useRef, useState } from 'react';

/** Frames and ticks per frame from a library item's meta ('{"frames":6,"frameDelay":5}', maybe stringified twice). */
export function texMeta(meta: string | null | undefined): { frames: number; frameDelay: number } {
  if (!meta) return { frames: 1, frameDelay: 6 };
  try {
    const a = JSON.parse(meta);
    const m = typeof a === 'string' ? JSON.parse(a) : a;
    const frames = Math.max(1, Math.floor(Number(m?.frames)) || 1);
    const frameDelay = Math.max(1, Math.floor(Number(m?.frameDelay)) || 6);
    return { frames, frameDelay };
  } catch {
    return { frames: 1, frameDelay: 6 };
  }
}

/** The strip's natural size, once the browser has it (needed for a frame's shape). */
function useNaturalSize(src: string): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => { if (live) setSize({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.src = src;
    return () => { live = false; };
  }, [src]);
  return size;
}

export function SpriteThumb({ src, frames = 1, frameDelay = 6, size, alt = '' }: {
  src: string;
  frames?: number;
  /** Sketch frames (60 a second) each picture is shown for, as in moSHion. */
  frameDelay?: number;
  /** The box is size x size; the frame is fitted inside, pixels kept sharp. */
  size: number;
  alt?: string;
}) {
  const nat = useNaturalSize(src);
  const n = Math.max(1, frames);
  const fw = nat ? nat.w / n : 1;
  const fh = nat ? nat.h : 1;
  const scale = nat ? Math.min(size / fw, size / fh) : 0;
  const w = Math.round(fw * scale);
  const h = Math.round(fh * scale);
  const anim = n > 1;
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
    >
      {nat ? (
        <span
          className="sprite-thumb"
          data-anim={anim ? '' : undefined}
          style={{
            width: w,
            height: h,
            display: 'block',
            backgroundImage: `url("${src}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${w * n}px ${h}px`,
            imageRendering: 'pixelated',
            ['--strip-end' as string]: `${-w * n}px`,
            ['--strip-n' as string]: String(n),
            ['--strip-dur' as string]: `${(n * frameDelay) / 60}s`,
          }}
        />
      ) : null}
    </span>
  );
}

/** One frame of the strip, still, for the frame row. */
function Frame({ src, index, frames, size }: { src: string; index: number; frames: number; size: number }) {
  const nat = useNaturalSize(src);
  if (!nat) return <span style={{ width: size, height: size, display: 'inline-block' }} />;
  const fw = nat.w / frames;
  const scale = Math.min(size / fw, size / nat.h);
  const w = Math.round(fw * scale);
  const h = Math.round(nat.h * scale);
  return (
    <span style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{
        width: w, height: h, display: 'block', backgroundImage: `url("${src}")`, backgroundRepeat: 'no-repeat',
        backgroundSize: `${w * frames}px ${h}px`, backgroundPosition: `${-w * index}px 0`, imageRendering: 'pixelated',
      }} />
    </span>
  );
}

export function SpriteViewer({ name, src, frames = 1, frameDelay = 6, onClose, children }: {
  name: string;
  src: string;
  frames?: number;
  frameDelay?: number;
  onClose: () => void;
  /** The card's actions: Copy code, Remix, Edit, Copy to mine. */
  children?: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [onClose]);
  const n = Math.max(1, frames);
  const perSecond = Math.round((60 / frameDelay) * 10) / 10;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1900, background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        style={{
          background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderTop: '3px solid var(--brand)',
          borderRadius: 8, width: 'min(620px, 100%)', maxHeight: 'min(90vh, 760px)', overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{ fontSize: 16, fontWeight: 700 }}>{name}</code>
          <span style={{ color: 'var(--c-meta)', fontSize: 13 }}>
            {n > 1 ? `${n} frames, ${perSecond} a second` : 'One picture'}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid var(--c-line)', color: 'var(--c-fg)', borderRadius: 4,
              width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--x-202020)', borderRadius: 6, padding: 12 }}>
          <SpriteThumb src={src} frames={n} frameDelay={frameDelay} size={168} alt={`${name}, playing`} />
        </div>
        {n > 1 ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--c-meta)', marginBottom: 6 }}>Each frame, in order</div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: n }, (_, i) => (
                <li key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ background: 'var(--x-202020)', borderRadius: 4, border: '1px solid var(--c-line)' }}>
                    <Frame src={src} index={i} frames={n} size={64} />
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-meta)' }}>{i + 1}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {children ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div> : null}
      </div>
    </div>
  );
}
