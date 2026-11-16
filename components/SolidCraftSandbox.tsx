'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import CodeMirrorPane from './CodeMirrorPane';
import styles from './solidcraft-sandbox.module.css';

type Host = {
  setScript(code: string): void;
  runUnconfirmed(): Promise<unknown>;
};
type HostWindow = Window & { __host?: Host; solidcraft?: { request(method: string, params: object): Promise<unknown> } };

async function showModel(frame: HTMLIFrameElement | null) {
  const sc = frame?.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
  await (sc?.contentWindow as HostWindow | null)?.solidcraft?.request('ui.home', { open: false });
}
const STARTER = `// Change a size, then Run to rebuild the part.
const body = box(40, 30, 10)
hole(body, { across: 6 })
`;

// Local integration preview. The host owns the sandboxed interpreter and guards;
// this component supplies shCode's editor, never evaluates student code itself.
export default function SolidCraftSandbox() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [code, setCode] = useState(STARTER);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Loading SolidCraft…');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [width, setWidth] = useState(38);
  const [edited, setEdited] = useState(false);
  const running = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/solidcraft-preview/host.html', { method: 'HEAD', signal: abort.signal })
      .then(r => setAvailable(r.ok)).catch(e => { if (e.name !== 'AbortError') setAvailable(false); });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (!available) return;
    let observer: MutationObserver | undefined;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const win = frame.current?.contentWindow as HostWindow | null;
      const doc = frame.current?.contentDocument;
      const state = doc?.getElementById('status');
      if (doc?.head && !doc.getElementById('shcode-preview-style')) {
        const link = doc.createElement('link');
        link.id = 'shcode-preview-style'; link.rel = 'stylesheet'; link.href = '/solidcraft-preview.css';
        doc.head.append(link);
      }
      if (win?.__host && state && state.textContent === 'ready') {
        void showModel(frame.current).catch(() => setStatus('Use SolidCraft’s Back button to open the model.'));
        const pane = doc?.getElementById('scp');
        const theme = getComputedStyle(document.documentElement);
        for (const [target, source] of Object.entries({ '--bg': '--bg', '--fg': '--text', '--mut': '--c-meta', '--card': '--card', '--line': '--border', '--code': '--c-bg', '--acc': '--brand' })) {
          pane?.style.setProperty(target, theme.getPropertyValue(source));
        }
        setReady(true); setStatus('Ready');
        observer = new MutationObserver(() => setStatus(state.textContent || 'Ready'));
        observer.observe(state, { childList: true, characterData: true, subtree: true });
        window.clearInterval(timer);
      } else if (Date.now() - started > 150_000) {
        setStatus('SolidCraft did not finish loading. Reload this page to try again.');
        window.clearInterval(timer);
      }
    }, 250);
    return () => { window.clearInterval(timer); observer?.disconnect(); };
  }, [available]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (edited) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [edited]);

  async function run() {
    const host = (frame.current?.contentWindow as HostWindow | null)?.__host;
    if (!host || !ready || running.current) return;
    running.current = true; setBusy(true);
    try { host.setScript(code); await host.runUnconfirmed(); await showModel(frame.current); }
    catch (e) { setStatus(e instanceof Error ? e.message : 'The run did not finish.'); }
    finally { running.current = false; setBusy(false); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const a = document.createElement('a'); a.href = url; a.download = 'script.js'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setEdited(false);
  }

  function resize(clientX: number) {
    const box = workspace.current?.getBoundingClientRect();
    if (box) setWidth(Math.max(25, Math.min(65, 100 * (clientX - box.left) / box.width)));
  }

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <div><h1>reSHape <span className={styles.badge}>UI preview</span></h1>
          <p>Write a script. Build a part.</p></div>
        <div className={styles.actions}>
          <Link href="/sandbox/">Back to sandbox</Link>
          <button onClick={download}>Download script</button>
          <button className={styles.run} disabled={!ready || busy} onClick={run}>{busy ? 'Building…' : 'Run'}</button>
        </div>
      </div>
      <p className={styles.notice}>Preview work is not saved to your shCode projects yet. Download your script to keep it.</p>
      <div ref={workspace} className={styles.workspace} style={{ '--editor-width': `${width}%` } as CSSProperties}>
        <section className={styles.editor} aria-label="Script editor" onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); }
        }}>
          <div className={styles.panelTitle}><b>script.js</b><span>Ctrl / ⌘ + Enter to run</span></div>
          <div className={styles.code}><CodeMirrorPane value={code} onChange={value => { setCode(value); setEdited(true); }} fileKey="solidcraft-preview-script" /></div>
        </section>
        <div className={styles.divider} role="separator" tabIndex={0} aria-label="Resize script editor" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={65} aria-valuenow={Math.round(width)}
          onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setWidth(w => Math.max(25, Math.min(65, w + (e.key === 'ArrowLeft' ? -2 : 2)))); } }}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resize(e.clientX); }}
          onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} />
        <section className={styles.preview} aria-label="SolidCraft model">
          <div className={styles.panelTitle}><b>Model</b><span role="status">{status}</span></div>
          {available === false ? <div className={styles.missing}><h2>Prepare the local CAD preview</h2><p>Run <code>node scripts/prepare-solidcraft-preview.mjs</code> from shCode, then reload.</p></div>
            : available ? <iframe ref={frame} src="/solidcraft-preview/host.html" title="SolidCraft viewport and build results" />
            : <p className={styles.missing}>Checking the local CAD build…</p>}
        </section>
      </div>
    </main>
  );
}
