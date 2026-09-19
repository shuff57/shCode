// Resolves a viewport pick back into the feature whose Dimensions rows should
// show for it. Split out of components/SandboxWorkspace.tsx so the resolution
// itself — not just the wiring around it — is unit-testable without a browser
// (see scripts/test-panel-selection.mjs).
import { rootFeature } from './topo-name.js';
/**
 * The feature id the Dimensions panel should select for a pick.
 *
 * Prefers the pick's resolved name: `rootFeature(name)` is the feature that
 * actually MADE the picked face or edge (a primitive's own face, a hole's own
 * wall, a round's own filleted face — see PickName's own comment), which is
 * what "the feature that owns it" means to a student looking for that
 * feature's numbers. Falls back to `target` — the tip of the chain for that
 * mesh region — only when there is no name to resolve, or the name resolves
 * to a feature the doc no longer has.
 *
 * Returns `null` when NEITHER resolves against the current doc. That "no
 * longer has" case is not hypothetical: a pick event can still be in flight
 * (or a stale `pickedFace`/`pickedEdge` can still be held) the moment an
 * Undo, a rollback, or a structural edit removes the feature it pointed at —
 * the same staleness ModelEditor's own `selected` effect already prunes for
 * (see its "A selection can outlive its feature" comment). Returning `null`
 * here lets a caller leave the CURRENT selection alone instead of pointing it
 * at an id nothing in `doc.features` can produce rows for, which would
 * otherwise read as "This step has no numbers to adjust" for a step that
 * still very much exists.
 */
export function ownerOf(doc, pick) {
    if (!pick)
        return null;
    const exists = (id) => doc.features.some((f) => f.id === id);
    const name = pick.name ?? pick.face ?? pick.edge ?? null;
    if (name) {
        const made = rootFeature(name);
        if (exists(made))
            return made;
    }
    return exists(pick.target) ? pick.target : null;
}
//# sourceMappingURL=model-selection.js.map