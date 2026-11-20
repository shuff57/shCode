'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import CadFeedback from './CadFeedback';
import CodeMirrorPane from './CodeMirrorPane';
import { createNativeSketch, nativeError } from '../lib/solidcraft-native';
import { prepareSketchProgram } from '../lib/solidcraft-sketch-script';
import { suggestedSketchVariable } from '../lib/solidcraft-project';
import { finishCodedSketch } from '../lib/solidcraft-sketch-finish';
import { NATIVE_SKETCH_SCRIPT, writeNativeDrawing, type NativeDrawing } from '../lib/solidcraft-native-format';
import type { ModelDoc } from '../lib/model-types';
import styles from './solidcraft-sandbox.module.css';
interface Props {
  value:string; source:string; lessonId:string; editable:boolean; policyLoaded:boolean; policyReason:string; feedbackEnabled?:boolean;
  starterSource:string;
  sourceName?:string;
  checkRequired?:boolean;
  onChange(drawing:string):void;
  onSourceChange(source:string):void;
  onBeforeBuild(label?:string):boolean;
  /** Set in a CAD project: script.js holds 3D steps too, and this view shows the sketch this variable holds. */
  profileVariable?:string;
  onFinishReady?(finish:(()=>Promise<void>)|null):void;
  onRequestFinish?():void;
  onFinishSketch?(result:{source:string;variable:string}):Promise<void>;
  onDocChange(doc:ModelDoc|null,refusals?:Record<string,string>|null):void;
  onFlushReady(flush:(()=>Promise<boolean>)|null):void;
  onPersistReady?(confirmSaved:(()=>Promise<void>)|null):void;
  onRequestSave():void;
}
export default function SolidCraftSketch(props:Props) {
  const latest=useRef(props);latest.current=props;
  const frame=useRef<HTMLIFrameElement>(null);
  const workspace=useRef<HTMLDivElement>(null);
  const session=useRef<ReturnType<typeof createNativeSketch>|null>(null);
  const sent=useRef(props.value);
  const openingValue=useRef(props.value);
  const recordRef=useRef<NativeDrawing|null>(null);
  const failed=useRef(false);
  const running=useRef(false);
  const runDone=useRef<Promise<void>>(Promise.resolve());
  const runAbort=useRef<AbortController|null>(null);
  const autoStarted=useRef(false);
  const closing=useRef(false);
  const [finishing,setFinishing]=useState(false);
  // The sketch variable the native drawing on screen was built for (a CAD project's script can hold several sketches).
  const builtFor=useRef<string|null>(null);
  const [builtVariable,setBuiltVariable]=useState<string|null>(null);
  const freshFor=()=>latest.current.profileVariable===undefined||builtFor.current===latest.current.profileVariable;
  const [load,setLoad]=useState({id:0,value:props.value});
  const [status,setStatus]=useState('Loading SolidCraft’s native sketcher…');
  const [error,setError]=useState('');
  const [runError,setRunError]=useState('');
  const [record,setRecord]=useState<NativeDrawing|null>(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [width,setWidth]=useState(38);
  const [isolated,setIsolated]=useState<boolean|null>(null);
  useEffect(()=>{setIsolated('credentialless' in HTMLIFrameElement.prototype);return()=>runAbort.current?.abort();},[]);
  useEffect(()=>{
    failed.current=true;latest.current.onDocChange(null,null);
  },[props.source]);
  useEffect(()=>{
    if(props.value===sent.current)return;
    runAbort.current?.abort();running.current=false;setBusy(false);autoStarted.current=false;
    sent.current=props.value;openingValue.current=props.value;recordRef.current=null;setRecord(null);setReady(false);setError('');setRunError('');
    props.onDocChange(null,null);setLoad(old=>({id:old.id+1,value:props.value}));
  },[props.value]);
  const publish=useCallback((next:NativeDrawing|null)=>{
    const valid=next&&!failed.current&&!next.editing&&next.scriptSource===latest.current.source&&next.solver&&freshFor();
    latest.current.onDocChange(valid?next.doc:null,null);
  },[]);
  useEffect(()=>{
    if(!isolated||!props.policyLoaded||!frame.current)return;
    let live=true;setReady(false);setError('');
    const options={
      editable:()=>latest.current.editable&&!running.current&&!closing.current,
      onInvalid:()=>{if(live){setRecord(null);latest.current.onDocChange(null,null);}},
      onStatus:(text:string)=>{if(live)setStatus(text);},
      onError:(text:string)=>{if(live){setError(text);setRecord(null);latest.current.onDocChange(null,null);}},
      onSave:()=>latest.current.onRequestSave(),
      onFinish:()=>{if(!closing.current)latest.current.onRequestFinish?.();},
      onChange:(next:NativeDrawing)=>{
        if(!live)return;
        const text=writeNativeDrawing(next);sent.current=text;openingValue.current=text;recordRef.current=next;
        setRecord(next);setError('');latest.current.onChange(text);publish(next);
      }
    };
    let current=createNativeSketch(frame.current,options);session.current=current;
    void(async()=>{
      try {
        const transfer=await current.start(openingValue.current);
        if(!live)return;
        if(transfer) {current.dispose();current=createNativeSketch(frame.current!,options);session.current=current;await current.start('',transfer);}
        if(live){setReady(true);latest.current.onFlushReady(async()=>{if(running.current)await runDone.current;return live&&session.current===current?current.flush():false;});latest.current.onPersistReady?.(()=>current.confirmSaved());}
      } catch(e){if(live){setError(nativeError(e,'The native sketch could not be opened.'));latest.current.onDocChange(null,null);}}
    })();
    return()=>{live=false;latest.current.onFlushReady(null);latest.current.onPersistReady?.(null);current.dispose();session.current=null;};
  },[load.id,props.policyLoaded,isolated,publish]);
  useEffect(()=>{try{session.current?.applyPolicy();}catch(e){setError(nativeError(e,'The teacher setting could not be applied.'));}},[props.editable]);

  const run=useCallback(async (automatic=false)=>{
    const current=session.current;
    if(!current||running.current||closing.current&&!automatic||!ready||!latest.current.policyLoaded)return;
    const source=latest.current.source;const variable=latest.current.profileVariable;
    const abort=new AbortController();runAbort.current?.abort();runAbort.current=abort;
    running.current=true;failed.current=true;setBusy(true);setRunError('');latest.current.onDocChange(null,null);
    let settled!:()=>void;runDone.current=new Promise<void>(resolve=>{settled=resolve;});
    let replacing=false;let backup=sent.current;
    try {
      setStatus('Running your sketch script…');
      const program=await prepareSketchProgram(source,abort.signal,variable);
      if(abort.signal.aborted)return;
      if(!await current.flush())throw new Error('The open native sketch could not be captured. Keep the page open and try Run again.');
      backup=sent.current;
      const previous=recordRef.current;
      const hasWork=!!previous?.native.features[0]?.sketch?.curves.length;
      if(!automatic&&hasWork&&previous?.scriptSource===undefined&&!window.confirm('Run will rebuild the sketch from your script. Your hand-edited native drawing will be kept in History first. Continue?')) {setStatus('Run cancelled. Your native drawing is kept.');return;}
      if(hasWork&&!latest.current.onBeforeBuild())throw new Error('This computer could not keep your current work in History, so the sketch was not replaced.');
      replacing=true;await current.build(program);
      if(abort.signal.aborted)return;
      builtFor.current=variable??null;setBuiltVariable(variable??null);
      failed.current=false;publish(recordRef.current);
      setStatus(latest.current.source!==source||latest.current.profileVariable!==variable?'Your script changed during this run. Run again to update the view.':program.warnings.length?program.warnings.join(' · '):latest.current.checkRequired===false?'Built from script':'Built from script · ready for Check');
    } catch(e) {
      if(abort.signal.aborted)return;
      setRunError(nativeError(e,'The sketch script could not be built.'));latest.current.onDocChange(null,null);
      if(replacing){openingValue.current=backup;recordRef.current=null;setRecord(null);setReady(false);setLoad(old=>({id:old.id+1,value:backup}));}
      else setStatus('Run did not finish. Your previous sketch is kept.');
    } finally {
      if(!abort.signal.aborted){running.current=false;setBusy(false);session.current?.applyPolicy();}
      settled();
    }
  },[ready,publish]);
  // Rebuild saved source on open. Existing hand-edited native files stay intact
  // until the student explicitly chooses Run. Source always stays authoritative.
  useEffect(()=>{
    if(!ready||autoStarted.current||busy)return;
    autoStarted.current=true;
    const saved=recordRef.current;
    if(props.source!==NATIVE_SKETCH_SCRIPT&&(saved?.scriptSource!==undefined||saved?.generatedSource!==undefined&&saved.generatedSource!==props.source||!load.value||JSON.parse(load.value)?.version===1))void run(true);
  },[ready,busy,props.source,load.value,run]);
  const finishSketch=useCallback(async()=>{
    const current=session.current;if(!current||!ready||closing.current)return;
    closing.current=true;setFinishing(true);setRunError('');
    try{
      if(running.current)await runDone.current;
      const result=await finishCodedSketch({
        source:()=>latest.current.source,
        variable:latest.current.profileVariable||suggestedSketchVariable(latest.current.source),
        capture:async()=>{
          if(session.current!==current||!await current.flush())throw new Error('The current sketch could not be captured. Keep this page open and finish again.');
          return recordRef.current;
        },
        build:async()=>{await run(true);if(failed.current)throw new Error('Fix the sketch code and Run it before finishing.');},
        finish:()=>current.finish(),
        fresh:freshFor,
      });
      await latest.current.onFinishSketch?.(result);
    }catch(e){setRunError(nativeError(e,'The sketch could not be finished.'));throw e;}
    finally{closing.current=false;setFinishing(false);current.applyPolicy();}
  },[ready,run]);
  useEffect(()=>{latest.current.onFinishReady?.(ready&&!busy&&!finishing?finishSketch:null);return()=>latest.current.onFinishReady?.(null);},[ready,busy,finishing,finishSketch]);
  function resize(clientX:number) {const box=workspace.current?.getBoundingClientRect();if(box)setWidth(Math.max(25,Math.min(65,100*(clientX-box.left)/box.width)));}
  const key=JSON.stringify([props.value,props.source]);
  const current=record&&!failed.current&&!busy&&!record.editing&&record.scriptSource===props.source&&record.doc&&record.solver&&(props.profileVariable===undefined||builtVariable===props.profileVariable);
  const snapshot=current?{doc:record.doc!,solver:record.solver!,key}:null;
  const nativeOnly=record&&record.scriptSource===undefined&&!!record.native.features[0]?.sketch?.curves.length;
  const needsRun=ready&&!busy&&record?.scriptSource!==undefined&&(record.scriptSource!==props.source||props.profileVariable!==undefined&&builtVariable!==props.profileVariable);
  return <div className={styles.nativeStudio}>
    <div className={styles.studioToolbar}>
      <span>{props.policyReason} {props.profileVariable!==undefined?`Run shows ${props.profileVariable} from your script. Finish sketch returns to Model.`:props.onFinishSketch?'Code your profile, then Finish sketch to return to 3D.':'Run builds your 2D script in SolidCraft. Hand edits do not update the script.'}</span>
      <div className={styles.actions}>
        {props.source===NATIVE_SKETCH_SCRIPT&&<button disabled={busy||finishing} onClick={()=>props.onSourceChange(props.starterSource)}>Start script</button>}
        {ready&&!session.current?.editing&&<button disabled={!props.editable||busy||finishing} onClick={()=>void session.current?.edit()}>Edit sketch</button>}
        <button disabled={!ready||busy||finishing} onClick={()=>void session.current?.fit()}>Fit sketch</button>
        <button className={styles.run} disabled={!ready||!props.policyLoaded||busy||finishing} onClick={()=>void run()}>{busy?'Building…':'Run'}</button>
      </div>
    </div>
    {nativeOnly&&<p className={styles.notice}>Your native drawing is kept separately. Run rebuilds from code and keeps a copy of the drawing in History.</p>}
    {runError&&<p role="alert" className={styles.notice}>{runError}</p>}
    {error&&<p role="alert" className={styles.notice}>{error} Your saved work is kept.</p>}
    <div ref={workspace} className={`${styles.workspace} ${styles.lessonWorkspace}`} style={{'--editor-width':`${width}%`} as CSSProperties}>
      <section className={styles.editor} aria-label="2D script editor" onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();void run();}}}>
        <div className={styles.panelTitle}><b>{props.sourceName??'script.js'}</b><span>{props.profileVariable!==undefined?'sketches and 3D steps · mm':'2D sketch · mm'}</span></div>
        <div className={styles.code}><CodeMirrorPane value={props.source} onChange={text=>{failed.current=true;latest.current.onDocChange(null,null);props.onSourceChange(text);}} fileKey={props.lessonId}/></div>
      </section>
      <div className={styles.divider} role="separator" tabIndex={0} aria-label="Resize script editor" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={65} aria-valuenow={Math.round(width)}
        onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(w=>Math.max(25,Math.min(65,w+(e.key==='ArrowLeft'?-2:2))));}}}
        onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))resize(e.clientX);}} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)}/>
      <section className={styles.preview} aria-label="SolidCraft 2D sketch">
        <div className={styles.panelTitle}><b>{props.profileVariable!==undefined?`Sketch: ${props.profileVariable}`:'Native 2D sketch'}</b><span role="status">{needsRun?'Code changed · Run to update the sketch':status}</span></div>
        <div className={styles.nativeEngine}>
          {isolated&&<iframe {...{credentialless:''}} key={load.id} ref={frame} src="/solidcraft-preview/solidcraft/index.html" title="SolidCraft native 2D sketch editor"/>}
          {(!ready||!props.policyLoaded||busy||finishing)&&<div className={styles.nativeCover}>{isolated===false?'This sketch pilot needs isolated iframe storage, available in current Chrome or Edge. Your saved lesson files are kept.':error||(finishing?'Finishing sketch…':busy?'Building your 2D script…':'Opening SolidCraft…')}</div>}
        </div>
      </section>
    </div>
    {props.feedbackEnabled&&<details className={styles.nativeFeedback}><summary>AI sketch feedback</summary>{record?<CadFeedback lessonId={props.lessonId} drawing={record} snapshot={snapshot} drawingKey={key}/>:<p>Run the current script before asking for feedback.</p>}</details>}
  </div>;
}
