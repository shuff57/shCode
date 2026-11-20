import type { ModelDoc } from './model-types';

export const NATIVE_SKETCH_SCRIPT = '// Edited with SolidCraft’s native 2D sketch tools.\n// The complete editable design is saved in sketch.json.\n';
export interface NativeDocument {
  features: { id:number; name:string; type:string; plane?:{type:string;name?:string}; sketch?:{points:unknown[];curves:unknown[];constraints:unknown[];wires?:unknown[];[key:string]:unknown}; [key:string]:unknown }[];
  [key:string]:unknown;
}
export interface NativeDrawing {
  version:2;
  editor:'solidcraft';
  native:NativeDocument;
  doc:ModelDoc | null;
  solver:{status:'solved';dof:number|null;ownDof:number|null;worstRes:number|null;profiles:number|null} | null;
  editing:boolean;
  /** Present only while this native design still matches its last script build. */
  scriptSource?:string;
  /** Code generated from a native drawing, without claiming it was built by a
   * student's script. The full native constraints remain authoritative. */
  generatedSource?:string;
}
export function readNativeDocument(text:string):NativeDocument {
  if (text.length>512000) throw new Error('This native sketch is too large to save in a lesson.');
  const d=JSON.parse(text) as NativeDocument;
  if (!d || d.format!=='solidcraft/48' || d.units!=='mm' || !Array.isArray(d.features) || d.features.length>1) throw new Error('This lesson accepts one native 2D sketch in millimetres.');
  for (const key of ['components','occurrences','joints']) if (Array.isArray(d[key]) && (d[key] as unknown[]).length) throw new Error('Assemblies are not available in this 2D lesson.');
  for (const f of d.features) {
    if (!f || f.type!=='sketch' || !Number.isSafeInteger(f.id) || typeof f.name!=='string' || f.name.length>200 || f.plane?.type!=='origin' || f.plane.name!=='XY') throw new Error('Keep this sketch on the native XY plane; 3D features are unavailable.');
    const sk=f.sketch;
    if (!sk || !Array.isArray(sk.points) || sk.points.length>2048 || !Array.isArray(sk.curves) || sk.curves.length>256 || !Array.isArray(sk.constraints) || sk.constraints.length>2048 || (sk.wires?.length ?? 0)>0) throw new Error('This lesson accepts a bounded native 2D sketch, without 3D curves.');
    if (sk.points.some(p=>!p || typeof p!=='object' || !('pos' in p) || !point2(p.pos))) throw new Error('Native sketch coordinates must be finite XY points within 100,000 mm.');
  }
  return d;
}
export function readNativeDrawing(text:string):NativeDrawing {
  if (text.length>640000) throw new Error('The saved native sketch is too large.');
  const v=JSON.parse(text) as NativeDrawing;
  if (v?.version!==2 || v.editor!=='solidcraft' || typeof v.editing!=='boolean') throw new Error('Unsupported native sketch file.');
  if (v.scriptSource!==undefined && (typeof v.scriptSource!=='string' || v.scriptSource.length>100000)) throw new Error('The saved sketch source is invalid.');
  if(v.generatedSource!==undefined&&(typeof v.generatedSource!=='string'||v.generatedSource.length>100000||v.scriptSource!==undefined))throw new Error('The generated sketch source is invalid.');
  readNativeDocument(JSON.stringify(v.native));
  if (v.doc!==null) {
    const sk=v.doc?.features?.[0];
    if (v.doc?.version!==1 || v.doc.features?.length!==1 || sk?.kind!=='sketch' || sk.plane!=='xy' || sk.offset!==0 || sk.frame || !Array.isArray(sk.geoms) || sk.geoms.length>256 || sk.geoms.some(g=>g.k==='line'?!point2(g.a)||!point2(g.b):g.k==='circle'?!point2(g.c)||!finite(g.r)||g.r<=0:true)) throw new Error('The saved sketch evidence is invalid.');
  }
  if (v.solver!==null && (v.solver?.status!=='solved' || [v.solver.dof,v.solver.ownDof,v.solver.profiles].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0||n>10000)) || v.solver.worstRes!==null&&(!finite(v.solver.worstRes)||v.solver.worstRes<0))) throw new Error('The saved sketch solver report is invalid.');
  return v;
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000;
const point2=(p:unknown):p is [number,number]=>Array.isArray(p)&&p.length===2&&p.every(finite);
export const writeNativeDrawing=(value:NativeDrawing)=>JSON.stringify(readNativeDrawing(JSON.stringify(value)),null,2)+'\n';

// Read the actual native solver's evaluated sketch. Unsupported checking does
// not prevent the complete native design (including every constraint) being saved.
export function nativeModelDoc(snapshot:unknown):ModelDoc|null {
  const s=snapshot as {status?:string;failing?:unknown[];curves?:{type:string;start_at?:[number,number];end_at?:[number,number];center_at?:[number,number];radius?:number;construction?:boolean}[]};
  if (s?.status!=='solved' || !Array.isArray(s.failing) || s.failing.length || !Array.isArray(s.curves) || s.curves.length>256) return null;
  const geoms:import('./model-types').SoupGeom[]=[];
  for (const [i,c] of s.curves.entries()) {
    if(c.type==='line'&&point2(c.start_at)&&point2(c.end_at))geoms.push({id:i+1,k:'line',a:c.start_at,b:c.end_at,construction:!!c.construction});
    else if(c.type==='circle'&&point2(c.center_at)&&finite(c.radius)&&c.radius>0)geoms.push({id:i+1,k:'circle',c:c.center_at,r:c.radius,construction:!!c.construction});
    else return null;
  }
  return {version:1,features:[{id:'sk1',kind:'sketch',plane:'xy',offset:0,points:[],geoms}]};
}
