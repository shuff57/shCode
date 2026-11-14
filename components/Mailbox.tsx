'use client';

// The Messages tab of the mailbox in the header (migration 0053): the person's conversations, one
// conversation, and "New message". A student writes to their teacher and to classmates; a teacher
// writes to their students. Every message is checked for personal details before it goes (the same
// check runs again on the server). Above a conversation between two students: "Your teacher can read
// messages between classmates." Calls: lib/messages-client.ts. Rules and words: lib/messages-core.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, PenSquare } from 'lucide-react';
import {
  MESSAGE_MAX, THREAD_POLL_MS, WATCHED_NOTE, blockText, cleanMessage,
  type PeopleClass, type ThreadSummary, type ThreadView,
} from '../lib/messages-core';
import { fetchPeople, fetchThread, fetchThreads, sendNew, sendReply } from '../lib/messages-client';
import ShareCardView from './ShareCardView';

type View = { kind: 'list' } | { kind: 'thread'; id: string } | { kind: 'new' };

function when(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)} d ago`;
  return new Date(ms).toLocaleDateString();
}

function clock(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const small = {
  fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'transparent', cursor: 'pointer',
  border: '1px solid var(--c-line)', color: 'var(--c-cyan)',
} as const;

const TeacherTag = ({ name }: { name?: string }) => (name === 'Teacher' ? null : (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', marginLeft: 6, borderRadius: 3, color: 'var(--c-purple)', border: '1px solid var(--c-purple)', verticalAlign: 1 }}>
    Teacher
  </span>
));

function Composer({ onSend, disabled, placeholder, autoFocus }: {
  onSend: (text: string) => Promise<string | null>; disabled?: boolean; placeholder: string; autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const length = [...text].length;

  const send = async () => {
    if (busy) return;
    const c = cleanMessage(text);
    if ('error' in c) { setError(c.error); return; }
    setBusy(true);
    setError(null);
    const err = await onSend(c.body);
    setBusy(false);
    if (err) setError(err);
    else setText('');
  };

  return (
    <div style={{ borderTop: '1px solid var(--c-line)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--c-red)' }}>{error}</p>}
      <label htmlFor="mailbox-compose" className="sr-only">Message</label>
      <textarea id="mailbox-compose" value={text} disabled={disabled || busy} autoFocus={autoFocus}
        onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
        placeholder={placeholder} rows={2} data-testid="mailbox-compose"
        style={{
          resize: 'vertical', minHeight: 44, maxHeight: 160, fontSize: 13, lineHeight: 1.45, padding: '6px 8px', borderRadius: 4,
          background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', fontFamily: 'inherit',
        }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: length > MESSAGE_MAX ? 'var(--c-red)' : 'var(--c-dim)', flex: 1 }}>
          {length > MESSAGE_MAX - 200 ? `${length} / ${MESSAGE_MAX}` : 'Enter sends · Shift+Enter for a new line'}
        </span>
        <button type="button" onClick={() => void send()} disabled={disabled || busy || !text.trim()} data-testid="mailbox-send"
          style={{
            fontSize: 13, padding: '5px 14px', borderRadius: 4, border: 'none', fontWeight: 600,
            background: disabled || busy || !text.trim() ? 'var(--c-deep2)' : 'var(--brand)',
            color: disabled || busy || !text.trim() ? 'var(--c-dim)' : 'var(--on-brand)',
            cursor: disabled || busy || !text.trim() ? 'default' : 'pointer',
          }}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function ThreadPane({ id, onBack }: { id: string; onBack: () => void }) {
  const [view, setView] = useState<ThreadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    const r = await fetchThread(id);
    if (r.ok) { setView(r.value); setError(null); } else setError(r.error);
  }, [id]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, THREAD_POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    const n = view?.messages.length ?? 0;
    if (n !== lastCount.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    lastCount.current = n;
  }, [view]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--c-line)' }}>
        <button type="button" onClick={onBack} aria-label="Back to all messages" title="Back"
          style={{ ...small, display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--c-fg)' }}>
          <ArrowLeft size={14} aria-hidden="true" />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-fg)' }}>
            {view ? view.other.name : '…'}{view?.other.teacher && <TeacherTag name={view?.other.name} />}
          </div>
          {view && <div style={{ fontSize: 11, color: 'var(--c-dim)' }}>{view.className}</div>}
        </div>
      </div>
      {view?.kind === 'students' && (
        <p data-testid="mailbox-watched" style={{ margin: 0, padding: '6px 12px', fontSize: 12, color: 'var(--c-meta)', background: 'var(--c-deep)', borderBottom: '1px solid var(--c-line)' }}>
          {WATCHED_NOTE}
        </p>
      )}
      <div ref={logRef} role="log" aria-label={view ? `Messages with ${view.other.name}` : 'Messages'} aria-live="polite"
        style={{ overflowY: 'auto', flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
        {!view && !error && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
        {view?.messages.map((m) => (
          <div key={m.id} data-testid="mailbox-message" style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            {(m.removed || m.body) && (
              <div style={{
                fontSize: 13, lineHeight: 1.45, padding: '6px 10px', borderRadius: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                background: m.removed ? 'transparent' : m.mine ? 'color-mix(in srgb, var(--brand) 22%, var(--c-bg))' : 'var(--c-deep2)',
                border: m.removed ? '1px dashed var(--c-line)' : '1px solid transparent',
                color: m.removed ? 'var(--c-dim)' : 'var(--c-fg)', fontStyle: m.removed ? 'italic' : 'normal',
              }}>
                {m.removed ? 'Removed by a teacher' : m.body}
              </div>
            )}
            {m.share && <ShareCardView card={m.share} mine={m.mine} author={m.author} />}
            <div style={{ fontSize: 10, color: 'var(--c-dim)', marginTop: 2, textAlign: m.mine ? 'right' : 'left' }}>
              {m.mine ? 'You' : m.author} · {clock(m.at)}
            </div>
          </div>
        ))}
      </div>
      {view && (view.canSend
        ? <Composer placeholder={`Message ${view.other.name}`} autoFocus onSend={async (text) => {
            const r = await sendReply(id, text);
            if (!r.ok) { if (r.status === 403) void load(); return r.error; }
            setView(r.value);
            return null;
          }} />
        : <p data-testid="mailbox-closed" style={{ margin: 0, padding: '10px 12px', fontSize: 12, lineHeight: 1.45, color: 'var(--c-meta)', borderTop: '1px solid var(--c-line)' }}>
            {view.whyText || blockText(view.why, view.other.name, view.className)}
          </p>)}
    </div>
  );
}

function NewMessage({ onBack, onSent }: { onBack: () => void; onSent: (id: string) => void }) {
  const [classes, setClasses] = useState<PeopleClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    void fetchPeople().then((r) => {
      if (!r.ok) { setError(r.error); return; }
      setClasses(r.value);
      if (r.value.length) setClassId(r.value[0].id);
    });
  }, []);

  const cls = classes?.find((c) => c.id === classId) ?? null;
  const people = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (cls?.people ?? []).filter((p) => !f || p.name.toLowerCase().includes(f));
  }, [cls, filter]);
  const person = cls?.people.find((p) => p.key === to) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--c-line)' }}>
        <button type="button" onClick={person ? () => setTo('') : onBack} aria-label={person ? 'Choose someone else' : 'Back to all messages'} title="Back"
          style={{ ...small, display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--c-fg)' }}>
          <ArrowLeft size={14} aria-hidden="true" />
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-fg)', flex: 1 }}>
          {person ? <>To {person.name}{person.teacher && <TeacherTag name={person.name} />}</> : 'New message'}
        </div>
      </div>
      {error && <p role="alert" style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
      {!classes && !error && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
      {classes && !classes.length && (
        <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--c-dim)' }}>
          You are not in a class yet. Once you are, you can message the people in it.
        </p>
      )}
      {cls && !person && (
        <>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--c-line)' }}>
            {classes!.length > 1 && (
              <label style={{ fontSize: 12, color: 'var(--c-meta)', display: 'flex', alignItems: 'center', gap: 6 }}>
                Class
                <select value={classId} onChange={(e) => { setClassId(e.target.value); setTo(''); }}
                  style={{ fontSize: 13, padding: '3px 6px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' }}>
                  {classes!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            <label htmlFor="mailbox-filter" className="sr-only">Find a person</label>
            <input id="mailbox-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a person" autoFocus
              style={{ fontSize: 13, padding: '5px 8px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' }} />
            {cls.classmatesBlocked && (
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--c-meta)' }}>{blockText(cls.classmatesBlocked, '', cls.name)}</p>
            )}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }} aria-label={`People in ${cls.name}`}>
            {people.map((p) => (
              <li key={p.key}>
                <button type="button" onClick={() => setTo(p.key)} data-testid="mailbox-person"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-line)', color: 'var(--c-fg)', fontSize: 13, cursor: 'pointer' }}>
                  {p.name}{p.teacher && <TeacherTag name={p.name} />}
                </button>
              </li>
            ))}
            {!people.length && <li style={{ padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>No one by that name in {cls.name}.</li>}
          </ul>
        </>
      )}
      {cls && person && (
        <>
          <div style={{ flex: 1, padding: '10px 12px', fontSize: 12, lineHeight: 1.5, color: 'var(--c-meta)' }}>
            {person.teacher || cls.teaches ? `In ${cls.name}.` : <>In {cls.name}. {WATCHED_NOTE}</>}
          </div>
          <Composer placeholder={`Message ${person.name}`} autoFocus onSend={async (text) => {
            const r = await sendNew(cls.id, person.key, text);
            if (!r.ok) return r.error;
            onSent(r.value.id);
            return null;
          }} />
        </>
      )}
    </div>
  );
}

export default function Mailbox({ active }: { active: boolean }) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetchThreads();
    if (r.ok) { setThreads(r.value); setError(null); } else setError(r.error);
  }, []);

  useEffect(() => {
    if (!active || view.kind !== 'list') return;
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, THREAD_POLL_MS);
    return () => window.clearInterval(t);
  }, [active, view.kind, load]);

  if (view.kind === 'thread') return <ThreadPane id={view.id} onBack={() => setView({ kind: 'list' })} />;
  if (view.kind === 'new') return <NewMessage onBack={() => setView({ kind: 'list' })} onSent={(id) => setView({ kind: 'thread', id })} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-line)' }}>
        <button type="button" onClick={() => setView({ kind: 'new' })} data-testid="mailbox-new"
          style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '5px 10px' }}>
          <PenSquare size={14} aria-hidden="true" /> New message
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {error && <p role="alert" style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
        {!threads && !error && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
        {threads && !threads.length && (
          <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--c-dim)' }}>
            No messages yet. Press New message to write to your teacher or a classmate.
          </p>
        )}
        {threads && threads.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {threads.map((t) => (
              <li key={t.id} style={{ borderBottom: '1px solid var(--c-line)' }}>
                <button type="button" onClick={() => setView({ kind: 'thread', id: t.id })} data-testid="mailbox-thread"
                  style={{
                    display: 'flex', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', cursor: 'pointer', color: 'var(--c-fg)',
                    background: t.unread ? 'color-mix(in srgb, var(--brand) 9%, transparent)' : 'transparent',
                  }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', flexShrink: 0, background: t.unread ? 'var(--brand)' : 'transparent' }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, display: 'block' }}>
                      {t.unread && <span className="sr-only">New: </span>}
                      <strong>{t.other.name}</strong>{t.other.teacher && <TeacherTag name={t.other.name} />}
                      <span style={{ color: 'var(--c-dim)', fontSize: 11 }}> · {t.className}</span>
                    </span>
                    {t.last && (
                      <span style={{ fontSize: 12, color: 'var(--c-meta)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: t.last.removed ? 'italic' : 'normal' }}>
                        {t.last.mine ? 'You: ' : ''}{t.last.removed ? 'Removed by a teacher' : t.last.snippet}
                      </span>
                    )}
                    {t.last && <span style={{ fontSize: 11, color: 'var(--c-dim)', display: 'block', marginTop: 2 }}>{when(t.last.at)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
