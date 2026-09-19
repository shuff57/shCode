// packages/kernel/src/engine-adapter.ts
//
// The common seam both kernels answer to. packages/kernel and
// packages/engine deliberately do not depend on each other (see
// docs/specs/SPEC-engine-port.md §2.1 -- the FreeCAD bridge knows nothing
// about ModelDoc, and this package's OCCT code knows nothing about FreeCAD
// sessions), so this interface lives wherever BOTH the consumer
// (BrepViewportThree.tsx) and both implementations already import from --
// packages/kernel, since BrepViewportThree.tsx already depends on it for
// occt-build/occt-three/topo-resolve.
//
// Pinned by grepping BrepViewportThree.tsx (as it stood before this port)
// for every direct call into kernel.oc / facesOf / resolveName /
// resolveNameAsUsedBy / nameFaceOnCurrentShape / nameEdgeOnCurrentShape /
// tessellateToThree / edgesToThree, then reading each call site rather than
// trusting the grep list alone -- two things the list names turned out NOT
// to be called directly by the component, and one call's actual direction
// was the opposite of what its name suggests:
//
//   - resolveNameAsUsedBy is never called BY the component -- it's called
//     internally by nameFaceOnCurrentShape() (topo-resolve.ts), which the
//     component does call. So it is not part of this seam; each adapter's
//     own nameFace()/nameEdge() implementation is free to use an
//     as-used-by push internally, same as the OCCT path already does.
//   - facesOf() is called as `facesOf(oc, shape)[index]` -- turning a
//     FaceRange.index (from a raycast hit, or a persisted selection) back
//     into a face handle, i.e. the REVERSE of "index of a face". That's
//     faceAt() below, not a face-to-index lookup.
//   - resolveName() is called once (restorePicks(), always on an EDGE name
//     read back from a persisted pick) -- the edge half of resolveFace/
//     resolveEdge below. No face-by-name call exists at a component call
//     site today; resolveFace is kept anyway for symmetry with resolveName()
//     itself, which is cause-generic in topo-resolve.ts and does not
//     distinguish face names from edge names.
//
// No kernel handle is part of this interface: every kernel-shaped call the
// component makes (per the list above) goes through one of these methods.
// The seam refactor found two more direct reaches the list had not named --
// a local faceSize/edgeLength pair -- and closed them as the `faceSize` /
// `edgeLength` methods below. A third, a diagnostic export count, had no
// adapter-neutral equivalent (
// export count to report) and was simply replaced with engine-mode-neutral
// loading text -- see BrepViewportThree.tsx's own loadEngine().
export {};
//# sourceMappingURL=engine-adapter.js.map