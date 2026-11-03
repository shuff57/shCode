# Chapter 5 known fixes (from beginner-final.md and beginner-final-c.md)

Date: 2026-11-01. Branch `codehs-inspiration`.

## What changed

| Item | State before this pass | Change |
|---|---|---|
| 5.2.16 Worked Example, Step 3 (`lessons/5-2-12-example-finished-scene/content.md`) | Already reads "pressing space again and again mid-air would relaunch the player each time" (committed in 94250f2b). | none needed |
| 5.2.20 card r3 "Track collection progress" (`lessons/5-2-15-challenges/lesson.json`) | The three reported refusals were already accepted at HEAD; still refused `collected = 1 + collected`, `collected = ((collected) + 1)`, `goal1 === null && (goal2 === null)`; used a lookbehind. | Pattern rebuilt: no lookbehind, brackets tolerated around every operand (`\s*(?:\)\s*)*` / `\s*(?:\(\s*)*`, unambiguous so it stays fast), counter name must start with a letter, `1 + counter` accepted, `ignoreStrings: true`. |
| 5.4.6 card r3 (`lessons/5-4-flappy-5-lab-pipes-that-come-and-go/lesson.json`) | Already accepts `.delete()` or `.remove()` (7eaab0f0). `sprite.remove()` is documented as an alias of `delete()` in `public/moshion/docs/CLAUDE.md` and `moshion.d.ts`. | none needed (verified below) |
| 5.2.9 reading (`lessons/5-2-4-reading-ground-check/content.md`) | Used edge-/level-triggered with only a parenthesis. | One plain-words sentence added to the first-use bullet. |
| 5.2.5 deck | n/a | left alone |

## 5.2.20 r3 cases (each is the reference with one edit)

| # | Code | Expect | Result |
|---|---|---|---|
| 1 | `collected = (collected + 1);` | pass | pass |
| 2 | `if (2 === collected)` | pass | pass |
| 3 | `if ((collected) == 2)` | pass | pass |
| 4 | `collected = ((collected) + 1);` | pass | pass |
| 5 | `collected = 1 + collected;` | pass | pass |
| 6 | `if (goal1 === null && (goal2 === null))` (no counter) | pass | pass |
| 7 | counter increased, never compared (`if (true)`) | fail | fail |
| 8 | counter compared, never increased | fail | fail |
| 9 | `console.log("collected++")` plus `if (true)` (string only) | fail | fail |
| 10 | `!goal1 && !goal1` (same variable twice, no counter) | fail | fail |

Also pass: reference, `collected++`, `++collected`, `((collected === 2))`, `collected>=2`, `!goal1 && !goal2`, a count-down `remaining-- ... remaining === 0`. Also fail: starter, `collected = 2` (assignment), increment in a comment only, `x2 === collected`.

Timing on 5000-char adversarial input (`a = a + 1;` repeated, `++a ` repeated, `1 === ` repeated, bracket runs, and others): worst 26 ms (the old pattern's worst on the same set was 52 ms).

## 5.4.6 r3 cases (each is the reference with one edit)

| # | Code | Expect | Result |
|---|---|---|---|
| 1 | reference (`.delete()` twice, then `splice`) | pass | pass |
| 2 | `pipes[i].mate.remove(); pipes[i].remove(); pipes.splice(i, 1);` | pass | pass |
| 3 | `.mate.delete()` then `.remove()` (mixed) | pass | pass |
| 4 | no delete or remove, splice only | fail | fail |
| 5 | `.remove()` with no splice | fail | fail |
| 6 | untouched starter | fail | fail |

## Checks run

Generators (manifest, ai-graders, lesson-starters, solutions, module-docs, quiz-keys); check-starters (every reference full, every starter below full); check-lesson-numbers; check-hints; check-live-blocks; audit-grader-tolerance --gate (no refusals); tsc --noEmit (exit 0).
