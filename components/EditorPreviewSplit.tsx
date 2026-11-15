'use client';

// The editor on the left, the preview (output, game or page) on the right, and the bar between them that
// resizes the two: one component for the sandbox and for lessons and assignments, which each carried their
// own copy of this markup and of the ~100 lines of drag handling. Drag the divider, or focus it and press
// the left and right arrow keys (Shift for bigger steps).
//
// The ids (#split, #editorPane, #divider, #previewPane, #dragOverlay) are kept: the stylesheet and other
// code address the panes by them. There is one split on a page.
//
// Three shapes, all in the same box so the layout around it never changes:
//   editor + preview   the split above;
//   editor alone       a text lesson, which has nothing to run (`preview` left out);
//   children           something that replaces the whole split (reSHape's studio, the flowchart editor).

import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';

interface Props {
  editor?: ReactNode;
  preview?: ReactNode;
  /** The preview pane's element, for the game's own full screen. */
  previewRef?: Ref<HTMLDivElement>;
  /** Replaces the whole split; no panes and no divider. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const MIN_PANE = 220;

export default function EditorPreviewSplit({ editor, preview, previewRef, children, className, style }: Props) {
  const splitRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasPanes = children === undefined && preview !== undefined && preview !== null;

  const setRight = useCallback((node: HTMLDivElement | null) => {
    rightRef.current = node;
    if (typeof previewRef === 'function') previewRef(node);
    else if (previewRef) (previewRef as { current: HTMLDivElement | null }).current = node;
  }, [previewRef]);

  // Pane resizing. Only while both panes exist: a text lesson or reSHape has no divider to drag.
  useEffect(() => {
    const split = splitRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const divider = dividerRef.current;
    const overlay = overlayRef.current;
    if (!hasPanes || !split || !left || !right || !divider || !overlay) return;

    let dragging = false;
    let rect: DOMRect | null = null;
    let rafId: number | null = null;

    // The code editor sizes itself from a window 'resize', so tell it the pane changed.
    const relayoutEditor = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        rafId = null;
      });
    };

    const setPositions = (clientX: number) => {
      if (!rect) rect = split.getBoundingClientRect();
      const min = MIN_PANE;
      const max = rect.width - MIN_PANE;
      let x = clientX - rect.left;
      x = Math.max(min, Math.min(max, x));
      const leftPct = (x / rect.width) * 100;
      left.style.flex = `0 0 ${leftPct}%`;
      right.style.flex = `0 0 ${100 - leftPct}%`;
      relayoutEditor();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      setPositions(e.clientX);
      e.preventDefault();
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      overlay.style.display = 'none';
      document.body.style.userSelect = '';
      document.body.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onMove, false);
      window.removeEventListener('pointerup', onUp, false);
      window.removeEventListener('pointercancel', stopDrag, false);
      window.removeEventListener('blur', stopDrag, false);
      document.removeEventListener('visibilitychange', onVisChange, false);
    };

    const onUp = (e: PointerEvent) => {
      try { divider.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
      stopDrag();
    };
    const onVisChange = () => { if (document.hidden) stopDrag(); };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      rect = split.getBoundingClientRect();
      overlay.style.display = 'block';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-resizing');
      try { divider.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      window.addEventListener('pointermove', onMove, false);
      window.addEventListener('pointerup', onUp, false);
      window.addEventListener('pointercancel', stopDrag, false);
      window.addEventListener('blur', stopDrag, false);
      document.addEventListener('visibilitychange', onVisChange, false);
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 40 : 10;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        rect = split.getBoundingClientRect();
        const currentLeft = left.getBoundingClientRect().width || rect.width / 2;
        const next = currentLeft + (e.key === 'ArrowRight' ? step : -step);
        setPositions(rect.left + next);
        e.preventDefault();
      }
    };

    divider.addEventListener('pointerdown', onPointerDown, false);
    divider.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('resize', relayoutEditor, false);

    return () => {
      stopDrag();
      if (rafId) cancelAnimationFrame(rafId);
      divider.removeEventListener('pointerdown', onPointerDown, false);
      divider.removeEventListener('keydown', onKeyDown, false);
      window.removeEventListener('resize', relayoutEditor, false);
    };
  }, [hasPanes]);

  return (
    <div className={'editor-preview-container' + (className ? ' ' + className : '')} id="split" ref={splitRef} style={style}>
      {children !== undefined ? children : (
        <>
          <div
            className="pane"
            id="editorPane"
            ref={leftRef}
            style={hasPanes ? undefined : { flex: '1 1 100%' }}
          >
            {editor}
          </div>
          {hasPanes && (
            <>
              <div
                className="divider"
                id="divider"
                ref={dividerRef}
                tabIndex={0}
                aria-label="Resize editor and preview"
              >
                <span className="drag-handle" aria-hidden="true"></span>
              </div>
              <div className="pane" id="previewPane" ref={setRight}>
                {preview}
              </div>
              <div className="drag-overlay" id="dragOverlay" ref={overlayRef} aria-hidden="true"></div>
            </>
          )}
        </>
      )}
    </div>
  );
}
