import type { ModelDoc } from './model-types';
import { sketchProbe } from './solidcraft-project';

export interface SketchCommand { command:string; params:Record<string,unknown> }
type Mapper=(sketch:unknown,options:{name:string})=>{ok:boolean;commands:SketchCommand[];refusals:{sentence:string}[]};
export interface SketchProgram { source:string; commands:SketchCommand[]; warnings:string[] }
let runnerBundle:Promise<string>|undefined;
let sequence=0;

export interface ScriptRunError { line?:number; message?:string }
const errorText=(errors:ScriptRunError[])=>errors.slice(0,5).map(e=>`${e.line?`Line ${e.line}: `:''}${String(e.message??'The script could not run.')}`).join('\n');
/** Only the opaque iframe executes student source. The parent receives JSON. */
export async function evaluateSketchScript(source:string,signal:AbortSignal):Promise<{doc:ModelDoc;warnings:string[]}> {
  const result=await runSketchScript(source,signal);
  if(result.errors.length)throw new Error(errorText(result.errors));
  return {doc:result.doc!,warnings:result.warnings};
}
/** The same run, with the script's own errors returned instead of thrown. */
async function runSketchScript(source:string,signal:AbortSignal):Promise<{doc:ModelDoc|null;warnings:string[];errors:ScriptRunError[]}> {
  if(source.length>100000)throw new Error('Keep this sketch script within 100,000 characters.');
  if(signal.aborted)throw new Error('The sketch run was cancelled.');
  runnerBundle??=fetch('/solidcraft-preview/pane/bundle/runner.js').then(r=>{if(!r.ok)throw new Error('The sketch script runner is unavailable.');return r.text();}).catch(e=>{runnerBundle=undefined;throw e;});
  const bundle=await runnerBundle;
  if(signal.aborted)throw new Error('The sketch run was cancelled.');
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');
    frame.setAttribute('sandbox','allow-scripts');
    frame.hidden=true;frame.title='2D sketch script sandbox';
    const runId=++sequence;
    const done=(error?:Error,result?:{doc:ModelDoc|null;warnings:string[];errors:ScriptRunError[]})=>{
      clearTimeout(timeout);window.removeEventListener('message',message);signal.removeEventListener('abort',abort);frame.remove();
      if(error)reject(error);else resolve(result!);
    };
    const abort=()=>done(new Error('The sketch run was cancelled.'));
    const message=(event:MessageEvent)=>{
      if(event.source!==frame.contentWindow)return;
      const data=event.data;
      if(data?.source==='reshape-runner-ready'){frame.contentWindow!.postMessage({source:'reshape-run',runId,code:source},'*');return;}
      if(data?.source!=='reshape-result'||data.runId!==runId)return;
      if(!Array.isArray(data.errors))return done(new Error('The sketch runner returned an invalid result.'));
      const errors=data.errors.slice(0,20).map((e:ScriptRunError)=>({line:Number.isSafeInteger(e?.line)?e.line:undefined,message:String(e?.message??'The script could not run.')}));
      done(undefined,{doc:errors.length?null:data.doc,warnings:Array.isArray(data.warnings)?data.warnings.slice(0,10).map(String):[],errors});
    };
    const timeout=setTimeout(()=>done(new Error('The sketch script took longer than 10 seconds. Simplify it and Run again.')),10000);
    window.addEventListener('message',message);signal.addEventListener('abort',abort,{once:true});
    frame.srcdoc=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'"><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script>`;
    document.body.append(frame);
  });
}

/** Refuse non-2D or oversized output before replacing any open native work. */
export function sketchCommands(doc:ModelDoc,mapSketch:Mapper):SketchCommand[] {
  const sketch=doc?.features?.[0];
  if(doc?.version!==1||doc.features?.length!==1||sketch?.kind!=='sketch'||sketch.plane!=='xy'||sketch.offset!==0||sketch.frame||!Array.isArray(sketch.geoms))throw new Error('This lesson accepts one flat XY sketch only. Use sketch(\'top\') without any 3D operations.');
  if(sketch.geoms.length>256||(sketch.rules?.length??0)>512||JSON.stringify(doc).length>200000)throw new Error('This sketch has too much geometry or too many constraints for the lesson.');
  function bounded(value:unknown,depth=0):boolean {
    if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<=100000;
    if(value===null||typeof value!=='object')return true;
    return depth<16&&Object.values(value).every(v=>bounded(v,depth+1));
  }
  if(!bounded(doc))throw new Error('Use finite sketch measurements within 100,000 mm.');
  const mapped=mapSketch(sketch,{name:'Script sketch'});
  if(!mapped.ok)throw new Error(`The sketch cannot be built: ${mapped.refusals.map(r=>r.sentence).join('; ')}`);
  // The mapper normally uses an explicit coordinate frame. This scope has already
  // verified the XY origin plane, so keep that named native plane in saved files.
  const commands=mapped.commands.map(c=>c.command==='sketch.create'?{...c,params:{...c.params,plane:'XY'}}:c);
  commands.push({command:'sketch.finish',params:{}});
  if(commands.some(c=>!c.command.startsWith('sketch.')))throw new Error('This lesson accepts sketch operations only.');
  return commands;
}

/**
 * One sketch out of a whole CAD script: the sketch `variable` holds once the script
 * has run. The script is run with one extra step, `extrude(variable, 1)`, whose
 * target the interpreter reports (solidcraft-project.ts, sketchProbe). Only that
 * sketch is returned; the 3D steps around it are not built here.
 */
export function pickSketch(doc:ModelDoc|null,errors:ScriptRunError[],variable:string,probeLine:number):ModelDoc {
  const own=errors.filter(e=>e.line!==probeLine);
  if(own.length)throw new Error(errorText(own));
  if(errors.length){
    const said=errors.map(e=>e.message??'').join(' ');
    throw new Error(/needs a sketch/.test(said)?`${variable} does not hold a sketch. Choose a variable made with sketch('top'), or one a function or class returned.`:`${variable} could not be read at the end of script.js: ${said}`);
  }
  const probe=doc?.features?.at(-1) as {kind?:string;target?:string}|undefined;
  const sketch=probe?.kind==='extrude'?doc!.features.find(f=>f.id===probe.target):undefined;
  if(!sketch||sketch.kind!=='sketch')throw new Error(`${variable} does not hold a sketch. Choose a variable made with sketch('top'), or one a function or class returned.`);
  if(sketch.plane!=='xy'||sketch.offset!==0||sketch.frame)throw new Error(`The Sketch view shows sketches on 'top' only, and ${variable} is drawn on another plane. It still works in your 3D steps.`);
  return {...doc!,features:[sketch]};
}

export async function prepareSketchProgram(source:string,signal:AbortSignal,variable?:string):Promise<SketchProgram> {
  let result:{doc:ModelDoc;warnings:string[]};
  if(variable===undefined)result=await evaluateSketchScript(source,signal);
  else {
    const probe=sketchProbe(source,variable);
    const run=await runSketchScript(probe.source,signal);
    result={doc:pickSketch(run.doc,run.errors,variable,probe.line),warnings:run.warnings};
  }
  const modulePath='/solidcraft-preview/pane/bundle/host-lib.js';
  const {mapSketch}=await import(/* webpackIgnore: true */ modulePath) as {mapSketch:Mapper};
  if(signal.aborted)throw new Error('The sketch run was cancelled.');
  return {source,commands:sketchCommands(result.doc,mapSketch),warnings:result.warnings};
}
