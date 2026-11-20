// What a click in the SolidCraft view writes into the code, in reSHape Script: a face or an
// edge by its words on the variable that holds the part (part.face('top'),
// part.edge('top', 'front')), and, in the brackets of sketch(), the plane through a flat
// face ('top', 10). reSHape names only labelled faces and edges, so an unnamed one is
// shown but not written.
import { parser } from '@lezer/javascript';
import { edgeLabels, labelFaces, type ScEdge, type ScFace } from './solidcraft-labels';

export interface Pick { type: 'face' | 'edge'; body: string; index: number; point: number[] }
export interface PickCode { code: string | null; name: string; sketch?: string }

/** The top-level variables of a file (not those inside functions, classes or blocks). */
function topLevel(source: string): Set<string> {
  const names = new Set<string>();
  for (let n = parser.parse(source).topNode.firstChild; n; n = n.nextSibling) {
    if (n.name === 'VariableDeclaration') for (const b of n.getChildren('VariableDefinition')) names.add(source.slice(b.from, b.to));
  }
  return names;
}
/** Every name declared at the top level of a file: new variables must not reuse one. */
export const topLevelNames = (source: string) => {
  const names = topLevel(source);
  for (let n = parser.parse(source).topNode.firstChild; n; n = n.nextSibling) if (n.name === 'ClassDeclaration' || n.name === 'FunctionDeclaration') { const id = n.getChild('VariableDefinition'); if (id) names.add(source.slice(id.from, id.to)); }
  return names;
};
/** The top-level const/let/var names, the ones the variable probe asks about. */
export const topLevelVariables = (source: string) => [...topLevel(source)];

const num = (n: number) => String(Math.round(n * 1e4) / 1e4);
/** The sketch plane through a flat face whose normal is along an axis: 'top', 'front' or 'side' and its offset. */
export function sketchPlaneOf(face: ScFace): string | null {
  const n = face.plane_normal; if (!n) return null;
  const axis = [0, 1, 2].find(i => Math.abs(Math.abs(n[i]) - 1) < 1e-6); if (axis === undefined) return null;
  const word = axis === 2 ? 'top' : axis === 1 ? 'front' : 'side';
  const at = face.centroid[axis];
  return Math.abs(at) < 1e-9 ? `'${word}'` : `'${word}', ${num(at)}`;
}

/** The code for a picked face or edge. `vars` maps SolidCraft's body name (b_pull1) to the variable that holds it. */
export function pickText(pick: Pick, faces: ScFace[], edges: ScEdge[], vars: Map<string, string>): PickCode {
  const owner = vars.get(pick.body);
  const who = owner ?? 'this part';
  if (pick.type === 'face') {
    const face = faces.find(f => f.index === pick.index);
    const label = labelFaces(faces).get(pick.index);
    const sketch = face ? sketchPlaneOf(face) ?? undefined : undefined;
    if (label && owner) return { code: `${owner}.face('${label}')`, name: `${who} · ${label} face`, sketch };
    return { code: null, name: label ? `${who} · ${label} face (the part is not in a variable of script.js)` : `${who} · a face without a name`, sketch };
  }
  const edge = edges.find(e => e.index === pick.index);
  const ls = edge ? edgeLabels(faces, edge) : null;
  if (ls && owner) return { code: `${owner}.edge('${ls[0]}', '${ls[1]}')`, name: `${who} · ${ls[0]}/${ls[1]} edge` };
  return { code: null, name: ls ? `${who} · ${ls[0]}/${ls[1]} edge (the part is not in a variable of script.js)` : `${who} · an edge without a name` };
}

/** Words whose first argument a pick fills when the cursor is in their empty brackets. */
export const FILLS = ['sketch', 'fillet', 'chamfer', 'shell', 'hole'];
/** The word whose empty brackets the cursor is in, if it is one a pick fills. */
export function fillingCall(doc: string, cursor: number): string | null {
  const call = /([A-Za-z_$][\w$]*)\(\s*$/.exec(doc.slice(0, cursor));
  return call && FILLS.includes(call[1]) && /^\s*\)/.test(doc.slice(cursor)) ? call[1] : null;
}
/**
 * What a pick writes and where: in the empty brackets of sketch() the plane through the face, in those of
 * fillet(), chamfer(), shell() or hole() the face or edge (shell() and hole() take the part), else at the cursor.
 */
export function insertion(doc: string, cursor: number, pick: PickCode): { from: number; to: number; insert: string; filled: boolean } | null {
  const call = fillingCall(doc, cursor);
  if (call === 'sketch') return pick.sketch ? { from: cursor, to: cursor, insert: pick.sketch, filled: true } : null;
  if (!pick.code) return null;
  if ((call === 'fillet' || call === 'chamfer') && pick.code.includes('.face(')) return null;
  if (call === 'shell' || call === 'hole') { const part = pick.code.replace(/\.(face|edge)\(.*$/, ''); return { from: cursor, to: cursor, insert: part, filled: true }; }
  return { from: cursor, to: cursor, insert: pick.code, filled: !!call };
}
