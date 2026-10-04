import type { ModelDoc } from '@shuff57/reshape-script/model-types';
import type { TopoName } from '@shuff57/reshape-script/topo-name';
/** Which of a shape's parts -- or which higher-level thing -- a selection
 *  entry names. Only 'feature' (ModelEditor's chip/timeline picks) and
 *  'edge'/'face' (BrepViewportThree's ViewportPick) are ever produced by
 *  any op in this module today; 'vertex' and 'body' are reserved for
 *  SPEC-mouse-parity.md Phase 3 item 2 (vertex/body picking, not yet
 *  built) so that landing them later does not need a breaking type change
 *  here. */
export type SelectionKind = 'feature' | 'edge' | 'face' | 'vertex' | 'body';
/** One selected thing. `target` is the feature id for a 'feature' item, or
 *  the owning mesh-batch feature id (ViewportPick's own `target` /
 *  PickName's own `target`) for an 'edge'/'face' item -- see
 *  model-selection.ts's PickName comment for why that is the TIP of the
 *  feature chain, not necessarily the feature that made the geometry.
 *  `name` is the resolved TopoName (pickedEdge.edge / pickedFace.face /
 *  ViewportPick.name), omitted for a 'feature' item and `null` for a real
 *  edge/face pick that could not be traced to a name. `size` mirrors
 *  ViewportPick.size / the old pickedSize, kernel-measured, present only
 *  when the pick resolved one. */
export interface SelectionItem {
    kind: SelectionKind;
    target: string;
    name?: TopoName | null;
    size?: number | [number, number];
}
/** Selection filters (SPEC-mouse-parity.md Phase 3 item 2 -- not built yet,
 *  no equivalent state exists in ReshapeStudio.tsx today). Carried on
 *  SelectionState so the later filter UI has somewhere to live without a
 *  second piece of lifted state; every op below leaves it untouched except
 *  the constructors, which default it to all-true ("nothing is filtered
 *  out" -- today's actual behaviour, since there is no filter yet). */
export interface SelectionFilters {
    face: boolean;
    edge: boolean;
    vertex: boolean;
    body: boolean;
}
export interface SelectionState {
    items: SelectionItem[];
    primary: SelectionItem | null;
    filters: SelectionFilters;
}
/** A fresh, nothing-selected state: empty items, no primary, and every
 *  filter open. The starting point every other constructor below builds
 *  from. */
export declare function emptySelection(): SelectionState;
/** Clears everything, then selects only `item`. This is pick(id, false)
 *  at ModelEditor.tsx:1122 ("selected = [id]"), generalised from a bare
 *  feature id to any SelectionItem. `filters` survives unchanged -- a
 *  plain click has never reset a filter, since no filter exists yet. */
export declare function replace(state: SelectionState, item: SelectionItem): SelectionState;
/** Removes `item` if present (by structural equality, see sameItem above),
 *  else adds it. This is pick(id, true) at ModelEditor.tsx:1121
 *  ("selected.includes(id) ? filter it out : append it"), generalised the
 *  same way replace() is.
 *
 *  On add, the new item becomes primary -- "the most recent pick" is the
 *  same convention pickedEdge/pickedFace and pickedEdges/pickedFaces
 *  already use ("most recent last", ModelEditor.tsx:172). On remove,
 *  primary becomes the new last-remaining item, or null if none: see this
 *  file's header for why that is a rule this module defines rather than
 *  one pick() already had to make, and where it does not match onPick's
 *  own pickedEdge quirk. */
export declare function toggle(state: SelectionState, item: SelectionItem): SelectionState;
/** Adds `item`, keeping every existing item -- no presence check, unlike
 *  toggle() (a caller that wants "add only if absent" calls toggle() after
 *  checking, the way onPick's own pickedEdges branch only appends after its
 *  own `hit` check already came back false). Primary is left alone unless
 *  `item` is the very first item this state has ever held, in which case it
 *  becomes primary the same way replace()/toggle()'s add branch would. */
export declare function add(state: SelectionState, item: SelectionItem): SelectionState;
/** Empties items and primary, unconditionally. `filters` survives -- the
 *  same "not this axis's concern" reasoning as replace()'s. */
export declare function clear(state: SelectionState): SelectionState;
/** pick(featureId, true) exactly -- the feature-kind convenience wrapper
 *  over toggle() a chip/timeline row's onClick calls
 *  (ModelEditor.tsx:1274, :1724, :1840: `pick(f.id, e.ctrlKey ||
 *  e.metaKey || e.shiftKey)`). */
export declare function toggleFeature(state: SelectionState, featureId: string): SelectionState;
/** Every feature in `doc`, selected -- the Ctrl+A case (SPEC-mouse-parity.md
 *  Phase 3 item 6). No existing state constructs this today (there is no
 *  Ctrl+A yet), so `primary` follows the same "most recent [i.e. last]
 *  wins" convention toggle()'s add branch uses; an empty doc returns
 *  emptySelection() in every field, not a special case. */
export declare function selectAllFeatures(doc: ModelDoc): SelectionState;
/** The current primary, whole. This replaces reading pickedEdge, pickedFace
 *  and pickedSize as three separate variables (ReshapeStudio.tsx:236-246,
 *  read together at :697-702): a caller reconstructs each legacy value by
 *  discriminating on `kind` --
 *    pickedEdge  == primary?.kind === 'edge' ? { target: primary.target, edge: primary.name ?? null } : null
 *    pickedFace  == primary?.kind === 'face' ? { target: primary.target, face: primary.name ?? null } : null
 *    pickedSize  == primary?.size ?? null
 *  -- which is exactly the information one SelectionItem already carries,
 *  so no separate accessor per legacy variable is needed. */
export declare function primaryOf(state: SelectionState): SelectionItem | null;
/** The feature ids currently selected, in item order -- replaces reading
 *  `selected` directly (e.g. the HandleOverlay filter at
 *  ReshapeStudio.tsx:517: `doc.features.filter((f) => selected.includes(f.id))`
 *  becomes `doc.features.filter((f) => featuresOf(state).includes(f.id))`). */
export declare function featuresOf(state: SelectionState): string[];
/** Every edge-kind item, in item order -- SPEC-mouse-parity.md Phase 3 item
 *  3's mixed-selection consumers (round()'s fillet, which uses only these)
 *  read this instead of filtering `state.items` by hand. */
export declare function edgesOf(state: SelectionState): SelectionItem[];
/** Every face-kind item, in item order -- the face-only counterpart of
 *  edgesOf() above (e.g. hollow()'s open face). */
export declare function facesOf(state: SelectionState): SelectionItem[];
/** Every vertex-kind item, in item order. */
export declare function verticesOf(state: SelectionState): SelectionItem[];
/** Every body-kind item, in item order. */
export declare function bodiesOf(state: SelectionState): SelectionItem[];
/** Every item that belongs to `ownerId`, via the real ownerOf() -- replaces
 *  the filtering pattern at ReshapeStudio.tsx:686-687
 *  (`pickedEdges.filter((e) => ownerOf(doc, e) === id)`,
 *  `pickedFaces.filter((f) => ownerOf(doc, f) === id)`). Reuses ownerOf()
 *  itself rather than re-implementing its rootFeature-then-target
 *  fallback, so the two can never drift apart. */
export declare function ownerScoped(state: SelectionState, doc: ModelDoc, ownerId: string): SelectionItem[];
/** SPEC-mouse-parity.md Phase 3 item 3 (mixed selection): fillet only ever
 *  consumes edges -- a face/vertex/body riding along in the same selection
 *  (Ctrl/Shift-picked alongside the edges, same owning solid) is used by
 *  nothing there, so round() must say so rather than silently drop it.
 *
 *  'feature' items are NOT counted: every viewport pick also lists its
 *  owning solid as a feature item (ReshapeStudio's withFeatureIds), so a
 *  plain edge click is always [edge, feature]. That item is bookkeeping for
 *  the timeline highlight, not something the student picked and not
 *  something a fillet "ignores" -- counting it made a plain single-edge
 *  Round say "ignoring 1 feature". Returns null when nothing real is left
 *  over. */
export declare function mixedSelectionNote(scoped: SelectionItem[]): string | null;
//# sourceMappingURL=selection-model.d.ts.map