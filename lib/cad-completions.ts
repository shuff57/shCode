// Autocomplete for reSHape Script in a CAD project (lib/solidcraft-code.ts): the official CAD
// words with their arguments, a sketch's drawing methods after `sk.`, a part's face and edge
// names after `part.`, and, in the brackets of sketch(), part.face(), part.edge(), fillet(),
// chamfer(), shell() and hole(), the planes, faces, edges and parts the model has.
import { selectedCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

const W = (label: string, detail: string, info: string, type = 'function'): Completion => ({ label, detail, info, type, boost: 2 });
export const CAD_WORDS: Completion[] = [
  W('sketch', "('top' | 'front' | 'side', offset = 0)", "A sketch on a plane: 'top' is flat (Z up), 'front' faces you, 'side' faces right. offset moves it: sketch('top', 10)."),
  W('extrude', '(sketch, height, { reversed, midplane, taper })', 'A solid pulled from a sketch.'),
  W('pocket', '(sketch, part, depth, { through })', 'Cuts the sketch into the part, to a depth or { through: true }.'),
  W('revolve', '(sketch, angle)', 'A solid turned from a sketch with one rect().'),
  W('cuboid', '(width, depth, height, { at })', 'A box, centred on at.'),
  W('cylinder', '(diameter, height, { at })', 'A cylinder standing up, centred on at.'),
  W('sphere', '(diameter, { at })', 'A sphere.'),
  W('cone', '(diameter, height, { at })', 'A pointed cone.'),
  W('torus', '(diameter, tubeDiameter, { at })', 'A ring.'),
  W('prism', '(sides, across, height, { at })', 'A prism with a regular polygon end.'),
  W('wedge', '(width, depth, height, { at })', 'A wedge.'),
  W('fillet', '(edges, radius)', "Rounds edges: fillet(part.edge('top', 'front'), 2)."),
  W('chamfer', '(edges, distance)', "Bevels edges: chamfer(part.edge('top', 'right'), 1)."),
  W('shell', "(part, { wall, open: 'top' })", "Hollows a part, open on a face: shell(part, { wall: 2, open: 'top' })."),
  W('hole', "(part, { across, deep, at: [u, v], along: 'z' })", 'Drills a hole, through unless deep is given: hole(part, { across: 6 }).'),
  W('holes', '(part, { across, apart: [x, y] })', 'Four holes at the corners of a rectangle.'),
  W('draft', "(part, angle, { from: 'bottom' })", 'Tilts the side walls.'),
  W('groove', '(sketch, part, angle)', 'Cuts by turning a sketch.'),
  W('union', '(part, ...others)', 'Joins parts into the first.'),
  W('subtract', '(part, ...others)', 'Cuts the others out of the first.'),
  W('intersect', '(part, ...others)', 'Keeps only what the parts share.'),
  W('mirror', "(part, 'left-right' | 'front-back' | 'top-bottom', { at })", 'A mirrored copy.'),
  W('linearPattern', '(part, { count, step: [x, y, z] })', 'Copies in a row: linearPattern(part, { count: 3, step: [20, 0, 0] }).'),
  W('polarPattern', "(part, { count, axis, angle })", 'Copies around an axis: polarPattern(part, { count: 6 }).'),
  W('move', '(part, [x, y, z], { copy })', 'Moves a part.'),
  W('turn', '(part, [x, y, z])', 'Turns a part by degrees about x, y and z.'),
  W('param', '(name, value, { min, max })', 'A named number you can change.'),
];
const M = (label: string, detail: string, info: string) => W(label, detail, info, 'method');
const SKETCH_MEMBERS: Completion[] = [
  M('rectangle', '([x0, y0], [x1, y1])', 'A rectangle by two opposite corners.'),
  M('circle', '([x, y], { r })', 'A circle: sk.circle([0, 0], { r: 5 }).'),
  M('line', '(start, end)', 'A line between two points.'),
  M('lines', '([[x, y], …], { closed })', 'A chain of lines.'),
  M('arc', "(centre, from, to, 'ccw' | 'cw')", 'An arc about a centre.'),
  M('point', '([x, y])', 'A point.'),
  M('rect', '(width, height, { at })', 'A plain rectangle, the one revolve() takes.'),
  M('horizontal', '(line)', 'Keeps a line level.'),
  M('vertical', '(line)', 'Keeps a line upright.'),
  M('length', '(line, value)', 'Sets a line\'s length.'),
  M('radius', '(circle, value)', 'Sets a radius.'),
  M('diameter', '(circle, value)', 'Sets a diameter.'),
  M('distance', '(a, b, value)', 'Sets the distance between two points.'),
  M('equal', '(a, b)', 'Makes two lines or circles the same size.'),
  M('parallel', '(a, b)', 'Makes two lines parallel.'),
  M('perpendicular', '(a, b)', 'Makes two lines meet square.'),
  M('tangent', '(a, b)', 'Makes a line and an arc meet smoothly.'),
  M('fix', '(point)', 'Pins a point where it is.'),
];
const BODY_MEMBERS: Completion[] = [
  M('face', "('top' | 'bottom' | 'front' | 'back' | 'left' | 'right')", 'A face by its name.'),
  M('edge', '(faceA, faceB)', "The edge where two faces meet: part.edge('top', 'front')."),
  M('wall', '(sketch, n)', 'The wall a pocket cut along side n of its sketch.'),
  M('rim', '(sketch)', 'The edges where a pocket opens: fillet(part.rim(sk), 1).'),
];
const SKETCH_MADE = /\bsketch\s*\(/;
const BODY_MADE = /\b(extrude|pocket|revolve|cuboid|cylinder|sphere|cone|torus|prism|wedge|fillet|chamfer|shell|hole|holes|draft|groove|union|subtract|intersect|mirror|linearPattern|polarPattern|move|turn)\s*\(/;

/** True when the code is a CAD script in reSHape's words. */
export function isCadCode(doc: string): boolean {
  return /\bsketch\(\s*['"](?:top|front|side)['"]|\b(?:extrude|cuboid|fillet|chamfer|pocket)\s*\(/.test(doc);
}
/** What a variable holds, from the line that declares it: a sketch, a part, or neither. */
export function cadKindOf(name: string, doc: string): 'sketch' | 'body' | null {
  const m = new RegExp(`(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*([^;\\n]*)`).exec(doc);
  if (!m) return null;
  if (SKETCH_MADE.test(m[1]) && !BODY_MADE.test(m[1].replace(/sketch\s*\([^)]*\)/, ''))) return 'sketch';
  if (BODY_MADE.test(m[1]) || /\.build\s*\(/.test(m[1])) return 'body';
  return null;
}

// ---- the part's own faces, edges and planes, offered in the brackets ----------------------------------
// After each build the studio (components/SolidCraftCodeStudio.tsx) says what the model has: each part,
// the variable that holds it, its labelled faces (with the sketch plane through each flat one) and its
// labelled edges. The one highlighted in the list is selected in the view.

/** Something in the model a completion stands for, so the view can show it. */
export interface CadTarget { type: 'face' | 'edge' | 'plane'; body?: string; points: number[][] }
export interface CadModelBody {
  body: string;
  /** The variable of script.js that holds the part; null when none does (made in a class, say). */
  owner: string | null;
  /** sketch: the plane through the face for sketch(), like `'top', 10`, when the face is flat and square to an axis. */
  faces: { label: string | null; point: number[]; sketch?: string | null }[];
  /** A labelled edge may be in pieces (split by a round); all its pieces' midpoints. refused: reSHape would not find it on the part as built
   *  (an edge a later round or pocket changed), so the lists leave it out. */
  edges: { labels: [string, string] | null; points: number[][]; refused?: boolean }[];
}
export interface CadModel { bodies: CadModelBody[]; onHighlight?: (target: CadTarget | null) => void }
let cadModel: CadModel | null = null;
/** The studio sets this after every build, and null when it closes. */
export function setCadModel(model: CadModel | null) { cadModel = model; }
export const getCadModel = () => cadModel;

const targets = new WeakMap<Completion, CadTarget>();
/** What a completion stands for in the model, when it stands for something. */
export const cadTargetOf = (c: Completion | null) => (c && targets.get(c)) || null;
function option(label: string, detail: string, target: CadTarget | null): Completion {
  const c: Completion = { label, detail, type: target?.type === 'plane' ? 'constant' : 'variable' };
  if (target) targets.set(c, target);
  return c;
}
const PLANES: [string, string][] = [['top', 'flat, Z up (XY)'], ['front', 'upright, facing you (XZ)'], ['side', 'upright, facing right (YZ)']];
const planeOptions = () => PLANES.map(([p, d]) => option(`'${p}'`, `the ${p} plane: ${d}`, { type: 'plane', points: [] }));
const ORDER = ['top', 'bottom', 'front', 'back', 'left', 'right'];
const rank = (label: string | null) => label ? ORDER.indexOf(label) : ORDER.length;
const byLabel = <T extends { label: string | null }>(xs: T[]) => [...xs].sort((x, y) => rank(x.label) - rank(y.label));
function faceOptions(b: CadModelBody, wrap: (label: string) => string): Completion[] {
  return byLabel(b.faces).filter(f => f.label).map(f => option(wrap(`'${f.label}'`), `${b.owner ?? b.body} · ${f.label} face`, { type: 'face', body: b.body, points: [f.point] }));
}
function edgeOptions(b: CadModelBody, wrap: (labels: string) => string): Completion[] {
  return [...b.edges].filter(e => e.labels && !e.refused)
    .sort((x, y) => rank(x.labels![0]) - rank(y.labels![0]) || rank(x.labels![1]) - rank(y.labels![1]))
    .map(e => option(wrap(`'${e.labels![0]}', '${e.labels![1]}'`), `${b.owner ?? b.body} · ${e.labels![0]}/${e.labels![1]} edge`, { type: 'edge', body: b.body, points: e.points }));
}
/** The sketch planes through the model's flat faces, each once. */
function facePlaneOptions(bodies: CadModelBody[]): Completion[] {
  const seen = new Set<string>(); const out: Completion[] = [];
  for (const b of bodies) for (const f of byLabel(b.faces)) {
    if (!f.sketch || seen.has(f.sketch) || !f.sketch.includes(',')) continue;
    seen.add(f.sketch);
    out.push(option(f.sketch, `the plane through ${b.owner ?? b.body} · ${f.label ? `${f.label} face` : 'a face'}`, { type: 'face', body: b.body, points: [f.point] }));
  }
  return out;
}
const OWNER = String.raw`([A-Za-z_$][\w$]*)`;
const IN_CALL = new RegExp(String.raw`(?:${OWNER}\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\(\s*([^()]*)$`);
/**
 * The options for the argument the cursor is in, from the model as last built: the planes and the planes
 * through its faces for sketch(), a part's face names for part.face(), its edges for part.edge(), and so on.
 */
export function cadArgumentCompletions(ctx: CompletionContext): CompletionResult | null {
  const model = cadModel; if (!model) return null;
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = ctx.state.sliceDoc(Math.max(line.from, ctx.pos - 300), ctx.pos);
  const m = IN_CALL.exec(before); if (!m) return null;
  const [, owner, word, typed] = m;
  // Only the first argument, except an edge's two face names and a sketch's plane and offset.
  if (word !== 'edge' && word !== 'sketch' && /,/.test(typed.replace(/\[[^\]]*\]/g, ''))) return null;
  if (/[;{}]/.test(typed)) return null;
  const from = ctx.pos - typed.length;
  const body = owner ? model.bodies.find(b => b.owner === owner) : undefined;
  const owned = model.bodies.filter(b => b.owner);
  let options: Completion[] | null = null;
  if (body && word === 'face') options = faceOptions(body, s => s);
  else if (body && word === 'edge') options = edgeOptions(body, s => s);
  else if (!owner && word === 'sketch') options = [...planeOptions(), ...facePlaneOptions(model.bodies)];
  else if (!owner && (word === 'fillet' || word === 'chamfer')) options = owned.flatMap(b => edgeOptions(b, s => `${b.owner}.edge(${s})`));
  else if (!owner && (word === 'hole' || word === 'shell')) options = owned.map(b => option(b.owner!, `the part ${b.body}`, null));
  if (!options?.length) return null;
  // Keep the model's order (planes, then top, bottom, front, back, left, right), not A to Z.
  options = options.map((o, i) => { const c = { ...o, boost: Math.max(-99, 99 - i) }; const t = targets.get(o); if (t) targets.set(c, t); return c; });
  // A closing quote the editor added for the one being typed is replaced too.
  const quote = /^['"]/.test(typed) && !/^(['"]).*\1/.test(typed) ? typed[0] : '';
  const to = quote && ctx.state.sliceDoc(ctx.pos, ctx.pos + 1) === quote ? ctx.pos + 1 : ctx.pos;
  return { from, to, options, filter: true, validFor: /^[^()]*$/ };
}

const SKIP = new Set(['String', 'TemplateString', 'LineComment', 'BlockComment', 'RegExp']);
export function cadCompletionSource(ctx: CompletionContext): CompletionResult | null {
  const tree = ensureSyntaxTree(ctx.state, ctx.pos, 50) ?? syntaxTree(ctx.state);
  const node = tree.resolveInner(ctx.pos, -1).name;
  if (node === 'LineComment' || node === 'BlockComment') return null;
  const doc = ctx.state.doc.toString();
  if (!isCadCode(doc)) return null;
  const args = cadArgumentCompletions(ctx); if (args) return args;
  if (SKIP.has(node)) return null;
  const member = ctx.matchBefore(/([A-Za-z_$][\w$]*)\s*\.\s*([\w$]*)$/);
  if (member) {
    const m = /([A-Za-z_$][\w$]*)\s*\.\s*([\w$]*)$/.exec(member.text)!;
    const kind = cadKindOf(m[1], doc);
    if (!kind) return null;
    return { from: member.to - m[2].length, options: kind === 'sketch' ? SKETCH_MEMBERS : BODY_MEMBERS, validFor: /^[\w$]*$/ };
  }
  const word = ctx.matchBefore(/[A-Za-z_$][\w$]*/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  if (word.from > 0 && ctx.state.sliceDoc(word.from - 1, word.from) === '.') return null;
  return { from: word.from, options: CAD_WORDS, validFor: /^[\w$]*$/ };
}

/** Selects in the view what the highlighted completion stands for, and clears it when the list closes. */
export const cadCompletionPreview = EditorView.updateListener.of(u => {
  const was = cadTargetOf(selectedCompletion(u.startState)); const now = cadTargetOf(selectedCompletion(u.state));
  if (was !== now) cadModel?.onHighlight?.(now?.type === 'plane' ? null : now);
});
