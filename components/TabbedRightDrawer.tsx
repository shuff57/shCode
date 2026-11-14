'use client';

import { useState, useEffect, useCallback, useRef, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export interface DrawerTab {
  key: string;
  label: string;
  color?: string;
  content: ReactNode;
  headerExtra?: ReactNode;
  /** Only on a wide screen with a dock (the lab's Task tab: a phone shows the task above the editor). */
  dockedOnly?: boolean;
}

interface Props {
  tabs: DrawerTab[];
  storageKey: string;
  /** Desktop only: the id of an element in the page's own toolbar (a lab's status row, the sandbox
   *  header). When it is on the page the tabs render there as one row of buttons instead of the
   *  fixed rail along the right edge, so the workspace gets the full page width. Phones keep the
   *  bottom dock. The drawer itself (and its resize) is the same either way. */
  inlineHostId?: string;
  /** Desktop only: the id of a column in the page's own layout (a lab's side column). When it is on
   *  the page the open tab renders INSIDE it, in the page's flow, instead of as a fixed drawer over
   *  the window's right edge: the page is never pushed sideways and the header and footer never
   *  move. Phones keep the overlay drawer. */
  dockHostId?: string;
  /** With a dock: the tab open when the page loads (unless the student closed the panel last time). */
  dockDefaultKey?: string;
}

const MIN_W = 240;
const MAX_W = 600;
const DEFAULT_W = 320;

export default function TabbedRightDrawer({ tabs: allTabs, storageKey, inlineHostId, dockHostId, dockDefaultKey }: Props) {
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
  const [dockHost, setDockHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = inlineHostId ? document.getElementById(inlineHostId) : null;
    if (el !== inlineHost) setInlineHost(el);
    const dock = dockHostId ? document.getElementById(dockHostId) : null;
    if (dock !== dockHost) setDockHost(dock);
  });

  const activeStorage = `${storageKey}:active`;
  const widthStorage = `${storageKey}:width`;
  const dockClosedStorage = `${storageKey}:dock-closed`;
  const docked = !!dockHost && !narrow;
  // A tab only a dock can show (the lab's Task) is left out where there is no dock.
  const tabs = docked ? allTabs : allTabs.filter((t) => !t.dockedOnly);

  // With a dock the panel opens on its default tab, unless the student closed it last time.
  const openedDefault = useRef(false);
  useEffect(() => {
    if (!docked || !mounted || openedDefault.current || !dockDefaultKey) return;
    openedDefault.current = true;
    let closed = false;
    try { closed = localStorage.getItem(dockClosedStorage) === '1'; } catch { /* storage blocked: open */ }
    if (!closed) setActiveKey((k) => k ?? dockDefaultKey);
  }, [docked, mounted, dockDefaultKey, dockClosedStorage]);
  // Leaving the dock (the window got narrow) closes a tab only the dock can show.
  useEffect(() => {
    if (activeKey && !tabs.some((t) => t.key === activeKey)) setActiveKey(null);
  }, [activeKey, tabs]);
  // The tab the arrow reopens: the last one shown, else the page's default, else the first.
  const lastKey = useRef<string | null>(null);
  const choose = (key: string | null) => {
    if (key !== null) lastKey.current = key;
    setActiveKey(key);
    if (docked) {
      try { localStorage.setItem(dockClosedStorage, key === null ? '1' : '0'); } catch { /* not remembered */ }
    }
  };

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
    if (activeKey === null || docked) return;
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
  }, [activeKey, docked]);

  // Publish open width so body padding can reflow (an overlay drawer only: a dock is in the page).
  useEffect(() => {
    const cssVar = '--shd-tabbed';
    if (activeKey && mounted && !narrow && !docked) {
      document.documentElement.style.setProperty(cssVar, `${width}px`);
    } else {
      document.documentElement.style.removeProperty(cssVar);
    }
    return () => {
      document.documentElement.style.removeProperty(cssVar);
    };
  }, [activeKey, width, mounted, narrow, docked]);

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
    // The dragged edge is the panel's left edge; a dock's right edge is not the window's.
    const right = e.currentTarget.parentElement?.getBoundingClientRect().right ?? window.innerWidth;
    pendingW.current = Math.max(MIN_W, Math.min(MAX_W, right - e.clientX));
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

  // Lesson pages (a lab's dock, or the fixed drawer with no toolbar host) open the sidebar with one small
  // arrow tab; inside it, a row of buttons switches menus. The sandbox keeps its toolbar buttons, and a
  // phone its bottom bar of tabs.
  const useHandle = docked || (!inlineHost && !narrow);
  const openKey = () =>
    lastKey.current && tabs.some((t) => t.key === lastKey.current) ? lastKey.current
      : dockDefaultKey && tabs.some((t) => t.key === dockDefaultKey) ? dockDefaultKey
        : tabs[0].key;
  const handleLabel = open
    ? 'Close the side panel'
    : `Open the side panel (${tabs.map((t) => t.label).join(', ')})`;
  const handle = (extraClass: string) => (
    <button
      type="button"
      className={`shd-handle ${extraClass}`}
      aria-expanded={open}
      aria-label={handleLabel}
      title={handleLabel}
      onClick={() => choose(open ? null : openKey())}
    >
      <span aria-hidden="true">{open ? '\u203a' : '\u2039'}</span>
    </button>
  );

  // The panel itself: a resize edge, a title row with the tab's extras and a close button, and the
  // tab's content. The same markup is a column in the page (dock) or a fixed drawer (overlay).
  const panel = (
    <>
      <div
        role="separator"
        aria-label="Resize panel"
        aria-orientation="vertical"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        style={{ position: 'absolute', left: -2, top: 0, bottom: 0, width: 6, cursor: 'ew-resize', zIndex: 1 }}
      />
      {useHandle && tabs.length > 1 ? (
        // One button per menu: the sidebar switches between them in place (opened and closed by the arrow).
        <div className="shd-switch" role="group" aria-label="Side panel menus">
          {tabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={isActive}
                className="shd-switch-btn"
                onClick={() => choose(t.key)}
                style={{ '--shd-tab-accent': t.color ?? 'var(--c-purple)' } as CSSProperties}
              >
                {t.label}
              </button>
            );
          })}
          {active?.headerExtra ? <span className="shd-switch-extra">{active.headerExtra}</span> : null}
        </div>
      ) : (
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
            {useHandle ? null : (
              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => choose(null)}
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
            )}
          </div>
        </div>
      )}
      <div
        className="shd-panel-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
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
    </>
  );

  return (
    <>
      {docked ? (
        // In the page: a strip of tabs down the right edge of the work, always there, and the open tab's
        // panel just left of it. Closed, only the strip takes room.
        createPortal(
          <div className={`shd-dock-wrap${open ? ' is-open' : ''}`}>
            {handle('shd-handle-dock')}
            {open ? (
              <div
                aria-label={active?.label ?? 'Panel'}
                role="complementary"
                className="shd-dock"
                style={{ width } as CSSProperties}
              >
                {panel}
              </div>
            ) : null}
          </div>,
          dockHost!,
        )
      ) : (
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
          {panel}
        </div>
      )}

      {/* Inline: one row of tool buttons in the page's own toolbar (desktop with a host). */}
      {inlineHost && !narrow && !docked ? createPortal(
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
                onClick={() => choose(isActive ? null : t.key)}
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
      {(inlineHost && !narrow) || docked ? null : <div
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
        {useHandle ? handle('shd-tab') : tabs.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <button
              key={t.key}
              aria-label={`${t.label} tab`}
              title={t.label}
              aria-pressed={isActive}
              className="shd-tab"
              onClick={() => choose(isActive ? null : t.key)}
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
