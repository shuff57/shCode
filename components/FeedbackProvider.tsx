'use client';

// One place for the two things every teacher action needs and used to improvise:
//
//   toast()    -- a short message that says what just happened (saved, failed, undone). Polite live region for
//                 success, assertive for errors, so a screen reader hears it. Optionally carries an Undo.
//   confirm()  -- a styled, keyboard-safe replacement for window.confirm / window.prompt. Resolves true or false.
//                 `requireText` makes the confirm button wait for the person to type that exact text (deleting a class).
//
// The native dialogs were replaced because they cannot be styled, cannot name what will be lost in more than a
// line, block the whole tab, and are skipped silently by some browsers and embedded views (which reads as "yes").
// A confirm that is never shown must read as NO, never as yes: if no provider is mounted, confirm() falls back to
// window.confirm, and if even that is unavailable it resolves false.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  kind?: ToastKind;
  /** Milliseconds on screen. Errors stay longer; 0 keeps it until dismissed. */
  ms?: number;
  /** A button on the toast, e.g. Undo. Clicking it dismisses the toast. */
  action?: { label: string; onClick: () => void };
}

export interface ConfirmOptions {
  title: string;
  /** Plain words: what happens, what is kept, what is lost. Newlines become paragraphs. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, and focus starts on Cancel. */
  danger?: boolean;
  /** The confirm button stays off until this exact text is typed (trimmed). */
  requireText?: string;
}

interface Feedback {
  toast: (message: string, options?: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<Feedback | null>(null);

/** The hook. Safe outside a provider: toast is a no-op and confirm falls back to the native dialog. */
export function useFeedback(): Feedback {
  const v = useContext(Ctx);
  if (v) return v;
  return {
    toast: () => undefined,
    confirm: async (o) => (typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(`${o.title}\n\n${o.message}`) : false),
  };
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const C = { bg: '#282a36', card: '#1e1f29', border: '#44475a', text: '#f8f8f2', dim: '#a9b7e0', ok: '#50fa7b', err: '#ff5555', info: '#8be9fd', accent: '#bd93f9' };

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [dialog, setDialog] = useState<null | { options: ConfirmOptions; resolve: (v: boolean) => void }>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    const kind = options.kind ?? 'success';
    const ms = options.ms ?? (kind === 'error' ? 9000 : options.action ? 9000 : 4500);
    setToasts((t) => [...t.slice(-3), { ...options, kind, id, message }]);
    if (ms > 0) window.setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => {
      // One dialog at a time: a second request while one is open answers the first with "no".
      setDialog((prev) => {
        prev?.resolve(false);
        return { options, resolve };
      });
    }),
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {dialog && (
        <ConfirmDialog
          options={dialog.options}
          onAnswer={(v) => {
            dialog.resolve(v);
            setDialog(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      style={{ position: 'fixed', left: 0, right: 0, bottom: 16, zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 16px' }}
    >
      {toasts.map((t) => {
        const color = t.kind === 'error' ? C.err : t.kind === 'info' ? C.info : C.ok;
        return (
          <div
            key={t.id}
            // Errors interrupt (assertive); everything else waits its turn (polite).
            role={t.kind === 'error' ? 'alert' : 'status'}
            style={{ pointerEvents: 'auto', background: C.card, color: C.text, border: `1px solid ${color}`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: '10px 14px', fontSize: 13, maxWidth: 560, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          >
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
                style={{ background: 'none', border: `1px solid ${color}`, color, borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
              style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({ options, onAnswer }: { options: ConfirmOptions; onAnswer: (v: boolean) => void }) {
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, requireText } = options;
  const [typed, setTyped] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const ready = requireText === undefined || typed.trim() === requireText;

  // Focus lands on the SAFE choice (Cancel), or on the text box when one is required. Focus goes back to the
  // control that opened the dialog when it closes, so a keyboard user is not dropped at the top of the page.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    (requireText !== undefined ? inputRef.current : danger ? cancelRef.current : confirmRef.current)?.focus();
    return () => before?.focus?.();
  }, [requireText, danger]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onAnswer(false);
    }
    // Keep Tab inside the dialog: it is modal, so the page behind must not take focus.
    if (e.key === 'Tab') {
      const els = ([inputRef.current, cancelRef.current, confirmRef.current] as Array<HTMLElement | null>).filter((x): x is HTMLElement => !!x && !(x as HTMLButtonElement).disabled);
      if (els.length === 0) return;
      const i = els.indexOf(document.activeElement as HTMLElement);
      const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === els.length - 1 ? 0 : i + 1);
      e.preventDefault();
      els[to].focus();
    }
  }

  const accent = danger ? C.err : C.accent;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onAnswer(false); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        aria-describedby="fb-msg"
        onKeyDown={onKeyDown}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderTop: `3px solid ${accent}`, borderRadius: 8, padding: 20, width: 'min(480px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 id="fb-title" style={{ margin: '0 0 10px 0', fontSize: 17 }}>{title}</h2>
        <div id="fb-msg" style={{ fontSize: 14, lineHeight: 1.55, color: C.text }}>
          {message.split('\n').filter((l) => l.trim() !== '').map((l, i) => (
            <p key={i} style={{ margin: '0 0 8px 0' }}>{l}</p>
          ))}
        </div>
        {requireText !== undefined && (
          <label style={{ display: 'block', marginTop: 8, fontSize: 13, color: C.dim }}>
            Type <strong style={{ color: C.text }}>{requireText}</strong> to confirm
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ready) onAnswer(true); }}
              autoComplete="off"
              spellCheck={false}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 14 }}
            />
          </label>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onAnswer(false)}
            style={{ background: 'none', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={!ready}
            onClick={() => onAnswer(true)}
            style={{ background: ready ? accent : C.border, color: danger && ready ? C.text : '#282a36', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed', opacity: ready ? 1 : 0.6 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
