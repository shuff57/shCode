# Future plans — shCode

Ideas parked for later. Not scheduled, not specced. Newest first.
Lives beside `log.jsonl` so it ships with the repo and travels between machines.

## Warn during a fillet drag, without asking the kernel (2026-09-03)

A student can drag a fillet radius to a value the kernel refuses and gets no hint
until they let go. There is no ceiling to clamp against: `maxRound()` says 9.99 on a
40x40x20 box where a single-edge radius of 27 builds cleanly (it was written for
rounding all twelve edges at once), and the kernel's own limit is not monotonic --
all-twelve on a 10-cube fails at r=5, succeeds 6 to 9.9, and fails again at 10+.
So a computed cap is not available and inventing one would refuse legitimate work.

**The idea: a necessary condition is cheap even though the sufficient one is not.**
A fillet needs room on both faces it blends into, so r cannot exceed roughly the
smaller of the two adjacent faces' extents measured perpendicular to that edge --
pure arithmetic on the primitive's own w/d/h in the ModelDoc, no kernel call,
computable every frame for free.

It is deliberately ONE-DIRECTIONAL, and the honesty is the whole point:

| ratio `r / min(extentA, extentB)` | what it means |
| --- | --- |
| comfortably under 1 | **nothing.** Corner interactions still refuse some of these |
| comfortably over 1 | near-certain refusal -- worth showing |

So it is worded "this is probably too big", never "this will build". The real
answer stays exactly what it is now: the kernel call on release, unchanged, with
the refusal sentence `built.refusals` already carries.

Where it would go: wherever the drag handle already has the doc and the edge name
in hand. The closed forms worked out on 2026-09-03 already establish which
dimension a fillet consumes, so the ratio is a one-line computation.

Not built. Parked because the refusal is now legible on release, which was the
important half -- see commits 7553592 and 3eea65b.

## The kernel download is movable, but not by caching (2026-09-02)

Measured, `scripts/measure-brep-warming.py`, 1.5 Mbps, cache cleared each run.

| run | prefetch | frame init | total | wasm requests |
| --- | --- | --- | --- | --- |
| cold, no warming (control) | - | 39,857 ms | 41.8 s | 1 |
| warmed from the parent page | 39,267 ms | 39,974 ms | **81.3 s** | **2** |
| parent hands the bytes over | 39,333 ms | **434 ms** | 41.8 s | 1 |

**Cache warming does not work and is not neutral -- it doubles the wait.** The
preview iframe is sandboxed without `allow-same-origin`, so it is an opaque
origin and the browser partitions its HTTP cache away from the parent's. The
parent's copy is invisible to it; the student pays for 3.82 MB twice.

**Handing the bytes across does work.** The parent fetches the kernel and posts
the ArrayBuffer into the frame, which gives it to emscripten as `wasmBinary`.
The frame never touches the network, so the partition never applies. Frame init
drops from 39.9 s to 434 ms and the file crosses the wire once. The sandbox is
unchanged -- these are the bytes of a public static asset, handed to a frame
that still cannot reach `/api` as the student.

### What this makes possible

The download becomes schedulable rather than blocking. The total wall clock is
unchanged in the harness only because it fetches serially to keep the
comparison honest; in the app that fetch belongs behind something the student
is already doing.

The best place for it is the 2D sketcher. `lib/sketch-solve.ts` and
`lib/least-squares.ts` are first-party JavaScript with no kernel at all, so a
student can draw, constrain and watch geometry move INSTANTLY while the 3.82 MB
arrives quietly. They pay 434 ms at the moment they extrude.

This is also, incidentally, why JSketcher feels fast: checked 2026-09-02, it
depends on `jsketcher-occ-engine` -- "prebuilt occ wasm", 34.58 MB unpacked --
so it is the same kernel we use, in a larger package. Its 2D is JS and its 3D
is OpenCascade, which is the split described above.

### And there is no lighter B-rep kernel to switch to

Checked the same day: `manifold-3d` is 2.63 MB and `three-bvh-csg` is 1.32 MB,
and both are MESH libraries -- no addressable faces, no fillet on one edge, no
selection surviving an edit. They are what JSCAD already gives. Every browser
parametric modeller uses OpenCascade wasm, and our 3.82 MB gzipped build is
smaller than any of them ship.

## A custom kernel build cuts the download 44% (2026-09-02)

Built and measured, not estimated. `scripts/occt-bindings.yml` is the class
list; two iterations on `donalffons/opencascade.js:latest`, about nine minutes
each.

|  | uncompressed | gzip -9 | exports |
| --- | --- | --- | --- |
| stock replicad-opencascadejs | 21.91 MB | 6.87 MB | 498 |
| our list | 11.35 MB | **3.82 MB** | 370 |

Verified working against the same arithmetic the OCCT suite uses: a box
measures exactly 6000, a cylinder exactly 13571.6803, booleans build, and
**non-uniform scale comes out exactly 18000 for a 3x stretch** -- the operation
the stock build cannot perform at all, which is what `scale([3, 1, 1], shape)`
needs and what four taught names are blocked on.

The saving is the ISO 10303 STEP stack. `StepBasic`, `AUTOMOTIVE_DESIGN` and
`IFSelect` match zero times in the new binary against 299 for `StepBasic` alone
in the stock one. A CAD application imports STEP files; reSHape does not.

### What this does to the 42 seconds

On the measured 1.5 Mbps shared-wifi profile, 6.87 MB took 42 s. 3.82 MB is
roughly 24 s. Better, and still not good. **This is a necessary piece and not a
sufficient one** -- cache warming is still the thing that decides whether a
student waits at all, and it is now the cheaper of the two remaining levers.

### Before it can be adopted

Two renames, both of which fail loudly at the first call:

- Overloads are **suffixed** in a custom build. `new oc.GProp_GProps()` throws;
  `GProp_GProps_1` works. All of `lib/occt-*.ts` uses unsuffixed names, because
  the stock build resolves overloads itself. `BRepBuilderAPI_GTransform_2` is
  the shape-taking overload.
- `NCollection_List_TopoDS_Shape` becomes `TopTools_ListOfShape`, which
  `lib/topo-history.ts` constructs to copy a boolean's `Modified()` list.

The 120-check OCCT suite is what proves a switch, and it is the reason the
switch is safe to attempt at all.

### One trap worth carrying forward

The first build listed only the classes `lib/` calls. It built, the module
loaded, every export was present in `Object.keys` -- and every constructor threw
`Cannot construct BRepPrimAPI_MakeBox due to unbound types:
BRepBuilderAPI_MakeShape`. embind will not construct a class whose base is not
also bound, and a list derived by grepping call sites can only ever find leaves.

## The new vocabulary: keep the names, fix what misleads (2026-09-02)

Operator decision, taken once it was settled that the book and lessons are
being rewritten around the new engine.

lib/occt-api.ts opens with the rule "JSCAD's semantics, not a better idea" --
copy the awkward parts, because an existing student file must build what it
built before. **That rule no longer holds**, and the rationale under it is
gone too: reSHape's stated design goal was graduation ("nothing to undo, the
real names are still in scope, paste it into jscad.app"), and there is no
jscad.app destination once JSCAD is removed.

What was chosen, of three options:

- Names and call shapes stay as they are, so most lesson code survives a light
  edit rather than a rewrite.
- The things MEASURED as actively harmful get fixed. `torus` is the case on
  record: JSCAD's `outerRadius` is the circle the tube travels along and its
  `innerRadius` is the tube itself, and public/reshape/reshape.js documents at
  length how both mislead -- reading them the obvious way builds 44 x 44 x 8
  or 56 x 56 x 20, silently. Those become `ringRadius` and `tubeRadius`.
- Mesh-only options are REFUSED BY NAME rather than emulated or ignored.
  `sphere(15, { segments: 24 })` answers "a B-rep sphere is exact; there are
  no segments to choose" instead of quietly building something else.

Rejected: copying JSCAD name for name (carries its design errors forever, for
a compatibility that has nowhere to graduate to). Rejected: a fresh vocabulary
(more lesson rewriting than the gain justifies).

### What this changes in the code

- The "JSCAD's semantics, not a better idea" banner in lib/occt-api.ts is now
  wrong as written and must be rewritten to say what was actually decided.
- scripts/test-occt-api.mjs compares against JSCAD as the BAR. It becomes a
  transitional regression check instead -- useful while the lessons are being
  rewritten, and retired when they are. Any name deliberately changed has to
  be listed there, the way the bounding-sphere divergence already is.
- The refusal messages become the teaching surface. A refused mesh-only option
  is the only place a student meets the difference between the two engines, so
  the sentence matters more than the refusal.

## What the B-rep preview would cost a student (2026-09-02)

Measured, cold cache, per profile. `scripts/measure-brep-load.py` re-runs it.

| connection | kernel init | kernel to pixels | wall clock |
| --- | --- | --- | --- |
| localhost (or a repeat visit) | 1.3 s | 1.6 s | 1.8 s |
| fast 4G, 20 Mbps | 3.4 s | 3.9 s | 4.1 s |
| slow 4G, 4 Mbps | 15.3 s | 16.1 s | 16.6 s |
| shared wifi, 1.5 Mbps | 39.9 s | 41.1 s | **42.1 s** |

The wasm is 6.87 MB gzipped and must arrive before the first frame draws.
These are PER STUDENT and a classroom shares one pipe: twenty-five first
visits at once move 172 MB, so the bottom row is a floor rather than a worst
case. A repeat visit is the top row, because the browser caches it.

**JSCAD IS NOT STAYING** (operator, 2026-09-02). The first version of this
entry offered "keep JSCAD for the taught path and serve B-rep per lesson" as
one of three options. It is not an option, and removing it changes what the
42 s means: there is no fallback engine, so every student pays that cost on
their first modelling lesson and the load has to be SOLVED rather than routed
around.

What is left:

- Warm the cache deliberately -- fetch the kernel from the module index so the
  download happens while a student is reading, not while they are waiting on a
  model. Cheapest thing available and it may dissolve the problem.
- A loading state, regardless. 42 s of blank canvas is not acceptable even if
  it is rare.
- Trim the wasm. We call 50 of the 498 bound classes; the payload carries the
  other 90% and whatever OCCT they drag in.

### The binding rebuild is now the critical path, and it fixes two things

A custom OpenCascade build was already the way to shrink the download. It is
ALSO the only way to get `BRepBuilderAPI_GTransform`, and with JSCAD gone that
stops being a queued nicety: non-uniform scale is taught -- the docs page is
titled "scale: bigger, smaller, squashed" and its worked line is
`scale([3, 1, 1], shape)`, "how a circle becomes an oval" -- and there is no
longer an engine that can do it. Same for `ellipsoid`, `scaleZ` and a general
`transform` matrix, which all hit the same missing binding.

So one piece of work -- rebuilding `replicad-opencascadejs` with our own
binding list -- both cuts the payload and unblocks four taught names. It
should be priced before anything else.

### And every documented page now has to run

With no fallback, the 19 pages blocked on an unported name and the 27 that
refuse are no longer curiosities; they are either work or doc edits. Largest
first: `vectorText` and its font table (7 pages), `project` via HLR (2),
`roundRadius`, `twistAngle`, `innerSegments`, `geodesicSphere`, `minkowski`,
`path2`'s curve builders, `expand`, `arc`, `measureEpsilon`.

Some of those should be doc edits rather than code: a page whose whole subject
is `segments` is teaching a mesh idea that the new kernel does not have, and
rewriting it is more honest than emulating a facet count.

## The 17 doc pages the kernel swap does not carry (2026-09-02)

`lib/script-surface.ts` classifies all 75 API names the 183 documented examples
call. 166 pages (90.7%) survive the swap untouched. The other 17 split into two
piles that need completely different work, and the split is the point -- one is
geometry we owe, the other is a line in a build config.

**Owed to us: the hull recipe.** `lib/hull.ts` exists and is measured -- its
triangles sew into a solid OpenCascade agrees is a solid, and the two volumes
agree to ten digits. What is NOT done is wiring it behind the `hull`,
`hullChain` and `hullPoints2` names. 11 pages wait on this.

RESOLVED 2026-09-02, and the question turned out not to be the question. This
was parked as "how densely to sample a curved solid, which is a decision
nobody has made". Measured against JSCAD's own hull on the docs' two-sphere
example, the density was never the constraint -- our hull was 10 to 40 times
slower at equal accuracy and did not finish past ~2000 points, and underneath
that it had a tolerance bug that collapsed the hull's topology at ~3000. Both
fixed. The answer to the parked question is that there IS no new dial: the
tessellation's own deflection is the sampling density, and at its default the
result is 0.475% off exact in 19-71 ms, against 1.66% for what the docs ship
today. Wiring is now ordinary work, not a decision.

**Owed by the build: `BRepBuilderAPI_GTransform`.** Non-uniform scale --
`scale([3, 1, 1], s)`, `scaleZ`, a general `transform` matrix, `ellipsoid` --
has no path in this wasm build. `gp_GTrsf` is bound and takes the stretch;
nothing applies it to a shape. This is real OpenCascade that
`replicad-opencascadejs` does not expose, so the fix is rebuilding the binding
list, not writing geometry. 6 pages wait on this. The OCCT suite asserts the
ABSENCE, so the day a build binds it the suite goes red and the four names get
re-judged rather than staying refused out of habit.

**Refused outright: `extrudeHelical`.** No helix in the build, and nothing for
`MakePipeShell` to ride. Same wall External Thread hits in `.gauntlet/parity.json`.
1 page.

Also settled here, and not parked: `generalize`, `snap` and `retessellate` are
MOOT rather than refused. They exist to repair a triangle mesh and a B-rep has
none, so nothing is lost and nothing is owed.

## KiCad unit (2026-08-31)

Add a course unit on **KiCad** — open-source schematic capture + PCB design.

Decided so far:
- **Shape:** a new module of lessons under `lessons/`, authored the same way as
  every other unit (readings, videos, written assignments, quiz). No new app
  code, no new lesson type, no in-browser editor — KiCad is a desktop app, so
  students do the work in KiCad and submit writeups/screenshots.
- **Depth:** full unit, through DRC and **fab-ready gerbers** — a real
  order-ready board, not just a schematic exercise.

Open questions before this can be specced:
- Where does it sit? Units run 1–13 (Ch.8–13 are JSCAD). A hardware unit is a
  new branch, and the calendar in `curriculum-plan.md` Part B is already full.
  Does it displace something, or is it a different course?
- Fab budget + turnaround. "Fab-ready" only means something if boards get
  ordered; who pays, and does the vendor's lead time fit a semester?
- Which SLO does it carry? CSCI 4's four SLOs are all software; a PCB unit
  may be enrichment rather than articulated credit.
- Submission surface: screenshots as image uploads (the `/api/uploads` path
  already exists) vs. pasted text. Nothing renders a `.kicad_sch` today.

Prior art in-repo: `curriculum/README.md` describes the module-spec →
lessons build pipeline. Start with a spec at `curriculum/modules/`, not
with lesson folders.
