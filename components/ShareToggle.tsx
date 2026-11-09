'use client';

// "Share with class" on one of the student's own saved textures or sounds.
// Sharing is opt-in, per item, and puts it in the class library of every class
// the student is in (functions/api/library/[id]/share.ts). Hidden while signed
// out; disabled until the item has synced to the account.
//
// The button opens a small chooser (ShareChoicePicker): who may do what with it
// (lib/share-choice.ts), defaulting to the student's last choice, or locked to
// "keep remixes open" when it is a copy of an item that asked for that. Shared
// already, the same popover changes the choice or stops sharing.

import { useEffect, useId, useRef, useState } from 'react';
import {
  LIBRARY_SHARES_CHANGED,
  LIBRARY_SYNC_STATUS,
  accountItem,
  remixCredit,
  setShared,
  signedInForSync,
} from '../lib/library-sync';
import type { LibraryKind } from '../lib/moshion-storage';
import { CHOICE_TEXT, type ShareChoice } from '../lib/share-choice';
import ShareChoicePicker, { lockedChoice, useLastChoice } from './ShareChoicePicker';

const action: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};

export default function ShareToggle({ kind, name, onMessage, compact = false }: {
  kind: LibraryKind;
  name: string;
  onMessage?: (text: string, bad: boolean) => void;
  compact?: boolean;
}) {
  const [, bump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [last, remember] = useLastChoice('art');
  const [choice, setChoice] = useState<ShareChoice>(last);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const uid = useId().replace(/:/g, '');
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener(LIBRARY_SYNC_STATUS, on);
    window.addEventListener(LIBRARY_SHARES_CHANGED, on);
    return () => {
      window.removeEventListener(LIBRARY_SYNC_STATUS, on);
      window.removeEventListener(LIBRARY_SHARES_CHANGED, on);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open]);
  if (!signedInForSync()) return null;
  const item = accountItem(kind, name);
  const shared = !!item?.shared;
  const from = remixCredit(kind, name);
  const label = shared ? (compact ? 'shared ✓' : 'Shared with class ✓') : (compact ? 'share' : 'Share with class');

  const openPicker = () => {
    // Shared: show its own choice. Not yet: the student's last one. A copy of a
    // "keep remixes open" item shows that one either way.
    setChoice(lockedChoice(from, shared && item ? item.choice : last));
    setOpen((o) => !o);
  };

  async function apply(share: boolean) {
    setBusy(true);
    const err = await setShared(kind, name, share, share ? choice : undefined);
    setBusy(false);
    if (!err) {
      setOpen(false);
      if (share) remember(choice);
    }
    onMessage?.(
      err ?? (!share
        ? `"${name}" is no longer shared with your class.`
        : `"${name}" is shared with your class: ${CHOICE_TEXT.art[choice].short}.`
          + (choice === 'play' ? ' They see it in your games but can\'t copy it.' : ' They can copy it from the Library.')),
      !!err,
    );
  }

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        disabled={!item || busy}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={!item ? 'Syncing to your account first…' : shared ? `In your class's Library (${CHOICE_TEXT.art[item.choice].short}). Click to change or stop sharing.` : 'Put this in your class' + "'" + 's Library.'}
        onClick={openPicker}
        style={compact
          ? { fontSize: 10, background: 'none', border: 'none', padding: 0, cursor: item ? 'pointer' : 'default', color: shared ? 'var(--c-green)' : 'var(--c-cyan)' }
          : {
            fontSize: 12, padding: '4px 8px', borderRadius: 4, cursor: item ? 'pointer' : 'default', whiteSpace: 'nowrap',
            background: shared ? 'color-mix(in srgb, var(--c-green) 13.3333%, transparent)' : 'transparent', color: shared ? 'var(--c-green)' : 'var(--c-cyan)',
            border: `1px solid ${shared ? 'color-mix(in srgb, var(--c-green) 53.3333%, transparent)' : 'var(--c-line)'}`,
          }}
      >
        {label}
      </button>
      {open && item && (
        <div
          role="dialog"
          aria-label={`Share ${name} with your class`}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60, width: 'min(320px, calc(100vw - 32px))',
            background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'var(--c-fg)', fontSize: 12, lineHeight: 1.45, textAlign: 'left',
          }}
        >
          <ShareChoicePicker thing="art" value={choice} onChange={setChoice} from={from} idPrefix={`share-${uid}`} compact />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy} onClick={() => void apply(true)}
              style={{ ...action, background: 'var(--c-green)', color: 'var(--c-deep)', border: '1px solid var(--c-green)', fontWeight: 600 }}>
              {busy ? 'Saving…' : shared ? 'Save' : 'Share with my class'}
            </button>
            {shared && (
              <button type="button" disabled={busy} onClick={() => void apply(false)} style={action}>Stop sharing</button>
            )}
            <button type="button" onClick={() => setOpen(false)} style={action}>Cancel</button>
          </div>
        </div>
      )}
    </span>
  );
}
