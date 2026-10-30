# Beginner lens, round 2: modules 5.2, 5.3, 5.4, 5.5

Date 2026-10-30. Session `r2-beginner`, dev server :3002, cookie `dev_student=r2beginner`. Closed at the end.

Method, honestly stated:
- To get past the linear lock I POSTed `completed` for every 5.2-5.5 lesson to the dev stub, then jumped straight to each page. A real student would have walked the sequence. Lock behaviour itself was not tested.
- Code was injected into CodeMirror (select-all + insertText) and Run clicked. Nothing was typed line by line.
- Every lab with requirements (22) was run twice: starter, then reference solution.
- 18 "taught-but-differently-shaped" variants were run (listed below).
- Every "N.N.N (Title)" and "N.N.N Kind: Title" citation, and every bare N.N.N mention in these four modules' content.md and lesson.json, was resolved against lesson titles by script (211 titled citations, plus a manual read of the bare mentions).
- NOT verified: AI grading (no grader on dev; the 5.2.18 Check button fell back to the pattern check). AI screens 5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1 and 5.5.9 were not re-read this round.
- NOT run: the 5.3.5 "delete the line" experiment (judged by reading the code only), the 5.3.10 `gameOver = true` flag variant, and the 5.4.7 "set passed before scoring" variant. Whether the 5.2.20 second goal is reachable above y=200 was not played.

## Baseline

Every starter is 0/N on Run, except 5.2.20, which is 1/4 on the untouched starter (see N4). Every reference solution is full on Run, except 5.2.18, which needs Check; its Run behaviour is now explained (see round-1 item 18).

## Round-1 findings, one by one

```
QUIT POINT (round 1): 5.2.16 Reaching the Goal, seven actions in one step, example after the lab.
  FIXED.
  - The lab is now 5.2.17 and has three steps: guard `if (goal)`, measure the distance, win once.
  - The worked example is now 5.2.16, so it comes BEFORE the lab.
  - The example's step 2 shows dx/dy/dist and cites 3.1.7 Worked Example: Refactoring calcDistance, which exists.
  - The lab's hints point to 5.2.16 and 5.2.15 correctly.
  - The reference is 4/4 in the browser.
  - The starter comments say "(as in 5.2.16)".
```

| # | Round-1 finding | Status | Evidence |
|---|---|---|---|
| 1 | 5.3.7 grader refuses swapped order, `=== true/false`, other names, `score++` | FIXED | `!wasTouching && touching` 3/3. `touching === true && wasTouching === false` 3/3. Rename to `prev` 3/3. `score++` 3/3. |
| 2 | Quote style (5.3.4, 5.4.4, 5.5.4) | FIXED | 5.3.4 with every `'` turned into `"` is 4/4. 5.5.4 with `kb.presses("up")` is 3/3. |
| 3 | 5.3.10 `>=` / `> height` | FIXED | `ball.y >= 400` 3/3, `ball.y > height` 3/3. The `gameOver = true` flag was not run. |
| 4 | 5.4.7 `score++`, swapped, `=== false` | FIXED | All three 3/3. |
| 5 | 5.4.4 `bird.y = height / 2` | FIXED | 3/3. |
| 6 | 5.5.8 index loop | FIXED | `for (let i...; segments.length...)` is 3/3. |
| 7 | 5.3.12 second goal must be named `goal2` | FIXED | The challenge says "call it anything you like". A `secondGoal` with its own `.colliding(secondGoal)` is 1/1. |
| 8 | 5.2.16 citations point at the wrong reading | FIXED | Every citation resolves to the right title. The script flagged 21 "BAD" hits, all false positives from my regex swallowing trailing text such as ": a single-fire win check". |
| 9 | "Write one sentence in the notes" has no notes area | FIXED | It now says "a `//` comment at the very top of your code" (5.3.12, 5.4.11, 5.5.11). A comment is not graded. |
| 10 | 5.3.12 challenge 2 produces a falling bumper | FIXED (text) | It now says keep it `'static'` and move `x` yourself, with a code sketch. I did not run the sketch. |
| 11 | 5.3.5 "Try this" is false | FIXED in prose, not executed | The text now says deleting the update line makes the score race again, and `!wasTouching` is always true. The code reasoning is right: `wasTouching` stays false forever. It also adds the second experiment: update inside the `if`, so R never adds a point. I did not run either. |
| 12 | 5.4.8 does not freeze | FIXED | Step 3 now says outright to wrap the flap, edge check, beat spawn and both pipe loops in `if (playing)`. r5 and r6 now check for it. I ran the reference, waited for a crash, then took two screenshots 5 seconds apart: pixel-identical, "Game over" shown, pipes stopped, no new pipes. |
| 13 | Pinball ball never reaches the goal | FIXED | 5.3.7 table: the ball lands on the slope and the gold bar, score 1. Then 3 R presses, 6 s each, give exactly 4, as step 3 promises. 5.3.8, three bumpers: the score reached 16 with the worth values, so every bumper is hit. |
| 14 | Challenge labs cannot pass without doing all of them | FIXED | 5.3.12, 5.4.11 and 5.5.11 each have one card ("any one"). Tested `if (score > best) best = score;` (5.3.12, 5.4.11, 5.5.11), `beat = beat - 1` (5.5.11) and `gap = 200 - score * 5` (5.4.11): all 1/1. |
| 15 | 5.2.1/5.2.2 mis-citations (5.1.14, 5.1.20) | FIXED | 5.2.1 now cites 5.1.15 (Worked Example: Keyboard Movement). The 5.1.20 claim is gone. |
| 16 | 5.2.20 "refactor coming in §5.4" is a wrong forward reference | FIXED | It now says "that comes later, once you have classes". |
| 17 | 5.5.4 step 3 hides the else re-nesting | FIXED (text) | The step now says the two pixel lines already in the starter go in the `else`. A hint shows the shape. |
| 18 | 5.2.18 Run does not mark cards, no explanation | FIXED | Step 4 and a line under the toolbar both say it. There is a "Check" button. With no grader the fallback pattern check marked 4/4 on my earlier draft. |
| 19 | 5.5.6 60-line starter jump | IMPROVED | The starter now carries a header comment, a comment above each helper, and an inline note that `return` ends step(). The step text names the five functions. A function that returns a sprite and is called from three places is still never shown before this, but the comments carry it. |
| 20 | `let ... floor ...` shadows the p5 `floor()` | NOT FIXED | The 5.3.7 starter still has `let ball, bumper, floor, goal, score;`. The first student who adds a random spot to a challenge gets "floor is not a function". |
| 21 | 5.5.4 r1 only checks `'up'` | NOT RE-CHECKED | |
| 22 | AI rubric inconsistency 5.5.1/5.5.9 vs the "be generous" screens | NOT RE-CHECKED | |
| 23 | 5.2.5 slides placeholder "aren't published yet" | NOT RE-CHECKED | |

## New findings

N1. **5.2.17 never tells the student which keys move the player.** The lab's player uses `a`/`d`/space. The example, 5.2.16, uses the arrow keys. Step 3 says "walk into the gold block" and nothing in the lab names the keys. The comment in the starter does not either. 5.2.20's first step does say "a and d, space bar". Add the same line to 5.2.17.

N2. **5.2.20 "above the wind zone (y less than 200)" contradicts the scene.** In this scene `y < 200` IS the wind zone (`if (player.y < 200) applyForce(0, -3)`). A beginner reads "above the wind zone" and puts the goal at y = 50 or so, which is inside it. I did not play it, so I cannot say whether the player can reach it.

N3. **5.3.9 reading cites a title that does not exist.** It says "Read before `5.3.10 Lab: Lose and start again`", but the real title is "Lab: Lose, and start again" (comma). It is cosmetic, but it is the one citation that does not resolve exactly.

N4. **5.2.20's starter shows 1/4 on Run before the student has done anything.** r1 is "a canvas is created", and the starter already has one. It is harmless. The challenge is optional, so a student sees a card go green and may assume progress.

N5. **5.4.8: after a crash a frozen pipe can sit on top of the score text** (seen in the screenshot: "score:" with the number hidden behind a pipe). Sprites draw over `text()`. Step 3 tells the student "the score should stay where it was", but they may not be able to read it. A beginner will think the score vanished.

N6. **The renumbered citations are all consistent.** 5.2.16 is the example, 5.2.17 is the lab, and every "5.2.16", "5.2.17" and "5.2.18" mention in 5.2-5.5 resolves to the right lesson. The 5.2.2 "gravity gets its own reading in 5.2.6" also resolves. No breakage came from the swap.

N7. **Lesson ids no longer match their displayed numbers** (for example `5-2-11-lab-reaching-the-goal` is 5.2.17, and `5-5-1-reading-three-places` is titled 5.8.1 in another module). Students do not see ids, so I am not counting this against the course.

## Verdict per module

- **5.2: clean, bar two nits.** Biggest remaining gap: 5.2.20 says the goal goes "above the wind zone (y less than 200)", which is inside the wind zone (N2). The lab also never names its movement keys (N1). Both are one-line fixes.
- **5.3: nearly clean.** Biggest remaining gap: the `floor` variable shadowing the p5 `floor()` function (#20, NOT FIXED), a trap for the first random-position challenge. The pinball geometry, the 5.3.5 prose, the lax graders and the one-card challenge are all fixed.
- **5.4: clean.** The freeze really freezes and the graders accept every taught shape I tried. The only item is cosmetic: the score is hidden behind a frozen pipe (N5).
- **5.5: clean on what I ran.** All five labs are green, and quote style, index loop and `score++` are accepted. Not re-checked: the 5.5.4 `'up'`-only card and the 5.5.1/5.5.9 AI rubric strictness (#21, #22), so I will not call it fully clean.
