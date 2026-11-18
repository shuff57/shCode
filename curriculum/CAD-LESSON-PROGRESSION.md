# CAD Lesson Progression and Useful Builds

Draft for teacher review, 2026-11-16. Build toward a **small organizer system for objects
the student actually owns**: a usable base tray and two removable inserts or accessories,
with documented measurements and an input-driven way to make a second size.

The progression is **2D drawing → 2D OOP → basic 3D CAD → advanced CAD → fit and reliability
→ a finished useful system**. Each stage produces something worth keeping. As in the game
sequences, students extend their own work, test it and revise it instead of repeatedly
starting an unrelated demonstration.

Stage A is **script-driven 2D sketching in SolidCraft**: the JavaScript editor and
Run build native XY geometry, dimensions and constraints. The teacher can also enable
SolidCraft's native hand tools. Stage B refactors the same sketch scripts into classes
and independent objects. Save both the source and the complete editable native design;
automatic GUI-to-script conversion is not assumed.

A table row is a lesson sequence: introduce one idea, show it, practice it, then check
it in the artifact. It may become several short shCode screens. A1–F4 are design keys,
not assigned lesson ids or class-period counts. The existing 9.1 lessons and OOP pilot
keep their saved ids. This sequence replaces the earlier draft's 3D-first order; the
older detailed drafts remain content references to adapt during authoring.

## Lesson progression table

| Key | Lesson sequence | Tools introduced or practiced | Programming or design idea | What the student keeps |
| --- | --- | --- | --- | --- |
| A1 | Draw a measured outline | Flat sketch view, pan/zoom, line/polyline, coordinates | An ordered set of points describes a boundary | A measured outline of a small desktop item |
| A2 | Add simple features | Rectangle and circle | Choose a primitive that expresses the intended shape | A drawing with a rectangular footprint and circular feature |
| A3 | Make the drawing precise | Length/diameter dimensions; horizontal/vertical and coincident constraints in separate exercises | Size, position and connection are different requirements | A dimensioned design whose important measurements are explicit |
| A4 | Finish a useful 2D plan | Closed profiles, selection and correction of one deliberate gap | A shape must satisfy the specification, not only look plausible | **Milestone: a saved organizer footprint and compartment plan** |
| B1 | Describe a profile as an object | Sketch primitives already practiced in A | A class stores width, depth and position; a method generates a profile | The student's footprint re-expressed as a reusable profile class |
| B2 | Make independent profiles | Positioning multiple instances on the plane | Two instances share code but keep separate measurements | Two differently sized compartment profiles from one class |
| B3 | Derive the dimensions | Sketch dimensions driven by a named input block | Separate measured size, wall/border and clearance; derive dependent values | A profile that changes predictably when its inputs change |
| B4 | Lay out a family | Copies placed using coordinates; bounded rows/grids | Arrays of descriptions and loops generate repeated profiles | **Milestone: a reusable 2D organizer layout and a second-size variant** |
| C1 | Give the profile thickness | Plain extrusion/pull | A 2D profile and a height define a solid | A solid base blank from the student's footprint |
| C2 | Create useful empty space | A straight pocket or supported subtractive cut | Build order and remaining material matter | A functional shallow tray with an intentional floor and walls |
| C3 | Add an attachment feature | A plain through hole on a simple plate/accessory | A feature belongs to a target part and has a purpose | A matching cable guide or mounting plate, alongside the tray |
| C4 | Rebuild the small product | Placement, fit view and model inspection | Source is the saved recipe; parameters and feature order reproduce the result | **Milestone: a usable digital tray and accessory that rebuild from saved source** |
| D1 | Improve a functional edge | Bevel/chamfer; a supported round as a separate exercise | Choose a size appropriate to the adjacent faces; preserve a viable plain-edge version | A refined edge on a measured, verified example |
| D2 | Repeat a purposeful feature | A small linear pattern; mirror in a separate exercise | Repeat one feature instead of maintaining copied implementations | A consistent row of mounting features or a symmetric accessory |
| D3 | Build a turned part | A simple supported revolve of a closed profile | Choose extrusion or revolution from the intended cross-section | A small turned spacer/accessory; relate its profile to its 3D result |
| D4 | Compose the organizer | A bounded planar join/cut where justified; separate removable parts | Compose part descriptions with explicit interfaces; separate bodies are not an assembly solver | **Milestone: a base with two interchangeable insert/accessory designs** |
| E1 | Protect the inputs | Dimension inspection and clear build/refusal reports | Validate configurations and test pure helpers with normal, boundary and invalid inputs | A small test record and a fixed input-validation bug |
| E2 | Test one physical fit cheaply | A small clearance coupon and measurement tools | Treat clearance as a hypothesis; measure expected vs observed fit | A tested coupon, revised clearance and the process settings used |
| E3 | Choose a part from data | Inspect known part/input dimensions; build only the selected design | Search/filter/sort a catalogue of part records against a stated fit rule | A selector that picks an appropriate organizer variant, including a not-found case |
| E4 | Hand off a reproducible version | Save/History; verified export and independent inspection | A source version, its inputs and an exported result are distinct artifacts | **Milestone: a classmate can reopen, rebuild and inspect the intended version** |
| F1 | Specify a useful organizer | Sketching, measurement and previously taught CAD operations | Define the user, measurable acceptance criteria and typed build plan | A bounded specification and a labelled fit/interface drawing |
| F2 | Build the smallest complete system | Select from the proven tools; no new mandatory operation | Reuse classes, configurations and a small data-driven family | A complete base and two functional inserts/accessories |
| F3 | Swap, test and improve | Measurement and focused CAD edits | Another person changes documented inputs; a test exposes one defect; revise the cause | Before/after versions, a peer resize record and actual fit evidence when manufactured |
| F4 | Demonstrate and deliver | The verified source/inspection/export workflow | Explain design intent, a programming decision and the evidence for success | **Final product: a reproducible, customizable organizer system that solves a real need** |

## The artifact grows like a game

**A establishes the plan.** Students choose a small regular object early: pens, an
eraser, a cable end, small tools or another object the teacher can measure and review.
Their outline and input measurements stay with their project. The 2D artifact is a
saved dimensioned drawing, not a promised scale-accurate paper print or SVG export.

**B makes the plan reusable.** Students refactor their procedural 2D scripts into
classes that hold measurements and generate profiles. Native hand edits do not rewrite
the source. Preserve a hand-edited drawing in History before Run rebuilds from code;
code controls only the features it actually generates.

**C produces the first viable 3D result.** A shallow tray made by a plain pull and
pocket is useful before decorative operations or advanced geometry. The accessory can
be a simple bored plate. Students can explain its function, dimensions and how to
reproduce it even before a physical version is made. The exact scripts must pass the
host and independent checks before the lesson is required.

**D adds capability for a reason.** An edge treatment, repeated mounting feature or
turned accessory must have a stated job. A revolve exercise can be a short separate
accessory study; not every tool needs to be forced into the organizer. Finishing a
viable product does not require collecting a checklist of decorative features.

**E supplies evidence.** Validate a source configuration separately from a kernel
refusal. Make a small coupon before committing to a large print. Work on ordinary
part records for searching/sorting; a calculated blank volume is not the measured
volume of the finished holed part. Verify the source-to-export path before it becomes
a student requirement.

**F is a synthesis, not a restart.** Carry forward the student's own plan, reusable
classes, functional tray, tested interfaces and configuration records. Students may
change the theme or user need within the teacher's bounded scope, but must explain
which previous component they are reusing and what changes. Preserve an earlier
working source version before each significant revision.

## What viable means

The final system has a base and two removable components or accessories with explicit
jobs, for example a tray for one measured item, a divider and a cable guide. The
parts do not have to join through a simulated mechanism. The student can answer:

- Whose need does it address, and what fits where?
- Which measurements determine its dimensions?
- Which class or function is reused across the variants?
- Can a classmate produce a second size by changing the documented inputs?
- What test found a defect, and what changed afterward?
- Can the saved source and settings reproduce the delivered design?

Assess digital reproducibility, code quality, testing and physical fit separately.
A rendered object establishes neither printability nor a real fit. Physical completion
requires an exported result checked in the actual manufacturing workflow and a tested
part. If that workflow is unavailable, keep the digital artifact and mark the physical
criterion pending; do not label it manufactured or tested.

Core scope: one base plus two removable inserts/accessories, a small parameter set,
at least one sketch-based solid, one useful material-removal feature, one reuse/iteration
example, and a documented test-driven change. Keep the first family to a few instances.
A mesh made from 20 repeated objects is not inherently better programming evidence.

## Classroom modes and tool boundaries

| Phase | Teacher-selected workspace | Student access | Required before authoring release |
| --- | --- | --- | --- |
| A 2D drawing | Script-driven 2D | Editor and Run build native XY sketches; teacher-enabled hand tools; no solid tools | Sketch-only policy, shortcut/menu restrictions, sketch save/reopen and grading |
| B 2D OOP | Script-driven 2D | Editor plus flat sketch view; hand sketch tools only when the teacher allows them | A sketch-only build scope, 2D instance/constraint checks and correct saved source |
| C Basic 3D | Guarded script build with selected teacher demonstrations | Taught 3D operations and camera controls; teacher owns tool availability | Exact lesson references, refused/stale-build grading and independently checked solids |
| D Advanced CAD | Teacher-enabled capabilities for the specific lesson | Only the operations the activity has introduced | Per-example correctness and usable timings on classroom hardware |
| E and F | The capabilities already verified for the project | Design, inspect and reproduce the agreed artifact | Export/fit workflow, peer handoff and evidence collection |

The hidden `9.1.13 Organizer Outline` pilot now provides Stage A's native sketch
workspace with a script editor and Run, teacher-controlled hand tools, complete native
save/reopen, History and geometry checks for one 60 × 40 rectangle. Checks require the
exact source that built the current native sketch; changed code and hand edits require
another Run. The wrapper blocks workspace/menu/shortcut paths
out of sketching; this is a classroom UI restriction, not a developer-tools security
boundary. It currently requires isolated iframe storage support (Chrome/Edge).
Arbitrary per-tool permissions and general profile/constraint grading are still
requirements for later authoring. Keep the upstream SolidCraft build unmodified.

## Extensions after the core

Offer hollows, more complex rounds, circular patterns and additional profiles as
separately measured extension activities. The whole organizer need not depend on a
hollow operation when a plain pocket already expresses its function. Keep known-refused
classes out of required work.

Lofts, helical/swept forms, text/engraving, live GUI parameter panels, multi-file imports,
color-specific exports and solver-backed mechanisms stay behind capability checks.
None is needed to prove the core CS and design outcomes. Do not copy a JSCAD API into
the new course because an old activity had the right learning goal.

## Authoring and migration

Each table row expands into atomic readings, predictions, focused labs and one small
integration. Use task-focused scaffolds and retain a private reference. References
must build correctly; unfinished starters, wrong inputs and refused steps must not
receive a full pass. A short explanation or changed-input task supplements source
patterns when those cannot prove understanding.

Use explicit carry-forward metadata when supported; otherwise make the import/restore
step a verified, visible part of the lesson. Do not silently seed the teacher's
solution as the student's previous work. No lesson ids, progress keys, public modules
or release dates are assigned by this table.

Existing detailed drafts are useful source material, with their earlier order revised:

- [Closed profiles](design/cad/10.1_closed-profiles.md) supplies A's sketch concepts;
  remove the required visible pull from A so it remains a genuinely 2D phase.
- [Part objects](design/cad/9.2_part-objects.md) supplies B's instance-state and build-timing
  tasks; adapt its solid examples to profile generation. Keep the solid version for C.
- [Measurements and part families](design/cad/9.3_measurements-and-part-families.md)
  supplies B's inputs/derived dimensions and E's physical clearance/test work; its bore
  examples belong after holes have been taught in C.
- [One Class, Two Parts pilot](../lessons/9-1-12-lab-one-class-two-parts/lesson.json)
  remains a useful C-stage integration/regression case under its current saved id.

This table is the current sequence reference. The [chapter design](CAD-CHAPTER-DESIGN.md)
contains the concept sources, earlier content bank and runtime checks. Final numbering,
pacing and textbook-to-module mapping follow review of the expanded lesson screens.
