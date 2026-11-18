import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { readSketch, writeSketch, sketchScript, sketchPoint, checkSketchOutline, observedSketch } from '../lib/solidcraft-sketch.ts';
import { grade } from '../lib/grader.ts';
import { cadPolicy } from '../lib/solidcraft-policy.ts';
import { createCommit, restoreToCommit } from '../lib/version-control.ts';
import { makeD1 } from './_d1-sqlite.mjs';
import { onRequestGet, onRequestPut } from '../functions/api/lesson-sync/[lessonId].ts';
import { createStudentTools } from '../lib/solidcraft-student-tools.ts';
const base = 'lessons/9-1-13-lab-organizer-outline/';
const meta = JSON.parse(fs.readFileSync(base + 'lesson.json', 'utf8'));
const drawing = readSketch(fs.readFileSync(base + 'solution/sketch.json', 'utf8'));
const files = { 'sketch.json': writeSketch(drawing), 'script.js': sketchScript(drawing) };
assert.equal(files['script.js'], fs.readFileSync(base + 'solution/script.js', 'utf8'));
assert.deepEqual(readSketch(writeSketch(drawing)), drawing, 'save/reopen preserves editable measurements and anchor choices');
let listener, result;
const parent = { postMessage(value) { result = value; } };
const window = { parent, addEventListener(_type, fn) { listener = fn; } };
vm.runInNewContext(fs.readFileSync('vendor/solidcraft-preview/pane/bundle/runner.js', 'utf8'), { window, console });
const run = source => { result = null; listener({ source: parent, data: { source: 'reshape-run', runId: 1, code: source } }); assert.deepEqual(Array.from(result.errors), []); return JSON.parse(JSON.stringify(result.doc)); };
const doc = run(files['script.js']);
const report = (f, d, refusals = null) => grade(meta.requirements, f, 0, { modelDoc: d, refusals });
assert.equal(report(files, doc).results.every(r => r.status === 'passed'), true);
assert.equal(report(files, null).results.every(r => r.status === 'failed'), true);
assert.equal(report(files, doc, { sk1: 'Not accepted.' }).results.every(r => r.status === 'failed'), true);
assert.equal(checkSketchOutline({ ...files, 'script.js': 'box(60,40,1)' }, doc), 'Update the sketch view, then Check again.');
const wrong = structuredClone(drawing); wrong.entities[0].width = 55;
const wrongFiles = { 'sketch.json': writeSketch(wrong), 'script.js': sketchScript(wrong) };
assert.equal(report(wrongFiles, run(wrongFiles['script.js'])).results[1].status, 'failed');
// The production Save API stores both artifacts together; a fresh read and
// History restore retain editable JSON, not just a picture or generated source.
const DB = makeD1();
const ASSETS = { fetch: async () => new Response(JSON.stringify({lessons:[]})) };
const ctx = (method, body, email = 'sketch@test') => ({ env:{DB,ASSETS}, data:{email,role:'student'}, params:{lessonId:meta.id}, request:new Request('http://test/api/lesson-sync/' + meta.id,{method,...(body ? {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})}) });
const saved = await onRequestPut(ctx('PUT',{files,baseRevision:0}));assert.equal(saved.status,200);
const reopened = await (await onRequestGet(ctx('GET'))).json();assert.deepEqual(reopened.files,files);assert.deepEqual(readSketch(reopened.files['sketch.json']),drawing);
const other = await (await onRequestGet(ctx('GET',null,'other@test'))).json();assert.equal(other.files,null,'another student cannot reopen this sketch');
const commit=createCommit('Organizer base outline',['script.js','sketch.json'],files);
const later={...createCommit('Changed width',['script.js','sketch.json'],wrongFiles),id:'later'};
assert.deepEqual(restoreToCommit(commit.id,[commit,later]).restoredContents,files);
DB.sqlite.close();
const starter = Object.fromEntries(['script.js', 'sketch.json'].map(p => [p, fs.readFileSync(base + p, 'utf8')]));
assert.equal(report(starter, run(starter['script.js'])).results.every(r => r.status === 'failed'), true);
for (const change of [
 d => { d.features[0].geoms.pop(); },
 d => { d.features[0].geoms[0].b[0] -= .00001; },
 d => { d.features[0].geoms[3] = structuredClone(d.features[0].geoms[0]); },
 d => { d.features[0].geoms[0].b = [60, 40]; },
 d => { d.features.push({ id: 'box1', kind: 'box', size: [60, 40, 1], center: [0, 0, 0] }); },
]) { const bad = structuredClone(doc); change(bad); assert.notEqual(checkSketchOutline(files, bad), null, 'open, gapped, duplicate, crossed or 3D work cannot pass'); }
const reordered = structuredClone(doc); reordered.features[0].geoms.reverse(); for (const g of reordered.features[0].geoms) [g.a, g.b] = [g.b, g.a];
assert.equal(checkSketchOutline(files, reordered), null, 'equivalent winding/order is accepted');
for (const bad of [null, { version: 2, entities: [] }, { version: 1, entities: [{ ...drawing.entities[0], width: null }] }, { version: 1, entities: [{ ...drawing.entities[0], id: 's1);box(1,2,3)' }] }, { version: 1, entities: [{ ...drawing.entities[0], depth: -1 }] }, { version: 1, entities: [drawing.entities[0], drawing.entities[0]] }]) assert.throws(() => readSketch(JSON.stringify(bad)));
for (const e of [ { id:'s2', kind:'circle', x:10, y:12, diameter:12, anchored:true }, { id:'s3', kind:'line', x:0, y:0, x2:20, y2:0 }, { ...drawing.entities[0], anchored: true } ]) run(sketchScript({ version:1, entities:[e] }));
assert.deepEqual(sketchPoint([70, 20], [[10, 100], [12, 100], [10, 98]]), [30, 40]);
assert.throws(() => sketchPoint([0, 0], [[0,0], [1,1], [2,2]]));
const snapshot = { status:'solved', failing:[], sketch:{ curves:doc.features[0].geoms.map(g => ({ type:'line', start_at:g.a, end_at:g.b, construction:false })) } };
const fin = { sketches:[snapshot], measure:{ bodies:[] } };
const observed = observedSketch(doc, fin);
assert.equal(report(files, observed).results.every(r => r.status === 'passed'), true);
const changed = structuredClone(fin); changed.sketches[0].sketch.curves[0].end_at[0] = 55;
assert.notEqual(checkSketchOutline(files, observedSketch(doc, changed)), null, 'engine-returned geometry wins over requested coordinates');
assert.equal(observedSketch(doc, { ...fin, sketches:[] }), null);
assert.equal(observedSketch(doc, { ...fin, measure:{ bodies:[{}] } }), null);
assert.equal(observedSketch(doc, { ...fin, sketches:[{ ...snapshot, status:'failed' }] }), null);
assert.equal(cadPolicy(meta.id, {classDefault:null, lessons:{}}, meta.mode).toolsAllowed, false);
assert.equal(cadPolicy(meta.id, {classDefault:'code', lessons:{}}, meta.mode).toolsAllowed, false);
assert.equal(cadPolicy(meta.id, {classDefault:'code', lessons:{[meta.id]:'both'}}, meta.mode).toolsAllowed, true);

// Exercise the actual input boundary without a browser: native shortcuts and
// context menus stay blocked, and only a flat camera plus projected sketch
// points can be produced by drawing gestures.
class Element extends EventTarget {
  style = { removeProperty() {} }; hidden = false; clientWidth = 800; clientHeight = 600;
  setAttribute() {} append() {} remove() {} focus() {} setPointerCapture() {}
  getBoundingClientRect() { return { left:0, top:-150, width:800, height:600 }; }
}
const calls=[]; let point;
const ui={ui:{layout:'compact',showBrowser:false,showTimeline:false,showNavigationBar:false}, viewport:[0,150,800,450],camera:{target:[0,0,0],yaw:0,pitch:Math.PI/2,distance:100}};
const native = new EventTarget(); native.solidcraft = { async request(method, params) { calls.push([method,params]); if(method==='ui.inspect')return structuredClone(ui); if(method==='ui.worldToScreen')return [[0,0],[10,0],[0,-10]]; } };
const sc = new Element(); sc.contentWindow = native;
const cover = new Element();
const host = { contentDocument:{ createElement:()=>cover, getElementById:()=>sc, body:new Element() } };
globalThis.requestAnimationFrame = fn => { queueMicrotask(fn); return 1; };
const tools = createStudentTools(host, {flat:true, onPoint:p=>{point=p;}});
await tools.setShown(false);
const escapes=calls.filter(([method,p])=>method==='ui.key'&&p.key==='Escape').length;
await tools.setShown(false);
assert.equal(calls.filter(([method,p])=>method==='ui.key'&&p.key==='Escape').length,escapes,'reapplying code policy does not cancel or revise the generated document');
await assert.rejects(tools.setShown(true), /sketch tools only/);
assert.equal(cover.hidden, false);
const event=(type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{clientX:100,clientY:100,button:0,pointerId:1,shiftKey:false,...values});return e;};
const shortcut=event('keydown',{key:'s'}); native.dispatchEvent(shortcut); assert.equal(shortcut.defaultPrevented,true);
const menu=event('contextmenu');cover.dispatchEvent(menu);assert.equal(menu.defaultPrevented,true);
cover.dispatchEvent(event('pointerdown'));cover.dispatchEvent(event('pointerup'));
await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(point,[10,-25]);
assert.equal(calls.some(([method])=>method.startsWith('engine.')||method==='ui.start'||method==='ui.menu'),false);
tools.dispose();
console.log('Sketch pilot: saved artifacts, sandbox recipes, current geometry, closure, dimensions, policy and flat input boundary pass.');

// Optional local integration with the pinned unmodified engine wrapper. Keeping
// the package path explicit lets CI run the fast boundary tests without a rig.
if (process.argv.includes('--kernel')) {
  const { createRequire } = await import('node:module');
  const path = await import('node:path');
  const pkg = process.argv[process.argv.indexOf('--kernel') + 1];
  assert.ok(pkg, '--kernel needs a referee package directory');
  const kernel = createRequire(import.meta.url)(path.join(path.resolve(pkg), 'solidcraft_referee_p2.js'));
  const { mapSketch } = await import('../vendor/solidcraft-preview/pane/bundle/host-lib.js');
  const { translateSketchOnly } = await import('../vendor/solidcraft-preview/pane/src/sketch-only.mjs');
  for (const item of [drawing.entities[0], { ...drawing.entities[0], anchored:true }, { id:'s2',kind:'circle',x:10,y:12,diameter:12,anchored:true }, { id:'s3',kind:'line',x:0,y:0,x2:20,y2:0 }, null]) {
    const source = sketchScript({version:1,entities:item ? [item] : []});
    const requested = run(source);
    const soups={}; let accepted;
    const runSC = async commands => {
      const name = commands.find(c=>c.command==='sketch.create').params.name;
      const raw = JSON.parse(kernel.run(JSON.stringify({commands:[...commands,{command:'sketch.inspect',params:{sketch:name}}]})));
      const failed = raw.results.find(r=>!r.ok);
      assert.equal(failed,undefined,JSON.stringify(failed));
      assert.equal(raw.measure.ok,true);
      const snap = raw.results.at(-1).out;
      accepted = {sketches:[{...snap,sketch:{curves:snap.curves}}],measure:raw.measure.out};
      return {ok:true,...accepted};
    };
    const tr = await translateSketchOnly(requested,{mapSketch,runSC,soups});
    assert.equal(tr.features[0].status,'noop');
    assert.equal(tr.commands.every(c=>c.command.startsWith('sketch.')),true);
    const actual = observedSketch(requested,accepted);
    assert.ok(actual,'the real engine snapshot must be readable');
    assert.equal(accepted.measure.bodies.length,0,'2D work must produce no solid');
    if(item?.kind==='rectangle') {
      const f={'sketch.json':writeSketch({version:1,entities:[item]}),'script.js':source};
      assert.equal(report(f,actual).results.every(r=>r.status==='passed'),true);
      assert.equal(accepted.sketches[0].dof,item.anchored?0:2);
      assert.ok(Math.abs(accepted.sketches[0].profiles[0].area_mm2-item.width*item.depth)<1e-6,'engine profile area agrees with independent rectangle arithmetic');
      const first=JSON.stringify(actual.features[0].geoms);await runSC(tr.commands);
      assert.equal(JSON.stringify(observedSketch(requested,accepted).features[0].geoms),first,'reopen/replay preserves the measured outline');
    }
  }
  console.log('Pinned kernel: sketch-only route, rectangle area/dimensions, free/anchored DoF, circle/line and replay pass.');
}
