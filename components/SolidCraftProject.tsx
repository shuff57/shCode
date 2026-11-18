'use client';
import { useEffect, useId, useRef, useState } from 'react';
import SolidCraftStudio from './SolidCraftStudio';
import SolidCraftSketch from './SolidCraftSketch';
import { CAD_NATIVE_SKETCH, CAD_SETTINGS_FILE, CAD_SOURCE, SOLIDCRAFT_PROJECT_STARTER, appendNewSketch, appendSketchExtrusion, cadSettings, cadSketchLink, cadView, isLegacyLinkedProject, mergeLegacySketch, projectSketchVariable, sketchVariables, type CadSketchLink } from '../lib/solidcraft-project';
import { prepareSketchProgram } from '../lib/solidcraft-sketch-script';
import styles from './solidcraft-sandbox.module.css';

// One script.js holds the sketches and the 3D steps. Sketch shows one sketch
// variable of it in SolidCraft's native 2D view; Model builds the whole file.
export default function SolidCraftProject(props:{
  lessonId:string;files:Record<string,string>;toolsAllowed:boolean;policyLoaded:boolean;policyReason:string;
  onFileChange(path:string,text:string):void;
  onBeforeChange():Promise<boolean>;
  onBeforeBuild(label?:string):boolean;
  onBeforeLink():boolean;
  onSelectSource(path:string):void;
  onFlushReady(flush:(()=>Promise<boolean>)|null):void;
  onPersistReady(confirmSaved:(()=>Promise<void>)|null):void;
  onSave():void;
}) {
  const view=cadView(props.files);
  const source=props.files[CAD_SOURCE]??SOLIDCRAFT_PROJECT_STARTER;
  let link:CadSketchLink|null=null,linkError='';
  try{link=cadSketchLink(props.files);}catch(e){linkError=e instanceof Error?e.message:'The sketch link could not be read.';}
  const legacy=!linkError&&isLegacyLinkedProject(props.files);
  const [switching,setSwitching]=useState(false);
  const [note,setNote]=useState('');
  const [height,setHeight]=useState('10');
  const [variable,setVariable]=useState<string|null>(null);
  const finishRef=useRef<(()=>Promise<void>)|null>(null);
  const [canFinish,setCanFinish]=useState(false);
  const [runRequest,setRunRequest]=useState(0);
  const buildAbort=useRef<AbortController|null>(null);
  const latest=useRef(props);latest.current=props;
  const listId=useId();
  const chosen=(variable??projectSketchVariable(source,link)).trim();
  const candidates=[...new Set([...sketchVariables(source),...(link?[link.variable]:[])])];
  useEffect(()=>()=>buildAbort.current?.abort(),[]);
  useEffect(()=>{
    if(props.files[CAD_SOURCE]===undefined)props.onFileChange(CAD_SOURCE,SOLIDCRAFT_PROJECT_STARTER);
    props.onSelectSource(CAD_SOURCE);
  },[props.lessonId,props.files[CAD_SOURCE]===undefined]);
  // A project saved with the older two files: put its sketch into script.js once,
  // after keeping the two files in History. sketch.js itself is left as it was.
  useEffect(()=>{
    if(!legacy)return;
    if(!props.onBeforeLink()){setNote('Your sketch is still in sketch.js because this computer could not keep a copy in History. Keep this page open and reload to try again.');return;}
    try{
      const merged=mergeLegacySketch(latest.current.files);
      props.onFileChange(CAD_SOURCE,merged.source);props.onFileChange(CAD_SETTINGS_FILE,cadSettings(view,merged.link));
      setNote('Your sketch from sketch.js is now at the top of script.js, so your 3D steps can use it directly. The two old files are kept in History.');
    }catch(e){setNote(e instanceof Error?e.message:'The sketch could not be moved into script.js.');}
  },[legacy,props.lessonId]);
  // Source-only 3D work needs no asynchronous native sketch capture.
  useEffect(()=>{if(view==='solid'){props.onFlushReady(null);props.onPersistReady(null);}},[view]);
  async function openSketch(fresh:boolean) {
    if(switching)return;
    setSwitching(true);setNote('');
    try {
      if(!await props.onBeforeChange())throw new Error('The current work could not be saved. Keep this page open and try again.');
      const files=latest.current.files;const current=files[CAD_SOURCE]??SOLIDCRAFT_PROJECT_STARTER;
      let name=(variable??projectSketchVariable(current,link)).trim();
      if(fresh||!sketchVariables(current).length&&!link){const added=appendNewSketch(current);props.onFileChange(CAD_SOURCE,added.source);name=added.variable;}
      setVariable(name);props.onFileChange(CAD_SETTINGS_FILE,cadSettings('sketch',{variable:name}));
    }catch(e){setNote(e instanceof Error?e.message:'The sketch could not be opened.');}
    finally {setSwitching(false);}
  }
  async function finishSketch(){
    if(switching||!finishRef.current)return;
    setSwitching(true);setNote('');
    try{await finishRef.current();}
    catch(e){setNote(e instanceof Error?e.message:'The sketch could not be finished.');}
    finally{setSwitching(false);}
  }
  async function acceptFinishedSketch(result:{source:string;variable:string}){
    const abort=new AbortController();buildAbort.current?.abort();buildAbort.current=abort;
    if(!await props.onBeforeChange())throw new Error('The current sketch could not be saved. Keep this page open and try again.');
    await prepareSketchProgram(result.source,abort.signal,result.variable);
    if(abort.signal.aborted)return;
    if(latest.current.files[CAD_SOURCE]!==result.source)throw new Error('Your code changed while finishing. Finish sketch again to use the current code.');
    props.onFileChange(CAD_SETTINGS_FILE,cadSettings('solid',{variable:result.variable}));setVariable(null);setRunRequest(n=>n+1);
  }
  async function extrudeSketch(){
    if(switching)return;
    setSwitching(true);setNote('');
    try{
      if(!await props.onBeforeChange())throw new Error('The current work could not be saved. Keep this page open and try again.');
      const next=appendSketchExtrusion(latest.current.files[CAD_SOURCE]??SOLIDCRAFT_PROJECT_STARTER,chosen,Number(height));
      if(!props.onBeforeLink())throw new Error('The current 3D steps could not be kept in History.');
      props.onFileChange(CAD_SOURCE,next);props.onFileChange(CAD_SETTINGS_FILE,cadSettings('solid',{variable:chosen}));setRunRequest(n=>n+1);
    }catch(e){setNote(e instanceof Error?e.message:'The extrusion could not be started.');}
    finally{setSwitching(false);}
  }
  const picker=<label>Sketch<input list={listId} value={variable??projectSketchVariable(source,link)} disabled={switching} onChange={e=>setVariable(e.target.value)} spellCheck={false} aria-describedby={`${listId}-hint`}/>
    <datalist id={listId}>{candidates.map(n=><option key={n} value={n}/>)}</datalist></label>;
  return <section className={styles.cadProject} aria-label="SolidCraft CAD workspace">
    <div className={styles.cadViews}>
      <strong>SolidCraft CAD</strong>
      <span aria-live="polite">{view==='sketch'?'Sketch':'Model'}</span>
      {view==='sketch'?<button className={styles.finishSketch} disabled={switching||!canFinish} onClick={()=>void finishSketch()}>{switching?'Finishing…':'Finish sketch'}</button>
        :<div><button disabled={switching||legacy} onClick={()=>void openSketch(false)}>Sketch</button><button disabled={switching||legacy} onClick={()=>void openSketch(true)}>New sketch</button></div>}
      <span>{view==='sketch'?'Edit script.js, then Run to update this sketch.':'Sketches and 3D steps share script.js. Use a sketch variable directly, like extrude(sk, 10).'}</span>
    </div>
    {!linkError&&<div className={styles.sketchToPart}>
      {picker}
      {view==='solid'&&<><label>Height (mm)<input type="number" min="0.001" max="100000" step="1" value={height} disabled={switching} onChange={e=>setHeight(e.target.value)}/></label><button className="btn-run" disabled={switching||legacy||!chosen} onClick={()=>void extrudeSketch()}>Extrude</button></>}
      <span id={`${listId}-hint`}>{view==='solid'?<>Extrude adds <code>const part = extrude({chosen||'sk'}, {height||'10'});</code> to the end of script.js.</>:'A sketch made by a function or class works too: assign what it returns to a variable outside it.'}</span>
    </div>}
    {note&&<p role="alert" className={styles.notice}>{note}</p>}
    {linkError?<p role="alert" className={styles.notice}>{linkError}</p>:view==='sketch'?<SolidCraftSketch
      lessonId={props.lessonId} value={props.files[CAD_NATIVE_SKETCH]??''} source={source} sourceName={CAD_SOURCE} starterSource={SOLIDCRAFT_PROJECT_STARTER} checkRequired={false}
      editable={props.toolsAllowed} policyLoaded={props.policyLoaded} policyReason={props.policyReason}
      onChange={text=>props.onFileChange(CAD_NATIVE_SKETCH,text)} onSourceChange={text=>props.onFileChange(CAD_SOURCE,text)}
      profileVariable={chosen}
      onFinishReady={finish=>{finishRef.current=finish;setCanFinish(!!finish);}} onRequestFinish={()=>void finishSketch()} onFinishSketch={acceptFinishedSketch}
      onBeforeBuild={props.onBeforeBuild} onDocChange={()=>{}} onFlushReady={props.onFlushReady} onPersistReady={props.onPersistReady} onRequestSave={props.onSave}
    />:<SolidCraftStudio runRequest={runRequest} lessonId={props.lessonId} value={source} onChange={text=>props.onFileChange(CAD_SOURCE,text)}
      projectSketch onSelectSource={props.onSelectSource}
      onFlushReady={props.onFlushReady} onPersistReady={props.onPersistReady}
      toolsAllowed={props.toolsAllowed} policyLoaded={props.policyLoaded} policyReason={props.policyReason}/>
    }
  </section>;
}
