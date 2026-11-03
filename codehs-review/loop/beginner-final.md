# Beginner lens, FINAL pass: 5.2, 5.3 (1-12), 5.4, 5.5 (Snake 1-11)

Date 2026-10-30/31. Session `f-beginner`, dev server :3002 (DEV_ROLE=student), cookie dev_student=fbeginner, commit 51139eb7. Lock ON, no stub POSTs.

STATUS: in progress (this file is appended as I go).

## Log

Method notes: lab code is INJECTED into CodeMirror (select all, insertText), not typed line by line. Each lab gets the taught answer (usually the reference) and, where noted, one differently shaped answer. Each Submit goes through the real "Submit" then "Confirm Submission". Lock was ON throughout; every lesson was finished through its own UI.

### 5.2.1, 5.2.2 (reading, example)
Read and marked complete. 5.2.1 explicitly says it is the place `random`/`floor` are taught ("If you do not remember it, nothing is missing"). Clean.

### 5.2.3 Lab: A random spot and colour
Reference: 5/5. Variant (`floor(random(6)) + 1`, one-line colour pick, double quotes): 5/5. Submit unlocks 5.2.4. Clean.

### 5.2.4 Lab: A beat and a one-shot (grader changed)
Variant: `if ((frameCount % 30) === 0)` with extra parentheses, if/else with `on === true` / `on = false` / `on = true` instead of `!on`, double quotes, `if (frameCount == 70) console.log("Almost!");` with no braces: 5/5. Accepted. Submit unlocks 5.2.5.
Note: step 1 text says only "flip the variable between true and false". `on = !on;` appears only in the hint; the if/else shape is the safe taught-by-the-step one and is accepted.

### 5.2.5 Slides: Physics Feel (the new deck)
LOADS: embedded iframe, 918x516, 12 `<section>`s, no "Slides blank?" notice, fragments reveal on arrow keys, "Open in new tab" present. Completes normally (counter 4/20).
Term check, slide by slide (first-use slide in brackets):
- dynamic/static [4]: defined on the slide, with the `'static'` fifth argument shown. dial/"setting dials" [3] is a metaphor, then made literal on 5, 8.
- `world.gravity.y` [5]: a three-row table gives 10 / 0 / -5, with "bigger y is further down". Good.
- `kb.presses`, `colliding` [6]: both defined in Table 2 on the slide that first uses them; `' '` explained.
- `&&` [7]: explained on the same slide. 
- bounciness, friction [8]: defined, with a 0/higher table.
- `Math.sqrt`, `dx * dx` [9]: `Math.sqrt` glossed as "the square root", and the slide points back to 3.1.7 for the distance formula. It does not re-explain WHY dx*dx + dy*dy is a distance. A student who skipped or forgot 3.1.7 can copy it but not read it. Minor. "like the one-shot in 5.2.1" points back to a lesson the student has done (5.2.1, taught).
- Slide 10 says "Every piece is on one of the slides before this one." The "reset key that puts the ball back near the top" has pieces (kb.presses on 6, assigning a position from 5.1) but no slide shows a reset. Minor, the 5.2.18 lab text carries it.
- Slide 10 says "bumpers, ramps, or walls"; nothing before teaches tilting a sprite into a ramp. Not required, an optional word.
- No term is used before its slide, except lesson-number previews ("5.2.6 preview", "5.2.16") which are labels, not content.
Deck verdict: clean for ordering. Only the 3.1.7 pointer on slide 9 is soft.

### 5.2.6 to 5.2.20, summary table
| Lesson | Starter | Taught answer | Differently shaped answer(s) | Submit |
| --- | --- | --- | --- | --- |
| 5.2.6 Reading: Gravity | n/a | complete | | ok |
| 5.2.7 Falling Block | 0/1 | gravity 20 -> 1/1 | I also did steps 3 and 4 (removed 'static', added a second block) and left gravity at 20: still 1/1 | ok |
| 5.2.8 Tune Gravity | 0/1 | gravity 0 then -5 plus a `//` sentence -> 1/1 | | ok |
| 5.2.9 Reading | n/a | complete | | ok |
| 5.2.10 Add a Jump | 0/4 | 4/4 | `((kb.presses(" ")) && (player.colliding(ground)))` with double quotes: 4/4; no-braces one-liner with the two checks swapped: 4/4 | ok |
| 5.2.11 Reading | n/a | complete | | ok |
| 5.2.12 Bouncy Ball | 0/4 | 4/4 (reference) | double quotes, bounciness 1, friction 0, plain gray walls: 4/4 | ok |
| 5.2.13 Reading | n/a | complete | | ok |
| 5.2.14 Wind Zone | 0/3 | 3/3 | no braces / -50; `((player.y) <= 200)` with no semicolon; reversed `200 > player.y`: all 3/3 | ok |
| 5.2.15 Reading | n/a | complete | | ok |
| 5.2.16 Example | n/a | complete | | ok |
| 5.2.17 Reaching the Goal | 0/4 | 4/4 | `let d`, `(dx * dx) + (dy * dy)`, `(d <= 25)`, double quotes: 4/4; fully inline distance with three one-line ifs: 4/4 | ok |
| 5.2.18 Pinball Scene (Check) | Run 0/4 (page says so) | pattern fallback after "grader isn't responding": 4/4 | bounciness 0.8 exactly, `let b1/b2/b3`, space bar as reset: 4/4 | ok |
| 5.2.19 Vel vs applyForce | AI-graded, read only | typed an honest two-part answer; grader outage message "saved and sent to your teacher" and the lesson still unlocked 5.2.20 | | ok |
| 5.2.20 Challenges | 0/4 | 4/4 (reference) | see GRADER finding below | ok |

GRADER (5.2.20, optional stretch, card "Track collection progress"): taught `collected += 1` / `collected++` / `collected = collected + 1` with `collected === 2` / `== 2` / `((collected === 2))` / `!goal1 && !goal2` are all 4/4. Refused with 3/4: `collected = (collected + 1);`, `if (2 === collected)`, `if ((collected) == 2)`. The first and third are extra-parentheses shapes; the regex needs the variable name touching the operator. Low severity (optional stretch), but the round-5 "parentheses-tolerant" claim does not cover a bracketed counter.

CONFUSING / CONTRADICTORY (5.2.16 Worked Example, Step 3): "without player.colliding(ground), holding space would relaunch the player every frame it's held, even mid-air." But kb.presses fires ONCE per press (5.2.9, and slide 6/7 of the deck: "Hold the space bar down: kb.presses(' ') is true once"). The deck says the real failure is tapping fast mid-air. A student who just learned "presses = once" reads a contradiction. Should read "pressing space again and again mid-air".

VOCABULARY (readings, not needed for any lab): 5.2.9 "edge-triggered" / "level-triggered" (never defined in words; the lab 5.2.10 card titles repeat "edge-triggered", though its step text adds "fires once per press"); 5.2.11 "restitution", "geometric mean"; 5.2.13 "Newtons", "respects mass", "additive". None blocks.

5.2.19 text: "every criterion must be met for the lesson to count as complete" vs the lesson being 0-point. The sentence is the generic rubric preface; harmless but a student may think a miss locks them.
