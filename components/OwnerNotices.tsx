'use client';

// Mounted once in the root layout. Plain-words notices about work kept on this
// computer (lib/owned-storage.ts), the X-Work-Owner header on page requests, and the
// check that a page which loaded signed out is not signed in (lib/owner-guard.ts).
//
//  * Someone else signed in on this computer after this page opened (the server
//    refused a request with 409 owner-mismatch, or the tab came back into view and
//    the owner cookie names someone else). Nothing from this page reached their
//    account, and this page's work stays on this computer under its own owner.
//  * This computer's storage is full, so the latest change was not kept here. The
//    earlier copy is untouched.
//  * This browser is not letting the page save here at all (storage turned off, or a
//    write refused for another reason). Shown once per page; Save to cloud still works.
//
// No notice blocks anything or waits for anything.

import { useEffect, useState, type CSSProperties } from 'react';
import { installOwnerFetch, onOwnerMismatch } from '../lib/owner-fetch';
import { GUEST, lastStorageProblem, onStorageProblem, pageOwner, readOwnerCookie } from '../lib/owned-storage';
import { guardSignedInGuest } from '../lib/owner-guard';
import { getCurrentUser } from '../lib/auth';

export const BLOCKED_TEXT =
  'This browser is not letting the page save your work on this computer. Keep this tab open and use Save to send it to your account.';

export const STUCK_TEXT =
  'You are signed in, but this page opened as "not signed in". What you type here is kept on this computer as "not signed in" '
  + 'and is not sent to your account. Reload the page to use your account.';

// Runs when the layout's client chunk is evaluated, before any page effect fetches.
if (typeof window !== 'undefined') installOwnerFetch();

function changedText(): string {
  const mine = pageOwner();
  const now = readOwnerCookie();
  if (mine === GUEST) {
    return 'Someone signed in on this computer after this page opened. Nothing from this page was sent to their account. '
      + 'What you typed here is kept on this computer as "not signed in". Reload the page to keep going.';
  }
  if (now === GUEST) {
    return 'You signed out in another tab. Your work on this page is kept on this computer under your own account. '
      + 'Sign in again as yourself to save or hand it in.';
  }
  return 'Someone else is signed in on this computer now. Nothing from this page was sent to their account. '
    + 'Your work on this page is kept on this computer under your own account. Sign in again as yourself to save or hand it in.';
}

const box: CSSProperties = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 16,
  zIndex: 2000,
  maxWidth: 640,
  margin: '0 auto',
  padding: '12px 14px',
  borderRadius: 8,
  background: 'var(--card)',
  color: 'var(--text)',
  border: '1px solid var(--c-orange)',
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
  fontFamily: 'var(--font-prose)',
  fontSize: 14,
  lineHeight: 1.45,
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};
const btn: CSSProperties = {
  background: 'var(--brand)',
  color: 'var(--on-brand)',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-prose)',
  cursor: 'pointer',
};
const quiet: CSSProperties = {
  ...btn,
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
};

export default function OwnerNotices() {
  const [changed, setChanged] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  // 'blocked' is shown once per page: 'no' -> 'shown' -> 'done' (hidden for good).
  const [blocked, setBlocked] = useState<'no' | 'shown' | 'done'>('no');

  useEffect(() => {
    const show = () => setChanged(changedText());
    const offMismatch = onOwnerMismatch(show);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && readOwnerCookie() !== pageOwner()) show();
    };
    document.addEventListener('visibilitychange', onVisible);
    const offFull = onStorageProblem((p) => {
      if (p.kind === 'full') setFull(true);
      else setBlocked((b) => (b === 'no' ? 'shown' : b));
    });
    // A write refused before this mounted (the adapter reports a blocked store once).
    const early = lastStorageProblem();
    if (early?.kind === 'blocked') setBlocked((b) => (b === 'no' ? 'shown' : b));
    else if (early?.kind === 'full') setFull(true);
    let session: Storage | null = null;
    try { session = window.sessionStorage; } catch { session = null; }
    void guardSignedInGuest({ me: getCurrentUser, reload: () => window.location.reload(), session })
      // Signed in, but this page stays "not signed in" (it could not reload itself): say so now,
      // not only when a later request is refused. With a failed save on the page the storage
      // notice stays instead: a reload there could drop an edit that is in memory only.
      .then((r) => { if (r === 'stuck' && !lastStorageProblem()) setChanged(STUCK_TEXT); });
    return () => {
      offMismatch();
      offFull();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!changed && !full && blocked !== 'shown') return null;
  return (
    <>
      {changed && (
        <div role="alert" data-owner-notice="changed" style={box}>
          <span style={{ flex: '1 1 260px' }}>{changed}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={btn} onClick={() => window.location.reload()}>Reload page</button>
            <button type="button" style={quiet} onClick={() => setChanged(null)}>Hide</button>
          </span>
        </div>
      )}
      {blocked === 'shown' && !changed && (
        <div role="status" data-owner-notice="blocked" style={box}>
          <span style={{ flex: '1 1 260px' }}>{BLOCKED_TEXT}</span>
          <button type="button" style={quiet} onClick={() => setBlocked('done')}>OK</button>
        </div>
      )}
      {full && !changed && blocked !== 'shown' && (
        <div role="status" data-owner-notice="full" style={box}>
          <span style={{ flex: '1 1 260px' }}>
            This computer is out of space, so your latest change was not kept on it. Your earlier work here is safe.
            Press Save to keep this change in your account.
          </span>
          <button type="button" style={quiet} onClick={() => setFull(false)}>OK</button>
        </div>
      )}
    </>
  );
}
