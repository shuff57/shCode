# Future plans — shCode

Ideas parked for later. Not scheduled, not specced. Newest first.
Lives beside `log.jsonl` so it ships with the repo and travels between machines.

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

**Nothing is decided here.** Three shapes the answer could take, and the
numbers do not pick between them on their own:

- Switch the preview and show a real loading state. Honest, and 42 s is a long
  time to hold a class.
- Keep JSCAD for the taught path and offer the B-rep engine per lesson --
  `lesson.preview` already selects a runner, so the machinery exists.
- Warm the cache deliberately: fetch the kernel on the module index page so it
  is already there by the time a student opens the first modelling lesson.

The third is worth pricing before choosing between the first two.

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
