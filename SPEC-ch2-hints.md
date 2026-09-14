# SPEC — chapter 2 step hints

Add a `hints` array to every step in chapter 2. 135 steps across 56 lessons.
Nothing else in this repo changes.

If any path in this spec does not resolve, **STOP and say so** rather than
guessing at a corrected one.

## Why

`hints` renders through `components/LessonSteps.tsx` as a collapsed
`<details>` under each step — opt-in help a student can ignore. Coverage today:

| chapter | hinted steps |
| --- | --- |
| 1 | 11 / 85 |
| 2 | **0 / 135** |
| 3 | 1 / 17 |
| 4 | 0 / 9 |
| 5 | 45 / 49 |
| 6 | 65 / 65 |

Chapters 5 and 6 were authored with hints as standard. Chapter 2 is the
largest unhinted block in the repo, and it is the chapter where a beginner
first meets conditionals, loops, `switch` and `try/catch`.

## Scope

Exactly these files, and only the `steps[].hints` key inside them:

```
C:\Users\shuff\Documents\GitHub\shCode\lessons\2-*\lesson.json
```

56 of them have a non-empty `steps` array. Step counts by unit:

| unit | steps |
| --- | --- |
| 2.1 Conditionals | 40 |
| 2.2 Algorithms and Loops | 9 |
| 2.3 Switch | 26 |
| 2.4 Loop Control | 24 |
| 2.5 Errors | 36 |

Per-lesson step counts are 2 or 3 in almost every case (34 lessons have 2,
19 have 3, three lessons have 1, 4 and 5).

**Do not touch** anything else: not `title`, not `instructions`, not
`requirements`, not `grading`, not the starter `script.js`, not `solution.js`,
not any file outside `lessons/2-*/lesson.json`. The acceptance gate hashes
each lesson with `hints` stripped and fails on any other difference.

## Format

`hints` is `string[]`, sitting alongside `instructions` on the step object:

```json
{
  "id": "step-2",
  "title": "Guard with &&",
  "instructions": "Write an if that only runs when both variables are true.",
  "hints": [
    "Both sides of && have to be true for the whole condition to be true.",
    "The condition goes inside the round brackets: if (a && b) { ... }"
  ]
}
```

Rules, all enforced by the gate:

- **1 or 2 hints per step.** Never 0, never 3+.
- **15–240 characters each.**
- A hint must not restate `instructions`.
- A hint must not contain a verbatim line from that lesson's `solution.js`.

## House style — follow chapter 1, not chapter 5

Chapter 5 and 6 hints point at the moSHion docs drawer ("Open the moSHion
docs drawer and find the Canvas section") because moSHion has an API to look
up. Chapter 2 teaches syntax, so it follows the **chapter 1 console style**:
a concrete nudge, or a named common mistake.

Real examples from `lessons/1-1-4-sdlc-overview/lesson.json` and
`lessons/1-5-43-lab-debug-the-order-total/lesson.json`:

```
- Make sure you use straight quotes ("), not curly quotes.
- Numbers don't need quotes. Text (strings) do.
- If your output looks like 'My name isa programmer!' you forgot the space.
- The condition goes in the round brackets: pagesRequested <= creditRemaining
- === means "is exactly equal to"
- The word else has no condition of its own - it is everything the first case was not
```

Note the shape of the good ones: they name the *specific* trap of that
specific step. "Check your syntax" is worthless. "If your output looks like X,
you forgot the space" is worth writing.

Two hints on a step should do different jobs — one nudges the mechanism, one
names the mistake. Do not write two paraphrases of the same sentence.

Where a step is a *predict-then-run* exercise (several lessons in 2.1, 2.3 and
2.5 are), the hint must not reveal the prediction. Point at what to look at,
not what the answer is.

Markdown inline code with backticks is supported and rendered — see
`components/InlineCode.tsx`. Use it for identifiers and snippets.

## Acceptance

All three must pass, from the repo root:

```
node C:\Users\shuff\Documents\GitHub\shCode\scripts\check-step-hints.mjs
npm test
npm run build
```

The first is the gate for this work. It currently reports 135 problems (one
per unhinted step) and must report zero. It also verifies that nothing outside
`steps[].hints` moved — do not run it with `--write-baseline`, that rewrites
the baseline and defeats the check.

`scripts/step-hints-baseline.json` and `scripts/check-step-hints.mjs` are
**not yours to edit**. If the gate is wrong, say so in your reply; do not
change it.

## Suggested batching

Five independent batches, one per unit — no cross-unit dependencies:

| batch | glob | steps |
| --- | --- | --- |
| 1 | `lessons\2-1-*\lesson.json` | 40 |
| 2 | `lessons\2-2-*\lesson.json` | 9 |
| 3 | `lessons\2-3-*\lesson.json` | 26 |
| 4 | `lessons\2-4-*\lesson.json` | 24 |
| 5 | `lessons\2-5-*\lesson.json` | 36 |

Read each lesson's `content.md` (where present), `script.js` starter and
`solution.js` before writing its hints. A hint written without reading the
starter will describe a step that isn't there.

## One thing to decide and report back

Several chapter-2 lessons are **debug** labs — `2-1-33-lab-debug-door`,
`2-3-13-lab-fix-fall-through`, `2-3-22-lab-fix-type-mismatch`,
`2-4-31-lab-fix-duplicate-pairs`, `2-5-11-lab-fix-silent-catch` — where the
student is handed broken code and has to find the fault.

A hint that says which line is wrong destroys the exercise. A hint that says
nothing useful is filler. Pick an approach, apply it consistently across all
the debug labs, and **state in your reply which you chose and why**:

- (a) name the *symptom* to look for, never the line
- (b) name the *category* of bug ("this is a fall-through bug") without location
- (c) no hints on debug labs at all — but the gate requires ≥1 per step, so
      this needs the gate relaxed, which means asking first

## After it lands

Once the gate is green, wire it into the repo's test script so it stays green:
add `node scripts/check-step-hints.mjs` to the `test` chain in `package.json`.
Do not add it before the hints exist — it would break `npm test` for everyone.
