'use client';

// The sandbox toolbar's Share button and the dialog it opens: one window in the middle of the screen with a
// tab for each way to share (Publish game, Code together, Send to...). It replaced a small dropdown whose three
// entries each opened a popup of their own.
//
// Every tab's panel stays MOUNTED while the dialog is closed (the dialog is only hidden), so a half-typed game title or
// message to a classmate is still there when it opens again, as it was when each panel was its own popup. A panel is
// told whether its tab is showing (`active`) so its loads and listeners run only then. The dialog is drawn into
// `host` (the sandbox shell, which is what goes full screen) like the Code together popup always was.

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2 } from 'lucide-react';

export type ShareTab = 'publish' | 'together' | 'send';

export interface ShareTabSpec {
  id: ShareTab;
  label: string;
  icon: React.ReactNode;
  /** The panel. Always mounted; hidden unless this tab is the one showing. */
  pane: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1900, background: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  } as React.CSSProperties,
  dialog: {
    background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 8,
    width: 'min(860px, 100%)', minHeight: 'min(630px, 90vh)', maxHeight: 'min(90vh, 780px)', display: 'flex', flexDirection: 'column',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)', outline: 'none', fontSize: '0.85rem', lineHeight: 1.4,
  } as React.CSSProperties,
  head: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 0' } as React.CSSProperties,
  title: { margin: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  close: {
    marginLeft: 'auto', background: 'none', border: '1px solid var(--c-line)', color: 'var(--c-fg)', borderRadius: 4,
    width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: 'pointer', flexShrink: 0,
  } as React.CSSProperties,
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 16px 12px', borderBottom: '1px solid var(--c-line)' } as React.CSSProperties,
  body: { overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 16px 16px', minWidth: 0, flex: '1 1 auto', minHeight: 0 } as React.CSSProperties,
};

function tabStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
    fontWeight: selected ? 700 : 500, border: '1px solid ' + (selected ? 'var(--c-line)' : 'transparent'),
    background: selected ? 'color-mix(in srgb, var(--brand) 22%, transparent)' : 'transparent',
    color: selected ? 'var(--c-fg)' : 'var(--c-dim)',
  };
}

export default function ShareDialog({ chipStyle, open, onOpenChange, tab, onTab, hostRef, tabs }: {
  chipStyle: React.CSSProperties;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: ShareTab;
  onTab: (tab: ShareTab) => void;
  /** Where the dialog is drawn: the sandbox shell, so it still shows full screen. Read once mounted, so it never moves. */
  hostRef: React.RefObject<HTMLElement | null>;
  tabs: ShareTabSpec[];
}) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // a portal has no server-rendered half
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  // Open: focus goes in (to the dialog, so its name is read first) and back to the Share button on close; Tab stays
  // inside; Escape closes. The same rules as the Code together popup and components/WhatsNewModal.tsx.
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onOpenChangeRef.current(false); }
    };
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) ref.current.focus();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = prevOverflow;
      const back = returnTo && returnTo !== document.body && returnTo.isConnected ? returnTo : null;
      window.setTimeout(() => back?.focus?.(), 0);
    };
  }, [open]);

  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !ref.current) return;
    const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (els.length === 0) { e.preventDefault(); return; }
    const i = els.indexOf(document.activeElement as HTMLElement);
    const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === -1 || i === els.length - 1 ? 0 : i + 1);
    e.preventDefault();
    els[to].focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onTab(tabs[next].id);
    document.getElementById(`${uid}-tab-${tabs[next].id}`)?.focus();
  }

  const dialog = (
    <div style={{ ...S.backdrop, display: open ? 'flex' : 'none' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={current ? `Share: ${current.label}` : 'Share'}
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        style={S.dialog}
        data-testid="share-dialog"
      >
        <div style={S.head}>
          <h2 style={S.title}>Share</h2>
          <button type="button" style={S.close} onClick={() => onOpenChange(false)} aria-label="Close Share">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div role="tablist" aria-label="Ways to share" style={S.tabs}>
          {tabs.map((t, i) => (
            <button
              key={t.id}
              id={`${uid}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={t.id === current?.id}
              aria-controls={`${uid}-pane-${t.id}`}
              tabIndex={t.id === current?.id ? 0 : -1}
              style={tabStyle(t.id === current?.id)}
              onClick={() => onTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div style={S.body}>
          {tabs.map((t) => (
            <div
              key={t.id}
              id={`${uid}-pane-${t.id}`}
              role="tabpanel"
              aria-labelledby={`${uid}-tab-${t.id}`}
              hidden={t.id !== current?.id}
            >
              {t.pane}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="sandbox-share-menu">
      <button
        type="button"
        style={chipStyle}
        className="sandbox-share-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        title="Code together with classmates, send this program to someone, or publish it as a game"
      >
        <Share2 size={12} aria-hidden="true" />
        Share
      </button>
      {mounted && tabs.length > 0 ? createPortal(dialog, hostRef.current ?? document.body) : null}
    </div>
  );
}
