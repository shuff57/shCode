'use client';

// "Guests" on the account page (migration 0059; functions/api/guests/*): a student invites an account holder to join the
// Code together sessions and game rooms THEY start. It makes a one-use code (or a link) to read out or send; the person
// uses it on /guest, and a teacher of the class you pick says yes or no BEFORE anything opens. You never type an email.
// A guest is not in your class: no grades, no class messages, no class library, and they cannot start sessions of their own.
// You and they can message each other, and a teacher of the class you pick can read it (migration 0060).
// Renders nothing for someone who is in no class and has no guests (a teacher, or a student with no class yet).

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';

interface Hosted {
  id: string; status: 'invited' | 'pending' | 'approved' | 'declined' | 'revoked'; className: string; relation: string;
  guest: string | null; code?: string; expiresAt?: number; endsAt: number | null; decidedAt: number | null;
}
interface Mine {
  hosted: Hosted[];
  classes: { id: string; name: string; guestsOff: boolean }[];
  canInvite: boolean;
  limits: { maxGuests: number; ttlDays: number };
}

const RELATION_MAX = 60;
const card = { maxWidth: 560, margin: '24px auto 0', background: 'var(--c-deep)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 24 } as const;
const small = { fontSize: 12, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;
const field = { fontSize: 13, padding: '6px 8px', borderRadius: 4, background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', minWidth: 0 } as const;

const date = (ms: number | null | undefined) => {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; }
};

function line(h: Hosted): { text: string; color: string } {
  switch (h.status) {
    case 'invited': return { text: `Code not used yet. It stops working ${date(h.expiresAt)}.`, color: 'var(--c-dim)' };
    case 'pending': return { text: 'Waiting for a teacher to say yes.', color: 'var(--c-orange)' };
    case 'approved': return { text: `Approved${h.endsAt ? ` until ${date(h.endsAt)}` : ''}. They can join your sessions.`, color: 'var(--c-green)' };
    case 'declined': return { text: 'A teacher said no.', color: 'var(--c-red)' };
    default: return { text: 'This access ended.', color: 'var(--c-dim)' };
  }
}

export default function GuestInvites() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [classId, setClassId] = useState('');
  const [relation, setRelation] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guests', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return;
      const b = (await res.json()) as Mine;
      setMine(b);
      setClassId((c) => (c && b.classes.some((x) => x.id === c) ? c : b.classes.find((x) => !x.guestsOff)?.id ?? b.classes[0]?.id ?? ''));
    } catch { /* offline: show nothing new */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function make(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || busy) return;
    setBusy(true);
    setNote(null);
    const res = await fetch('/api/guests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId, relation }) });
    setBusy(false);
    if (!res.ok) { setNote({ text: await errorText(res), bad: true }); return; }
    setRelation('');
    setNote({ text: 'Made a code. Send it, or the link, to the person you are inviting.', bad: false });
    await load();
  }

  async function end(h: Hosted) {
    const ok = h.status !== 'approved' || window.confirm(`End ${h.guest ?? 'this guest'}'s access? They will be taken out of any session they are in with you.`);
    if (!ok) return;
    const res = await fetch(`/api/guests/${h.id}`, { method: 'DELETE', credentials: 'same-origin' });
    if (!res.ok) { setNote({ text: await errorText(res), bad: true }); return; }
    setNote({ text: h.status === 'approved' ? 'Ended. They are out of your sessions.' : 'Cancelled.', bad: false });
    await load();
  }

  async function copy(h: Hosted, what: 'code' | 'link') {
    if (!h.code) return;
    const text = what === 'code' ? h.code : `${window.location.origin}/guest/?code=${h.code}`;
    try { await navigator.clipboard.writeText(text); setCopied(`${h.id}:${what}`); window.setTimeout(() => setCopied(null), 1500); } catch { /* the code is on screen to read out */ }
  }

  if (!mine || (!mine.canInvite && mine.hosted.length === 0)) return null;
  const live = mine.hosted.filter((h) => h.status === 'invited' || h.status === 'pending' || h.status === 'approved').length;
  const offAll = mine.classes.length > 0 && mine.classes.every((c) => c.guestsOff);

  return (
    <section id="guests" aria-labelledby="guests-h" style={card}>
      <h2 id="guests-h" style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--c-fg)' }}>Guests</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Invite someone with an account to join the coding sessions you start. A teacher says yes first. They are not in your class: no grades,
        no class messages, and they cannot start sessions of their own. You and they can message each other, and your teacher can read it.
      </p>

      {mine.canInvite && (
        <form onSubmit={make} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {mine.classes.length > 1 && (
            <label style={{ fontSize: 13, color: 'var(--c-fg)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              Which class vouches for them
              <select value={classId} onChange={(e) => setClassId(e.target.value)} style={field} data-testid="guest-class">
                {mine.classes.map((c) => <option key={c.id} value={c.id} disabled={c.guestsOff}>{c.name}{c.guestsOff ? ' (guests are off)' : ''}</option>)}
              </select>
            </label>
          )}
          <label style={{ fontSize: 13, color: 'var(--c-fg)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            Who is this? <span style={{ color: 'var(--c-dim)', fontSize: 12 }}>Your teacher reads it. Words only, like &ldquo;my cousin&rdquo; (no phone or email).</span>
            <input value={relation} maxLength={RELATION_MAX} onChange={(e) => setRelation(e.target.value)} placeholder="my cousin" style={field} data-testid="guest-relation" />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={busy || offAll || live >= mine.limits.maxGuests || !classId} data-testid="guest-make">
              {busy ? 'Making…' : 'Make a guest code'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>{live} of {mine.limits.maxGuests} guests</span>
          </div>
        </form>
      )}

      {note && <p role={note.bad ? 'alert' : 'status'} style={{ margin: '0 0 10px', fontSize: 13, color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{note.text}</p>}

      {mine.hosted.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mine.hosted.map((h) => {
            const st = line(h);
            const active = h.status === 'invited' || h.status === 'pending' || h.status === 'approved';
            return (
              <li key={h.id} data-testid="guest-hosted" style={{ border: '1px solid var(--c-line)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 13, color: 'var(--c-fg)' }}>
                  <strong>{h.guest ?? (h.relation || 'A guest')}</strong>
                  {h.guest && h.relation && <span style={{ color: 'var(--c-dim)' }}> · {h.relation}</span>}
                  <span style={{ color: 'var(--c-dim)' }}> · {h.className}</span>
                </div>
                <div style={{ fontSize: 12, color: st.color, marginTop: 2 }}>{st.text}</div>
                {h.status === 'invited' && h.code && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    <code data-testid="guest-code-shown" style={{ fontSize: 18, letterSpacing: '0.15em', color: 'var(--c-fg)' }}>{h.code}</code>
                    <button type="button" style={small} onClick={() => void copy(h, 'code')}>{copied === `${h.id}:code` ? 'Copied' : 'Copy code'}</button>
                    <button type="button" style={small} onClick={() => void copy(h, 'link')}>{copied === `${h.id}:link` ? 'Copied' : 'Copy link'}</button>
                  </div>
                )}
                {active && (
                  <button type="button" style={{ ...small, marginTop: 6, color: h.status === 'approved' ? 'var(--c-red)' : 'var(--c-cyan)' }} onClick={() => void end(h)} data-testid="guest-end">
                    {h.status === 'approved' ? 'End their access' : 'Cancel'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
