'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import CodeMirrorPane from './CodeMirrorPane';
import styles from './solidcraft-sandbox.module.css';
import type { ModelDoc } from '../lib/model-types';
import { createStudentTools } from '../lib/solidcraft-student-tools';

type Summary = { features?: { id: string; status: string; refusal: string | null }[] };
type Host = { setScript(code: string): void; runUnconfirmed(): Promise<Summary | null> };
type HostWindow = Window & { __host?: Host; __lastRun?: { doc: ModelDoc; summary: Summary }; solidcraft?: { request(method: string, params: object): Promise<unknown> } };
interface Props {
  value: string;
  onChange(value: string): void;
  onDocChange?(doc: ModelDoc | null, refusals?: Record<string, string> | null): void;
  toolsAllowed: boolean;
  policyLoaded: boolean;
  policyReason: string;
  lessonId: string;
}

export default function SolidCraftStudio(props: Props) {
  const latest = useRef(props); latest.current = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const studentTools = useRef<ReturnType<typeof createStudentTools> | null>(null);
  const running = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Loading SolidCraft…');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [width, setWidth] = useState(38);
  const [policyApplied, setPolicyApplied] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const readyOnce = useRef(false);
  const submittedCode = useRef<string | null>(null);
  const policyVersion = useRef(0);

  const invalidate = useCallback(() => latest.current.onDocChange?.(null, null), []);
  const edit = useCallback((value: string) => { invalidate(); latest.current.onChange(value); }, [invalidate]);
  // History restore, reset and a changed source all invalidate a previous grade.
  useEffect(() => { invalidate(); }, [props.value, invalidate]);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/solidcraft-preview/host.html', { method: 'HEAD', signal: abort.signal })
      .then(r => setAvailable(r.ok)).catch(e => { if (e.name !== 'AbortError') setAvailable(false); });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (!available) return;
    let observer: MutationObserver | undefined;
    let resize: ResizeObserver | undefined;
    let live = true;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      const win = frame.current?.contentWindow as HostWindow | null;
      const doc = frame.current?.contentDocument;
      const state = doc?.getElementById('status');
      if (doc?.head && !doc.getElementById('shcode-preview-style')) {
        const link = doc.createElement('link'); link.id = 'shcode-preview-style'; link.rel = 'stylesheet'; link.href = '/solidcraft-preview.css'; doc.head.append(link);
      }
      if (win?.__host && state && state.textContent === 'ready' && !readyOnce.current) {
        readyOnce.current = true; window.clearInterval(timer);
        try {
          const sc = doc!.getElementById('sc') as HTMLIFrameElement;
          await (sc.contentWindow as HostWindow).solidcraft?.request('ui.home', { open: false });
          if (!live) return;
          const pane = doc!.getElementById('scp'); const theme = getComputedStyle(document.documentElement);
          for (const [target, source] of Object.entries({ '--bg': '--bg', '--fg': '--text', '--mut': '--c-meta', '--card': '--card', '--line': '--border', '--code': '--c-bg', '--acc': '--brand' })) pane?.style.setProperty(target, theme.getPropertyValue(source));
          const tools = createStudentTools(frame.current!); studentTools.current = tools;
          resize = new ResizeObserver(() => { void tools.measure().catch(() => { if (live) { setPolicyApplied(false); setPolicyError('The CAD view changed. Reload to restore your teacher’s setting.'); } }); });
          resize.observe(sc);
          observer = new MutationObserver(() => setStatus(state.textContent || 'Ready'));
          observer.observe(state, { childList: true, characterData: true, subtree: true });
          setReady(true); setStatus('Ready');
        } catch (e) { if (live) setStatus(e instanceof Error ? e.message : 'SolidCraft did not finish loading.'); }
      } else if (Date.now() - started > 150_000) { setStatus('SolidCraft did not finish loading. Reload this page to try again.'); window.clearInterval(timer); }
    }, 250);
    return () => { live = false; readyOnce.current = false; window.clearInterval(timer); observer?.disconnect(); resize?.disconnect(); studentTools.current?.dispose(); studentTools.current = null; };
  }, [available]);

  useEffect(() => {
    const version = ++policyVersion.current;
    setPolicyApplied(false);
    if (!ready || busy || !props.policyLoaded || !studentTools.current) return;
    let live = true;
    // Apply only a teacher/lesson policy; there is no student-local override.
    studentTools.current.setShown(props.toolsAllowed).then(() => {
      if (live && version === policyVersion.current) { setPolicyApplied(true); setPolicyError(''); }
    }).catch(e => { if (live) setPolicyError(e instanceof Error ? e.message : 'The CAD setting could not be applied.'); });
    return () => { live = false; };
  }, [ready, busy, props.toolsAllowed, props.policyLoaded]);

  const run = useCallback(async () => {
    const hostWin = frame.current?.contentWindow as HostWindow | null;
    if (!hostWin?.__host || !ready || !policyApplied || running.current) return;
    const source = latest.current.value;
    running.current = true; submittedCode.current = source; setBusy(true); invalidate();
    try {
      hostWin.__host.setScript(source);
      const summary = await hostWin.__host.runUnconfirmed();
      const last = hostWin.__lastRun;
      const sc = frame.current?.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
      await (sc?.contentWindow as HostWindow | null)?.solidcraft?.request('ui.home', { open: false });
      await studentTools.current?.measure();
      if (summary && last?.summary === summary && latest.current.value === source) {
        const refusals = Object.fromEntries((summary.features ?? []).filter(f => f.status === 'refused').map(f => [f.id, f.refusal || 'This step was not built.']));
        latest.current.onDocChange?.(last.doc, refusals);
      }
    } catch (e) { setStatus(e instanceof Error ? e.message : 'The run did not finish.'); }
    finally { running.current = false; setBusy(false); }
  }, [ready, policyApplied, invalidate]);

  // A saved lesson is rebuilt after opening, through the guarded path. Subsequent
  // edits/history restores wait for Run and cannot pass using an old solid.
  useEffect(() => { if (ready && policyApplied && submittedCode.current === null) void run(); }, [ready, policyApplied, run]);
  function resize(clientX: number) { const box = workspace.current?.getBoundingClientRect(); if (box) setWidth(Math.max(25, Math.min(65, 100 * (clientX - box.left) / box.width))); }
  const changingPolicy = !policyApplied || !props.policyLoaded;
  return (
    <div className={styles.studio}>
      <div className={styles.studioToolbar}>
        <span>{props.policyReason} {props.toolsAllowed ? '' : 'Drag the model to orbit; Shift-drag to pan; scroll to zoom.'}</span>
        <div className={styles.actions}>
          <button disabled={!ready || changingPolicy || busy} onClick={() => { void studentTools.current?.fit(); }}>Fit part</button>
          <button className={styles.run} disabled={!ready || changingPolicy || busy} onClick={run}>{busy ? 'Building…' : 'Run'}</button>
        </div>
      </div>
      {policyError && <p role="alert" className={styles.notice}>{policyError}</p>}
      <div ref={workspace} className={`${styles.workspace} ${styles.lessonWorkspace}`} style={{ '--editor-width': `${width}%` } as CSSProperties}>
        <section className={styles.editor} aria-label="Script editor" onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); void run(); } }}>
          <div className={styles.panelTitle}><b>script.js</b></div>
          <div className={styles.code}><CodeMirrorPane value={props.value} onChange={edit} fileKey={props.lessonId} /></div>
        </section>
        <div className={styles.divider} role="separator" tabIndex={0} aria-label="Resize script editor" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={65} aria-valuenow={Math.round(width)}
          onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setWidth(w => Math.max(25, Math.min(65, w + (e.key === 'ArrowLeft' ? -2 : 2)))); } }}
          onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resize(e.clientX); }} onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} />
        <section className={styles.preview} aria-label="SolidCraft model">
          <div className={styles.panelTitle}><b>Model</b><span role="status">{status}</span></div>
          <div className={styles.engine}>
            {available === false ? <div className={styles.missing}><h2>CAD preview unavailable</h2><p>Reload this page to try again.</p></div>
              : available ? <iframe ref={frame} src="/solidcraft-preview/host.html?ex=3d-box-hole&storage=off" title="SolidCraft viewport and build results" /> : <p className={styles.missing}>Checking the CAD build…</p>}
            {available && changingPolicy && <div className={styles.policyCover}><span>{policyError || (busy ? 'Building your script…' : 'Applying your teacher’s CAD setting…')}</span></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
