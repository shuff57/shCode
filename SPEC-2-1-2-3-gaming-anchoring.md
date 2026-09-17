# Spec: close gaming holes in modules 2.1 and 2.3 (same class as SPEC-2-4-grader-anchoring.md)

## Background

Two gaming-lens agents live-tested modules 2.1 and 2.3 against
`http://localhost:3002/api/grade` (mirrors prod `server.js` /
`functions/api/*` / `lib/grader.ts`). Both found the same failure shape
already fixed in module 2.4 by a parallel task (`cs24-anchor-fix`, spec
`SPEC-2-4-grader-anchoring.md`, do NOT touch that spec's 8 files — this is a
DIFFERENT set of lessons, module 2.1 and 2.3 only): requirements check that a
substring exists SOMEWHERE in the file, with no check that it's structurally
connected to anything else, so disconnected or disguised code satisfies
every requirement without doing the exercise.

**Do not loosen anything — this direction is tightening.** Module 2.1 and
2.2 were loosened earlier this session (commits `760e037c`, `99abef74`) for a
DIFFERENT problem (false-strict rejection of valid code) — don't undo that
work; these are separate, disjoint lessons.

## Confirmed defects — reproduce every one of these as a negative test

### Module 2.1

| Lesson | Requirement | Gamed input (must now FAIL) | Fix direction |
|---|---|---|---|
| `2-1-33-lab-debug-door` | r1 | `if (isAlive && hasKey) {}` — empty block | Require a real statement inside the block (e.g. `console.log` or an assignment), not just brace presence |
| `2-1-24-lab-ternary` | r1, r2, r3 | `let discount = "isMember ? 20 : 0"; console.log(discount);` — ternary shape sits inside a STRING LITERAL, never evaluated | The assigned value must not be a string literal. Add a negative lookahead right after `discount\s*=\s*` (and wherever r1 independently detects `isMember...\?`) rejecting when the next non-whitespace char is a quote: `(?!["'\`])`. Read the current 3 patterns in the file first — r1 doesn't anchor to the assignment at all, so it needs its own guard, not just r2's. |
| `2-1-27-lab-ternary-chain` | r1-r4 | `let rating = "score >= 90 ? Excellent : score >= 70 ? Good : Needs work"; console.log(rating);` — same string-disguise trick | Same fix shape as 2-1-24: guard the assigned value against starting with a quote |
| `2-1-36-lab-settings-advisor` | r5 | `if (layerHeight && layerHeight) { console.log("warn"); }` — tautology, no comparison | Require a real comparison operator (`<`, `>`, `<=`, `>=`, `===`, `==`) between the two `layerHeight` occurrences, not just the bare identifier twice |
| `2-1-31-lab-flip-not` | r1 | `if (!isRaining \|\| true) { console.log("always runs"); }` — `\|\| true` neuters the condition | The filler between `!isRaining` and the closing `)` currently allows anything (`[^{]*`). Tighten it to reject `\|\|`/`&&` additions, or require the condition be exactly `!isRaining` (optionally parenthesized) with only whitespace before the close-paren |
| `2-1-38-a2-1-1-grade-advisor` (graded) | r1-r4 | `if(score){} else if(score){} else if(score){}` + a separate unrelated `if(attendance\|\|lateAssignments){}` + bare `console.log(1)` — 4 disconnected checks, nothing tied to output | Needs the same structural-anchoring treatment as the 2.4 labs: each branch's condition must be a real comparison, and each branch must log something distinguishable — read the lesson's actual instructions and reference solution before redesigning |

### Module 2.3

Read `lessons/2-3-*/lesson.json` for each of these (title, steps,
requirements) plus its reference solution before touching anything — I have
NOT pre-read these, only the gaming agent's summary:

`2-3-4-lab-convert-to-switch`, `2-3-8-lab-animal-sounds`,
`2-3-9-lab-predict-default-position`, `2-3-12-lab-predict-fall-through`,
`2-3-17-lab-vowel-consonant`, `2-3-19-lab-false-vs-zero`,
`2-3-22-lab-fix-type-mismatch`, `2-3-26-lab-traffic-light`,
`2-3-28-lab-drink-size-switch`, `2-3-29-a2-3-1-print-settings-advisor`.

Common gamed pattern across all of them: `switch(1){case 1:break;default:break;}`
(or similar) with **literal case labels instead of the real switched
variable**, and often **zero `console.log` calls at all** — because no
requirement ties the case labels to the switch's own discriminant variable,
or ties any case to producing visible output. Specific notes:

- `2-3-22-lab-fix-type-mismatch`: **do not re-touch r1** (the `Number()`/
  `parseInt()`/`parseFloat()` check) — that was already fixed this session
  for a different, false-strict reason (commit `f4abd9f7`). The NEW defect
  here is that the lesson's whole point ("students must see it print 'Second
  place'") is never checked — no requirement requires any `console.log` at
  all, so `switch(Number(place)){case 1:break;case 2:break;}` satisfies
  everything with zero output. Add a requirement (or tighten an existing
  one) that a case body actually calls `console.log`.
- `2-3-29-a2-3-1-print-settings-advisor`: r10 was already fixed this session
  (commit `99abef74`, block-comment support) — don't touch that. The
  remaining gap is r8/r9 ("mentions temperature"/"mentions speed"): they
  match the bare substrings `temp`/`speed` ANYWHERE in the file, so
  `console.log('temp speed')` (unconnected to any real per-filament value)
  satisfies both. Anchor them to actually appearing inside a `case` block's
  `console.log(...)` call, not just anywhere in the file.
- `2-3-9-lab-predict-default-position` and `2-3-12-lab-predict-fall-through`:
  both ask the student to write a PREDICTION COMMENT before running the code
  (see each lesson's own `steps`) — the gaming report notes zero prediction
  comments were written and the labs still passed. If there's no requirement
  currently checking for a comment at all, consider whether one should be
  added (check the lesson's `steps` instructions to see if this was meant to
  be graded or just a suggested practice — don't invent a new requirement
  that the lesson's own instructions don't support; if the instructions only
  suggest a comment as good practice rather than requiring it, leave it and
  note that in your report instead of adding a check).
- `2-3-13-lab-fix-fall-through`: **confirmed NOT gameable** (the checker
  requires the literal fix). Leave alone.

For each remaining lesson (`2-3-4`, `2-3-8`, `2-3-17`, `2-3-19`, `2-3-26`,
`2-3-28`), the general fix is the same shape as the module 2.4 spec: bind
case-label checks to the switch's real discriminant variable (from the
lesson's own instructions), and require at least one requirement that ties a
case body to a `console.log` call with lesson-specific content — read each
one's instructions before writing the fix, they are not identical.

## Technique reference

Same toolkit as `SPEC-2-4-grader-anchoring.md` and commit `760e037c`
(`git show 760e037c` for the brace-scoping and backreference patterns
already shipped): bound matches with `[^}]*` / `[^}]*?` to the right brace
pair, use backreferences for "the same name used consistently," use negative
lookaheads (`(?!["'\`])`) to reject a value that starts with a quote.

## Acceptance criteria (verify yourself before reporting done)

1. `node scripts/check-starters.mjs` — 164/164 (or however many are now
   graded) unaffected: every reference scores full, every starter does not.
2. Dev server should be running on :3002 — check with `curl -s -o /dev/null
   -w "%{http_code}" http://localhost:3002/` first; if down, message
   `team-lead`, don't restart it, it's shared with other agents.
3. Every reference solution for every lesson you touch, live-POSTed to
   `/api/grade`, scores full marks.
4. Every gamed input listed above (module 2.1's table, module 2.3's
   described patterns) is live-POSTed and now scores `passed: false` / fewer
   than full requirements.
5. Do not touch `2-3-13` (confirmed not gameable), the module 2.4 lessons
   (another task owns those), or anything in 2.1/2.2 outside the 6 lessons
   named in the table above.

## What to do when done

**Do not commit.** Report back to `team-lead` via SendMessage with a summary
per lesson and the live-test evidence for all 5 acceptance criteria. The
main session will review the diff and commit.
