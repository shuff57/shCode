'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import CodeMirrorPane from './CodeMirrorPane';
import styles from './solidcraft-sandbox.module.css';
import type { ModelDoc } from '../lib/model-types';
import { createStudentTools } from '../lib/solidcraft-student-tools';
import type { CadSolverReport } from '../lib/cad-feedback';
import { observedSketch, type SketchSnapshot } from '../lib/solidcraft-sketch';
import { checkSolidCraftAvailability } from '../lib/solidcraft-availability';
import type { CadSourceLocation } from '../lib/solidcraft-project';

type Summary = { sketches?: (CadSolverReport & { state?:string })[]; features?: { id: string; status: string; refusal: string | null }[] };
type Host = { buildRevision?:number|null; confirmReplace?: (() => boolean) | null; setScript(code: string, locations?: CadSourceLocation[]): void; runUnconfirmed(): Promise<Summary | null>; runSavedSketch(): Promise<Summary | null> };
type HostWindow = Window & { __host?: Host; __lastRun?: { doc: ModelDoc; summary: Summary; fin?: { sketches?: SketchSnapshot[]; measure?: { bodies?: unknown[] } } }; solidcraft?: { request(method: string, params: object): Promise<unknown> } };
interface Props {
  sketchPanel?: ReactNode;
  onSketchPoint?(point: [number, number]): void;
  autoBuild?: boolean;
  runRequest?:number;
  value: string;
  onChange(value: string): void;
  onDocChange?(doc: ModelDoc | null, refusals?: Record<string, string> | null, solver?: CadSolverReport): void;
  toolsAllowed: boolean;
  policyLoaded: boolean;
  policyReason: string;
  lessonId: string;
  /** A CAD project: its script may hold sketches no step uses yet, and they are shown in Model too. */
  projectSketch?: boolean;
  onSelectSource?(path:string):void;
  onFlushReady?(flush:(()=>Promise<boolean>)|null):void;
  onPersistReady?(confirmSaved:(()=>Promise<void>)|null):void;
}
function scriptProgram(props:Props):{source:string;locations:CadSourceLocation[]}{return {source:props.value,locations:[]};}

export default function SolidCraftStudio(props: Props) {
  const latest = useRef(props); latest.current = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const studentTools = useRef<ReturnType<typeof createStudentTools> | null>(null);
  const running = useRef(false);
  const persisting=useRef(false);
  const requestedRun=useRef(props.runRequest??0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Loading SolidCraft…');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [width, setWidth] = useState(38);
  const [policyApplied, setPolicyApplied] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const readyOnce = useRef(false);
  const submittedCode = useRef<string | null>(null);
  const builtSource=useRef<string|null>(null);
  const runDone=useRef<Promise<void>>(Promise.resolve());
  const [isolated,setIsolated]=useState<boolean|null>(null);
  useEffect(()=>{setIsolated(!!latest.current.onPersistReady&&'credentialless' in HTMLIFrameElement.prototype);},[]);
  const policyVersion = useRef(0);
  const program=scriptProgram(props);
  useEffect(()=>{props.onSelectSource?.('script.js');},[props.lessonId]);

  const invalidate = useCallback(() => latest.current.onDocChange?.(null, null), []);
  const edit = useCallback((value: string) => { invalidate();latest.current.onChange(value); }, [invalidate]);
  // History restore, reset and a changed source all invalidate a previous grade.
  useEffect(() => { invalidate(); }, [program.source, invalidate]);

  useEffect(()=>{
    if(!ready)return;
    let live=true;
    latest.current.onFlushReady?.(async()=>{
      if(running.current)await runDone.current;
      const host=frame.current?.contentWindow as HostWindow|null;
      const sc=host?.document.getElementById('sc') as HTMLIFrameElement|null;
      const api=(sc?.contentWindow as HostWindow|null)?.solidcraft;
      if(!live||!api||!host?.__host)return false;
      const doc=await api.request('document.inspect',{}) as {revision:number;bodies:unknown[];sketches:unknown[]};
      if((doc.bodies?.length||doc.sketches?.length)&&doc.revision!==host.__host.buildRevision){setStatus('Keep this Model open: export your 3D hand edits with SolidCraft’s file tools, or Run your saved code before changing workspaces.');return false;}
      return live;
    });
    latest.current.onPersistReady?.(async()=>{
      // The owner calls this only after saving the project. Clear recovery
      // only in this page's isolated session, for an unchanged
      // script-generated revision. Hand work and older working code stay kept.
      if(!live||!isolated||running.current||persisting.current||builtSource.current!==scriptProgram(latest.current).source)return;
      const host=frame.current?.contentWindow as HostWindow|null;
      const sc=host?.document.getElementById('sc') as HTMLIFrameElement|null;
      const win=sc?.contentWindow as HostWindow|null;
      if(!win?.solidcraft||!host?.__host||(host as Window&{credentialless?:boolean}).credentialless!==true||(win as Window&{credentialless?:boolean}).credentialless!==true)return;
      const resume=studentTools.current?.pauseInput();persisting.current=true;
      try{
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        const doc=await win.solidcraft.request('document.inspect',{}) as {revision:number};
        if(!live||running.current||!Number.isSafeInteger(doc.revision)||host.__host.buildRevision!==doc.revision||builtSource.current!==scriptProgram(latest.current).source)return;
        const dir=await win.navigator.storage.getDirectory();
        for(const name of ['recovery.sc','recovery.json'])try{await dir.removeEntry(name);}catch(e){if(!(e&&typeof e==='object'&&'name' in e&&e.name==='NotFoundError'))throw e;}
      }finally{persisting.current=false;resume?.();}

    });
    return()=>{live=false;latest.current.onFlushReady?.(null);latest.current.onPersistReady?.(null);};
  },[ready,isolated]);

  useEffect(() => {
    const abort = new AbortController();
    setAvailable(null); setLoadError('');
    checkSolidCraftAvailability(abort.signal)
      .then(() => { if (!abort.signal.aborted) setAvailable(true); })
      .catch(e => { if (!abort.signal.aborted) { setLoadError(e instanceof Error ? e.message : 'The SolidCraft files could not be loaded.'); setAvailable(false); } });
    return () => abort.abort();
  }, [loadAttempt]);

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
          if(!latest.current.sketchPanel)await (sc.contentWindow as HostWindow).solidcraft?.request('ui.set',{tab:'MODEL',perspective:true,viewAnglesLockPitch:false,viewAnglesLockYaw:false,viewAnglesLockRoll:false});
          if (!live) return;
          if (latest.current.sketchPanel) doc!.documentElement.classList.add('shcode-sketch-only');
          const pane = doc!.getElementById('scp'); const theme = getComputedStyle(document.documentElement);
          for (const [target, source] of Object.entries({ '--bg': '--bg', '--fg': '--text', '--mut': '--c-meta', '--card': '--card', '--line': '--border', '--code': '--c-bg', '--acc': '--brand' })) pane?.style.setProperty(target, theme.getPropertyValue(source));
          const tools = createStudentTools(frame.current!, { flat: !!latest.current.sketchPanel, canDraw: () => !!latest.current.onSketchPoint, onPoint: latest.current.sketchPanel ? p => latest.current.onSketchPoint?.(p) : undefined, onError: setStatus }); studentTools.current = tools;
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
    if (!hostWin?.__host || !ready || !policyApplied || running.current || persisting.current) return;
    const {source,locations} = scriptProgram(latest.current);
    let settled!:()=>void;runDone.current=new Promise<void>(resolve=>{settled=resolve;});
    running.current = true; submittedCode.current = source; setBusy(true); invalidate();
    try {
      hostWin.__host.confirmReplace = () => window.confirm('Run will replace the hand-edited 3D design on screen. Hand edits are not included in your saved script. Download the native design with SolidCraft’s file tools first if you want to keep it. Replace and run?');
      hostWin.__host.setScript(source,locations);
      const summary = await (latest.current.sketchPanel ? hostWin.__host.runSavedSketch() : hostWin.__host.runUnconfirmed());
      const last = hostWin.__lastRun;
      if(summary&&last?.summary===summary)builtSource.current=source;
      const sc = frame.current?.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
      await (sc?.contentWindow as HostWindow | null)?.solidcraft?.request('ui.home', { open: false });
      if(!latest.current.sketchPanel){
        await (sc?.contentWindow as HostWindow|null)?.solidcraft?.request('ui.set',{tab:'MODEL',perspective:true,viewAnglesLockPitch:false,viewAnglesLockYaw:false,viewAnglesLockRoll:false});
        if(latest.current.projectSketch)await (sc?.contentWindow as HostWindow|null)?.solidcraft?.request('ui.view',{view:'home'});
      }
      await studentTools.current?.measure();
      if(summary&&last?.summary===summary&&(last.fin?.measure?.bodies?.length||latest.current.projectSketch))await studentTools.current?.fit();
      if (summary && last?.summary === summary && scriptProgram(latest.current).source === source) {
        const refusals = Object.fromEntries((summary.features ?? []).filter(f => f.status === 'refused').map(f => [f.id, f.refusal || 'This step was not built.']));
        const accepted = latest.current.sketchPanel ? observedSketch(last.doc, last.fin) : last.doc;
        const solver=summary.sketches?.find(s=>s.state==='accepted');
        latest.current.onDocChange?.(accepted, refusals, solver);
        if (latest.current.sketchPanel && !accepted) setStatus('The sketch could not be verified. Read the sketch result below.');
      }
      if(scriptProgram(latest.current).source!==source)setStatus('Your code changed during this run. Run again to update the part.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'The run did not finish.'); }
    finally { running.current = false; setBusy(false); settled(); }
  }, [ready, policyApplied, invalidate]);

  // A saved lesson is rebuilt after opening, through the guarded path. Subsequent
  // edits/history restores wait for Run and cannot pass using an old solid.
  useEffect(() => { if (ready && policyApplied && (submittedCode.current === null || (props.autoBuild && submittedCode.current !== program.source))) void run(); }, [ready, policyApplied, run, props.autoBuild, program.source]);
  useEffect(()=>{
    if(!ready||!policyApplied||busy||running.current||!props.runRequest||requestedRun.current===props.runRequest)return;
    requestedRun.current=props.runRequest;void run();
  },[ready,policyApplied,busy,props.runRequest,run]);
  function resize(clientX: number) { const box = workspace.current?.getBoundingClientRect(); if (box) setWidth(Math.max(25, Math.min(65, 100 * (clientX - box.left) / box.width))); }
  const changingPolicy = !policyApplied || !props.policyLoaded;
  const needsRun=ready&&!busy&&submittedCode.current!==null&&submittedCode.current!==program.source;
  return (
    <div className={styles.studio}>
      <div className={styles.studioToolbar}>
        <span>{props.policyReason} {props.sketchPanel ? 'Shift-drag to pan; scroll to zoom.' : props.toolsAllowed ? '' : 'Drag the model to orbit; Shift-drag to pan; scroll to zoom.'}</span>
        <div className={styles.actions}>
          <button disabled={!ready || changingPolicy || busy} onClick={() => { void studentTools.current?.fit(); }}>{props.sketchPanel ? 'Fit sketch' : 'Fit part'}</button>
          <button className={styles.run} disabled={!ready || changingPolicy || busy} onClick={run}>{busy ? 'Updating…' : props.sketchPanel ? 'Update view' : 'Run'}</button>
        </div>
      </div>
      {policyError && <p role="alert" className={styles.notice}>{policyError}</p>}
      <div ref={workspace} className={`${styles.workspace} ${styles.lessonWorkspace}`} style={{ '--editor-width': `${width}%` } as CSSProperties}>
        <section className={styles.editor} aria-label="Script editor" onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); void run(); } }}>
          <div className={styles.panelTitle}><b>{props.sketchPanel ? 'Sketch tools' : 'script.js'}</b>{props.projectSketch&&<span>sketches and 3D steps · mm</span>}</div>
          {props.sketchPanel ?? <div className={styles.code}><CodeMirrorPane value={props.value} onChange={edit} fileKey={props.lessonId} /></div>}
        </section>
        <div className={styles.divider} role="separator" tabIndex={0} aria-label="Resize script editor" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={65} aria-valuenow={Math.round(width)}
          onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setWidth(w => Math.max(25, Math.min(65, w + (e.key === 'ArrowLeft' ? -2 : 2)))); } }}
          onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resize(e.clientX); }} onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} />
        <section className={styles.preview} aria-label="SolidCraft model">
          <div className={styles.panelTitle}><b>{props.sketchPanel ? '2D sketch · mm' : 'Model'}</b><span role="status">{needsRun?'Code changed · Run to update':status}</span></div>
          <div className={styles.engine}>
            {available === false ? <div className={styles.missing} role="alert"><h2>CAD preview unavailable</h2><p>{loadError}</p><button className="btn-secondary" onClick={() => setLoadAttempt(n => n + 1)}>Retry CAD preview</button></div>
              : available&&isolated!==null ? <iframe {...(isolated?{credentialless:''}:{})} ref={frame} src={props.sketchPanel ? '/solidcraft-preview/host.html?storage=off&sketch-only=1' : `/solidcraft-preview/host.html?ex=3d-box-hole&storage=off${props.projectSketch?'&project-sketch=1':''}`} title="SolidCraft viewport and build results" /> : <p className={styles.missing}>Checking the CAD build…</p>}
            {available && changingPolicy && <div className={styles.policyCover}><span>{policyError || (busy ? props.sketchPanel ? 'Updating your sketch…' : 'Building your script…' : 'Applying your teacher’s CAD setting…')}</span></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
