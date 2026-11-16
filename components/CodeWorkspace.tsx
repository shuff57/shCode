'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import ResizableConsole from './ResizableConsole';
import { windowShare } from '../lib/console-size';

/** The same bounded editor/preview/console frame in projects, course work and reading examples. */
export default function CodeWorkspace({ children, consoleResetKey, consoleContent, fill = false, style }: {
  children: ReactNode;
  consoleResetKey?: string;
  /** Reading examples keep their console scoped to their own iframe. */
  consoleContent?: ReactNode;
  fill?: boolean;
  style?: CSSProperties;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0);
  const maxConsoleHeight = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || window.matchMedia('(max-width: 720px)').matches) return windowShare(window.innerHeight);
    const minimumPane = document.fullscreenElement ? 160 : 220;
    return frame.clientHeight - minimumPane - 12;
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => setFit((n) => n + 1));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className={`code-workspace${fill ? ' code-workspace-fill' : ''}`} style={style}>
      {children}
      {consoleResetKey !== undefined && (
        <ResizableConsole resetKey={consoleResetKey} defaultHeight={120} maxHeight={maxConsoleHeight} refitKey={`${fill}:${fit}`}>
          {consoleContent}
        </ResizableConsole>
      )}
    </div>
  );
}
