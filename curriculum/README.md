# Curriculum build system

Source of truth: `../curriculum-plan.md` (SLOs + calendar) and the bookSHelf textbook
(concepts — the book is upstream of shCode). See [BOOK-TO-MODULE.md](BOOK-TO-MODULE.md)
for how a written book chapter becomes modules here, and how to resync a built unit
when the book changes.

This directory contains the **build specs** used to generate individual learning artifacts (in-app lessons, assignment markdown, slide outlines, rubrics) from the curriculum plan.

## Layout

```
curriculum/
├── units/                         ← one file per Unit, lists its modules
│   ├── 1.1_foundations.md
│   ├── 1.2_control-flow.md
│   └── ...
└── units/modules/                 ← one file per Module (highly detailed)
    ├── 1.1.1_software-lifecycle.md
    ├── 1.1.2_variables-and-types.md
    └── ...
```

## How the builder AI uses these files

When the user says **"build 1.1.1"**:

1. AI reads `curriculum/units/modules/1.1.1_software-lifecycle.md` (full spec).
2. AI cross-checks the parent unit file `curriculum/units/1.1_foundations.md` for unit-level goals and inter-module bridges.
3. AI generates the artifacts listed in the module's **Build Outputs** section — typically:
   - In-app lesson(s) at `lessons/<lesson-id>/` (lesson.json + script.js)
   - Assignment markdown at `assignments/A<week>.<n>_<slug>.md`
   - Teacher slide outline at `slides/<module-id>_<slug>.md` (optional)
   - Rubric at `rubrics/<assignment-id>_rubric.md` (optional)

The module file is **self-contained**. Builder AI should not need to re-read `curriculum-plan.md` to fulfill a build request.

## Editing conventions

- Module files are the authoritative build spec. Update them when requirements change.
- Unit files are indexes and should stay short (~50 lines). They link to modules and record unit-level SLO focus.
- `status: draft | approved | built | stale` in frontmatter tracks build state.
- Videos/Readings URLs start empty (`[ ]`) until the teacher curates specific resources. Builder AI must NOT invent URLs.
