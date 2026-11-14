'use client';

// The class page's "Messages" panel (Students tab, migrations 0053 and 0055): what students may send,
// for the whole class and for each student (On, Teacher only, Off; the stricter wins), and every
// conversation between two students and every group of the class, which a teacher can read and from
// which they can remove a message (students then see "Removed by a teacher"; the words stay readable
// here, and Put back undoes it). Channels are in the teacher's mailbox (they are in the class), where
// they can also lock, rename and delete them. GET|POST /api/classes/[id]/messages.

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '../lib/http-error';
import { useFeedback } from './FeedbackProvider';
import ShareCardView from './ShareCardView';
import { LEVEL_LABEL, type MessageLevel, type ShareCard } from '../lib/messages-core';

interface Overview {
  level: MessageLevel;
  studentMessagesOn: boolean;
  students: { key: string; name: string; level: MessageLevel; muted: boolean }[];
  threads: {
    id: string; kind: 'students' | 'group'; title: string; people: string[]; count: number; lastAt: number;
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
  const [busy, setBusy] = useState(false);

  const base = `/api/classes/${encodeURIComponent(classId)}/messages`;
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 404) { setError(null); setData({ level: 0, studentMessagesOn: true, students: [], threads: [] }); return; }
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

  const select = { fontSize: 13, padding: '3px 6px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' } as const;
  const LEVEL_HELP: Record<MessageLevel, string> = {
    0: 'can message you and classmates, and post in groups and channels',
    1: 'can message you only',
    2: 'cannot send anything (they can still read)',
  };
  const levels = [0, 1, 2] as MessageLevel[];
  const limited = data.students.filter((s) => s.level > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-testid="class-messages">
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch' }}>
        Students can message you and their classmates, make groups and post in the class&rsquo;s channels, from the
        mailbox at the top of every page or the Messages page. Messages with phone numbers, addresses or emails are
        refused. Every conversation between two students and every group is listed below, and students are told you can
        read them. The class&rsquo;s channels are in your own mailbox, where you can lock, rename or delete them. A program sent in a message shows as a card: Open runs the copy, Watch shows a session live. Your own conversations with students are in your mailbox.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor={`class-level-${classId}`} style={{ fontSize: 13, fontWeight: 600 }}>Student messages in this class</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select id={`class-level-${classId}`} value={data.level} disabled={busy} data-testid="class-messages-level" style={select}
            onChange={(e) => {
              const level = Number(e.target.value) as MessageLevel;
              // Shown at once; the server's answer replaces it (and a refusal puts it back, below).
              setData((d) => (d ? { ...d, level, studentMessagesOn: level === 0 } : d));
              void act({ action: 'class-level', level }, (j) => {
                setData(j as Overview);
                return `Student messages in this class: ${LEVEL_LABEL[level]}. Students ${LEVEL_HELP[level]}.`;
              }).then((ok) => { if (!ok) void load(); });
            }}>
            {levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>Students {LEVEL_HELP[data.level]}.</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>One student</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-dim)', maxWidth: '70ch' }}>
          Teacher only: they can message you, nothing else. Off: they cannot send anything, even to you. The stricter of
          this and the class setting is what counts.
        </p>
        {limited.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>Every student is On.</p>}
        {data.students.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
            {[...data.students].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)).map((s) => (
              <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <label htmlFor={`student-level-${s.key}`} style={{ minWidth: 140 }}>{s.name}</label>
                <select id={`student-level-${s.key}`} value={s.level} disabled={busy} data-testid="class-messages-student-level" style={select}
                  onChange={(e) => {
                    const level = Number(e.target.value) as MessageLevel;
                    void act({ action: 'student-level', student: s.key, level }, (j) => {
                      setData(j as Overview);
                      return level === 0 ? `${s.name}'s messages are On again.` : `${s.name}: ${LEVEL_LABEL[level]}. They ${LEVEL_HELP[level]}.`;
                    });
                  }}>
                  {levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Conversations between students, and groups</div>
        {!data.threads.length && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>None yet.</p>}
        {data.threads.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="class-messages-thread">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, minWidth: 160, flex: 1 }}>
                {t.kind === 'group'
                  ? <><strong>{t.title}</strong> <span style={{ color: 'var(--c-dim)' }}>(group: {t.people.join(', ')})</span></>
                  : <strong>{t.people.join(' and ')}</strong>}{' '}
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
