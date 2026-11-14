'use client';

// /shared?id=<id>: a sandbox program someone sent in a message (migration 0054, GET /api/shares/[id]).
//
// A copy is the program as it was when it was sent. It runs here (moSHion in MoshionPreview's sandboxed
// frame, JavaScript in the same Worker the sandbox uses) and its code is shown, but it cannot be edited
// here: Remix makes it a NEW sandbox project of the reader's own, so nothing of theirs is written over.
// An invitation to Code together opened here (the card links straight to the sandbox while the session
// is open) says whether the session is still open and offers Join. An invitation to WATCH a session
// shows its program read-only as it is typed (lib/live-doc.ts LiveDocClient with `watch`: the room
// refuses a watcher's edits) and runs it on Run; the people coding see the watcher's name.
//
// Only the people who may read the message get the program: the conversation's two people and, between
// two students, the class's teachers. Everyone else sees the same "not there any more" answer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Code2, Eye, Play, RotateCcw, Shuffle, Square, Users } from 'lucide-react';
import CodeMirrorPane from './CodeMirrorPane';
import { LiveDocClient, type DocStatus } from '../lib/live-doc';
import { deviceId } from '../lib/moshion-online';
import MoshionPreview from './MoshionPreview';
import { packForUrl } from './DemoGameBlock';
import Console from './Console';
import { fetchShare, shareHref } from '../lib/messages-client';
import { LANG_LABEL, isShareId, type ShareView } from '../lib/messages-core';
import { RUN_TIMEOUT_MS, errorWithLocation, runStudentCode, timerLimitMessage } from '../lib/js-runner-source';
import { createProject } from '../lib/sandbox-projects';
import { MAX_NAME_CHARS } from '../lib/sandbox-projects-core';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; text: string; signIn?: boolean }
  | { kind: 'ok'; share: ShareView };

const button: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px', borderRadius: 4,
  cursor: 'pointer', border: '1px solid var(--c-line)', background: 'var(--x-343746)', color: 'var(--c-fg)',
};
const primary: React.CSSProperties = { ...button, background: 'var(--brand)', color: 'var(--on-brand)', border: '1px solid transparent', fontWeight: 600 };

function when(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** The new project's name: "<title> from <name>", at most 40 characters. */
export function remixName(title: string, author: string, mine: boolean): string {
  const base = (title || 'Program').trim();
  const full = mine ? `${base} copy` : `${base} from ${author}`;
  if ([...full].length <= MAX_NAME_CHARS) return full;
  const tail = mine ? ' copy' : ` from ${author}`;
  const room = Math.max(8, MAX_NAME_CHARS - [...tail].length);
  return ([...base].slice(0, room).join('').trimEnd() + tail).slice(0, MAX_NAME_CHARS);
}

export default function SharedProgram() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [runKey, setRunKey] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') ?? '';
    if (!isShareId(id)) { setState({ kind: 'error', text: 'That link is not a program someone sent you.' }); return; }
    void fetchShare(id).then((r) => {
      if (r.ok) setState({ kind: 'ok', share: r.value });
      else if (r.status === 401) setState({ kind: 'error', text: 'Sign in to open a program someone sent you.', signIn: true });
      else setState({ kind: 'error', text: r.error });
    });
  }, []);

  const remix = async (s: ShareView) => {
    if (busy || s.code == null) return;
    setBusy(true);
    setNote(null);
    const made = await createProject(s.lang, remixName(s.title, s.author, s.mine), { 'script.js': s.code });
    if (!made.ok) { setBusy(false); setNote(made.error); return; }
    window.location.assign('/sandbox/');
  };

  if (state.kind === 'loading') return <main style={{ padding: 24, color: 'var(--c-dim)' }}>Loading…</main>;
  if (state.kind === 'error') {
    return (
      <main style={{ padding: 24, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>A program sent to you</h1>
        <p role="alert" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--c-fg)' }}>{state.text}</p>
      </main>
    );
  }

  const s = state.share;
  const lang = LANG_LABEL[s.lang];
  return (
    <main style={{ padding: '16px 16px 32px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="shared-program">
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ color: s.kind === 'copy' ? 'var(--c-cyan)' : 'var(--c-purple)', marginTop: 4 }}>
          {s.kind === 'together' ? <Users size={22} /> : s.kind === 'watch' ? <Eye size={22} /> : <Code2 size={22} />}
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: 20, margin: 0, overflowWrap: 'anywhere' }}>{s.title || 'A program'}</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--c-meta)' }}>
            {s.mine ? 'You sent this' : `Sent by ${s.author}`} · {lang} · {when(s.at)}
          </p>
        </div>
        {s.kind === 'copy' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={primary} disabled={busy} onClick={() => void remix(s)} data-testid="shared-remix"
              title="Make a new sandbox project of your own with this code">
              <Shuffle size={14} aria-hidden="true" /> {busy ? 'Making your project…' : 'Remix'}
            </button>
          </div>
        )}
      </header>

      {note && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--c-red)' }}>{note}</p>}

      {s.kind === 'watch' ? (
        s.open && s.room
          ? <LiveWatch share={s} />
          : <section style={{ padding: 14, border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep)', fontSize: 14 }}>
              <p style={{ margin: 0 }}>This Code together session has ended, so there is nothing to watch any more.</p>
            </section>
      ) : s.kind === 'together' ? (
        <section style={{ padding: 14, border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep)', fontSize: 14, lineHeight: 1.5 }}>
          {s.open && s.room ? (
            <>
              <p style={{ margin: '0 0 10px' }}>{s.mine ? 'You invited them to your Code together session.' : `${s.author} invited you to write this program together.`}</p>
              {!s.mine && <a href={shareHref(s)} style={{ ...primary, textDecoration: 'none' }} data-testid="shared-join"><Users size={14} aria-hidden="true" /> Join</a>}
            </>
          ) : (
            <p style={{ margin: 0 }}>This Code together session has ended. If you still want to work on it together, ask {s.mine ? 'them' : s.author} to start a new one.</p>
          )}
        </section>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--c-meta)' }}>
            This is a copy: it runs here, but you cannot change it. <strong>Remix</strong> makes it a new project of your own in the sandbox.
          </p>
          {s.lang === 'moshion'
            ? <MoshionRun code={s.code ?? ''} id={s.id} runKey={runKey} onRestart={() => setRunKey((k) => k + 1)} />
            : <JsRun code={s.code ?? ''} />}
          <pre aria-label={`${s.title || 'Program'} code`} data-testid="shared-code"
            style={{ margin: 0, padding: 12, maxHeight: 480, overflow: 'auto', fontSize: 12, lineHeight: 1.5, background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, whiteSpace: 'pre' }}>
            <code>{s.code}</code>
          </pre>
        </>
      )}
    </main>
  );
}

function MoshionRun({ code, id, runKey, onRestart }: { code: string; id: string; runKey: number; onRestart: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={button} onClick={onRestart} data-testid="shared-restart"><RotateCcw size={14} aria-hidden="true" /> Restart</button>
      </div>
      <div style={{ height: 'max(320px, calc(100vh - 420px))', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
        {/* Its own room key, so a shared game's online rooms never mix with the sandbox's or a published game's. */}
        <MoshionPreview code={packForUrl(code)} runKey={runKey} gameKey={`share-${id}`} />
      </div>
      <div style={{ height: 120, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="output-header">Console</div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}><Console resetKey={String(runKey)} /></div>
      </div>
    </>
  );
}

interface LogLine { type: string; message: string }

function JsRun({ code, autoRun = false }: { code: string; autoRun?: boolean }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const runRef = useRef<{ kill: () => void } | null>(null);

  const run = useCallback(() => {
    runRef.current?.kill();
    const collected: LogLine[] = [];
    setLogs([]);
    setRunning(true);
    const ended = () => { if (runRef.current === handle) { runRef.current = null; setRunning(false); } };
    const handle = runStudentCode(
      code,
      (d) => {
        if (d.kind === 'log') { collected.push({ type: d.type || 'log', message: d.message || '' }); setLogs([...collected]); return; }
        if (d.kind === 'error') { collected.push({ type: 'error', message: errorWithLocation(d.name, d.message, d.line, d.col) }); setLogs([...collected]); }
        ended();
      },
      (info) => {
        collected.push({
          type: 'error',
          message: info.phase === 'timers' ? timerLimitMessage() : `The program was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped.`,
        });
        setLogs([...collected]);
        ended();
      },
      () => { collected.length = 0; },
      { timers: true },
    );
    runRef.current = handle;
  }, [code]);

  useEffect(() => () => runRef.current?.kill(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoRun) run(); }, []);

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {running
          ? <button type="button" style={button} onClick={() => { runRef.current?.kill(); runRef.current = null; setRunning(false); }}><Square size={14} aria-hidden="true" /> Stop</button>
          : <button type="button" style={primary} onClick={run} data-testid="shared-run"><Play size={14} aria-hidden="true" /> Run</button>}
      </div>
      <pre aria-label="Output" aria-live="polite" data-testid="shared-output"
        style={{ margin: 0, minHeight: 80, maxHeight: 260, overflow: 'auto', padding: 10, fontSize: 12, lineHeight: 1.5, background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
        {logs.length ? logs.map((l, i) => (
          <div key={i} style={{ color: l.type === 'error' ? 'var(--c-red)' : l.type === 'warn' ? 'var(--c-orange)' : 'var(--c-fg)' }}>{l.message}</div>
        )) : <span style={{ color: 'var(--c-dim)' }}>Press Run to see what it prints.</span>}
      </pre>
    </>
  );
}

/** Watch a Code together session live: read-only, Run shows what the program does right now. */
function LiveWatch({ share }: { share: ShareView }) {
  const [status, setStatus] = useState<DocStatus | null>(null);
  const [ended, setEnded] = useState<string | null>(null);
  const [ext, setExt] = useState<LiveDocClient['extension'] | null>(null);
  const [ran, setRan] = useState<{ code: string; key: number } | null>(null);
  const text = useRef('');

  useEffect(() => {
    const client = new LiveDocClient({
      code: share.room!,
      device: deviceId(),
      watch: true,
      onStatus: setStatus,
      onEnded: (e) => setEnded(e.why === 'gone' ? e.reason : 'The session has ended. What it showed last is still here.'),
    });
    setExt(client.extension);
    client.start();
    return () => client.stop();
  }, [share.room]);

  const coders = (status?.players ?? []).filter((p) => !p.watching);
  const line = ended
    ?? (!status || status.phase === 'connecting' ? 'Connecting…'
      : status.phase === 'reconnecting' ? 'Offline: reconnecting…'
      : `Watching live. ${coders.map((p) => p.name).join(', ') || 'No one'} ${coders.length === 1 ? 'is' : 'are'} coding. They can see that you are watching.`);

  return (
    <>
      <p role="status" data-testid="watch-status" style={{ margin: 0, fontSize: 13, color: ended ? 'var(--c-orange)' : 'var(--c-meta)' }}>{line}</p>
      {status?.error && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--c-red)' }}>{status.error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={primary} data-testid="watch-run"
          onClick={() => setRan((r) => ({ code: text.current, key: (r?.key ?? 0) + 1 }))}>
          <Play size={14} aria-hidden="true" /> {ran ? 'Run it again' : 'Run what they have so far'}
        </button>
      </div>
      <div data-testid="watch-editor" aria-label="The program, as it is typed (read-only)"
        style={{ height: 'min(420px, 50vh)', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {ext && <CodeMirrorPane value="" fileKey={`watch-${share.id}`} readOnly collab={ext} onChange={(t) => { text.current = t; }} />}
      </div>
      {ran && (share.lang === 'moshion'
        ? <MoshionRun code={ran.code} id={share.id} runKey={ran.key} onRestart={() => setRan((r) => r && { ...r, key: r.key + 1 })} />
        : <JsRun key={ran.key} code={ran.code} autoRun />)}
    </>
  );
}
