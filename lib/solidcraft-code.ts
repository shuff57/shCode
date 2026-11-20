// SolidCraft CAD as code, in reSHape Script: the student's .js files are the design, written
// with reSHape's official CAD names (sketch, extrude, pocket, fillet, chamfer, shell, cuboid,
// union, subtract, linearPattern, …). Faces and edges are named by word (part.face('top'),
// part.edge('top', 'front')).
//
// The files are not run here. bundleProject() joins them into one script for reSHape's
// interpreter, which runs inside the host page's opaque runner frame; the host page
// (vendor/solidcraft-preview, the guarded path from reshape-cad) translates what it makes
// into SolidCraft commands, step by step, and refuses in a sentence any step the engine
// cannot build correctly. Nothing reaches SolidCraft except through that path.
//
// reSHape runs one script, so files share code by import/export rewritten into plain
// variables: each imported file becomes a function that returns its exports, placed before
// the files that import it. Line numbers inside each file are kept, and `locations` says
// which lines of the joined script belong to which file, so an error names its own file and line.
import { parser } from '@lezer/javascript';

export const CAD_ENTRY='script.js';
export const CAD_SETTINGS_FILE='cad.json';
/** cad.json of a code-first CAD project, written in reSHape Script and built through the guarded host. */
export const CAD_CODE_SETTINGS=JSON.stringify({version:4,language:'reshape'})+'\n';
/** A code-first CAD project: version 4 (reSHape Script), or version 3 from before the code was guarded (same files, older words). */
export function isCodeCadProject(files:Record<string,string>):boolean {
  try{const s=JSON.parse(files[CAD_SETTINGS_FILE]??'');return (s?.version===4&&s.language==='reshape')||(s?.version===3&&s.language==='solidcraft');}catch{return false;}
}
export const MAX_SOURCE=400000;

export const CAD_STARTER=`// SolidCraft CAD in reSHape Script: each line is one step of the model, in order.
// Change a number, then Run. Sketch planes: 'top' (flat), 'front', 'side'.
// Faces are named top, bottom, front, back, left, right.
const width = 60;
const depth = 40;
const height = 10;

const base = sketch('top');
base.rectangle([0, 0], [width, depth]);
const part = extrude(base, height);

fillet(part.edge('top', 'front'), 2);

const lid = sketch('top', height);
lid.circle([width / 2, depth / 2], { r: 6 });
pocket(lid, part, height, { through: true });
`;

/** A new file holding one exported class, for New class. */
export function classTemplate(name:string):string {
  return `// ${name}: use it from script.js with
//   import { ${name} } from './${classFileName(name)}';
//   const part = new ${name}(60, 40, 20).build();
export class ${name} {
  constructor(width, depth, height) {
    this.width = width;
    this.depth = depth;
    this.height = height;
  }

  build() {
    const outline = sketch('top');
    outline.rectangle([0, 0], [this.width, this.depth]);
    const body = extrude(outline, this.height);
    shell(body, { wall: 2, open: 'top' });
    return body;
  }
}
`;
}
export function validClassName(name:string):boolean {
  return /^[A-Z][A-Za-z0-9_$]*$/.test(name)&&!parser.parse(`class ${name} {}`).toString().includes('⚠');
}
export const classFileName=(name:string)=>`${name.charAt(0).toLowerCase()}${name.slice(1)}.js`;
/** A project file path: letters, digits, - and _ in each part, optional folders, ending in .js. */
export function validFilePath(path:string):boolean {
  return /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.js$/.test(path)&&path.length<=120;
}
/** The code files of a project, the entry first, then by path. */
export function codeFiles(files:Record<string,string>):string[] {
  return Object.keys(files).filter(validFilePath).sort((a,b)=>a===CAD_ENTRY?-1:b===CAD_ENTRY?1:a.localeCompare(b));
}

export interface CadError { file?:string; line?:number; message:string }
export const describeAt=(at:{file?:string|null;line?:number|null}|null|undefined)=>at?.file?`${at.file}${at.line?` line ${at.line}`:''}`:'';

// ---- joining the files ------------------------------------------------------------------------------------------
/** Lines `start` to `end` (1-based, inclusive) of the joined script are `file`'s lines 1 to end - start + 1. */
export interface SourceSection { file:string; start:number; end:number }
export interface Bundle { source:string; locations:SourceSection[]; errors:CadError[] }

const lineAt=(source:string,offset:number)=>{let n=1;for(let i=0;i<offset;i++)if(source.charCodeAt(i)===10)n++;return n;};
const newlines=(s:string)=>'\n'.repeat((s.match(/\n/g)??[]).length);
function resolvePath(from:string,spec:string):string|null {
  if(!spec.startsWith('./')&&!spec.startsWith('../'))return null;
  const parts=from.split('/').slice(0,-1);
  for(const p of spec.split('/')){if(p==='.'||p==='')continue;if(p==='..'){if(!parts.length)return null;parts.pop();}else parts.push(p);}
  return parts.join('/');
}
interface Binding { local:string; imported:string } // imported: a name, 'default', or '*' for the whole file
interface ParsedFile { imports:{target:string;bindings:Binding[]}[]; exports:Map<string,string>; edits:{from:number;to:number;text:string}[]; errors:CadError[] }
const moduleVar=(i:number)=>`__shcode_file_${i}`;

/** One file's imports and exports, and the edits that turn them into plain JavaScript (same line count). */
function parseFile(file:string,source:string,known:Set<string>):ParsedFile {
  const out:ParsedFile={imports:[],exports:new Map(),edits:[],errors:[]};
  const err=(at:number,message:string)=>out.errors.push({file,line:lineAt(source,at),message});
  const text=(n:{from:number;to:number})=>source.slice(n.from,n.to);
  const tree=parser.parse(source);
  for(let n=tree.topNode.firstChild;n;n=n.nextSibling){
    if(n.name==='ImportDeclaration'){
      const str=n.getChildren('String').at(-1);
      if(!str){err(n.from,'An import needs the file it comes from: import { Tray } from \'./tray.js\'.');continue;}
      const spec=text(str).slice(1,-1);const target=resolvePath(file,spec);
      if(!target){err(str.from,`Import other files of this project by their path, like './tray.js'. "${spec}" is not one.`);continue;}
      if(!known.has(target)){err(str.from,`There is no file ${target} in this project.`);continue;}
      const bindings:Binding[]=[];
      const group=n.getChild('ImportGroup');
      if(group){
        let imported:string|null=null;
        for(let c=group.firstChild;c;c=c.nextSibling){
          if(c.name==='VariableName')imported=text(c);
          else if(c.name==='VariableDefinition'){bindings.push({local:text(c),imported:imported??text(c)});imported=null;}
        }
      }
      const star=n.getChild('Star');const def=n.getChildren('VariableDefinition');
      for(const d of def)bindings.push({local:text(d),imported:star?'*':'default'});
      out.imports.push({target,bindings});
      const k=`@@${target}@@`;
      const parts=bindings.map(b=>b.imported==='*'?`const ${b.local} = ${k};`:b.imported==='default'?`const ${b.local} = ${k}.default;`:`const { ${b.imported===b.local?b.local:`${b.imported}: ${b.local}`} } = ${k};`);
      out.edits.push({from:n.from,to:n.to,text:parts.join(' ')+newlines(text(n))});
      continue;
    }
    if(n.name==='ExportDeclaration'){
      if(n.getChild('String')||n.getChild('Star')){err(n.from,'Export what this file makes; to pass on another file\'s code, import it where it is used.');continue;}
      const isDefault=!!n.getChild('default');
      const decl=n.getChild('ClassDeclaration')??n.getChild('FunctionDeclaration');
      const vars=n.getChild('VariableDeclaration');
      const group=n.getChild('ExportGroup');
      const head=n.firstChild!; // the word export
      if(decl){
        const name=decl.getChild('VariableDefinition');
        if(isDefault&&!name){out.edits.push({from:head.from,to:decl.from,text:'const __shcode_default = '});out.exports.set('default','__shcode_default');continue;}
        out.edits.push({from:head.from,to:decl.from,text:''});
        out.exports.set(isDefault?'default':text(name!),text(name!));
        continue;
      }
      if(vars){
        out.edits.push({from:head.from,to:vars.from,text:''});
        for(const d of vars.getChildren('VariableDefinition'))out.exports.set(text(d),text(d));
        if(vars.getChild('ObjectPattern')||vars.getChild('ArrayPattern'))err(n.from,'Export each name on its own line, like export const width = 60;.');
        continue;
      }
      if(group){
        let local:string|null=null;
        for(let c=group.firstChild;c;c=c.nextSibling){
          if(c.name!=='VariableName')continue;
          const prev=c.prevSibling;
          if(prev?.name==='as'&&local){out.exports.delete(local);out.exports.set(text(c),local);local=null;}
          else{local=text(c);out.exports.set(local,local);}
        }
        out.edits.push({from:n.from,to:n.to,text:newlines(text(n))});
        continue;
      }
      if(isDefault){ // export default <expression>
        const after=n.getChild('default')!;
        out.edits.push({from:head.from,to:after.to,text:'const __shcode_default ='});out.exports.set('default','__shcode_default');
        continue;
      }
      err(n.from,'This export is not one the project files understand. Write export before a class, function or const.');
      continue;
    }
  }
  tree.iterate({enter(n){
    if(n.name==='DynamicImport'||(n.name==='CallExpression'&&n.node.firstChild?.name==='import')){err(n.from,'Load other files with an import line at the top of the file.');return false;}
  }});
  return out;
}

/**
 * The project as one reSHape script: the files script.js imports (and theirs), each turned
 * into a function that returns its exports, then script.js. A file nothing imports is left out.
 */
export function bundleProject(files:Record<string,string>,entry=CAD_ENTRY):Bundle {
  const names=codeFiles(files);const known=new Set(names);
  if(!known.has(entry))return {source:'',locations:[],errors:[{message:`There is no ${entry} in this project.`}]};
  const parsed=new Map<string,ParsedFile>();const errors:CadError[]=[];
  const order:string[]=[];const state=new Map<string,'busy'|'done'>();
  const visit=(file:string,from?:string):void=>{
    if(state.get(file)==='done')return;
    if(state.get(file)==='busy'){errors.push({file:from,message:`${file} and ${from} import each other (or go round in a circle). Move the shared code into one of them.`});return;}
    state.set(file,'busy');
    const p=parseFile(file,files[file]??'',known);parsed.set(file,p);errors.push(...p.errors);
    for(const i of p.imports)visit(i.target,file);
    state.set(file,'done');order.push(file);
  };
  visit(entry);
  for(const [file,p] of parsed)for(const i of p.imports){
    const ex=parsed.get(i.target)?.exports;if(!ex)continue;
    for(const b of i.bindings)if(b.imported!=='*'&&!ex.has(b.imported))errors.push({file,message:b.imported==='default'?`${i.target} has no export default.`:`${i.target} does not export ${b.imported}. Write export before it there.`});
  }
  if(errors.length)return {source:'',locations:[],errors};
  const index=new Map(order.map((f,i)=>[f,i]));
  let source='';const locations:SourceSection[]=[];let line=1;
  for(const file of order){
    const p=parsed.get(file)!;let body=files[file]??'';
    for(const e of [...p.edits].sort((a,b)=>b.from-a.from))body=body.slice(0,e.from)+e.text+body.slice(e.to);
    body=body.replace(/@@([^@]+)@@/g,(_,t:string)=>moduleVar(index.get(t)!));
    const count=body.split('\n').length;
    if(file===entry){locations.push({file,start:line,end:line+count-1});source+=body;line+=count-1;}
    else{
      const ret=[...p.exports].map(([k,v])=>`${JSON.stringify(k)}: ${v}`).join(', ');
      locations.push({file,start:line,end:line+count-1});
      source+=`const ${moduleVar(index.get(file)!)} = (() => { ${body}\n; return { ${ret} }; })();\n`;
      line+=count+1;
    }
  }
  if(source.length>MAX_SOURCE)return {source:'',locations:[],errors:[{message:`The project is too long to run (over ${MAX_SOURCE} characters).`}]};
  return {source,locations,errors:[]};
}
/** Which file and line of the project a line of the joined script is. */
export function locate(line:number|null|undefined,locations:SourceSection[]):{file:string;line:number}|null {
  if(!Number.isInteger(line)||!line||line<1)return null;
  const s=locations.find(x=>line>=x.start&&line<=x.end);
  return s?{file:s.file,line:line-s.start+1}:null;
}

// ---- which variable holds which part ----------------------------------------------------------------------------
// After a run, the labels and the editor's lists name a part by its variable (part.face('top')). The guarded path
// reports SolidCraft's bodies (b_pull1), not the variables, so the script is evaluated once more in the same opaque
// runner with one line added at its end that stops it with the answer: each top-level variable's part (b_<step>)
// or sketch (s:<step>). Nothing is built by this evaluation. A sketch is asked first: the runner's friendly sketch is a proxy that answers any
// property (so `__reshapeHandle` alone would take it for a part).
export const MAP_MARK='__SHCODE_MAP__';
export function withVariableProbe(source:string,names:string[]):string {
  const safe=names.filter(n=>/^[A-Za-z_$][\w$]*$/.test(n));
  const each=safe.map(n=>`${JSON.stringify(n)}: (() => { try { const v = ${n}; if (!v || typeof v !== 'object') return null; if (typeof v.id === 'string' && /^sk\\d+$/.test(v.id)) return 's:' + v.id; if (v.__reshapeHandle === true && typeof v.rootId === 'string') return 'b_' + v.rootId; return null; } catch (e) { return null; } })()`);
  return `${source}\n;throw new Error(${JSON.stringify(MAP_MARK)} + JSON.stringify({ ${each.join(', ')} }));\n`;
}
/** The probe's answer: body name (b_pull1) to variable, and sketch id (sk1) to variable. First variable wins. */
export function readVariableProbe(errors:{message:string}[]):{bodies:Map<string,string>;sketches:Map<string,string>}|null {
  const m=errors.map(e=>String(e.message)).find(x=>x.includes(MAP_MARK));if(!m)return null;
  try{
    const map=JSON.parse(m.slice(m.indexOf(MAP_MARK)+MAP_MARK.length)) as Record<string,string|null>;
    const bodies=new Map<string,string>();const sketches=new Map<string,string>();
    for(const [name,v] of Object.entries(map)){
      if(typeof v!=='string')continue;
      if(v.startsWith('s:')){if(!sketches.has(v.slice(2)))sketches.set(v.slice(2),name);}
      else if(!bodies.has(v))bodies.set(v,name);
    }
    return {bodies,sketches};
  }catch{return null;}
}

// ---- which line made a step --------------------------------------------------------------------------------------
// The guarded build reports a refused step by its id (round1, pull2), not by a line. The interpreter makes the steps in
// the order the script runs, so the line is found by evaluating the script cut short after a top-level statement of
// script.js: the first such prefix whose document has the step is the statement that made it. Each evaluation only runs
// the interpreter in the opaque runner; nothing is built. A step made inside an imported class is put on the line of
// script.js that called it, which is where the student changes it.
export type EvaluateDoc=(source:string)=>Promise<{errors:unknown[];doc?:{features?:{id?:unknown}[]}|null}>;
/** The end offset and first line of each top-level statement of the entry's part of the joined script. */
export function entryStatements(source:string,locations:SourceSection[],entry=CAD_ENTRY):{to:number;line:number}[] {
  const at=locations.find(l=>l.file===entry);if(!at)return [];
  const lineStarts=[0];for(let i=0;i<source.length;i++)if(source.charCodeAt(i)===10)lineStarts.push(i+1);
  const lineOf=(pos:number)=>{let lo=0,hi=lineStarts.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(lineStarts[m]<=pos)lo=m;else hi=m-1;}return lo+1;};
  const from=lineStarts[at.start-1]??source.length;const out:{to:number;line:number}[]=[];
  for(let c=parser.parse(source).topNode.firstChild;c;c=c.nextSibling){
    if(c.to<=from||c.name==='LineComment'||c.name==='BlockComment'||c.type.isError)continue;
    out.push({to:c.to,line:lineOf(Math.max(c.from,from))});
  }
  return out;
}
/** Each step id's file and line, for the ids given; a step the prefixes cannot place is left out. */
export async function stepLines(source:string,locations:SourceSection[],ids:string[],evaluate:EvaluateDoc,entry=CAD_ENTRY):Promise<Map<string,{file:string;line:number}>> {
  const found=new Map<string,{file:string;line:number}>();
  const stmts=entryStatements(source,locations,entry);if(!stmts.length||!ids.length)return found;
  const seen=new Map<number,Set<string>|null>();
  const idsAt=async(k:number)=>{
    if(seen.has(k))return seen.get(k)!;
    let s:Set<string>|null=null;
    try{const r=await evaluate(source.slice(0,stmts[k].to)+'\n');if(!r.errors?.length&&r.doc)s=new Set((r.doc.features??[]).map(f=>String(f.id)));}catch{s=null;}
    seen.set(k,s);return s;
  };
  for(const id of [...new Set(ids)]){
    const last=await idsAt(stmts.length-1);if(!last?.has(id))continue;
    let lo=0,hi=stmts.length-1;let ok=true;
    while(lo<hi){const m=(lo+hi)>>1;const s=await idsAt(m);if(!s){ok=false;break;}if(s.has(id))hi=m;else lo=m+1;}
    if(!ok)continue;
    const at=locate(stmts[lo].line,locations);if(at)found.set(id,at);
  }
  return found;
}

// ---- reSHape's own names for the edges on screen -----------------------------------------------------------------
// The editor's lists offer each labelled edge of a part as part.edge('top', 'right'). To leave out an edge reSHape would refuse, the host page's resolver
// is asked about it (pane.js checkNames), and that needs reSHape's own name for it and the step it would act on. The script is evaluated once more with a
// closing line that reports, for each candidate, what part.edge(a, b) gives: its name and the step the part is at (or null when reSHape itself refuses
// the words). Nothing is built by this evaluation.
export const EDGE_MARK='__SHCODE_EDGES__';
export interface EdgeCandidate { owner:string; a:string; b:string }
export function withEdgeNameProbe(source:string,cands:EdgeCandidate[]):string {
  const safe=cands.filter(c=>/^[A-Za-z_$][\w$]*$/.test(c.owner)&&/^[a-z]+$/.test(c.a)&&/^[a-z]+$/.test(c.b));
  const each=safe.map(c=>`(() => { try { const r = ${c.owner}.edge(${JSON.stringify(c.a)}, ${JSON.stringify(c.b)}); return { name: r.name, target: r.owner.id }; } catch (e) { return null; } })()`);
  return `${source}\n;throw new Error(${JSON.stringify(EDGE_MARK)} + JSON.stringify([${each.join(', ')}]));\n`;
}
/** The probe's answer, one entry per candidate given to withEdgeNameProbe (in order); null when the probe did not report. */
export function readEdgeNameProbe(errors:{message:string}[],count:number):({name:unknown;target:string}|null)[]|null {
  const m=errors.map(e=>String(e.message)).find(x=>x.includes(EDGE_MARK));if(!m)return null;
  try{const a=JSON.parse(m.slice(m.indexOf(EDGE_MARK)+EDGE_MARK.length));return Array.isArray(a)&&a.length===count?a:null;}catch{return null;}
}
