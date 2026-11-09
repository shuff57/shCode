'use client';

// Code together (codehs-review/REALTIME-SPEC.md, Part 2): 2-4 classmates edit
// ONE sandbox program at the same time. The sandbox's JavaScript and moSHion
// modes only, never a lesson (a lesson is a student's own graded work).
//
// The bar sits above the sandbox editor and wears the moSHion lobby bar's look
// (components/MoshionLobby.tsx, whose picture picker and code pictures it
// reuses). Not in a session: Start (2-4 people), join by code or by pictures,
// and Open sessions in your classes for this mode. In a session: the code, who
// is here, and Leave. A session is a room of kind 'code' (POST /api/rooms,
// migration 0044); the shared editing itself is lib/live-doc.ts, handed to the
// editor through `onCollab`.
//
// Joining asks first and keeps the joiner's own code as a History snapshot
// before the shared text replaces it (no question when that code is still the
// untouched starter, or empty: there is nothing to lose). Leaving, or the host
// ending the session, keeps the shared program as this student's own sandbox
// draft (`keepCopy`, the sandbox's normal save path). The host's Leave ends the
// session for everyone, so it asks first; anyone else just leaves. Students are told the teacher can read it: the
// session's text is kept for the class's teachers (code_sessions).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Extension } from '@codemirror/state';
import { CODE_PLACEHOLDER, CodePictures, PickPicturesToggle, PicturePicker, lobbyStyles } from './MoshionLobby';
import { LiveDocClient, seatColor, type DocEnded, type DocStatus } from '../lib/live-doc';
import { CODE_ROOM_GAMES, type CodeLang } from '../lib/live-protocol';
import { deviceId } from '../lib/moshion-online';
import { leaveOnUnload, leaveRoom } from '../lib/room-leave';
import { codeIcons } from '../lib/room-icons';

const { bar, row, btn, quiet, dim, codeInput, listItem } = lobbyStyles;
const LIST_MS = 3000;
export const TEACHER_NOTE = 'Your teacher can see programs you write together.';
const JOIN_CONFIRM = 'Your sandbox code will be swapped for the shared program. Your own code is kept in History.';
export const HOST_LEAVE_CONFIRM = 'Leave and end the session for everyone? Everyone keeps a copy.';
const LANG_NAME: Record<CodeLang, string> = { js: 'JavaScript', moshion: 'moSHion' };

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
  /** Keep the shared program as this student's own draft (the sandbox's save path). */
  keepCopy: () => void;
  /** Hide the bar (only offered when not in a session). */
  onClose: () => void;
}

interface Session { code: string; hosting: boolean }

export default function CodeTogetherBar({ lang, getText, isUntouched, snapshot, onCollab, onActive, keepCopy, onClose }: CodeTogetherBarProps) {
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
  const clientRef = useRef<LiveDocClient | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  // The callbacks change identity with the sandbox's renders; the client holds the latest.
  const cb = useRef({ getText, isUntouched, snapshot, onCollab, onActive, keepCopy });
  cb.current = { getText, isUntouched, snapshot, onCollab, onActive, keepCopy };
  const game = CODE_ROOM_GAMES[lang];

  // Open sessions for this mode, while not in one.
  useEffect(() => {
    if (session) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function load() {
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
  }, [session, game, device]);

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
    cb.current.onActive(true);
    cb.current.onCollab(client.extension);
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
    finish(s.hosting ? 'You ended the session. You kept a copy.' : 'You left the session. You kept a copy.');
    void leaveRoom(s.code, device);
  }

  // Closing the tab leaves the session (the host's leaving ends it); the
  // sandbox's own save on hide keeps the draft. Leaving the page does the same.
  useEffect(() => {
    const onHide = () => {
      const s = sessionRef.current;
      if (!s) return;
      clientRef.current?.stop();
      leaveOnUnload(s.code, device);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      const s = sessionRef.current;
      if (s) {
        clientRef.current?.stop();
        clientRef.current = null;
        void leaveRoom(s.code, device);
        cb.current.onCollab(null);
        cb.current.onActive(false);
      }
    };
  }, [device]);

  if (session) {
    const st = status;
    const players = st?.players ?? [];
    const here = players.length || 1;
    // Everyone here in seat order, each with the colour their caret wears in
    // the editor; this tab's own entry says "you" (it is how the others see you).
    const mySeat = st?.seat ?? -1;
    const listed = players.some((p) => p.seat === mySeat) ? [...players] : [...players, { seat: mySeat, name: '', left: false }];
    listed.sort((a, b) => a.seat - b.seat);
    const copy = async () => {
      try { await navigator.clipboard.writeText(session.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the code is on screen */ }
    };
    let line: string | null = null;
    if (!st || st.phase === 'connecting') line = 'Connecting...';
    else if (st.phase === 'reconnecting') line = 'Offline: trying to reconnect. Your typing will be shared when you are back.';
    else if (players.length <= 1) line = session.hosting
      ? `Waiting for classmates (up to ${st.seats || people} people): they can pick this session from Open sessions, or type the code.`
      : 'Waiting for the others to come back.';
    return (
      <div style={bar} role="region" aria-label="Code together" data-testid="code-together">
        <div style={row}>
          <strong>Coding together</strong>
          <span style={dim} aria-hidden="true">·</span>
          <span data-testid="together-code" data-code={session.code}><CodePictures code={session.code} size={28} letters /></span>
          <button type="button" style={quiet} onClick={() => void copy()} aria-label={`Copy session code ${session.code}`}>{copied ? 'Copied' : 'Copy'}</button>
          <span style={dim} aria-hidden="true">·</span>
          <span
            data-testid="together-people"
            aria-live="polite"
            style={{ minWidth: 0, display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 }}
          >
            <span>{here} here:</span>
            {listed.map((p) => (
              <span key={p.seat} data-seat={p.seat} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, overflowWrap: 'anywhere' }}>
                {p.seat >= 0 ? (
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: seatColor(p.seat), flex: 'none' }} />
                ) : null}
                {p.seat === mySeat ? (p.name ? `${p.name} (you)` : 'you') : p.name}
              </span>
            ))}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" style={quiet} onClick={leave}>Leave</button>
        </div>
        {line ? <div style={dim} aria-live="polite" data-testid="together-status">{line}</div> : null}
        {st?.notice ? <div aria-live="polite" style={{ color: 'var(--c-orange)' }} data-testid="together-notice">{st.notice}</div> : null}
        <div style={{ ...dim, fontSize: '0.72rem' }}>{TEACHER_NOTE}</div>
        {st?.error ? <div role="alert" style={{ color: 'var(--c-red)' }}>{st.error}</div> : null}
      </div>
    );
  }

  const blocked = list.kind === 'no-class';
  return (
    <div style={bar} role="region" aria-label="Code together" data-testid="code-together">
      <div style={row}>
        <strong>Code together</strong>
        <span style={dim}>write one program with classmates, at the same time</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={quiet} onClick={onClose} aria-label="Close Code together">Close</button>
      </div>
      {/* Up top, where it is seen: the bar scrolls when the editor pane is short. */}
      {note ? <div aria-live="polite" style={{ color: 'var(--c-orange)' }} data-testid="together-note">{note}</div> : null}
      {error ? <div role="alert" style={{ color: 'var(--c-red)' }}>{error}</div> : null}
      {blocked ? (
        <div>Join a class to code together.</div>
      ) : (
        <>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={row}>
              <span style={dim}>Open {LANG_NAME[lang]} sessions in your classes:</span>
              {list.kind === 'loading' ? <span style={dim}>looking...</span> : null}
              {list.kind === 'error' ? <span style={dim}>{list.text}</span> : null}
              {list.kind === 'rooms' && list.rooms.length === 0 ? (
                <span style={dim}>none yet. Start one, or wait for a classmate to start one.</span>
              ) : null}
            </div>
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
          </div>
          <div style={{ ...dim, fontSize: '0.72rem' }}>{TEACHER_NOTE}</div>
        </>
      )}
    </div>
  );
}
