'use client';

// Code together (codehs-review/REALTIME-SPEC.md, Part 2): 2-4 classmates edit
// ONE sandbox program at the same time. The sandbox's JavaScript and moSHion
// modes only, never a lesson (a lesson is a student's own graded work).
//
// Two pieces, both drawn here because one component owns the session:
//   - the POPUP (a modal dialog), opened by the toolbar's Code together button.
//     Not in a session: Start (2-4 people), join by code or by pictures, and
//     Open sessions in your classes for this mode. In a session: the code to
//     share again (big pictures with their letters), who is here. The editor
//     keeps its full height while you choose. It is put in `dialogHost` (the
//     sandbox shell, which is what goes full screen) so it shows there too.
//   - the STRIP above the editor while in a session: one slim line (about the
//     editor's file toolbar) with "Coding together", the code's pictures small,
//     Copy, who is here with their colour dots, a short note when something
//     happened ("Ana P. left.", offline), Leave, and a chevron that shows the
//     details (the code big with letters for reading aloud, the teacher note,
//     the notes in full). The details start open the first time and closed
//     after that; a student's own choice is remembered in this browser.
//     After a session ends, a slim line keeps the ending note until dismissed.
// The look is the moSHion lobby bar's (components/MoshionLobby.tsx, whose
// picture picker and code pictures it reuses). A session is a room of kind
// 'code' (POST /api/rooms, migration 0044); the shared editing itself is
// lib/live-doc.ts, handed to the editor through `onCollab`.
//
// Joining asks first and keeps the joiner's own code as a History snapshot
// before the shared text replaces it (no question when that code is still the
// untouched starter, or empty: there is nothing to lose). Leaving, or the host
// ending the session, keeps the shared program as this student's own sandbox
// draft (`keepCopy`, the sandbox's normal save path). The host's Leave ends the
// session for everyone, so it asks first; anyone else just leaves. Students are
// told the teacher can read it: the session's text is kept for the class's
// teachers (code_sessions).

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Extension } from '@codemirror/state';
import { CODE_PLACEHOLDER, CodePictures, PickPicturesToggle, PicturePicker, lobbyStyles } from './MoshionLobby';
import { LiveDocClient, seatColor, type DocEnded, type DocStatus } from '../lib/live-doc';
import { CODE_ROOM_GAMES, type CodeLang } from '../lib/live-protocol';
import { deviceId } from '../lib/moshion-online';
import { leaveOnUnload, leaveRoom } from '../lib/room-leave';
import { codeIcons } from '../lib/room-icons';

const { bar, row, btn, quiet, dim, codeInput, listItem } = lobbyStyles;
const LIST_MS = 3000;
/** A Leave request this slow does not hold the open-sessions list up any longer. */
const LEAVE_WAIT_MS = 4000;
export const TEACHER_NOTE = 'Your teacher can see programs you write together.';
const JOIN_CONFIRM = 'Your sandbox code will be swapped for the shared program. Your own code is kept in History.';
export const HOST_LEAVE_CONFIRM = 'Leave and end the session for everyone? Everyone keeps a copy.';
const LANG_NAME: Record<CodeLang, string> = { js: 'JavaScript', moshion: 'moSHion' };
/** Whether the strip's details are open: 'open' | 'closed' (absent: never in a session in this browser). */
const DETAILS_KEY = 'shCode:together-details';
/** Below this the strip's label is for screen readers only. */
const NARROW_PX = 520;

interface OpenSession { code: string; host: string; seats: number; present: number; here: boolean }
type ListState =
  | { kind: 'loading' }
  | { kind: 'rooms'; rooms: OpenSession[] }
  | { kind: 'no-class' }
  | { kind: 'error'; text: string };

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let b: Record<string, unknown> = {};
  try { b = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: b };
}

function errorOf(r: { status: number; body: Record<string, unknown> }): string {
  if (r.status === 401) return 'Sign in to code together.';
  return typeof r.body.error === 'string' ? r.body.error : `Code together failed (${r.status}).`;
}

function readDetails(): 'open' | 'closed' | null {
  try {
    const v = window.localStorage.getItem(DETAILS_KEY);
    return v === 'open' || v === 'closed' ? v : null;
  } catch { return null; }
}
function writeDetails(v: 'open' | 'closed') {
  try { window.localStorage.setItem(DETAILS_KEY, v); } catch { /* private mode: open the first time each visit */ }
}

/**
 * Whether this student may code together in this mode: signed in and in a
 * live class (the open-sessions list answers inClass). The button is absent
 * otherwise, like Publish game.
 */
export function useCodeTogetherAvailable(lang: CodeLang | null, authed: boolean): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(false);
    if (!lang || !authed) return;
    let live = true;
    fetch(`/api/rooms?game=${CODE_ROOM_GAMES[lang]}&kind=code&device=${encodeURIComponent(deviceId())}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (live) setOk(!!b && b.inClass === true); })
      .catch(() => { /* no list: no button */ });
    return () => { live = false; };
  }, [lang, authed]);
  return ok;
}

function endedNote(e: DocEnded): string {
  if (e.why === 'host') return `${e.host || 'The host'} ended the session. You kept a copy.`;
  if (e.why === 'host-gone') return `${e.host || 'The host'} left, so the session ended. You kept a copy.`;
  if (e.why === 'expired') return 'This session has ended: sessions last 3 hours. You kept a copy.';
  if (e.why === 'left') return 'You left the session. You kept a copy.';
  if (e.why === 'replaced') return 'This session opened again in another tab, so it stopped here. You kept a copy.';
  return `${e.reason || 'That session has ended.'} You kept a copy.`;
}

export interface CodeTogetherBarProps {
  lang: CodeLang;
  /** The editor's text now: the host's starting program. */
  getText: () => string;
  /** The editor still holds the mode's untouched starter (or nothing): joining loses nothing, so it does not ask. */
  isUntouched: () => boolean;
  /** The current files, kept as a History snapshot before joining. */
  snapshot: (label: string) => void;
  /** The shared-editing extension for the editor, or null to give the editor back. */
  onCollab: (ext: Extension | null) => void;
  /** In a session or not (the sandbox locks Reset and the mode tabs while it is). */
  onActive: (active: boolean) => void;
  /** How many people are in the session now (the toolbar button says "Coding together · 2"). */
  onHere?: (n: number) => void;
  /** Keep the shared program as this student's own draft (the sandbox's save path). */
  keepCopy: () => void;
  /** The popup is showing (the toolbar button opens it). */
  open: boolean;
  /** Close the popup (Escape, the backdrop, Close, or a session starting). */
  onOpenChange: (open: boolean) => void;
  /** Where the popup is put: the sandbox shell, which is what goes full screen. */
  dialogHost?: HTMLElement | null;
}

interface Session { code: string; hosting: boolean }

export default function CodeTogetherBar({
  lang, getText, isUntouched, snapshot, onCollab, onActive, onHere, keepCopy, open, onOpenChange, dialogHost,
}: CodeTogetherBarProps) {
  const [device] = useState(() => (typeof window === 'undefined' ? '' : deviceId()));
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<DocStatus | null>(null);
  const [people, setPeople] = useState(2);
  const [typed, setTyped] = useState('');
  const [picking, setPicking] = useState(false);
  const [list, setList] = useState<ListState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // A narrow strip (full screen floats the editor at 420 px) drops the words
  // "Coding together" from sight, so a note keeps its room.
  const [narrow, setNarrow] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<LiveDocClient | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  /**
   * The Leave request still on its way. The open-sessions list waits for it:
   * loaded at the same moment as the leave, the server could still count this
   * tab ("2 of 2 here" right after leaving).
   */
  const leaving = useRef<Promise<void> | null>(null);
  // The callbacks change identity with the sandbox's renders; the client holds the latest.
  const cb = useRef({ getText, isUntouched, snapshot, onCollab, onActive, keepCopy, onOpenChange, onHere });
  cb.current = { getText, isUntouched, snapshot, onCollab, onActive, keepCopy, onOpenChange, onHere };
  const game = CODE_ROOM_GAMES[lang];
  const uid = useId();
  const detailsId = `${uid}-details`;

  // Open sessions for this mode, while the popup shows and this tab is not in one.
  useEffect(() => {
    if (session || !open) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setList({ kind: 'loading' });
    async function load() {
      const wait = leaving.current;
      if (wait) {
        await Promise.race([wait, new Promise((ok) => setTimeout(ok, LEAVE_WAIT_MS))]);
        if (leaving.current === wait) leaving.current = null;
        if (!live) return;
      }
      try {
        const r = await api('GET', `/api/rooms?game=${game}&kind=code&device=${encodeURIComponent(device)}`);
        if (!live) return;
        if (r.status !== 200) setList({ kind: 'error', text: errorOf(r) });
        else if (r.body.inClass === false) setList({ kind: 'no-class' });
        else setList({ kind: 'rooms', rooms: Array.isArray(r.body.rooms) ? (r.body.rooms as OpenSession[]) : [] });
      } catch {
        if (live) setList({ kind: 'error', text: 'Could not reach the server. Trying again.' });
      }
      if (live) timer = setTimeout(() => void load(), document.hidden ? LIST_MS * 3 : LIST_MS);
    }
    void load();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [session, open, game, device]);

  const inSession = !!session;
  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < NARROW_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, [inSession]);

  const here = session ? Math.max(1, status?.players.length ?? 0) : 0;
  useEffect(() => { cb.current.onHere?.(here); }, [here]);

  /** The editor goes back to being yours, with the shared text kept as your draft. */
  const finish = useCallback((text: string | null) => {
    clientRef.current?.stop();
    clientRef.current = null;
    cb.current.onCollab(null);
    cb.current.onActive(false);
    cb.current.keepCopy();
    setSession(null);
    setStatus(null);
    setBusy(false);
    setNote(text);
  }, []);

  const enter = useCallback((code: string, hosting: boolean) => {
    const client = new LiveDocClient({
      code,
      device,
      seed: hosting ? () => cb.current.getText() : null,
      onStatus: (s) => { if (clientRef.current === client) setStatus(s); },
      onEnded: (e) => { if (clientRef.current === client) finish(endedNote(e)); },
    });
    clientRef.current = client;
    setSession({ code, hosting });
    setStatus(null);
    setError(null);
    setNote(null);
    setBusy(false);
    // The details start open the first time this browser is in a session, closed after that, or as the student left them.
    const saved = readDetails();
    setExpanded(saved === null ? true : saved === 'open');
    if (saved === null) writeDetails('closed');
    cb.current.onActive(true);
    cb.current.onCollab(client.extension);
    cb.current.onOpenChange(false);
    client.start();
  }, [device, finish]);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await api('POST', '/api/rooms', { kind: 'code', game, seats: people, device });
      if (r.status !== 201) { setError(errorOf(r)); setBusy(false); return; }
      enter(String(r.body.code), true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  }

  async function join(raw: string) {
    if (busy) return;
    const want = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
    if (!codeIcons(want) && !/^[A-Z0-9]{6}$/.test(want)) { setError('A session code is 4 pictures (4 letters, like BHKE).'); return; }
    const untouched = cb.current.isUntouched();
    if (!untouched && !window.confirm(JOIN_CONFIRM)) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await api('POST', `/api/rooms/${encodeURIComponent(want)}/join`, { device, kind: 'code' });
      if (r.status !== 200) { setError(errorOf(r)); setBusy(false); return; }
      if (!untouched) cb.current.snapshot('Before Code together');
      setTyped('');
      setPicking(false);
      enter(String(r.body.code), false);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  }

  function leave() {
    const s = sessionRef.current;
    if (!s) return;
    // The host's leaving closes the session for everyone (leave.ts), so say so first.
    if (s.hosting && !window.confirm(HOST_LEAVE_CONFIRM)) return;
    // Sent before the list can reload, and the list waits for it (see `leaving`).
    leaving.current = leaveRoom(s.code, device);
    finish(s.hosting ? 'You ended the session. You kept a copy.' : 'You left the session. You kept a copy.');
  }

  // Closing the tab (or reloading it, or going to another page) leaves the
  // session with a beacon that still gets out as the tab goes (the host's
  // leaving ends it); the sandbox's own save on hide keeps the draft. A page
  // the browser kept and shows again (Back) is out of the session too.
  useEffect(() => {
    let leftOnHide: Session | null = null;
    const onHide = () => {
      const s = sessionRef.current;
      if (!s) return;
      clientRef.current?.stop();
      leaveOnUnload(s.code, device);
      leftOnHide = s;
    };
    const onShow = (e: PageTransitionEvent) => {
      const s = leftOnHide;
      leftOnHide = null;
      if (e.persisted && s && sessionRef.current === s) {
        finish(s.hosting ? 'You ended the session. You kept a copy.' : 'You left the session. You kept a copy.');
      }
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
      const s = sessionRef.current;
      if (s) {
        clientRef.current?.stop();
        clientRef.current = null;
        void leaveRoom(s.code, device);
        cb.current.onCollab(null);
        cb.current.onActive(false);
      }
    };
  }, [device, finish]);

  const copy = async () => {
    const s = sessionRef.current;
    if (!s) return;
    try { await navigator.clipboard.writeText(s.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the code is on screen */ }
  };

  const toggleDetails = () => {
    setExpanded((was) => {
      writeDetails(was ? 'closed' : 'open');
      return !was;
    });
  };

  const close = useCallback(() => cb.current.onOpenChange(false), []);

  // ---- in a session ----------------------------------------------------------
  const st = status;
  const players = st?.players ?? [];
  // Everyone here in seat order, each with the colour their caret wears in the
  // editor; this tab's own entry says "you" (it is how the others see you).
  const mySeat = st?.seat ?? -1;
  const listed = players.some((p) => p.seat === mySeat) ? [...players] : [...players, { seat: mySeat, name: '', left: false }];
  listed.sort((a, b) => a.seat - b.seat);
  // The state of the connection, short for the strip and in full for the details.
  let shortLine: string | null = null;
  let longLine: string | null = null;
  if (session) {
    if (!st || st.phase === 'connecting') shortLine = longLine = 'Connecting...';
    else if (st.phase === 'reconnecting') {
      shortLine = 'Offline: reconnecting...';
      longLine = 'Offline: trying to reconnect. Your typing will be shared when you are back.';
    } else if (players.length <= 1) {
      shortLine = session.hosting ? 'Waiting for classmates' : 'Waiting for the others';
      longLine = session.hosting
        ? `Waiting for classmates (up to ${st.seats || people} people): they can pick this session from Open sessions, or type the code.`
        : 'Waiting for the others to come back.';
    }
  }
  // What the strip's one line says after the people: a problem first, then something that happened, then the state.
  const stripNote = st?.error
    ? { text: st.error, color: 'var(--c-red)' }
    : st?.notice
      ? { text: st.notice, color: 'var(--c-orange)' }
      : shortLine
        ? { text: shortLine, color: 'var(--c-dim)' }
        : null;

  // Who is here, each with their colour dot. In the strip it is one line that
  // ends in "..." when it runs out of room (the note beside it is kept whole);
  // the popup and the details have room for everyone.
  const peopleList = (wrap: boolean) => (
    <span
      data-testid={wrap ? undefined : 'together-people'}
      aria-live={wrap ? undefined : 'polite'}
      style={wrap
        ? { minWidth: 0, display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 }
        // Gives up its room before the note beside it (S.stripRest).
        : { minWidth: 0, flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      <span className="sr-only">{here} here: </span>
      {listed.map((p, i) => (
        <span
          key={p.seat}
          data-seat={p.seat}
          style={wrap
            ? { display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, overflowWrap: 'anywhere' }
            : { marginLeft: i ? 10 : 0 }}
        >
          {p.seat >= 0 ? (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: seatColor(p.seat), flex: 'none',
                ...(wrap ? {} : { marginRight: 5, verticalAlign: 'middle', position: 'relative', top: -1 }),
              }}
            />
          ) : null}
          {p.seat === mySeat ? (p.name ? `${p.name} (you)` : 'you') : p.name}
        </span>
      ))}
    </span>
  );

  const strip = session ? (
    <div
      ref={stripRef}
      style={{ ...bar, gap: 0, padding: 0, maxHeight: '45%' }}
      role="region"
      aria-label="Code together"
      data-testid="code-together"
      data-expanded={expanded ? 'true' : 'false'}
    >
      <div style={S.stripRow}>
        <strong style={S.stripLabel} className={narrow ? 'sr-only' : undefined}>Coding together</strong>
        <span data-testid="together-code" data-code={session.code} style={{ flex: 'none', display: 'inline-flex' }}>
          <CodePictures code={session.code} size={18} letters={false} />
        </span>
        <button type="button" style={S.small} onClick={() => void copy()} aria-label={`Copy session code ${session.code}`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span style={{ ...dim, flex: 'none' }} aria-hidden="true">·</span>
        {/* The room left over: the people give theirs up first, then the note; the rest of the line never moves. */}
        <span style={S.stripRest}>
          {peopleList(false)}
          {stripNote ? (
            <span
              data-testid={st?.error ? undefined : st?.notice ? 'together-notice' : 'together-status'}
              role={st?.error ? 'alert' : 'status'}
              title={st?.error || st?.notice || longLine || undefined}
              style={{ ...S.stripNote, color: stripNote.color }}
            >
              {stripNote.text}
            </span>
          ) : null}
        </span>
        <button type="button" style={S.small} onClick={leave}>Leave</button>
        <button
          type="button"
          style={{ ...S.small, padding: '2px 4px', display: 'inline-flex', alignItems: 'center' }}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label="Session details"
          title={expanded ? 'Hide the details' : 'Show the code big, and the details'}
          onClick={toggleDetails}
        >
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
      </div>
      {expanded ? (
        <div id={detailsId} style={S.details} data-testid="together-details">
          <div style={row}>
            <CodePictures code={session.code} size={28} letters />
            <span style={dim}>
              {session.hosting
                ? 'Read the pictures out, or classmates can pick this session from Open sessions.'
                : 'The session code: read the pictures out to bring someone in.'}
            </span>
          </div>
          {/* The host's "waiting" sentence would only say again how to share the code (the line above). */}
          {longLine && !(session.hosting && players.length <= 1 && st?.phase === 'live') ? <div style={dim}>{longLine}</div> : null}
          {st?.notice ? <div style={{ color: 'var(--c-orange)' }}>{st.notice}</div> : null}
          {st?.error ? <div style={{ color: 'var(--c-red)' }}>{st.error}</div> : null}
          <div style={{ ...dim, fontSize: '0.72rem' }}>{TEACHER_NOTE}</div>
        </div>
      ) : null}
    </div>
  ) : note && !open ? (
    // The session ended (Leave, the host, the host gone): said where it was, until dismissed.
    <div style={{ ...bar, gap: 0, padding: 0 }} data-testid="together-ended">
      <div style={S.stripRow}>
        <span role="status" data-testid="together-note" style={{ ...S.stripNote, flex: '0 1 auto', color: 'var(--c-orange)' }} title={note}>
          {note}
        </span>
        <span style={{ flex: '1 1 0', minWidth: 0 }} />
        <button type="button" style={S.small} onClick={() => setNote(null)} aria-label="Dismiss this note">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  ) : null;

  // ---- the popup ------------------------------------------------------------
  const blocked = list.kind === 'no-class';
  const dialog = !open ? null : (
    <CodeTogetherDialog title={session ? 'Coding together' : 'Code together'} onClose={close}>
      {session ? (
        <>
          <p style={S.lead}>
            {session.hosting
              ? 'Share this code: classmates pick your session from Open sessions, or type its 4 letters.'
              : 'This session’s code, to bring someone else in.'}
          </p>
          <div style={{ ...row, gap: 10 }}>
            <CodePictures code={session.code} size={40} letters />
            <button type="button" style={quiet} onClick={() => void copy()} aria-label={`Copy session code ${session.code}`}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={row}>{peopleList(true)}</div>
          {longLine ? <div style={dim}>{longLine}</div> : null}
          {st?.notice ? <div style={{ color: 'var(--c-orange)' }}>{st.notice}</div> : null}
          <div style={{ ...dim, fontSize: '0.75rem' }}>{TEACHER_NOTE}</div>
        </>
      ) : (
        <>
          <p style={S.lead}>Write one program with classmates, at the same time.</p>
          {note ? <div aria-live="polite" style={{ color: 'var(--c-orange)' }} data-testid="together-note">{note}</div> : null}
          {error ? <div role="alert" style={{ color: 'var(--c-red)' }}>{error}</div> : null}
          {blocked ? (
            <div>Join a class to code together.</div>
          ) : (
            <>
              <section style={S.section} aria-labelledby={`${uid}-start`}>
                <h3 id={`${uid}-start`} style={S.h3}>Start a session</h3>
                <div style={row}>
                  <label htmlFor="code-together-people" style={dim}>People</label>
                  <select
                    id="code-together-people"
                    value={people}
                    onChange={(e) => setPeople(Number(e.target.value))}
                    disabled={busy}
                    style={{
                      padding: '3px 4px', fontSize: '0.8rem', background: 'var(--c-bg)', color: 'var(--c-fg)',
                      border: '1px solid var(--c-line)', borderRadius: 4,
                    }}
                  >
                    {[2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button type="button" style={btn} disabled={busy} onClick={() => void start()}>Start</button>
                </div>
              </section>
              <section style={S.section} aria-labelledby={`${uid}-join`}>
                <h3 id={`${uid}-join`} style={S.h3}>Join with a code</h3>
                <div style={row}>
                  <form style={{ ...row, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); void join(typed); }}>
                    <label htmlFor="code-together-code" style={dim}>Code</label>
                    <input
                      id="code-together-code"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      maxLength={6}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={CODE_PLACEHOLDER}
                      style={codeInput}
                    />
                    <button type="submit" style={quiet} disabled={busy || !typed.trim()}>Join</button>
                  </form>
                  <PickPicturesToggle open={picking} setOpen={setPicking} controls="code-together-pictures" />
                </div>
                {picking ? <PicturePicker id="code-together-pictures" typed={typed} setTyped={setTyped} busy={busy} /> : null}
              </section>
              <section style={S.section} aria-labelledby={`${uid}-open`}>
                <h3 id={`${uid}-open`} style={S.h3}>Open {LANG_NAME[lang]} sessions in your classes</h3>
                {list.kind === 'loading' ? <div style={dim}>looking...</div> : null}
                {list.kind === 'error' ? <div style={dim}>{list.text}</div> : null}
                {list.kind === 'rooms' && list.rooms.length === 0 ? (
                  <div style={dim}>None yet. Start one, or wait for a classmate to start one.</div>
                ) : null}
                {list.kind === 'rooms' && list.rooms.length > 0 ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }} data-testid="together-sessions">
                    {list.rooms.map((r) => (
                      <li key={r.code} style={listItem}>
                        <CodePictures code={r.code} size={22} letters={false} />
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{r.host}&apos;s {LANG_NAME[lang]} session</span>
                        <span style={dim}>{r.present} of {r.seats} here</span>
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          style={quiet}
                          disabled={busy}
                          onClick={() => void join(r.code)}
                          aria-label={`${r.here ? 'Rejoin' : 'Join'} ${r.host}'s ${LANG_NAME[lang]} session, ${r.present} of ${r.seats} here`}
                        >
                          {r.here ? 'Rejoin' : 'Join'} {r.host}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
              <div style={{ ...dim, fontSize: '0.75rem' }}>{TEACHER_NOTE}</div>
            </>
          )}
        </>
      )}
    </CodeTogetherDialog>
  );

  return (
    <>
      {strip}
      {dialog && typeof document !== 'undefined' ? createPortal(dialog, dialogHost ?? document.body) : null}
    </>
  );
}

const S = {
  stripRow: {
    display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'nowrap',
    padding: '4px 8px', minHeight: 30, boxSizing: 'border-box',
  } as React.CSSProperties,
  small: {
    ...quiet, padding: '2px 8px', fontSize: 11, flex: 'none',
  } as React.CSSProperties,
  /** Gives way only on a line too narrow for even the fixed parts, so Leave and the chevron always stay on it. */
  stripLabel: {
    flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  /** The room between Copy and Leave (a zero basis: it takes what is left and never pushes anything out). */
  stripRest: {
    flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden',
  } as React.CSSProperties,
  /** The strip's note keeps its room (the people beside it shrink first), at most the whole of what is left. */
  stripNote: {
    minWidth: 0, flex: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  details: {
    display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 10px 8px',
  } as React.CSSProperties,
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1900, background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  } as React.CSSProperties,
  dialog: {
    background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderTop: '3px solid var(--brand)',
    borderRadius: 8, width: 'min(560px, 100%)', maxHeight: 'min(90vh, 760px)', display: 'flex', flexDirection: 'column',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)', outline: 'none', fontSize: '0.85rem', lineHeight: 1.4,
  } as React.CSSProperties,
  head: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 10px', borderBottom: '1px solid var(--c-line)' } as React.CSSProperties,
  title: { margin: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  close: {
    marginLeft: 'auto', background: 'none', border: '1px solid var(--c-line)', color: 'var(--c-fg)', borderRadius: 4,
    width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: 'pointer', flexShrink: 0,
  } as React.CSSProperties,
  body: {
    overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 16px 16px',
    display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
  } as React.CSSProperties,
  lead: { margin: 0, color: 'var(--c-dim)' } as React.CSSProperties,
  section: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } as React.CSSProperties,
  h3: { margin: 0, fontSize: '0.85rem', fontWeight: 700 } as React.CSSProperties,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The modal: focus moves in (to the dialog itself, so its name is read first)
 * and back to what had it when it closes; Tab stays inside; Escape, Close and
 * a click on the backdrop close it. The same rules as components/WhatsNewModal.tsx.
 */
function CodeTogetherDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // What had focus when it opened (the toolbar button), read while rendering: by
  // the time an effect runs a second time (React's dev checks) the dialog has it.
  const [returnTo] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)));

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCloseRef.current(); }
    };
    // Focus that wanders out (a click on the page behind, a script) comes back in.
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) ref.current.focus();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = prevOverflow;
      // Back to the opener (the toolbar's Code together button), once this has gone.
      const back = returnTo && returnTo !== document.body && returnTo.isConnected ? returnTo : null;
      window.setTimeout(() => back?.focus?.(), 0);
    };
  }, [returnTo]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !ref.current) return;
    const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (els.length === 0) { e.preventDefault(); return; }
    const i = els.indexOf(document.activeElement as HTMLElement);
    const to = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === -1 || i === els.length - 1 ? 0 : i + 1);
    e.preventDefault();
    els[to].focus();
  }

  return (
    <div style={S.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={S.dialog}
        data-testid="code-together-dialog"
      >
        <div style={S.head}>
          <h2 id={titleId} style={S.title}>{title}</h2>
          <button type="button" style={S.close} onClick={onClose} aria-label="Close Code together">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div style={S.body}>{children}</div>
      </div>
    </div>
  );
}
