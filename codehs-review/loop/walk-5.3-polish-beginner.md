# Beginner walk: 5.3.15-5.3.21 (Pinball polish)

Lens: struggling beginner, knows only 5.1-5.3.14. Dev server, teacher role, headless session `w53b` (closed).
Pages walked: all seven. Labs typed in the editor with real keystrokes (5.3.17, 5.3.19, 5.3.21), Run, then Check.
The AI grader was offline in dev ("The grader isn't responding... pattern check marked your cards instead"), so the regex path is what was exercised. 5.3.20 (AI-graded written part) could not be submitted; page and rubric only read.

## QUIT POINT

5.3.21 Challenge 3, "a `round` variable". A student who types `let round = 1;` exactly as the step says gets, on Run:
`There is a typo near line 11: Identifier 'round' has already been declared`.
`round` is already a name in the sketch environment (p5 `round()`). The error says "typo" and nothing else, no student can fix it, and Check still turns the card green on the pattern, so the lab shows 1/1 while the sketch does not run. Verified in the browser.

## Ranked defects

### D1 (BLOCKING, 5.3.21 challenge 3) `round` is a reserved-in-practice name
- Evidence: step text says "a `round` variable that starts at 1". `let round = 1;` at top level -> SyntaxError (above). Check was green anyway (r1 pattern passes), so the student also ships a lab that cannot run (Submit needs "run with no error", so they are stuck at Submit rather than at Check).
- Fix: rename in the step to `roundNumber` or `level`, and say why in one line ("round is already used by moSHion, pick another name"). Add `level` to the AI/regex description ("a round counter that R raises"). Consider making the error text name the cause: "that name is already used by moSHion".

### D2 (ORDERING/accuracy, 5.3.18 gravityScale demo) label `0` never draws
- Evidence: the demo sets `c.text = c.gravityScale;` (value 0). The red ball shows no label; the gold shows 0.5, the blue shows 1. The reading says each ball wears its value and "What you'll see... The red one (0)". `.text = 0` is falsy and draws nothing.
- Fix: use `c.text = '0'` (string) in that demo, or label with `'scale ' + c.gravityScale`. Add one sentence to 5.3.15 ("`.text = 0` shows nothing; write `'0'`"), since a student relabelling a bumper with worth 0 will hit it too.

### D3 (LAYOUT, labs at 1280x720) canvas bottom is cut off
- Evidence: 5.3.17/19/21 canvas is 440x420; the preview pane at 1280x720 shows only the top ~300 px (ground and the 10-point bumper are clipped; in 5.3.19 with the Quest panel open the 10 bumper sits on the bottom edge). The step says "a drop should score 16" and the student cannot see the ground/last bumper without scrolling the page.
- Fix: scale the preview to fit the pane, or shorten the lab table, or tell students to scroll.

### D4 (UNSHOWN STEP, 5.3.17-5.3.21) keyboard focus for R and arrows
- Evidence: steps say "click the game and press R" but the starter text on canvas is the only cue; a student who clicks the code editor then presses keys types into the file. Works as written (I clicked the canvas), only the hint line in 5.3.17 s4 mentions it once. 5.3.19 s1 repeats it. Low severity, listed because a held-key push is the first lab where focus matters for a hold, not a tap.
- Fix: none required; optional: add "Click the game first" to the 5.3.21 challenge text.

### D5 (LAX GRADING, accepted shapes) all honest shapes passed
- 5.3.17: typed all taught lines; 1/3 after step 1, 2/3 after step 2, 3/3 after `pop.life = 40;`. Card order and "still needed (n)" counts were accurate.
- 5.3.19: `kb.presses` (the shape the reading warns against) correctly fails card 1 with a useful hint, 2/3. `kb.pressing` with braces passes 3/3.
- 5.3.21: challenge 1 exactly as shown (pops list, loop in draw) -> 1/1. Challenge 3 with `round = round + 1; if (round >= 2) { ball.mass = 3; }` -> 1/1.
- No grader too strict found. (Too loose is the advanced lens's, e.g. any `frameCount` in the file satisfies 5.3.21.)

### D6 (MINOR, 5.3.21 challenge 1) fade code can break silently
- The step text hardcodes `p.life / 40`, while 5.3.17 s3 told the student to pick any `.life`. A student who used 60 gets `opacity` above 1 for the first frames and the fade starts late; nothing says "use the same number".
- Fix: add "use the same number you gave `pop.life`".

### D7 (MINOR, 5.3.19 s3 and 5.3.18) green outline barely visible on the ball
- In the reading's debug demo the shelf and ground outlines show clearly; the ball's own outline is thin and sits under the blue circle, so "a green outline appears around the ball" is hard to see in the lab.
- Fix: say "a thin green ring on the ball's edge".

### D8 (MINOR, 5.3.16 wording) "press R to drop the ball"
- In the worked example the ball is already falling when Run is pressed; "press R to drop" is only for a second drop. Harmless.

## Vocabulary / prerequisite check (every reference resolved)

- `.text`, `.textColor`, `.textSize`, `.life`: defined in 5.3.15 before use. OK.
- `.opacity`: defined in 5.3.21 itself, before use (not in 5.3.15). OK but the Help link on its card points at 5.3.15 and 5.3.18, neither of which mentions opacity. Fix: point at the challenge step or add one line to 5.3.15.
- `frameCount % 120 === 0`: cited "from 5.2.1"; 5.2.1 (5-2-random-1) does teach `%` and `frameCount % N === 0`. OK.
- `kb.pressing` cited 5.1.13, `applyForce` cited 5.2.13, `collider = 'none'` 5.2.16, `.delete()` 5.2.15, `vel` 5.1.15, `rotationSpeed` 5.1.22: lesson titles exist in the course; not individually re-opened (only 5.2.1 verified).
- `.mass`, `.gravityScale`, `.rotationLock`, `.debug`: all defined in 5.3.18 before 5.3.19/21. `.density` mentioned and dismissed ("This course uses .mass"). OK.
- `!ball.debug` explained in the debug demo text. OK.

## Worked cleanly

- 5.3.15: both live demos run; box turns, 5 stays upright, BONUS shows black; spark demo makes one per press.
- 5.3.16: both examples run; the popup appears; the smear example shows the gold column the text describes (a "+2" tall column above the bumper).
- 5.3.17: Run after step 1 shows 1, 5, 10 on the bumpers; popups; score 16 after a drop.
- 5.3.18: mass, gravity, rotationLock and debug demos run; pressing D draws green outlines on ball, ground and the invisible shelf as described (the mid-air stop is explained well).
- 5.3.19: nudge, mass, debug steps run and grade.
- 5.3.20: page renders, instructions and four-item rubric present, rubric items match the prompt; not submitted (grader offline in dev).
- Navigation: prev/next links across 5.3.14 -> 5.3.21 -> 5.4.1 are in order.

## Files
- /home/shuff57/Documents/GitHub/shCode/lessons/5-3-pinball-polish-7-challenges-polish-it-your-way/lesson.json (D1, D6)
- /home/shuff57/Documents/GitHub/shCode/lessons/5-3-pinball-polish-4-reading-four-physics-knobs/content.md (D2)
- /home/shuff57/Documents/GitHub/shCode/lessons/5-3-pinball-polish-5-lab-nudge-the-table/lesson.json (D7)
