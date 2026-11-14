'use client';

// The class page's "Messages" panel (Students tab, migration 0053): the switch for messages between
// classmates, pausing one student, and every conversation between two students of the class, which a
// teacher can read and from which they can remove a message (students then see "Removed by a teacher";
// the words stay readable here, and Put back undoes it). Conversations between a student and a teacher
// are not listed: those are in the teacher's own mailbox. GET|POST /api/classes/[id]/messages.

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '../lib/http-error';
import { useFeedback } from './FeedbackProvider';
import ShareCardView from './ShareCardView';
import type { ShareCard } from '../lib/messages-core';

interface Overview {
  studentMessagesOn: boolean;
  students: { key: string; name: string; muted: boolean }[];
  threads: {
    id: string; people: string[]; count: number; lastAt: number;
    last: { author: string; snippet: string; at: number; removed: boolean } | null;
  }[];
}
interface Thread {
  id: string;
  people: { name: string; teacher: boolean }[];
  messages: { id: string; author: string; teacher: boolean; body: string; removed: boolean; at: number; share?: ShareCard | null }[];
}

function when(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const REFRESH_MS = 30_000;

const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;

export default function ClassMessages({ classId }: { classId: string }) {
  const { toast } = useFeedback();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);

  const base = `/api/classes/${encodeURIComponent(classId)}/messages`;
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 404) { setError(null); setData({ studentMessagesOn: true, students: [], threads: [] }); return; }
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    setData((await res.json()) as Overview);
  }, [base]);
  // A teacher may leave the class page open all lesson: refresh every 30 s while the tab is visible, and
  // when it comes back into view, so new conversations and messages show up (the open one too).
  const openRef = useRef<string | null>(null);
  openRef.current = open;
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void load();
      const id = openRef.current;
      if (!id) return;
      void fetch(`${base}?thread=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok || openRef.current !== id) return;
          setThread(((await res.json()) as { thread: Thread }).thread);
        })
        .catch(() => { /* the next refresh tries again */ });
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load, base]);

  const act = async (body: Record<string, unknown>, done: (json: unknown) => string | null): Promise<boolean> => {
    setBusy(true);
    const res = await fetch(base, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return false; }
    const said = done(await res.json());
    if (said) toast(said);
    return true;
  };

  const view = async (id: string) => {
    if (open === id) { setOpen(null); setThread(null); return; }
    setOpen(id);
    setThread(null);
    setThreadError(null);
    const res = await fetch(`${base}?thread=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) { setThreadError(await errorText(res)); return; }
    setThread(((await res.json()) as { thread: Thread }).thread);
  };

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!data) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;

  const muted = data.students.filter((s) => s.muted);
  const unmuted = data.students.filter((s) => !s.muted);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-testid="class-messages">
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch' }}>
        Students can message you and their classmates from the mailbox at the top of every page. Messages with phone
        numbers, addresses or emails are refused. Every conversation between two students is listed below, and students
        are told you can read them. A program sent in a message shows as a card: Open runs the copy, Watch shows a session live. Your own conversations with students are in your mailbox.
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: busy ? 'default' : 'pointer' }}>
        <input type="checkbox" checked={data.studentMessagesOn} disabled={busy} data-testid="class-messages-switch"
          onChange={(e) => {
            // Shown at once; the server's answer replaces it (and a refusal puts it back, below).
            const on = e.target.checked;
            setData((d) => (d ? { ...d, studentMessagesOn: on } : d));
            void act({ action: on ? 'messages-on' : 'messages-off' }, (j) => {
            setData(j as Overview);
            return (j as Overview).studentMessagesOn
              ? 'Students can message classmates in this class again.'
              : 'Messages between classmates are off. Students can still message you.';
            }).then((ok) => { if (!ok) void load(); });
          }} />
        Students can message classmates in this class
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Paused students</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-dim)' }}>A paused student cannot message classmates in this class. They can still message you.</p>
        {muted.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>No one is paused.</p>}
        {muted.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span>{s.name}</span>
            <button type="button" style={btn} disabled={busy}
              onClick={() => void act({ action: 'unmute', student: s.key }, (j) => { setData(j as Overview); return `${s.name} can message classmates again.`; })}>
              Unpause
            </button>
          </div>
        ))}
        {unmuted.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label htmlFor={`pause-${classId}`} className="sr-only">Student to pause</label>
            <select id={`pause-${classId}`} value={pick} onChange={(e) => setPick(e.target.value)}
              style={{ fontSize: 13, padding: '3px 6px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' }}>
              <option value="">Choose a student…</option>
              {unmuted.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
            <button type="button" style={btn} disabled={busy || !pick} data-testid="class-messages-pause"
              onClick={() => {
                const s = unmuted.find((x) => x.key === pick);
                void act({ action: 'mute', student: pick }, (j) => { setData(j as Overview); setPick(''); return `Paused ${s?.name ?? 'the student'}'s messages to classmates.`; });
              }}>
              Pause their messages to classmates
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Conversations between students</div>
        {!data.threads.length && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>None yet.</p>}
        {data.threads.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="class-messages-thread">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, minWidth: 160, flex: 1 }}>
                <strong>{t.people.join(' and ')}</strong>{' '}
                <span style={{ color: 'var(--c-dim)' }}>· {t.count} {t.count === 1 ? 'message' : 'messages'} · last {when(t.lastAt)}</span>
                {t.last && (
                  <div style={{ fontSize: 12, color: 'var(--c-meta)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.last.author}: {t.last.removed ? <em>removed</em> : t.last.snippet}
                  </div>
                )}
              </div>
              <button type="button" style={btn} aria-expanded={open === t.id} onClick={() => void view(t.id)}>
                {open === t.id ? 'Hide' : 'Read'}
              </button>
            </div>
            {open === t.id && (
              threadError
                ? <p style={{ color: 'var(--c-red)', fontSize: 13, margin: 0 }}>{threadError}</p>
                : !thread
                  ? <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>Loading…</p>
                  : (
                    <ol aria-label={`Messages between ${t.people.join(' and ')}`}
                      style={{ listStyle: 'none', margin: 0, padding: '8px 10px', maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 4 }}>
                      {thread.messages.map((m) => (
                        <li key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: 'var(--c-dim)' }}>
                              <strong style={{ color: 'var(--c-meta)' }}>{m.author}</strong> · {when(m.at)}
                              {m.removed && <span style={{ color: 'var(--c-orange)' }}> · removed (students see &ldquo;Removed by a teacher&rdquo;)</span>}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: m.removed ? 'var(--c-dim)' : 'var(--c-fg)', textDecoration: m.removed ? 'line-through' : 'none' }}>
                              {m.body}
                            </div>
                            {m.share && <ShareCardView card={m.share} mine={false} author={m.author} onlooker />}
                          </div>
                          <button type="button" style={btn} disabled={busy} data-testid="class-messages-remove"
                            onClick={() => void act({ action: m.removed ? 'restore' : 'remove', messageId: m.id }, (j) => {
                              setThread((j as { thread: Thread }).thread);
                              void load();
                              return m.removed ? 'Put the message back.' : 'Removed the message. Students now see "Removed by a teacher".';
                            })}>
                            {m.removed ? 'Put back' : 'Remove'}
                          </button>
                        </li>
                      ))}
                    </ol>
                  )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
