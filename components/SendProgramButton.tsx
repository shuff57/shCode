'use client';

// "Send to..." in the sandbox's Share menu (migration 0054): send this program to a classmate or a
// teacher as a message. Two kinds:
//   - a copy of it as it is now: the card opens /shared, where it runs and can be remixed but not edited;
//   - while in a Code together session, an invitation to that session: the card's Join opens the
//     sandbox with the session's code ready (the session's own rules still decide who gets in);
//   - while in a session, an invitation to WATCH it live: the card opens /shared, read-only, and the
//     people coding see the watcher's name (functions/_shared/live.ts mayWatch).
// The message rules are the mailbox's (lib/messages-core.ts): classmates and teachers of a class you
// are in, the teacher's switch and pause, personal details refused (in the code as well). An optional
// note goes with it. The server checks all of it again.

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import {
  GROUP_NOTE, LANG_LABEL, MESSAGE_MAX, WATCHED_NOTE, blockText, channelNote, cleanMessage, cleanShareCode,
  type PeopleClass, type ShareLang, type ThreadSummary,
} from '../lib/messages-core';
import { fetchPeople, fetchThreads, sendNew, sendReply, type OutgoingShare } from '../lib/messages-client';

export interface SendProgramButtonProps {
  lang: ShareLang;
  chipStyle: React.CSSProperties;
  /** The editor's code now. */
  getCode: () => string;
  /** The open project's name. */
  title: string;
  /** The Code together session this tab is in, or null. */
  session: string | null;
}

const field: React.CSSProperties = {
  fontSize: 13, padding: '4px 6px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};

export default function SendProgramButton({ lang, chipStyle, getCode, title, session }: SendProgramButtonProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<PeopleClass[] | null>(null);
  // Groups and channels (migration 0055) are places to send to as well; an invitation goes to people only.
  const [places, setPlaces] = useState<ThreadSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<'copy' | 'together' | 'watch'>('copy');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  // A session started or ended while the panel was closed: offer what is possible now.
  useEffect(() => { if (!session) setKind('copy'); else if (open) setKind('together'); }, [session, open]);

  useEffect(() => {
    if (!open || classes) return;
    void fetchPeople().then((r) => {
      if (!r.ok) { setLoadError(r.error); return; }
      setClasses(r.value);
      if (r.value.length) setClassId(r.value[0].id);
    });
    void fetchThreads().then((r) => { if (r.ok) setPlaces(r.value.filter((t) => t.kind === 'group' || t.kind === 'channel')); });
  }, [open, classes]);

  const cls = classes?.find((c) => c.id === classId) ?? null;
  const people = useMemo(() => cls?.people ?? [], [cls]);
  const person = people.find((p) => p.key === to) ?? null;
  const here = useMemo(() => places.filter((t) => t.classId === classId), [places, classId]);
  const place = to.startsWith('t:') ? here.find((t) => `t:${t.id}` === to) ?? null : null;
  const target = person ?? place;
  // An invitation is for people: not a whole channel.
  useEffect(() => { if (place?.kind === 'channel' && kind !== 'copy') setKind('copy'); }, [place, kind]);

  const send = async () => {
    if (busy || !cls || !target) return;
    setError(null);
    let share: OutgoingShare;
    if (kind === 'together' || kind === 'watch') {
      if (!session) { setError('You are not in a Code together session any more. Send a copy instead.'); return; }
      share = { kind, lang, title, room: session };
    } else {
      const c = cleanShareCode(getCode());
      if ('error' in c) { setError(c.error); return; }
      share = { kind: 'copy', lang, title, code: c.code };
    }
    let body = '';
    if (note.trim()) {
      const c = cleanMessage(note);
      if ('error' in c) { setError(c.error); return; }
      body = c.body;
    }
    setBusy(true);
    const r = person ? await sendNew(cls.id, person.key, body, share) : await sendReply(place!.id, body, share);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    const name = person ? person.name : place!.kind === 'channel' ? `#${place!.title}` : place!.title;
    setSent(`Sent to ${name}${name.endsWith('.') ? '' : '.'} It is in your messages too (the envelope at the top).`);
    setNote('');
    setTo('');
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" style={chipStyle} aria-expanded={open} aria-haspopup="dialog" data-testid="send-program"
        title="Send this program to a classmate or your teacher in a message"
        onClick={() => { setOpen((o) => !o); setSent(null); setError(null); }}>
        <Send size={12} aria-hidden="true" />
        Send to…
      </button>
      {open && (
        <div role="dialog" aria-label="Send this program" data-testid="send-program-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 'min(360px, calc(100vw - 32px))',
            background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'var(--c-fg)', fontSize: 13, lineHeight: 1.5,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Send this program</h2>
          {loadError && <p role="alert" style={{ margin: 0, color: 'var(--c-red)' }}>{loadError}</p>}
          {!classes && !loadError && <p style={{ margin: 0, color: 'var(--c-dim)' }}>Loading…</p>}
          {classes && !classes.length && <p style={{ margin: 0, color: 'var(--c-dim)' }}>You are not in a class yet. Once you are, you can send programs to the people in it.</p>}
          {cls && (
            <>
              <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <legend style={{ fontSize: 12, color: 'var(--c-meta)', marginBottom: 2 }}>Send</legend>
                <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="send-kind" checked={kind === 'copy'} onChange={() => setKind('copy')} data-testid="send-kind-copy" />
                  <span>A copy of it as it is now. They can run it and remix it, but not change yours.</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: session ? 'pointer' : 'default', color: session ? 'var(--c-fg)' : 'var(--c-dim)' }}>
                  <input type="radio" name="send-kind" checked={kind === 'together'} disabled={!session || place?.kind === 'channel'} onChange={() => setKind('together')} data-testid="send-kind-together" />
                  <span>
                    An invitation to your Code together session, to write it with you.
                    {!session && ' Start Code together first to invite someone.'}
                  </span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: session ? 'pointer' : 'default', color: session ? 'var(--c-fg)' : 'var(--c-dim)' }}>
                  <input type="radio" name="send-kind" checked={kind === 'watch'} disabled={!session || place?.kind === 'channel'} onChange={() => setKind('watch')} data-testid="send-kind-watch" />
                  <span>An invitation to watch your session live, as you type. They cannot change it.</span>
                </label>
              </fieldset>
              {classes!.length > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-meta)' }}>
                  Class
                  <select value={classId} onChange={(e) => { setClassId(e.target.value); setTo(''); }} style={field}>
                    {classes!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-meta)' }}>
                To
                <select value={to} onChange={(e) => { setTo(e.target.value); setSent(null); }} style={{ ...field, flex: 1, minWidth: 0 }} data-testid="send-program-to">
                  <option value="">Choose a person, group or channel…</option>
                  <optgroup label="People">
                    {people.map((p) => <option key={p.key} value={p.key}>{p.name}{p.teacher && p.name !== 'Teacher' ? ' (teacher)' : ''}</option>)}
                  </optgroup>
                  {here.some((t) => t.kind === 'group') && (
                    <optgroup label="Groups">
                      {here.filter((t) => t.kind === 'group').map((t) => <option key={t.id} value={`t:${t.id}`}>{t.title}</option>)}
                    </optgroup>
                  )}
                  {here.some((t) => t.kind === 'channel') && (
                    <optgroup label="Channels">
                      {here.filter((t) => t.kind === 'channel').map((t) => <option key={t.id} value={`t:${t.id}`}>#{t.title}{t.locked ? ' (teachers only)' : ''}</option>)}
                    </optgroup>
                  )}
                </select>
              </label>
              {cls.classmatesBlocked && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>{blockText(cls.classmatesBlocked, '', cls.name)}</p>}
              {person && !person.teacher && !cls.teaches && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>{WATCHED_NOTE}</p>}
              {place && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>{place.kind === 'channel' ? channelNote(cls.name) : GROUP_NOTE}</p>}
              {place?.kind === 'channel' && session && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>An invitation goes to people or a group, not a whole channel.</p>}
              <label htmlFor="send-program-note" className="sr-only">A note with it (you can leave it empty)</label>
              <textarea id="send-program-note" value={note} rows={2} maxLength={MESSAGE_MAX + 50}
                placeholder="A note with it (you can leave it empty)"
                onChange={(e) => { setNote(e.target.value); if (error) setError(null); }}
                style={{ ...field, resize: 'vertical', minHeight: 40, fontFamily: 'inherit', lineHeight: 1.45 }} />
              {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--c-red)' }}>{error}</p>}
              {sent && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--c-green)' }}>{sent}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ ...chipStyle }}>Close</button>
                <button type="button" onClick={() => void send()} disabled={busy || !target} data-testid="send-program-send"
                  style={{
                    ...chipStyle, fontWeight: 600, border: '1px solid transparent',
                    background: busy || !target ? 'var(--c-deep)' : 'var(--brand)',
                    color: busy || !target ? 'var(--c-dim)' : 'var(--on-brand)', cursor: busy || !target ? 'default' : 'pointer',
                  }}>
                  {busy ? 'Sending…' : `Send ${kind === 'copy' ? `${LANG_LABEL[lang]} copy` : 'invitation'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
