// Face and edge labels: `top`, `bottom`, `front` (−Y), `back`, `left` (−X), `right`, the
// words reSHape uses. A label names the flat face of a body whose outward normal points
// that way and that lies furthest that way; an edge is named by its two faces. Labels are
// matched against SolidCraft's own description of the body (model.faces, model.edges) at
// the step that uses them, so they follow the model as it changes.

export const FACE_LABELS = ['top', 'bottom', 'front', 'back', 'left', 'right'] as const;
export type FaceLabel = typeof FACE_LABELS[number];
export const LABEL_DIRECTION: Record<FaceLabel, [number, number, number]> = {
  top: [0, 0, 1], bottom: [0, 0, -1], front: [0, -1, 0], back: [0, 1, 0], right: [1, 0, 0], left: [-1, 0, 0],
};
export interface ScFace { index: number; name?: string; area?: number; centroid: number[]; plane_normal?: number[] | null; point: number[] }
export interface ScEdge { index: number; name?: string; mid: number[]; start?: number[]; end?: number[]; length?: number }
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const isFaceLabel = (v: unknown): v is FaceLabel => typeof v === 'string' && (FACE_LABELS as readonly string[]).includes(v);

/** The face a label names, or a sentence saying why there is none. */
export function faceByLabel(faces: ScFace[], label: FaceLabel, body: string): { face: ScFace } | { error: string } {
  const dir = LABEL_DIRECTION[label];
  const facing = faces.filter(f => Array.isArray(f.plane_normal) && dot(f.plane_normal, dir) > 0.9999);
  if (!facing.length) return { error: `${body} has no flat face that faces ${label === 'top' ? 'up' : label === 'bottom' ? 'down' : label}, so it has no '${label}' face. Pick the face with faceAt([x, y, z]).` };
  const far = Math.max(...facing.map(f => dot(f.centroid, dir)));
  const level = facing.filter(f => Math.abs(dot(f.centroid, dir) - far) < 1e-6);
  if (level.length > 1) return { error: `${body} has ${level.length} '${label}' faces at the same level. Pick one with faceAt([x, y, z]).` };
  return { face: level[0] };
}

/** Each face's label, where it has one (for showing labels in the view and for click-to-fill). */
export function labelFaces(faces: ScFace[]): Map<number, FaceLabel> {
  const out = new Map<number, FaceLabel>();
  for (const label of FACE_LABELS) { const r = faceByLabel(faces, label, ''); if ('face' in r) out.set(r.face.index, label); }
  return out;
}

/**
 * The two faces an edge lies between. SolidCraft names an edge "<face>|<face>", and a face
 * name can itself hold a "|" (a round between two faces: "F3:blend:F2:side:l1|F2:top"), so
 * the name is split where both halves are names of this body's faces.
 */
function edgeFaces(e: ScEdge, faces: ScFace[]): Set<string> {
  const name = String(e.name ?? ''); const known = new Set(faces.map(f => f.name).filter(Boolean) as string[]);
  for (let i = name.indexOf('|'); i >= 0; i = name.indexOf('|', i + 1)) { const a = name.slice(0, i), b = name.slice(i + 1); if (known.has(a) && known.has(b)) return new Set([a, b]); }
  return new Set();
}
/**
 * The edge where two labelled faces meet. One edge can be in pieces (a round at one end
 * splits it): every piece is returned, so a fillet or chamfer takes the whole edge.
 */
export function edgeByLabels(faces: ScFace[], edges: ScEdge[], a: FaceLabel, b: FaceLabel, body: string): { edges: ScEdge[] } | { error: string } {
  const fa = faceByLabel(faces, a, body); if ('error' in fa) return fa;
  const fb = faceByLabel(faces, b, body); if ('error' in fb) return fb;
  const found = edges.filter(e => { const s = edgeFaces(e, faces); return !!fa.face.name && !!fb.face.name && s.has(fa.face.name) && s.has(fb.face.name); });
  if (!found.length) return { error: `The '${a}' and '${b}' faces of ${body} do not meet at an edge. Pick the edge with edgeAt([x, y, z]).` };
  return { edges: found };
}
/** Every edge around a labelled face. */
export function edgesOfLabel(faces: ScFace[], edges: ScEdge[], label: FaceLabel, body: string): { edges: ScEdge[] } | { error: string } {
  const f = faceByLabel(faces, label, body); if ('error' in f) return f;
  const found = edges.filter(e => !!f.face.name && edgeFaces(e, faces).has(f.face.name));
  return found.length ? { edges: found } : { error: `The '${label}' face of ${body} has no edges SolidCraft could name.` };
}
/** The two labels of an edge, when both of its faces have one, in reading order. */
export function edgeLabels(faces: ScFace[], edge: ScEdge): [FaceLabel, FaceLabel] | null {
  const labels = labelFaces(faces); const names = edgeFaces(edge, faces);
  const ls = faces.filter(f => f.name && names.has(f.name) && labels.has(f.index)).map(f => labels.get(f.index)!);
  // top or bottom first, then front or back, then left or right: part.edge('top', 'front')
  ls.sort((x, y) => FACE_LABELS.indexOf(x) - FACE_LABELS.indexOf(y));
  return ls.length === 2 ? [ls[0], ls[1]] : null;
}
