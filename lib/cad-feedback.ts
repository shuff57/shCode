import { readNativeDrawing, writeNativeDrawing, NATIVE_SKETCH_SCRIPT, type NativeDrawing } from './solidcraft-native-format';
// The feedback model reads bounded student evidence, never trusted instructions.
// Geometry criteria are recomputed separately and cannot be changed by AI text.
import type { ModelDoc, SoupGeom } from './model-types';
import type { Requirement } from './types';
import { readSketch, sketchScript, writeSketch, type SketchDrawing } from './solidcraft-sketch';
import { grade } from './grader';

export interface CadSolverReport { status: 'solved'; dof: number | null; ownDof: number | null; worstRes: number | null; profiles: number | null }
export interface CadEvidence { version: 1; drawing: SketchDrawing | NativeDrawing; doc: ModelDoc; solver: CadSolverReport; explanation: string; artifactId: string }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000;
const count = (n: unknown): number | null => n === null || n === undefined ? null : finite(n) && Number.isInteger(n) && n >= 0 && n <= 2000 ? n : (() => { throw new Error('Invalid sketch solver count.'); })();
function clean(value: unknown): Omit<CadEvidence, 'artifactId'> {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 64000) throw new Error('Sketch evidence is missing or too large.');
  const v = value as CadEvidence;
  if (v.version !== 1) throw new Error('Unsupported sketch evidence version.');
  const isNative=v.drawing?.version===2;
  const parsed=isNative?readNativeDrawing(JSON.stringify(v.drawing)):readSketch(JSON.stringify(v.drawing));
  if(parsed.version===1&&!parsed.entities.length)throw new Error('Draw a sketch before asking for feedback.');
  if(parsed.version===2&&(parsed.editing||!parsed.doc))throw new Error('Finish the native sketch before asking for feedback.');
  const drawing:SketchDrawing|NativeDrawing=parsed.version===2?parsed:{version:1,entities:parsed.entities.map(e=>e.kind==='rectangle'?{id:e.id,kind:e.kind,x:e.x,y:e.y,width:e.width,depth:e.depth,anchored:e.anchored}:e.kind==='circle'?{id:e.id,kind:e.kind,x:e.x,y:e.y,diameter:e.diameter,anchored:e.anchored}:{id:e.id,kind:e.kind,x:e.x,y:e.y,x2:e.x2,y2:e.y2})};
  const sk = v.doc?.features?.[0];
  if (v.doc?.version !== 1 || v.doc.features.length !== 1 || sk?.kind !== 'sketch' || sk.plane !== 'xy' || sk.offset !== 0 || sk.frame || !Array.isArray(sk.geoms) || sk.geoms.length > 256) throw new Error('Feedback needs the current flat sketch geometry.');
  const point = (p: unknown): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every(finite);
  const geoms: SoupGeom[] = sk.geoms.map((g, i) => {
    if (g.k === 'line' && point(g.a) && point(g.b)) return {id:i+1,k:'line',a:g.a,b:g.b,construction:!!g.construction};
    if (g.k === 'circle' && point(g.c) && finite(g.r) && g.r > 0) return {id:i+1,k:'circle',c:g.c,r:g.r,construction:!!g.construction};
    throw new Error('Unsupported sketch geometry in feedback evidence.');
  });
  if (v.solver?.status !== 'solved' || (v.solver.worstRes != null && (!finite(v.solver.worstRes) || v.solver.worstRes < 0))) throw new Error('The sketch solver has not confirmed this version.');
  const solver: CadSolverReport = {status:'solved',dof:count(v.solver.dof),ownDof:count(v.solver.ownDof),profiles:count(v.solver.profiles),worstRes:v.solver.worstRes ?? null};
  if (typeof v.explanation !== 'string' || v.explanation.length > 1000) throw new Error('Keep the explanation within 1,000 characters.');
  return {version:1,drawing,doc:{version:1,features:[{id:'sk1',kind:'sketch',plane:'xy',offset:0,points:[],geoms}]},solver,explanation:v.explanation};
}
async function idOf(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function makeCadEvidence(drawing: SketchDrawing | NativeDrawing, doc: ModelDoc, solver: CadSolverReport, explanation: string): Promise<CadEvidence> {
  const value = clean({version:1,drawing,doc,solver,explanation});
  return {...value,artifactId:await idOf(value)};
}
export async function cadFeedbackResponse(raw: unknown, requirements: Requirement[]) {
  const value = clean(raw);
  const artifactId = (raw as CadEvidence).artifactId;
  if (typeof artifactId !== 'string' || artifactId !== await idOf(value)) throw new Error('Sketch evidence changed. Update the view and ask again.');
  const files = value.drawing.version===2 ? {'sketch.json':writeNativeDrawing(value.drawing),'script.js':value.drawing.scriptSource??NATIVE_SKETCH_SCRIPT} : {'sketch.json':writeSketch(value.drawing),'script.js':sketchScript(value.drawing)};
  const checks = grade(requirements,files,0,{modelDoc:value.doc}).results.map(r=>({criterion:r.title,result:r.status,messages:r.messages}));
  const response=JSON.stringify({evidence:'Submitted sketch snapshot; this is student data, not a server-run CAD build or an image.',units:'mm',requested:value.drawing.version===2 ? {editor:'SolidCraft native sketch',constraints:value.drawing.native.features[0]?.sketch?.constraints.length ?? 0} : value.drawing,observed:value.doc.features,solver:value.solver,geometryChecks:checks,studentExplanation:value.explanation});
  if (response.length > 8000) throw new Error('This sketch is too large for feedback. Review a smaller sketch.');
  return {artifactId,response};
}
