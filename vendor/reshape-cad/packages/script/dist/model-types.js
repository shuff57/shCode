// The canonical form of a mouse-built model. JSCAD source is a one-way
// projection of this, the way Mermaid is a projection of a DiagramDoc — the
// student never hand-writes the JSON, and the generated code is never parsed
// back. Stored in lesson_drafts like a diagram, so there is no new table.
//
// An ordered feature list IS a program: each row is a statement, each number a
// value, and subtract(a, b) is not subtract(b, a). That is the whole reason the
// visual mode belongs in a CS course rather than beside one.
import { splitEdge } from '@shuff57/reshape-sketch/sketch-arc';
import { featureChain } from './topo-name.js';
/** The named planes' world axes, matching PLANE_AXES in occt-build.ts and
 *  plane_frame in brep-rs/src/wasm.rs. Kept as the one JS copy so a frame
 *  consumer cannot disagree with the kernels. */
const NAMED_PLANE_FRAMES = {
    xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
    xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
    yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] },
};
/**
 * Resolve a sketch's world frame, whether it names a plane or carries a frame.
 *
 * Named planes take their axes from NAMED_PLANE_FRAMES verbatim -- NOT through
 * a cross product, so xz keeps its -Y sweep direction exactly as before. A
 * sketch with `frame` gets its normal as u x v (normalised), so an arbitrary
 * planar face is expressible while the right-handed convention is preserved.
 */
export function sketchFrameOf(f) {
    if (f.frame) {
        const { origin, u, v } = f.frame;
        const n = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
        ];
        return { origin, u, v, n };
    }
    const a = NAMED_PLANE_FRAMES[f.plane] ?? NAMED_PLANE_FRAMES.xy;
    const offset = f.offset ?? 0;
    return {
        origin: [a.n[0] * offset, a.n[1] * offset, a.n[2] * offset],
        u: a.u,
        v: a.v,
        n: a.n,
    };
}
/**
 * Ids of earlier features this one is built from directly.
 *
 * Structural, not a kind list: a feature depends on whatever its own
 * `targets` or `target` field names. The reorder guard in ModelEditor.tsx
 * calls this instead of checking `f.kind === 'combine'` by name, so a future
 * derived kind is covered automatically as long as it uses one of these two
 * field names for its dependency -- the same way every derived kind already
 * does -- rather than needing a human to remember to add it to a list.
 */
export function dependsOn(f) {
    const named = topoRefs(f);
    // `into` is a real dependency and the only one no `target`/`targets` field
    // reaches: pocket and groove both name the SOLID they cut separately from
    // the PROFILE they cut it with, and reshape-script-gen.ts emits both as
    // variable references. Deleting the solid used to leave the cut pointing
    // at an undeclared name -- the exact ReferenceError this file exists for.
    const into = 'into' in f && typeof f.into === 'string' ? [f.into] : [];
    if ('targets' in f)
        return [...new Set([...f.targets, ...into, ...named])];
    if ('target' in f)
        return [...new Set([f.target, ...into, ...named])];
    return [...new Set([...into, ...named])];
}
/**
 * Feature ids a feature reaches through a TopoName rather than through a
 * target field.
 *
 * A Round names the edge it works on, and that edge is the meeting of two faces
 * which may belong to a feature other than the one being rounded. That is a
 * real dependency -- delete the feature the face came from and the round has
 * nothing to hold on to -- and it is invisible to a `target` field, which is
 * why dependsOn() above folds this in rather than leaving it to each caller to
 * remember.
 *
 * featureChain() is the authority on which ids a name passes through; this only
 * knows which fields hold names.
 */
export function topoRefs(f) {
    const names = [];
    if (f.kind === 'fillet')
        names.push(f.edge);
    if (f.kind === 'draft' && f.face)
        names.push(f.face);
    if (f.kind === 'shell' && f.open)
        names.push(f.open);
    return [...new Set(names.flatMap(featureChain))];
}
/** Anything that consumes an earlier feature rather than standing alone. */
export function isDerived(f) {
    return (f.kind === 'combine' || f.kind === 'extrude' || f.kind === 'revolve' ||
        f.kind === 'mirror' || f.kind === 'pattern' || f.kind === 'hole' ||
        f.kind === 'shell' || f.kind === 'move');
}
/**
 * True when nothing in the doc could ever produce a 3D solid: it is empty,
 * or every feature in it is a bare `sketch` -- flat by construction until a
 * Pull or a Spin turns one into an extrude/revolve.
 *
 * Exists so a caller watching the mesh a build produced can tell "zero
 * triangles because nothing solid was ever asked for" apart from "zero
 * triangles because something that SHOULD be solid came out empty" (an
 * over-large Hole eating the whole part, say). Those two used to be the same
 * signal -- SandboxWorkspace.tsx's `stale` gate read triangle count alone,
 * so a brand-new session (EMPTY_DOC, before a student has drawn anything)
 * and a fresh Sketch/Circle/Polygon both showed the same "These numbers
 * leave nothing behind" warning immediately, for a document that was never
 * broken -- see that call site's own comment for the fix this predicate
 * unblocks.
 */
export function isSketchOnly(doc) {
    return doc.features.length === 0 || doc.features.every((f) => f.kind === 'sketch');
}
export const EMPTY_DOC = { version: 1, features: [] };
/** A positioned primitive: has a centre, and can carry handles. Listed
 *  positively rather than by exclusion — every feature added since the six
 *  derived kinds below has needed to be left OUT of this, not in it. */
export function isShape(f) {
    return (f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'sphere' ||
        f.kind === 'cone' || f.kind === 'torus');
}
/** Only a primitive can be rounded — see canRound() for why a combine cannot. */
export function isRoundable(f) {
    return f.kind === 'box' || f.kind === 'cylinder';
}
/**
 * Why the fillet/chamfer tool refuses, or null when it does not.
 *
 * JSCAD solids are polygon soups with no topology, so there is no edge to pick
 * and no B-rep kernel to blend it. What there IS: rounded primitives, and hull
 * tricks that chamfer one. Both need the shape itself, before anything was cut
 * out of it. Refusing here and saying so is better than a fillet button that
 * quietly does nothing on half the tree -- and it teaches the thing the feature
 * list exists to teach, which is that order changes the result.
 */
export function whyCannotRound(f) {
    if (f.kind === 'combine') {
        // The remedy has to name what actually happened: cutting is the only
        // combine that removes material, so "before you cut it" is backwards
        // advice for a Join or an Overlap, where nothing was cut at all.
        if (f.op === 'subtract') {
            return 'Rounding works on a shape, not a combination. Round the shape before you cut it.';
        }
        const verb = f.op === 'union' ? 'join' : 'overlap';
        return `Rounding works on a shape, not a combination. Round the shapes before you ${verb} them.`;
    }
    if (f.kind === 'sketch') {
        // A circle sketch has no Rules panel -- ModelEditor.tsx only renders
        // SketchConstraints (the panel that carries Round a corner) when
        // shape !== 'circle', because a circle has no corners for that panel's
        // per-edge rows to describe. Naming that remedy for a circle anyway
        // points the student at a control they cannot reach.
        //
        // This message has now been wrong three times, each time narrower: first
        // it named a corner-rounding tool that did not exist; then it named the
        // Rules panel, which a circle never renders; then it said to pull the
        // circle into a solid and round THAT, which isRoundable() refuses for
        // anything but a box or a cylinder. Three generations of naming a
        // remedy that cannot be reached. So this one names none: it states what
        // is true about a circle and stops.
        if (f.shape === 'circle') {
            return 'A circle has no corners to round — it is already round the whole way. Rounding is for shapes with edges, like a box.';
        }
        // A real remedy now exists -- Round a corner in the Rules panel, below
        // the sketch's own edge table -- so this names it rather than the older
        // sentence claiming no such tool existed, which stopped being true the
        // day that panel shipped.
        return 'Rounding works on a solid shape, not a flat sketch. To round a corner here, use Round a corner in the Rules panel.';
    }
    if (f.kind === 'extrude' || f.kind === 'revolve') {
        const past = f.kind === 'extrude' ? 'pulled' : 'spun';
        const bare = f.kind === 'extrude' ? 'pull' : 'spin';
        // Conditional on purpose: this function is handed one feature and cannot
        // see whether the sketch behind it has corners at all. A circle-sourced
        // pull has none, so an unconditional "go round its corners" would be the
        // same false remedy again, one level up.
        return `Rounding works on a shape you build with a tool like Box or Cylinder, not one ${past} from a sketch. If its sketch has corners, use Round a corner in the Rules panel before you ${bare} it.`;
    }
    if (f.kind === 'sphere' || f.kind === 'torus') {
        return 'That shape has no edges to round — it is curved all the way round.';
    }
    if (f.kind === 'cone') {
        return 'Rounding a cone is not supported yet.';
    }
    // These four fell through to the null below until this pass: isRoundable()
    // was already the real gate (only a box or cylinder has a round/roundStyle
    // field to write), but nothing here said so first -- so the Round button
    // lit up as available, the click landed on the silent `if (!isRoundable(f))
    // return;` guard in ModelEditor's round(), and nothing happened. No error,
    // no model change, no explanation. Same defect species as a control that
    // produces a result nobody asked for: a control that claims to work and
    // silently doesn't is just the other side of that coin.
    if (f.kind === 'hole') {
        return 'Rounding works on the shape, not the hole cut into it. Round the shape before you drill it.';
    }
    if (f.kind === 'shell') {
        return 'Rounding works on a shape, not a hollowed-out one. A hollow shape rounds its edges one at a time: pick an edge and round that.';
    }
    if (f.kind === 'mirror') {
        return 'Rounding works on the original shape, not a mirrored copy. Round it before you mirror it.';
    }
    if (f.kind === 'pattern') {
        return 'Rounding works on the original shape, not a repeated copy. Round it before you repeat it.';
    }
    if (f.kind === 'move') {
        // This refuses the WHOLE-SHAPE round only -- round/roundStyle are fields
        // a box or cylinder itself carries, and a Move has neither. It used to
        // say (in effect) that a moved shape cannot be rounded at all, which
        // stopped being true the day Move started recording its transform as a
        // real, resolvable operation (see the long comment on the 'move' branch
        // in lib/occt-build.ts): a single named edge of a moved shape resolves
        // and builds correctly now, via nameEdgeOnCurrentShape() in
        // lib/topo-resolve.ts. ModelEditor's round() tries exactly that path
        // FIRST and this message is only ever shown once it has already failed
        // -- nothing was picked, or the pick did not resolve -- so the real
        // remedy is named here too, not just the old one.
        //
        // Copy leaves the original standing right there in the list -- telling a
        // student to round "before you move it" when nothing moved (the row even
        // says "(copy)") points them at a step that already happened to a shape
        // that is still available to round directly.
        return f.copy
            ? 'Rounding the whole shape works on the original, not a copy made by Move — round the original before you copy it, or click one edge of this copy in the viewport to round just that edge.'
            : 'Rounding the whole shape works on the original, not a moved copy — round it before you move it, or click one edge of this shape in the viewport to round just that edge.';
    }
    return null;
}
/**
 * Why Repeat Around would do nothing visible, or null when it would work.
 *
 * A circular pattern orbits a world axis. A shape whose middle sits ON that
 * axis has no radius to sweep, so every copy lands exactly on the original
 * and the union is the shape you started with -- a control that reports
 * success and changes nothing. Refusing up front is better than a feature row
 * that claims six copies exist.
 *
 * Only answerable for a plain primitive, whose centre this file knows. A
 * derived feature's position lives in the generated geometry, not the doc, so
 * this returns null and lets it through rather than guessing.
 */
export function whyCannotOrbit(f, axis) {
    if (!isShape(f))
        return null;
    const [x, y, z] = f.center;
    const offAxis = axis === 'x' ? Math.hypot(y, z)
        : axis === 'y' ? Math.hypot(x, z)
            : Math.hypot(x, y);
    if (offAxis > 0.01)
        return null;
    return 'Repeat Around spins copies about the middle of the world, so a shape sitting in the middle has nothing to spin around — every copy would land on top of the first. Move it away from the middle first.';
}
/** A sphere looks identical however it is turned, so offering the control
 *  would only teach that some buttons do nothing. */
export function canRotate(f) {
    return f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'cone' || f.kind === 'torus';
}
/** Largest round that still leaves a shape. Past this JSCAD throws. */
export function maxRound(f) {
    const smallest = f.kind === 'box'
        ? Math.min(f.size[0], f.size[1], f.size[2])
        : Math.min(f.radius * 2, f.height);
    return Math.max(0, smallest / 2 - 0.01);
}
/** Ids are short because they become variable names in the generated code. */
export function nextId(doc, prefix) {
    const taken = new Set(doc.features.map((f) => f.id));
    for (let n = 1;; n++) {
        const id = `${prefix}${n}`;
        if (!taken.has(id))
            return id;
    }
}
/**
 * A born-axis-aligned rectangle's four edges, alternating horizontal and
 * vertical -- which is what KEEPS it a rectangle. Without this, typing a
 * Length on one edge had nothing holding the other three square to it: the
 * solver satisfied the new length by whatever arrangement was cheapest, and
 * setting edge0=40 then edge1=20 measurably left edge2 and edge3 at 40.1 and
 * 24.9, not 40 and 20 (2026-09-03). Two length rules plus these four is
 * exactly a rectangle's four degrees of freedom (width, height, position),
 * with nothing left for the solver to trade away.
 */
export const RECTANGLE_CONSTRAINTS = [
    { kind: 'horizontal', edge: 0 },
    { kind: 'vertical', edge: 1 },
    { kind: 'horizontal', edge: 2 },
    { kind: 'vertical', edge: 3 },
];
/** A rectangle to start from. An empty canvas with no corners gives a student
 *  nothing to grab, and every real sketch begins by editing a shape anyway. */
export function newSketch(doc, plane = 'xy') {
    return {
        id: nextId(doc, 'sk'),
        kind: 'sketch',
        plane,
        offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: RECTANGLE_CONSTRAINTS.slice(),
    };
}
/**
 * Sketch on a picked planar FACE: the sketch-on-a-face form. `frame` is the
 * face's own world frame (origin on the face, u/v spanning it), so the same
 * rectangle a named-plane sketch starts from lands flat on that face.
 *
 * `plane` is set to 'xy' purely as a required-field placeholder -- `sketchFrameOf`
 * reads `frame` first and IGNORES `plane`/`offset` for a framed sketch, and
 * every consumer goes through that resolver. Storing a named plane here would
 * be a second source of truth that could drift.
 */
export function newSketchOnFace(doc, frame, points = [[0, 0], [40, 0], [40, 25], [0, 25]]) {
    return {
        id: nextId(doc, 'sk'),
        kind: 'sketch',
        plane: 'xy',
        offset: 0,
        frame,
        points: points.map((p) => [p[0], p[1]]),
        constraints: RECTANGLE_CONSTRAINTS.slice(),
    };
}
/** A circle, drawn as the two ends of a diameter -- see SketchFeature.shape.
 *  Not a rectangle-with-round-corners and not four points: the tag is the
 *  only thing that makes it a circle, so the data says so directly.
 *
 *  `centre` defaults to the origin -- a beginner asked for "a circle at the
 *  rectangle's centre" had no better move than typing the numbers out by
 *  hand, so the tool call site (ModelEditor.tsx) works out where the
 *  selected sketch actually sits and passes that in. Measured 2026-09-04. */
export function newCircleSketch(doc, plane = 'xy', centre = [0, 0]) {
    return {
        id: nextId(doc, 'sk'),
        kind: 'sketch',
        plane,
        offset: 0,
        points: [[centre[0] - 10, centre[1]], [centre[0] + 10, centre[1]]],
        shape: 'circle',
    };
}
/** The plain bounding-box centre of a sketch's DESIGN corners -- not an
 *  area-weighted centroid (lib/sketch-outline.ts's centroidOf is that, and
 *  stays private to the label-placement math it exists for). A pure
 *  function so a tool call site can ask "where does this sketch sit" without
 *  reaching into the outline/label machinery for an answer this simple.
 *  Empty input reads as the origin -- there is nothing to centre on. */
export function sketchBBoxCentre(points) {
    if (points.length === 0)
        return [0, 0];
    let loU = points[0][0], hiU = points[0][0];
    let loV = points[0][1], hiV = points[0][1];
    for (const [u, v] of points) {
        if (u < loU)
            loU = u;
        else if (u > hiU)
            hiU = u;
        if (v < loV)
            loV = v;
        else if (v > hiV)
            hiV = v;
    }
    return [(loU + hiU) / 2, (loV + hiV) / 2];
}
/**
 * A rectangle from two clicked corners, in plane coordinates. Returns null
 * for a degenerate click pair (either side under 1 unit) rather than
 * creating a sliver -- the caller should treat null as "not a valid second
 * point yet", not as an error to surface.
 */
export function newRectangleSketch(doc, plane, p1, p2) {
    const w = Math.abs(p2[0] - p1[0]);
    const h = Math.abs(p2[1] - p1[1]);
    if (w < 1 || h < 1)
        return null;
    const loU = Math.min(p1[0], p2[0]), hiU = Math.max(p1[0], p2[0]);
    const loV = Math.min(p1[1], p2[1]), hiV = Math.max(p1[1], p2[1]);
    return {
        id: nextId(doc, 'sk'),
        kind: 'sketch',
        plane,
        offset: 0,
        points: [[loU, loV], [hiU, loV], [hiU, hiV], [loU, hiV]],
        constraints: RECTANGLE_CONSTRAINTS.slice(),
    };
}
/**
 * A regular polygon from a clicked center and one clicked vertex, in plane
 * coordinates. The vertex point becomes an actual corner (angle = atan2 of
 * the click relative to center), not just a radius reference. Returns null
 * for a degenerate click (center and vertex under 1 unit apart).
 */
export function newPolygonSketch(doc, plane, center, vertex, sides = 6) {
    const dx = vertex[0] - center[0];
    const dy = vertex[1] - center[1];
    const radius = Math.hypot(dx, dy);
    if (radius < 1)
        return null;
    const startAngle = Math.atan2(dy, dx);
    const points = [];
    for (let i = 0; i < sides; i++) {
        const a = startAngle + (i / sides) * Math.PI * 2;
        points.push([center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)]);
    }
    return { id: nextId(doc, 'sk'), kind: 'sketch', plane, offset: 0, points };
}
export function newExtrude(doc, target) {
    return { id: nextId(doc, 'pull'), kind: 'extrude', target, height: 12 };
}
export function newRevolve(doc, target) {
    return { id: nextId(doc, 'rev'), kind: 'revolve', target, angle: 360 };
}
/** The groove twin of newRevolve: same profile contract, but the swept ring
 *  is cut from `into` rather than standing alone. `into` is required for the
 *  same reason mirror's plane is — a groove with nothing to cut is not a
 *  feature, it is a revolve someone forgot to aim. */
export function newGroove(doc, target, into) {
    return { id: nextId(doc, 'groove'), kind: 'groove', target, into, angle: 360 };
}
/** The pocket twin of newExtrude: same profile contract, but the pulled block
 *  is cut out of a named solid instead of standing on its own. `into` is
 *  required for the same reason groove's is — a pocket with nothing to cut is
 *  not a pocket. */
export function newPocket(doc, target, into) {
    return { id: nextId(doc, 'pocket'), kind: 'pocket', target, into, depth: 5 };
}
// No default plane -- Onshape makes the mirror plane a required field and
// refuses to complete the feature without one, precisely because there is no
// plane that is silently "probably right." A caller that has not asked the
// student which way to flip has no business creating this feature yet.
/**
 * Why these two features cannot be blended, in a sentence, or null when they
 * can. Every refusal names what to do about it -- a blend that silently did
 * nothing, or quietly picked one of two disagreeing planes, is worse than one
 * that says why it will not.
 */
export function whyCannotBlend(a, b) {
    if (a.kind !== 'sketch' || b.kind !== 'sketch') {
        return "Blend joins two flat outlines. Pick two sketches -- a solid has no outline to skin from.";
    }
    if (a.plane !== b.plane) {
        return "Those two sketches sit on different planes, so there is no single direction to blend along. Put both on the same one first.";
    }
    if (a.offset === b.offset) {
        return "Both sketches sit at the same offset, so there is no gap to fill. Slide one of them along its plane first.";
    }
    // A circle has no corners by design (see SketchFeature.shape) and is a
    // real closed outline anyway -- sketchWire() in lib/occt-build.ts skins
    // it the same as any polygon. Only an open or single-point sketch (fewer
    // than 3 points and NOT tagged 'circle') is the genuine refusal case.
    if ((a.shape !== 'circle' && a.points.length < 3) || (b.shape !== 'circle' && b.points.length < 3)) {
        return "A blend needs two real outlines, and one of these has fewer than three corners.";
    }
    return null;
}
/** Bottom-first: the sketch with the smaller offset leads, so the generated
 *  gap is always positive and the solid always starts at the lower one. */
export function newBlend(doc, a, b) {
    const [lo, hi] = a.offset <= b.offset ? [a, b] : [b, a];
    return { id: nextId(doc, 'bl'), kind: 'blend', targets: [lo.id, hi.id] };
}
export function newMirror(doc, target, plane) {
    return { id: nextId(doc, 'mir'), kind: 'mirror', target, plane };
}
/**
 * How far the named feature's solid reaches along one world axis, when that
 * can be read straight off a primitive. Follows `target` links (hole, shell,
 * fillet, move, pattern, mirror ... anything with a `target: string`) back
 * to the primitive they were built from, at most 16 hops. Returns null when
 * the root is not a plain box/cylinder or the primitive is rotated -- callers fall
 * back to a flat default then. This is a DEFAULT-PICKING helper, not
 * geometry: a pattern or mirror does change the true extent and this
 * deliberately ignores that.
 */
export function extentAlong(doc, featureId, axis) {
    let id = featureId;
    for (let hop = 0; hop < 16 && id; hop++) {
        const f = doc.features.find(feat => feat.id === id);
        if (!f)
            return null;
        if (f.kind === 'box') {
            if (f.rotate && f.rotate.some(v => v !== 0))
                return null;
            return axis === 'x' ? f.size[0] : axis === 'y' ? f.size[1] : f.size[2];
        }
        if (f.kind === 'cylinder') {
            if (f.rotate && f.rotate.some(v => v !== 0))
                return null;
            return axis === 'z' ? f.height : f.radius * 2;
        }
        id = 'target' in f ? f.target : undefined;
    }
    return null;
}
export function newPattern(doc, target, mode = 'linear') {
    const id = nextId(doc, 'pat');
    if (mode === 'linear') {
        const extent = extentAlong(doc, target, 'x');
        const step = extent != null ? [Math.ceil(extent * 1.5), 0, 0] : [30, 0, 0];
        return { id, kind: 'pattern', target, mode, count: 3, step };
    }
    return { id, kind: 'pattern', target, mode, count: 6, axis: 'z', totalAngle: 360 };
}
/** center: [0, 0, 0] is not world zero -- see HoleFeature.center. It is "no
 *  offset," so the kernel (lib/occt-build.ts) reads it against the TARGET's
 *  own bounding-box centre at build time, wherever the target actually
 *  sits. A doc-level default has no target geometry to ask, which is
 *  exactly why the interpretation lives at build time and not here. */
export function newHole(doc, target) {
    const extent = extentAlong(doc, target, 'z');
    const depth = extent != null ? extent + 2 : 10;
    return {
        id: nextId(doc, 'hole'), kind: 'hole', target,
        diameter: 6, depth, center: [0, 0, 0], axis: 'z',
    };
}
/** Same hole, drilled at all four corners of a rectangle at once -- see
 *  HoleFeature.corners. The starting spacing is a guess the Dimensions panel
 *  makes exact; only ever offered while boring straight down, which is the
 *  bolt-pattern case this exists for. */
export function newHoleCorners(doc, target) {
    const extent = extentAlong(doc, target, 'z');
    const depth = extent != null ? extent + 2 : 10;
    return {
        id: nextId(doc, 'hole'), kind: 'hole', target,
        diameter: 6, depth, center: [0, 0, 0], axis: 'z',
        corners: { dx: 15, dy: 10 },
    };
}
export function newShell(doc, target, open) {
    const f = { id: nextId(doc, 'shell'), kind: 'shell', target, thickness: 2 };
    if (open)
        f.open = open;
    return f;
}
/**
 * Where a new Hollow (Shell) feature actually belongs, given the feature the
 * student picked to hollow.
 *
 * A Shell is an INWARD OFFSET cut from its own target's shape. If a Hole or a
 * Round already sits anywhere between the picked feature and the primitive
 * it descends from, hollowing the shape AS IT CURRENTLY LOOKS is exactly the
 * case occt-build.ts's own 'shell' branch refuses -- "this kernel cannot
 * hollow a shape that already has a hole or a round" is a real numerical
 * limit of the offset-then-cut it runs, not a data-model rule this file
 * enforces. But which shape gets shelled is a MODELLING CHOICE, not a fact
 * about the geometry: shelling the ORIGINAL primitive, before that hole or
 * round ever cut it, produces exactly the part a student meant (a hollowed
 * box that still has its hole and its round) and hits none of that limit,
 * because it never touches a hole-or-rounded shape at all.
 *
 * Walks the picked feature's `target` chain back to its root (a primitive,
 * or anything with no `target` field), and returns:
 *  - `target`: what the new Shell should actually target -- the picked
 *    feature itself when nothing in its ancestry is a hole or a round, or
 *    the first ancestor found BEFORE the first hole/round otherwise.
 *  - `insertAt`: the array index to splice the new feature in at -- the
 *    end of the document in the ordinary case, or immediately after
 *    `target`'s own position when reordering.
 *  - `rewireId`: null in the ordinary case, or the id of the first
 *    hole/round in the chain -- the caller must repoint THAT feature's own
 *    `target` at the new Shell's id once it exists, so the rest of the chain
 *    (everything already built from it) keeps building on top of the shell
 *    instead of on the bare primitive.
 *
 * A combine's plural `targets` is not walked -- this only ever needs to
 * cross the single-`target` chain a Hole/Fillet/Extrude/Revolve/Shell/Move
 * already forms, and a Combine sitting in that ancestry is treated as a root
 * (a reasonable stopping point, not a claim that nothing beyond it matters).
 *
 * THE FORWARD CASE, added after the backward-only version shipped a real
 * double-body bug: a face pick resolves to whichever feature OWNS that
 * face (see ownerOf()/nameFaceOnCurrentShape()), which can be an upstream
 * ROOT even after later features built on top of it -- a Hole, a Round on
 * some other edge, neither of which touched the picked face at all. Picking
 * a box's own top face after Box -> Hole -> Round used to pass the box's
 * own id as `pickedId` with NOTHING in its backward ancestry (a primitive
 * has no `target`), so this returned "append at the end, no reorder" --
 * and the Hollow that got appended targeted the box DIRECTLY, leaving Hole
 * and Round dangling off the ORIGINAL box in their own untouched branch.
 * `topLevel()` then had two unconsumed leaves (the Hole/Round chain's own
 * tip, and the new Hollow) and rendered BOTH, overlapping, as if the model
 * had silently forked in two. Checked as a single direct hop, not a further
 * walk down the whole downstream chain: reordering past anything ELSE
 * requires rewiring THAT feature's own `target`, and rewiring a feature
 * that is not itself the blocker would silently drop whatever it does (a
 * Move in between, say) -- so this only ever reorders past a blocker that
 * targets the picked feature directly, the same one-hop case the backward
 * walk above already only ever rewires.
 */
export function shellInsertion(doc, pickedId) {
    const chain = [];
    let cur = doc.features.find((f) => f.id === pickedId);
    while (cur) {
        chain.unshift(cur);
        const t = 'target' in cur ? cur.target : undefined;
        cur = t ? doc.features.find((f) => f.id === t) : undefined;
    }
    const blockerIndex = chain.findIndex((f) => f.kind === 'hole' || f.kind === 'fillet');
    if (blockerIndex > 0) {
        const root = chain[blockerIndex - 1];
        const blocker = chain[blockerIndex];
        const insertAt = doc.features.findIndex((f) => f.id === root.id) + 1;
        return { target: root.id, insertAt, rewireId: blocker.id };
    }
    const direct = doc.features.find((f) => 'target' in f && f.target === pickedId);
    if (direct && (direct.kind === 'hole' || direct.kind === 'fillet')) {
        const insertAt = doc.features.findIndex((f) => f.id === pickedId) + 1;
        return { target: pickedId, insertAt, rewireId: direct.id };
    }
    return { target: pickedId, insertAt: doc.features.length, rewireId: null };
}
export function newMove(doc, target, copy = false) {
    return { id: nextId(doc, 'move'), kind: 'move', target, offset: [20, 0, 0], copy };
}
/** Insert a corner halfway along the edge after `index`, which is where a
 *  student expects a new one to land when they ask for it. A circle sketch
 *  is refused as a no-op: its two points are diameter ends, read that way
 *  ONLY because shape === 'circle' says so (see SketchFeature.shape), and
 *  splicing a third point in would leave that tag pointing at a pair of
 *  points that are no longer the diameter (Finding 3, sketch gauntlet round
 *  2). ModelEditor.tsx's corner() already refuses before calling this, with
 *  a message the student sees -- this is the belt under that belt. */
export function addCorner(f, index) {
    if (f.shape === 'circle')
        return f;
    // The geometry lives in splitEdge() (lib/sketch-arc.ts), because on an
    // edge that is already a rounded corner's arc, "halfway along" is a point
    // on the CURVE and the arc has to be divided into two arcs that retrace
    // it. Doing it here with a chord midpoint and a shifted bulge key -- which
    // is what this used to do -- halved that arc's radius silently. Constraint
    // and bulge reindexing past the seam comes along with it.
    return splitEdge(f, index);
}
/** Half-extent a freshly created shape of this kind would have along world X,
 *  matching the literal size/radius defaults newShape() assigns below. Used
 *  only to decide where the NEW shape should sit -- see newShape()'s comment. */
function newHalfWidthX(kind) {
    if (kind === 'box')
        return 20; // size: [40, ...] -> half is 20
    if (kind === 'cylinder')
        return 10; // radius: 10
    if (kind === 'cone')
        return 12; // radius: 12
    if (kind === 'torus')
        return 18; // ringRadius 14 + tubeRadius 4
    if (kind === 'prism')
        return 10; // circumradius 10
    if (kind === 'wedge')
        return 15; // width 30 -> half is 15
    return 15; // sphere radius: 15
}
/** How far an existing primitive's own edge already reaches along +x --
 *  center[0] + its own half-width or radius, unrotated (same fallback stance
 *  as extentAlong() above: this is a DEFAULT-PICKING helper, not real
 *  geometry, so a rotated shape is read as if it were not). null for
 *  anything that is not a plain primitive -- a combine, hole or shell has no
 *  size of its own to read here; the primitive underneath it already counts. */
function shapeRightEdgeX(f) {
    if (f.kind === 'box')
        return f.center[0] + f.size[0] / 2;
    if (f.kind === 'cylinder' || f.kind === 'cone')
        return f.center[0] + f.radius;
    if (f.kind === 'sphere')
        return f.center[0] + f.radius;
    if (f.kind === 'torus')
        return f.center[0] + f.ringRadius + f.tubeRadius;
    if (f.kind === 'prism')
        return f.center[0] + f.radius;
    if (f.kind === 'wedge')
        return f.center[0] + f.width / 2;
    return null;
}
/**
 * A second shape used to land exactly on top of the first -- every primitive
 * is born at world zero, so a student's second box was invisible, hidden
 * inside the first, with no clue anything but the x field would ever explain
 * why (a moderate-lens student found this only by discovering that field).
 *
 * The first shape in an empty doc still gets [0, 0, 0] -- there is nothing to
 * clear yet, and 0 is the friendliest place to start building. Every shape
 * after that is placed just past the rightmost edge of whatever primitives
 * already exist, with a 10-unit gap so the two are visibly separate rather
 * than touching.
 */
export function newShape(doc, kind) {
    const edges = doc.features
        .map(shapeRightEdgeX)
        .filter((x) => x !== null);
    const cx = edges.length === 0 ? 0 : Math.max(...edges) + newHalfWidthX(kind) + 10;
    if (kind === 'box') {
        return { id: nextId(doc, 'box'), kind, size: [40, 40, 20], center: [cx, 0, 0] };
    }
    if (kind === 'cylinder') {
        return { id: nextId(doc, 'cyl'), kind, radius: 10, height: 40, center: [cx, 0, 0] };
    }
    if (kind === 'cone') {
        return { id: nextId(doc, 'cone'), kind, radius: 12, height: 30, center: [cx, 0, 0] };
    }
    if (kind === 'torus') {
        return { id: nextId(doc, 'ring'), kind, ringRadius: 14, tubeRadius: 4, center: [cx, 0, 0] };
    }
    if (kind === 'prism') {
        return { id: nextId(doc, 'prism'), kind, sides: 6, radius: 10, height: 30, center: [cx, 0, 0] };
    }
    if (kind === 'wedge') {
        return { id: nextId(doc, 'wedge'), kind, width: 30, depth: 20, height: 25, center: [cx, 0, 0] };
    }
    return { id: nextId(doc, 'ball'), kind, radius: 15, center: [cx, 0, 0] };
}
function labelOf(f) {
    if (f.kind === 'combine') {
        return f.op === 'union' ? 'Join' : f.op === 'subtract' ? 'Cut' : 'Overlap';
    }
    return f.kind === 'sketch' ? 'Sketch'
        : f.kind === 'extrude' ? 'Pull'
            : f.kind === 'revolve' ? 'Spin'
                : f.kind === 'mirror' ? 'Mirror'
                    // Match the toolbar's own two labels (ModelEditor.tsx's patternLabel) --
                    // this used to collapse both modes to plain "Repeat", so a circular
                    // Repeat Around step showed up in the timeline as "Repeat 1", the same
                    // name a linear Repeat would get.
                    : f.kind === 'pattern' ? (f.mode === 'circular' ? 'Repeat Around' : 'Repeat')
                        : f.kind === 'hole' ? 'Hole'
                            : f.kind === 'shell' ? 'Hollow'
                                // Match the toolbar's own two labels (ModelEditor.tsx's moveLabel) --
                                // this used to always say "Move", so a Copy step showed up in the
                                // timeline as "Move 2" with nothing marking it as a copy.
                                : f.kind === 'move' ? (f.copy ? 'Copy' : 'Move')
                                    : f.kind === 'box' ? 'Box'
                                        : f.kind === 'cylinder' ? 'Cylinder'
                                            : f.kind === 'cone' ? 'Cone'
                                                : f.kind === 'torus' ? 'Ring'
                                                    : f.kind === 'prism' ? 'Prism'
                                                        : f.kind === 'wedge' ? 'Wedge'
                                                            : f.kind === 'groove' ? 'Groove'
                                                                : f.kind === 'pocket' ? 'Pocket'
                                                                    : f.kind === 'blend' ? 'Blend'
                                                                        : f.kind === 'sphere' ? 'Sphere'
                                                                            // Decision: reference.md and studentWord() (lib/model-check.ts) both
                                                                            // call this "bevel", and the toolbar's own button (ModelEditor.tsx's
                                                                            // roundLabel) now says "Bevel" too -- one word for the tool everywhere
                                                                            // a student meets it, not the three-way split ("Angled Corner" on the
                                                                            // button, "bevel" in messages and the reference) this used to be.
                                                                            : f.kind === 'fillet' ? (f.style === 'chamfer' ? 'Bevel' : 'Round')
                                                                                : f.kind === 'draft' ? (f.whole ? 'Body draft' : 'Draft')
                                                                                    : nameless(f);
}
/**
 * Every Feature kind must be named above. This takes `never`, so adding a
 * kind and forgetting its label is a COMPILE error.
 *
 * It exists because the chain used to end in a bare `: 'Sphere'`, which is a
 * fallback that looks like an answer. The first blend built correctly, showed
 * up in the timeline, and called itself "Sphere 1" -- caught in a screenshot,
 * by eye, because nothing anywhere could have failed. Returning the raw kind
 * at runtime is the honest version of not knowing.
 */
function nameless(f) {
    return f.kind;
}
/** The numeric suffix nextId() stamped into an id at creation time (`box1` ->
 *  1). Two features of the same kind never share this number while both are
 *  alive, and -- unlike array position -- it does not change when the
 *  feature list is reordered, so it is a stable proxy for "which one was
 *  built first" even after the student drags rows around. */
function creationOrder(id) {
    const digits = /\d+$/.exec(id);
    return digits ? parseInt(digits[0], 10) : 0;
}
/**
 * Display names, counted per kind.
 *
 * Numbering by list position made the first cylinder "Cylinder 2" whenever a
 * box preceded it (fixed by grouping per label), and separately renamed
 * every same-kind feature whenever the list was reordered, because the
 * count was re-derived from current array order on every render. Sorting
 * each label's group by creationOrder(id) before numbering fixes both: the
 * order fed to the counter no longer depends on where the row currently
 * sits, only on when it was built.
 */
export function nameMap(doc) {
    const byLabel = new Map();
    for (const f of doc.features) {
        const label = labelOf(f);
        const group = byLabel.get(label);
        if (group)
            group.push(f);
        else
            byLabel.set(label, [f]);
    }
    const out = {};
    for (const [label, group] of byLabel) {
        const ordered = [...group].sort((a, b) => creationOrder(a.id) - creationOrder(b.id));
        ordered.forEach((f, i) => {
            out[f.id] = f.name ?? `${label} ${i + 1}`;
        });
    }
    return out;
}
export function defaultName(f, doc) {
    return nameMap(doc)[f.id] ?? labelOf(f);
}
/** Features nothing else consumes — what the model actually shows. */
export function topLevel(doc) {
    const consumed = new Set();
    for (const f of doc.features) {
        if (f.kind === 'combine')
            f.targets.forEach((t) => consumed.add(t));
        if (f.kind === 'extrude')
            consumed.add(f.target);
        if (f.kind === 'revolve')
            consumed.add(f.target);
        if (f.kind === 'pattern')
            consumed.add(f.target);
        if (f.kind === 'hole')
            consumed.add(f.target);
        if (f.kind === 'shell')
            consumed.add(f.target);
        if (f.kind === 'move' && !f.copy)
            consumed.add(f.target);
        // A rounded body REPLACES the one it was made from. Leaving both top level
        // would draw the sharp-edged original inside the rounded one, which reads
        // as the round having done nothing.
        if (f.kind === 'fillet')
            consumed.add(f.target);
        if (f.kind === 'draft')
            consumed.add(f.target);
        if (f.kind === 'pocket')
            consumed.add(f.into);
        // A mirror's target is deliberately never consumed here — see
        // MirrorFeature's doc comment. The source stays visible and the mirrored
        // copy is a second, independent top-level shape.
    }
    // A bare sketch is never returned. It is a flat outline, not a solid, and
    // handing one to the renderer draws nothing -- the outline is drawn as an
    // overlay instead, so an un-extruded sketch is still visible while being
    // honestly absent from the model.
    return doc.features.filter((f) => !consumed.has(f.id) && f.kind !== 'sketch');
}
//# sourceMappingURL=model-types.js.map