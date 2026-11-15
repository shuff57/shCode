'use client';

// The console box under an editor, one component for every screen that has one: the sandbox, lessons and
// assignments, /play and shared programs. Its top edge is a bar: drag it up for a taller console, or focus
// it and use the up and down arrow keys (Shift for bigger steps). In lessons it also folds away
// (`collapsible`), because a lesson page is long and a beginner does not need an empty console until they
// print something. The rules for the size are lib/console-size.ts; the log itself is ./Console.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Console from './Console';
import { clampConsoleHeight, consoleKeyDelta, windowShare } from '../lib/console-size';

// Kept for this visit (until the page is reloaded), so a console the student made taller stays that tall
// from lesson to lesson. Not stored: a personal browser key would have to go through lib/owned-storage.
let rememberedHeight: number | null = null;

interface Props {
  /** Clears the log when it changes (a new Run). */
  resetKey: string;
  /** Replaces a console line's text before it shows (/play explains an unshared picture). */
  reword?: (text: string) => string;
  /** Adds a "Console" toggle that folds the box away (lessons). Without it the box is always open. */
  collapsible?: boolean;
  /** Collapsible only: whether it is open, when the parent keeps that. Left out, the box keeps it itself, open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Its height until the student drags it, in px. */
  defaultHeight?: number;
  /**
   * The tallest it may be right now, in px, given where it sits (the sandbox leaves the editor and the game a
   * usable height). Left out: 60% of the window, which suits a page that scrolls.
   */
  maxHeight?: () => number;
  /** Fit the height again when this changes (the sandbox's full screen). */
  refitKey?: unknown;
  className?: string;
  style?: CSSProperties;
}

export default function ResizableConsole({
  resetKey, reword, collapsible = false, open, onOpenChange, defaultHeight = 120, maxHeight, refitKey, className, style,
}: Props) {
  const [innerOpen, setInnerOpen] = useState(true);
  const isOpen = !collapsible || (open ?? innerOpen);
  const [height, setHeight] = useState<number | null>(rememberedHeight);
  const boxRef = useRef<HTMLDivElement>(null);
  const maxRef = useRef(maxHeight);
  maxRef.current = maxHeight;

  const setSize = useCallback((h: number | null) => {
    rememberedHeight = h;
    setHeight(h);
  }, []);
  const clamp = useCallback((want: number) => {
    const most = maxRef.current ? maxRef.current() : windowShare(window.innerHeight);
    return clampConsoleHeight(want, most);
  }, []);

  const toggle = useCallback(() => {
    const next = !isOpen;
    setInnerOpen(next);
    onOpenChange?.(next);
  }, [isOpen, onOpenChange]);

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box || e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    bar.focus();
    const startY = e.clientY;
    const startH = box.getBoundingClientRect().height;
    // No text selection or stray hover while dragging, and an iframe (the game) under the pointer must not
    // swallow the moves.
    document.body.classList.add('is-sizing-console');
    const move = (ev: PointerEvent) => setSize(clamp(startH + (startY - ev.clientY)));
    const end = () => {
      document.body.classList.remove('is-sizing-console');
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', end);
      bar.removeEventListener('pointercancel', end);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }, [clamp, setSize]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = consoleKeyDelta(e.key, e.shiftKey);
    if (delta === null) return;
    e.preventDefault();
    const now = boxRef.current?.getBoundingClientRect().height ?? defaultHeight;
    setSize(clamp(now + delta));
  }, [clamp, defaultHeight, setSize]);

  // A smaller window, or leaving full screen, can leave too little room for the height kept: fit it again.
  useEffect(() => {
    if (height === null) return;
    const refit = () => setHeight((h) => (h === null ? h : clamp(h)));
    const t = setTimeout(refit, 120);
    window.addEventListener('resize', refit);
    return () => { clearTimeout(t); window.removeEventListener('resize', refit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refitKey, height === null, clamp]);

  const sized = isOpen && height !== null;
  const boxStyle = {
    '--wsc-default': `${defaultHeight}px`,
    ...(sized ? { height, maxHeight: 'none' } : null),
  } as CSSProperties;

  return (
    <div className={'wsc' + (className ? ' ' + className : '')} style={style}>
      {isOpen && (
        <div
          className="wsc-bar"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Console height: drag up or down, or use the up and down arrow keys"
          title="Drag to make the console taller or shorter"
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={onKey}
        >
          <span className="wsc-grip" aria-hidden="true" />
        </div>
      )}
      <div
        className={'wsc-box' + (isOpen ? ' is-open' : '')}
        ref={boxRef}
        style={boxStyle}
        data-sized={sized ? '' : undefined}
      >
        {collapsible ? (
          <button
            type="button"
            className="output-header wsc-head"
            aria-expanded={isOpen}
            onClick={toggle}
          >
            {isOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            Console
          </button>
        ) : (
          <div className="output-header">Console</div>
        )}
        {/* Always mounted, only hidden when folded away: the log keeps collecting what the program prints
            while it is closed, as the <details> it replaces did. */}
        <div className="wsc-body" hidden={!isOpen}>
          <Console resetKey={resetKey} reword={reword} />
        </div>
      </div>
    </div>
  );
}
