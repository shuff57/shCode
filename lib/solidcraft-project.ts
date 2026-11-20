// The persisted project type remains "reshape" so drafts, ownership, cloud
// history and teacher policies keep their existing keys. The renderer is SolidCraft.
//
// One source file. Sketches and 3D steps live together in script.js, so a sketch
// is an ordinary variable: `const part = extrude(sk, 10)` uses it directly, and
// classes or functions that draw a sketch are visible to the 3D steps below them.
// cad.json only remembers which view is open and which sketch variable the Sketch
// view shows. The older two-file layout (sketch.js wrapped in a private scope and
// handed to script.js as `profile`) is read once and merged into script.js.
import { parser } from '@lezer/javascript';
export type CadView='solid'|'sketch';
export interface CadSketchLink { variable:string }
export interface CadSourceLocation { file:string; start:number; end:number }
export const CAD_SETTINGS_FILE='cad.json';
export const CAD_SOURCE='script.js';
/** The sketch file of the older two-file layout. Read only, to merge it into script.js. */
export const CAD_LEGACY_SKETCH_SOURCE='sketch.js';
export const CAD_NATIVE_SKETCH='sketch.json';
export const SOLIDCRAFT_SOLID_STARTER=`// SolidCraft CAD: change a measurement, then Run.
const width = 40;
const depth = 30;
const height = 10;

const body = box(width, depth, height);
hole(body, { across: 6 });
`;
export const SOLIDCRAFT_SKETCH_STARTER=`// A native SolidCraft XY sketch, in millimetres.
const width = 60;
const depth = 40;

const sk = sketch('top');
const base = sk.rectangle([0, 0], [width, depth]);
sk.length(base.bottom, width);
sk.length(base.right, depth);
`;
/** A new CAD project: one sketch, used directly by the 3D steps below it. */
export const SOLIDCRAFT_PROJECT_STARTER=`// SolidCraft CAD: sketches and 3D steps share this file.
// Change a measurement, then Run. Sketch shows sk on its own.
const width = 60;
const depth = 40;
const height = 10;

const sk = sketch('top');
const base = sk.rectangle([0, 0], [width, depth]);
sk.length(base.bottom, width);
sk.length(base.right, depth);

const part = extrude(sk, height);
hole(part, { across: 6 });
`;

function settingsOf(files:Record<string,string>):Record<string,unknown>|null {
  try {const s=JSON.parse(files[CAD_SETTINGS_FILE]??'{}');return s&&typeof s==='object'?s:null;}catch{return null;}
}
export function cadView(files:Record<string,string>):CadView {
  const settings=settingsOf(files);
  return (settings?.version===1||settings?.version===2)&&settings.view==='sketch'?'sketch':'solid';
}
export function validSketchVariable(value:string):boolean {
  if(!/^[A-Za-z_$][\w$]*$/.test(value))return false;
  return !parser.parse(`const ${value} = 0;`).toString().includes('⚠');
}
export function cadSketchLink(files:Record<string,string>):CadSketchLink|null {
  const settings=settingsOf(files);
  if(!settings?.sketch)return null;
  const variable=(settings.sketch as {variable?:unknown}).variable;
  if((settings.version!==1&&settings.version!==2)||typeof variable!=='string'||!validSketchVariable(variable))throw new Error('The saved sketch link is invalid. Restore a project version from History.');
  return {variable};
}
export const cadSettings=(view:CadView,sketch?:CadSketchLink|null)=>JSON.stringify({version:2,view,...(sketch?{sketch}:{})})+'\n';

/** The names declared at the top level of a script, in source order (not those inside functions, classes or blocks). */
export function topLevelNames(source:string):string[] {
  const names:string[]=[];
  for(let n=parser.parse(source).topNode.firstChild;n;n=n.nextSibling){
    if(n.name==='VariableDeclaration')for(const b of n.getChildren('VariableDefinition'))names.push(source.slice(b.from,b.to));
    else if(n.name==='ClassDeclaration'||n.name==='FunctionDeclaration'){const id=n.getChild('VariableDefinition');if(id)names.push(source.slice(id.from,id.to));}
  }
  return names;
}
/**
 * The top-level variables that hold a sketch, as far as the code shows without running it, in source order: the
 * ones written as `name = sketch(...)`, and the ones passed as the profile of `extrude`, `pull`, `spin` or `revolve`
 * (a sketch a class or function returned, like `extrude(tray, 20)`). What the Sketch picker suggests.
 */
const PROFILE_CALLS=new Set(['extrude','pull','spin','revolve']);
export function sketchVariables(source:string):string[] {
  const top=new Set(topLevelNames(source));const found:{name:string;at:number}[]=[];
  for(const declaration of parser.parse(source).topNode.getChildren('VariableDeclaration')){
    for(const binding of declaration.getChildren('VariableDefinition')){
      const call=binding.nextSibling?.nextSibling;
      const callee=call?.name==='CallExpression'?call.getChild('VariableName'):null;
      if(callee&&source.slice(callee.from,callee.to)==='sketch')found.push({name:source.slice(binding.from,binding.to),at:binding.from});
    }
  }
  parser.parse(source).iterate({enter(n){
    if(n.name!=='CallExpression')return;
    const callee=n.node.firstChild;if(callee?.name!=='VariableName'||!PROFILE_CALLS.has(source.slice(callee.from,callee.to)))return;
    const first=n.node.getChild('ArgList')?.firstChild?.nextSibling;
    if(first?.name==='VariableName'){const name=source.slice(first.from,first.to);if(top.has(name))found.push({name,at:first.from});}
  }});
  const names:string[]=[];for(const f of found.sort((a,b)=>a.at-b.at))if(!names.includes(f.name))names.push(f.name);
  return names;
}
export function suggestedSketchVariable(source:string):string {
  const sketches=sketchVariables(source);if(sketches.length)return sketches[0];
  const names=topLevelNames(source);
  return names.find(n=>n==='sk')??names.find(n=>n==='profile')??names.at(-1)??'sk';
}
export function projectSketchVariable(source:string,link:CadSketchLink|null):string {
  if(link&&topLevelNames(source).includes(link.variable))return link.variable;
  return suggestedSketchVariable(source);
}
const NOT_TOP_LEVEL=(name:string)=>`${name} is not a variable at the top of script.js. Assign your sketch to one outside any function or class, like const outline = new Tray(24).draw();`;
/**
 * The source the Sketch view runs: the whole script, then one more step that
 * extrudes the chosen variable. The interpreter names that step's target, which
 * is the sketch the variable holds, wherever and however it was made (a class,
 * a function, a loop). The extra step is never saved or shown.
 */
export function sketchProbe(source:string,variable:string):{source:string;line:number} {
  if(!validSketchVariable(variable))throw new Error('Choose the variable that holds your sketch, such as sk or outline.');
  if(!topLevelNames(source).includes(variable))throw new Error(NOT_TOP_LEVEL(variable));
  const body=source.endsWith('\n')?source:source+'\n';
  return {source:`${body};extrude(${variable}, 1);\n`,line:body.split('\n').length};
}
function freeName(source:string,base:string):string {
  const names=new Set<string>();
  parser.parse(source).iterate({enter(n){if(n.name==='VariableDefinition')names.add(source.slice(n.from,n.to));}});
  let name=base,i=2;while(names.has(name))name=`${base}${i++}`;
  return name;
}
export function sketchPartStarter(height:number,variable='sk'):string {
  if(!Number.isFinite(height)||height<=0||height>100000)throw new Error('Use an extrusion height above 0 and at most 100,000 mm.');
  return `const part = extrude(${variable}, ${height});\n`;
}
/** Extrude Model's toolbar: one new line at the end of script.js, using the sketch variable directly. */
export function appendSketchExtrusion(source:string,variable:string,height:number):string {
  sketchPartStarter(height);
  if(!validSketchVariable(variable))throw new Error('Choose the variable that holds your sketch, such as sk or outline.');
  if(!topLevelNames(source).includes(variable))throw new Error(NOT_TOP_LEVEL(variable));
  return `${source.trimEnd()}${source.trim()?'\n\n':''}const ${freeName(source,'part')} = extrude(${variable}, ${height});\n`;
}
/** New sketch: a rectangle on the top plane under a free name, appended to script.js. */
export function appendNewSketch(source:string):{source:string;variable:string} {
  const variable=freeName(source,'sk');
  const block=`const ${variable} = sketch('top');\n${variable}.rectangle([0, 0], [40, 30]);\n`;
  return {source:`${source.trimEnd()}${source.trim()?'\n\n':''}${block}`,variable};
}

// ---- the older two-file layout --------------------------------------------------------------------
/** The exact program the two-file layout ran: sketch.js in a private scope, handed to script.js as `profile`. */
export function linkedCadProgram(sketchSource:string,steps:string,link:CadSketchLink):{source:string;locations:CadSourceLocation[]} {
  if(!validSketchVariable(link.variable))throw new Error('Choose the variable that holds your sketch, such as sk or outline.');
  const prefix=`const profile = (() => {\n${sketchSource}\nreturn ${link.variable};\n})();\n`;
  const start=prefix.split('\n').length;
  return {source:prefix+steps,locations:[
    {file:CAD_LEGACY_SKETCH_SOURCE,start:2,end:1+sketchSource.split('\n').length},
    {file:CAD_SOURCE,start,end:start+steps.split('\n').length-1},
  ]};
}
/** A project saved with sketch.js linked to script.js, not yet merged. */
export function isLegacyLinkedProject(files:Record<string,string>):boolean {
  const settings=settingsOf(files);
  return settings?.version===1&&!!settings.sketch&&typeof files[CAD_LEGACY_SKETCH_SOURCE]==='string';
}
function usesName(source:string,name:string):boolean {
  let found=false;
  parser.parse(source).iterate({enter(n){if(!found&&n.name==='VariableName'&&source.slice(n.from,n.to)===name)found=true;}});
  return found;
}
/**
 * One script.js that builds what the two files built. When the two files declare
 * none of the same names, the sketch code goes at the top as it was written, and
 * `profile` keeps working. When they do, the sketch keeps its private scope.
 */
export function mergeLegacySketch(files:Record<string,string>):{source:string;link:CadSketchLink} {
  const link=cadSketchLink(files);
  const sketch=files[CAD_LEGACY_SKETCH_SOURCE]??'';
  // The one comment the old Extrude wrote into script.js would now be wrong; student-written lines are not touched.
  const steps=(files[CAD_SOURCE]??'').replace(/^\/\/ profile comes from sketch\.js\. Change the height, then Run\.$/m,'// profile is the sketch above. Change the height, then Run.');
  if(!link)throw new Error('This project has no linked sketch to merge.');
  const own=new Set(topLevelNames(sketch));const theirs=topLevelNames(steps);
  const alias=link.variable!=='profile'&&usesName(steps,'profile');
  const clash=theirs.some(n=>own.has(n))||(alias&&own.has('profile'))||(alias&&theirs.includes('profile'));
  if(clash)return {source:`// Sketch, moved here from sketch.js. It keeps its own scope because both files used the same names.\n${linkedCadProgram(sketch,steps,link).source}`,link:{variable:'profile'}};
  const head=`// Sketch, moved here from sketch.js.\n${sketch.trimEnd()}\n${alias?`const profile = ${link.variable};\n`:''}`;
  return {source:`${head}\n${steps}`,link};
}

export function cadDemoFiles(source:string,view:CadView,variable?:string):Record<string,string>{
  return {[CAD_SETTINGS_FILE]:cadSettings(view,variable?{variable}:null),[CAD_SOURCE]:source};
}
