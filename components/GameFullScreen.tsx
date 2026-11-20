'use client';

// Full screen for a game on /play (shCode #122): the game box, and only the game box, fills the
// screen. Same rules as the sandbox's game-only full screen (SandboxWorkspace): the browser owns the
// state and we mirror it, so Esc just works; the sketch is told with { source: 'preview-fit', on } so
// runner.html scales the canvas up to fill the screen (and back), without restarting it; the keys go
// to the game at once. A Restart while full screen makes a new frame, which is told again when it
// loads.
//
// useGameFullScreen() gives the box's ref, whether it is full screen, and the toggle; <GameFullScreenBox>
// is the box with the corner button inside it (the way out while full screen, where the page's own
// buttons are hidden).

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

function tell(frame: HTMLIFrameElement | null | undefined, on: boolean) {
  frame?.contentWindow?.postMessage({ source: 'preview-fit', on }, '*');
}

// The keys go to the game at once. iframe.focus() alone is not enough when the game is still loading
// (Full screen pressed before Play): the frame becomes the page's active element, the game's own window
// never gets focus, and a second iframe.focus() is a no-op, so no key reached the game until it was
// clicked. Focusing the frame's window moves real focus inside it.
function focusGame(frame: HTMLIFrameElement | null | undefined) {
  if (!frame) return;
  frame.focus();
  try { frame.contentWindow?.focus(); } catch { /* not reachable: the element focus above stands */ }
}

export function useGameFullScreen() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof document !== 'undefined' && !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen);
    const onFs = () => {
      const box = boxRef.current;
      const active = !!box && document.fullscreenElement === box;
      setFull(active);
      const frame = box?.querySelector('iframe');
      tell(frame, active);
      if (active) focusGame(frame);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggle = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement === box) document.exitFullscreen?.();
    else box.requestFullscreen?.().catch(() => { /* refused: stay windowed */ });
  }, []);

  return { boxRef, full, supported, toggle };
}

/** The page's own "Full screen" button, beside Run. */
export function GameFullScreenButton({ onClick, style }: { onClick: () => void; style?: CSSProperties }) {
  return (
    <button type="button" style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }} onClick={onClick}
      title="Fill the screen with the game (Esc to leave)" data-testid="play-fullscreen">
      <Maximize2 size={13} aria-hidden="true" />
      Full screen
    </button>
  );
}

export function GameFullScreenBox({ boxRef, full, supported, onToggle, style, children }: {
  boxRef: RefObject<HTMLDivElement | null>;
  full: boolean;
  supported: boolean;
  onToggle: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  // A Restart while full screen makes a new frame: tell it too. load does not bubble; listening in the
  // capture phase on the box sees every frame it holds.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onLoad = (e: Event) => {
      if (document.fullscreenElement === box && e.target instanceof HTMLIFrameElement) {
        tell(e.target, true);
        focusGame(e.target);
      }
    };
    box.addEventListener('load', onLoad, true);
    return () => box.removeEventListener('load', onLoad, true);
  }, [boxRef]);
  return (
    <div ref={boxRef} className="play-game-box" style={{ position: 'relative', ...style }}>
      {children}
      {supported && (
        <button
          type="button"
          className="play-game-fs"
          onClick={onToggle}
          title={full ? 'Leave full screen (Esc)' : 'Full screen the game'}
          aria-label={full ? 'Leave full screen' : 'Full screen the game'}
        >
          {full ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
        </button>
      )}
      <style>{`
        /* Quiet until the pointer or keyboard is on the game, so it never sits over the picture while playing. */
        .play-game-fs {
          position: absolute; top: 8px; right: 8px; z-index: 6;
          width: 30px; height: 30px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--c-bg); color: var(--c-fg);
          border: 1px solid var(--c-line); border-radius: 4px; cursor: pointer;
          opacity: 0.55; transition: opacity 0.12s;
        }
        .play-game-box:hover .play-game-fs, .play-game-fs:focus-visible { opacity: 1; }
        .play-game-fs:hover { border-color: var(--c-cyan); color: var(--c-cyan); }
        .play-game-fs:focus-visible { outline: 2px solid var(--c-cyan); outline-offset: 2px; }
        .play-game-box:fullscreen { background: var(--bg); border: 0 !important; border-radius: 0 !important; height: 100% !important; }
      `}</style>
    </div>
  );
}
