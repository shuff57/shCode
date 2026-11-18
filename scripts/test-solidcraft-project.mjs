import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAD_SETTINGS_FILE,CAD_SOURCE,CAD_LEGACY_SKETCH_SOURCE,SOLIDCRAFT_SKETCH_STARTER,SOLIDCRAFT_PROJECT_STARTER,appendNewSketch,appendSketchExtrusion,cadSettings,cadView,cadSketchLink,isLegacyLinkedProject,linkedCadProgram,mergeLegacySketch,projectSketchVariable,sketchPartStarter,sketchProbe,sketchVariables,suggestedSketchVariable,topLevelNames,validSketchVariable } from '../lib/solidcraft-project.ts';
import { pickSketch,sketchCommands } from '../lib/solidcraft-sketch-script.ts';
import { mapSketch } from '../vendor/solidcraft-preview/pane/bundle/host-lib.js';
import { evaluateCad,buildCad } from './_solidcraft-harness.mjs';
import { makeD1 } from './_d1-sqlite.mjs';
import { onRequestGet,onRequestPut } from '../functions/api/lesson-sync/[lessonId].ts';
import { onRequestGet as history } from '../functions/api/lesson-sync-history/index.ts';

// ---- settings: the view and the sketch the Sketch view shows -----------------------------------
const link={variable:'sk'};
assert.equal(cadSketchLink({}),null);
assert.equal(cadSketchLink({[CAD_SETTINGS_FILE]:cadSettings('solid')}),null);
for(const view of ['sketch','solid']){
 const files={[CAD_SETTINGS_FILE]:cadSettings(view,link)};
 assert.equal(cadView(files),view);assert.deepEqual(cadSketchLink(files),link,'changing the view preserves the chosen sketch');
 assert.equal(JSON.parse(files[CAD_SETTINGS_FILE]).version,2);
 const old={[CAD_SETTINGS_FILE]:JSON.stringify({version:1,view,sketch:link})};
 assert.equal(cadView(old),view,'the older settings still open in their view');assert.deepEqual(cadSketchLink(old),link);
}
for(const name of ['sk','outline','profile','_drawing','$drawing'])assert.equal(validSketchVariable(name),true,name);
for(const name of ['','class','this','1sk','sk; box(1,1,1)','sk\nreturn box(1,1,1)'])assert.equal(validSketchVariable(name),false,name);
assert.throws(()=>cadSketchLink({[CAD_SETTINGS_FILE]:JSON.stringify({version:2,view:'solid',sketch:{variable:'sk;box()'}})}),/invalid/);
for(const height of [NaN,Infinity,0,-1,100001])assert.throws(()=>sketchPartStarter(height),/height/);

// ---- which variables are sketches ----------------------------------------------------------------
const oop=`class TrayProfile {
  constructor(width, depth) { this.width = width; this.depth = depth; }
  draw() {
    const inner = sketch('top');
    inner.rectangle([0, 0], [this.width, this.depth]);
    return inner;
  }
}
const outline = new TrayProfile(24, 18).draw();
`;
assert.deepEqual(topLevelNames(oop),['TrayProfile','outline'],'only names outside functions and classes');
assert.deepEqual(topLevelNames('function f(){const x=1;}\nconst a=1, b=2;\nfor(let i=0;i<2;i++){const z=i;}\n'),['f','a','b']);
assert.equal(suggestedSketchVariable(SOLIDCRAFT_SKETCH_STARTER),'sk');
assert.equal(suggestedSketchVariable(SOLIDCRAFT_PROJECT_STARTER),'sk');
assert.equal(suggestedSketchVariable('// const wrong = sketch(\'top\');\nconst outline = sketch(\'top\');\nconst base=outline.rectangle([0,0],[24,18]);'),'outline');
assert.equal(suggestedSketchVariable('const sk=sketch(\'top\'), base=sk.rectangle([0,0],[12,8]);'),'sk');
assert.equal(suggestedSketchVariable(oop),'outline','only public variables are suggested, not private class locals');
assert.deepEqual(sketchVariables("const a = sketch('top');\nconst part = extrude(a, 3);\nconst b = sketch('top');\n"),['a','b']);
const classScript=oop+'const body = extrude(outline, 20);\nshell(body, { wall: 2, open: \'top\' });\n';
assert.deepEqual(sketchVariables(classScript),['outline'],'a sketch a class returned counts once it is extruded; the solid does not');
assert.equal(suggestedSketchVariable(classScript),'outline','not body, the solid that comes last');
assert.deepEqual(sketchVariables("const p = plate(12);\nconst q = pull(p, 3);\nconst r = spin(p, 90);\nfunction f(){ const inner = sketch('top'); return extrude(inner, 1); }\n"),['p'],'pull and spin too; names inside functions are not offered');
assert.deepEqual(sketchVariables("const part = extrude(sketch('top'), 3);\n"),[],'only variables');
assert.equal(projectSketchVariable("const outline=new Profile().draw();const width=10;",{variable:'outline'}),'outline','a chosen variable survives unrelated later variables');
assert.equal(projectSketchVariable("const outline=sketch('top');",{variable:'sk1'}),'outline','a renamed sketch updates the suggestion');

// ---- the Sketch view picks the chosen sketch out of the whole script ----------------------------
function picked(source,variable){const probe=sketchProbe(source,variable);const r=evaluateCad(probe.source);return pickSketch(r.doc,r.errors,variable,probe.line);}
const two=`const small = sketch('top');
small.rectangle([0, 0], [10, 10]);
const big = sketch('top');
big.rectangle([0, 0], [30, 20]);
const part = extrude(big, 5);
hole(part, { across: 4 });
`;
const area=doc=>{const g=doc.features[0].geoms;const xs=g.flatMap(r=>[r.a?.[0],r.b?.[0]].filter(Number.isFinite)),ys=g.flatMap(r=>[r.a?.[1],r.b?.[1]].filter(Number.isFinite));return (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));};
for(const [name,size] of [['small',100],['big',600]]){
 const doc=picked(two,name);assert.equal(doc.features.length,1);assert.equal(doc.features[0].kind,'sketch');
 const alone=evaluateCad(two.split('\n').filter(l=>!/part|hole/.test(l)).join('\n')).doc.features.find(f=>doc.features[0].id===f.id);
 assert.deepEqual(doc.features[0],alone,`${name}: the same sketch as the script without its 3D steps`);
 if(doc.features[0].geoms.every(r=>r.a&&r.b))assert.equal(area(doc),size,`${name}: the chosen sketch, not the other one`);
 assert.ok(sketchCommands(doc,mapSketch).some(c=>c.command==='sketch.create'),`${name}: builds in the native sketcher`);
}
assert.equal(picked(oop+'const part = extrude(outline, 8);\n','outline').features[0].kind,'sketch','a sketch a class returned');
assert.equal(picked("function plate(w){const s=sketch('top');s.rectangle([0,0],[w,w]);return s;}\nconst p=plate(12);\n",'p').features[0].kind,'sketch','a sketch a function returned');
assert.equal(picked("const sk=sketch('top');\nsk.line([0,0],[20,0]);\n",'sk').features[0].kind,'sketch','an open profile can be shown, not extruded');
assert.deepEqual(evaluateCad(sketchProbe(SOLIDCRAFT_PROJECT_STARTER,'sk').source).errors,[]);
assert.throws(()=>picked('const part = box(1,1,1);\n','part'),/part does not hold a sketch/);
assert.throws(()=>sketchProbe(oop,'inner'),/inner is not a variable at the top of script\.js/);
assert.throws(()=>sketchProbe(oop,'missing'),/not a variable at the top/);
assert.throws(()=>sketchProbe(oop,'sk; box(1,1,1)'),/Choose the variable/);
assert.throws(()=>picked("const sk=sketch('front');\nsk.rectangle([0,0],[10,10]);\n",'sk'),/on 'top' only/);
assert.throws(()=>picked("const sk=sketch('top');\nsk.rectangle([0,0],[missingWidth,10]);\n",'sk'),/^Error: Line 2: /,'an error in the script keeps its own line number');

// ---- Extrude and New sketch write ordinary code that uses the variable directly ----------------
const extruded=appendSketchExtrusion(SOLIDCRAFT_SKETCH_STARTER,'sk',10);
assert.ok(extruded.startsWith(SOLIDCRAFT_SKETCH_STARTER.trimEnd()));assert.match(extruded,/\nconst part = extrude\(sk, 10\);\n$/);
assert.match(appendSketchExtrusion(SOLIDCRAFT_PROJECT_STARTER,'sk',4),/const part2 = extrude\(sk, 4\);\n$/,'a free name beside the existing part');
assert.throws(()=>appendSketchExtrusion(oop,'inner',5),/not a variable at the top/);
for(const h of [0,-1,Infinity,NaN,100001])assert.throws(()=>appendSketchExtrusion(SOLIDCRAFT_SKETCH_STARTER,'sk',h),/height/);
const added=appendNewSketch(SOLIDCRAFT_PROJECT_STARTER);assert.equal(added.variable,'sk2');assert.ok(added.source.startsWith(SOLIDCRAFT_PROJECT_STARTER.trimEnd()));
assert.deepEqual(evaluateCad(added.source).errors,[]);assert.equal(picked(added.source,'sk2').features[0].kind,'sketch');
assert.equal(appendNewSketch('').variable,'sk');

// ---- one script, built: the cases the two-file layout had, now in one file ----------------------
const updated=SOLIDCRAFT_PROJECT_STARTER.replace('width = 60','width = 72');
const cases=[
 {id:'project starter',source:SOLIDCRAFT_PROJECT_STARTER,width:60,depth:40,height:10,volume:24000-Math.PI*3**2*10},
 {id:'edited sketch',source:updated,width:72,depth:40,height:10,volume:28800-Math.PI*3**2*10},
 {id:'edited height',source:updated.replace('height = 10','height = 6'),width:72,depth:40,height:6,volume:17280-Math.PI*3**2*6},
 {id:'Extrude button',source:extruded,width:60,depth:40,height:10,volume:24000},
 {id:'OOP profile',source:oop+sketchPartStarter(8,'outline'),width:24,depth:18,height:8,volume:3456},
 {id:'function profile',source:"function plate(w, d) {\n  const s = sketch('top');\n  s.rectangle([0, 0], [w, d]);\n  return s;\n}\nconst p = plate(20, 15);\nconst part = extrude(p, 4);\n",width:20,depth:15,height:4,volume:1200},
 {id:'two sketches, one used',source:two,volume:30*20*5-Math.PI*2**2*5},
];
for(const c of cases){const r=evaluateCad(c.source);assert.deepEqual(r.errors,[],c.id);const ex=r.doc.features.find(f=>f.kind==='extrude');assert.equal(r.doc.features.find(f=>f.id===ex.target).kind,'sketch',c.id);}

// ---- the older two-file layout is merged into one script that builds the same ----------------
const legacyCases=[
 {id:'rectangle',sketch:SOLIDCRAFT_SKETCH_STARTER,steps:'// profile comes from sketch.js. Change the height, then Run.\nconst height = 10;\nconst part = extrude(profile, height);\n',link,volume:24000},
 {id:'hole after extrusion',sketch:SOLIDCRAFT_SKETCH_STARTER,steps:'const part = extrude(profile, 6);\nhole(part, { across: 6 });\n',link,volume:14400-Math.PI*9*6},
 {id:'OOP profile',sketch:oop,steps:'const part = extrude(profile, 8);\n',link:{variable:'outline'},volume:3456},
 {id:'same names in both files',sketch:'const height=99;\n'+SOLIDCRAFT_SKETCH_STARTER,steps:'const height = 5;\nconst part = extrude(profile, height);\n',link,volume:12000},
 {id:'steps that do not use profile',sketch:SOLIDCRAFT_SKETCH_STARTER,steps:'// profile is the finished sketch.\n// Use Extrude or add your 3D steps below.\n',link,volume:0},
];
for(const c of legacyCases){
 const files={[CAD_SOURCE]:c.steps,[CAD_LEGACY_SKETCH_SOURCE]:c.sketch,[CAD_SETTINGS_FILE]:JSON.stringify({version:1,view:'solid',sketch:c.link})};
 assert.equal(isLegacyLinkedProject(files),true,c.id);
 const merged=mergeLegacySketch(files);const before=evaluateCad(linkedCadProgram(c.sketch,c.steps,c.link).source),after=evaluateCad(merged.source);
 assert.deepEqual(after.errors,[],c.id);
 assert.deepEqual(after.doc.features.map(f=>f.kind),before.doc.features.map(f=>f.kind),`${c.id}: the same steps`);
 assert.ok(topLevelNames(merged.source).includes(merged.link.variable),`${c.id}: the chosen sketch is a top-level variable of the merged script`);
 assert.equal(picked(merged.source,merged.link.variable).features[0].kind,'sketch',c.id);
 c.merged=merged.source;
}
assert.match(legacyCases[0].merged,/^\/\/ Sketch, moved here from sketch\.js\.\n/);assert.match(legacyCases[0].merged,/\nconst profile = sk;\n/,'profile keeps working beside the sketch variable');
assert.doesNotMatch(legacyCases[0].merged,/=> \{/,'no private scope when the files share no names');
assert.match(legacyCases[3].merged,/const profile = \(\(\) => \{/,'a name in both files keeps the sketch in its own scope');
assert.equal(mergeLegacySketch({[CAD_SOURCE]:legacyCases[3].steps,[CAD_LEGACY_SKETCH_SOURCE]:legacyCases[3].sketch,[CAD_SETTINGS_FILE]:JSON.stringify({version:1,view:'solid',sketch:link})}).link.variable,'profile');
assert.doesNotMatch(legacyCases[4].merged,/const profile/,'no alias when nothing uses it');
assert.match(legacyCases[0].merged,/\n\/\/ profile is the sketch above\. Change the height, then Run\.\n/);assert.doesNotMatch(legacyCases[0].merged,/comes from sketch\.js/,'the old generated comment is corrected');
assert.equal(isLegacyLinkedProject({[CAD_SOURCE]:'',[CAD_SETTINGS_FILE]:cadSettings('solid',link),[CAD_LEGACY_SKETCH_SOURCE]:'x'}),false,'a merged project is not merged again');
assert.equal(isLegacyLinkedProject({[CAD_SOURCE]:'',[CAD_SETTINGS_FILE]:JSON.stringify({version:1,view:'solid'})}),false);

// ---- one script.js and its settings travel together through the real save and History handlers --
const db=makeD1();const id='sandbox-reshape-unified123';
const files={[CAD_SOURCE]:SOLIDCRAFT_PROJECT_STARTER,[CAD_SETTINGS_FILE]:cadSettings('solid',link)};
const context=(method,body)=>({env:{DB:db,ASSETS:{fetch:async()=>new Response(JSON.stringify({lessons:[]}))}},data:{email:'unified@test',role:'student'},params:{lessonId:id},request:new Request('http://test/api/lesson-sync/'+id,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})});
await onRequestPut(context('PUT',{files,baseRevision:0}));
const changed={...files,[CAD_SOURCE]:updated,[CAD_SETTINGS_FILE]:cadSettings('sketch',link)};
assert.equal((await onRequestPut(context('PUT',{files:changed,baseRevision:1}))).status,200);
assert.deepEqual((await (await onRequestGet(context('GET'))).json()).files,changed);
const hc={env:{DB:db},data:{email:'unified@test',role:'student'},params:{},request:new Request('http://test/api/lesson-sync-history?lessonId='+id)};
const versions=await (await history(hc)).json();assert.equal(versions.saves.length,2);
const savedVersions=await Promise.all(versions.saves.map(async save=>(await (await history({...hc,request:new Request('http://test/api/lesson-sync-history?id='+save.id)})).json())));
const first=savedVersions.find(v=>v.save.files[CAD_SOURCE]===SOLIDCRAFT_PROJECT_STARTER);
assert.deepEqual(first.save.files,files);assert.deepEqual(cadSketchLink(first.save.files),link);db.sqlite.close();

const ui=fs.readFileSync('components/SolidCraftProject.tsx','utf8');
assert.match(ui,/props\.onBeforeLink\(\)\)\{setNote/,'the two old files are kept in History before they are merged');
assert.match(ui,/props\.onBeforeLink\(\)\)throw/,'the previous script is kept in History before Extrude changes it');
assert.doesNotMatch(fs.readFileSync('components/SolidCraftStudio.tsx','utf8'),/sketch\.js/,'Model edits one file');

if(process.argv.includes('--kernel')){
 const dir=process.argv[process.argv.indexOf('--kernel')+1];
 for(const c of cases){
  const r=await buildCad(c.source,dir,'model');
  assert.equal(r.fin.ok,true,c.id);assert.equal(r.tr.features.some(f=>f.status==='refused'),false,JSON.stringify(r.tr.features));
  assert.equal(r.fin.measure.bodies.length,1,c.id);const body=r.fin.measure.bodies[0];assert.equal(body.closed,true);
  assert.ok(Math.abs(body.volume_mm3-c.volume)/c.volume<.001,`${c.id}: ${body.volume_mm3}, independently expected ${c.volume}`);
  if(c.width){for(const [axis,size] of [c.width,c.depth,c.height].entries())assert.ok(Math.abs(body.bbox.max[axis]-body.bbox.min[axis]-size)<1e-6,c.id);}
  console.log('PASS pinned SolidCraft '+c.id);
 }
 for(const c of legacyCases){
  const [before,after]=[await buildCad(linkedCadProgram(c.sketch,c.steps,c.link).source,dir,'model'),await buildCad(c.merged,dir,'model')];
  const vol=r=>r.fin.measure.bodies.reduce((n,b)=>n+b.volume_mm3,0);
  assert.equal(after.fin.measure.bodies.length,before.fin.measure.bodies.length,c.id);
  assert.ok(Math.abs(vol(after)-vol(before))<=1e-9*Math.max(1,vol(before)),`${c.id}: merged ${vol(after)}, two files ${vol(before)}`);
  if(c.volume)assert.ok(Math.abs(vol(after)-c.volume)/c.volume<.001,`${c.id}: ${vol(after)}, independently expected ${c.volume}`);
  console.log('PASS pinned SolidCraft, merged from two files: '+c.id);
 }
 const open=await buildCad("const sk=sketch('top');\nsk.line([0,0],[20,0]);\nconst part = extrude(sk, 5);\n",dir,'model');
 assert.equal(open.fin.measure.bodies.length,0);assert.equal(open.tr.features.some(f=>f.status==='refused'),true,'an open profile is refused instead of silently changed into a solid');
}
console.log('One CAD script: sketches used directly, the Sketch view’s chosen sketch, classes and functions, Extrude, New sketch, two-file projects merged without changing the part, saves and History pass.');
