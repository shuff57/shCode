# Chapter 3 assessment work, built on the pre-cs-3d app

Parked here 2026-09-18. This is the whole of what lived uncommitted on the
`main` branch before `main` was retired; the original commit is preserved as
tag `archive/main-ch3-work` (`a523842a`, one commit on top of `4ccb7370`).

**It was built against the wrong app.** `main` was the pre-cs-3d shCode: five
HTML lessons, a regex-only grader in `server.js`, no auth, no D1, no classes.
Everything below was authored there before the mistake was caught. The
assessment *content* is still good and is the reason this folder exists; the
*infrastructure* is superseded outright and is kept only as a patch.

## What is dead

`superseded-app-changes.patch` — all 12 infrastructure files, as an exact diff
of `4ccb7370..a523842a`. Kept as a patch rather than as loose files so the
`.tsx` cannot be typechecked (cs-3d's tsconfig `include` is `**/*.ts` +
`**/*.tsx` with only `node_modules` and `functions` excluded) and so nobody
mistakes it for live code.

| In the patch | Superseded in cs-3d by |
| --- | --- |
| `lib/lock.js`, `components/LessonLock.tsx`, `/api/unlock` in `server.js`, the gate in `app/lesson/[lessonId]/page.tsx` | `class_open_dates` (migration 0023), `GET /api/my-due-dates` → `openRows`, `components/LessonAccessGate.tsx`. Server-backed, per class, with lesson-over-module-over-unit inheritance — strictly better than the per-browser unlock-code cookie here. |
| `lib/drafts.js`, `components/DraftStatus.tsx`, the persistence added to `lib/store.ts` | `lesson-drafts`. Server-backed and cross-device; this was `localStorage` only. |
| `locked`/`unlockCode` on `lesson.json`, `app/page.tsx`, `components/LessonCard.tsx`, `app/globals.css` | cs-3d's own home page and lock badges. |

Do not apply this patch. It is a record.

## What is worth mining for modules 3.9 and 3.10

The two lesson folders and `assessments/chapter-3/` hold the design work, and
that part was done against **this repo's shipped Chapter 3**, not against the
old app. It is the input to building the real block.

- `assessments/chapter-3/rubric.md` — point splits, the three-layer grading
  argument (technique checks / behaviour harness / teacher), design-demo-
  collaboration descriptors.
- `assessments/chapter-3/answer-key.md` — reference solutions plus a
  misconception catalogue, every entry of which was executed rather than
  guessed.
- `lessons/ch3-group-pa/` — "Snack Shack": `makeItem` (§3.5), `totalValue` by
  loop + accumulator (§3.3.5), `lowStock` by loop + `push()` (§3.3.4),
  `receiptLines` by `map()` + arrow (§3.7.1, §3.4.3), `sellItem` through the
  reference (§3.6), `save`/`loadInventory` (§3.8), with `plan.md` gating the
  design phase.
- `lessons/ch3-test/` — "Gradebook": `average` (§3.3.5 + §3.2.4 early return),
  `highest` via `Math.max(...scores)` (§3.7.4), `passing` by loop + `push()`,
  `addScore` by object spread (§3.7.5), plus four written questions.

### The constraint that shaped both, and that still holds

**§3.7 teaches exactly four tools: `.map()`, `.slice()`, `.concat()`, spread.**
§3.7.6 "What Else Is Out There" *names* `.filter()`, `.reduce()`, `.forEach()`,
`.indexOf()`, `.sort()` as things students will recognise elsewhere but that the
book does not teach — verified against `lessons/3-7-*` in this repo, where
`.filter` appears only in `3-7-19-reading-what-else`. Totalling and selecting
are therefore hand-written with a loop and an accumulator (§3.3.5) or `push()`
(§3.3.4).

A first draft of both assessments *required* `.reduce()` and `.filter()` and
told the teacher to penalise a `for` loop. That was backwards and had to be
rebuilt. **`curriculum-plan.md`'s Ch 3 Test blueprint says "`.map`/`.filter`/
`.slice`" and is wrong about `.filter` in the same way** — the same
plan-versus-shipped divergence the 2.6 module doc records for A2.2.0. Assess
what shipped; record the divergence.

### The deliberate pairing

`sellItem` (PA) **must** mutate through the reference; `addScore` (test)
**must** copy without touching the original or its `scores` array. The pair
exists so copy-or-mutate reads as a decision rather than a habit. The test's
self-check asserts `updated.scores !== s.scores` specifically to catch the
shallow copy — `{ ...student }` followed by a `push` — which is the §3.6 Key
Term landing in real code and the sharpest discriminator in the chapter.

### Verified reference values

Computed, not hand-summed. An earlier draft of the answer key had two wrong
numbers, either of which would have marked a correct student wrong.

| | Value |
| --- | --- |
| `totalValue(SEED)` | **109.00** (Popcorn 42 + Pretzel 12 + Soda 45 + Nachos 10) — an earlier draft said 106.50 |
| `lowStock(SEED, 5)` | Pretzel (3), Nachos (2) |
| Gradebook averages | Ana 86.3, Ben 61.7, Cruz 97.7, Dee 71.7 |
| Class average | **79.3** — an earlier draft said 79.4 |
| `passing(ROSTER, 70)` | Ana, Cruz, Dee — Ben's *best* is exactly 70 but his average is 61.7, so a wrong comparison usually includes him |

## What does not transfer

**The file format.** `main`'s `lesson.json` grades with regex
`requirements[]` against a live HTML preview. cs-3d dispatches on
`quiz` / `aiGrader` / `diagram` / `grading` blocks with per-block `summative`
flags, and Chapter 3's block is console-only — so the `index.html` and
`style.css` here have no equivalent.

**The shape.** cs-3d's precedent is fixed by 1.6/1.7 and 2.6/2.7: a Group PA is
three lessons (design chart → build → demo) and a Test is five (concepts +
traces → own words → find and fix → chart it → write it), each with a module
doc in `curriculum/modules/` and a rubric in `rubrics/`. Chapter 3's book
sections run §3.1–3.8, so the assessments are modules **3.9** and **3.10**,
scheduled Mon Nov 2 and Wed Nov 4 2026 (`curriculum-plan.md` meetings 28–29).

**A gate does not cover 3.10 yet.** `scripts/check-summative-parts.mjs` keys
test units on `/^(\d+)\.7 Chapter \1 Individual Performance Assessment$/` —
hardcoded `.7`. Chapter 3 is the first chapter whose test is not `.7`, so that
check would silently skip it. It is the gate that exists because unflagged
parts locked students out of 1.7 mid-exam; teach it the new pattern before
authoring 3.10.
