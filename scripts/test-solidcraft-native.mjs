// Native file captured through SolidCraft 0.30.1's own toolbar/exporter.
// Keep its complete document; the reduced evaluated snapshot is for checking only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { nativeModelDoc, readNativeDocument, readNativeDrawing, writeNativeDrawing, NATIVE_SKETCH_SCRIPT } from '../lib/solidcraft-native-format.ts';
import { migrateSketch, exportNativeFile, putNativeFile } from '../lib/solidcraft-native.ts';
import { grade } from '../lib/grader.ts';
import { createCommit, restoreToCommit } from '../lib/version-control.ts';
import { onRequestGet, onRequestPut } from '../functions/api/lesson-sync/[lessonId].ts';
import { makeD1 } from './_d1-sqlite.mjs';
const base='lessons/9-1-13-lab-organizer-outline/';
const meta=JSON.parse(fs.readFileSync(base+'lesson.json','utf8'));
const record=readNativeDrawing(fs.readFileSync('scripts/fixtures/solidcraft-native-organizer.json','utf8'));
record.scriptSource=fs.readFileSync(base+'solution/script.js','utf8');
const files={'sketch.json':writeNativeDrawing(record),'script.js':record.scriptSource};
assert.deepEqual(readNativeDrawing(files['sketch.json']),record);
assert.equal(record.native.features[0].sketch.constraints.length,7);
assert.deepEqual(record.native.params.map(p=>p.expr),['60 mm','40 mm']);
const score=(r=record,doc=r.doc)=>grade(meta.requirements,{'sketch.json':writeNativeDrawing(r),'script.js':r.scriptSource??NATIVE_SKETCH_SCRIPT},0,{modelDoc:doc}).results;
assert.equal(score().filter(r=>r.status==='passed').length,3);
for(const r of [{...record,editing:true},{...record,solver:null},{...record,doc:null}])assert.equal(score(r,record.doc).every(r=>r.status==='failed'),true);
assert.equal(score(record,null).every(r=>r.status==='failed'),true);
const wrong=structuredClone(record);
for(const g of wrong.doc.features[0].geoms) {g.a[0]*=55/60;g.b[0]*=55/60;}
assert.equal(score(record,wrong.doc).every(r=>r.status==='failed'),true,'stale evidence fails all checks');
assert.equal(score(wrong)[1].status,'failed','the actual 55 mm geometry fails width');
for(const mutate of [
 r=>{r.native.features[0].type='extrude';},
 r=>{r.native.features[0].plane.name='XZ';},
 r=>{r.native.features[0].sketch.wires=[{}];},
 r=>{r.native.components=[{}];},
 r=>{r.native.units='in';},
 r=>{r.native.features[0].sketch.points[1].pos=[null,0];},
 r=>{r.doc.features[0].geoms[0].a=[null,0];},
 r=>{r.solver.dof=-1;},
]) {const invalid=structuredClone(record);mutate(invalid);assert.throws(()=>readNativeDrawing(JSON.stringify(invalid)));}
assert.throws(()=>readNativeDrawing('{"version":2,"editor":"solidcraft","editing":false}'));
const evaluated={status:'solved',failing:[],curves:record.doc.features[0].geoms.map(g=>({type:'line',start_at:g.a,end_at:g.b,construction:false}))};
assert.deepEqual(nativeModelDoc(evaluated),record.doc);
assert.equal(nativeModelDoc({...evaluated,status:'failed'}),null);
assert.equal(nativeModelDoc({...evaluated,failing:['k1']}),null);
assert.equal(nativeModelDoc({...evaluated,curves:[{type:'arc'}]}),null,'an unsupported checker must not invent geometry');
// Native curves/constraints unknown to the checker still survive save unchanged.
const unsupported=structuredClone(record);unsupported.native.features[0].sketch.curves.push({id:'a1',type:'arc',c:0,a:1,b:2,reversed:true});unsupported.doc=null;
assert.deepEqual(readNativeDrawing(writeNativeDrawing(unsupported)).native,unsupported.native);

// Both files travel together through the production save/read and History code.
const DB=makeD1();const ASSETS={fetch:async()=>new Response(JSON.stringify({lessons:[]}))};
const ctx=(method,body,email='native@test')=>({env:{DB,ASSETS},data:{email,role:'student'},params:{lessonId:meta.id},request:new Request('http://test/api/lesson-sync/'+meta.id,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})});
assert.equal((await onRequestPut(ctx('PUT',{files,baseRevision:0}))).status,200);
const reopened=await (await onRequestGet(ctx('GET'))).json();assert.deepEqual(reopened.files,files);
assert.deepEqual(readNativeDrawing(reopened.files['sketch.json']).native,record.native);
assert.equal((await (await onRequestGet(ctx('GET',null,'other@test'))).json()).files,null);
const saved=createCommit('Native organizer outline',Object.keys(files),files);
const later={...createCommit('Later edit',Object.keys(files),{...files,'sketch.json':writeNativeDrawing(wrong)}),id:'later'};
assert.deepEqual(restoreToCommit(saved.id,[saved,later]).restoredContents,files);
DB.sqlite.close();

// Normal native JSON export waits for its browser file, then deletes only its own
// transfer. Invalid files fail before they can be handed to SolidCraft to reopen.
const opfs=new Map();let removed=[];
const directory={async getFileHandle(name,options){if(!opfs.has(name)){if(!options?.create)throw Error('not yet written');opfs.set(name,'');}return {async getFile(){return new Blob([opfs.get(name)]);},async createWritable(){return {async write(text){opfs.set(name,text);},async close(){}};}};},async removeEntry(name){removed.push(name);opfs.delete(name);}};
const win={navigator:{storage:{getDirectory:async()=>directory}}};
const nativeText=JSON.stringify(record.native);opfs.set('unrelated.json','keep');
const api={async execute(command,p){assert.equal(command,'file.export');assert.equal(p.format,'json');setTimeout(()=>opfs.set('transfer.json',nativeText),10);return {bytes:new TextEncoder().encode(nativeText).length};}};
assert.equal(await exportNativeFile(api,win,'transfer.json'),nativeText);
assert.deepEqual(removed,['transfer.json']);assert.equal(opfs.get('unrelated.json'),'keep');
await putNativeFile(win,'restore.json',nativeText);assert.equal(opfs.get('restore.json'),nativeText);
await assert.rejects(putNativeFile(win,'bad.json','{"features":[{"type":"extrude"}]}'));
assert.equal(opfs.has('bad.json'),false);

if(process.argv.includes('--kernel')) {
 const dir=process.argv[process.argv.indexOf('--kernel')+1];assert.ok(dir,'--kernel requires the pinned referee package');
 const kernel=createRequire(import.meta.url)(path.join(path.resolve(dir),'solidcraft_referee_p2.js'));
 for(const entity of [
  {id:'s1',kind:'rectangle',x:0,y:0,width:60,depth:40,anchored:false},
  {id:'s1',kind:'rectangle',x:10,y:12,width:60,depth:40,anchored:true},
  {id:'s1',kind:'circle',x:10,y:12,diameter:12,anchored:true},
  {id:'s1',kind:'line',x:0,y:0,x2:20,y2:0},
 ]) {
  const commands=[];
  const engine={async execute(command,params){commands.push({command,params});const result=JSON.parse(kernel.run(JSON.stringify({commands})));const failure=result.results.find(r=>!r.ok);assert.equal(failure,undefined,JSON.stringify(failure));return result.results.at(-1).out;}};
  await migrateSketch(engine,{version:1,entities:[entity]});
  const snap=await engine.execute('sketch.inspect',{});
  assert.equal(snap.status,'solved');assert.equal(snap.failing.length,0);
  const doc=nativeModelDoc(snap);assert.ok(doc);
  if(entity.kind==='rectangle') {
   assert.ok(Math.abs(snap.profiles[0].area_mm2-2400)<1e-6,'native solver agrees with independent rectangle arithmetic');
   assert.equal(snap.dof,entity.anchored?0:2);
   const r={...record,doc,solver:{...record.solver,dof:snap.dof}};assert.equal(score(r).every(r=>r.status==='passed'),true);
  } else if(entity.kind==='circle') {assert.equal(snap.dof,0);assert.equal(doc.features[0].geoms[0].r,6);}
 }
 console.log('Pinned native solver: legacy rectangle/circle/line migration, dimensions, anchored/free DoF and independent area pass.');
}
console.log('Native sketch: complete design/constraints, current geometry checks, save/reopen, History, unsupported curves and file transfer pass.');
