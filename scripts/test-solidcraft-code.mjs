// SolidCraft CAD as code, in reSHape Script (lib/solidcraft-code.ts): files, joining them into
// one script with each file's lines kept, the variable probe, the editor's lists and the picks.
// The builds themselves run in the guarded host page; the browser checks drive those.
import assert from 'node:assert/strict';
import { CAD_ENTRY,CAD_STARTER,CAD_CODE_SETTINGS,bundleProject,classFileName,classTemplate,codeFiles,isCodeCadProject,entryStatements,locate,readEdgeNameProbe,readVariableProbe,stepLines,validClassName,withEdgeNameProbe,validFilePath,withVariableProbe } from '../lib/solidcraft-code.ts';
import { insertion,fillingCall,pickText,sketchPlaneOf,topLevelVariables } from '../lib/solidcraft-picks.ts';
import { cadArgumentCompletions,cadKindOf,isCadCode,setCadModel } from '../lib/cad-completions.ts';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';

// ---- files ----------------------------------------------------------------------------------------
assert.deepEqual(codeFiles({'tray.js':'','cad.json':'{}','script.js':'','parts/lid.js':'','sketch.json':'{}'}),['script.js','parts/lid.js','tray.js']);
for(const p of ['parts.js','parts/tray.js','a_b-c.js'])assert.equal(validFilePath(p),true,p);
for(const p of ['','parts','../x.js','/x.js','a b.js','x.ts','a//b.js','.js'])assert.equal(validFilePath(p),false,p);
for(const n of ['Tray','BoltPlate','T2'])assert.equal(validClassName(n),true,n);
for(const n of ['tray','2Tray','Tray Lid','class',''])assert.equal(validClassName(n),false,n);
assert.equal(classFileName('BoltPlate'),'boltPlate.js');
assert.equal(isCodeCadProject({'cad.json':CAD_CODE_SETTINGS}),true);
assert.equal(isCodeCadProject({'cad.json':'{"version":3,"language":"solidcraft"}'}),true,'a project from before the code was guarded opens in the same workspace');
for(const settings of [undefined,'{}','{"version":2,"view":"solid"}','nonsense'])assert.equal(isCodeCadProject(settings===undefined?{}:{'cad.json':settings}),false);
for(const word of ['cut(','sketch(\'XY\'','.faceAt(','command(','translate('])assert.ok(!CAD_STARTER.includes(word)&&!classTemplate('Tray').includes(word),`the starter and the class template are in reSHape's words, not ${word}`);
console.log('PASS files, settings, the reSHape starter and class template');

// ---- joining the files ----------------------------------------------------------------------------
{
 const files={'script.js':"import { Tray } from './tray.js';\nimport W, { gap as g } from './sizes.js';\nconst t = new Tray(W, 40, g).build();\n",'tray.js':classTemplate('Tray'),'sizes.js':'export const gap = 20;\nexport default 60;\n','unused.js':'nonsense('};
 const b=bundleProject(files);
 assert.deepEqual(b.errors,[]);
 assert.deepEqual(b.locations.map(l=>l.file),['tray.js','sizes.js','script.js'],'imported files first, the entry last, a file nothing imports left out');
 assert.doesNotThrow(()=>new Function(b.source),'the joined script is plain JavaScript (no import or export left)');
 assert.ok(!/\b(import|export)\b/.test(b.source.replace(/\/\/.*$/gm,'')),'no import or export outside comments');
 const shell=classTemplate('Tray').split('\n').findIndex(l=>l.includes('shell('))+1;
 const tray=b.locations.find(l=>l.file==='tray.js');
 assert.deepEqual(locate(tray.start+shell-1,b.locations),{file:'tray.js',line:shell},'a line of the joined script is the same line of its own file');
 const entry=b.locations.find(l=>l.file==='script.js');
 assert.equal(b.source.split('\n')[entry.start+2-1],'const t = new Tray(W, 40, g).build();','script.js keeps its own line numbers');
 // the joined script, run with stand-ins for reSHape's words, hands each import the right value
 const made=[];const fake={sketch:()=>({rectangle(){}}),extrude:(s,h)=>{made.push(h);return {face:()=>null};},shell:()=>{}};
 new Function(...Object.keys(fake),b.source+'\nreturn t;')(...Object.values(fake));
 assert.deepEqual(made,[20],'new Tray(60, 40, 20): the default export and the renamed import arrive');
}
assert.match(bundleProject({'script.js':"import { Nope } from './sizes.js';\n",'sizes.js':'export const gap = 1;\n'}).errors[0].message,/does not export Nope/);
assert.match(bundleProject({'script.js':"import { a } from './a.js';\n",'a.js':"import { b } from './b.js';\nexport const a = 1;\n",'b.js':"import { a } from './a.js';\nexport const b = 2;\n"}).errors[0].message,/import each other/);
assert.deepEqual(bundleProject({'script.js':"import x from 'lodash';\n"}).errors[0],{file:'script.js',line:1,message:`Import other files of this project by their path, like './tray.js'. "lodash" is not one.`});
assert.match(bundleProject({'script.js':"import { a } from './gone.js';\n"}).errors[0].message,/There is no file gone\.js/);
assert.match(bundleProject({'script.js':"const m = import('./a.js');\n",'a.js':''}).errors[0].message,/import line/);
assert.match(bundleProject({'script.js':"export { q } from './a.js';\n",'a.js':'export const q = 1;\n'}).errors[0].message,/Export what this file makes/);
{ // multi-line imports keep the line count
 const b=bundleProject({'script.js':"import {\n  gap,\n  width\n} from './s.js';\nconst z = gap + width;\n",'s.js':'export const gap = 1, width = 2;\n'});
 assert.deepEqual(b.errors,[]);const e=b.locations.find(l=>l.file==='script.js');
 assert.equal(b.source.split('\n')[e.start+4-1],'const z = gap + width;');
 assert.equal(new Function(b.source+'\nreturn z;')(),3);
}
console.log('PASS joining the files: imports and exports as plain variables, every line kept, plain-word errors');

// ---- which variable holds which part --------------------------------------------------------------
{
 const src=withVariableProbe('const part = mk();\nconst base = sk();\nconst n = 3;',['part','base','n','gone']);
 let thrown;try{new Function('mk','sk',src)(()=>({__reshapeHandle:true,rootId:'pull1',id:'round1'}),()=>({id:'sk1'}));}catch(e){thrown=e;}
 const map=readVariableProbe([{message:thrown.message}]);
 assert.deepEqual([...map.bodies],[['b_pull1','part']],'a part by the step that made it (b_<step>, the guarded build\'s body name)');
 assert.deepEqual([...map.sketches],[['sk1','base']]);
 assert.equal(readVariableProbe([{message:'some other error'}]),null);
 assert.deepEqual(topLevelVariables('const a = 1;\nfunction f(){ const b = 2; }\nlet c;\nclass D {}\n'),['a','c']);
}
console.log('PASS the variable probe');

// ---- the editor's words and lists -----------------------------------------------------------------
assert.equal(isCadCode(CAD_STARTER),true);assert.equal(isCadCode('function setup(){ new Sprite(); }'),false);assert.equal(isCadCode('const sketch = 1;\nconsole.log(sketch);'),false);
assert.equal(cadKindOf('base',CAD_STARTER),'sketch');assert.equal(cadKindOf('lid',CAD_STARTER),'sketch','a sketch on an offset plane');
assert.equal(cadKindOf('part',CAD_STARTER),'body');assert.equal(cadKindOf('width',CAD_STARTER),null);assert.equal(cadKindOf('tray','const tray = new Tray(80, 50, 20).build();'),'body');
{
 setCadModel({bodies:[{body:'b_pull1',owner:'part',faces:[{label:'right',point:[60,20,5],sketch:"'side', 60"},{label:'top',point:[30,20,10],sketch:"'top', 10"},{label:null,point:[30,1,9.5],sketch:null}],edges:[{labels:['top','right'],points:[[60,20,10]]},{labels:['front','right'],points:[[60,0,5]]},{labels:null,points:[[30,1,10]]}]},{body:'b_box1',owner:null,faces:[{label:'top',point:[0,0,5],sketch:"'top', 5"}],edges:[]}]});
 const at=(text,after='')=>{const st=EditorState.create({doc:CAD_STARTER+text+after});const r=cadArgumentCompletions(new CompletionContext(st,CAD_STARTER.length+text.length,false));return r&&{labels:r.options.map(o=>o.label),boosts:r.options.map(o=>o.boost),from:r.from-CAD_STARTER.length,to:r.to-CAD_STARTER.length};};
 assert.deepEqual(at('const s = sketch(',')').labels,["'top'","'front'","'side'","'top', 10","'side', 60","'top', 5"],'sketch() offers the planes, then the plane through each flat face (labelled faces first), each once');
 assert.deepEqual(at('part.face(',')').labels,["'top'","'right'"],'part.face() offers its face names in label order');
 const e=at('part.edge(',')');assert.deepEqual(e.labels,["'top', 'right'","'front', 'right'"],'part.edge() offers its named edges as two names');
 assert.ok(e.boosts[0]>e.boosts[1],'in that order, not A to Z');
 assert.deepEqual(at("part.edge('top', ",')').labels,["'top', 'right'","'front', 'right'"],'the second name keeps the list open');
 assert.deepEqual(at('fillet(',')').labels,["part.edge('top', 'right')","part.edge('front', 'right')"],'fillet() offers the named edges of the parts held in variables');
 assert.deepEqual(at('shell(',')').labels,['part']);assert.deepEqual(at('hole(',')').labels,['part']);
 assert.equal(at("part.face('t","')").to,"part.face('t".length+1,'a closing quote the editor added is replaced');
 assert.equal(at("fillet(part.edge('top', 'right'), ",')'),null,'not after the first argument');
 assert.equal(at('other.face(',')'),null,'nothing for a name that is not a part');
 setCadModel(null);assert.equal(at('sketch(',')'),null,'nothing before a build');
}
console.log('PASS the brackets offer the planes, faces, edges and parts the model has');

// ---- picks ---------------------------------------------------------------------------------------
{
 const faces=[{index:0,name:'T',centroid:[30,20,10],point:[30,20,10],plane_normal:[0,0,1]},{index:1,name:'B',centroid:[30,20,0],point:[30,20,0],plane_normal:[0,0,-1]},{index:2,name:'F',centroid:[30,0,5],point:[30,0,5],plane_normal:[0,-1,0]},{index:3,name:'R',centroid:[60,20,5],point:[60,20,5],plane_normal:[1,0,0]}];
 const edges=[{index:7,name:'T|R',mid:[60,20,10],start:[60,0,10],end:[60,40,10]}];
 assert.equal(sketchPlaneOf(faces[0]),"'top', 10");assert.equal(sketchPlaneOf(faces[1]),"'top'");assert.equal(sketchPlaneOf(faces[2]),"'front'");assert.equal(sketchPlaneOf(faces[3]),"'side', 60");
 assert.equal(sketchPlaneOf({index:9,centroid:[1,1,1],point:[1,1,1],plane_normal:[0,0.6,0.8]}),null,'a slanted face has no plane word');
 const vars=new Map([['b_pull1','part']]);
 const face=pickText({type:'face',body:'b_pull1',index:0,point:[30,20,10]},faces,edges,vars);
 assert.deepEqual(face,{code:"part.face('top')",name:'part · top face',sketch:"'top', 10"});
 const edge=pickText({type:'edge',body:'b_pull1',index:7,point:[60,20,10]},faces,edges,vars);
 assert.equal(edge.code,"part.edge('top', 'right')");
 assert.equal(pickText({type:'face',body:'b_other',index:0,point:[0,0,0]},faces,edges,vars).code,null,'a part no variable holds is shown, not written');
 const put=(doc,pick)=>{const at=doc.indexOf('|');const d=doc.replace('|','');const e=insertion(d,at,pick);return e&&d.slice(0,e.from)+e.insert+d.slice(e.to);};
 assert.equal(put('const s = sketch(|)',face),"const s = sketch('top', 10)",'in sketch() a face gives the plane through it');
 assert.equal(put('fillet(|)',edge),"fillet(part.edge('top', 'right'))");
 assert.equal(put('fillet(|)',face),null,'a face does not go in fillet()');
 assert.equal(put('shell(|)',face),'shell(part)','shell() and hole() take the part');
 assert.equal(put('x = |',edge),"x = part.edge('top', 'right')",'elsewhere it goes at the cursor');
 assert.equal(fillingCall('fillet()',7),'fillet');assert.equal(fillingCall('round()',6),null);
}
console.log('PASS picks: faces, edges and planes in reSHape words');
// ---- which line made a refused step: the script cut short after each top-level statement of script.js ----------
{
  const files={'script.js':"import { Tray } from './tray.js';\n// a comment\nconst a = sketch('top');\na.rectangle([0, 0], [10, 10]);\nconst p = extrude(a, 5);\n\nfillet(p.edge('top', 'front'), 1);\nfor (let i = 0; i < 2; i++) {\n  fillet(p.edge('top', 'back'), 1);\n}\nconst t = new Tray().build();\n",
    'tray.js':"export class Tray {\n  build() {\n    return extrude(sketch('top'), 3);\n  }\n}\n"};
  const b=bundleProject(files);assert.deepEqual(b.errors,[]);
  // A stand-in interpreter: every extrude( or fillet( the prefix reaches makes a step, in order (pull1, round1, …);
  // the class's own extrude runs only when build() is called.
  let calls=0;
  const fake=async(src)=>{calls++;const body=src.slice(src.indexOf('// a comment'));const ids=[];let pull=0,round=0;
    const lines=body.split('\n');
    for(const l of lines){
      if(/\bextrude\(/.test(l)&&!/^\s*return/.test(l))ids.push('pull'+(++pull));
      if(/fillet\(/.test(l)){const loop=/^\s+fillet/.test(l)?2:1;for(let i=0;i<loop;i++)ids.push('round'+(++round));}
      if(/new Tray\(\)\.build\(\)/.test(l))ids.push('pull'+(++pull));
    }
    return {errors:[],doc:{features:ids.map(id=>({id}))}};};
  const st=entryStatements(b.source,b.locations);
  assert.deepEqual(st.map(x=>locate(x.line,b.locations).line),[1,3,4,5,7,8,11],'top-level statements of script.js only (the import, rewritten as a const; not the comment, not the class file)');
  const at=await stepLines(b.source,b.locations,['round1','round3','pull2','nope'],fake);
  assert.deepEqual(Object.fromEntries([...at].map(([k,v])=>[k,`${v.file}:${v.line}`])),{round1:'script.js:7',round3:'script.js:8',pull2:'script.js:11'},'a step in a loop is on the loop\'s line, a class\'s step on the line that called it, an unknown id is left out');
  assert.ok(calls<=12,`a few evaluations, not one per statement per step (${calls})`);
  const broken=await stepLines(b.source,b.locations,['round1'],async()=>({errors:[{message:'x'}],doc:null}));
  assert.equal(broken.size,0,'a prefix that does not run places nothing');
}
console.log('PASS step lines: a refused step is put on the line of script.js that made it');
// ---- reSHape's own names for the edges on screen (for leaving refused edges out of the lists) -----------------------------------------
{
  const src=withEdgeNameProbe("const part = make();\n",[{owner:'part',a:'top',b:'right'},{owner:'part',a:'top',b:'top'},{owner:'bad name',a:'top',b:'left'},{owner:'part',a:"x');evil('",b:'left'}]);
  assert.ok(src.startsWith("const part = make();\n"),'the script first, unchanged');
  assert.ok(!src.includes('evil')&&!src.includes('bad name'),'only plain variables and face words reach the probe line');
  // the probe line run against a stand-in part: .edge() gives reSHape's name and the step the part is at, or throws
  const part={id:'round1',edge:(a,b)=>{if(a===b)throw new Error('two DIFFERENT faces');return {name:{cause:'between',of:[a,b]},owner:{id:'round1'}};}};
  let thrown=null;try{new Function('part',src.slice(src.indexOf('\n;')+2))(part);}catch(e){thrown=e;}
  const got=readEdgeNameProbe([{message:thrown.message}],2);
  assert.deepEqual(got,[{name:{cause:'between',of:['top','right']},target:'round1'},null],'one answer per candidate, null where reSHape refuses the words');
  assert.equal(readEdgeNameProbe([{message:thrown.message}],3),null,'a count that does not match is no answer');
  assert.equal(readEdgeNameProbe([{message:'part is not defined'}],2),null,'a script that stops before the probe line gives no answer');
}
console.log('PASS edge names: reSHape\'s name for each edge on screen, for the host to check');
console.log('SolidCraft CAD as code (reSHape Script): files, joining with lines kept, the variable probe, the editor\'s lists and picks pass.');
