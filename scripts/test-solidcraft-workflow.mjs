import assert from 'node:assert/strict';
import fs from 'node:fs';
import { appendSketchExtrusion,projectSketchVariable,sketchProbe,suggestedSketchVariable } from '../lib/solidcraft-project.ts';
import { pickSketch } from '../lib/solidcraft-sketch-script.ts';
import { readNativeDrawing,writeNativeDrawing } from '../lib/solidcraft-native-format.ts';
import { finishCodedSketch } from '../lib/solidcraft-sketch-finish.ts';
import { createStudentTools } from '../lib/solidcraft-student-tools.ts';
import { sandboxCadPolicy } from '../lib/solidcraft-policy.ts';
import { evaluateCad,buildCad } from './_solidcraft-harness.mjs';
const drawing=readNativeDrawing(fs.readFileSync('scripts/fixtures/solidcraft-native-organizer.json','utf8'));
const source=`class Outline {
  constructor(width,depth) { this.width=width; this.depth=depth; }
  draw() {
    const inner=sketch('top');
    inner.rectangle([0,0],[this.width,this.depth]);
    return inner;
  }
}
const outline=new Outline(60,40).draw();
`;
const circleSource="const sk=sketch('top');sk.circle(12,{at:[12,14]});";
const evaluated=evaluateCad(source);assert.deepEqual(evaluated.errors,[]);
// Old generated drawings remain readable, without turning them into current
// script-built grading evidence or using them to replace the student's source.
const generated={...drawing,generatedSource:source};
assert.deepEqual(readNativeDrawing(writeNativeDrawing(generated)).native,drawing.native);
assert.throws(()=>writeNativeDrawing({...generated,scriptSource:source}),/generated/);
assert.equal(readNativeDrawing(writeNativeDrawing(generated)).scriptSource,undefined);

// Exercise the Finish path itself: source is read-only throughout, including
// failures, mouse divergence and source edits during an asynchronous build.
function session(record={...drawing,scriptSource:source}){
 const state={source,record:structuredClone(record),builds:0,finished:0,history:[]};
 const options={
  source:()=>state.source,variable:'outline',
  capture:async()=>structuredClone(state.record),
  build:async()=>{state.builds++;state.history.push(structuredClone(state.record));state.record={...structuredClone(drawing),scriptSource:state.source,editing:false};},
  finish:async()=>{state.finished++;state.record.editing=false;return true;},
 };
 return {state,options};
}
{
 const {state,options}=session();
 assert.deepEqual(await finishCodedSketch(options),{source,variable:'outline'});
 assert.equal(state.source,source);assert.equal(state.builds,0);assert.equal(state.finished,1);
}
{
 const {state,options}=session({...drawing,scriptSource:source,editing:true});
 await finishCodedSketch(options);assert.equal(state.record.editing,false);assert.equal(state.source,source,'closing an optional native edit never re-emits the class');
}
{
 const {state,options}=session();state.source=source.replace('60,40','72,40');
 const result=await finishCodedSketch(options);
 assert.equal(result.source,state.source);assert.match(result.source,/class Outline/);assert.equal(state.builds,1);
 assert.equal(state.history[0].scriptSource,source,'the previous preview is kept before changed code builds');
}
{
 const {state,options}=session(drawing);const original=structuredClone(state.record);
 await assert.rejects(finishCodedSketch(options),/mouse edits.*Run/);
 assert.equal(state.source,source);assert.deepEqual(state.record,original);assert.equal(state.builds,0);assert.equal(state.finished,0);
}
{
 const {state,options}=session(generated);
 await finishCodedSketch(options);assert.equal(state.source,source);assert.equal(state.builds,1);assert.deepEqual(state.history[0].native,drawing.native,'legacy generated native work is kept in History');
}
{
 const {state,options}=session({...drawing,doc:null,scriptSource:source});
 await finishCodedSketch(options);assert.equal(state.builds,0,'an unsupported grading snapshot does not block a solver-verified coded sketch');
}
{
 const {state,options}=session();state.source+='// changed code\n';
 options.build=async()=>{throw Error('The sketch code could not be built.');};
 await assert.rejects(finishCodedSketch(options),/could not be built/);assert.equal(state.finished,0);assert.ok(state.source.endsWith('// changed code\n'));
}
{
 const {state,options}=session();state.source+='// edit\n';
 const build=options.build;options.build=async()=>{await build();state.source+='// newer edit\n';};
 await assert.rejects(finishCodedSketch(options),/code changed while finishing/);assert.equal(state.finished,0);
}
{
 const {state,options}=session();state.source+='// edit\n';options.build=async()=>{};
 await assert.rejects(finishCodedSketch(options),/Run the current sketch code/);assert.ok(state.source.endsWith('// edit\n'),'a stale native preview cannot finish as the new code');
}
{
 // One script can hold several sketches: a drawing built for another variable is rebuilt before Finish, and a stale one cannot finish.
 const {state,options}=session();let fresh=false;options.fresh=()=>fresh;const build=options.build;options.build=async()=>{await build();fresh=true;};
 assert.deepEqual(await finishCodedSketch(options),{source,variable:'outline'});assert.equal(state.builds,1,'the chosen sketch is built before finishing');
}
{
 const {state,options}=session();options.fresh=()=>false;
 await assert.rejects(finishCodedSketch(options),/Run the current sketch code/);assert.equal(state.builds,1);assert.equal(state.source,source);
}
{
 const {state,options}=session();options.finish=async()=>false;
 await assert.rejects(finishCodedSketch(options),/could not be finished/);assert.equal(state.source,source);
}
assert.equal(sandboxCadPolicy('student',true,null).toolsAllowed,false);
for(const role of ['teacher','admin']){assert.equal(sandboxCadPolicy(role,true,null).toolsAllowed,true);assert.equal(sandboxCadPolicy(role,false,null).toolsAllowed,false);}
for(const policy of [null,{classDefault:'code',lessons:{}},{classDefault:'both',lessons:{'sandbox-reshape':'code'}}])assert.equal(sandboxCadPolicy('student',true,policy).toolsAllowed,false);
assert.equal(sandboxCadPolicy('student',false,{classDefault:'both',lessons:{}}).toolsAllowed,true,'only the teacher policy enables student drawing');
assert.equal(projectSketchVariable("const outline=new Profile().draw();const width=10;",{variable:'outline'}),'outline','a saved public export survives unrelated later variables');
assert.equal(projectSketchVariable("const outline=new Profile().draw();",{variable:'sk1'}),'outline','renaming the public sketch updates the suggested link');
assert.equal(suggestedSketchVariable(source),'outline');
assert.deepEqual(evaluateCad(source).doc.features.map(f=>f.kind),['sketch'],'Finish adds nothing to the script, so it makes no solid');
{const probe=sketchProbe(source,'outline');const r=evaluateCad(probe.source);assert.deepEqual(pickSketch(r.doc,r.errors,'outline',probe.line).features.map(f=>f.kind),['sketch'],'the Sketch view gets the class-made sketch only');}
const initial=appendSketchExtrusion(source,'outline',8);assert.match(initial,/\nconst part = extrude\(outline, 8\);\n$/);
const custom=source+'const part = box(2,3,4);\nconst part2 = box(3,4,5);';
const appended=appendSketchExtrusion(custom,'outline',8);assert.ok(appended.startsWith(custom));assert.match(appended,/const part3 = extrude\(outline, 8\)/);
for(const h of [0,-1,Infinity,NaN,100001])assert.throws(()=>appendSketchExtrusion(source,'outline',h),/height/);
// The saved-source cleanup locks direct native input even for author tools.
{
 const oldRaf=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=fn=>{queueMicrotask(fn);return 0;};
 class Element extends EventTarget {style={removeProperty(){}};hidden=true;setAttribute(){};remove(){}}
 const win=new EventTarget();let escapes=0,activeTool=false;win.solidcraft={async request(method){if(method==='ui.key')escapes++;return {tool:activeTool?'rectangle':null,ui:{layout:'compact',showBrowser:false,showTimeline:false,showNavigationBar:false},viewport:[0,151,800,449],camera:{distance:100}};}};
 const native={contentWindow:win,style:{removeProperty(){}},clientWidth:800,clientHeight:600};let cover;
 const host={contentDocument:{createElement:()=>new Element(),getElementById:()=>native,body:{append(node){cover=node;}}}};
 const controls=createStudentTools(host);
 const keyBlocked=()=>{const e=new Event('keydown',{cancelable:true});win.dispatchEvent(e);return e.defaultPrevented;};
 try{
  await controls.setShown(true);assert.equal(cover.hidden,true);
  const resume=controls.pauseInput();assert.equal(cover.hidden,false);assert.equal(keyBlocked(),true);
  const resumeSecond=controls.pauseInput();resume();assert.equal(cover.hidden,false,'nested pause retains the lock');
  await controls.setShown(true);assert.equal(cover.hidden,false,'changing policy cannot release an active pause');
  resumeSecond();assert.equal(cover.hidden,true);assert.equal(keyBlocked(),false);resumeSecond();
  await controls.setShown(false);assert.equal(keyBlocked(),true);assert.equal(cover.hidden,false);
  const kept=controls.pauseInput();kept();assert.equal(cover.hidden,false,'resuming never enables teacher-disabled tools');
  await controls.setShown(false);assert.equal(escapes,0,'turning Off without an active tool does not change the built document revision');
  await controls.setShown(true);activeTool=true;await controls.setShown(false);assert.equal(escapes,1,'an active native tool is cancelled before covering input');
  await controls.setShown(false);assert.equal(escapes,1,'reapplying Off never cancels again');
 }finally{controls.dispose();globalThis.requestAnimationFrame=oldRaf;}
}
if(process.argv.includes('--kernel')){
 const dir=process.argv[process.argv.indexOf('--kernel')+1];
 for(const [label,script,volume,bodies] of [
  ['finished coded profile',source,0,0],
  ['OOP rectangle extrusion',initial,60*40*8,1],
  ['coded circle extrusion',appendSketchExtrusion(circleSource,'sk',8),Math.PI*6**2*8,1],
  ['profile beside existing solid',source+'box(2,3,4);\n',24,1],
  ['empty finished sketch',"const sk = sketch('top');\nsk.geom([]);\n",0,0],
  ['open finished sketch',"const sk=sketch('top');sk.line([0,0],[10,0]);",0,0],
 ]){
  const result=await buildCad(script,dir,'model');
  assert.equal(result.fin.ok,true,label);assert.equal(result.tr.features.some(f=>f.status==='refused'),false,JSON.stringify(result.tr.features));
  assert.equal(result.fin.measure.bodies.length,bodies,label);
  const measured=result.fin.measure.bodies.reduce((n,b)=>n+b.volume_mm3,0);assert.ok(Math.abs(measured-volume)<Math.max(1e-7,volume*.001),`${label}: ${measured}, expected ${volume}`);
  assert.ok(result.tr.commands.some(c=>c.command==='sketch.create'),label+' remains visible');
  console.log('PASS pinned '+label);
 }
 const result=await buildCad("const sk=sketch('top');sk.line([0,0],[10,0]);\nconst part = extrude(sk, 8);\n",dir,'model');
 assert.equal(result.fin.measure.bodies.length,0);assert.ok(result.tr.features.some(f=>f.status==='refused'),'open profile extrusion stays refused');
}
console.log('Code-first sketch workflow: unchanged OOP source, changed-code builds, the chosen sketch of one script, preserved native work, stale/error refusal, teacher policy and separate Finish/Extrude pass.');
