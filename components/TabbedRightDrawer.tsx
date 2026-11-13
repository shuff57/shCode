'use client';

import { useState, useEffect, useCallback, useRef, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export interface DrawerTab {
  key: string;
  label: string;
  color?: string;
  content: ReactNode;
  headerExtra?: ReactNode;
}

interface Props {
  tabs: DrawerTab[];
  storageKey: string;
  /** Desktop only: the id of an element in the page's own toolbar (a lab's status row, the sandbox
   *  header). When it is on the page the tabs render there as one row of buttons instead of the
   *  fixed rail along the right edge, so the workspace gets the full page width. Phones keep the
   *  bottom dock. The drawer itself (and its resize) is the same either way. */
  inlineHostId?: string;
}

const MIN_W = 240;
const MAX_W = 600;
const DEFAULT_W = 320;

export default function TabbedRightDrawer({ tabs, storageKey, inlineHostId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [closeBtnHovered, setCloseBtnHovered] = useState(false);
  const [width, setWidth] = useState<number>(DEFAULT_W);
  // Phone-width screens: the drawer overlays the page instead of reflowing it
  // (a 320px drawer plus the page gutter would leave ~30px for the lesson) and
  // the tab strip moves to a horizontal bar along the bottom edge.
  const [narrow, setNarrow] = useState(false);
  const widthRef = useRef(width);
  // While the edge is dragged the tabs follow it at once; the slide is only for opening and closing.
  const [dragging, setDragging] = useState(false);
  widthRef.current = width;
  // The inline host, when the page has one (looked up after every commit: the host is a sibling
  // that can mount or unmount with the page's header).
  const [inlineHost, setInlineHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = inlineHostId ? document.getElementById(inlineHostId) : null;
    if (el !== inlineHost) setInlineHost(el);
  });

  const activeStorage = `${storageKey}:active`;
  const widthStorage = `${storageKey}:width`;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    // Every page starts with the drawer CLOSED (ux1 B6). Re-opening the tab left open last time put
    // the Quest drawer over a moSHion lab on arrival, narrowing the editor and covering the header;
    // a student opens a tool when they want it. The width they chose is still remembered.
    try { localStorage.removeItem(activeStorage); } catch { /* storage blocked: nothing to forget */ }
    const savedWidth = parseInt(localStorage.getItem(widthStorage) ?? '', 10);
    if (!Number.isNaN(savedWidth)) {
      setWidth(Math.max(MIN_W, Math.min(MAX_W, savedWidth)));
    }
    setMounted(true);
  }, [activeStorage, widthStorage, tabs]);

  // The drawer starts below the site header, never over it (ux1 B6): it used to run from the top
  // of the window, so its resize edge sat on the header's Gradebook link and the account menu. As
  // the page scrolls the header leaves and the drawer takes the full height.
  const [top, setTop] = useState(0);
  useEffect(() => {
    if (activeKey === null) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const header = document.querySelector('body > header') ?? document.querySelector('header');
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      setTop(Math.max(0, Math.round(bottom)));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [activeKey]);

  // Publish open width so body padding can reflow.
  useEffect(() => {
    const cssVar = '--shd-tabbed';
    if (activeKey && mounted && !narrow) {
      document.documentElement.style.setProperty(cssVar, `${width}px`);
    } else {
      document.documentElement.style.removeProperty(cssVar);
    }
    return () => {
      document.documentElement.style.removeProperty(cssVar);
    };
  }, [activeKey, width, mounted, narrow]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    document.documentElement.classList.add('shd-resizing');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Pointer events can come faster than the screen draws: one width per frame.
  const pendingW = useRef<number | null>(null);
  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    const first = pendingW.current === null;
    pendingW.current = Math.max(MIN_W, Math.min(MAX_W, window.innerWidth - e.clientX));
    if (first) {
      requestAnimationFrame(() => {
        if (pendingW.current !== null) setWidth(pendingW.current);
        pendingW.current = null;
      });
    }
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setDragging(false);
    document.documentElement.classList.remove('shd-resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(widthStorage, String(widthRef.current));
  }, [widthStorage]);

  if (!mounted || tabs.length === 0) return null;

  const open = activeKey !== null;
  const active = tabs.find((t) => t.key === activeKey) ?? null;

  return (
    <>
      <div
        aria-label={active?.label ?? 'Drawer'}
        className="shd-drawer"
        style={{
          position: 'fixed',
          top,
          right: 0,
          // Issue #17: this used to be a flat 0, so at z-index 900 the
          // drawer sat entirely over LessonProgressFooter (z-index 50)
          // whenever it was open, including the module-progress bar's own
          // clickable dots. LessonProgressFooter publishes its own height
          // to this var (0px when it isn't mounted at all, e.g. no module).
          bottom: 'var(--shd-footer-height, 0px)',
          width: `min(${width}px, 100vw)`,
          background: 'var(--c-deep2)',
          borderLeft: '1px solid var(--c-line)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 900,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div
          role="separator"
          aria-label="Resize drawer"
          aria-orientation="vertical"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          style={{
            position: 'absolute',
            left: -2,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'ew-resize',
            zIndex: 1,
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--c-line)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'var(--c-fg)', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>
            {active?.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {active?.headerExtra}
            <button
              aria-label="Close drawer"
              onClick={() => setActiveKey(null)}
              onMouseEnter={() => setCloseBtnHovered(true)}
              onMouseLeave={() => setCloseBtnHovered(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                lineHeight: 1,
                padding: '2px 4px',
                color: closeBtnHovered ? 'var(--c-fg)' : 'var(--c-dim)',
                transition: 'color 0.15s',
              }}
            >
              &times;
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            color: 'var(--c-fg)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {active?.content}
        </div>
      </div>

      {/* Inline: one row of tool buttons in the page's own toolbar (desktop with a host). */}
      {inlineHost && !narrow ? createPortal(
        <div className="shd-inline-tools" role="group" aria-label="Lesson tools">
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <button
                key={t.key}
                type="button"
                aria-label={`${t.label} tab`}
                title={t.label}
                aria-pressed={isActive}
                className="shd-inline-tool"
                onClick={() => setActiveKey(isActive ? null : t.key)}
                style={{ '--shd-tab-accent': t.color ?? 'var(--c-purple)' } as CSSProperties}
              >
                {t.label}
              </button>
            );
          })}
        </div>,
        inlineHost,
      ) : null}

      {/* Labels run along the desktop rail and move with the drawer. Phones use a horizontal dock. */}
      {inlineHost && !narrow ? null : <div
        className={`shd-tabstrip${tabs.length === 1 && tabs[0].label === 'Docs' ? ' shd-docs-only' : ''}${open ? ' shd-open' : ''}`}
        style={{
          position: 'fixed',
          right: 'var(--shd-tabbed, 0px)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          transition: dragging ? 'none' : 'right 0.22s ease',
        }}
      >
        {tabs.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <button
              key={t.key}
              aria-label={`${t.label} tab`}
              title={t.label}
              aria-pressed={isActive}
              className="shd-tab"
              onClick={() => setActiveKey(isActive ? null : t.key)}
              style={{
                '--shd-tab-accent': t.color ?? 'var(--c-purple)',
                borderRadius: '6px 0 0 6px',
                writingMode: narrow ? 'horizontal-tb' : 'vertical-rl',
                textOrientation: 'mixed',
                padding: '9px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.06em',
              } as CSSProperties}
            >
              {t.label}
            </button>
          );
        })}
      </div>}
    </>
  );
}
