# cs-student-moderate walk: Pinball polish 5.3.15-5.3.21

Date 2026-11-03. Branch codehs-inspiration. Dev server http://localhost:3002 (teacher role). Session `w53m` (headless, closed).
No lesson file edited; only this report written. Scratch (harness, screenshots) lives in the session scratchpad.

Method. Reached back for the course's own earlier shapes and adapted them. Graders: the regex cards were driven through
`gradeWithTests` (`lib/run-tests-node.ts`, built to the scratchpad) against the three reference solutions with 60+ mutations
modelled on 5.1.14/16/17 (movement), 5.2.8 (applyForce), 5.2.15 (delete), 5.3.7/8/14 (edge check, chime). Every `js live`
block on 5.3.15, 5.3.16 and 5.3.18 was run in the real moSHion runner and its "What you'll see" sentence checked against sampled sprite state
and screenshots. The 5.3.17/19/21 reference solutions were played in the runner (score, popups, opacity, nudge, tilt, round).
Dev note: the AI grader is offline on dev ("The grader isn't responding ... the pattern check marked your cards instead"), so the
AI Check path was NOT exercised; the regex fallback is what these findings measure.

## Verdict: no blocking defect. Two medium (D1, D2), the rest low. Every live block's page claim held on the canvas.

## Ranked defects

### D1 (medium) 5.3.17 step 4 promises a score the canvas never shows
Evidence: step 4 says "One drop should give three popups ... while the score goes 1, 6, 16." The starter drops the ball at load, so by the time a
student clicks the canvas and presses R the first drop is done. Played the 5.3.17 reference: 6 s after Run the score reads 16; R then reads
17, 22, 32 (popups +1, +5, +10 each fire correctly). `score` is never reset by R (same in 5.3.14, 5.3.17 s4, 5.3.19, 5.3.21 starters).
5.3.8 s3 did warn "Press R and the next drop adds another 16"; 5.3.17 dropped that sentence, so the check a student is told to do cannot come out the way it says.
Fix: copy 5.3.8's sentence ("the first drop already ran when you pressed Run; the next one adds another 16: 17, 22, 32") or reset `score = 0` in the R block of the starter and say so.

### D2 (medium) 5.3.19 / 5.3.17 graders refuse shapes the course itself models
Transfer from the course's own examples, graded with the real cards:
- 5.3.17 r2 (and 5.3.8 r3, same family): `const touching = ball.colliding(b) > 0;` with `touching && b.wasTouching === false` is correct code
  (5.3.5 line 48: "if you turned it into true or false first, === false works"; 5.3.8's AI prompt says the same) but r2 goes RED. `== false` and `!` pass.
  Same red for `!== true`. Fix: let the edge-test alternative accept `=== false` / `!== true` when `touching` was assigned from a comparison, or drop the regex card to
  the AI and keep regex as a fallback only.
- 5.3.19 r1: the 5.1.16 "set a direction, then act once" shape
  `let dir = 0; if (kb.pressing('left')) dir = -5; else if (kb.pressing('right')) dir = 5; ball.applyForce(dir, 0);` goes RED (applyForce is not inside the `if`).
  The inline shape the course models (5.1.17: `if (kb.pressing('a')) player.vel.x = -4;`) and else-chains pass, so this is a distance-two adaptation, not a one-word edit.
  Fix: also accept `applyForce(<var>, ...)` when `<var>` is assigned under a `kb.pressing` test; or add a Help line "keep applyForce inside the if".

### D3 (low) 5.3.21 Challenge 3 invites a variable called `round`, which shadows `round()` the course taught
5.1.23 Challenge 3 and 4 teach `text('x: ' + round(player.pos.x), 10, 20)`. 5.3.21's step and reference use `let round = 1;`. It runs (typeof round is "number" in the runner),
but the first `round(...)` call a student adds afterwards (a HUD, per 5.1.23) throws "round is not a function". 5.3.8's do-not-use list does not cover globals.
Fix: rename to `roundNo` / `level` in the step and solution, or add one line "do not call it `round`: `round()` from 5.1.23 would stop working".

### D4 (low) 5.3.17 r1 accepts a 5.1.21 `text()` label that the bumper half-covers
The card text allows `text(b.worth, b.x, b.y)` in `draw()` (the form 5.1.21 modelled). Run with that: it passes, but sprites draw over canvas text, so each number is
cut by the bumper (screenshot: "1", "5", "10" striped at the bar's edges). The step and card never say sprites paint over `text()`. A student who follows 5.1.21 gets green and a half-hidden label.
Fix: one sentence in 5.3.15 or 5.3.17 s1 ("text() is painted under sprites; use `.text` so it sits on top"), or require `.text` (the reading's whole point).

### D5 (low) 5.3.21 r1 over-accepts and under-accepts
- Accepts any `frameCount` anywhere, any `x > 3`, any `.mass =` inside an `if` (even `if (score > 3) ball.mass = 1`). A student who adds `text('frame ' + frameCount, ...)` is green with no polish.
- Refuses a student's own polish that is not gravityScale/rotationLock (a score multiplier `score += b.worth * 2`, a combo counter): RED, although the card text says "or a polish of your own" and the aiCheck prompt says a bonus counts.
Fix: lean on the AI for "own polish" and tighten the three named shapes (opacity assignment; `frameCount % ... === 0`; `mass` assigned from a variable or in the R block).

### D6 (low) Seam: the polish arc starts from the 5.3.14 table, which has no game state
5.3.20 asks the student to polish "your polished pinball game" and watch for "a moment where nothing seems to be happening". The table carried through 5.3.17/19/21 is the 5.3.8 + chime table: no `playing`/lost state,
no restart that resets the score (5.3.9/5.3.10, 5.3.12). A student who built the full 5.3.10 game must either abandon it or re-port the labels, popups and nudge by hand; no step says which to use.
Fix: one sentence in 5.3.15 or 5.3.17: "use the 5.3.14 table (or your own from 5.3.10, the same lines go in the same places)".

### D7 (low) 5.3.21 Challenge 1: the list grows for ever
`pops.push(pop)` never trims; the reading says a spent popup "stays in the list ... changing it does nothing" (true: no error in 50 s of play) but the list is a leak in a game left running.
Low because a class session is short; a sentence or a `pops = pops.filter(p => !p.removed)` hint would model the better habit.

### D8 (low) Wording: 5.3.19 s2 "mass 1 ... now it is a nudge"
Measured (ball on the ground, hold right 0.5 s, then 2 s of rolling): mass 0.4 -> from x 60 to the right wall (419); mass 1 -> 228 (168 px glide); mass 4 -> 102 (42 px).
The claim holds ("a nudge"), but mass 1 is a long glide on a 440 px table; the step's own example comment ("saves a ball without throwing it off the table") is borderline for mass 1. Fine as is; the hint "somewhere between feels like a nudge" is the honest phrasing.

## Transfer that carried (distance travelled)

- 5.3.16 popup from 5.3.14: the chime line sits in `if (touching && !b.wasTouching)`; the popup block goes in the same place, 6 lines, nothing new but `.text/.life`. Graders accept: helper function, popup before/after the score line, `!b.wasTouching && touching`, nested ifs, `b.wasTouching == 0`, a life variable, `0.7 * 60`, `let` instead of `const`, an own timer ending in `.delete()` (5.2.15). Red where it should be: `.life` on the ball or a bumper, `.life = 0`, popup under `if (touching)`, in `draw()` top level, in `setup()`.
- 5.3.19 nudge from 5.2.13/5.1.17: braces, else-if chain, `'a'/'d'`, `'ArrowLeft'`, double quotes, a force variable, a held variable, a ternary, rules in `update()`, `.density` for mass, `debug = 1`, a key flip with `!`, debug on all sprites in a loop: all green. `vel.x +=` and `kb.presses` correctly red (the step says why).
- 5.3.21 fade, tilt, round, and own gravityScale/rotationLock: all green; a lone `n > 3` or `frameCount` also green (D5).
- The do-not-use warning: 5.3.8 does name `life` and says a life of 3 deletes the sprite three frames later, so 5.3.15's "why was life on the list" lands. Run: `box.life = 3` removed the box (`removed` true).

## Every live block checked against its sentence (all held)

- 5.3.15 sketch 1: box turns, 5 upright, gold BONUS in small black. textSize default 16, textColor default white (read off a fresh sprite). Sketch 2: one spark per press (48 life frames after 0.2 s), three presses -> 3 sprites, all gone after 1.4 s; `kb.pressing` -> 30 sprites in 0.5 s (60 a second), exactly the claimed bug.
- 5.3.16 sketch 1: score 2 then 7, `+5` popup at life 38 -> y rising 1 px a frame, gone after 40 frames. Sketch 2: score 2 then 7, up to 39 popups stacked while touching, 0 after the ball leaves. `collider = 'none'` reports `gravityScale` 0, so the "gravity is off" sentence is true.
- 5.3.18: mass sketch: with the same right-arrow push the mass-1 ball is 4x faster than mass 4 (vx 5.25 vs 1.31), reaches the wall first; default masses 0.42 (22 px), 0.79 (30 px) match "about 0.4 / 0.8"; a 4 and a 0.1 ball fall at identical speed (8.58 each). gravityScale: 1 lands, 0.5 lands later (252 vs 148 at 0.5 s), 0 stays at y 50; try-this `-0.2` rises off the top. rotationLock: free box ends rotated 180 on the ground, locked box rests level on its point (rotation 0); try-this lock on both: both level. Debug sketch: ball stops at y 130 on the shelf, D draws green outlines on the ball, ground and the `#222` shelf.
- 5.3.17/19/21 references: played; popups `+1 +5 +10`, opacity falls (0.88 -> 0.28), nudge, tilt state, `round` and `nudges` globals defined, no console errors.

## Backward and forward references (both citation forms)

- `node scripts/check-lesson-citations.mjs`: "861 lessons, every cited lesson number resolves" (only the pre-existing FORWARD notes 1.4.9 and 6.4.4).
- Resolved by hand to the displayed title: 5.1.21 Words on the canvas: text(), 5.1.22 Moving on its own, 5.1.15 Velocity, 5.1.13 kb.pressing, 5.2.1 Random numbers and timers, 5.2.13 Forces vs Velocity, 5.2.15 Cleanup and Delete, 5.2.16 The Finished Scene (collider 'none'), 5.3.6/5.3.7/5.3.8/5.3.11 (all say what is claimed). Folder numbers drift from displayed numbers (5-1-24 is 5.1.21), so only titles were trusted.
- Prose pointers: "Read before 5.3.16" lands; "Read before 5.3.19" lands; "the made-every-frame bug from 5.1" is 5.1.8 / 5.1.14 (true); "the climbing score from 5.3.6" lands; "that is the do-not-use warning from 5.3.8" lands. 5.3.21's "Start from your finished 5.3.19" is the 5.3.19 reference with debug on: true.
- Seams: 5.3.14 -> 5.3.15 needs nothing new (.text, .life are taught fresh); 5.3.18 -> 5.3.19 carries (kb.pressing, applyForce both already modelled); the weak join is D6 (which table) and D1 (score).
