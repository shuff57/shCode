# cs-student-moderate lens: Defender capstone 5.9, 5.10, 5.11 (26 lessons, commit c7d1c6bf)

Session `h-moderate`, cookie `dev_student=hmoderate`, dev server :3002 (alive, DEV_ROLE=student). Lock ON.
Method: grader bundle rebuilt from `lib/run-tests-node.ts` (esbuild) for the batteries; browser for gating and for real Submit.
Written early, appended as I go. Only this file is edited.

## 0. Baseline (grader bundle, starter vs reference)
All 12 graded labs: every starter red, every reference green (5.9.4, 5.9.6, 5.9.7, 5.10.2, 5.10.5, 5.10.7, 5.11.4, 5.11.5, 5.11.6).
Exceptions by design: 5.10.8 (debugging) starter is r1 red / r2 green; 5.11.9 has one card.
Citation checker: "810 lessons - every cited lesson number resolves" (the 2 FORWARD notes are 1.4.9 and 6.4.4, not here).
Seam 5.9.7 reference -> 5.10.2 starter: diff is exactly "drone out, three parallel arrays in"; names (ship, base, bullets, cooldown, score, baseHp, playing, startRound, BASE_Y) carry unchanged.

## Findings (appended below)

## Route taken (browser, lock ON)
`dev_student=hmoderate`, session `h-moderate`. 5.9.4 opens "Lesson locked, 0 of 8 completed" before the route (lock is real). Route: 5.9.1 typed a real plan
(grader down in dev: "The grader isn't responding right now ... saved and sent to your teacher", counts, 1/8); readings/example 5.9.2, 5.9.3, 5.9.5 via "Mark as complete";
labs typed/injected into CodeMirror (select-all + insertText), Run, cards read, real Submit (Submit auto-advances to the next lesson); 5.9.8 quiz answered from the key
and "Check my answers". No dev stub. Module 5.9 reached 8/8 with 5.9.4 submitted as the **Flappy-shaped variant** (`kb.pressing(' ')`, see 5.9.4 below), 5.9.6 and 5.9.7 with the reference.

## 5.9 findings (batteries on the app's own grader bundle, plus browser)
Transfer from the earlier modules is good. Every shape I lifted from 5.2/5.3/5.4 either scored full or was refused for a reason the reading itself gives.
- 5.9.4: Flappy's spacebar spelling `kb.pressing(' ')` (5.4.7) 5/5, and in the live sketch holding Space really fires (4 shots alive on screenshot). `constrain()`, `Math.max/min`, else-if clamp, `cooldown--`, `cooldown = cooldown - 1`, `<= 0`, `.remove()` (the 5.4.6 fix), a clamp at 0/400: all 5/5.
  Refused, correctly: the 5.2.1 beat `frameCount % 12 === 0` with no cooldown (r2 r3 r4 red; 5.9.2 has a table explaining why that is a different design), no splice (r5), no `delete` (r5).
- 5.9.6: every 5.2/5.4 shape green (`score++`, reversed `drone.overlaps(b)`, inline reset instead of resetDrone(), `.remove()`, an alias `const b = bullets[i]`). `colliding()` (5.3.5's tool) is 0/3: right, and 5.9.5 spends a whole table on it.
- 5.9.7: `baseHp--`, `=== 0`, `< 1`, `== 0`, check-before-reset, `kb.pressing('r')`, uppercase 'R': all green.
  **Seam 5.4.8 -> 5.9.7 (small).** 5.4.8, the lab 5.9.7 cites for its restart (Help on r1 and r5), resets by writing the reset INLINE inside `if (kb.presses('r')) { ... }`. A student who copies that block shape into 5.9.7 (`if (kb.presses('r')) { baseHp = 3; score = 0; playing = true; resetDrone(); }`) is green on 4 of 5 and red on r5 ("pressing R calls startRound()"). The step text says only "start a new round when R is pressed"; the word `startRound()` is in the hint and the card, so a stuck student recovers, but the card's demand is stricter than the step's.
  Also red (right): `baseHp = 3` moved into setup() (r1), because the step says why.
- 5.9.7 r2 "Reaching the base costs 1" cites **Help: 5.9.2 (Reading: A ship, and a timer you start yourself)**. 5.9.2 never mentions `baseHp` or hp at all (grep 0); it covers `playing`. The pointer lands on a reading that does not teach the idea. (5.9.7 r3 -> 5.3.9 is apt.)
- Quiz 5.9.8: six questions, every `source` resolves, the explanations point back ("reread 5.9.2"). 8/8 reached with real Submit.

## 5.10 findings
Route: 5.10.1 and 5.10.4, 5.10.6 marked complete; 5.10.3 typed plan (grader down, saved and counted); labs 5.10.2, 5.10.5, 5.10.7, 5.10.8 reference + real Submit; 5.10.9 quiz. Module 9/9, 100%.
Seams: 5.9.7 reference -> 5.10.2 starter differs only by "drone out, three parallel arrays in"; 5.10.2 reference -> 5.10.5 starter adds only the empty hitEnemies() and its call; 5.10.5 -> 5.10.7 swaps spawnOnBeat for the wave stubs; 5.10.7 reference -> 5.10.8 starter is the one missing `enemyHp.splice(j, 1)`. All names match. Forward notes resolve: "(5.10.7 replaces this with waves)", "5.9.7 gives it to the R key", "the drone you will meet in 5.9.5". Every `N.N.N (Title)` pair in 5.9-5.11 (68 of them) matches the real title. 5.10.3's "nested-loops lesson named in the questions below" is named (2.4.26) in the prompt panel, not in the markdown list; resolves in the app.
Plain-prose citations resolved by hand: 5.10.1 "5.7.15", 5.10.4 "2.4.25" (multiplication table, nested loop), "2.4.27" (break leaves only the inner loop), "5.4.5", "5.9.5": all point at what they claim.
5.10.8's story checks out by hand: the drift in the player's report (a crimson 1 that takes three shots, the first hit moving its label to 2, an orange 3 dying in one) is exactly what the missing splice produces.

**BIGGEST GAP, 5.10.5: the grader is green on the bug 5.10.4 names.** 5.10.4: "The score line comes first: once index j is spliced, `enemyWorth[j]` belongs to a different enemy." Move `score += enemyWorth[j];` to AFTER the three splices and 5.10.5 still shows 5/5 (battery, and again in the browser, session h-moderate, Quest panel 5/5). In play it scores the neighbour's worth, and for the last enemy in the array `enemyWorth[j]` is `undefined`, so `score` becomes NaN. The step's own sentence ("add enemyWorth[j] to score, delete the enemy, splice") puts the order in the instruction, so an honest student mostly follows it; the gap is that the one ordering mistake the reading predicted is the one the card cannot see. Bridge: r4 needs a lookahead that `score += enemyWorth[j]` precedes `enemyWorth.splice`.
Other 5.10 behaviour (all by design or harmless):
- 5.10.7 refuses the 5.8.17/5.8.18 clear-field shape (`enemies.length === 0 && frameCount % 90 === 0 { spawnWave(); }`): 2/4 in the browser (r2, r3 red). 5.10.6 sends the student to 5.8.17 as the origin of the "field is clear" check, and the step says "5.10.6's nextWave(), word for word", so the refusal is explained, but the pointer to 5.8.17 leads to the other shape.
- 5.10.2 refuses `e.vel.y = fallSpeed` (Flappy's `vel.x`, 5.4.5): right, since fallSpeed changes each wave, and 5.9.2 says "nothing has a speed of its own".
- Loop direction is not graded anywhere in 5.9.4, 5.10.2, 5.10.5: a forward `for` with splice is 5/5 although 5.4.5, 5.9.2 and 5.10.4 each say backwards is the rule. Mild.
- 5.10.5 r5 reds correctly when `break` is removed or commented out.

## 5.11 findings
Route: 5.11.1 and 5.11.3 marked complete; 5.11.2 and 5.11.7 typed (grader down, saved, counted); labs 5.11.4, .5, .6, .9 reference + real Submit; 5.11.8 quiz; module 9/9 and the Submit on 5.11.9 opens 6.1.1.
Seams: 5.10.7 reference -> 5.11.4 starter = same game plus the Enemy class with empty takeHit/isAlive/land (13 `enemyHp`/`enemyWorth` lines, as 5.11.4's hint says: counted). 5.11.4 ref -> 5.11.5 starter adds Bullet only; 5.11.5 ref -> 5.11.6 starter adds Spawner only (and `clearEnemies` is still `clearEnemies` there; step 4 of 5.11.5 renames it, matching); 5.11.6 ref -> 5.11.9 starter identical bar the header. The 5.11.1 numbers are exact: 8 splices, 13 lines naming enemyHp/enemyWorth, 2 removal copies, 138 vs 177 code lines.
**Do the classes reuse 5.8 exactly?** Mostly word for word: `takeHit` body (5.8.8: `this.hp -= n; if (this.hp < 0) this.hp = 0;`), `isAlive() { return this.hp > 0; }` (5.8.9), `static spawned = 0;` + `Enemy.spawned += 1;` in the constructor (5.8.16), `enemies = enemies.filter((e) => e.isAlive())` (5.8.13), the "where it lives" table (5.8.17), `hit(other)` -> `hits(enemy)` (5.8.12, called out as a turn into a question). Drifts, none blocking:
- 5.11.4 step 1 says "show the new hp on the sprite, as in 5.8.8". 5.8.8 sets the label in draw(), OUTSIDE the class; the in-method `this.sprite.text = String(this.hp)` is 5.8.16's. Same idea, wrong lab number. (Variant with the 5.8.18 form `this.isAlive() ? String(this.hp) : ''` is 6/6.)
- Sprite removal is new here. 5.8.13/5.8.16/5.8.18 reap with `filter` alone and never `delete()` the sprite (read from the reference code: the dead enemy leaves the array but its sprite stays on the canvas). So the course's own 5.8 model is the shape 5.11.3 has to un-teach. A student who pastes 5.8.13's lone filter into `clearEnemies()` is red on r6 (browser 5/6, "Finished enemies leave the screen and the list"), and the card text plus 5.11.3 say why. Good failure, well explained.
- The Spawner is a new shape, not 5.8.17/18's: those push into a global list from draw() on a `frameCount % 90` beat; 5.11.6 returns a new array from `makeWave()` and keeps `pause`. The shape it does reuse is 5.10.7's nextWave (`return false` while enemiesLeft > 0). A student who ports `nextWave` verbatim to `ready()` with the global `enemies.length` and no parameter is red on r1; the step prints the signature `ready(enemiesLeft)`, so it is told.
**BIGGEST GAP, 5.11.4 r6 (and the same card in 5.11.5): the order the card and 5.11.3 insist on is not checked.** 5.11.3: "Screen first, then the list. Filter first and the finished enemies are gone from the list before anything can remove their sprites." The card says "removed from the screen (remove()) and then dropped from the list (... filter(...)), in that order." Swap them (`enemies = enemies.filter(...)` first, the `remove()` loop second) and the card is 6/6 (battery, and 6/6 in the browser). The remove loop then finds no finished enemy, so every dead enemy's sprite stays on the canvas for the rest of the round: the bug the reading was written to prevent, undetected. Bridge: require the `remove` loop's match to precede the `filter` assignment in r6 (the same shape as the 5.10.5 note).
Smaller 5.11 grader notes (battery, all green where the course says they must not be):
- 5.11.4 hit loop without the `e.isAlive() &&` guard is 6/6, although the step says "a second shot must not score it twice" (two shots on the same frame score a dead enemy twice).
- 5.11.5 `hits()` without its two `isAlive` checks, or one that calls `takeHit` itself (hint says it must not), is 6/6.
- Filter by a named predicate (`enemies.filter(alive)`) is red on r6; everywhere else the app accepts named tests. Tiny.
- 5.11.6 r5: `Enemy.spawned = 0` placed in the Spawner constructor instead of startRound() is red (behaviourally equivalent). The step names startRound(), so it is told.
5.11.9: any of three challenges turns r1 green and the pattern is loose (`best = score`, or `wave % N === 0` anywhere, or `class Ship ... this.cooldown`). The challenge-2 text says "push one more `new Enemy(...)`" and gives no position. A student who copies the wave loop's `-20 - i * 50` for the boss after the loop reads `i`, which is block-scoped to the `for`: ReferenceError at wave 5 only (reasoned from the language, not run; wave 5 is a long play to reach). Worth one sentence: "pick your own x and y; `i` is gone after the loop".
Quizzes: 5.9.8 (6), 5.10.9 (6), 5.11.8 (7): every `source` resolves, answers are all taught (explanations say "reread 5.9.2"); real Submit each time.

## Verdicts
- **5.9: clean.** Two small notes only: 5.9.7 r2's Help points at 5.9.2, which never mentions baseHp; 5.4.8's inline R block is a modelled shape 5.9.7 r5 refuses (told by the hint).
- **5.10: single biggest gap** — 5.10.5 r4 is green when the score line sits after the splices, the exact order bug 5.10.4 names (browser-confirmed; score becomes NaN for the last enemy).
- **5.11: single biggest gap** — 5.11.4/5.11.5 r6 is green when `filter` comes before the `remove()` loop, the exact order bug 5.11.3 names and the card text says "in that order" (browser-confirmed; ghost sprites).

Seams 5.9 -> 5.10 -> 5.11: clean. Starters chain from the previous reference with only the new stub added; names match; every forward pointer lands; no citation drift.
Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/cm/` (`grader.cjs` rebuilt from lib/run-tests-node.ts, `lib.cjs`, `t594.cjs`, `t596.cjs`, `t5102.cjs`, `t5105.cjs`, `t5114.cjs`, `t5115.cjs`, `lab.sh`, `quiz.sh`). Session `h-moderate` closed.
