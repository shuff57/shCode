# cs-student-moderate lens, ROUND 4: 5.2, 5.3 (5.3.1-5.3.12), 5.4, 5.5 (5.5.1-5.5.11 Snake)

Method: as rounds 1-3. The grader bundle was rebuilt from `lib/grader.ts` (esbuild) after commit 21b0f12b, then every
graded lab was run against its starter (must be red), its reference (must be green) and answers shaped like the course's own
earlier examples plus cheats. Behaviour was checked in the moSHion runner (harness page + `preview-eval`, screenshots) against the
dev server; student UI walked as `dev_student=r4moderate` (5.5.4 opens "Lesson locked, 0 of 11 completed", sidebar titles
5.5.1-5.5.11 in order). `check-lesson-citations.mjs`: "every cited lesson number resolves" (784 lessons); the two FORWARD notes it prints are in 6.4, not here.
Session `r4-moderate` closed. No repo edits other than this file.

Baseline: all graded starters fully red, all references fully green (5.2.17, 5.2.18, 5.2.20, 5.2.10, 5.2.14, 5.2.3, 5.2.4, 5.3.4, 5.3.7,
5.3.8, 5.3.10, 5.3.12, 5.4.4, 5.4.6, 5.4.7, 5.4.8, 5.4.11, 5.5.4, 5.5.6, 5.5.8, 5.5.11). 5.2.8 and 5.2.7 have no solution file; their one card goes green on any
gravity other than the starter's (tested).

## 1. Round-3 open items: FIXED / NOT FIXED

| Item | Verdict | Evidence |
| --- | --- | --- |
| Snake text drawn in `drawTop()` in 5.5.4 / 5.5.6 / 5.5.8 / 5.5.11 | FIXED | grep: all four starters and references hold their `text(...)` calls inside `function drawTop()` (5.5.4: "arrow keys steer", "Game over"; 5.5.6/5.5.8/5.5.11: score, Game over, press R; 5.5.11 reference adds `best`). Screenshot of the 5.5.8 reference with the snake parked on the score row and the food on "Game over": the white text sits on top of the green cells and the red food. 5.5.11 screenshot shows "score: 0   best: 0" and Game over readable. |
| ...and taught in 5.5.2 | FIXED | 5.5.2 has a "Words go on top, as in Flappy" paragraph with a `drawTop()` snippet and cites it as the function from 5.4.5, before first use in 5.5.4. 5.5.4 step text repeats it ("from `drawTop()` at the bottom"). 5.5.3's example still writes `text('col ' + block.col...)` in `draw()`, but the block walks row 10 and never reaches the text row, so nothing breaks. |
| 5.4.7 card description "The starter has no score" | FIXED | Now "The starter shows a score that never moves." Matches the starter (declares and draws `score`). |
| 5.2.10 r4 Help pointer | FIXED | Now "5.1.16 (Velocity: vel.x and vel.y)", which exists (`5-1-15-reading-velocity`). r4 also accepts a named constant (`JUMP` / `-jump`), `-8`; refuses `-= 8` and a positive 7, correctly. |
| 5.5.1 "the 5.4 lab" | FIXED | Now "as Flappy did in 5.4.6 (Lab: Pipes that come and go)": number, title and claim (pipes became their own array) all true. |
| 5.4.11 challenge 3 wobble wording | FIXED, with a caveat (finding 3) | Text now says "The top and the bottom half must move together, by the same amount, or the gap stops being a gap". Measured: giving both halves the same `vel.y` and flipping it on a beat keeps top-y minus bottom-y constant at -265 for 6 s. |
| 5.5.6 r3 `const nf = makeFood(); food = nf;` | FIXED | r3 P for `nf` temp, `const old = food; food = makeFood(); old.delete()`, `nextFood`, score++/`score = score + 1`, delete before or after. |
| 5.5.6 r4 honest shapes | FIXED | P: `const ate = ...; if (ate) ... else`, early `return` in the eat branch, not-equal-first, two ifs with `!ate`, `eaten === false`, nested col-then-row if, `segments.pop().delete()`, `const last = ...; pop; last.delete()`, eat test on `segments[0]` after `unshift`. F (cheats, as wanted): pop always, pop before the test, eat on `frameCount % 50`. Only refusal of an honest shape: comparing pixels (`segments[0].x === food.x`), which the card text rules out ("the new head's cell"). |
| 5.5.6 r3 / r4 against the cheat "update inside if" style | n/a | not applicable here |
| 5.3.4 r3 refuses `.75` | FIXED | `.75`, `0.8`, `1`, no semicolon, and `const bounce = 0.8; ball.bounciness = bounce;` all P. |
| 5.2.1 "you met Math.random() in the loops unit" | FIXED | 5.2.1 now says "which you only read and never wrote ... nothing is missing: this page is where they are taught." |
| 5.2.5 Slides placeholder | NOT FIXED | `5-2-1-slides` still "Placeholder until the deck is rebuilt from bookSHelf", no `slidesUrl`. Honest but empty, mid-chain (and `5-3-1-slides`, 5.6.1, says the same). |
| 5.4.7 r2 refuses `p.x + 25 < bird.x` / `p.x < bird.x - 25` | NOT FIXED (optional widening) | r2 F for both, and for a `PIPE_W` constant; flag-first, `bird.x > p.x`, nested ifs, index loop all P. Cheats (no flag, flag never set, score on a beat) F as intended. |
| 5.4.4 r1/r2 refuse a named flap variable | NOT FIXED (optional widening) | `bird.vel.y = FLAP` / `flap` / `-= 4` all F on both cards, although 5.2.10 r4 now takes `JUMP`. Same idea, two graders that disagree. See finding 4. |
| 5.3.7 grader passes the named bug "update inside the if" | NOT FIXED | See finding 2. r2 was tightened (score now has to be inside the `if`), but the bug the lesson itself names still scores 3/3. |

## 2. The round-4 patterns you asked about

### 5.4.8 r4 ("gravity 0 plus `vel.x = 0` on something other than the bird")
Course teaching: 5.4.5 shows `pipe.vel.x = -2` (kinematic) and `bird.vel.x = 0`; 5.4.8 step 2 gives `for (const q of pipes) { q.vel.x = 0; q.mate.vel.x = 0; }`. Every shape that grows from that passes: index loop, `p`/`pipe`/`q` as loop name, `forEach`, the freeze placed in `if (!playing)` outside the crash block, spacing variants. Refused: `vel.set(0, 0)` and `speed = 0` (not taught anywhere in 5.x, fine). Cheats: `bird.vel.x = 0` alone and nothing at all are F. The "other than the bird" test is satisfied by any alias (`const w = bird; w.vel.x = 0;` P), which is lax by instruction.
Verdict: the taught shape lands on what the card accepts. Two behaviour leaks the card cannot see (lax, low): stopping only the top half (`q.vel.x = 0;` without `q.mate.vel.x = 0;`) is P and the bottom halves keep sliding; stopping only the colliding pipe `p` is P and the others keep moving.

### 5.4.6 r2 / r3 ("inside an if that tests x")
Honest P: local `const pipe = pipes[i]`, forward loop with `i--`, `<=`, `x + 25 < 0`, `0 > x`, splice-first-then-delete, `for...of` with `indexOf`, a named constant bound, a comment line between the deletes and the splice, `const p = makePipe(); pipes.push(p)`, `frameCount % GAP`, no braces, `&& pipes.length < 5`. Cheats F: push every frame, push outside the beat, delete only, splice only, unconditional delete.
Refused honest shapes (both are the "name the test first" habit 5.3.7 modelled with `const touching = ...`): `const gone = pipes[i].x < -30; if (gone) {...}` fails r3, and `const beat = frameCount % 90 === 0; if (beat) {...}` fails r2. Low.

### 5.3.7 r2 (update-inside-touch-test)
See finding 2.

### 5.2.17 r2
All taught shapes P: 5.2.16's `dx, dy, Math.sqrt`, 3.1.7's inline `** 0.5`, `dist(...)`, `distanceTo`, `Math.hypot`, `Math.pow`, `.pos.x`, any variable name, `<= 30`. Refused by design (the card says distance): a box check with `abs`, `player.overlaps(goal)`. Refused, but arguably honest: copying the goal first (`const g = goal; ... g.x`). Cheats F: no distance, `sqrt` with no goal, goal.x only in a comment (comments are stripped). Clean.

## 3. NEW findings

### 1. 5.2.7 (Worked Example: Falling Block): its own steps contradict each other once the card is made green
Round 4 gave 5.2.7 a requirement ("Change `world.gravity.y` to a different number ... as step 2 says"; `= 10;` is refused, so the starter is red).
Step 2 is "change gravity to 0, the block floats". Step 3 is "remove `'static'` ... both pieces fall now" and step 4 "add a second falling block ... watch them stack". Nothing says to turn gravity back on, and putting it back to `10` turns the card red again. Measured: gravity 0 and a dynamic ground leave the block at y 60 and the ground at y 380 after 1.5 s: nothing falls, so step 3's claim is false for a student who did step 2 as written. The only way to keep the card green and the later steps true is to pick a non-10 number such as 20, which no step suggests.
Bridge: step 2 should say "then try 20, which also falls faster", or step 3 should start "set gravity back to a falling value (not 10 ...)", or r1 should accept the starter value after a changed run. 5.2.8 has the same contradiction at smaller scale: its description still reads "Non-graded: discuss with a partner" while it now carries a card, and its own step order (10, then 0, then -5, then 20) happens to end on 20 so the card goes green.
Also (gameable, lax): `world.gravity.y = 10` without a semicolon passes r1 on both lessons unchanged.

### 2. 5.3.7 r3 still passes the bug the course names, and refuses an honest long form
5.3.5 ("Try this") says: move the update inside the `if` and "pressing R never adds another point". Measured on the 5.3.7 reference:
- `if (touching && !wasTouching) { score += 1; wasTouching = touching; }` with the separate line deleted: r1 P r2 P r3 P, a green card on a game that is broken after the first point.
- `{ score += 1; wasTouching = true; }`: r3 F (correct).
- Honest and correct but refused: `if (touching) { wasTouching = true; } else { wasTouching = false; }` (update on every frame in both branches) and `... else if (!touching) { wasTouching = false; }`: r3 F.
So r3's one test ("`x = touching` appears after `!x`") passes the bug and fails two correct shapes. Widening direction (lax is the instruction): accept an assignment to the memory variable that sits outside the scoring `if`, in any form; and keep the one-line named bug red by requiring that the assignment is not the last statement inside the same `if` block that holds `score`. Unchanged from round 3 apart from r2's tightening.

### 3. 5.4.11: the reference solution's "wobble" does nothing, and a literal reading of the challenge opens a bypass
`solution.js` sets `top.wobble = random(0.5, 2)` and `top.phase = random(0, 6)` in `makePipe()` and then never reads either (grep: no other use, no `sin`, no `vel.y` on a pipe). Its header says "a random wobble"; the pipes do not wobble. The r1 card turns green on this because it matches two `random(` calls. A student who opens the reference to see how challenge 3 is done finds only dead properties; a student who writes the dead properties alone gets a green card.
Separately, the wording "move together, by the same amount" is now right, but translating both halves does not keep the gap's walls on the screen edges: the top half's top edge leaves y = 0 and the bottom half's bottom edge leaves y = 400. With my test amplitude (up to 45 px) the free strip above the top half is wider than the bird (24 px), so the bird can fly over the pipe. "A small wobble" in the text keeps it honest only if small means under about 20 px; the text could say so ("no more than 15 pixels").
Bridge: the reference should apply the numbers (for example the beat flip on both halves, 5 lines).

### 4. Grader disagreement across the seam 5.2 to 5.4 on a named constant
5.2.10 r4 accepts `player.vel.y = JUMP` and `-jump`; 5.4.4 r1/r2 (the same idea, `bird.vel.y = FLAP`) refuse it. 5.4.2 shows the literal line, so the course never models the constant; still, a student who learned in 5.2.10 that the course takes a named jump finds 5.4.4 red, with "uses = so every flap is the same size" as the reason. The commit message says "named constants ... accepted", which holds for 5.2.10 / 5.2.14 / 5.3.4 but not 5.4.4. Low; widening only.

### 5. Smaller items
- 5.2.10 r3 refuses `const onGround = player.colliding(ground); if (kb.presses(' ') && onGround)` and the nested-if form. The card text says "joined with &&", so the nested one is by design; the `onGround` variable is the 5.3.7 habit again. Low.
- 5.5.6 r4: an honest eating test that compares pixels (`segments[0].x === food.x`) is refused; the card says "cell". By design.
- 5.2.7 / 5.2.8 cards: `const g = 3; world.gravity.y = g;` and `world.gravity.y += 5` are refused (low).

## 4. Verdict per module

| Module | Verdict |
| --- | --- |
| 5.2 | Biggest gap: **5.2.7's own steps contradict the card round 4 added** (step 2 turns gravity to 0, step 3 and 4 need gravity on, and restoring 10 turns the card red; measured nothing falls). Otherwise clean for transfer (5.2.17 / 5.2.10 / 5.2.3 / 5.2.4 honest shapes pass, cheats fail). Residual: 5.2.5 placeholder slides. |
| 5.3 | **Clean** except one item: 5.3.7 r3 passes the exact bug 5.3.5 names and refuses the both-branch update. Everything else (5.3.4 `.75`, circle constructor, reachable goals) holds. |
| 5.4 | **Clean.** The 5.4.8 freeze, 5.4.6 and 5.4.7 cards accept the shapes the course models and reject the cheats. Residual: 5.4.11 reference does not wobble (finding 3), 5.4.4 refuses a named flap. |
| 5.5 | **Clean.** `drawTop()` taught in 5.5.2 before first use, applied in 5.5.4 / 5.5.6 / 5.5.8 / 5.5.11 (verified by screenshot), 5.5.1 pointer right, 5.5.6 honest shapes all pass. |

## 5. Notes for whoever fixes
- Finding 1: one sentence in 5.2.7 step 2 ("or any number but 10 that still falls, like 20") fixes the contradiction without touching the grader.
- Finding 2: widen r3 to accept an assignment of the memory variable anywhere outside the scoring `if`, and refuse the one where it is the last line inside it.
- Finding 3: add 5 lines to `5-4-flappy-9-challenges-make-it-yours/solution.js` that use `wobble` / `phase` (or drop them), and a "keep it under 15 pixels" clause in the challenge text.
- Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/r4/` (`t556.cjs`, `t548.cjs`, `t546.cjs`, `t537.cjs`, `t5217.cjs`, `t5210.cjs`, `t544.cjs`, `t547.cjs`, `t527.cjs` batteries on a fresh `grader.cjs`; `shot.sh`, `rc.sh`, `snk6.png`, `snk8.png`, `snk11.png`).
