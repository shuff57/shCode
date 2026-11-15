'use client';

// Messages (migrations 0053-0055): the conversation list, one conversation, and making a new message,
// group or channel. Two homes share these pieces: the Messages tab of the envelope's dropdown in the
// header (the default export, `Mailbox`) and the full page at /messages (components/MessagesPage.tsx).
//
// The list: each class's channels (#general first), then groups, then two-person conversations. A
// student writes to their teacher and to classmates, makes groups of up to 8 people of a class, and adds
// channels; a teacher of the class can lock, rename and delete a channel, delete a group, and remove a
// message anywhere between students (they still see its words; students see "Removed by a teacher").
// What a student may send follows their level (On, Teacher only, Off). Every message is checked for
// personal details before it goes (the same check runs again on the server). Calls:
// lib/messages-client.ts. Rules and words: lib/messages-core.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Hash, Lock, Maximize2, PenSquare, Users } from 'lucide-react';
import {
  CHANNEL_NAME_MAX, DELETED_TEXT, GENERAL, GROUP_MAX_PEOPLE, GROUP_TITLE_MAX, MESSAGE_MAX, THREAD_POLL_MS, WATCHED_NOTE, blockText,
  cleanChannelName, cleanMessage, hasMention, mentionParts,
  type MessageItem, type MessagePerson, type PeopleClass, type ThreadSummary, type ThreadView,
} from '../lib/messages-core';
import {
  createChannel, createGroup, deleteOwnMessage, editOwnMessage, fetchPeople, fetchThread, fetchThreads, manageThread, sendNew, sendReply,
} from '../lib/messages-client';
import ShareCardView from './ShareCardView';
import MessageHistory from './MessageHistory';

export type MailView =
  | { kind: 'list' } | { kind: 'thread'; id: string } | { kind: 'new' } | { kind: 'new-group' } | { kind: 'new-channel' };

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
const field = {
  fontSize: 13, padding: '5px 8px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
} as const;
const primary = (off: boolean) => ({
  fontSize: 13, padding: '5px 14px', borderRadius: 4, border: 'none', fontWeight: 600,
  background: off ? 'var(--c-deep2)' : 'var(--brand)', color: off ? 'var(--c-dim)' : 'var(--on-brand)', cursor: off ? 'default' : 'pointer',
});

const TeacherTag = ({ name }: { name?: string }) => (name === 'Teacher' ? null : (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', marginLeft: 6, borderRadius: 3, color: 'var(--c-purple)', border: '1px solid var(--c-purple)', verticalAlign: 1 }}>
    Teacher
  </span>
));

function KindIcon({ kind, locked, size = 13 }: { kind: ThreadSummary['kind']; locked?: boolean; size?: number }) {
  if (kind === 'channel') return locked ? <Lock size={size} aria-hidden="true" /> : <Hash size={size} aria-hidden="true" />;
  if (kind === 'group') return <Users size={size} aria-hidden="true" />;
  return null;
}

/**
 * The keys of the people a message really @names: picked from the list AND still written in the words
 * (the person may have deleted the text after picking it). The server checks them again.
 */
function mentionKeys(text: string, people: MessagePerson[] | undefined, picked: Set<string>): string[] {
  return (people ?? []).filter((p) => picked.has(p.key) && hasMention(text, p.name)).map((p) => p.key);
}

/**
 * A message box where typing "@" offers the people of the conversation (migration 0056). Picking one writes
 * "@Name " into the words and tells the parent (`onPick`) which person it was; Up/Down/Enter/Tab/Escape work
 * the list from the keyboard. With the list closed, Enter submits (Shift+Enter is a new line) and Escape cancels.
 */
function MentionField({ id, value, onChange, people, onPick, onSubmit, onCancel, placeholder, disabled, autoFocus, rows = 2, testid }: {
  id: string; value: string; onChange: (text: string) => void; people?: MessagePerson[]; onPick: (p: MessagePerson) => void;
  onSubmit: () => void; onCancel?: () => void; placeholder?: string; disabled?: boolean; autoFocus?: boolean; rows?: number; testid: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  // The "@word" the caret is at the end of, or null.
  const query = useMemo(() => {
    const m = /(^|[\s(])@([^\s@]*)$/u.exec(value.slice(0, caret));
    return m ? m[2] : null;
  }, [value, caret]);
  const matches = useMemo(() => {
    if (query === null || !people?.length) return [];
    const q = query.toLowerCase();
    return people.filter((p) => !q || p.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q))).slice(0, 6);
  }, [query, people]);
  useEffect(() => { setActive(0); setDismissed(false); }, [query]);
  const open = !dismissed && matches.length > 0;
  const listId = `${id}-mentions`;

  const pick = (p: MessagePerson) => {
    const start = value.slice(0, caret).lastIndexOf('@');
    if (start < 0) return;
    const insert = `@${p.name} `;
    onChange(value.slice(0, start) + insert + value.slice(caret));
    onPick(p);
    const pos = start + insert.length;
    window.requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(pos, pos); setCaret(pos); });
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {open && (
        <ul id={listId} role="listbox" aria-label="People to mention" data-testid="mention-list"
          style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, margin: '0 0 4px', padding: 2, listStyle: 'none', zIndex: 5,
            background: 'var(--c-deep)', border: '1px solid var(--c-line)', borderRadius: 6, boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }}>
          {matches.map((p, i) => (
            <li key={p.key} id={`${listId}-${i}`} role="option" aria-selected={i === active} data-testid="mention-option"
              // mousedown, not click: the textarea must not lose its caret before the name is written in
              onMouseDown={(e) => { e.preventDefault(); pick(p); }} onMouseEnter={() => setActive(i)}
              style={{ padding: '5px 8px', fontSize: 13, borderRadius: 4, cursor: 'pointer', color: 'var(--c-fg)',
                background: i === active ? 'color-mix(in srgb, var(--brand) 22%, transparent)' : 'transparent' }}>
              @{p.name}{p.teacher && <TeacherTag name={p.name} />}
            </li>
          ))}
        </ul>
      )}
      <textarea id={id} ref={ref} value={value} disabled={disabled} autoFocus={autoFocus} placeholder={placeholder} rows={rows} data-testid={testid}
        role={people?.length ? 'combobox' : undefined} aria-expanded={people?.length ? open : undefined} aria-controls={people?.length && open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-autocomplete={people?.length ? 'list' : undefined}
        onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (open) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i + matches.length - 1) % matches.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[active]); return; }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDismissed(true); return; }
          }
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }
          else if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
        }}
        style={{ ...field, resize: 'vertical', minHeight: 44, maxHeight: 160, lineHeight: 1.45, padding: '6px 8px', fontFamily: 'inherit' }} />
    </div>
  );
}

function Composer({ onSend, disabled, placeholder, autoFocus, people }: {
  onSend: (text: string, mentions: string[]) => Promise<string | null>; disabled?: boolean; placeholder: string; autoFocus?: boolean;
  /** A group or channel: whom an @ can name. */
  people?: MessagePerson[];
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = useRef<Set<string>>(new Set());
  const length = [...text].length;

  const send = async () => {
    if (busy) return;
    const c = cleanMessage(text);
    if ('error' in c) { setError(c.error); return; }
    setBusy(true);
    setError(null);
    const err = await onSend(c.body, mentionKeys(c.body, people, picked.current));
    setBusy(false);
    if (err) setError(err);
    else { setText(''); picked.current = new Set(); }
  };

  const off = disabled || busy || !text.trim();
  return (
    <div style={{ borderTop: '1px solid var(--c-line)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--c-red)' }}>{error}</p>}
      <label htmlFor="mailbox-compose" className="sr-only">Message</label>
      <MentionField id="mailbox-compose" testid="mailbox-compose" value={text} disabled={disabled || busy} autoFocus={autoFocus} placeholder={placeholder}
        people={people} onPick={(p) => { picked.current.add(p.key); }}
        onChange={(t) => { setText(t); if (error) setError(null); }} onSubmit={() => void send()} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: length > MESSAGE_MAX ? 'var(--c-red)' : 'var(--c-dim)', flex: 1 }}>
          {length > MESSAGE_MAX - 200 ? `${length} / ${MESSAGE_MAX}` : people?.length ? 'Enter sends · @ names someone · Shift+Enter for a new line' : 'Enter sends · Shift+Enter for a new line'}
        </span>
        <button type="button" onClick={() => void send()} disabled={off} data-testid="mailbox-send" style={primary(off)}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ---- the list ------------------------------------------------------------------------------------

/** "@" beside a conversation where someone named you since you last opened it. */
function MentionBadge() {
  return (
    <span data-testid="mention-badge" title="Someone mentioned you"
      style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, padding: '2px 6px', borderRadius: 9, flexShrink: 0, background: 'var(--c-yellow)', color: 'var(--c-bg)' }}>
      <span aria-hidden="true">@</span><span className="sr-only">You were mentioned</span>
    </span>
  );
}

function Row({ t, selected, onOpen }: { t: ThreadSummary; selected: boolean; onOpen: (id: string) => void }) {
  const channel = t.kind === 'channel';
  return (
    <li>
      <button type="button" onClick={() => onOpen(t.id)} data-testid="mailbox-thread" data-kind={t.kind} aria-current={selected ? 'true' : undefined}
        style={{
          display: 'flex', gap: 8, width: '100%', textAlign: 'left', padding: channel ? '6px 12px' : '9px 12px', border: 'none', cursor: 'pointer',
          color: 'var(--c-fg)', borderBottom: channel ? 'none' : '1px solid var(--c-line)',
          background: selected ? 'color-mix(in srgb, var(--brand) 18%, transparent)' : t.unread && !channel ? 'color-mix(in srgb, var(--brand) 9%, transparent)' : 'transparent',
        }}>
        {channel ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: 0, flex: 1, fontWeight: t.unread ? 700 : 400, color: t.unread ? 'var(--c-fg)' : 'var(--c-meta)' }}>
            <KindIcon kind="channel" locked={t.locked} />
            {t.unread && <span className="sr-only">New messages in </span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
            {t.mentioned && <MentionBadge />}
          </span>
        ) : (
          <>
            <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', flexShrink: 0, background: t.unread ? 'var(--brand)' : 'transparent' }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                {t.unread && <span className="sr-only">New: </span>}
                <KindIcon kind={t.kind} />
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</strong>
                {t.kind !== 'group' && t.other.teacher && <TeacherTag name={t.other.name} />}
                <span style={{ color: 'var(--c-dim)', fontSize: 11, flexShrink: 0 }}>· {t.className}</span>
                {t.mentioned && <MentionBadge />}
              </span>
              {t.last && (
                <span style={{ fontSize: 12, color: 'var(--c-meta)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: t.last.removed || t.last.deleted ? 'italic' : 'normal' }}>
                  {t.last.mine ? 'You: ' : t.last.author ? `${t.last.author}: ` : ''}{t.last.removed ? 'Removed by a teacher' : t.last.deleted ? DELETED_TEXT : t.last.snippet}
                </span>
              )}
              {t.last && <span style={{ fontSize: 11, color: 'var(--c-dim)', display: 'block', marginTop: 2 }}>{when(t.last.at)}</span>}
            </span>
          </>
        )}
      </button>
    </li>
  );
}

const sectionHead = { margin: 0, padding: '10px 12px 4px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--c-dim)' } as const;

/** Each class's channels, then groups, then two-person conversations. */
export function ConversationList({ threads, error, selected, onOpen }: {
  threads: ThreadSummary[] | null; error: string | null; selected?: string | null; onOpen: (id: string) => void;
}) {
  const parts = useMemo(() => {
    const t = threads ?? [];
    const byClass = new Map<string, ThreadSummary[]>();
    for (const c of t.filter((x) => x.kind === 'channel')) {
      const list = byClass.get(c.className) ?? [];
      list.push(c);
      byClass.set(c.className, list);
    }
    return { byClass: [...byClass.entries()], groups: t.filter((x) => x.kind === 'group'), direct: t.filter((x) => x.kind === 'teacher' || x.kind === 'students') };
  }, [threads]);
  if (error) return <p role="alert" style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>;
  if (!threads) return <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>;
  if (!threads.length) {
    return (
      <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--c-dim)' }}>
        No messages yet. Join a class (or be invited as a guest), then press Message to write to your teacher or a classmate.
      </p>
    );
  }
  return (
    <nav aria-label="Conversations" data-testid="conversation-list">
      {parts.byClass.map(([name, list]) => (
        <section key={name} aria-label={`${name} channels`} style={{ paddingBottom: 4 }}>
          <h3 style={sectionHead}>{name}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{list.map((t) => <Row key={t.id} t={t} selected={selected === t.id} onOpen={onOpen} />)}</ul>
        </section>
      ))}
      {parts.groups.length > 0 && (
        <section aria-label="Groups">
          <h3 style={sectionHead}>Groups</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--c-line)' }}>{parts.groups.map((t) => <Row key={t.id} t={t} selected={selected === t.id} onOpen={onOpen} />)}</ul>
        </section>
      )}
      {parts.direct.length > 0 && (
        <section aria-label="Direct messages">
          <h3 style={sectionHead}>Direct messages</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--c-line)' }}>{parts.direct.map((t) => <Row key={t.id} t={t} selected={selected === t.id} onOpen={onOpen} />)}</ul>
        </section>
      )}
    </nav>
  );
}

/** Message, Group, Channel. */
export function NewButtons({ onPick }: { onPick: (v: MailView) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => onPick({ kind: 'new' })} data-testid="mailbox-new" style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '4px 9px' }}>
        <PenSquare size={13} aria-hidden="true" /> Message
      </button>
      <button type="button" onClick={() => onPick({ kind: 'new-group' })} data-testid="mailbox-new-group" style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '4px 9px' }}>
        <Users size={13} aria-hidden="true" /> Group
      </button>
      <button type="button" onClick={() => onPick({ kind: 'new-channel' })} data-testid="mailbox-new-channel" style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '4px 9px' }}>
        <Hash size={13} aria-hidden="true" /> Channel
      </button>
    </div>
  );
}

// ---- one conversation -----------------------------------------------------------------------------

const linkButton = {
  marginLeft: 8, fontSize: 10, padding: 0, border: 'none', background: 'none', color: 'var(--c-cyan)', cursor: 'pointer', textDecoration: 'underline',
} as const;

/** A message's words with each @mention in bold (the reader's own in a highlight). */
function MessageWords({ body, mentions }: { body: string; mentions: MessageItem['mentions'] }) {
  if (!mentions.length) return <>{body}</>;
  const me = new Set(mentions.filter((x) => x.me).map((x) => x.name));
  return (
    <>
      {mentionParts(body, mentions.map((x) => x.name)).map((part, i) => (part.mention === null
        ? <span key={i}>{part.text}</span>
        : (
          <strong key={i} data-testid="mention" data-me={me.has(part.mention) ? '1' : undefined}
            style={{ fontWeight: 700, color: me.has(part.mention) ? 'var(--c-bg)' : 'var(--c-cyan)', background: me.has(part.mention) ? 'var(--c-yellow)' : 'transparent', borderRadius: 3, padding: me.has(part.mention) ? '0 3px' : 0 }}>
            {part.text}
          </strong>
        )))}
    </>
  );
}

function MessageRow({ m, view, onModerate, onEdit, onDelete }: {
  m: MessageItem; view: ThreadView; onModerate: (m: MessageItem) => void;
  /** Save new words; resolves to an error to show, or null when it saved. */
  onEdit: (m: MessageItem, text: string, mentions: string[]) => Promise<string | null>;
  onDelete: (m: MessageItem) => void;
}) {
  const many = view.kind === 'group' || view.kind === 'channel' || view.onlooker;
  const removedWords = m.removed && m.body != null;
  // Deleted by its author: classmates get no words (body null); a teacher gets them, struck through.
  const deletedStub = m.deleted && m.body == null && !m.removed;
  const deletedWords = m.deleted && m.body != null && !m.removed;
  const struck = removedWords || deletedWords;
  const mentionsMe = m.mentions.some((x) => x.me);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = useRef<Set<string>>(new Set());
  const people = view.mentionable;

  const startEdit = () => {
    // The people it already names stay named unless the words change.
    picked.current = new Set((people ?? []).filter((p) => m.mentions.some((x) => x.name === p.name)).map((p) => p.key));
    setText(m.body ?? '');
    setErr(null);
    setEditing(true);
  };
  const save = async () => {
    if (busy) return;
    const c = m.share && !text.trim() ? { body: '' } : cleanMessage(text);
    if ('error' in c) { setErr(c.error); return; }
    if (c.body === (m.body ?? '')) { setEditing(false); return; }
    setBusy(true);
    setErr(null);
    const e = await onEdit(m, c.body, mentionKeys(c.body, people, picked.current));
    setBusy(false);
    if (e) setErr(e); else setEditing(false);
  };

  return (
    <div data-testid="mailbox-message" data-deleted={m.deleted ? '1' : undefined} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '85%', minWidth: editing ? '70%' : undefined }}>
      {many && !m.mine && (
        <div style={{ fontSize: 11, color: 'var(--c-meta)', marginBottom: 2 }}>
          <strong>{m.author}</strong>{m.teacher && <TeacherTag name={m.author} />}
        </div>
      )}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="sr-only" htmlFor={`edit-${m.id}`}>Change your message</label>
          <MentionField id={`edit-${m.id}`} testid="mailbox-edit-field" value={text} onChange={(t) => { setText(t); if (err) setErr(null); }} people={people}
            onPick={(p) => { picked.current.add(p.key); }} onSubmit={() => void save()} onCancel={() => setEditing(false)} disabled={busy} autoFocus rows={3} />
          {err && <p role="alert" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--c-red)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" style={primary(busy)} disabled={busy} onClick={() => void save()} data-testid="mailbox-edit-save">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" style={small} onClick={() => setEditing(false)}>Cancel</button>
            <span style={{ fontSize: 11, color: 'var(--c-dim)' }}>Your teacher can see what it said before.</span>
          </div>
        </div>
      ) : (m.removed || m.deleted || m.body) && (
        <div style={{
          fontSize: 13, lineHeight: 1.45, padding: '6px 10px', borderRadius: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          background: m.removed || m.deleted ? 'transparent' : m.mine ? 'color-mix(in srgb, var(--brand) 22%, var(--c-bg))' : 'var(--c-deep2)',
          border: m.removed || m.deleted ? '1px dashed var(--c-line)' : mentionsMe ? '1px solid var(--c-yellow)' : '1px solid transparent',
          color: m.removed || m.deleted ? 'var(--c-dim)' : 'var(--c-fg)', fontStyle: (m.removed && !removedWords) || deletedStub ? 'italic' : 'normal',
          textDecoration: struck ? 'line-through' : 'none',
        }}>
          {removedWords || deletedWords
            ? m.body
            : m.removed ? 'Removed by a teacher'
            : deletedStub ? (m.mine ? 'You deleted this message' : DELETED_TEXT)
            : <MessageWords body={m.body ?? ''} mentions={m.mentions} />}
        </div>
      )}
      {m.share && !editing && <ShareCardView card={m.share} mine={m.mine} author={m.author} onlooker={view.onlooker} />}
      <div style={{ fontSize: 10, color: 'var(--c-dim)', marginTop: 2, textAlign: m.mine ? 'right' : 'left' }}>
        {m.mine ? 'You' : m.author} · {clock(m.at)}
        {m.edited && !m.deleted && <span data-testid="mailbox-edited"> · edited</span>}
        {removedWords && <span style={{ color: 'var(--c-orange)' }}> · removed (students see &ldquo;Removed by a teacher&rdquo;)</span>}
        {!editing && m.canEdit && (
          <button type="button" onClick={startEdit} data-testid="mailbox-edit" style={linkButton}>Edit</button>
        )}
        {!editing && m.canDelete && (
          <button type="button" onClick={() => onDelete(m)} data-testid="mailbox-delete" style={linkButton}>Delete</button>
        )}
        {view.moderate && (
          <button type="button" onClick={() => onModerate(m)} data-testid="mailbox-remove" style={linkButton}>
            {m.removed ? 'Put back' : 'Remove'}
          </button>
        )}
      </div>
      <MessageHistory history={m.history} deleted={deletedWords} />
    </div>
  );
}

/** Pick people of a class (a new group, or adding to one). */
function PeoplePicker({ cls, chosen, setChosen, exclude = [], room }: {
  cls: PeopleClass; chosen: Set<string>; setChosen: (s: Set<string>) => void; exclude?: string[]; room: number;
}) {
  const [filter, setFilter] = useState('');
  const shown = cls.people.filter((p) => !p.guest && !exclude.includes(p.key) && (!filter.trim() || p.name.toLowerCase().includes(filter.trim().toLowerCase())));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <label className="sr-only" htmlFor="people-filter">Find a person</label>
      <input id="people-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a person" style={field} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', maxHeight: 220 }} aria-label={`People in ${cls.name}`}>
        {shown.map((p) => {
          const on = chosen.has(p.key);
          const full = !on && chosen.size >= room;
          return (
            <li key={p.key}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', fontSize: 13, cursor: full ? 'default' : 'pointer', color: full ? 'var(--c-dim)' : 'var(--c-fg)' }}>
                <input type="checkbox" checked={on} disabled={full} data-testid="group-person"
                  onChange={() => { const next = new Set(chosen); if (on) next.delete(p.key); else next.add(p.key); setChosen(next); }} />
                {p.name}{p.teacher && <TeacherTag name={p.name} />}
              </label>
            </li>
          );
        })}
        {!shown.length && <li style={{ padding: 6, fontSize: 13, color: 'var(--c-dim)' }}>No one to add.</li>}
      </ul>
    </div>
  );
}

export function ThreadPane({ id, onBack, onGone, onChanged }: {
  id: string; onBack?: () => void; onGone?: () => void; onChanged?: () => void;
}) {
  const [view, setView] = useState<ThreadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<'rename' | 'add' | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState<{ cls: PeopleClass | null; chosen: Set<string> }>({ cls: null, chosen: new Set() });
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    const r = await fetchThread(id);
    if (r.ok) { setView(r.value); setError(null); } else setError(r.error);
  }, [id]);

  useEffect(() => {
    setView(null);
    setEditing(null);
    setNote(null);
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, THREAD_POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    const n = view?.messages.length ?? 0;
    if (n !== lastCount.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    lastCount.current = n;
  }, [view]);

  const run = async (action: string, extra: Record<string, unknown> = {}, ask?: string): Promise<void> => {
    if (busy || (ask && !window.confirm(ask))) return;
    setBusy(true);
    setNote(null);
    const r = await manageThread<ThreadView & { left?: boolean; deleted?: boolean }>(id, action, extra);
    setBusy(false);
    if (!r.ok) { setNote(r.error); return; }
    if (r.value.left || r.value.deleted) { onChanged?.(); onGone?.(); return; }
    setView(r.value);
    setEditing(null);
    onChanged?.();
  };

  const startAdd = async () => {
    setEditing('add');
    setAdding({ cls: null, chosen: new Set() });
    const r = await fetchPeople();
    if (!r.ok) { setNote(r.error); return; }
    setAdding({ cls: r.value.find((c) => c.id === view?.classId) ?? null, chosen: new Set() });
  };

  const v = view;
  const isChannel = v?.kind === 'channel';
  const isGroup = v?.kind === 'group';
  const headTitle = v ? (isChannel ? `#${v.title}` : v.title) : '…';
  const sub = v ? [v.className, isGroup && v.members ? v.members.map((m) => (m.me ? 'you' : m.name)).join(', ') : null, isChannel && v.locked ? 'only teachers post' : null].filter(Boolean).join(' · ') : '';
  const tools: { label: string; on: () => void; testid: string }[] = [];
  if (v) {
    if (v.manage && !(isChannel && v.title === GENERAL)) tools.push({ label: 'Rename', testid: 'thread-rename', on: () => { setDraft(v.kind === 'group' ? (v.title === v.members?.filter((m) => !m.me).map((m) => m.name).join(', ') ? '' : v.title) : v.title); setEditing('rename'); } });
    if (isGroup && v.manage) tools.push({ label: 'Add people', testid: 'thread-add', on: () => void startAdd() });
    if (isGroup && !v.onlooker) tools.push({ label: 'Leave', testid: 'thread-leave', on: () => void run('leave', {}, `Leave "${v.title}"? You will not see its messages any more.`) });
    if (isChannel && v.moderate) tools.push({ label: v.locked ? 'Let everyone post' : 'Only teachers post', testid: 'thread-lock', on: () => void run(v.locked ? 'unlock' : 'lock') });
    if (v.moderate && (isGroup || (isChannel && v.title !== GENERAL))) {
      tools.push({ label: 'Delete', testid: 'thread-delete', on: () => void run('delete', {}, `Delete ${headTitle} and every message in it, for everyone? This cannot be undone.`) });
    }
  }
  const groupRoom = v?.members ? GROUP_MAX_PEOPLE - v.members.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }} data-testid="thread-pane">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--c-line)' }}>
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to all messages" title="Back"
            style={{ ...small, display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--c-fg)' }}>
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-fg)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }} data-testid="thread-title">
            {v && v.kind !== 'channel' && <KindIcon kind={v.kind} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headTitle}</span>
            {v && (v.kind === 'teacher' || v.kind === 'students') && !v.onlooker && v.other.teacher && <TeacherTag name={v.other.name} />}
          </div>
          {v && <div style={{ fontSize: 11, color: 'var(--c-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
        </div>
      </div>
      {tools.length > 0 && editing === null && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 10px', borderBottom: '1px solid var(--c-line)' }}>
          {tools.map((t) => <button key={t.label} type="button" style={small} disabled={busy} onClick={t.on} data-testid={t.testid}>{t.label}</button>)}
        </div>
      )}
      {editing === 'rename' && v && (
        <form onSubmit={(e) => { e.preventDefault(); void run('rename', { title: draft }); }}
          style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '1px solid var(--c-line)' }}>
          <label className="sr-only" htmlFor="thread-name">New name</label>
          <input id="thread-name" value={draft} autoFocus maxLength={isChannel ? CHANNEL_NAME_MAX + 10 : GROUP_TITLE_MAX}
            onChange={(e) => setDraft(e.target.value)} placeholder={isChannel ? 'channel-name' : 'Group name'} style={{ ...field, flex: 1, minWidth: 0 }} />
          <button type="submit" style={primary(busy)} disabled={busy}>Save</button>
          <button type="button" style={small} onClick={() => setEditing(null)}>Cancel</button>
        </form>
      )}
      {editing === 'add' && v && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--c-line)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!adding.cls ? <p style={{ margin: 0, fontSize: 12, color: 'var(--c-dim)' }}>Loading…</p> : (
            <PeoplePicker cls={adding.cls} chosen={adding.chosen} setChosen={(s) => setAdding((a) => ({ ...a, chosen: s }))}
              exclude={(v.members ?? []).map((m) => m.key)} room={groupRoom} />
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--c-dim)', flex: 1 }}>A group is at most {GROUP_MAX_PEOPLE} people.</span>
            <button type="button" style={primary(busy || !adding.chosen.size)} disabled={busy || !adding.chosen.size}
              onClick={() => void run('add', { people: [...adding.chosen] })}>Add</button>
            <button type="button" style={small} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      {note && <p role="alert" style={{ margin: 0, padding: '6px 12px', fontSize: 12, color: 'var(--c-red)' }}>{note}</p>}
      {v?.note && (
        <p data-testid="mailbox-watched" style={{ margin: 0, padding: '6px 12px', fontSize: 12, color: 'var(--c-meta)', background: 'var(--c-deep)', borderBottom: '1px solid var(--c-line)' }}>
          {v.note}
        </p>
      )}
      <div ref={logRef} role="log" aria-label={v ? `Messages in ${headTitle}` : 'Messages'} aria-live="polite"
        style={{ overflowY: 'auto', flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
        {!v && !error && <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
        {v?.more && <p style={{ margin: 0, fontSize: 11, color: 'var(--c-dim)', textAlign: 'center' }}>Showing the newest {v.messages.length} messages.</p>}
        {v && !v.messages.length && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)' }}>
            {isChannel ? `This is the start of #${v.title}.` : isGroup ? 'No messages yet. Say hello to the group.' : 'No messages yet.'}
          </p>
        )}
        {v?.messages.map((m) => (
          <MessageRow key={m.id} m={m} view={v}
            onModerate={(x) => void run(x.removed ? 'restore' : 'remove', { messageId: x.id }, x.removed ? undefined : 'Remove this message? Students will see "Removed by a teacher". You can put it back.')}
            onEdit={async (x, text, mentions) => {
              const r = await editOwnMessage(id, x.id, text, mentions);
              if (!r.ok) { if (r.status === 403 || r.status === 404) void load(); return r.error; }
              setView(r.value);
              onChanged?.();
              return null;
            }}
            onDelete={(x) => {
              if (busy || !window.confirm('Delete this message? Others will see "Message deleted". Your teacher can still read what it said.')) return;
              setBusy(true);
              void deleteOwnMessage(id, x.id).then((r) => {
                setBusy(false);
                if (!r.ok) { setNote(r.error); return; }
                setView(r.value);
                onChanged?.();
              });
            }} />
        ))}
      </div>
      {v && (v.canSend
        ? <Composer placeholder={isChannel ? `Message #${v.title}` : `Message ${v.title}`} autoFocus people={v.mentionable} onSend={async (text, mentions) => {
            const r = await sendReply(id, text, undefined, mentions);
            if (!r.ok) { if (r.status === 403) void load(); return r.error; }
            setView(r.value);
            onChanged?.();
            return null;
          }} />
        : <p data-testid="mailbox-closed" style={{ margin: 0, padding: '10px 12px', fontSize: 12, lineHeight: 1.45, color: 'var(--c-meta)', borderTop: '1px solid var(--c-line)' }}>
            {v.whyText || blockText(v.why, v.other.name, v.className)}
          </p>)}
    </div>
  );
}

// ---- making something new -------------------------------------------------------------------------

/**
 * The classes a person may write in. `forGroups`: groups and channels are for the people OF a class, so the "Guest of ..."
 * entry a guest gets (migration 0060) is left out, and PeoplePicker leaves out a student's own guests.
 */
function useClasses(forGroups = false): { classes: PeopleClass[] | null; error: string | null; classId: string; setClassId: (id: string) => void } {
  const [classes, setClasses] = useState<PeopleClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  useEffect(() => {
    void fetchPeople().then((r) => {
      if (!r.ok) { setError(r.error); return; }
      const usable = forGroups ? r.value.filter((c) => !c.guestOf) : r.value;
      setClasses(usable);
      if (usable.length) setClassId(usable[0].id);
    });
  }, []);
  return { classes, error, classId, setClassId };
}

function NewHeader({ title, onBack }: { title: React.ReactNode; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--c-line)' }}>
      <button type="button" onClick={onBack} aria-label="Back to all messages" title="Back"
        style={{ ...small, display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--c-fg)' }}>
        <ArrowLeft size={14} aria-hidden="true" />
      </button>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-fg)', flex: 1 }}>{title}</div>
    </div>
  );
}

function ClassPick({ classes, classId, setClassId }: { classes: PeopleClass[]; classId: string; setClassId: (id: string) => void }) {
  if (classes.length < 2) return null;
  return (
    <label style={{ fontSize: 12, color: 'var(--c-meta)', display: 'flex', alignItems: 'center', gap: 6 }}>
      Class
      <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ ...field, padding: '3px 6px' }}>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

const status = (text: string, color = 'var(--c-dim)') => <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.5, color }}>{text}</p>;

export function NewMessage({ onBack, onSent }: { onBack: () => void; onSent: (id: string) => void }) {
  const { classes, error, classId, setClassId } = useClasses();
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState('');

  const cls = classes?.find((c) => c.id === classId) ?? null;
  const people = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (cls?.people ?? []).filter((p) => !f || p.name.toLowerCase().includes(f));
  }, [cls, filter]);
  const person = cls?.people.find((p) => p.key === to) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <NewHeader onBack={person ? () => setTo('') : onBack}
        title={person ? <>To {person.name}{person.teacher && <TeacherTag name={person.name} />}</> : 'New message'} />
      {error && status(error, 'var(--c-red)')}
      {!classes && !error && status('Loading…')}
      {classes && !classes.length && status('You are not in a class yet. Once you are, you can message the people in it.')}
      {cls && !person && (
        <>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--c-line)' }}>
            <ClassPick classes={classes!} classId={classId} setClassId={(id) => { setClassId(id); setTo(''); }} />
            <label htmlFor="mailbox-filter" className="sr-only">Find a person</label>
            <input id="mailbox-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a person" autoFocus style={field} />
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
            {!people.length && !cls.allBlocked && <li style={{ padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>No one by that name in {cls.name}.</li>}
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

export function NewGroup({ onBack, onMade }: { onBack: () => void; onMade: (id: string) => void }) {
  const { classes, error, classId, setClassId } = useClasses(true);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const cls = classes?.find((c) => c.id === classId) ?? null;
  const blocked = cls && !cls.teaches ? cls.classmatesBlocked : null;

  const make = async () => {
    if (!cls || !chosen.size || busy) return;
    setBusy(true);
    setProblem(null);
    const r = await createGroup(cls.id, [...chosen], title);
    setBusy(false);
    if (!r.ok) { setProblem(r.error); return; }
    onMade(r.value.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <NewHeader onBack={onBack} title="New group" />
      {error && status(error, 'var(--c-red)')}
      {!classes && !error && status('Loading…')}
      {classes && !classes.length && status('You are not in a class yet. Once you are, you can make a group with people in it.')}
      {cls && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
          <ClassPick classes={classes!} classId={classId} setClassId={(id) => { setClassId(id); setChosen(new Set()); }} />
          {blocked ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--c-meta)' }}>{blockText(blocked, '', cls.name)}</p>
          ) : (
            <>
              <label style={{ fontSize: 12, color: 'var(--c-meta)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                Name (you can leave it empty)
                <input value={title} maxLength={GROUP_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Maze team" style={field} data-testid="group-title" />
              </label>
              <div style={{ fontSize: 12, color: 'var(--c-meta)' }}>People ({chosen.size + 1} of {GROUP_MAX_PEOPLE}, you included)</div>
              <PeoplePicker cls={cls} chosen={chosen} setChosen={setChosen} room={GROUP_MAX_PEOPLE - 1} />
              <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>{cls.teaches ? `In ${cls.name}.` : `In ${cls.name}. Your teacher can read this group.`}</p>
              {problem && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--c-red)' }}>{problem}</p>}
              <div><button type="button" onClick={() => void make()} disabled={busy || !chosen.size} style={primary(busy || !chosen.size)} data-testid="group-create">
                {busy ? 'Making it…' : 'Make the group'}
              </button></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function NewChannel({ onBack, onMade }: { onBack: () => void; onMade: (id: string) => void }) {
  const { classes, error, classId, setClassId } = useClasses(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const cls = classes?.find((c) => c.id === classId) ?? null;
  const blocked = cls && !cls.teaches ? cls.classmatesBlocked : null;
  const tidy = cleanChannelName(name);

  const make = async () => {
    if (!cls || busy) return;
    if ('error' in tidy) { setProblem(tidy.error); return; }
    setBusy(true);
    setProblem(null);
    const r = await createChannel(cls.id, tidy.name);
    setBusy(false);
    if (!r.ok) { setProblem(r.error); return; }
    onMade(r.value.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <NewHeader onBack={onBack} title="New channel" />
      {error && status(error, 'var(--c-red)')}
      {!classes && !error && status('Loading…')}
      {classes && !classes.length && status('You are not in a class yet.')}
      {cls && (
        <form onSubmit={(e) => { e.preventDefault(); void make(); }} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ClassPick classes={classes!} classId={classId} setClassId={setClassId} />
          {blocked ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--c-meta)' }}>{blockText(blocked, '', cls.name)}</p>
          ) : (
            <>
              <label style={{ fontSize: 12, color: 'var(--c-meta)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                Name
                <input value={name} autoFocus maxLength={CHANNEL_NAME_MAX + 10} onChange={(e) => { setName(e.target.value); setProblem(null); }}
                  placeholder="game-ideas" style={field} data-testid="channel-name" />
              </label>
              {'name' in tidy && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-meta)' }}>It will be <strong>#{tidy.name}</strong>. Everyone in {cls.name} can read it and post in it.</p>}
              {problem && <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--c-red)' }}>{problem}</p>}
              <div><button type="submit" disabled={busy || !name.trim()} style={primary(busy || !name.trim())} data-testid="channel-create">
                {busy ? 'Making it…' : 'Make the channel'}
              </button></div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

/** The pieces for a new message, group or channel, by view. */
export function NewThing({ view, onBack, onOpen }: { view: MailView; onBack: () => void; onOpen: (id: string) => void }) {
  if (view.kind === 'new') return <NewMessage onBack={onBack} onSent={onOpen} />;
  if (view.kind === 'new-group') return <NewGroup onBack={onBack} onMade={onOpen} />;
  if (view.kind === 'new-channel') return <NewChannel onBack={onBack} onMade={onOpen} />;
  return null;
}

/** The conversations, asked again every THREAD_POLL_MS while `active` and visible. */
export function useThreads(active: boolean): { threads: ThreadSummary[] | null; error: string | null; reload: () => void } {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetchThreads();
    if (r.ok) { setThreads(r.value); setError(null); } else setError(r.error);
  }, []);
  useEffect(() => {
    if (!active) return;
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, THREAD_POLL_MS);
    return () => window.clearInterval(t);
  }, [active, load]);
  return { threads, error, reload: () => void load() };
}

/** The envelope dropdown's Messages tab. */
export default function Mailbox({ active }: { active: boolean }) {
  const [view, setView] = useState<MailView>({ kind: 'list' });
  const { threads, error, reload } = useThreads(active && view.kind === 'list');
  const toList = () => { setView({ kind: 'list' }); reload(); };

  if (view.kind === 'thread') return <ThreadPane id={view.id} onBack={toList} onGone={toList} />;
  if (view.kind !== 'list') return <NewThing view={view} onBack={toList} onOpen={(id) => setView({ kind: 'thread', id })} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><NewButtons onPick={setView} /></div>
        <a href="/messages/" title="Open Messages as a full page" aria-label="Open Messages as a full page" data-testid="mailbox-full"
          style={{ ...small, display: 'inline-flex', alignItems: 'center', padding: 5, color: 'var(--c-fg)', textDecoration: 'none' }}>
          <Maximize2 size={13} aria-hidden="true" />
        </a>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <ConversationList threads={threads} error={error} onOpen={(id) => setView({ kind: 'thread', id })} />
      </div>
    </div>
  );
}
