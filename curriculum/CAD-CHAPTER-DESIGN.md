# CAD Chapters and Lesson Design

Draft for teacher review, 2026-11-15. Students carry their JavaScript knowledge from
moSHion into programs that describe useful physical parts. The teaching sequence is
**read a recipe → describe a part object → derive dimensions → build from a sketch →
repeat from data → test a fit → deliver a reproducible design**.

This is the design for new shCode CAD work. The runtime is reSHape Script on the
pinned SolidCraft host. The first working integration is
[9.1.12 One Class, Two Parts](../lessons/9-1-12-lab-one-class-two-parts/lesson.json).
The existing 9.1 module stays hidden during review. These drafts create no new course
routes, release dates, student assignments or changes to saved progress.

## Chapter map

The numbers below are proposed **shCode course units**, following the existing 8.1
Arcade Cabinet and 9.1 Solid Shapes. They do not rename textbook chapters. Book
references keep their original numbers. No existing lesson id or assignment code
moves; the pilot remains 9.1.12 even when later lessons revisit its idea.

| Proposed unit | Central question | Proposed modules | Student evidence | Meetings |
| --- | --- | --- | --- | ---: |
| 9 Programming a Part | How does a program describe a physical part? | 9.1 Script and solid foundations; 9.2 Part objects; 9.3 Measurements and part families | Two independent instances; a changed measurement rebuilds the intended part | 5 |
| 10 Sketches and Repeated Designs | How does a flat profile become a useful, repeated solid? | 10.1 Closed profiles; 10.2 Profiles into solids; 10.3 Designs from arrays | Dimensioned profile, successful pull/cut, a small data-driven family | 6 |
| 11 Fits My Stuff | Can another person resize my design for their object? | 11.1 Measure and specify; 11.2 Build the first fit; 11.3 Swap and revise | Measurements, reusable part, peer resize record, revised version | 4 |
| 12 Reliable Part Programs | How do I know a design program behaves correctly? | 12.1 Validation and test data; 12.2 Search and sort part records; 12.3 Organize a small part library | A test that catches a bug; a justified selection algorithm; reusable source | 5 |
| 13 From Program to Physical Part | Can someone reproduce, inspect and make this version? | 13.1 Source and versions; 13.2 Fit coupons and print preparation; 13.3 Handoff and CAD transfer | Rebuildable source, versioned settings, measured coupon, handoff package | 4 |
| 14 Design Build Test and Explain | Can I solve a bounded physical problem and show the evidence? | 14.1 Scope and design; 14.2 Build and iterate; 14.3 Test and improve; 14.4 Demonstrate and reflect | Specification, implementation, tests, fit evidence, revision history, explanation | 8 |

**Planning allowance:** 32 meetings × 105 minutes = 56 contact hours, plus two reserve
meetings = 59.5 hours. This reuses the old plan's combined 34-meeting Q3/Q4 allowance;
it is not a confirmed calendar. The expanded game sequence and the school's actual
remaining meetings must be reconciled before dates are assigned. Independent homework
and printer queues are outside those contact hours. A printed result is never assumed
to appear during a code lesson.

The first five meetings are allocated 2 + 1 + 2 across 9.1–9.3. Chapter 10 has two
meetings per module; chapter 11 has 1 + 2 + 1; chapter 12 has 2 + 2 + 1; chapter 13
has 1 + 2 + 1; chapter 14 has 2 + 3 + 2 + 1. No module exceeds three meetings.

## Learning progression

### 9 Programming a Part

Begin with an immediately visible box and a hole, then read the build order and change
one dimension. Explain millimetres, coordinate directions and the difference between a
saved script, its feature recipe and the solid on screen. Students know JavaScript;
CAD adds a new application of it, not a new syntax course.

In 9.2, a class stores the measurements of one part and a method writes that part's
recipe. Two objects must retain independent values. Changing a property after a method
ran does not resize an existing solid; changing the source and running again rebuilds
the recipe. The built geometry is not a JavaScript instance with live setters.

In 9.3, move from unrelated literals to a few named inputs and derived measurements.
Separate object size, material and clearance. Give a classmate a documented input block
rather than a promised slider panel. Finish with one deliberate input change and a
prediction of which dimensions should change and which should stay fixed.

**Assessment:** read an unfamiliar short recipe; explain a class vs an instance; build
two independently sized parts; change one input and verify its effect. Keep the existing
pilot as a bridge using previously learned classes, not as the sole introduction to OOP.

**Next detailed designs:** [9.2 Part objects](design/cad/9.2_part-objects.md) and
[9.3 Measurements and part families](design/cad/9.3_measurements-and-part-families.md).

### 10 Sketches and Repeated Designs

Start with lines, corners, a closed profile and meaningful dimensions. Introduce
constraints one at a time, beginning with a rectangle. Leave tangency and near-contact
sketches out of the core. In 10.2, use a known-good profile to distinguish adding material
from removing it. Predict the result of a cut before running it. Treat a refused step
as something to diagnose, not something to hide by changing the expected answer.

In 10.3, let an array hold part descriptions and let a loop build them once each. Count,
spacing and size are different inputs. Start with three pieces and cap core activities
at six; larger patterns require timing evidence on classroom hardware. A repeated
part is not automatically a joined body or a mechanically constrained assembly.

**Assessment:** predict open vs closed profiles; constrain a rectangular profile; pull
and cut supported examples; trace a three-record array into three parts; fix one gap
or spacing error. Close with one integration lab, not a second capstone.

**Next detailed design:** [10.1 Closed profiles](design/cad/10.1_closed-profiles.md).

### 11 Fits My Stuff

Preserve the strongest project in the old plan: measure a real object and design a
small holder, divider or organizer for it. Specify only operations already taught and
verified. The required mechanism is modest: at least one sketch-based solid, one
supported material-removal feature, a repeated element and three meaningful inputs.
An input must change useful geometry, not merely a color or a label.

11.1 produces a measurement record and typed build-order plan. 11.2 builds one modest
version from that record. 11.3 asks a classmate to resize it through the documented
inputs, changing no class/method implementation. Record the attempt and revise one
real defect; an unsuccessful fit is useful evidence, not a reason to fabricate success.

**Assessment:** input-to-dimension trace, built/refused results, peer resize attempt,
expected/observed measurements and one before/after source version. A digital clearance
check is not a physical fit test. An early print is teacher-mediated and requires the
export gate below; if printing is unavailable, retain the digital and CS evidence and
leave physical-fit evidence pending rather than awarding it automatically.

### 12 Reliable Part Programs

Make correctness a programming task. 12.1 uses pure JavaScript helpers to validate sizes
and derive dimensions, with normal, boundary and invalid test inputs. Test these
helpers in the existing console environment where the test runner is available, then
use them in CAD. Distinguish a JavaScript exception, a refused modelling feature and a
part that builds but does not meet the specification. A `try/catch` around the source
does not catch the later kernel's per-feature refusal.

12.2 operates on ordinary part records: name, input dimensions, stock size and a stated
fit rule. Implement a sequential search and explain a sorted search's precondition.
Use a comparator to sort records, then build only the chosen part(s). Any calculated
blank volume must be labelled a blank-volume estimate, not the measured volume of a
finished part with holes or rounds. Binary search is an extension after sorted-data
reasoning; new sorting algorithms, hashing and graph traversal are not all required
programming labs in the same meeting.

12.3 separates configuration, validation, reusable classes and the final build calls
within the supported single-file artifact. Composition means one part program using
smaller part descriptions. It does not imply a CAD assembly solver or JavaScript
module imports. Multi-file import/export work stays conditional until the sandbox
supports and grades it.

**Assessment:** a failing test before a fix; boundary and invalid cases; a search trace
including not found; justification of ordering; reuse under a second configuration.
Keep the algorithm and testing evidence for SLO 4 and SLO 3 respectively.

### 13 From Program to Physical Part

13.1 makes the script, its input settings and its saved version the reproducible design.
Open it in a clean session and rebuild it. Contrast source history, the feature recipe
and an exported mesh: none is a substitute for the others.

13.2 starts with a small fit coupon instead of repeatedly printing the full project.
Predict a clearance, produce a measured result, and revise the assumption. Printer,
material and process settings belong with that observation; one clearance number is
not a universal correct answer. Inspect a supported exported result in the target
workflow before asking students to rely on it. A visual check alone cannot certify
minimum wall thickness, a watertight mesh or printability.

13.3 packages the source, settings, dimensions, test notes and a useful image. It maps
concepts to the next CAD environment: sketch → profile, pull → pad/extrude, pocket →
material removal, repeat → pattern, dimensions/constraints → design intent. FreeCAD
remains a pathway destination, not an additional application every core lab must
install. Keep any dedicated GUI bridge as a teacher-curated extension.

**Assessment:** reopen/rebuild on another session, identify an exact source version,
explain a coupon result, and hand a classmate enough information to reproduce the part.
STL/STEP/3MF or other formats are included only when the actual guarded output and
export route have been verified; the old format-comparison requirement is not copied.

### 14 Design Build Test and Explain

Use a fixed CS requirements checklist with a bounded choice of physical problem.
Good baselines are a modular desk organizer or a measured mounting system. The work
must use reusable part objects, data-driven variation, derived dimensions, validation,
test evidence and a documented iteration. A design with two functional parts is enough;
complexity is justified by the user need, not the number of CAD features.

14.1 limits the scope, writes acceptance criteria and assigns responsibilities.
14.2 implements the smallest complete version before any extension. 14.3 tests inputs,
fit and reproduction, then records a justified change. 14.4 demonstrates the result,
explains a code decision and distinguishes evidence from an assumption. Assess each
student's explanation as well as the shared artifact.

**Assessment:** separate criteria for programming, design process, algorithms/testing,
physical evidence and communication. Physical evidence remains pending when the part
cannot be made/tested. A moving mechanism is an optional project only after fit,
multiple-part export and any needed joining workflow are verified. Do not promise
kinematic simulation or a solver-backed assembly as a capstone prerequisite.

## Lesson design pattern

Each new idea gets a small reading or demonstration, one focused practice, then a
prediction, debug case or exit check. Name the single idea before choosing a screen
count. Build large programs through small completed steps and preserve student work
with an explicit carry-forward relationship where the app supports it.

| Screen | Student action | Evidence |
| --- | --- | --- |
| Read or predict | Explain one term or anticipate one change | A short response or a labelled prediction |
| Worked example | Trace the relevant input/property/method into a visible result | A prediction checked against the example |
| Focused lab | Write the missing behaviour without copying a full answer | A current successful build plus the relevant source criterion |
| Debug | Change the cause of one specified defect | Before/after observation and a passing check |
| Integrate | Combine previously practiced ideas in one small useful part | A reproducible source artifact |
| Exit check | Explain why it worked and what would change under a new input | Individual evidence; all-readings do not count as checked understanding |

Scaffolds describe the task in plain language and do not contain commented-out answers.
Source criteria accept sensible variable/class names. Geometry requirements count only
features the current guarded run built. Editing or restoring source invalidates the
old result. Source-pattern checks are not a complete proof of OOP design: use a changed
input, instance-independence task and student explanation as evidence too.

Readings/examples that still launch the older CAD preview must be migrated or delivered
as a teacher demonstration. Setting a fence to a new language name is not a runtime
integration. Do not publish an embedded example before checking which renderer it uses.

Teacher policy: code-only is the default for OOP practice. A teacher may enable hand
tools for a comparison/demonstration through the saved class/assignment setting. Students
keep camera controls and have no local toggle. Hand edits do not update the saved script;
a lesson must not claim automatic hand-model-to-code round trips.

## Runtime gates before lessons are released

| Objective | Current design decision | Release evidence required |
| --- | --- | --- |
| Part objects using boxes and plain holes | Basis of the pilot and chapter 9 | Reference, unfinished starter, wrong dimensions and refused-feature checks on the lesson route |
| Constraints and a closed rectangular sketch | Planned core; use existing friendly sketch examples as references | New lesson examples through the real host, including open/redundant/conflicting cases with honest wording |
| Extrude, pocket, combine and repeat | Planned core only for bounded verified inputs | Exact starter/reference scripts build or refuse as expected; independently check the built solid |
| Fillet/hollow or cuts near curved walls | Selected demonstrations or extension | Per-script evidence on the pin; preserve all guards; never make a known-refused class compulsory |
| A GUI parameter panel | Not assumed by the core sequence | Controls reach the saved source/model, reopen correctly and preserve ownership/history |
| Student tests of measured geometry | Not a promised scripting API | A bounded measurement interface and grading path; pure-helper tests need no new CAD API |
| CAD embedded readings/examples | Conditional | The chosen content renderer uses the guarded runtime, including error/refusal reporting |
| Export and physical fit | Teacher-mediated early prototype; full pipeline later | Export the exact accepted script result, inspect/reopen it independently, and test on the actual target workflow |
| Multi-file imports | Deferred from required labs | Sandboxed module resolution, saved artifacts and grading tested together |
| Hulls, helices, text, colors and broad format comparisons | Extension backlog | Language/host support and per-script evidence; upstream UI availability alone is insufficient |

The guard layer's refusal is part of the lesson, not a grading loophole. Never weaken
it to make an assignment pass. Keep preview, source, saved history and the current
build report consistent. Classroom browser performance is a release gate for loop-heavy
and expensive-feature examples; use measured limits rather than the old request for
20 shapes merely to demonstrate iteration.

## Concept and source mapping

The book remains the concept source. Engine-specific passages require adaptation before
being assigned verbatim. No book file is edited by this design.

| Existing source | Retain | Adapt in shCode |
| --- | --- | --- |
| Book §§8.1–8.3; old activity list foundations/2D/booleans | Libraries, coordinates, composition and operation order | Built-in scripting vocabulary and feature recipes; omit JSCAD `require`, `main` and returned-geometry mechanics |
| Book §8.4; old parametric-design activities | Inputs, derived dimensions and usable controls | First a documented configuration block; a GUI panel is a separate runtime gate, not an equivalence claim |
| Book §8.5 | Arrays, loops and data-driven construction | Iterate part descriptions and build each once; small patterns before a stress test |
| Prior moSHion object modules 7.1–7.3 | Class, instance, constructor, property and method | Part objects generate a static recipe; no `setup`/`draw` lifecycle or live sprite-like geometry |
| Book §§9.1–9.2 | Profiles into solids, dimensions, placement and composition | Use the current sketch/pull/cut vocabulary; no automatic translation of twist/slice/advanced-extrusion options |
| Book §§9.3–9.4 | Debugging, validation and test-data design | Separate source errors, feature refusals and specification failures |
| Book §10.1; old Fits-My-Stuff plan | A measured useful object and the classmate swap test | Reusable part objects; explicit input block; physical evidence only after export/fit checks |
| Book §§11.2–11.3 | Measurement reasoning, print preparation, searching and sorting | Separate input records, estimates and live measurements; scope the implemented algorithms |
| Book §§12.1–12.2 | Reuse, artifacts, file I/O concepts and communication | Single-file organization first; supported export only; do not pretend classes are file modules |
| Book §§13.1–13.3 | Scope, design, implementation, testing and explanation | Bounded part system; optional mechanism after capability checks |

Working references: [original activity inventory](../curriculum-data/jscad-freecad-activities.md),
[long-range curriculum](../curriculum-plan.md), [book/module ownership](BOOK-TO-MODULE.md),
[authoring conventions](resources/sub-module-spec-conventions.md), and the current CAD
module's [pilot evidence](modules/9.1_solid-shapes.md#pilot-validation-2026-11-15).
Textbook sections are under the sibling bookSHelf project's
`Introduction to Programming Concepts and Methodologies/remastered/`; their original
chapter/section names are retained for the concept join above.

## Build order

1. Review this chapter map and the three detailed designs; reconcile the time allowance
   against the remaining semester before scheduling dates.
2. Migrate the first 9.1 script/reading examples onto the guarded runtime, retaining old
   ids and completed work. Existing hand-tool lessons need revised tasks; they are not
   silently equivalent to script lessons.
3. Build 9.2 Part objects, then 9.3 Measurements and part families, one atomic lesson at
   a time. Keep the pilot as regression evidence rather than moving it between modules.
4. Build and measure the chapter 10 core. Draft Fits My Stuff around the operations
   those reference scripts actually support.
5. Complete teacher/student walks and artifact/export gates before releasing a chapter.
   Prepare later chapters in parallel as designs, but do not author unsupported API
   exercises as if the missing runtime already existed.

Detailed designs live under `curriculum/design/cad/` until approved for build. They are
outside the live module loader. Moving one into `curriculum/modules/` is an explicit
follow-up, with its numbering, source join, references and release state checked.
