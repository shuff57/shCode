# Editors audit, round 4: modules 5.2, 5.3 (5.3.1-5.3.12), 5.4, 5.5 (5.5.1-5.5.11 Snake)

Run by cs-function-audit on 2026-10-30 against commit 0d039346 (round 5 fixes). Dev server localhost:3002
(DEV_ROLE=student) was up (HTTP 200). playwright-cli session `r5-editors`, cookie `dev_student=r5editors`.
Measurements, not verdicts: the pass/fail call is the human's. Not repeated, per the brief: the 17 `js live` fences
(clean, frames advance, no editor-kind or async hits, no `floor` variable declared) from the earlier pass.

Method: same harness as rounds 2-3 (a playwright `run-code` script; code set through the CodeMirror doc, then the real Run
button; frames read from `frameCount` inside the runner iframe, 60 fps headless). Harness files:
`.../scratchpad/r5ed/` (not in the repo). FILES were regenerated from the working tree at 0d039346, not reused from the
13:52 harness that predates round 5.

This file is written early and appended as checks finish. Sections marked PENDING are not measured yet.

## Lesson ids used (title number is not the id)
5.2.7 = `moshion-gravity`; 5.2.8 = `5-2-3-lab-tune-gravity`; 5.2.14 = `5-2-9-lab-wind-zone`;
5.2.17 = `5-2-11-lab-reaching-the-goal`; 5.2.18 = `5-2-13-a5-2-1-pinball-scene`; 5.2.20 = `5-2-15-challenges`;
5.2.3 = `5-2-random-3-lab-random-spot-and-colour`; 5.3.1 = `5-3-pinball-plan-sketch-the-game`;
5.3.2 = `5-3-pinball-1-reading-from-scene-to-game`; Snake labs = `5-5-snake-4`, `-6`, `-8`, `-11`.

## Item 9: numbers and cross-references in prose changed in rounds 3-5 (static, diff f5e53852..0d039346)
Every lesson.json / content.md line changed in the two commits was read. Cross-references checked against the titles in
the lesson tree (all resolve to the lesson the text names): 5.1.16 Velocity (5-1-15), 5.4.6 Pipes that come and go
(5-4-flappy-5), 5.4.5 A world that scrolls (5-4-flappy-4, which does teach `drawTop()`), 5.3.5 collision reading,
5.3.7 Score one point per touch (pinball-6), 5.3.9 State of the game, 5.2.16 Finished Scene, 5.2.12 Bouncy Ball
(`moshion-bounce`), 5.5.4/5.5.5. Numbers in changed prose and what measures them:
- 5.2.7 step 2: gravity 0 then 20, "falls faster" -> item 7 below (live).
- 5.2.3 "for the first second the corner reads `roll: 0`" -> item 5 below (live).
- 5.2.17 "a few small hops ... that half second the space bar does nothing" -> round-3 measurement was 37 frames (0.62 s)
  between first landing and settle; re-measured in item 9b below.
- 5.2.17 "distance less than 25" matches `dist < 25` in script/solution (static).
- 5.5.4 "below 0, or 20 or more" -> 400/20 = 20 columns, `drawTop()` text positions -> item 2.
- 5.3.2 "a circle 24 pixels wide" -> item 6.
Other changed prose carries no new number (5.4.8 `vel.x` to 0, 5.5.2 `drawTop()` snippet uses 22/20/32, shown in the
reading only).

## Item 8 expected value (static)
5.2.14 right wall is `new Sprite(394, 200, 12, 400, 'static')`: inner face x = 388. Player is 40 wide, so its centre
stops at 388 - 20 = 368. "About x 367" is that minus rounding. Live measurement is in item 8 below.
