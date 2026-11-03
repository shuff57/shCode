# 6.11 Sound and Music: grader case table

## Round 0 (2026-11-01, written with the module)

Method as in `grids-fix-cases.md` and `breakout-fix-cases.md`: the app's own `lib/grader.ts` (imported through
`scripts/register-ts.mjs`, no change to `lib/`), each case a lab's reference (`solution.js`) or starter with one piece
changed, graded against the shipped `lesson.json`. "Expected" is the lax policy: honest taught shapes full, cheats and
wrong answers below full on the named card, every reference full, every starter below full. The two fix-case files'
lessons were applied before the first run, not after a review round:

- strings blanked (`ignoreStrings: true`) and comments stripped on every code card; the two exceptions read what they
  must (6.11.3 r1 reads the sound's path, as 5.11.9 r1 does; 6.11.10 r2 reads the sentence, copied from 6.10.13 r2);
- parentheses, spacing, Allman braces, one-line bodies, `==`/`===`, either quote, `++`/`+= 1`/`= x + 1` all accepted;
- any variable, counter or helper name accepted: the catch/miss cards follow a play into any helper called from inside
  the `if` (defined before or after), an alias (`const caught = star.overlaps(basket)`), `&&`, or an `overlaps`
  callback; the level cards follow any stepped variable to the `.volume =` or `masterVolume(...)` that uses it, before
  or after the key `if`; the save card follows `storeItem` through one or two helpers; `goTo` accepts ten common
  names (`changeState`, `setState`, `switchState`, ...);
- empty-body cheats refused wherever a pattern ties the fragments together: the target must sit inside the `if` body
  (a braced body may skip whole nested blocks, or enter one, but never leave the `if`), so `if (...) {} x.play();`
  fails.

**129 cases, 0 mismatches** (65 honest, 38 cheat, 6 wrong, 4 declared-lax, 4 fail, plus each lab's reference and starter). The runner was a scratch script in the build session, not committed; each row names the exact change made to the reference or starter.

### Declared, left lax on purpose

- 6.11.3: a sound played in `dropStar()` (called from both the catch and the miss) passes both cards with one sound.
  The step asks for two; the student hears one. Telling them apart needs the two `if`s to name different sounds,
  which fails a student who reuses one.
- 6.11.4 r3 and 6.11.8 r1 do not require the 0 and 10 clamp. Without it the words show `14 of 10` and the
  student sees it; `.volume` and `masterVolume` clamp themselves, so nothing sounds wrong.
- 6.11.4 r4 accepts a `muted` flag flipped under the key with any `masterVolume(x)` (x not 0) somewhere in the file,
  without checking that the flag reaches it. Refused: muting only the tune (`music.volume = 0`), which leaves the
  effects on and is not what the step asks.
- 6.11.5 r2 accepts the random pick under any `if`, not only the miss block.
- 6.11.7 r2/r3 read that `.loop()` / `.play()` sit under an `if`, `case`, `else`, `?` or `&&`, not what the test
  says: `if (true) music.loop();` passes. Blanked strings could not tell `'title'` from `'play'` anyway.
- 6.11.8 r4 accepts `getItem(...) || 5` (a saved 0 comes back as 5; step 3 explains exactly why not, and the harness
  records the trap) and any `null`/`??`/`||`/`typeof` in the load functions, even one not about the loaded value.
- 6.11.8 r3 refuses `storeItem` every frame in `draw()` (the lesson's point, 6.5.3: save when it changes) and a
  helper nothing calls.
- 6.11.10 r2 refuses a `/* */` sentence (the step asks for `//`; the tolerance audit tags it maybe-intentional, as
  it does 6.10.13 r2).

### Speed

Every pattern on 5000-character adversarial input, through the real grader (comment stripper and string blanker
included): 1,253 inputs per card (400 seeds x 3 shapes from 48 trigger tokens, each token repeated, and five
hand-made pathological shapes). Worst seen over three runs: **70 ms** (6.11.10 r2, the copied 6.10.13 pattern, on
`//` repeated); worst for a pattern written here: 58 ms (6.11.3 r3). One rewrite was needed: the level cards'
"the variable sets a volume earlier in the file" branch scanned every identifier of every `masterVolume(...)` call to
the end of the file and took 154 ms on `masterVolume(a, b, c, d)` x 210; it now takes only identifiers followed by
`/ * ) , ; : ?` within 120 characters, and the same input takes 9 ms. No lookbehind anywhere.

### Case table

| Lab | Kind | Case | Expected | Got | Verdict |
| --- | --- | --- | --- | --- | --- |
| 6.11.3 | ref | reference | full | 3/3 | OK |
| 6.11.3 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | OK |
| 6.11.3 | honest | double quotes, own names (ding, bonk) | full | 3/3 | OK |
| 6.11.3 | honest | relative path 'assets/coin.wav' | full | 3/3 | OK |
| 6.11.3 | honest | full URL path | full | 3/3 | OK |
| 6.11.3 | honest | play first in the block, Allman braces | full | 3/3 | OK |
| 6.11.3 | honest | a second one-line if for each sound | full | 3/3 | OK |
| 6.11.3 | honest | alias: const caught = star.overlaps(basket) | full | 3/3 | OK |
| 6.11.3 | honest | alias: const missed = star.y > 410 | full | 3/3 | OK |
| 6.11.3 | honest | helper caughtStar() defined after draw | full | 3/3 | OK |
| 6.11.3 | honest | helper missedStar() defined before draw | full | 3/3 | OK |
| 6.11.3 | honest | basket.overlaps(star), reversed | full | 3/3 | OK |
| 6.11.3 | honest | miss as star.y >= 400 | full | 3/3 | OK |
| 6.11.3 | honest | miss as 410 < star.y | full | 3/3 | OK |
| 6.11.3 | honest | miss as star.y > height + 10 | full | 3/3 | OK |
| 6.11.3 | honest | catch with an overlaps callback | full | 3/3 | OK |
| 6.11.3 | honest | catch as `star.overlaps(basket) && chime.play();` | full | 3/3 | OK |
| 6.11.3 | honest | sounds loaded in a helper loadSounds() called from setup | full | 3/3 | OK |
| 6.11.3 | lax | one sound played in dropStar() (both events, same sound) | full | 3/3 | OK |
| 6.11.3 | cheat | both plays straight in draw() | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | cheat | both plays under kb.pressing('space') | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | cheat | plays written inside a string | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | cheat | plays in comments | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | cheat | empty catch if, play after it | red r2 | 2/3 (red r2) | OK |
| 6.11.3 | cheat | sounds loaded in draw() | red r1 | 2/3 (red r1) | OK |
| 6.11.3 | wrong | path typo '/moshion/asset/coin.wav' | red r1 | 2/3 (red r1) | OK |
| 6.11.3 | cheat | thud under if (star.y > 0): every frame | red r3 | 2/3 (red r3) | OK |
| 6.11.3 | wrong | plays only in setup() | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.4 | ref | reference | full | 4/4 | OK |
| 6.11.4 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.4 | honest | keys step music.volume itself (+= 0.1 / -= 0.1) | full | 4/4 | OK |
| 6.11.4 | honest | level++ / level-- with clamp ifs after | full | 4/4 | OK |
| 6.11.4 | honest | level = min(level + 1, 10) / max(level - 1, 0) | full | 4/4 | OK |
| 6.11.4 | honest | constrain(level - 1, 0, 10), own name vol | full | 4/4 | OK |
| 6.11.4 | honest | keys set masterVolume(level / 10) instead | full | 4/4 | OK |
| 6.11.4 | honest | one line for both keys (ternary) | full | 4/4 | OK |
| 6.11.4 | honest | W and S keys, clamp first in the head | full | 4/4 | OK |
| 6.11.4 | honest | mute with a muted flag | full | 4/4 | OK |
| 6.11.4 | honest | mute in one line: masterVolume(masterVolume() > 0 ? 0 : 1) | full | 4/4 | OK |
| 6.11.4 | honest | mute with braces everywhere, === 1 test | full | 4/4 | OK |
| 6.11.4 | honest | loop in draw: if (!music.playing) music.loop() | full | 4/4 | OK |
| 6.11.4 | honest | music set up in a helper startMusic() called from setup | full | 4/4 | OK |
| 6.11.4 | cheat | volume keys under kb.pressing | red r3 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | keys change score, not the level | red r3 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | keys change level, nothing sets the volume from it | red r3 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | only the up key | red r3 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | mute that never comes back: masterVolume(0) only | red r4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | mute only the tune: music.volume = 0 (declared) | red r4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | empty M if, masterVolume(1) after it | red r4 | 3/4 (red r4) | OK |
| 6.11.4 | wrong | music.play() instead of loop() | red r1 | 3/4 (red r1) | OK |
| 6.11.4 | wrong | tune at full volume (1) | red r2 | 3/4 (red r2) | OK |
| 6.11.5 | ref | reference | full | 2/2 | OK |
| 6.11.5 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | OK |
| 6.11.5 | honest | chime.rate = 0.8 + random(0.45) | full | 2/2 | OK |
| 6.11.5 | honest | chime.rate = random([0.8, 1, 1.2]) | full | 2/2 | OK |
| 6.11.5 | honest | rate set after the play, for the next one | full | 2/2 | OK |
| 6.11.5 | honest | Math.random(): 0.8 + Math.random() * 0.45 | full | 2/2 | OK |
| 6.11.5 | honest | rate re-rolled at the top of draw() every frame | full | 2/2 | OK |
| 6.11.5 | honest | random(thuds).play() | full | 2/2 | OK |
| 6.11.5 | honest | thuds[floor(random(3))].play() in one line | full | 2/2 | OK |
| 6.11.5 | honest | const s = thuds[floor(random(thuds.length))]; s.play() | full | 2/2 | OK |
| 6.11.5 | honest | Math.floor(Math.random() * thuds.length) | full | 2/2 | OK |
| 6.11.5 | honest | list built with push in a loop | full | 2/2 | OK |
| 6.11.5 | honest | three named sounds in a list: [low, mid, high] | full | 2/2 | OK |
| 6.11.5 | cheat | random rate set once, in setup() | red r1 | 1/2 (red r1) | OK |
| 6.11.5 | cheat | random pick played straight in draw() | red r2 | 1/2 (red r2) | OK |
| 6.11.5 | cheat | always thuds[0] | red r2 | 1/2 (red r2) | OK |
| 6.11.5 | cheat | the pick in a string | red r2 | 1/2 (red r2) | OK |
| 6.11.5 | wrong | thuds[random(3)].play(): no floor | red r2 | 1/2 (red r2) | OK |
| 6.11.7 | ref | reference | full | 3/3 | OK |
| 6.11.7 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | OK |
| 6.11.7 | honest | switch (next) with cases | full | 3/3 | OK |
| 6.11.7 | honest | else-if chain, double quotes | full | 3/3 | OK |
| 6.11.7 | honest | separate tune objects, each stopped | full | 3/3 | OK |
| 6.11.7 | honest | one if with \|\| for each kind | full | 3/3 | OK |
| 6.11.7 | honest | loop or play by if / else | full | 3/3 | OK |
| 6.11.7 | honest | renamed changeState(s) everywhere | full | 3/3 | OK |
| 6.11.7 | honest | stop after state = next; pause() for stop | full | 3/3 | OK |
| 6.11.7 | honest | a lookup table of loops: loops[next].loop() | full | 3/3 | OK |
| 6.11.7 | cheat | loop with no if | red r2 | 2/3 (red r2) | OK |
| 6.11.7 | cheat | play with no if | red r3 | 2/3 (red r3) | OK |
| 6.11.7 | cheat | no stop | red r1 | 2/3 (red r1) | OK |
| 6.11.7 | cheat | empty ifs, loop and play after them | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.7 | wrong | music moved into draw(), goTo untouched | red r1,r2,r3 | 0/3 (red r1,r2,r3) | OK |
| 6.11.7 | cheat | the music lines in a string | red r1,r2,r3 | 0/3 (red r1,r2,r3) | OK |
| 6.11.8 | ref | reference | full | 4/4 | OK |
| 6.11.8 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.8 | honest | mute as if / else | full | 4/4 | OK |
| 6.11.8 | honest | mute as muted = muted ? false : true | full | 4/4 | OK |
| 6.11.8 | honest | storeItem written in each key if | full | 4/4 | OK |
| 6.11.8 | honest | a saveSettings() helper called from soundChanged() | full | 4/4 | OK |
| 6.11.8 | honest | one object saved and loaded | full | 4/4 | OK |
| 6.11.8 | honest | load with ?? 5 | full | 4/4 | OK |
| 6.11.8 | lax | load with \|\| 5 (a saved 0 becomes 5: declared) | full | 4/4 | OK |
| 6.11.8 | honest | load with === null and else | full | 4/4 | OK |
| 6.11.8 | honest | load with typeof v === 'number' | full | 4/4 | OK |
| 6.11.8 | honest | level++ / level-- then clamp ifs | full | 4/4 | OK |
| 6.11.8 | honest | load lines written straight in setup() | full | 4/4 | OK |
| 6.11.8 | cheat | storeItem only in setup() | red r3 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | storeItem in draw(), every frame (declared) | red r3 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | getItem with no null case | red r4 | 3/4 (red r4) | OK |
| 6.11.8 | cheat | M resets the score instead | red r2 | 3/4 (red r2) | OK |
| 6.11.8 | cheat | level keys under kb.pressing | red r1 | 3/4 (red r1) | OK |
| 6.11.8 | cheat | only the up key | red r1 | 3/4 (red r1) | OK |
| 6.11.8 | cheat | empty M if, muted flipped after it | red r2 | 3/4 (red r2) | OK |
| 6.11.10 | ref | reference (all three) | full | 2/2 | OK |
| 6.11.10 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | OK |
| 6.11.10 | honest | challenge 1 only (streak) + sentence | full | 2/2 | OK |
| 6.11.10 | honest | challenge 2 only (pan) + sentence | full | 2/2 | OK |
| 6.11.10 | honest | challenge 3 only (clips) + sentence | full | 2/2 | OK |
| 6.11.10 | honest | own rule: a fade on the lost screen + sentence | full | 2/2 | OK |
| 6.11.10 | honest | own rule: rate follows the score + sentence | full | 2/2 | OK |
| 6.11.10 | fail | starter + sentence only | red r1 | 1/2 (red r1) | OK |
| 6.11.10 | fail | challenge 1 done, no sentence | red r2 | 1/2 (red r2) | OK |
| 6.11.10 | fail | sentence starting with a lesson number | red r2 | 1/2 (red r2) | OK |
| 6.11.10 | fail | two-word comment | red r2 | 1/2 (red r2) | OK |
| 6.11.10 | cheat | the challenge written in a string | red r1 | 1/2 (red r1) | OK |
| 6.11.3 | cheat | chime played after the catch block closes | red r2 | 2/3 (red r2) | OK |
| 6.11.3 | cheat | both plays under kb.presses('space'), not the events | red r2,r3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | honest | everything on one line per if, no braces style mix | full | 3/3 | OK |
| 6.11.4 | cheat | empty up and down ifs, level changed after them | red r3 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | loop() only in a string | red r1 | 3/4 (red r1) | OK |
| 6.11.4 | honest | keys written with if/else if, music.volume = level * 0.1 | full | 4/4 | OK |
| 6.11.5 | cheat | the random rate only in a comment | red r1 | 1/2 (red r1) | OK |
| 6.11.5 | cheat | a random number, but not for the rate (score) | red r1 | 1/2 (red r1) | OK |
| 6.11.7 | lax | if (true) around each start (declared: the test is not read) | full | 3/3 | OK |
| 6.11.8 | cheat | storeItem in a helper nothing calls | red r3 | 3/4 (red r3) | OK |
| 6.11.8 | lax | getItem with an unrelated null test (declared) | full | 4/4 | OK |
| 6.11.8 | honest | Number(getItem(...)) with !== null first | full | 4/4 | OK |

## Round 1 (2026-11-01)

Inputs: `sound-beginner.md`, `sound-moderate.md`, `sound-advanced.md` with its tested `sound-advanced-patterns.json`, and
`sound-editors.md` (the runnable-editor audit). Method as round 0: the app's own `lib/grader.ts` through
`scripts/register-ts.mjs`, the shipped `lesson.json`, each case one change to a reference or starter. No change to `lib/`.

### What changed

Text (no pattern involved):

- **6.11.1** teaches `.loaded` before 6.11.2 uses it: one clause beside `.playing` ("`true` once the file has arrived and can
  play; the sound board in 6.11.2 shows both") and a glossary row.
- **6.11.2** "four lines of words" is now five (two that name the keys, three that report). Try 4 no longer asks to move "the
  line `tune.loop();`", which is the tail of the T line: it says delete the whole T line, write `tune.loop();` on its own line
  in `setup()`, and afterwards take it out and put the T line back (the shape the editor audit ran).
- **6.11.3** step 1 names the starter's variables, `score` and `misses`, and says the words on screen call them `caught` and `missed`.
- **6.11.4** step 1 no longer says the words "now" show `music: 4 of 10`: the starter already draws it; the step says so.
- **6.11.5** step 2 says to make all three changes before Run (after the second alone, the first miss stops the game on
  `thud.play();`). The r2 card no longer prints `list[floor(random(list.length))].play()`, which ran 153 px past the Quest drawer;
  it says the same in words.
- **6.11.8** step 1: the orange basket on the options screen is explained (a sprite is drawn on every screen; the game keeps it).
  A new paragraph says this `level` is not 6.11.4's (there the tune's own volume, here everything's), and that 6.11.4's M flip
  would undo itself here because `soundChanged()` runs `applySound()` on the same press. The r2, r3 and r4 descriptions say what
  the cards now check.
- **6.11.10** saves under its own names, `'mySoundLevel'` and `'mySoundMuted'` (starter and reference), and step 1 says so: a mute
  left on in 6.11.8 no longer starts the challenges silent. Challenge 3's `loadSound(..., { clips })` is a fenced block (it spilled
  27 px as inline code) and its hint is two statements, `const pick = floor(random(names.length));` then `notes.play(names[pick]);`
  (it spilled 25 px); the reference uses the same two lines. Module doc note updated (`curriculum/modules/6.11_sound-and-music.md`).
  Why the two spilled: `.step-instructions pre` has `white-space: pre-wrap; overflow-wrap: anywhere`, but inline code in a step or a
  hint has no `overflow-wrap`, so a token with no space in it cannot break. No CSS was changed.

Graders:

- **The advanced lens's patch file applied as tested**, all 17 cards (3.r1-r3, 4.r2-r4, 5.r1-r2, 7.r1-r3, 8.r1-r4, 10.r1-r2):
  nested key bodies, a named step, any right-hand side holding `level +/- n` (ternary and `min(10, level + 1)` clamps) on 4.r3 and
  8.r1; 4.r3's "volume set earlier" branch no longer satisfied by the one-time line in `setup()`; 4.r4 needs a way to turn the sound
  off as well as on; 8.r2 accepts only the `muted` flag (any toggle form), since `applySound()` re-sets `masterVolume` and a
  `masterVolume(...)` under M mutes nothing; 8.r3's stored value must not be a bare literal; 8.r4's `getItem` result must be assigned
  or returned; helpers called with arguments (3.r2, 3.r3, 4.r4, 5.r2, 8.r2, 8.r3); `|| true` refused in 6.11.3's catch and miss heads;
  sounds in an object literal (3.r1); `Math.min`/`max`/`constrain` round the volume and eleven more helper names (4.r2); the random
  pitch through a variable (5.r1); a list filled by index (5.r2); eighteen more names for `goTo` (7) and ten for the loader (8.r4);
  6.11.10 r2 refuses the title's own wording with or without its number, and r1's `.pan =` needs something that is not a number.
- **6.11.5 r2** also follows the picked sound into a variable: `const idx = floor(random(thuds.length)); const t = thuds[idx];
  t.play();` (moderate G3). The alias must be indexed by the same random index, so `const t = thuds[1]` after a pick stays red.
- **6.11.8 r3 restructured for speed.** The slow branch was "a key `if` calls `h()`, and `h`, defined later, saves": on a hostile
  paste each `if (kb.presses(...)) {` opened a body window that ran on through every following `function ... {` (a lone `{` may be
  entered and nothing closed it), every call-shaped word in that window became a candidate `h`, and each candidate re-scanned the
  rest of the file, testing an 800-character body at every `function h`. Now both the key-`if` body and the helper body stop at
  the next `function` keyword (`(?:[^{}f]|\bf(?!unction\b)|\Bf)` in place of `[^{}]`; the three branches are disjoint, an earlier
  draft with `\Bf|f(?!unction\b)` overlapped and was exponential), and a keyword (`if`, `for`, `function`, `kb`, `presses`, ...) is
  never a candidate name. Neither bound is a distance: the scan from the key `if` to the helper's definition is still
  `[\s\S]*?`, so a helper at the bottom of any file is found (case table: `soundChanged()` and `saveSettings()` at the bottom of a
  5.8 KB file with 40 helpers between). No lookbehind, no nested unbounded quantifier.

### Replays

- **Round 0's 129 cases: 129 as recorded, 0 mismatches** (the round-0 runner, unchanged, against the round-1 tree).
- **The advanced lens's 349 named cases** (its own case files and harness, re-run against the round-1 tree): HEAD gave 210 as the lens
  expected, round 1 gives 262. **54 improve, none gets worse except the two the lens declared intended**: "keys step level, volume read
  before in setup only" (the lens labelled it honest; it is its own section-1.2 cheat, now red r3) and `chime.pan = -1` (a constant,
  refused on purpose by 10.r1). Round 1 matches the lens's patched run case for case (0 differences). Its 102 mechanical restyles
  (17 transforms x 6 references) are unchanged: all full except the two the lens explained (comments stripped on 6.11.10, `var f =
  function` for `inFunction` cards).
- **Round 1's own table below: 76 cases, 0 mismatches**; 32 of them were wrong at HEAD. All six references full, all six starters 0.

### Speed

Every 6.11 card (18) on 5000-character adversarial input through the real grader, 486 inputs per card (150 seeds x 3 shapes from 74
trigger tokens, plus 36 hand-made shapes including every pathological one the lens kept and seven aimed at 8.r3's helper branch).
**Worst over the sweep and four retimes: 8.6 ms** (8.r1, `level++; if (kb.presses(x)) {` repeated); 8.r3's worst is 3.0 ms. 8.r3 before
and after the restructure, same inputs: the lens's worst file 130 ms -> 0.7 ms; `function g() {if (kb.presses('up')) {g() ` x130
614 ms -> 1.4 ms; `if (kb.presses('up')) {h() function h() {` x120 594 ms -> 1.3 ms.

### Declared, left lax on purpose (round 1)

- **Code written but never called** passes the `inFunction` and whole-file cards (6.11.7 r1-r3 decoy `changeState`, 6.11.4 r1 `loop()`
  in an uncalled helper or `if (false)`, 6.11.5 r1 rate in an uncalled function, 6.11.8 r4 `loadSettings()` not called from `setup()`).
  Closing it needs the grader to check that a function is called, not a pattern.
- **6.11.8 step 1's "then calls `soundChanged()`" is not measured**: keys that change and save `level` directly but never apply the sound
  pass r1 (the starter's `applySound()` supplies the `masterVolume(...level...)`). Requiring a call would refuse
  `let before = level; ... if (level !== before) soundChanged();`.
- **A key alias** (`const up = kb.presses('up'); if (up && level < 10)`) is still refused by 4.r3 and 8.r1 (r4, 8.r2, 8.r3 follow it).
- **A `changeLevel(1)` / `changeLevel(-1)` helper** is still refused by 4.r3 and 8.r1.
- **A named volume constant**, `music.volume = VOL;`, is still refused by 4.r2: a bare identifier cannot be told from `level` without
  letting `music.volume = score` through.
- **`level = getItem('soundLevel') || 5`** still passes 8.r4 (round 0's declared lax; the step, 6.11.6 and quiz question 8 teach the trap).
- 8.r3's two bounds: a helper whose body has a nested `function` (or an inline `function () {}` callback) before its `storeItem` is not
  followed, and neither is a key `if` with a `function` keyword inside its body before the call. Neither shape is taught.
- Unchanged from the lens report and not attempted: 6.11.3 r3 with a miss line that is not a number (`star.y > FLOOR`), 6.11.3 r1 with
  the path in a constant, a hand-rolled catch with `dist()`; 6.11.7 helpers that split loop and play (`startTune(rate, looping)`);
  6.11.8 r4 through `readValue(key, fallback)`; `masterVolume(0); masterVolume(1);` in one press; saving or loading the wrong variable;
  the 6.11.10 four-word comment floor; the optional 6.11.10 r1 widening to a volume-only rule (not applied).

### Editor audit items not changed

- N3: two elements in 6.11.3's Quest drawer are 2 px wider than the drawer (not visible). Not traced.
- The drawers were not re-measured in a browser after the text changes (the dev server was stopped for this round). The 6.11.5 card
  text now has no code in it; the 6.11.10 code is in a `pre-wrap` block and the hint breaks at spaces.

### Gates

Six generators re-run (module-docs, lessons-manifest, ai-graders, quiz-keys, solutions, lesson-starters). Green: `check-lesson-numbers`
(848, no collisions), `check-lesson-groups`, `check-prompt-pointers`, `check-lesson-citations` (two FORWARD notes, both outside 6.11 and
older than this round), `check-hints` (382), `check-live-blocks` (491), `check-starters`, `check-solution-leak`, `test-quiz` (36 quizzes),
`test-grader-tolerance` (334 cases), `audit-grader-tolerance --gate` (290 lessons, 0 refuse), `tsc --noEmit`. Full `npm test` not run.

### Case table (round 1, new cases)

| Lab | Kind | Case | Expected | HEAD (689f2e27) | Round 1 | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 6.11.4 | honest | nested if: if (kb.presses(up)) { if (level < 10) { level += 1; music.volume = level / 10; } } | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | nested if with level++ / level-- | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | nested if, brace-less inner if with a braced body | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | nested if, volume set once after both keys | full | 4/4 | 4/4 | OK |
| 6.11.4 | cheat | nested if: keys step level, the volume only in setup() | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.4 | cheat | keys step level, nothing after; volume from level in setup() only (advanced 1.2) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.4 | cheat | nested if: empty key ifs, steps after them | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.4 | honest | ternary clamp: level = level < 10 ? level + 1 : 10 | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | min/max clamp, swapped arguments: min(10, level + 1) | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | named step: const STEP = 1; level += STEP | full | 3/4 (red r3) | 4/4 | OK |
| 6.11.4 | honest | applyVolume() helper defined after, called from each key | full | 4/4 | 4/4 | OK |
| 6.11.4 | cheat | M only masterVolume(1) (advanced 1.3) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | M: if (masterVolume() > 0) masterVolume(1) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | honest | M: masterVolume(1 - masterVolume()) | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | M: nested ifs, masterVolume(0.0) / ( 1 ) | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | M: muted flag, masterVolume(muted ? 0 : 1) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | nested if: if (kb.presses(up)) { if (level < 10) { level += 1; soundChanged(); } } | full | 3/4 (red r1) | 4/4 | OK |
| 6.11.8 | honest | nested if with ++ / -- | full | 3/4 (red r1) | 4/4 | OK |
| 6.11.8 | cheat | nested if: only the up key | red r1 | 3/4 (red r1) | 3/4 (red r1) | OK |
| 6.11.8 | cheat | nested if: up and down under kb.pressing | red r1 | 3/4 (red r1) | 3/4 (red r1) | OK |
| 6.11.8 | cheat | M copied from 6.11.4 (masterVolume flip) + soundChanged(): never mutes (moderate G4) | red r2 | 4/4 | 3/4 (red r2) | OK |
| 6.11.8 | cheat | M only masterVolume(1) (advanced 1.3) | red r2 | 4/4 | 3/4 (red r2) | OK |
| 6.11.8 | honest | M nested: if (muted) { muted = false; } else { muted = true; } | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | M as a toggleMute() helper defined after | full | 4/4 | 4/4 | OK |
| 6.11.8 | cheat | r3: a fixed value saved: storeItem('soundLevel', 5) (advanced 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: one-argument storeItem('a') | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | honest | r3: one object saved, { level, muted } | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: saved in a saveSettings() helper defined at the bottom of the file | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: saved inline in each key if (nested ifs) | full | 3/4 (red r1) | 4/4 | OK |
| 6.11.8 | cheat | r4: getItem result thrown away, then null; (advanced 1.5) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.8 | honest | r4: if (getItem(k) !== null) { level = getItem(k); } | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r4: different key names, same both sides | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: soundChanged() moved to the bottom of the file | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: soundChanged() at the bottom of a 5.8 KB file (40 helpers between) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: saveSettings() at the bottom of a 5.8 KB file, called from soundChanged() | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem inside a nested if in the helper | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: M key calls toggleMute() at the bottom, which saves | full | 4/4 | 4/4 | OK |
| 6.11.8 | cheat | r3: helper with storeItem at the bottom that nothing calls; soundChanged() does not save | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: soundChanged() does not save; saveNow() with storeItem at the bottom is never called | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.5 | honest | r1: let r = random(0.8, 1.25); chime.rate = r; (beginner 4, moderate G3) | full | 1/2 (red r1) | 2/2 | OK |
| 6.11.5 | honest | r1: const pitch = random(0.8, 1.25); chime.rate = pitch; | full | 1/2 (red r1) | 2/2 | OK |
| 6.11.5 | cheat | r1: random number kept in a variable, rate set from a constant | red r1 | 1/2 (red r1) | 1/2 (red r1) | OK |
| 6.11.5 | cheat | r1: random number in a variable in setup(), the rate from it once | red r1 | 1/2 (red r1) | 1/2 (red r1) | OK |
| 6.11.5 | honest | r2: const idx = floor(random(thuds.length)); const t = thuds[idx]; t.play(); (moderate G3) | full | 1/2 (red r2) | 2/2 | OK |
| 6.11.5 | honest | r2: let s = thuds[pick]; s.play(); | full | 1/2 (red r2) | 2/2 | OK |
| 6.11.5 | cheat | r2: const t = thuds[0]; t.play(); (no random pick) | red r2 | 1/2 (red r2) | 1/2 (red r2) | OK |
| 6.11.5 | cheat | r2: pick made, but a fixed sound kept and played | red r2 | 1/2 (red r2) | 1/2 (red r2) | OK |
| 6.11.5 | cheat | r2: alias of a random pick, played straight in draw() | red r2 | 1/2 (red r2) | 1/2 (red r2) | OK |
| 6.11.3 | cheat | catch head with \|\| true (advanced 1.6) | red r2 | 3/3 | 2/3 (red r2) | OK |
| 6.11.3 | cheat | miss head with \|\| true (advanced 1.6) | red r3 | 3/3 | 2/3 (red r3) | OK |
| 6.11.3 | honest | catch head a.overlaps(b) \|\| b.overlaps(a) | full | 3/3 | 3/3 | OK |
| 6.11.10 | cheat | title minus its number + chime.pan = 0 (advanced 1.1) | red r1,r2 | 2/2 | 0/2 (red r1,r2) | OK |
| 6.11.10 | cheat | chime.pan = 1 under a real sentence | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | honest | pan from basket.x / 200 - 1 + sentence | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | pan with map(star.x, 0, 400, -1, 1) + sentence | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | sentence replacing the title line | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | reference saves under its own names ('mySoundLevel') | full | 2/2 | 2/2 | OK |
| 6.11.3 | honest | r1: sounds in an object, sfx = { chime: loadSound(...), thud: loadSound(...) } | full | 2/3 (red r1) | 3/3 | OK |
| 6.11.3 | honest | r2/r3: playSound(s) helper with a parameter, defined after draw() | full | 1/3 (red r2,r3) | 3/3 | OK |
| 6.11.4 | honest | r2: music.volume = Math.min(level / 10, 1) in setup() | full | 3/4 (red r2) | 4/4 | OK |
| 6.11.4 | honest | r2: the tune set up in playTune() called from setup() | full | 3/4 (red r2) | 4/4 | OK |
| 6.11.5 | honest | r2: list filled by index, thuds[i] = loadSound(...) in a for loop | full | 1/2 (red r2) | 2/2 | OK |
| 6.11.7 | honest | goTo renamed goToScreen everywhere | full | 0/3 (red r1,r2,r3) | 3/3 | OK |
| 6.11.8 | honest | r4: loader renamed loadSoundSettings | full | 3/4 (red r4) | 4/4 | OK |
| 6.11.3 | ref | reference | full | 3/3 | 3/3 | OK |
| 6.11.3 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.11.4 | ref | reference | full | 4/4 | 4/4 | OK |
| 6.11.4 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.5 | ref | reference | full | 2/2 | 2/2 | OK |
| 6.11.5 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.11.7 | ref | reference | full | 3/3 | 3/3 | OK |
| 6.11.7 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.11.8 | ref | reference | full | 4/4 | 4/4 | OK |
| 6.11.8 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.10 | ref | reference | full | 2/2 | 2/2 | OK |
| 6.11.10 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |

## Round 2 (2026-11-01), the last pattern round

Inputs: `sound-advanced-r2.md` and its tested `sound-advanced-r2-patterns.json` (strong-student lens, round 2). Method as rounds 0
and 1: the app's own `lib/grader.ts` through `scripts/register-ts.mjs`, the shipped `lesson.json`, each case one change to a
reference or starter. No change to `lib/`, to any lesson text, step, hint or card description, or to any starter or reference.
**The advanced pattern loop for 6.11 ends here**: what is still open below is declared, not queued.

### What changed

The lens's patch file, applied as tested, eleven cards:

- **6.11.3 r1**: the load must not start inside a quote (whole string literals before it on the line are skipped, no
  lookbehind). `let s = "x = loadSound('...')"`, a template literal and a `console.log('... loadSound(...)')` no longer pass.
- **6.11.3 r2 / r3**: a head that holds `||` and the other event no longer counts (`star.overlaps(basket) || star.y > 410`
  for both events with one sound; either order). `overlaps(a) || overlaps(b)`, `&& !star.overlaps(basket)` still pass.
- **6.11.4 r4**: the off value and the on value must each sit under a `kb.presses` test (key body, `&&` head, a key alias, or
  a helper called from one), or a flag is toggled under one. A `masterVolume(0)` in `setup()`, in an uncalled function, or a
  dead `on = !on;` no longer stands in for the missing half.
- **6.11.4 r3 and 6.11.8 r1**: a name followed by `?` is a condition, not the stepped number (8.r1: up and down stepping
  `muted` no longer passes). 4.r3 shares the change and grades every case as before.
- **6.11.7 r2 / r3**: `default:`, the `:` side of a ternary, a play or loop after a `return; }` block, and an `if` on a boolean
  alias (`const looping = next === 'title' || next === 'play'`) count as "under a test". The five honest shapes of lens
  section 2 now pass.
- **6.11.8 r2**: the flipped name must reach a `masterVolume(...)` argument or an `if (name) masterVolume(` head, before or
  after the key (bounded to 80 characters of argument and guarded by "a `kb.presses` exists": the unbounded draft took 5.4 s).
- **6.11.8 r3**: the saved value must contain a bare variable or an empty call; `5e0`, `0x5`, `Infinity`, `NaN`, `Math.PI`,
  `Number(5)`, `abs(5)`, `int(5)`, `Math.max(5, 5)`, `parseInt("5")`, `({a: 5})` no longer pass.
- **6.11.10 r1**: `.rate =` a bare name counts only when that name was not rolled from `random(`.

One widening on top (lax policy: the lens's 10.r1 fix refused honest shapes that HEAD accepted). The lens's version took a bare
name only when a plain `=` assignment ending in `;` sat within 400 characters before it, so these were refused:
`pitch += 0.1; chime.rate = pitch;` (and `*=`), the same with no semicolons, `function setRate(r) { chime.rate = r; }` (the
lens's named cost), and a global stepped in a helper defined below the catch. **6.11.10 r1** now accepts, for `.rate = name`
(or `(name)`): an assignment `= += -= *= /=` or `++` / `--` with no `random(` on its line, ending in `;` or a line break, within
400 characters before; the same assignment anywhere later in the file; or `name` as a parameter of the function (or arrow
function) whose body sets the rate. The captured name is never one after a dot, which also closes a hole the lens version left
open: `thuds[0].rate = 0.4;` just above a split roll used to supply `rate` as the "assigned" name.

**Not added: the 6.11.7 per-screen `music.rate` card** (lens 1.8). It was added as `r4` (the lens's tested pattern, `inFunction`
over r1's function list) and run against every table: it passes the reference and the lens's seven rate shapes, but it turns red
nine earlier honest 6.11.7 cases that carry no rate line (three of round 0's: separate tune objects, loop or play by if / else,
the `loops[next].loop()` lookup; six of the lens's: its boolean-alias, ternary-chain, two-tune and tune-object shapes), round 0's
declared `if (true)` row and seven of the lens's documented full-scoring rows, and it grows the red set of round 0's starter and
five of its cheat rows. The condition for adding it (no earlier honest shape fails) is not met, so it was removed and is
declared below.

### Replays

- **Round 0's 129 cases: 0 mismatches**; the markdown table is byte-identical to the same runner's output at HEAD.
- **Round 1's 76 cases: 0 mismatches**; byte-identical to the HEAD run.
- **The advanced lens's case files, rerun at HEAD and on this tree** (its harness, its bundle of `lib/grader.ts`, which is
  byte-identical to a fresh esbuild of today's file): the 349 cases of rounds 0-1 go from 262 as the lens expected to 266
  (4 improve, 0 worse); its 198 new round-2 cases from 125 to 156 (31 improve, 0 worse); its 137 patch-validation cases from
  102 to 137 (35 improve, 0 worse); no case keeps its verdict with a different score. Its 102 mechanical restyles and its
  29 re-run round-0/1 cheats are identical to HEAD. Against the lens's own patched run the tree differs in one case only:
  `thuds[0].rate = misses;` once in `setup()` passes again, as at HEAD (see declared).
- **Round 2's own table below: 94 cases, 0 mismatches**; 33 of them were wrong at HEAD (26 cheats, the five 6.11.7 shapes,
  two named costs). All six references full, all six starters 0.

### Speed

Every 6.11 card (18) on 5000-character adversarial input through the real grader, 541 inputs per card: the lens's 491-input
sweep, its two targeted sweeps (`t2`, `t3`), and 18 shapes aimed at the widened 10.r1 (bare `.rate = a` repeated with and
without a later assignment, parameter heads, `++`, no-semicolon lines). **Worst: 68 ms (6.11.8 r2) and 68 ms (6.11.8 r1)**,
retimed five times at 66-72 ms; 4.r4 32 ms, 4.r3 31-36 ms, 8.r3 10 ms, 10.r1 9 ms, every other card under 9 ms. 8.r1's worst
shape (`masterVolume(a) if (kb.presses(x)) { a = !a; ` repeated) is HEAD's own, 50-70 ms there too; the patch only narrows it.
8.r2's worst (`const c = kb.presses('m'); if (c) { masterVolume(1 - ` repeated) was 25-31 ms at HEAD: the price of following the flag.
8.r2 on `if (muted) masterVolume(` x200 (5.4 s for the lens's unbounded draft) takes 7.6 ms. No lookbehind and no repeated
group name in any 6.11 pattern (scanned).

### Declared, left as they are (round 2)

- **6.11.4 r3, the volume line's placement (lens 1.7)**: keys that only step `level`, with `music.volume = level / 10` in the
  miss block, the catch block, or a `setup()` defined below the keys, pass. The honest per-frame shapes (`draw()` after the keys,
  `drawTop()`, a change-detect `if`) are the same kind of block; a regex cannot tell them apart without depth.
- **Rarer honest refusals with no fix, unchanged from HEAD**: a predicate helper `if (isCaught())` / `if (isMissed())` (3.r2 /
  3.r3); `level / MAX`, `Math.round(level) / 10`, `constrain(level, 0, 10) / 10` (4.r2) and a `setVol(level)` helper (4.r3);
  `level = 1 + level` (4.r3, 8.r1); `storeItem` inside `applySound()` and a change-detect save in `draw()` (8.r3); 6.11.5 r2's
  pick made outside the miss block, `random([a, b, c]).play()`, `playRandom(list)` (the step puts the pick in the miss block;
  `random(list)` is not taught).
- **Named costs of the applied fixes**: 8.r3 refuses `getLevel(2)` (a helper with a literal argument) when it is the only save:
  it cannot be told from `Number(5)`; beside `storeItem('soundMuted', muted)` the card is green anyway. 8.r2 refuses an
  `applySound()` rewritten with the flag in a variable first (`const v = muted ? 0 : level / 10; masterVolume(v);`); r1 already
  refused that shape at HEAD, and `applySound()` is given code that no step asks the student to change.
- **What the 10.r1 widening lets in**: a rate set once in `setup()` from a variable the game changes later
  (`thuds[0].rate = misses;`, as at HEAD; the lens version refused it only through its 400-character window);
  `setRate(random(0.8, 1.25))` through a parameter helper; a split random roll with a decoy non-random assignment to the same
  name written on purpose nearby or later. Same class as "code written but never called".
- **Steps nothing grades (not carded)**: the `music = loadSound(...)` line of 6.11.4 (deleting it throws on Run); `thud.rate`
  on 6.11.3; the three thud rates on 6.11.5; the per-screen `music.rate` on 6.11.7 (card tried and removed, above).
- **6.11.10 r2's one-word floor** (`// if`), the same class as round 0's four-word floor.
- Everything declared in rounds 0 and 1 stands.

### Gates

Six generators re-run (module-docs, lessons-manifest, ai-graders, quiz-keys, solutions, lesson-starters). Green:
`check-lesson-numbers` (848, no collisions), `check-lesson-groups`, `check-prompt-pointers`, `check-lesson-citations` (the same two
FORWARD notes as round 1, both outside 6.11), `check-hints` (382), `check-live-blocks` (491), `check-starters`,
`check-solution-leak`, `test-quiz` (36 quizzes), `test-grader-tolerance` (334 cases), `audit-grader-tolerance --gate` (290
lessons, 0 refuse), `tsc --noEmit`. Full `npm test` not run.

### Case table (round 2, new cases)

| Lab | Kind | Case | Expected | HEAD (d62de274) | Round 2 | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 6.11.3 | cheat | r1: the load only inside a string: let s = "x = loadSound(...)" (lens 1.2) | red r1 | 3/3 | 2/3 (red r1) | OK |
| 6.11.3 | cheat | r1: the load only inside a template literal | red r1 | 3/3 | 2/3 (red r1) | OK |
| 6.11.3 | cheat | r1: the load only inside console.log('chime = loadSound(...)') | red r1 | 3/3 | 2/3 (red r1) | OK |
| 6.11.3 | honest | r1: both loads on one line | full | 3/3 | 3/3 | OK |
| 6.11.3 | honest | r1: console.log('loading'); then the load on the same line | full | 3/3 | 3/3 | OK |
| 6.11.3 | honest | r1: a trailing comment with a quote in it (// don't) | full | 3/3 | 3/3 | OK |
| 6.11.3 | honest | r1: sounds in a list over three lines | full | 3/3 | 3/3 | OK |
| 6.11.3 | cheat | r2/r3: one if for both events, one sound: star.overlaps(basket) \|\| star.y > 410 (lens 1.3) | red r2,r3 | 3/3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | cheat | r2/r3: the same, y test first | red r2,r3 | 3/3 | 1/3 (red r2,r3) | OK |
| 6.11.3 | honest | r3: miss head star.y > 410 && !star.overlaps(basket) | full | 3/3 | 3/3 | OK |
| 6.11.3 | honest | r2: catch head star.overlaps(basket) && star.y < 400 | full | 3/3 | 3/3 | OK |
| 6.11.3 | honest | r2: catch head a.overlaps(b) \|\| b.overlaps(a) (round 1, kept) | full | 3/3 | 3/3 | OK |
| 6.11.3 | declared | r2: a predicate helper, if (isCaught()) (not fixed) | red r2 | 2/3 (red r2) | 2/3 (red r2) | OK |
| 6.11.4 | cheat | r4: masterVolume(0) in setup(), M only masterVolume(1) (lens 1.1) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | r4: masterVolume(0) in a function nothing calls, M only masterVolume(1) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | r4: a dead on = !on; at the bottom, M only masterVolume(1) | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | cheat | r4: M only masterVolume(0), masterVolume(1) at the top of setup() | red r4 | 4/4 | 3/4 (red r4) | OK |
| 6.11.4 | honest | r4: M turns it off, N turns it on (two keys) | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | r4: sound = sound === 1 ? 0 : 1; masterVolume(sound); under M | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | r4: muted flipped under M, applied every frame in draw() | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | r4: toggleMute() defined after, called from M | full | 4/4 | 4/4 | OK |
| 6.11.4 | honest | r4: const pm = kb.presses('m'); if (pm) { ... } | full | 4/4 | 4/4 | OK |
| 6.11.4 | declared | r3: keys step level, the volume set only in the miss block (lens 1.7, placement not read) | full | 4/4 | 4/4 | OK |
| 6.11.4 | declared | r2: music.volume = level / MAX (not fixed) | red r2 | 3/4 (red r2) | 3/4 (red r2) | OK |
| 6.11.4 | declared | r3: level = 1 + level (number first; not fixed) | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.7 | honest | r3: switch (next) with a default: for the last screen | full | 2/3 (red r3) | 3/3 | OK |
| 6.11.7 | honest | r3: early returns for title and play, then one play for the end screens | full | 2/3 (red r3) | 3/3 | OK |
| 6.11.7 | honest | r2: early return for won \|\| lost, then one loop for title and play | full | 2/3 (red r2) | 3/3 | OK |
| 6.11.7 | honest | r3: a ternary chain ending in the play | full | 2/3 (red r3) | 3/3 | OK |
| 6.11.7 | honest | r2: a boolean for the compound test: const looping = next === 'title' \|\| next === 'play' | full | 2/3 (red r2) | 3/3 | OK |
| 6.11.7 | cheat | r2/r3: loop and play with no test at all | red r2,r3 | 1/3 (red r2,r3) | 1/3 (red r2,r3) | OK |
| 6.11.7 | cheat | r2/r3: an object literal (colons) then loop and play with no test | red r2,r3 | 1/3 (red r2,r3) | 1/3 (red r2,r3) | OK |
| 6.11.7 | cheat | r2/r3: a switch with no music in it, loop and play below | red r2,r3 | 1/3 (red r2,r3) | 1/3 (red r2,r3) | OK |
| 6.11.7 | declared | no music.rate line anywhere (steps 2-3 rates, ungraded; the rate card was tried and not added) | full | 3/3 | 3/3 | OK |
| 6.11.8 | cheat | r1: up and down step muted, the other name applySound reads (lens 1.5) | red r1 | 4/4 | 3/4 (red r1) | OK |
| 6.11.8 | cheat | r2: M flips other, a flag nothing reads (lens 1.5) | red r2 | 4/4 | 3/4 (red r2) | OK |
| 6.11.8 | cheat | r2: M flips speed | red r2 | 4/4 | 3/4 (red r2) | OK |
| 6.11.8 | honest | r1: ternary clamp, level = level < 10 ? level + 1 : 10 | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r2: applySound rewritten if (muted) masterVolume(0); else masterVolume(level / 10); | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r2: the flag renamed silent everywhere | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r2: muted = muted ? false : true | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r2: toggleMute() helper defined after | full | 4/4 | 4/4 | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', 5e0) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', 0x5) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', Infinity) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', Math.PI) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', Number(5)) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', abs(5)) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', Math.max(5, 5)) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | cheat | r3: a fixed value in disguise saved: storeItem('soundLevel', ({a: 5})) (lens 1.4) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', String(level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', Number(level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', Math.round(level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', level / 10) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', (level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', max(0, level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', int(level)) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundLevel', getLevel()) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: storeItem('soundMuted', muted ? 1 : 0) | full | 4/4 | 4/4 | OK |
| 6.11.8 | honest | r3: one object, JSON.stringify({ level, muted }) | full | 4/4 | 4/4 | OK |
| 6.11.8 | declared | r3: getLevel(2), a helper with a literal argument, as the only save (named cost of the 1.4 fix) | red r3 | 4/4 | 3/4 (red r3) | OK |
| 6.11.8 | declared | r3: getLevel(2) beside storeItem('soundMuted', muted): the other save carries the card | full | 4/4 | 4/4 | OK |
| 6.11.8 | declared | r2: applySound with the flag in a variable first (const v = muted ? 0 : level / 10; masterVolume(v);): r1 already red at HEAD | red r1,r2 | 3/4 (red r1) | 2/4 (red r1,r2) | OK |
| 6.11.8 | declared | r3: storeItem inside applySound() (two hops, defined above; not fixed) | red r3 | 3/4 (red r3) | 3/4 (red r3) | OK |
| 6.11.8 | declared | r1: level = 1 + level (number first; not fixed) | red r1 | 3/4 (red r1) | 3/4 (red r1) | OK |
| 6.11.10 | cheat | r1: the starter roll split: const r = random(0.8, 1.25); chime.rate = r; (lens 1.6) | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | cheat | r1: the same through let rate | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | cheat | r1: the same, chime.rate = (r) | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | cheat | r1: chime.rate = rate, rate never defined | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | cheat | r1: the split roll with a thuds[0].rate = 0.4 line just above it (a .rate is not the name) | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | cheat | r1: r += random(0.1); chime.rate = r; | red r1 | 2/2 | 1/2 (red r1) | OK |
| 6.11.10 | honest | r1: const rate = 1 + streak * 0.1; chime.rate = rate; (a named step) | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: a global pitch: pitch += 0.1; chime.rate = pitch; reset on a miss (widened) | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: the same with pitch *= 1.1 | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: pitch = pitch + 0.1 with no semicolons (widened) | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: setRate(r) helper with a parameter, defined after (widened; lens named cost) | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: setRate(r) defined before playGame() | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: pitch stepped in a helper defined below, chime.rate = pitch in the catch (widened) | full | 2/2 | 2/2 | OK |
| 6.11.10 | honest | r1: chime.rate = 1 + score * 0.05 (a rate that follows the score) | full | 2/2 | 2/2 | OK |
| 6.11.10 | declared | r1: thuds[0].rate = misses; once in setup() (passes as at HEAD: misses is set later in the file) | full | 2/2 | 2/2 | OK |
| 6.11.10 | declared | r1: setRate(random(0.8, 1.25)) through a parameter helper (the widening lets it in) | full | 2/2 | 2/2 | OK |
| 6.11.10 | declared | r2: the one-word // if floor, with challenge 1 done (lens 1.6 r2; declared floor) | full | 2/2 | 2/2 | OK |
| 6.11.3 | ref | reference | full | 3/3 | 3/3 | OK |
| 6.11.3 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.11.4 | ref | reference | full | 4/4 | 4/4 | OK |
| 6.11.4 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.5 | ref | reference | full | 2/2 | 2/2 | OK |
| 6.11.5 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.11.7 | ref | reference | full | 3/3 | 3/3 | OK |
| 6.11.7 | starter | starter | red r1,r2,r3 | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.11.8 | ref | reference | full | 4/4 | 4/4 | OK |
| 6.11.8 | starter | starter | red r1,r2,r3,r4 | 0/4 (red r1,r2,r3,r4) | 0/4 (red r1,r2,r3,r4) | OK |
| 6.11.10 | ref | reference | full | 2/2 | 2/2 | OK |
| 6.11.10 | starter | starter | red r1,r2 | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
