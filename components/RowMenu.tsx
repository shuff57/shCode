'use client';

// A small "More" menu for the actions on a row that cost something to hit by accident (remove a student,
// reset tries, unsubmit a quiz). They used to sit as full-size buttons beside the routine ones; here they sit
// one click away, labelled in words, and the caller still confirms before anything is changed.
//
// Keyboard: Enter/Space/ArrowDown open it, arrows move, Home/End jump, Escape closes and returns focus to the button,
// Tab closes it. The menu is position:fixed from the button's rectangle, so a scrolling drawer or card cannot clip it.

import { useEffect, useRef, useState } from 'react';

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  /** Drawn in red: the action removes something. */
  danger?: boolean;
  disabled?: boolean;
  /** Longer explanation, shown as a tooltip. */
  title?: string;
}

export function RowMenu({ items, label = 'More actions', buttonText = 'More', disabled = false }: { items: RowMenuItem[]; label?: string; buttonText?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 8), right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus();
    const away = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', away);
    // A fixed menu would float away from its row if the page moved under it.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const els = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i + els.length - 1) % els.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openMenu(); } }}
        style={{ background: 'none', border: '1px solid #6272a4', borderRadius: 4, color: '#a9b7e0', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', padding: '3px 8px', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}
      >
        {buttonText} <span aria-hidden="true">▾</span>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 1500, background: '#1e1f29', border: '1px solid #44475a', borderRadius: 6, padding: 4, minWidth: 190, boxShadow: '0 4px 16px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              title={it.title}
              onClick={() => {
                setOpen(false);
                // Focus goes back to the button first, so a confirm opened by this item returns focus here, not to an item that no longer exists.
                btnRef.current?.focus();
                it.onSelect();
              }}
              style={{ textAlign: 'left', background: 'none', border: 'none', borderRadius: 4, padding: '8px 10px', fontSize: 13, color: it.danger ? '#ff6e6e' : '#f8f8f2', cursor: it.disabled ? 'not-allowed' : 'pointer', opacity: it.disabled ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = '#2f3142'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              onFocus={(e) => { e.currentTarget.style.background = '#2f3142'; }}
              onBlur={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
