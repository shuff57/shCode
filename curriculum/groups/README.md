# Lesson groups

The layer between a module and its screens. `curriculum/groups/<moduleId>.json`
splits a module's screens into lessons of 2–8 (aim for 4–6), each with one
objective a student can read, so a module stops being a run of 20–45 screens
with no internal closure point.

Modelled on CodeHS, whose module → lesson → activity shape puts a stated
objective and a short bundle of activities between the student and a wall of
work. Structure only: no CodeHS text, problems or code belongs in these files.

```json
{
  "moduleId": "5.1",
  "source": "where the seams came from, and that nothing was copied",
  "lessons": [
    { "id": "frame-loop", "title": "The frame loop", "objective": "Students will be able to …", "screens": ["5-1-1-slides"] }
  ]
}
```

## Rules

- **Screens are lesson FOLDER ids**, never the numbered title. `5.1.24` lives in
  the folder `moshion-gravity`, and a renumber of the title must not touch a
  group file.
- **Every screen appears exactly once**, groups cover the module, and groups
  follow module order (which is the number on the title, not the folder name).
  `scripts/check-lesson-groups.mjs` fails the build otherwise, and
  `getModule()` throws on the same rule.
- **Groups are presentation only.** Progress, completion, the sequential lock,
  due dates and "X of Y" all stay per screen. Adding or moving a group cannot
  orphan a student's D1 progress; only a renumber can.
- A module with no group file renders exactly as before, so adoption is
  one module at a time.

## Where a check goes

Not every lesson needs a closing check. The rule used for 5.1, and the one to
carry forward:

> A lesson needs a check when its last screen is a **reading or a video**. If the
> lesson already ends in a lab, an exercise or a challenge, that screen is the
> feedback, and a quiz on top of it is busywork.

5.1 therefore has **no new check screens**: all six lessons end in a lab, an
example or a challenge (5.1.21/22/23, 5.1.24). The modules that need one are the
reading-heavy ones — 1.2, 1.5, 3.2, 6.5, 6.7 — where a run of readings closes
with nothing to answer.

Do not invent a check by inserting a screen mid-module: lesson numbering is
tied to D1 progress, and a renumber orphans every completion it passes
(`scripts/check-lesson-numbers.mjs` explains the history). A new check ships at
the end of a module, or with a migration that moves the ids.

## Not yet done

- Only 5.1, 5.6, 5.7 and 5.8 are grouped (5.6–5.8 use CodeHS AP CSA's object lessons as the pattern). The rest of the modules have no file.
- No per-lesson "2 of 6 done" counter. The headings on the module page show the
  objective and screen count only; screens themselves show nothing.
