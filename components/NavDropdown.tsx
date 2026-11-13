'use client';

// Shared click-to-open dropdown for the header nav (Learn/Teach menus) and
// the account menu. Click-outside and Escape both close it — same pattern as
// CalendarPopover.tsx / LessonAccessChip.tsx, just without the portal: a
// header dropdown never sits inside an overflow-hidden ancestor, so plain
// absolute positioning is enough and skips the fixed-position/getBoundingRect
// bookkeeping those two need.

import { useEffect, useRef, useState } from 'react';

export interface NavDropdownProps {
  label: string;
  children: React.ReactNode;
  /** Which edge of the trigger the panel hangs from. Default 'left'. */
  align?: 'left' | 'right';
  triggerStyle?: React.CSSProperties;
  panelStyle?: React.CSSProperties;
  /** The page is inside this menu's section: the trigger is marked (aria-current, globals.css climb4 r9 S1). */
  current?: boolean;
}

export default function NavDropdown({
  label,
  children,
  align = 'left',
  triggerStyle,
  panelStyle,
  current = false,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-current={current ? 'true' : undefined}
        className={current ? 'nav-current' : undefined}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          font: 'inherit',
          cursor: 'pointer',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          ...triggerStyle,
        }}
      >
        {label}
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.8 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align]: 0,
            minWidth: 150,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--c-bg)',
            border: '1px solid var(--c-line)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            padding: 6,
            zIndex: 1000,
            ...panelStyle,
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
