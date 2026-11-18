import { readNativeDrawing, NATIVE_SKETCH_SCRIPT } from './solidcraft-native-format';
import type { ModelDoc } from './model-types';

export type Point2 = [number, number];
export type SketchEntity =
  | { id: string; kind: 'rectangle'; x: number; y: number; width: number; depth: number; anchored: boolean }
  | { id: string; kind: 'circle'; x: number; y: number; diameter: number; anchored: boolean }
  | { id: string; kind: 'line'; x: number; y: number; x2: number; y2: number };
export interface SketchDrawing { version: 1; entities: SketchEntity[] }
export const EMPTY_SKETCH: SketchDrawing = { version: 1, entities: [] };

// Classroom-owned data, never arbitrary native commands or executable source.
export function readSketch(text: string): SketchDrawing {
  const value = JSON.parse(text) as SketchDrawing;
  if (value?.version !== 1 || !Array.isArray(value.entities) || value.entities.length > 60) throw new Error('This is not a supported sketch file.');
  const ids = new Set<string>();
  for (const e of value.entities) {
    if (!e || !/^s[1-9]\d*$/.test(e.id) || ids.has(e.id)) throw new Error('Each sketch item needs a unique id.');
    ids.add(e.id);
    const keys = e.kind === 'rectangle' ? ['x', 'y', 'width', 'depth'] : e.kind === 'circle' ? ['x', 'y', 'diameter'] : e.kind === 'line' ? ['x', 'y', 'x2', 'y2'] : null;
    if (!keys || keys.some(k => typeof (e as unknown as Record<string, unknown>)[k] !== 'number' || !Number.isFinite((e as unknown as Record<string, number>)[k]) || Math.abs((e as unknown as Record<string, number>)[k]) > 10000)) throw new Error('Sketch measurements must be finite numbers within 10,000 mm.');
    if ((e.kind === 'rectangle' && (e.width < .01 || e.depth < .01)) || (e.kind === 'circle' && e.diameter < .01) || (e.kind === 'line' && Math.hypot(e.x2 - e.x, e.y2 - e.y) < .01)) throw new Error('Each edge or diameter must be at least 0.01 mm.');
    if (e.kind !== 'line' && typeof e.anchored !== 'boolean') throw new Error('The sketch anchor setting is missing.');
  }
  return value;
}
export function writeSketch(drawing: SketchDrawing): string { return JSON.stringify(readSketch(JSON.stringify(drawing)), null, 2) + '\n'; }
export function sketchScript(drawing: SketchDrawing): string {
  readSketch(JSON.stringify(drawing));
  const rows = ['// Generated from sketch.json by the sketch tools. All measurements are in mm.', "const sk = sketch('top');"];
  if (!drawing.entities.length) rows.push('sk.geom([]);');
  drawing.entities.forEach((e, i) => {
    const name = `item${i + 1}`;
    const p = JSON.stringify([e.x, e.y]);
    if (e.kind === 'rectangle') {
      rows.push(`const ${name} = sk.rectangle(${p}, ${JSON.stringify([e.x + e.width, e.y + e.depth])});`, `sk.length(${name}.bottom, ${e.width});`, `sk.length(${name}.right, ${e.depth});`);
      if (e.anchored) rows.push(`sk.at(${name}.bottom.a, ${p});`);
    } else if (e.kind === 'circle') {
      rows.push(`const ${name} = sk.circle(${p}, { r: ${e.diameter / 2} });`, `sk.diameter(${name}, ${e.diameter});`);
      if (e.anchored) rows.push(`sk.at(${name}.c, ${p});`);
    } else rows.push(`const ${name} = sk.line(${p}, ${JSON.stringify([e.x2, e.y2])});`);
  });
  return rows.join('\n') + '\n';
}

// Invert the engine's own projected XY basis; no guessed camera scale or pixel ratio.
export function sketchPoint(point: Point2, projected: (Point2 | null)[]): Point2 {
  const [o, x, y] = projected;
  if (!o || !x || !y || ![...point, ...o, ...x, ...y].every(Number.isFinite)) throw new Error('The flat sketch view could not be measured.');
  const a = x[0] - o[0], b = y[0] - o[0], c = x[1] - o[1], d = y[1] - o[1], det = a * d - b * c;
  if (Math.abs(det) < 1e-9) throw new Error('The sketch view is not flat.');
  const u = point[0] - o[0], v = point[1] - o[1];
  return [(d * u - b * v) / det, (a * v - c * u) / det];
}

/** Extra topology check for the first milestone, on the current host-accepted ModelDoc.
 * Bounding dimensions alone also pass an open U, crossed lines or duplicate edges.
 * This deliberately checks one simple axis-aligned rectangle, not arbitrary profiles.
 */
export function checkSketchOutline(files: Record<string, string>, doc: ModelDoc | null, refusals?: Record<string, string> | null, scriptRequired=false): string | null {
  try {
    if (JSON.parse(files['sketch.json'] ?? '{}').version===2) {
      const native=readNativeDrawing(files['sketch.json']);
      if(scriptRequired&&native.scriptSource===undefined)return 'Run your sketch script before Check. Hand edits are kept in the native file.';
      if(native.scriptSource!==undefined&&files['script.js']!==native.scriptSource)return 'Your script changed. Run it again before Check.';
      if(native.editing || !native.solver || (native.scriptSource===undefined&&files['script.js']!==NATIVE_SKETCH_SCRIPT) || !doc || JSON.stringify(native.doc)!==JSON.stringify(doc)) return native.scriptSource!==undefined?'Run the current sketch script, then Check again.':'Finish the current native sketch, then Check again.';
    } else {
      const drawing=readSketch(files['sketch.json'] ?? '');
      if(files['script.js']!==sketchScript(drawing)||!doc)return 'Update the sketch view, then Check again.';
    }
  } catch {return 'Open a valid sketch before checking.';}
  if(!doc)return 'Finish the current native sketch, then Check again.';
  if (Object.keys(refusals ?? {}).length) return 'A sketch step was refused. Read its message before checking again.';
  if (doc.features.length !== 1 || doc.features[0].kind !== 'sketch' || doc.features[0].plane !== 'xy' || doc.features[0].offset !== 0 || doc.features[0].frame) return 'Keep one flat sketch for the organizer outline.';
  const lines = doc.features[0].geoms?.filter(g => !g.construction);
  if (!lines || lines.length !== 4 || lines.some(g => g.k !== 'line')) return 'Make one closed rectangle with four straight edges.';
  const points = lines.flatMap(g => g.k === 'line' ? [g.a, g.b] : []);
  if (!points.flat().every(Number.isFinite)) return 'The outline has an invalid measurement.';
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const lo: Point2 = [Math.min(...xs), Math.min(...ys)], hi: Point2 = [Math.max(...xs), Math.max(...ys)];
  if (hi[0] - lo[0] < .01 || hi[1] - lo[1] < .01) return 'Give the outline a width and a depth.';
  const tol = 1e-6;
  const corner = (p: Point2) => {
    const x = Math.abs(p[0] - lo[0]) <= tol ? 0 : Math.abs(p[0] - hi[0]) <= tol ? 1 : -1;
    const y = Math.abs(p[1] - lo[1]) <= tol ? 0 : Math.abs(p[1] - hi[1]) <= tol ? 1 : -1;
    return x < 0 || y < 0 ? -1 : x + 2 * y;
  };
  const edges = new Set<string>(); const degree = [0, 0, 0, 0];
  for (const g of lines) {
    if (g.k !== 'line') continue;
    const a = corner(g.a), b = corner(g.b);
    if (a < 0 || b < 0 || a === b || (a ^ b) === 3) return 'Join the four corners without gaps or crossing edges.';
    edges.add([a, b].sort().join(':')); degree[a]++; degree[b]++;
  }
  return edges.size === 4 && degree.every(n => n === 2) ? null : 'Join the four corners once each to close the outline.';
}


export interface SketchSnapshot {
  status?: string;
  failing?: unknown[];
  sketch?: { curves: { type: string; start_at?: Point2; end_at?: Point2; center_at?: Point2; radius?: number; construction?: boolean }[] };
}
/** Read back geometry from the engine, instead of grading the requested coordinates. */
export function observedSketch(doc: ModelDoc, result?: { sketches?: SketchSnapshot[]; measure?: { bodies?: unknown[] } }): ModelDoc | null {
  if (doc.features.length !== 1 || doc.features[0].kind !== 'sketch' || result?.sketches?.length !== 1 || !result.measure || !Array.isArray(result.measure.bodies) || result.measure.bodies.length) return null;
  const snap = result.sketches[0];
  if (snap.status !== 'solved' || !Array.isArray(snap.failing) || snap.failing.length || !snap.sketch?.curves) return null;
  const point = (p?: Point2): p is Point2 => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  const geoms: import('./model-types').SoupGeom[] = [];
  for (const [i, c] of snap.sketch.curves.entries()) {
    if (c.type === 'line' && point(c.start_at) && point(c.end_at)) geoms.push({ id: i + 1, k: 'line', a: c.start_at, b: c.end_at, construction: !!c.construction });
    else if (c.type === 'circle' && point(c.center_at) && typeof c.radius === 'number' && Number.isFinite(c.radius) && c.radius > 0) geoms.push({ id: i + 1, k: 'circle', c: c.center_at, r: c.radius, construction: !!c.construction });
    else return null;
  }
  return { version: 1, features: [{ ...doc.features[0], geoms }] };
}
