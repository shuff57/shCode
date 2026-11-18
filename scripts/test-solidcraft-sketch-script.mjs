import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sketchCommands, evaluateSketchScript } from '../lib/solidcraft-sketch-script.ts';
import { nativeModelDoc, readNativeDrawing, writeNativeDrawing } from '../lib/solidcraft-native-format.ts';
import { grade } from '../lib/grader.ts';
import { createNativeSketch } from '../lib/solidcraft-native.ts';
import { mapSketch } from '../vendor/solidcraft-preview/pane/bundle/host-lib.js';
const bundle=fs.readFileSync('vendor/solidcraft-preview/pane/bundle/runner.js','utf8');
const base='lessons/9-1-13-lab-organizer-outline/';
const meta=JSON.parse(fs.readFileSync(base+'lesson.json','utf8'));
const reference=fs.readFileSync(base+'solution/script.js','utf8');
const starter=fs.readFileSync(base+'script.js','utf8');
const fixture=readNativeDrawing(fs.readFileSync('scripts/fixtures/solidcraft-native-organizer.json','utf8'));
const nativeRecord=(source,doc)=>({...fixture,scriptSource:source,doc,editing:false});
const score=(source,doc,record=nativeRecord(source,doc))=>grade(meta.requirements,{'script.js':source,'sketch.json':writeNativeDrawing(record)},0,{modelDoc:doc}).results;
function interpret(source){let listener,result;const parent={postMessage:v=>{result=v;}};const window={parent,addEventListener:(_,fn)=>{listener=fn;}};vm.runInNewContext(bundle,{window,console});listener({source:parent,data:{source:'reshape-run',runId:1,code:source}});assert.deepEqual(Array.from(result.errors),[]);return JSON.parse(JSON.stringify(result.doc));}
const sources=[reference,starter,starter.replace('width = 50','width = 60').replace('depth = 30','depth = 40'),`class Footprint {
 constructor(w,d) { this.width=w; this.depth=d; }
 draw(sk) { const r=sk.rectangle([0,0],[this.width,this.depth]); sk.length(r.bottom,this.width); sk.length(r.right,this.depth); }
}
const sk=sketch('top'); const part=new Footprint(60,40); part.draw(sk);`];
for(const source of sources){const doc=interpret(source);const commands=sketchCommands(doc,mapSketch);assert.equal(commands[0].params.plane,'XY');assert.equal(commands.at(-1).command,'sketch.finish');assert.equal(commands.every(c=>c.command.startsWith('sketch.')),true);}
assert.throws(()=>sketchCommands(interpret('box(60,40,1);'),mapSketch),/flat XY/);
assert.throws(()=>sketchCommands(interpret("sketch('front').rectangle([0,0],[60,40]);"),mapSketch),/flat XY/);
const big=interpret(reference);big.features[0].geoms[0].a[0]=Infinity;assert.throws(()=>sketchCommands(big,mapSketch),/finite/);
const many=interpret(reference);many.features[0].geoms=Array(257).fill(many.features[0].geoms[0]);assert.throws(()=>sketchCommands(many,mapSketch),/too much/);
assert.throws(()=>sketchCommands(interpret(reference),()=>({ok:false,commands:[],refusals:[{sentence:'Unsupported constraint.'}]})),/Unsupported constraint/);
assert.equal(score(reference,fixture.doc).every(r=>r.status==='passed'),true);
assert.equal(score(reference+'\n// edited',fixture.doc,nativeRecord(reference,fixture.doc)).every(r=>r.status==='failed'),true);
assert.equal(score(reference,fixture.doc,fixture).every(r=>r.status==='failed'),true,'hand work cannot pass the script-driven criterion');
assert.equal(score(reference,fixture.doc,{...nativeRecord(reference,fixture.doc),editing:true}).every(r=>r.status==='failed'),true);
assert.equal(score(reference,null,nativeRecord(reference,fixture.doc)).every(r=>r.status==='failed'),true);

// Exercise the actual opaque-frame protocol with the bundled interpreter, not a
// replacement evaluator. Wrong-window / wrong-run messages cannot settle a run.
const original={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};
const host=new EventTarget();let frames=[];let listener;
const dispatch=(data,source)=>{const event=new Event('message');Object.assign(event,{data:structuredClone(data),source});host.dispatchEvent(event);};
const fakeDocument={createElement(){const frame={attrs:{},removed:false,setAttribute(k,v){this.attrs[k]=v;},remove(){this.removed=true;}};frame.contentWindow={postMessage(data){listener({source:host,data});}};frames.push(frame);return frame;},body:{append(frame){assert.equal(frame.attrs.sandbox,'allow-scripts');assert.equal(frame.attrs.sandbox.includes('allow-same-origin'),false);assert.match(frame.srcdoc,/default-src 'none'/);host.postMessage=data=>queueMicrotask(()=>dispatch(data,frame.contentWindow));const child={parent:host,addEventListener:(_,fn)=>{listener=fn;}};vm.runInNewContext(bundle,{window:child,console});dispatch({source:'reshape-result',runId:1,doc:{}},{});dispatch({source:'reshape-result',runId:-1,doc:{}},frame.contentWindow);}}};
globalThis.window=host;globalThis.document=fakeDocument;globalThis.fetch=async()=>({ok:true,text:async()=>bundle});
try {
 const result=await evaluateSketchScript(reference,new AbortController().signal);assert.deepEqual(result.doc,interpret(reference));assert.equal(frames.at(-1).removed,true);
 await assert.rejects(evaluateSketchScript('const broken = ;',new AbortController().signal),/Line|Unexpected|expected|expression/i);assert.equal(frames.at(-1).removed,true);
 const abort=new AbortController();abort.abort();await assert.rejects(evaluateSketchScript(reference,abort.signal),/cancelled/);
}finally{Object.assign(globalThis,original);}

// Exercise the native session's real build/capture/policy control flow. Native
// geometry is checked separately on the pinned solver below; this facade controls
// revisions, file exports and failures so partial builds cannot leak into grades.
{
 const raf=globalThis.requestAnimationFrame;
 globalThis.requestAnimationFrame=fn=>{queueMicrotask(fn);return 0;};
 class Node extends EventTarget {style={};hidden=false;remove(){}}
 let native=structuredClone(fixture.native),editing=false,revision=0,failCommand=null,editable=false,finished=0;
 const elements=[],records=[],files=new Map();let commands=[];
 const empty=()=>{const d=structuredClone(fixture.native);d.features[0].sketch.points=d.features[0].sketch.points.slice(0,1);d.features[0].sketch.curves=[];d.features[0].sketch.constraints=[];d.params=[];return d;};
 const directory={async getFileHandle(name){if(!files.has(name))throw Error('missing export');return {async getFile(){return new Blob([files.get(name)]);}};},async removeEntry(name){files.delete(name);}};
 const win=new EventTarget();win.credentialless=true;win.navigator={storage:{getDirectory:async()=>directory}};
 win.solidcraft={async request(method){
  if(method==='document.revision')return revision;
  if(method==='document.inspect')return {bodies:[],active_sketch:editing?1:null,sketches:[{name:'Script sketch',curves:native.features[0].sketch.curves.length}],timeline:[{type:'Sketch'}]};
  if(method==='ui.inspect')return {viewport:[0,151,800,450],camera:{distance:100}};
  if(method==='ui.handles')return [{name:'tab:SKETCH',x:400,y:49},{name:'ribbon:workspace',x:44,y:92},{name:'button:sketch.finish',x:700,y:96}];
  if(method==='ui.selection')return {};
  if(method==='ui.camera'&&!native.features[0].sketch.curves.length)throw Error('nothing is shown to fit');
  return {};
 },async execute(command,params){
  if(command===failCommand)throw Error('The native engine refused this constraint.');
  if(command==='file.export'){const text=JSON.stringify(native);files.set(params.path.slice('/opfs/'.length),text);return {bytes:new TextEncoder().encode(text).length};}
  if(command==='sketch.inspect')return {status:'solved',failing:[],dof:0,profiles:[{}],curves:native.features[0].sketch.curves.length?fixture.doc.features[0].geoms.map(g=>({type:'line',start_at:g.a,end_at:g.b})):[]};
  commands.push(command);revision++;
  if(command==='file.new'){native=empty();editing=false;}
  if(command==='sketch.create'||command==='sketch.edit')editing=true;
  if(command==='sketch.finish'){native=structuredClone(fixture.native);editing=false;}
  return {};
 }};
 const frame={contentWindow:win,contentDocument:{createElement:()=>new Node(),body:{append:(...nodes)=>elements.push(...nodes)}},clientWidth:800,getBoundingClientRect:()=>({width:800})};
 const session=createNativeSketch(frame,{editable:()=>editable,onChange:r=>records.push(r),onInvalid(){},onStatus(){},onError:e=>{throw Error(e);},onSave(){},onFinish(){finished++;}});
 try {
  await session.start('');
  const program={source:reference,commands:sketchCommands(interpret(reference),mapSketch),warnings:[]};
  await session.build(program);
  assert.equal(records.at(-1).scriptSource,reference,'Run works when teacher hand tools are off');
  assert.equal(elements[1].hidden,false,'finished native view stays covered');
  await session.flush();assert.equal(records.at(-1).scriptSource,reference,'saving an unchanged native document retains its source binding');
  files.set('recovery.sc','owned recovery');files.set('recovery.json','{}');
  await session.confirmSaved();assert.equal(files.has('recovery.sc'),false);assert.equal(files.has('recovery.json'),false);
  native.params[0].expr='55 mm';revision++;
  files.set('recovery.sc','uncaptured work');await session.confirmSaved();assert.equal(files.has('recovery.sc'),true,'a recovery copy is kept if the native design changed since capture');
  await session.flush();assert.equal(records.at(-1).scriptSource,undefined,'native hand changes invalidate the script binding');
  editable=true;await session.edit();assert.equal(elements[1].hidden,true);
  editable=false;session.applyPolicy();assert.equal(elements[1].hidden,false,'teacher pause covers native sketch input');
  const key=new Event('keydown',{cancelable:true});Object.assign(key,{key:'l'});win.dispatchEvent(key);assert.equal(key.defaultPrevented,true);
  assert.equal(await session.finish(),true,'teacher pause still allows leaving Sketch');
  assert.equal(finished,1,'native Finish signals the managed Model transition');
  assert.equal(records.at(-1).editing,false);
  const before=records.length;failCommand='sketch.line';
  await assert.rejects(session.build(program),/refused this constraint/);
  assert.equal(records.length,before,'a partial failed build cannot publish geometry or saved work');
  assert.equal(elements[1].hidden,false,'failed native work stays covered until the owner restores the prior file');
 } finally {session.dispose();globalThis.requestAnimationFrame=raf;}
}

if(process.argv.includes('--kernel')){
 const dir=process.argv[process.argv.indexOf('--kernel')+1];const kernel=createRequire(import.meta.url)(path.join(path.resolve(dir),'solidcraft_referee_p2.js'));
 for(const source of [...sources,reference.replace('60,40','55,40').replace('bottom, 60','bottom, 55')]){
  const commands=sketchCommands(interpret(source),mapSketch);
  const result=JSON.parse(kernel.run(JSON.stringify({commands:[...commands,{command:'sketch.inspect',params:{sketch:'Script sketch'}}]})));
  const failure=result.results.find(r=>!r.ok);assert.equal(failure,undefined,JSON.stringify(failure));assert.equal(result.measure.out.bodies.length,0);
  const solved=result.results.at(-1).out;assert.equal(solved.status,'solved');assert.deepEqual(solved.failing,[]);
  const doc=nativeModelDoc(solved);assert.ok(doc);
  const grades=score(source,doc);
  if(source===starter){assert.equal(grades[0].status,'passed');assert.equal(grades[1].status,'failed');assert.equal(grades[2].status,'failed');}
  else if(source.includes('55'))assert.equal(grades[1].status,'failed');
  else {assert.equal(grades.every(r=>r.status==='passed'),true);assert.ok(Math.abs(solved.profiles[0].area_mm2-2400)<1e-6,'actual native solver agrees with independent rectangle arithmetic');}
 }
 console.log('Pinned SolidCraft: procedural and class-based 2D scripts, native dimensions, independent area, wrong sizes, no solids and replay pass.');
}
console.log('2D scripts: opaque sandbox protocol, preflight scope/limits, source binding, stale/hand-edit rejection and cleanup pass.');
