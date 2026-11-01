# Beginner lens: module 6.11 Sound and Music (round 1)

Date 2026-11-01. Commit 689f2e27. Own headless Chromium (Python Playwright), cookie dev_student=b611beg, dev server :3002 with DEV_ROLE=student, lock ON, no stubbed POSTs. Port 3002 was not listening when I started, so I started `server.js` myself (nothing killed); it is still running. Walked 6.11.1 to 6.11.10 in order through the real lock; every lesson ends "completed" and 6.11.10 hands on to 7.1.1.

Method. Each lab built one step (often one line) at a time, Run after each, Quest cards read after each run (green/red read from the card border colour). Code was inserted into CodeMirror through its view object, not typed key by key, so auto-indent and bracket-closing were not exercised. Sound was judged as if it played (two course files are silent, known). Play counts and state were read from the sketch (`state`, `music.playing`, `music.rate`, `level`, `masterVolume()`).

## QUIT POINT
None. Nothing in the module is unstartable. Every step is startable from the ledger (5.11.9 loadSound, 5.2.1 random/floor/list pick, 5.1.13 click-the-canvas, 6.3.3 presses, 6.5.3/5/6 storeItem/getItem, 6.6.7 state, 2.1.15 nested if) plus what 6.11.1 to 6.11.6 teach before use.

Nearest to a stop: 6.11.5 step 2 (a red `ReferenceError` mid-step, finding 2) and the two nested-if refusals (finding 3), where the student has the right idea and is told "not yet" with no way to see why.

## Findings

### 1. TEXT / UNDEFINED NAME. 6.11.3 step 1 names variables the starter does not have. MEDIUM
Exact text: "A catch (the star `overlaps()` the basket, 5.9.5) adds 1 to `caught`; a star that falls past the bottom adds 1 to `missed`."
The starter has `score += 1;` and `misses += 1;`. `caught` and `missed` exist only as the printed words in `drawTop()` (`'caught: ' + score + '   missed: ' + misses`). A literal student searches the code for `caught`, finds nothing, and cannot tell whether they are meant to add it. Step 2's hint says `score += 1;`, so the lesson contradicts itself. Fix: say `score` and `misses` in the code ticks (or plain words "the caught count").

### 2. PARTIAL RUN ERROR. 6.11.5 step 2, run after item 2 of 3. MEDIUM
Step 2 lists three changes (item 1 `let chime, thuds;`, item 2 the setup list, item 3 the miss block) and says "Run it" only after all three. A student who runs after each change (the lens rule, and what a beginner does) gets, after item 2 and the first miss a few seconds later, console red: `ReferenceError: thud is not defined  sketch.js:84:5  thud.play();`. After item 1 alone there is no error (sketch still runs). Nothing tells them the miss block is the cure; "defined" is not a word the course has taught. The error points at the very line item 3 changes, so it self-resolves, but it reads as failure. Fix: one sentence before the list, "Make all three changes before you Run; until the third, the old `thud.play();` has nothing to play."

### 3. GRADER REFUSES A TAUGHT SHAPE. Nested `if` for the level keys. 6.11.4 r3 and 6.11.8 r1. MEDIUM
Both cards stay red for this, which does exactly what the step says and behaves identically (checked: levels step, cap at 10):
```js
if (kb.presses('up')) {
  if (level < 10) {
    level += 1;
    music.volume = level / 10;      // 6.11.8: soundChanged();
  }
}
if (kb.presses('down')) {
  if (level > 0) {
    level -= 1;
    music.volume = level / 10;
  }
}
```
Same result with `level++` / `level--`. The same code written flat with `&&` (the step's shape), with `level = level + 1`, with no semicolons, or with `++`/`--` goes green, so only the nesting trips it. Nested if is taught (2.1.15, 2.1.16) and the step's own sentence ("when the up arrow is pressed and level is below 10") reads either way. Card text gives no clue ("Under kb.presses, one key raises the level..."). A student who rewrote the `&&` as two ifs loses the card with no reason. Fix: let the pattern enter one nested `if` under the `kb.presses` body (the fix-case note says the card "may enter one").

### 4. GRADER, LOW. 6.11.5 r1 refuses the number held in a variable first.
Red: `let r = random(0.8, 1.25);` then `chime.rate = r;` in the catch block. 5.2.1 teaches exactly this shape ("One line, one number: `const pick = floor(random(3));` asks once and keeps the answer"), and r2 of the same lab follows the `pick` variable. Green (checked): the step's line before `chime.play();`, the same line after `chime.play();`, `random(0.5, 2)`. Only the variable route is refused.

### 5. TEXT, LOW. 6.11.2
- "What you'll see: four lines of words." The preview shows five (two key-help lines, then `last chime key`, `chime loaded`, `tune playing`). Seen in the screenshot after Run.
- Try 4: "Move the line `tune.loop();` into `setup()`". On the page `tune.loop();` is the tail of `if (kb.presses('t')) tune.loop();`, not a line. A literal student has no line to move. (Reasoned from the code, not run: cutting only the tail leaves `if (kb.presses('t'))` followed by the X line, which still parses.) Say "the whole line `if (kb.presses('t')) tune.loop();`" or "the call `tune.loop();` at the end of that line".

### 6. COSMETIC, LOW. 6.11.8
The orange basket bar is drawn at the bottom of the Sound options screen (it is a sprite, so it shows on every screen). The step never mentions it; a beginner may wonder whether it is a bug. Seen in the 6.11.8 screenshot. Not blocking.

## Checked and fine (no finding)

- Citations, every one resolved by title: 5.2.1 (Random numbers and timers; teaches floor, list pick, `.length`), 5.1.13, 5.9.5, 5.11.9 (Lab: Sound effects), 6.3.3 (Input edges), 6.5.3 (storeItem), 6.5.5 (getItem), 6.5.6 (A saved number comes back a number, matches the `|| 0` and `!== null` talk), 6.6.7 (state variable), 6.6.24 (Save on State Transition), 6.10.13. Lab Help links 6.11.1 and 6.11.6 point at the right readings. Quiz sources 6.11.1, 6.11.2, 6.11.1 and 6.11.2, 6.11.1, 6.11.5, 6.11.6, 6.11.6 and 6.11.8 each match the topic of their question (q3 pressing/presses is Try 2 of 6.11.2; q4 loop-every-frame is 6.11.1 plus Try 3).
- Terms defined before use: Sound, `loadSound`, `play`/`loop`/`stop`, `.playing`, `.volume`, `.rate`, `masterVolume`, `goTo(next)`, `state` of screens, `storeItem`/`getItem`, `!==`, `? :` (chapter 2), `!muted`. The browser's click rule is stated in 6.11.1 and repeated at the first lab step that needs it (6.11.3 s2, 6.11.4 s1 hint, 6.11.7 s2 hint). No step needs content.md.
- Step to card: 6.11.3 (chime line turns card 1 green; play lines turn 2 and 3, one each), 6.11.4 (loop and volume cards, up-only stays red, up+down turns r3, `masterVolume(0)` alone stays red, full M turns r4), 6.11.7 (stop, title+play, won+lost; title alone leaves r2 red as the card says "one for the title and one for the game"), 6.11.8 (up-only red, up+down, M, save, load). No early green except the declared-lax ones (one load turns 6.11.3 r1 green; level-only load turns 6.11.8 r4 green).
- Behaviour checked in the running sketch: 6.11.4 loop starts, volume 0.4, up steps 4 to 5, caps at 10 after eight presses, down steps, M gives master 0 then 1. 6.11.7 title rate 0.8 looping, Enter gives play rate 1, win rate 1.25, loss rate 0.6, R back to title rate 0.8 looping. 6.11.8 saved level 7 and muted true come back after Stop and Run (before step 3: back to 5 and on, exactly as step 2 says), and a saved 0 comes back as 0.
- Quiz 6.11.9: 5 of 8 right gives "you need 6", each wrong question says "reread 6.11.x", key 3,0,2,1,2,3,0,1 gives "8 of 8 right, passed, moving on". Text "6 of 8" matches passPercent 70.
- Challenges 6.11.10: Challenge 1 as written (all four edits plus a sentence) gives both cards; the catch lines alone turn r1 green; `let streak = 0;` alone does not. Challenge 2 (`chime.pan = (star.x - 200) / 200;`) and Challenge 3 (`loadSound(..., { clips: {...} })`, `notes.play(...)`) each give r1; `pan` exists and `notes.play` is a function. A four-word `//` comment under the title line gives r2.
- Other taught-shape variants graded green: no semicolons, double quotes, `level = level + 1`, `if (muted == true) ... else ...` for M, `==` and `!= null`, `else if` chain on `state`, one combined `||` if in `goTo`, `thuds[floor(random(3))].play()`, `round(random(thuds.length - 1))`.
- No console errors at any partial run except finding 2.

## Verdict
GAP LIST: 1 and 3 are worth fixing before students; 2 is a one-sentence fix; 4, 5, 6 are low. No quit point, no unstartable step, no untaught ask.
