'use client';

// "Guests" on the class page (Students tab; migration 0059): students of this class asked to bring an account holder into
// the sessions THEY start, and nothing opens until you say yes. GET|POST /api/classes/[id]/guests; rules in
// functions/_shared/guests.ts.
//
// Anyone with an account can be asked for, and signup does not verify email, so this list shows what you decide on: the
// address, whether it is a student or teacher account, how old the account is, and the student's own words for who this is.
// Approve lasts until the school year's cutoff; Decline is a no that stands (the pair cannot use another code); End stops
// an approved guest AND takes them out of any session they are in at once. The switch turns guests off for the whole class.

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';
import { useFeedback } from './FeedbackProvider';

interface Row {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'revoked';
  host: string;
  guest: { name: string; email: string | null; role: string | null; accountSince: number | null };
  relation: string;
  askedAt: number | null;
  decidedAt: number | null;
  endsAt: number | null;
  endedBy: 'teacher' | 'host' | 'guest' | null;
}

const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;
const date = (ms: number | null) => {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; }
};

export default function ClassGuests({ classId }: { classId: string }) {
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [off, setOff] = useState(false);
  const [unused, setUnused] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = `/api/classes/${encodeURIComponent(classId)}/guests`;
  const apply = (b: { guests: Row[]; guestsOff: boolean; unusedCodes: number }) => { setRows(b.guests); setOff(b.guestsOff); setUnused(b.unusedCodes); };
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin' });
    if (res.status === 404) { setError(null); setRows([]); return; }
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    apply(await res.json());
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    const res = await fetch(base, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    apply(await res.json());
    toast(done);
  };

  const decide = async (r: Row, action: 'approve' | 'decline' | 'revoke') => {
    if (action === 'decline' && !(await confirm({
      title: `Say no to ${r.guest.name || r.guest.email}?`,
      message: `${r.host} will be told. This person cannot be invited by ${r.host} again with another code.`,
      confirmLabel: 'Say no', danger: true,
    }))) return;
    if (action === 'revoke' && !(await confirm({
      title: `End ${r.guest.name || r.guest.email}'s access?`,
      message: `They are taken out of any session they are in with ${r.host} right now, and cannot join another or send ${r.host} messages. You can still read what was said.`,
      confirmLabel: 'End access', danger: true,
    }))) return;
    await post({ action, id: r.id }, action === 'approve' ? `Approved. ${r.guest.name || 'They'} can join ${r.host}'s sessions until the end of the school year.` : action === 'decline' ? 'Said no.' : 'Ended. They are out of the sessions.');
  };

  const classSwitch = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
      <input type="checkbox" checked={!off} disabled={busy} data-testid="guest-class-switch" onChange={(e) => void post(
        { action: e.target.checked ? 'class-on' : 'class-off' },
        e.target.checked ? 'Students in this class can invite guests again, and approved guests can join again.' : 'Guests are off for this class: no new invites, and every approved guest is shut out until you turn it back on.',
      )} />
      Let students in this class invite guests
    </label>
  );

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const ended = rows.filter((r) => r.status === 'declined' || r.status === 'revoked');

  const who = (r: Row) => (
    <div style={{ fontSize: 13, minWidth: 220, flex: '1 1 260px' }}>
      <strong>{r.guest.name || r.guest.email}</strong>{' '}
      <span style={{ color: 'var(--c-dim)' }}>
        {r.guest.name ? `${r.guest.email} · ` : ''}{r.guest.role ?? 'account'} account{r.guest.accountSince ? `, made ${date(r.guest.accountSince)}` : ''}
      </span>
      <div style={{ color: 'var(--c-meta)', fontSize: 12 }}>
        Invited by <strong>{r.host}</strong>{r.relation ? <> · &ldquo;{r.relation}&rdquo;</> : null}
      </div>
    </div>
  );

  return (
    <div id="guests" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5 }}>
        A student can ask to bring someone with an account into the coding sessions <em>they</em> start. Nothing opens until you say yes. They are not
        in your class: no roster, no grades, no class messages, and they cannot start sessions. They can message the student who invited them, and
        you can read that conversation (it is in Messages below, marked guest). Signup does not check email, so go by the address and the
        student&apos;s own words.
      </p>
      {classSwitch}
      {!pending.length && !approved.length && !ended.length && (
        <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>
          No guests yet.{unused ? ` ${unused} invite code${unused === 1 ? ' is' : 's are'} out and not used.` : ''}
        </p>
      )}

      {pending.length > 0 && <h3 style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-orange)' }}>Waiting for you ({pending.length})</h3>}
      {pending.map((r) => (
        <div key={r.id} data-testid="guest-pending" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 8px', border: '1px solid color-mix(in srgb, var(--c-orange) 45%, transparent)', borderRadius: 6 }}>
          {who(r)}
          <span style={{ flex: 1 }} />
          <button type="button" style={{ ...btn, color: 'var(--c-bg)', background: 'var(--c-green)', border: '1px solid var(--c-green)', fontWeight: 600 }} disabled={busy} data-testid="guest-approve" onClick={() => void decide(r, 'approve')}>Approve</button>
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy} data-testid="guest-decline" onClick={() => void decide(r, 'decline')}>Say no…</button>
        </div>
      ))}

      {approved.length > 0 && <h3 style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-green)' }}>Approved ({approved.length})</h3>}
      {approved.map((r) => (
        <div key={r.id} data-testid="guest-approved" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {who(r)}
          <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>until {date(r.endsAt)}</span>
          <span style={{ flex: 1 }} />
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy} data-testid="guest-revoke" onClick={() => void decide(r, 'revoke')}>End access…</button>
        </div>
      ))}

      {ended.length > 0 && <h3 style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-dim)' }}>Recently ended</h3>}
      {ended.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: 0.75 }}>
          {who(r)}
          <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>
            {r.status === 'declined' ? 'you said no' : r.endedBy === 'teacher' ? 'you ended it' : `${r.endedBy === 'host' ? 'the student' : 'the guest'} ended it`} · {date(r.decidedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
