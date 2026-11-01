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
