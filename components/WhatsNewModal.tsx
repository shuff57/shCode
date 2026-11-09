'use client';

// What's New: the popup that tells a returning student (or teacher) about
// features they have not seen. Mounted ONCE in the root layout; renders nothing
// until it opens. Entries: lib/whats-new.ts. Rules: lib/whats-new-state.ts.
//
// It opens by itself (decideAutoOpen) only when someone is signed in, on the
// home page, a module's lesson list, the Sandbox or the Library (never a lesson,
// where a quiz or timed part could be running, and never inside a frame), for
// entries of their audience they have not seen that shipped in the last 45
// days, at most once per browser session per account. Automated browsers
// (navigator.webdriver) do not get it by themselves, so it never sits over a
// test's clicks; `?whats-new` in the URL opens it anyway with every entry.
// Closing it, by Close, Got it, Escape, the backdrop or an action, marks
// every entry it showed as seen for this account.
//
// openWhatsNew() opens it with every entry for the reader's role (the account
// menu and /account call it). useWhatsNewUnseen() drives the menu's dot.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '../lib/auth';
import { WHATS_NEW, type WhatsNewEntry } from '../lib/whats-new';
import {
  decideAutoOpen,
  entriesFor,
  entriesToAutoShow,
  markSeen,
  markShownThisSession,
  readSeen,
  wasShownThisSession,
  type KeyValueStore,
} from '../lib/whats-new-state';

const OPEN_EVENT = 'shcode:whats-new-open';
const CHANGED_EVENT = 'shcode:whats-new-changed';
/** Let the page paint first, so the popup is not the first thing that flashes up. */
const SETTLE_MS = 1200;

function local(): KeyValueStore | null {
  try { return window.localStorage; } catch { return null; }
}
function session(): KeyValueStore | null {
  try { return window.sessionStorage; } catch { return null; }
}
function inFrame(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}
function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Opens the popup with every entry for the signed-in reader. `returnFocusTo` gets focus back on close. */
export function openWhatsNew(returnFocusTo?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { returnFocusTo: returnFocusTo ?? null } }));
}

/** True while the signed-in reader has recent news they have not seen (the account menu's dot). */
export function useWhatsNewUnseen(): boolean {
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const update = () => {
      void getCurrentUser().then((u) => {
        if (cancelled) return;
        setUnseen(!!u && entriesToAutoShow(WHATS_NEW, readSeen(u.email, local()), u.role).length > 0);
      });
    };
    update();
    window.addEventListener(CHANGED_EVENT, update);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED_EVENT, update);
    };
  }, []);
  return unseen;
}

interface OpenState { entries: WhatsNewEntry[]; returnTo: HTMLElement | null }

export default function WhatsNewModal() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState<OpenState | null>(null);
  const openRef = useRef<OpenState | null>(null);
  openRef.current = open;

  useEffect(() => {
    let cancelled = false;
    void getCurrentUser().then((u) => { if (!cancelled) setUser(u); });
    return () => { cancelled = true; };
  }, []);

  // By itself: re-checked on every page the student moves to, since the layout
  // (and this component) stays mounted across client-side navigation.
  useEffect(() => {
    if (!user || openRef.current) return;
    let forced = false;
    try { forced = new URLSearchParams(window.location.search).has('whats-new'); } catch { /* no URL */ }
    const due = decideAutoOpen({
      user,
      pathname,
      inFrame: inFrame(),
      automated: typeof navigator !== 'undefined' && navigator.webdriver === true,
      forced,
      shownThisSession: wasShownThisSession(user.email, session()),
      seen: readSeen(user.email, local()),
      now: Date.now(),
      entries: WHATS_NEW,
    });
    if (!due.length) return;
    // Leaving the page before it settles (the cleanup) means it does not open on the next one unless that page allows it.
    const t = window.setTimeout(() => {
      if (openRef.current) return;
      markShownThisSession(user.email, session());
      setOpen({ entries: due, returnTo: document.activeElement as HTMLElement | null });
    }, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [user, pathname]);

  // On request: the account menu and /account.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const returnTo = ((e as CustomEvent).detail?.returnFocusTo as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
      void getCurrentUser().then((u) => {
        if (!u) return;
        const entries = entriesFor(WHATS_NEW, u.role);
        if (entries.length) setOpen({ entries, returnTo });
      });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    const was = openRef.current;
    if (!was) return;
    if (user) markSeen(was.entries.map((e) => e.id), user.email, local());
    setOpen(null);
    window.dispatchEvent(new Event(CHANGED_EVENT));
    // Back to where the reader was: the opener if it is still on the page, else (a menu item that has gone) the
    // account menu's button. Opened by itself over a page nothing had focus on, focus is left to the page.
    const from = was.returnTo && was.returnTo !== document.body ? was.returnTo : null;
    const target = from && !from.isConnected
      ? (document.querySelector('[data-account-menu] button') as HTMLElement | null)
      : from;
    window.setTimeout(() => target?.focus?.(), 0);
  }, [user]);

  if (!open) return null;
  return <WhatsNewDialog entries={open.entries} onClose={close} />;
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1900, background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  } as React.CSSProperties,
  dialog: {
    background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderTop: '3px solid var(--brand)',
    borderRadius: 8, width: 'min(640px, 100%)', maxHeight: 'min(90vh, 860px)', display: 'flex', flexDirection: 'column',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)', outline: 'none',
  } as React.CSSProperties,
  head: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px', borderBottom: '1px solid var(--c-line)' } as React.CSSProperties,
  title: { margin: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  count: { fontSize: 13, color: 'var(--c-dim)' } as React.CSSProperties,
  close: {
    marginLeft: 'auto', background: 'none', border: '1px solid var(--c-line)', color: 'var(--c-fg)', borderRadius: 4,
    width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: 'pointer', flexShrink: 0,
  } as React.CSSProperties,
  body: { overflowY: 'auto', overscrollBehavior: 'contain', padding: '6px 16px 12px' } as React.CSSProperties,
  item: { borderBottom: '1px solid var(--c-line)' } as React.CSSProperties,
  rowBtn: {
    width: '100%', display: 'flex', alignItems: 'baseline', gap: 10, background: 'none', border: 'none', color: 'var(--c-fg)',
    font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: '10px 2px',
  } as React.CSSProperties,
  entryTitle: { fontSize: 15, fontWeight: 700, margin: 0, minWidth: 0, overflowWrap: 'anywhere' } as React.CSSProperties,
  date: { fontSize: 12, color: 'var(--c-dim)', whiteSpace: 'nowrap', marginLeft: 'auto' } as React.CSSProperties,
  panel: { display: 'grid', gap: 12, padding: '0 2px 14px' } as React.CSSProperties,
  summary: { margin: 0, fontSize: 14, lineHeight: 1.55 } as React.CSSProperties,
  steps: { margin: 0, paddingLeft: 22, listStyle: 'decimal', display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.5 } as React.CSSProperties,
  media: {
    position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 6, overflow: 'hidden',
    border: '1px solid var(--c-line)', background: 'var(--c-deep)',
  } as React.CSSProperties,
  mediaFill: { display: 'block', width: '100%', height: '100%', objectFit: 'contain' } as React.CSSProperties,
  play: {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'var(--brand)',
    color: 'var(--on-brand)', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  } as React.CSSProperties,
  action: {
    justifySelf: 'start', background: 'none', border: '1px solid var(--brand)', color: 'var(--c-fg)', borderRadius: 4,
    padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
  } as React.CSSProperties,
  foot: { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '10px 16px 14px', borderTop: '1px solid var(--c-line)' } as React.CSSProperties,
  primary: {
    background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: 4, padding: '8px 18px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  } as React.CSSProperties,
};

const DATE_FMT = (() => {
  try { return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); } catch { return null; }
})();
function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return DATE_FMT ? DATE_FMT.format(d) : iso;
}

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function WhatsNewDialog({ entries, onClose }: { entries: WhatsNewEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const [expanded, setExpanded] = useState<string>(entries[0]?.id ?? '');
  const [reduced] = useState(prefersReducedMotion);
  const router = useRouter();
  const many = entries.length > 1;

  // Focus moves into the dialog (the dialog itself, so a screen reader reads its name first).
  useEffect(() => { ref.current?.focus(); }, []);

  // Modal: Escape closes from anywhere, and focus that wanders out (a click on the page, a script) comes back in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
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
    };
  }, [onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !ref.current) return;
    const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (els.length === 0) { e.preventDefault(); return; }
    const i = els.indexOf(document.activeElement as HTMLElement);
    const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === -1 || i === els.length - 1 ? 0 : i + 1);
    e.preventDefault();
    els[to].focus();
  }

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div style={S.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={S.dialog}
        data-testid="whats-new"
      >
        <div style={S.head}>
          <h2 id={titleId} style={S.title}>What&apos;s new</h2>
          {many && <span style={S.count}>{entries.length} updates</span>}
          <button type="button" style={S.close} onClick={onClose} aria-label="Close What's new" className="whats-new-focus">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div style={S.body}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {entries.map((entry, i) => {
              const isOpen = !many || expanded === entry.id;
              const panelId = `${uid}-panel-${i}`;
              const head = (
                <>
                  <span style={S.entryTitle}>{entry.title}</span>
                  <span style={S.date}>{formatDate(entry.date)}</span>
                  {many && <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--c-dim)' }}>{isOpen ? '▴' : '▾'}</span>}
                </>
              );
              return (
                <li key={entry.id} style={i === entries.length - 1 ? undefined : S.item} data-entry={entry.id}>
                  <h3 style={{ margin: 0, fontSize: 'inherit' }}>
                    {many ? (
                      <button
                        type="button"
                        style={S.rowBtn}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setExpanded(isOpen ? '' : entry.id)}
                        className="whats-new-focus"
                      >
                        {head}
                      </button>
                    ) : (
                      <div style={{ ...S.rowBtn, cursor: 'default' }}>{head}</div>
                    )}
                  </h3>
                  {isOpen && (
                    <div id={panelId} style={S.panel}>
                      <p style={S.summary}>{entry.summary}</p>
                      {entry.media && <Media media={entry.media} title={entry.title} reduced={reduced} />}
                      {entry.steps && entry.steps.length > 0 && (
                        <ol style={S.steps}>
                          {entry.steps.map((step) => <li key={step}>{step}</li>)}
                        </ol>
                      )}
                      {entry.action && (
                        <a
                          href={entry.action.href}
                          style={S.action}
                          className="whats-new-focus"
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // a new tab: leave it to the browser
                            e.preventDefault();
                            go(entry.action!.href);
                          }}
                        >
                          {entry.action.label}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div style={S.foot}>
          <button type="button" style={S.primary} onClick={onClose} className="whats-new-focus" data-testid="whats-new-done">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Media({ media, title, reduced }: { media: NonNullable<WhatsNewEntry['media']>; title: string; reduced: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(!reduced);

  if (!media.clip) {
    return (
      <div style={S.media}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export: no image optimiser */}
        <img src={media.poster} alt={media.alt} width={1280} height={720} style={S.mediaFill} />
      </div>
    );
  }
  return (
    <div style={S.media}>
      <video
        ref={videoRef}
        src={media.clip}
        poster={media.poster}
        width={1280}
        height={720}
        style={S.mediaFill}
        aria-label={media.alt}
        muted
        loop
        playsInline
        autoPlay={!reduced}
        controls={started}
        preload={reduced ? 'none' : 'metadata'}
        onPlay={() => setStarted(true)}
      />
      {!started && (
        // Reduced motion: nothing moves until the reader asks for it.
        <button
          type="button"
          style={S.play}
          className="whats-new-focus"
          aria-label={`Play the clip: ${title}`}
          onClick={() => {
            setStarted(true);
            void videoRef.current?.play().catch(() => { /* blocked: the controls are there now */ });
          }}
        >
          <span aria-hidden="true">▶</span> Play
        </button>
      )}
    </div>
  );
}
