'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';

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
}

const MIN_W = 240;
const MAX_W = 600;
const DEFAULT_W = 320;

export default function TabbedRightDrawer({ tabs, storageKey }: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [closeBtnHovered, setCloseBtnHovered] = useState(false);
  const [width, setWidth] = useState<number>(DEFAULT_W);
  const widthRef = useRef(width);
  widthRef.current = width;

  const activeStorage = `${storageKey}:active`;
  const widthStorage = `${storageKey}:width`;

  useEffect(() => {
    const savedActive = localStorage.getItem(activeStorage);
    if (savedActive && tabs.some((t) => t.key === savedActive)) {
      setActiveKey(savedActive);
    }
    const savedWidth = parseInt(localStorage.getItem(widthStorage) ?? '', 10);
    if (!Number.isNaN(savedWidth)) {
      setWidth(Math.max(MIN_W, Math.min(MAX_W, savedWidth)));
    }
    setMounted(true);
  }, [activeStorage, widthStorage, tabs]);

  useEffect(() => {
    if (!mounted) return;
    if (activeKey) localStorage.setItem(activeStorage, activeKey);
    else localStorage.removeItem(activeStorage);
  }, [activeKey, mounted, activeStorage]);

  // Publish open width so body padding can reflow.
  useEffect(() => {
    const cssVar = '--shd-tabbed';
    if (activeKey && mounted) {
      document.documentElement.style.setProperty(cssVar, `${width}px`);
    } else {
      document.documentElement.style.removeProperty(cssVar);
    }
    return () => {
      document.documentElement.style.removeProperty(cssVar);
    };
  }, [activeKey, width, mounted]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    setWidth(Math.max(MIN_W, Math.min(MAX_W, window.innerWidth - e.clientX)));
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
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
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: `min(${width}px, 100vw)`,
          background: '#21222c',
          borderLeft: '1px solid #44475a',
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
            borderBottom: '1px solid #44475a',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#f8f8f2', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>
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
                color: closeBtnHovered ? '#f8f8f2' : '#6272a4',
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
            color: '#f8f8f2',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {active?.content}
        </div>
      </div>

      {/* Clustered vertical tab stack — slides with the drawer when open. */}
      <div
        style={{
          position: 'fixed',
          right: 'var(--shd-tabbed, 0px)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          transition: 'right 0.22s ease',
        }}
      >
        {tabs.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <button
              key={t.key}
              aria-label={`${t.label} tab`}
              aria-pressed={isActive}
              onClick={() => setActiveKey(isActive ? null : t.key)}
              style={{
                background: isActive ? '#282a36' : '#21222c',
                border: '1px solid #44475a',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                color: t.color ?? '#bd93f9',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                padding: '12px 6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                outline: 'none',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
