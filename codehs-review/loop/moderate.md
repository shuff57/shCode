# cs-student-moderate lens: 5.2.1-5.2.4, 5.3, 5.4, 5.5

Method: reuse the course's own earlier example, edit minimally, run it through the real `lib/grader.ts`
(esbuild bundle, regexes read from each `lesson.json`), and run the references and literal answers in the dev
server (session `lens-moderate`, cookie `dev_student=moderate`). Ids are the on-screen titles (5.3.7 is dir
`5-3-pinball-6-...`; the dir number is not the title number).

## Biggest gap per module

| Module | Biggest gap |
| --- | --- |
| 5.2 (5.2.1-5.2.4) | 5.2.2 leans on `world.gravity.y = 0` as "the line from 5.1.20", but nothing in 5.1 teaches it and 5.2.6 Gravity comes later; the 5.2.1 reading's own formula `floor(random(low, high + 1))` is refused by 5.2.3 r3 when written `floor(random(1, 6 + 1))`. |
| 5.3 | 5.3.7 and 5.3.10 cannot be done as written: on the lab's own table the ball rolls off the left edge and never touches the goal, so the score stays 0 for the starter AND the reference. The "races" demo and "score reads exactly 3" check are unobservable. |
| 5.4 | 5.4.7 grades only a `for...of` over `pipes` in one operand order. Reusing 5.4.6's own index loop (`pipes[i].x < bird.x`) scores 0/3. Close second: 5.4.8 never says to gate the world on `playing`, a literal answer scores 3/3 and then keeps spawning pipes after Game over. |
| 5.5 | 5.5.7 promises "following your own tail ... is a challenge for the end of the module"; 5.5.11 has no such challenge. Graders 5.5.6 r3 / 5.5.8 r1 refuse `score++` and index-loop `isBody`, the shapes 5.3.7 r2 and 5.4.6 modelled. |

## TRANSFER findings (pair of lessons each)

### Forward / backward references

- **5.2.1 -> 5.1.14 (backward, drifted).** "You saw it move a sprite in 5.1.14." 5.1.14 is `Key names: WASD and the arrow keys`. The `frameCount` example is 5.1.15 Worked Example: Keyboard Movement (dir `5-1-14-example-keyboard`; the dir number was copied instead of the title number). Same page says `frameCount` is `1` on the first frame (true when Run: logs 1, 2); 5.1.15 says it "starts at 0".
- **5.2.2 -> 5.1.20 (backward, never landed).** "`world.gravity.y = 0;` is the line from 5.1.20." 5.1.20 is `Make it Move`; no 5.1 lesson contains `gravity`. First teaching is 5.2.6 (title) which sits AFTER 5.2.2-5.2.4, yet those starters already carry the line and 5.2.2 tells the student to "take the line out and every square falls".
- **5.5.7 -> 5.5.11 (forward, never landed).** "Real Snake lets you follow your own tail. That is a challenge for the end of the module." 5.5.11 offers faster snake, best score, double-turn. None is the tail challenge.
- **5.3.6 vs 5.3.5 (prose number).** 5.3.5 says the per-frame score adds "sixty points a second"; 5.3.6 Step 1 says "several hundred within a second".
- Number-shaped citations in 5.2-5.5 all resolve to the right title except the two above (swept every `N.N.N` in content.md, lesson.json, starters; prose "in 5.x" mentions resolved by hand: 5.3.8 bumpers `worth` ok, 5.4.5 "bumpers were in 5.3.8" is loose, 5.3.8 only `push`es them once, the array idea is 3.2/3.3, ok enough).

### Seams

- **frameCount % n (5.2.1 -> 5.4.6 -> 5.5.2/5.5.4):** carries with a one-word edit. Good. (5.5.11 r1 then needs a variable `beat`, names are given in the text: fine.)
- **Edge detection with a flag (5.3.5/5.3.7 -> 5.3.8 -> 5.4.7 `passed`):** the idea carries. The 5.4.7 step even cites 5.3.5. Graders do not carry it (below).
- **Arrays (3.2/3.3 -> 5.3.8 `bumpers` -> 5.4.6 `pipes` -> 5.5.6 `segments`):** push/pop/unshift all taught in 3.2.2, 3.3.6. `splice` taught only in 3.7.19 (3.6.14 says "you only need to read" it) and then re-taught in 5.4.5: ok.
- **5.3.9/5.3.10 `if (playing) {...} else {...}` -> 5.4.8:** broken transfer. 5.3.10's hint says put one `if (playing)` at the top of `draw()`. 5.4.8 step 2 says "Do it once, at the moment of the crash" and never repeats the gate. Literal answer (flag, collision test, freeze, R reset; no wrapper) = 3/3, then in the browser new pipes keep arriving after "Game over", pile onto the frozen bird, and the score keeps counting. 5.4.8 starter has no `if (playing)` to copy.
- **5.2.1 `floor` -> 5.3 starters (name collision):** 5.2.1 teaches `floor(random(...))`. Every pinball starter/solution declares `let ... floor` for the floor sprite (5.3.3, 5.3.4, 5.3.7, 5.3.10, 5.3.12, and the reading 5.3.2). Verified by Run: `floor(random(1, 7))` in 5.3.8 throws `TypeError: floor is not a function`. Latent today (no 5.3 step asks for random) but any 5.3.12 "make it yours" idea that reuses 5.2.1 crashes with a message nothing explains.

### Behaviour vs prose (Run)

- **5.3.7 Step 1/3 (and 5.3.4, 5.3.10):** table = bumper (200,160) rotated -12, goal (330,250), ball from (200,40), bounciness 0.9. Ran starter, reference, and three R presses: ball bounces left and off-canvas every time, goal never touched, score 0. Text says "push the ball into the gold block: the score races" (no way to push) and "score should read exactly 3". 5.3.10 Game over always shows `score: 0`, so "restart puts the score back" cannot be seen. 5.3.4 step 4 says goal "somewhere the ball could reach": the reference puts it where the ball cannot. 5.3.8 (different table) works: reference reads 120 after 8 s.
- **5.4.6 Step 3 / 5.4.7 Step 1-2:** `pipes.length` text and `score:` text sit at x=20..~150 and sprites draw over p5 text. The pipe that is passing the bird covers the digits at the moment the score rises ("scor" seen in a screenshot; `pipes: N` hidden behind a pipe). "Watch the score rise by exactly one as each pipe slides behind the bird" is unwatchable.
- 5.2.1 "same random number on every Run": true (verified, identical first 3 values each Run). 5.2.4 frame-70 claim (`on` false at 70): true. 5.5.2 "7 steps a second" at %8: true.
- 5.3.10 hint "`ball.y > 400` ... below a 400-tall canvas": reachable only because the ball rolls off the left side (floor spans the whole width); not explained.

## GRADER vs the course's own model

(all measured with the real `grade()`; each needs a REJECT twin: the untouched starter and a lab with the step undone)

| Lesson / req | Refused answer | Taught where | Note |
| --- | --- | --- | --- |
| 5.2.3 r3 | `floor(random(1, 6 + 1))` | 5.2.1 rule "`floor(random(low, high + 1))`" | course's own formula |
| 5.2.3 r4 | `floor(random(0, colors.length))` | 5.2.1 two-argument random | 5.2.1 shows `random(min,max)`; only `random(colors.length)` accepted |
| 5.2.3 r1/r2 | `let nx = random(30,370); coin.x = nx;` | 5.2.1 "One line, one number: `const pick = ...`" | the reading models the intermediate variable for colour |
| 5.3.4 r2/r4 | `"static"` double quotes; `goal.collider = 'static'` after creating; goal named anything but `goal` | quotes 1.2; `.collider` 5.2.12; step 4 never names the variable `goal` | r4 needs `goal = new Sprite(...'static'` literally. r1 "Gravity is on" also passes `world.gravity.y = 0` |
| 5.3.7 r2 | `!wasTouching && touching`; nested `if (touching) { if (!was) }`; `touching === true && was === false`; `score = score + 1` | 5.3.5 shows only `touching && !wasTouching` | order and spelling |
| 5.3.7 r3 | memory variable named `prev`/`lastFrame` | step never names it (hint does) | LHS must contain "touching" |
| 5.3.8 r1/r3 | `for (let i = 0; i < bumpers.length; i++)` with `bumpers[i].worth`; `forEach`; `score = score + b.worth` | index loop is the loop 5.4.5 later models, 3.3.5 teaches for / for...of | r1 for...of only |
| 5.3.10 r2 | `ball.y >= 400`; `ball.y > height`; `gameOver = true` | `>=` Unit 2; 5.3.9 calls it "a game-over flag" | only `ball.y > N` ... `= false` |
| 5.3.10 r3 | restart in a `restart()` function | n/a before 5.5 | 5.5.6's own reference does exactly this |
| 5.4.4 r1 | `kb.presses('space')` | 5.1.13 "Common key names: ... 'space'", 5.3.5 table `kb.presses('space')` | only `' '` accepted; 5.4.1-5.4.3 use `' '`, earlier lessons use 'space' |
| 5.4.4 r3 | `bird.y >= 400 \|\| bird.y <= 0`; `bird.pos.y = 200`; `bird.y = height / 2` | `>=` Unit 2, `pos` 5.1.10 | `>` or `<` then digits only |
| 5.4.6 r2 | `const pipe = makePipe(); pipes.push(pipe);` | 5.2.1 intermediate variable | literal `pipes.push(makePipe())` |
| 5.4.6 r3 | `pipes.splice(i,1)` before the two `.delete()`s | 5.4.5 shows delete,delete,splice and says "two things have to go" | order |
| 5.4.7 r1/r2/r3 | `for (let i...) pipes[i].x < bird.x && !pipes[i].passed`: **0/3** | exactly the loop 5.4.5 and 5.4.6 modelled | worst case in the block |
| 5.4.7 r2 | `!p.passed && p.x < bird.x`; `bird.x > p.x`; `p.x <= bird.x`; `p.passed === false` | 5.3.5 | operand order / spelling |
| 5.4.7 r3 | `score++`; `p.passed = true` before `score += 1` | 5.3.7 r2 accepts `++`, so the block is inconsistent | |
| 5.4.8 r1 | untouched starter already passes ("a flag says whether the game is played") | starter has `p.passed = true;` | pattern `\b\w+\s*=\s*true\s*;` is vacuous here (5.3.10 r1 is fine because its starter has none) |
| 5.4.8 r2/r3 | `p.colliding(bird)`; `gameOver = true`; `kb.presses('R')`; restart via `restart()`; empty with `splice(0)` or `pop` loop | `colliding` is symmetric in 5.3 | |
| 5.5.4 r2 | `dy !== 1` style guard, `dy == 0` | 5.5.4 says `=== 0` | only `===` |
| 5.5.4 r3 | check the next cell before moving (`const nc = head.col + dx; if (nc < 0 ...)`) | 5.5.6's own `step()` reference does this | pattern needs the words col/row |
| 5.5.4 r1 | `kb.pressing`, WASD | 5.1.13/5.1.14 teach both | step says arrow keys; low severity |
| 5.5.6 r3 | `score++`; `food.delete(); food = makeFood(); score += 1`; `const nf = makeFood(); food = nf` | 5.5.5 reading | |
| 5.5.6 r2 | `segments.splice(segments.length - 1, 1)` for the tail | 5.4.5 splice | |
| 5.5.8 r1 | index-loop `isBody`, `found` flag, `.some(...)` | 5.4.5 index loop | for...of only |
| 5.5.8 r3 | `if (isBody(col,row)) return makeFood();` / `while (true) { if (!isBody) break; ...}` | 5.5.7 shows one shape | requires `while (isBody(` |
| 5.5.11 r1/r2 | `beat = beat - 1`, `beat--`, `best = max(best, score)`, `if (best < score)` | | challenge, optional; `beat -= 1` and `max(3, beat - 1)` pass |
| 5.2.4 | `70 -> 40` (still inside `if (on)`) refused: correct. `% 300 === 0`, `Math.floor(frameCount/60) === 5` refused: correct (not one-shots). Everything else tried (if/else flip, variable gap refused only for r1/r2 when `% gap`) | | 5.2.4 is the best-tolerance lab in the block |

Starters: every graded starter scores below full. Two are not zero: 5.4.6 r2 (starter already calls `pipes.push(makePipe())` once) and 5.4.8 r1 (above).

## Worked cleanly

5.2.1, 5.2.2 (prose aside from the 5.1.20 pointer), 5.2.4 (grader), 5.3.8 on Run, 5.3.9 reading, 5.4.2-5.4.5 readings (numbers: 90 frames = 1.5 s, about 2-3 pipes alive: true), 5.4.6 on Run, 5.5.2-5.5.3, 5.5.5, 5.5.7 prose, plan screens (5.3.1, 5.4.1, 5.5.1 ask nothing untaught).

## Not checked

AI-graded plan/playtest verdicts, 5.2.5-5.2.20, quizzes 5.4.10/5.5.10, the 5-5-N "5.8 Inside a Class" lessons (different module).
