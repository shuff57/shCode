// Stable names for faces and edges, so a student's selection survives a rebuild.
//
// THE PROBLEM. A B-rep kernel gives you ADDRESSABLE faces. It does not give you
// PERSISTENT ones. Change an upstream dimension, the kernel rebuilds, and you
// get a fresh shape whose faces are in a fresh order. "Face 3" is not
// necessarily the face the student clicked. Every parametric CAD system has to
// solve this and it is the one FreeCAD lived with as its most notorious defect
// for over a decade. Adopting a kernel is the easy half; this file is the hard
// half.
//
// THE IDEA. A name is not a position in the result. It is a path through the
// history that PRODUCED the result. shCode has an unusual advantage here:
// ModelDoc is already an ordered list of features with stable string ids, which
// is exactly the substrate a naming scheme needs and what most CAD systems have
// to retrofit. Every face in the final solid has a first cause somewhere in
// that list, and the name is that cause written down.
//
//   e1.side[sk1.edge0]     the side face extrude e1 swept from sketch edge 0
//   e1.cap[top]            the face capping the top of that extrude
//   b1.face[+z]            the top face of box b1
//   op1.split[b1.face[+z], near(12.5,4)]
//                          a piece of that box face, cut into several by op1
//
// Read the last one carefully, because it is where the difficulty actually
// lives. A boolean does not merely keep or drop faces: it SPLITS them. One face
// goes in and three come out, and which of the three the student meant cannot
// be answered by the history alone -- the history says "all three came from
// b1.face[+z]". Something has to distinguish them.
//
// WHAT DISTINGUISHES A SPLIT PIECE. Not an ordinal. `split[..., 0]` is exactly
// the index-based naming this file exists to avoid: change an upstream number,
// the pieces come back in a different order, and the fillet jumps to a
// different piece of the same face. Instead a piece carries a geometric
// discriminator -- a point known to lie on it -- expressed in the PARENT
// face's own parameter space so it moves with the parent rather than with the
// world. On a rebuild the pieces are re-derived and the one containing that
// point wins.
//
// That is a heuristic and it is worth being honest about its failure mode: if
// a change is large enough that no piece contains the old point, the name does
// not resolve. That is a real limit, and the answer to it is not to guess. See
// the note on unresolvable names at the bottom.
//
// WHAT THIS FILE IS NOT. There is no kernel here. This is the algebra of names
// -- their shape, how they are written down, how they are read back, and what
// each feature kind is entitled to name. Resolution against real geometry is
// the next piece and it needs OpenCascade's Modified/Generated history maps.
// Keeping the two apart means the naming rules can be tested against
// arithmetic, the way lib/least-squares.ts is, rather than only against a
// running kernel.
const r4 = (n) => Math.round(n * 1e4) / 1e4;
/** Write a name as text: stable, comparable, and readable in a message to a
 *  student. Two rebuilds of the same model must produce the same string, which
 *  is why the discriminator is rounded rather than raw. */
export function formatName(n) {
    const at = (p) => `near(${r4(p.u)},${r4(p.v)})`;
    switch (n.cause) {
        case 'primitive': return `${n.feature}.${n.kind}[${n.part}]`;
        case 'swept': return `${n.feature}.${n.kind}[${n.from}.edge${n.edge}]`;
        case 'rounded': return `${n.feature}.${n.kind}[${n.from}.corner${n.corner}]`;
        case 'cap': return `${n.feature}.cap[${n.end}]`;
        case 'carried': return `${n.feature}.same[${formatName(n.of)}]`;
        case 'split': {
            // `side` is appended only when present, so a name written before this
            // field existed formats exactly as it always did -- see the field's
            // own doc comment for why an absent side falls back rather than
            // regressing.
            const side = n.side ? `, ${n.side.dir}(${n.side.axis})` : '';
            return `${n.feature}.split[${formatName(n.of)}, ${at(n.at)}${side}]`;
        }
        case 'made': return `${n.feature}.made[${n.kind}, ${at(n.at)}]`;
        case 'between': {
            // Sorted, not written in the order the caller happened to pick the two
            // faces. An unordered pair with an ordered spelling is two names for one
            // edge, and the whole point of a name is that it compares.
            const pair = [formatName(n.of[0]), formatName(n.of[1])].sort();
            return `${n.feature}.edge[${pair[0]} ^ ${pair[1]}]`;
        }
    }
}
/** Human words for a PRIMITIVE face's own `part` -- "top"/"bottom" for a
 *  box or cylinder's +z/-z (matching the Top/Underneath view-strip preset
 *  words), "side" for a cylinder's own wraparound face. +x/-x/+y/-y are
 *  deliberately absent: which way is "front" or "left" depends on which way
 *  the camera happens to be facing, and this app already refuses to guess
 *  that anywhere else (see `partWordFor`'s own comment) -- printing the
 *  literal part name is the honest fallback, not a gap to fill in later. */
const PRIMITIVE_PART_WORDS = { '+z': 'top', '-z': 'bottom', side: 'side' };
/**
 * The single word (or two) a student-facing sentence uses for WHICH part of
 * a feature a name points at -- "top face", "edge" -- or null when the name
 * does not resolve to anything with its own part word.
 *
 * This is the ONE place that decision is made. SandboxWorkspace.tsx's
 * selection badge ("Box 1 · top face") and ModelEditor.tsx's Hollow note
 * ("Hollow 1 is open at the top face") both call this rather than each
 * carrying their own copy, specifically so the two can never drift apart --
 * measured 2026-09-04 as a real risk the first time this logic existed in
 * exactly one of them.
 *
 * `carried`/`split` are unwrapped first, exactly the way rootFeature() below
 * unwraps them to find which feature a name is rooted in -- a face an
 * operation passed through untouched (a box's own top face, after a Hole
 * drilled into its side and a Round on some other edge) is STILL a
 * primitive face for this purpose, even though its own immediate `.feature`
 * now names whichever operation last carried it forward. Measured
 * 2026-09-04: clicking that exact top face resolved (correctly) to the
 * Round feature as its OWNER (topological naming can only say who most
 * recently touched a face, not who originally made it, for `chosen`/
 * `pickedFaceUsable` purposes) with a `carried` name wrapping a `carried`
 * name wrapping the box's own `primitive` one -- and without this
 * unwrapping, Hollow silently built correctly open at that face (`open`
 * itself was never null) while its own note stayed silent about it, because
 * partWordFor() saw only the outermost `carried` cause and returned null.
 *
 * An edge (`between`) always says "edge", regardless of which two faces it
 * connects -- there is no finer word for an edge the way there is for a
 * face. A primitive face uses PRIMITIVE_PART_WORDS, falling back to the
 * literal part string for +x/-x/+y/-y (see that map's own comment for why
 * those are not guessed at). Anything else -- a hole's own wall, a round's
 * own filleted face, all of which have "no recorded path back to any
 * primitive" and so never carry a `primitive` or `between` cause even once
 * unwrapped -- returns null, the same "no answer is better than a
 * confidently wrong one" rule this file's own header states for names that
 * fail to resolve.
 */
export function partWordFor(n) {
    if (!n)
        return null;
    if (n.cause === 'carried' || n.cause === 'split')
        return partWordFor(n.of);
    if (n.cause === 'between')
        return 'edge';
    if (n.cause === 'primitive' && n.kind === 'face') {
        return `${PRIMITIVE_PART_WORDS[n.part] ?? n.part} face`;
    }
    return null;
}
/** The feature a name ultimately hangs off -- the earliest one in the chain.
 *  This is what a dependency check asks for: delete that feature and every
 *  name rooted in it is gone, which is a thing to say out loud rather than
 *  discover at rebuild time. */
export function rootFeature(n) {
    if (n.cause === 'carried' || n.cause === 'split')
        return rootFeature(n.of);
    // An edge between two faces can in principle root in two different features.
    // The first is reported, and featureChain() below is the honest answer when
    // the caller needs all of them -- a single root is a convenience, not a
    // complete description, and callers deciding what an edit disturbs should be
    // asking for the chain.
    if (n.cause === 'between')
        return rootFeature(n.of[0]);
    return n.feature;
}
/** Every feature id a name passes through, nearest cause first. Used to decide
 *  whether an edit can possibly have disturbed a selection: if none of these
 *  ids changed, the name did not need re-resolving at all. */
export function featureChain(n) {
    const out = [n.feature];
    if (n.cause === 'carried' || n.cause === 'split')
        out.push(...featureChain(n.of));
    if (n.cause === 'between')
        out.push(...featureChain(n.of[0]), ...featureChain(n.of[1]));
    return [...new Set(out)];
}
/**
 * Is this name still meaningful in this document?
 *
 * A structural check only -- it asks whether the features and sketch edges the
 * name refers to still exist, not whether the geometry still has such a face.
 * Cheap, runs without a kernel, and catches the common case: a student removed
 * the sketch corner that a filleted edge was swept from.
 */
export function nameIsStructurallyValid(n, featureExists, sketchEdgeCount) {
    if (!featureExists(n.feature))
        return false;
    if (n.cause === 'swept' || n.cause === 'rounded') {
        // A closed outline has as many design edges as design corners, so one
        // count answers for both.
        const count = sketchEdgeCount(n.from);
        const at = n.cause === 'swept' ? n.edge : n.corner;
        if (count === null || at < 0 || at >= count)
            return false;
    }
    if (n.cause === 'carried' || n.cause === 'split') {
        return nameIsStructurallyValid(n.of, featureExists, sketchEdgeCount);
    }
    if (n.cause === 'between') {
        return n.of.every((f) => nameIsStructurallyValid(f, featureExists, sketchEdgeCount));
    }
    return true;
}
/**
 * Why a name no longer resolves, phrased for a student.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a name that cannot be resolved is
 * never silently dropped and never silently moved to a neighbour. Both are
 * worse than an error, because both look like the model quietly deciding
 * something on the student's behalf -- and a fillet that hops to a different
 * edge when you change an unrelated dimension is exactly the behaviour that
 * makes people distrust parametric CAD.
 *
 * Same contract as whyCannotRoundCorner() and whyRemovingCornerCosts() in
 * lib/sketch-arc.ts: say what was lost, say what caused it, and let the caller
 * decide what to do about it.
 */
export function whyNameLost(n, featureExists, sketchEdgeCount, label) {
    if (!featureExists(n.feature)) {
        return `That ${n.kind} was made by ${label(n.feature)}, which is no longer in the model.`;
    }
    if (n.cause === 'swept' || n.cause === 'rounded') {
        const count = sketchEdgeCount(n.from);
        if (count === null) {
            return `That ${n.kind} was pulled from ${label(n.from)}, which is no longer in the model.`;
        }
        const part = n.cause === 'swept' ? 'edge' : 'corner';
        const at = n.cause === 'swept' ? n.edge : n.corner;
        if (at < 0 || at >= count) {
            return `That ${n.kind} was pulled from ${part} ${at + 1} of ${label(n.from)}, `
                + `which now has only ${count} ${part}${count === 1 ? '' : 's'}.`;
        }
    }
    if (n.cause === 'carried' || n.cause === 'split') {
        return whyNameLost(n.of, featureExists, sketchEdgeCount, label);
    }
    if (n.cause === 'between') {
        // Either face going takes the edge with it, and the first reason found is
        // the one reported -- two reasons for one lost edge is more than a student
        // needs to act.
        for (const f of n.of) {
            const why = whyNameLost(f, featureExists, sketchEdgeCount, label);
            if (why)
                return why;
        }
    }
    return null;
}
//# sourceMappingURL=topo-name.js.map