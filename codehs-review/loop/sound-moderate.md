# cs-student-moderate lens: Sound and Music 6.11 (10 lessons)

Session `b611mod`, cookie `dev_student=b611mod`, dev server :3002 (DEV_ROLE=student). Lessons 1-7 then 8-9 marked complete through `/api/lesson-state`
to open 6.11.8 and 6.11.10; every row deleted afterwards, browser session closed. No lesson file edited; only this file written.

Method: the grader is `gradeWithTests` from `lib/run-tests-node.ts` (built with tsc into a throwaway dir, removed afterwards), fed each lab's `solution.js`
with one passage swapped for a shape the course itself modelled earlier (5.11.9 sound lab, 5.2.1 random, 6.3.3 presses, 6.5.x save/load, 6.6 switch
state machines, 6.10 paddle). About 95 shapes over 6.11.3, .4, .5, .7, .8, .10. Browser: the real editor, a real run of 6.11.8 (O, up x3, M, Stop, Run,
O: level 8 and sound off came back) and of the 6.11.10 all-three-challenges reference (no console error, game plays to the end screen).
Known and not a finding: coin.wav / music.wav are silent.

## Verdict: GAP LIST (no blocking gap; 1 low-medium text defect, 3 low, 3 informational)

All number-shaped citations resolve (5.1.13, 5.2.1, 5.9.5, 5.11.9, 6.3.3, 6.5.3, 6.5.5, 6.5.6, 6.6.7, 6.6.24 and the Help line of every card, and every
quiz `sourceIds`). Prose citations resolved by hand: "5.2.1 picked a random colour" (5.2.1 has `colors[pick]`), "the `? :` from chapter 2" (2.1.22
Reading: ternary), "6.5.6 loaded a high score with `|| 0`" (yes, that is its section "The first run: `|| 0`"), "6.6.24 saved the game in the place where the
state changes" (yes, saves right after `state = 'gameover'`), "the same family as 5.1.13, click the canvas" (yes). No forward promise is broken: 6.11.1
points at 6.11.2 and the labs, 6.11.6 at 6.11.7 and 6.11.8, 6.11.10 at the 6.11.8 game, and each lands.

## Transfer that carried (distance travelled)

- 6.11.3 from 5.11.9: load into `let` variables at the top, assign in `setup()`, `.rate = 0.5` for the low sound, `.play()` inside the event block. Zero
  new construct; the only edit is that 5.11.9 played from a class method and 6.11.3 plays from a plain `if`. Green: one-line `if`, `score++`, a helper
  `catchSound()`, `star.y > height` / `> 400`, either sound path, `thud.volume`. Red, correctly: the load in `draw()` (r1).
- 6.11.4 mute key is 5.11.9's optional step character for character (`if (masterVolume() > 0) masterVolume(0); else masterVolume(1);`): distance 0. Up/down is
  6.3.3's `presses`. Green: `min`/`max` and `constrain` clamps, `music.volume += 0.1`, a `muted` flag with `masterVolume(muted ? 0 : 1)`, one-line `&&` form,
  `loop()` under a T key (6.11.2's shape). Red, correctly: `kb.pressing` for the steps (r3), and `music.volume = 0` as "mute" (r4).
- 6.11.5 from 5.2.1: 5.2.1's `const pick = floor(random(colors.length)); coin.color = colors[pick];` becomes `const pick = floor(random(thuds.length)); thuds[pick].play();`:
  a one-word edit. Also green: pick in one line, `let i`, a helper `playThud()`, `random(0, thuds.length)`, `Math.floor(Math.random()*n)`, `round(random(2))`. Red, correctly:
  no `floor` (5.2.1's own trap), a fixed index, all three played, rate fixed or set in `setup()` (r1).
- 6.11.7 from 6.6: a student coming from 6.6's `switch (state)` writes `switch (next) { case 'title': ...; break; }` in `goTo`: 3/3, as are `if / else if`, a ternary rate,
  one `||` condition for title and game, and eight names for the function (`changeState`, `setState(newState)`, `enterState`...). Red, correctly: no `stop()` (r1), music in `draw()` (all three), `loop()` for a win (r3).
- 6.11.8 from 6.5: `storeItem('soundLevel', level)` / `getItem` at the start, saved in `soundChanged()` or inline in each key `if`, one `JSON.stringify` object (6.5.9 shape), or a
  raw object: all 4/4. Red, correctly: saving every frame in `draw()` (r3), `kb.pressing` steps (r1), `music.volume = level / 10` instead of `masterVolume` (r2).
- 6.11.10: streak, pan (`(star.x - 200) / 200`, `width/2`, `map()`), a rate that follows `score`, a block comment sentence for r1: green. The starter alone and a 3-word sentence: red.

## Findings

### G1. Low-medium: 6.11.3 step 1 names two variables the starter does not have
Step 1 says: "A catch ... adds 1 to `caught`; a star that falls past the bottom adds 1 to `missed`." The starter's variables are `score` and `misses`
(`let score = 0; let misses = 0;`, and the step 2 hint says `score += 1;`). `caught` and `missed` are only the labels `drawTop()` prints. A student who looks for the
backticked name in the code does not find it. Backward reference drifted from the spec's fixed-names table (`speed`, `score`, `misses`). Bridge: say `score` and `misses`
(or "the `caught:` and `missed:` counters").

### G2. Low: `.loaded` is first used in 6.11.2 with no teaching in 6.11.1
6.11.2's live block prints `chime.loaded` and `drawTop` shows `'chime loaded: ' + chime.loaded`. 6.11.1's text and glossary teach `.playing` but not `.loaded`
(moshion.d.ts has it: "0 until the file has downloaded and decoded"). The "What you'll see" paragraph says it "turns `true` a moment after Run, once the file has arrived", which
recovers it after the fact. Not required by any lab. Bridge: one glossary row in 6.11.1, or one clause in 6.11.2's code comment.

### G3. Low: 6.11.5 r2 and r1 refuse an intermediate variable, the axis 5.2.1 itself models
5.2.1 shows `pick = floor(random(colors.length)); coin.color = colors[pick];` (pick, then use the item). The card description promises "or the same in two lines, with any names", but:
- `const idx = floor(random(thuds.length)); const t = thuds[idx]; t.play();` grades r2 RED (`let i = ...; thuds[i].play();` is green).
- `const r = random(0.8, 1.25); chime.rate = r; chime.play();` grades r1 RED (r1 wants `random(` on the `.rate` line).
Both are plausible from 5.2.1's own "store the pick, then use it" habit. Bridge: let r2 follow one `const x = list[idx]` alias to a `.play()`, and let r1 follow one `const r = random(...)` alias into `.rate =`.

### G4. Low: 6.11.4 `level` and 6.11.8 `level` mean different things, and the 6.11.4 mute shape does not carry
6.11.4: `level` is the tune's volume, set with `music.volume = level / 10`, and M is a `masterVolume` flip (5.11.9's shape). 6.11.8: `level` is "how loud everything is" through
`masterVolume(muted ? 0 : level / 10)`, and M is a `muted` flag. 6.11.8 step 1 says so and r1/r2 are written for it, so the break is only for a student adapting from 6.11.4 instead
of reading. The grader accepts that adaptation and the game does not work: swapping the M body for 6.11.4's flip (`if (masterVolume() > 0) masterVolume(0); else masterVolume(1); soundChanged();`)
grades 4/4 (r2 "or masterVolume is set"), but `soundChanged()` calls `applySound()` on the same press, which sets `masterVolume(level / 10)` straight back, so M never mutes. Not a
transfer failure of the lessons (the step text gives `muted = !muted;`), but r2 turns green on a shape that mutes nothing. Bridge, optional: in 6.11.6 say one sentence that `muted` replaces 6.11.4's
`masterVolume()` flip because the level has to come back.

### G5. Informational: 6.11.8 r4 accepts the shape the lab teaches against (declared lax)
The lab, 6.11.6 and quiz question 8 all say `level = getItem('soundLevel') || 5;` is the bug (a saved 0 comes back 5). r4 grades 4/4 for:
`level = getItem('soundLevel') || 5;`, `level = Number(getItem('soundLevel')) || 5;` (the `Number(getItem(k)) || 0` safety net that 6.5.6 and the 6.5 worked examples model), `if (savedLevel)`, `typeof saved === 'number'`, and
even a bare `level = getItem('soundLevel');` (first run: `null`, so `masterVolume(null / 10)` is silent). The course's own 6.5 idiom is therefore the one this lab calls wrong, and the grader does not tell the student.
sound-fix-cases.md records the decision to keep it lax (feedback: grading is lax). Mention only so the choice is deliberate; the quiz and step text carry the teaching.

### G6. Informational: 6.11.7 `goTo` is new vocabulary, not a 6.6 model
6.6.7/6.6.24 and A16.2 model `state = 'x'` inline and `switch (state)` in `draw()`. `goTo(next)` appears in a 6.6 file only in the hidden 6.6.27 challenges solution. 6.11.6 introduces it with its own
snippet and the lab hands it over, so it is taught before asked (not a gap). The seam to know: 6.11.7's `draw()` is an `if / else if / else` chain, not the `switch` that 6.6 spent a unit teaching,
and 6.11.6 says "one `if` for each of the other screens". Both shapes grade green (above); no action needed.

### G7. Informational: ternary shown before it is named
6.11.4's starter `drawTop()` already contains `(masterVolume() > 0 ? 'on' : 'off')`; 6.11.6 later says "that is the `? :` from chapter 2" (2.1.22 exists). A reader sees it first as handed-over code; nothing asks the student
to write it until 6.11.8's `masterVolume(muted ? 0 : level / 10)`, which comes with the sentence. Fine.
