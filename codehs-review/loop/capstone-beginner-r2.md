# Capstone beginner walk round 2 (c49e2f33)
Session i-beginner, cookie dev_student=ibeginner. STATUS: DONE

Route: all 26 lessons of 5.9-5.11 marked completed via POST /api/lesson-state (dev stub), score 100, cookie ibeginner. Cheapest legitimate route; lock then open.
Method: playwright run-code harness; sets CodeMirror doc, clicks Stop if shown, Run, reads .requirement border colour (green 80,250,123 / red 255,85,85). Pages are very slow (load avg 30-60) but results deterministic.

## 1. 5.9.4 -- PASS
- taught solution.js: 5/5 green.
- `kb.pressing('space') || cooldown === 0` in the fire test: "A shot is made only when Space is held" RED (others green).
- unguarded `cooldown -= 1;` (no if): "The cooldown counts down" RED.
- early-return guard (`if (!kb.pressing('space')) return; if (cooldown !== 0) return; {...}`): 5/5 green.
- Cooldown hint (step 2 hint 1) reads: "`if (cooldown > 0) cooldown -= 1;` is the countdown, from 5.9.2. Leave out the `if` and `cooldown` runs on below 0, so `cooldown === 0` is never true again and the ship cannot fire." Clear, correct, matches the red card's description.
## 2. 5.10.5 / 5.10.7 -- PASS
- 5.10.5 taught: GGGGG. hp/score lines placed after `break;`: GGRRG (two cards red; the false green is closed). `const w = enemyWorth[j]; score += w;` inside the kill if: GGGGG. score taken after the splices (`score += enemyWorth[j]` after the three splices): GGGRG (score card red).
- 5.10.7 taught GGGG; `const PAUSE = 60;` with `wavePause = PAUSE` in both startRound and nextWave: GGGG.
## 3. 5.10.8 -- PASS
- starter: RG (landing card red, kill card green). `enemyHp.splice(0,0)` no-op added to the landing: still RG (red, as wanted). One-line fix (solution): GG. `removeEnemy(j)` helper (defined above moveEnemies, called in both places): GG.
- Step text: content.md now says "The lab's first three steps follow the order every bug hunt does" and "Step 4 moves the removal into one function"; lesson.json has steps s1-s3 + "(optional)" s4. Counts correctly now.
## 4a. 5.11.4 / 5.11.5 -- PASS
- 5.11.4 taught: GGGGGG. Enemy filter only (no remove loop): GGGGGR. Filter first, remove loop after: GGGGGR. Hit loop without `e.isAlive() &&` guard: GGGGRG (hit card red).
- 5.11.5 taught: GGGGGG. `new Bullet(...)` never pushed: GGGRGG ("fire() builds a Bullet" red). Bullets reaped by filter only: GGGGGR; filter first then remove: GGGGGR. `hits()` without the isAlive guards: GRGGGG. (Filter-only on ENEMIES in 5.11.5 stays green: that card lives in 5.11.4, 5.11.5's reap card is the bullets one. Not a gap.)
## 4b. 5.11.6 / 5.11.9 -- PASS
- 5.11.6 taught GGGGGG. Bare `wave` left in drawTop's HUD: GGGGGR (last card, "The old wave globals are gone", red). Step 3 now ends: "Last, change the HUD line in drawTop() from wave to spawner.wave: the old wave is gone, and the game would stop with `wave is not defined`." Plain instruction, names the error a beginner will see; hint 3 repeats it with the exact line to search for and the exact replacement.
- 5.11.9 taught (`this.wave % 5 === 0`) green; `if (0 === this.wave % 5)` green; named test `const bossWave = this.wave % 5; if (bossWave === 0)` green.
## 5. Text
- Staggered wording: 5.10.6 content ("three enemies in a staggered line, each at a random spot across the screen"; "-20 - i*50 ... is what staggers the line"; "eight lanes"), 5.10.7 step 3 and 5.10.8 hint 2 all now say staggered and match the code. No "column" left. FIXED.
- 5.9.3 cooldown text: tells the student to click the canvas first (round-1 nit fixed); COOLDOWN=12 explanation, try-0/4/30, and "delete the countdown line: one shot then never again" all correct.
- Quiz answer length (correct option vs distractors, chars): 5.9.8 -- only q4 has the correct answer longest (83 vs 72/63/40); q2/q3/q5/q6 are mid-length; q1 numeric. 5.10.9 -- q6 correct 107 vs 109/79/78 (second-longest, a 109 distractor beats it), q3 86 vs 92, q5 78 vs 85: not guessable by length. 5.11.8 -- q5 correct longest (94 vs 82/74/58), q2 112 vs 118/94/75 and q7 56 vs 59: only q5 is a length tell. So 2 of 19 questions (5.9.8 q4, 5.11.8 q5) remain longest-is-right; both are also answerable by reading, minor.
- Untaught/trap wording: none new. `undefined` (5.10.4), `for...of`, `hits()`, `hit(other)` (5.8.12), `static` (5.8.16), `filter` (5.8.13) are all taught and cited. 5.11.8 q2 distractor "for...of has no index to splice with" is plausible but wrong for the stated reason; fair. 5.10.9 q6/5.11.8 q7 shield pair still the clearest before/after.
- 5.10.8: "first three steps" + optional step 4 now consistent.

## Verdict: CLEAN
All round-1 false greens are closed (5.10.5 after-break and score-after-splice, 5.11.6 bare wave, 5.11.4/5 filter-without-remove and missing guard / unpushed Bullet, 5.10.8 no-op). All honest shapes tried are accepted (const w, PAUSE constant, early-return fire guard, helper removeEnemy in one or both places, 0 === this.wave % 5, named bossWave). No new refusal and no new confusing text.
Biggest remaining gap (low): 5.9.8 q4 and 5.11.8 q5 have the correct option as the longest. Environment: dev pages took up to 4 minutes to compile under load 30-60; not a content issue.
Not done: gameplay was not re-played in this round (only card colours, as scoped).
STATUS: DONE
