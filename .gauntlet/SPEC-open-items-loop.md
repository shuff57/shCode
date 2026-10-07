# SPEC: open-items loop

Record: `.gauntlet/open-items-loop.json`. Written 2026-10-03.

Closes the open items left after the Units 1-8 audit: the AI-grader rubric leak
(shipped), 8.1.11 Desk Tray not completable, the checker that cannot see it,
8.1.10's stale sketch points, 8.1 wording, and two grading decisions.

## Rule that this loop adds

A fix only counts when it passes in **the engine the student runs**. 
`check-reshape-solutions.mjs` ran on OCCT and printed PASS while the browser's
brep-rs kernel refused the build. A green check on a different engine is not a
pass.

## One round

1. **Gate** - the phase's machine checks. Pass or fail, no judgment.
2. **Judge** - an independent agent that never saw the fix. It works from the
   written steps only and reports against the phase's acceptance list.
3. **Fix** - only what the gate or judge reported. Each finding is written to
   the record BEFORE the edit.
4. **Regression sweep** - `npm test`, `check-starters`,
   `audit-grader-tolerance.mjs --gate`.
5. **Decide** - two consecutive clean rounds (gate green AND judge finds
   nothing) = phase done, commit. Not clean after 4 rounds = stop and escalate
   with the open findings. A finding that returns counts against the cap.

## Hard rules

- Judges kill processes by port only, never by script name.
- Each judge uses its own `dev_student=<name>` cookie and its own port.
- Max 3 judges in parallel.
- Nothing is pushed, deployed, or deleted from inside the loop. Those are human
  approvals, listed per phase.

## Phases (order: 0, 2, 1, 4, 3, 5)

| Phase | Gate | Judge | Done when |
|---|---|---|---|
| 0. Ship leak fix | `npm test`; `check-ai-grader-leak --require-build`; unauthenticated `curl` of `/ai-graders.json` returns 404 | none | gate green. Push, deploy, old-deployment deletion are human-approved |
| 2. Checker truthfulness | mutation test: old 8.1.11 must FAIL, fixed one must PASS, on the brep-rs kernel | reviewer reads the diff, hunts a refusal class still missed | fails on known-bad, passes on fixed |
| 1. 8.1.11 redesign | `check-reshape-solutions.mjs` on brep-rs; `check-starters`; every step has an instruction | beginner completes 8.1.11 in browser from the steps, Build and Code | Quest green in both routes, no feature refused |
| 4. Wording | grep gate for unnamed icon-only controls in 8.1 steps; `check-docs-prose` | beginner walks 8.1.2, 8.1.5, 8.1.10, 8.1.11, lists every control they could not find | judge reports no "couldn't find X" |
| 3. 8.1.10 stale points | scripted check: type 60, requirement stays red; correct value turns green | advanced agent hunts any typed value that still passes | wrong values never pass, correct passes |
| 5. Decisions | script that the pass-rule text matches `isPassingGrade`; `test-grade-stream`, `grader-assertions` on strict and lenient fixtures | advanced agent submits thin and off-topic answers to a summative and a formative item | strict items refuse thin answers; text and rule agree |

## Open inputs

- Phase 3: the bug is in vendored `reshape-cad`
  (`packages/script/src/model-check.ts`). Fix upstream and re-vendor, or hand
  over a patch. Needs the upstream path.
- Phase 5: leniency (strict preamble when `summative`) and pass-rule text
  (change the text, not the rule) are recommended, awaiting the user's choice.
- Phase 1 option B (lift the brep-rs round limit) is deferred; lesson redesign
  (option A) goes first.
