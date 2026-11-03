# 6.11 Sound and Music -- strong-student lens (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD 689f2e27. Labs 6.11.3, .4, .5, .7, .8, .10. No lesson file touched.
Grading is `lib/grader.ts` bundled with esbuild and called directly (`grade()`), each lab's own `lesson.json` requirements, no mocks.
Harness, case files and the patch builder are in the scratchpad (`.../scratchpad/s11/`: `lib.cjs`, `c3/c4/c4b/c4c/c5/c5b/c7/c8/c10/guard/guard2.cjs`,
`tr.cjs` restyles, `timing*.cjs`, `fix.cjs` builds the patch, `headline.cjs`); not in the repo. Fixes: `codehs-review/loop/sound-advanced-patterns.json`.

**Verdict: GAP LIST (not clean).** Baseline at HEAD: all six references full, all six starters 0, empty file 0. The builder's `sound-fix-cases.md` held up on
everything it tested (comment/string smuggling, empty-`if` bodies, loop-without-`if`, every starter), and no honest *spelling* (`==`, `let`/`var`/`const`,
quotes, Allman, tabs, CRLF, no semicolons, no spaces, brace-less, extra parentheses) is refused. The gaps are one level up: cards that check that a token
exists and not that it is wired to the thing the step names. Eight gaming gaps are new (section 1; six are fixed by a tested pattern, two have no safe
pattern fix; 1.1 is a card that scores the starter's own title line), and about twenty honest answers are refused (section 2; ten families fixed, the rest named).

Run: **349 named cases** (104 cheat-shaped, 245 honest-shaped; my label can be wrong, a mismatch is "my expectation was not met") + **102 mechanical restyles**
(17 transforms x 6 references) + a 2,826-input timing sweep. HEAD: 139 mismatches, of which most are the declared leftovers below. With the patch file:
54 of them flip to the expected result and 87 remain (declared leftovers and the unfixed items in sections 1.7, 1.8 and 2), **2 regressions, both intended** (the 6.11.4 cheat in section 1.2 that I had mis-labelled "honest", and a literal
`chime.pan = -1`, section 1.1), all six references still full, all six starters still 0 (`base.cjs` output identical byte for byte).

---

## 1. GAMEABLE (cheapest first)

### 1.1 6.11.10 r1 + r2 -- 2/2 with two edits and no sound rule
```js
// Challenges: Make it yours. Pick one sound rule and add it.      <- the starter's title line with "6.11.10 " deleted
...
    chime.pan = 0;                                                  <- one added line in the catch block
    chime.play();
```
Scores **2/2** (`chime.pan = 1;` too; `// a b c d` as the first line too). Deleting only the title's number scores 1/2 (r2 alone), so the title edit is a
free point; `chime.pan = 0;` is a free point. No rule, no sentence about one, nothing heard differently.
Cause: r2's only guard against the starter's own title line is `(?!\d+\.\d)` (it refuses "6.11.10 ..."). Remove the number and the title is an 11-word
`//` line, which is the pattern's "sentence". r1 reads `.pan =` as a token; the right-hand side is not read (the reference uses `(star.x - 200) / 200`).
**Fix:** r2's sentence line must not be the title wording (`(?![^\n]{0,200}\bMake it yours\b)` on both alternatives; the lazy skip of leading comment lines
is unchanged, so "sentence on line 2 under the title" still passes); r1's `.pan =` needs an identifier on its right (`[^;\n]*[A-Za-z_$]`).
Must still pass (all run): the reference; sentence on line 2, after a blank line, 2 lines, `//Tight`, ALL CAPS, tab-indented, starting with a digit,
above the title, replacing the title; pan `(star.x - 200) / 200`, `basket.x / 200 - 1`, `map(star.x, 0, 400, -1, 1)`, `constrain(...)`; `rate += 0.1`;
`rate = 1 + score * 0.05`; `rate = level / 5`; `music.fade(0.2, 1)`; `notes.play("one")`. Must still fail: both cheats above, the untouched starter.
Cost, named: `chime.pan = -1;` (a constant "everything from the left") stops passing; the hint says a rule is "something the game decides", so that is intended.
Not fixed (declared floor, same as 6.10.13): `// a b c d` still satisfies r2 once the title is not the sentence.

### 1.2 6.11.4 r3 -- 4/4 when the keys step `level` and never reach the volume
Step 1 teaches `music.volume = level / 10;` in `setup()`. Then write the keys without the "set the volume again" half step 2 asks for:
```js
function soundKeys() {
  if (kb.presses('up') && level < 10) { level += 1; }
  if (kb.presses('down') && level > 0) { level -= 1; }
  if (kb.presses('m')) { if (masterVolume() > 0) masterVolume(0); else masterVolume(1); }
}
```
**4/4.** The words say `music: 5 of 10` and the tune never changes loudness. This is the default path of a student who does step 1 as taught and rushes step 2.
With `setup()` set to a constant (`music.volume = 0.4`) the same keys are 3/4, and so are keys followed by `music.volume = score / 10;` or `= 0.5;`: the card does catch
"nothing sets the volume from the level" *unless* the lab's own taught line is already in `setup()`.
Cause: the "volume set earlier in the file" branch (`.volume = ...level...` then a later `if (kb.presses(...)) { level++ }`) uses `[\s\S]*?`, which crosses
function boundaries, so the one-time assignment in `setup()` satisfies it.
**Fix:** that branch must start in a function other than `setup` and the music-loading helper names (`function (?!setup|loadSounds|...)\w+(...) {` then at most
one nested block before the volume line). Must still pass (run): reference; `music.volume = level / 10` first line of `soundKeys`; last line of `soundKeys` after both
keys; set in `draw()` before or after the `soundKeys()` call, with the keys function defined before or after `draw`; an `applyVolume()` helper defined before or
after the keys and called from them; `music.volume += 0.1` / `-= 0.1`; `level++` + two clamp `if`s + one volume line; `masterVolume(level / 10)` after the keys;
`kb.released`; `W`/`S`. Must still fail: the code above, with `score / 10`, with `0.5`, the untouched starter.
Not fixed, same family: a never-called `function unused() { music.volume = level / 10; }` after the keys still satisfies the *later* branch (dead code, 1.7).
6.11.8 r1 shares the pattern but not the cause (its volume is applied by the starter's `applySound()`), so the setup restriction is not applied there (1.8).

### 1.3 6.11.4 r4 and 6.11.8 r2 -- 4/4 and the M key never mutes
```js
if (kb.presses('m')) masterVolume(1);                                  // 6.11.4 r4: 4/4
if (kb.presses('m')) masterVolume(1);                                  // 6.11.8 r2 (in settingsScreen): 4/4
```
Also 4/4: `masterVolume(5)`, `masterVolume(masterVolume())`, `masterVolume(level)`, `if (masterVolume() > 0) masterVolume(1);`, and on 6.11.8 the 6.11.4 shape the
moderate lens found (`if (masterVolume() > 0) masterVolume(0); else masterVolume(1); soundChanged();` -- `soundChanged()` calls `applySound()`, which sets
`masterVolume(muted ? 0 : level / 10)` straight back, so M never mutes; 4/4 as well).
Cause: the round-0 table closed "mute with `0` only" (it never comes back) and the declared flag case, not the mirror. The first lookahead is `masterVolume(<non-zero>)`
anywhere, and the key alternative accepts any `masterVolume(x)` under the key; nothing requires a way to turn the sound OFF. On 6.11.8 the first lookahead is
satisfied by the starter's own `applySound()` line.
**Fix 6.11.4 r4:** add "an off value exists": `masterVolume(0)`, `? 0 :`, `: 0)` or `masterVolume(1 - ...)`, or one of the flag toggles the card already knows.
**Fix 6.11.8 r2:** drop the `masterVolume(...)`-under-the-key alternatives entirely: in this starter only `muted = !muted` (any of the card's toggle forms) can work,
because `applySound()` re-asserts the volume. Must still pass (run, 4): `if (masterVolume() > 0) masterVolume(0); else masterVolume(1)` braced/brace-less/Allman/`0.0`/`( 0 )`;
`masterVolume(masterVolume() ? 0 : 1)`, `=== 1 ? 0 : 1`, `=== 0 ? 1 : 0`; `masterVolume(1 - masterVolume())`; a saved-volume restore; a `muted`/`soundOn` flag with
`masterVolume(muted ? 0 : 1)`, `Number(!muted)`, `on * 1`; a `toggleMute()` / `toggleMute(x)` helper defined before or after. (8): `muted = !muted`, `muted = muted ? false : true`, `muted = muted === false`, if/else, renamed flag, helper.
Must still fail: the lines above and the untouched starters. Not fixed: `masterVolume(0); masterVolume(1);` in one press (wrong order, declared class).

### 1.4 6.11.8 r3 -- 4/4 with a saved literal
```js
function soundChanged() {
  applySound();
  chime.play();
  storeItem('soundLevel', 5);
  storeItem('soundMuted', false);       // also: storeItem('a');   also: storeItem('soundLevel', true / -1 / 0.5 / null / (5))
}
```
**4/4.** What is saved is not the level. The card matches `storeItem(` as a token under a key `if` (or in a helper reached from one).
**Fix:** the second argument must contain something that is not a bare literal: `storeItem\s*\(\s*[^,()]*,(?!\s*(?:true|false|null|undefined|-?[\d.]+)\s*\))[^)]*[A-Za-z_$]`
(note the lookahead sits BEFORE `\s*`: an earlier draft put it after and `storeItem('x', false)` slipped through by backtracking the space).
Must still pass (run, 12): `level`/`muted`; `{ level, muted }`; `{ level: level, muted: muted }`; `String(level)`; `muted ? 1 : 0`; `level / 10`; `JSON.stringify({...})`; `(level)`;
`!muted`; `getLevel()`; `level + 0`; a `const KEY` first argument; `storeItem ( 'a' , level )`; saved inline in the M `if`; saved in a `saveSettings()` helper called from `soundChanged()`.
Must still fail: the six literal forms above and the untouched starter. Not fixed: `storeItem('soundLevel', score)` (wrong variable, declared class).

### 1.5 6.11.8 r4 -- 4/4 with the result of `getItem` thrown away
```js
function loadSettings() {
  getItem('soundLevel');
  null;                      // any null / ?? / || / typeof anywhere in the loader satisfies the second half
}
```
**4/4** (so does `getItem('soundLevel'); if (score !== null) level = 5;`). The builder declared "any null/??/||/typeof in the load functions, even one not about the loaded value";
this is the first half of that: the call's result is never used.
**Fix:** a `getItem(` must have its value assigned or returned (`(?:=|\breturn\b)[^;]*\bgetItem\s*\(`). Must still pass (run): the reference; `if (savedLevel !== null) level = savedLevel`;
`level = getItem(...) ?? 5`; `|| 5` (declared); ternary on null; `typeof`; `if (getItem('a') !== null) { level = getItem('a'); }`; `!= null`; `isNaN` guard; `constrain(saved, 0, 10)`;
an object `const saved = getItem('sound'); if (saved) {...}`; the load written straight in `setup()`. Must still fail: the two lines above, the untouched starter.
Not fixed: loading into the wrong variables (`score = savedLevel`), and `loadSettings()` defined but not called (the starter already calls it).

### 1.6 6.11.3 r2 and r3 -- `|| true` in the head (low)
`if (star.overlaps(basket) || true) { ... chime.play(); }` and `if (star.y > 410 || true) { ... thud.play(); }` are 3/3: the card reads that a catch/miss test is in the head,
not that it is the whole test. **Fix:** refuse `||\s*(true|1)` inside the head. Must still pass: every honest head including `a.overlaps(b) || a.overlaps(c)`
(run), `star.y >= height`, `star.pos.y > 410`. Declared class (`if (true)`) in spirit, but 6.11.3 is the one lab whose cards DO read the test, so this is the cheapest way round it.

### 1.7 No safe pattern fix: code that is written but never runs (all `inFunction` / whole-file cards)
All 3/3, 4/4 or 2/2, each a real, unwired helper rather than an empty one:
- 6.11.7 r1-r3: `function goTo(next) { state = next; }` plus an uncalled `function changeState(next) { music.stop(); if (...) music.loop(); ... }` (any of the ten listed names). 3/3.
- 6.11.4 r1: `music.loop()` only inside `function startMusic2() {...}` that nothing calls, or inside `if (false)`. 4/4.
- 6.11.5 r1: `chime.rate = random(0.8, 1.25); chime.play();` in an uncalled function, in `if (false)`, once in `setup()`, or at the bottom of the file. 2/2.
  (Unconditional in `draw()` is 2/2 too, but that one is the case table's own "rate re-rolled at the top of draw" shape plus a spam `play`, not separable.)
- 6.11.8 r4: `loadSettings()` defined, `setup()` never calls it. 4/4.
6.11.8 r3 already refuses "a helper nothing calls" because it is a whole-file regex that follows the call; the `inFunction` cards cannot. Fixing these needs
`lib/grader.ts` to check that the named function is called (or a `calledFrom` option), not a pattern. Left as a declared leftover candidate.

### 1.8 No safe pattern fix: 6.11.8 step 1's "then calls `soundChanged()`" is not measured
Keys that change `level`/`muted` and save directly, never applying the sound, are 4/4:
```js
if (kb.presses('up') && level < 10) { level += 1; storeItem('soundLevel', level); }
```
r1 is "Up and down change the level" and the starter's `applySound()` already supplies a `masterVolume(...level...)`; r3 passes on the direct `storeItem`. A tightening that
requires a call after the step would refuse the honest `let before = level; ...; if (level !== before) soundChanged();` (run, passes today). Left.

---

## 2. PUNISHED ELEGANCE (honest answers refused at HEAD)

Run as named tests with recorded results, not asserted. "fixed" = passes with `sound-advanced-patterns.json`, still refusing the cheats of section 1.

| Lab / card | Honest answer | HEAD | Patched |
| --- | --- | --- | --- |
| 6.11.3 r2, r3 | a helper with a parameter defined AFTER `draw()`: `playSound(chime)` / `function playSound(s) { s.play(); }` | **1/3** (red r2, r3) | 3/3 (`h3` call may now take arguments; same for 4.r4, 5.r2, 8.r2, 8.r3) |
| 6.11.3 r1 | sounds in an object: `sfx = { chime: loadSound('...'), thud: loadSound('...') }` | 2/3 (red r1) | 3/3 |
| 6.11.4 r3 / 6.11.8 r1 | nested guard: `if (kb.presses('up')) { if (level < 10) { level += 1; ... } }` | 3/4 (red) | 4/4 (round-0's key-`if` body class had no `\{`; r4's does) |
| 6.11.4 r3 / 6.11.8 r1 | named step: `const STEP = 1; level += STEP;` | 3/4 | 4/4 |
| 6.11.4 r3 / 6.11.8 r1 | `level = level < 10 ? level + 1 : 10;` and `level = min(10, level + 1)` (swapped arguments) | 3/4 | 4/4 |
| 6.11.4 r2 | `music.volume = Math.min(level / 10, 1)`; the volume line in an `applyVolume()` / `playTune()` helper | 3/4 (red r2) | 4/4 (clamp wrapper + 11 helper names added to the `function` list) |
| 6.11.5 r1 | `const pitch = random(0.8, 1.25); chime.rate = pitch;` (also found by the moderate lens) | 1/2 | 2/2 |
| 6.11.5 r2 | `thuds = []; thuds[0] = loadSound(...)` / `thuds[i] = loadSound(...)` in a loop, or `new Array(3)` | 1/2 | 2/2 |
| 6.11.7 r1-r3 | `musicFor(next)` holding the whole logic; `stopMusic()`; `goToScreen` / `switchScreen` as the function name | 0-2/3 | 3/3 (eighteen names added) |
| 6.11.8 r4 | loader named `loadSoundSettings`, `restoreSound` | 3/4 | 4/4 (ten names added) |

**Still refused, no safe pattern fix (honest, named):**
- 6.11.4 r3 / 6.11.8 r1: `const up = kb.presses('up'); if (up && level < 10) {...}` (key alias). r4 and 8.r2/8.r3 follow such an alias; r3/8.r1 do not, and a non-participating backreference
  matches the empty string, so it cannot be added by editing the pattern without a second whole-pattern alternative. Needs the generator.
- 6.11.4 r3 / 6.11.8 r1: `changeLevel(1)` / `changeLevel(-1)` helper. 6.11.7: helpers that split the loop/play across `startTune(rate, looping)` (2/3, red r2) or `loopTune(r)`/`playOnce(r)` (1/3).
- 6.11.4 r2: `music.volume = VOL` with a named constant (a bare identifier cannot be told from `level`).
- 6.11.3 r3: a miss line that is not a number: `star.y > basket.y + 40`, `star.y > FLOOR`, `star.y > bottom` (2/3, red r3). Widening to identifiers lets `star.y > floorY` with `floorY = 0` pass.
- 6.11.3 r1: `const COIN = '/moshion/assets/coin.wav'; loadSound(COIN)` (the card reads the path on purpose). 6.11.3 r2: a hand-rolled catch (`dist(...) < 30`) with no `overlaps`.
- 6.11.8 r4: a loader factored through `readValue(key, fallback)` called from `loadSettings()`.
- Not taught, so not counted: `preload()`, `const goTo = (next) => {...}` (0/3 on 6.11.7), `var f = function () {}`, `localStorage.setItem`, `.map()` building the list.
- Deliberate, correct to refuse: `kb.pressing` for a volume step (it steps 60 times a second); `!== undefined` after `getItem` (it returns `null`); a 3-word sentence; a `/* */` sentence.
- 6.11.10 r1: a sound rule that is only a volume change (`music.volume = 0.2` on a miss, `thuds[pick].volume = ...`) is 1/2. The step lists three challenges and calls "an idea of your own welcome on top", so refusing is within the spec;
  adding `.volume =` with an identifier on its right is safe against the starter (0/2, run) and is listed below as optional.

---

## 3. Declared leftovers re-tried (accepted by policy, not counted above)

Run again so the list is a measurement and not a memory: empty-`if` bodies (`if (next) {} else music.loop();` on 6.11.7, 3/3); `if (true)` x4 around the 6.11.7 starts (3/3);
wrong value (`star.y > 999`, `basket.y > 400`, `music.volume = 5 / 1`, `chime.volume = 0.1` as "the tune is quieter", `thuds[floor(random(1))]`);
wrong direction (`!star.overlaps(basket)`, `star.overlaps(star)`, one `if` holding `level++; level--;`, the same key for up and down, `music.stop()` as the LAST line of `goTo`,
`music.loop()` on `won` and `music.play()` on `title`); random pick under any `if`; `getItem(...) || 5`; the 6.11.10 four-word floor; `.rate += 0`, `*= 1`, `chime.rate = rate` (undefined),
`chime.play(1)`, `x.fade(1)` on anything, `clips:` in a dead object; `5 .play()`; `.play` as an expression inside an `if` head. All as the builder predicted. Nothing in `lib/js-source-clean.ts` was probed.

---

## 4. Regex timing (5000-character adversarial input, real grader, comment stripper and string blanker included)

471 inputs per card, 2,826 per sweep (150 seeds x 3 shapes from 62 trigger tokens + 21 hand-made pathological shapes). Every card <= ~90 ms except two shapes:
- **6.11.8 r3: 230-530 ms** (up to 1.1 s under GC) on `function loadSettings() {if (kb.presses('up')) {x` repeated ~105 times (5000 chars; 1000 chars is 2 ms, 3000 is 90, 4000 is 158,
  growth is polynomial). Cost is the "key `if` calls `h()`, `h` is defined later" alternative: (`if` starts) x (`ident()` candidates in the body, which includes `loadSettings()` in each
  `function loadSettings() {`) x (functions to the end) x (800-char helper scan). A real student file has ~15 functions, so this cannot happen by accident; it is over the budget on a hostile paste.
  Bounding the gap (`{0,4000}`) and the helper body (`{0,500}`) brings it to ~150-230 ms, not under 100, and the 4000 bound would refuse a helper defined at the bottom of a 5.5 KB file, so **not shipped**.
- **6.11.10 r2: 190-380 ms** on 5000 `/` (or 2500 `//`): the second alternative `\/\/[^\n]*\b(...)` rescans to the end of the line from every `//` (quadratic on one long line). Bounded to `[^\n]{0,200}` in the patch file: 13-25 ms.

---

## 5. Mechanical restyles (17 transforms x 6 references, HEAD and patched identical)

`==`/`!=`, all `var`, `const` to `let`, double quotes, Allman braces, no spaces around operators, tabs, CRLF, doubled blank lines, extra parentheses round every `if`, one-line bodies,
no semicolons, brace-less bodies, `play (`, `play( x )`: **all 102 cells full.** The two that are not: stripping all comments takes 6.11.10 to 1/2 (the sentence IS a comment; correct),
and `var f = function () {}` for every function takes `inFunction` cards red on 6.11.3, .4, .7, .8 (the course teaches declarations; not a finding).

---

## 6. What the patch file holds and what ran against it

`sound-advanced-patterns.json`: `{lab: {requirement: {pattern?, function?}}}`, the same shape as the 6.10 round files (`typeof v === 'string' ? pattern : Object.assign`).
Cards touched: 3.r1 r2 r3, 4.r2 r3 r4, 5.r1 r2, 7.r1 r2 r3 (`function` list only), 8.r1 r2 r3 r4, 10.r1 r2. Every pattern compiles; no lookbehind added.

| Fix | Cards | Tests that must pass (ran) | Tests that must fail (ran) |
| --- | --- | --- | --- |
| helper call with arguments | 3.r2 3.r3 4.r4 5.r2 8.r2 8.r3 | `playSound(chime)` after `draw`; `toggleMute(1)` after | -- |
| key-`if` body enters nested blocks; step accepts a named step / any RHS holding `level + n`; "volume earlier" not in `setup` | 4.r3 (body+step also 8.r1) | the honest key shapes of `c4`, `c4b`, `c4c`, `guard` (4.r3) and `c8`, `c4c` (8.r1), both references | keys-only `level`, `score / 10`, `0.5`, `if (kb.presses('up')) {} level++` and every round-0 key cheat |
| an off value must exist | 4.r4 | 11 mute shapes (`guard` M1-M11) | `masterVolume(1)`, `(5)`, `(masterVolume())`, `(level)`, `> 0 -> (1)`, `|| true` |
| flag only | 8.r2 | the flag shapes of `c8`, reference | `masterVolume(1)`, `flip + soundChanged()`, `muted = true` |
| stored value is not a bare literal | 8.r3 | 12 value shapes (`guard2` S1-S12) | 5 literal shapes (`guard2` S13-S17) + the 3 of `c8`, one-argument call |
| `getItem` result assigned/returned; loader names | 8.r4 | the load shapes of `c8` | `getItem(...); null;`, discarded + unrelated null |
| alias of the random pitch; index-filled list | 5.r1 5.r2 | the alias and index-filled shapes of `c5`, `c5b` | rate/pick cheats of round 0 (all still red) |
| function names | 4.r2 7.r1-r3 8.r4 | `musicFor`, `stopMusic`, `goToScreen`, `switchScreen`, `applyVolume`, `playTune`, `restoreSound` | decoy-name cheats are NOT closed (1.7) |
| title wording, pan identifier, bounded `[^\n]` | 10.r1 10.r2 | the sentence / rule shapes of `c10` | the title-edit and `pan = 0` cheats |
| `|| true` head, object-of-sounds | 3.r1 3.r2 3.r3 | `a || b` heads, `sfx = {...}` | `|| true` x3 |

Optional (not in the file because it loosens rather than tightens): 6.11.10 r1 += `|\.\s*volume\s*=(?![=>])[^;\n]*[A-Za-z_$]`. The starter stays 0/2 (`music.volume = 0.4` has no letter on its right).

Per the standing rule, none of this is carried to a neighbour unchecked: 4.r3's "volume earlier" restriction is deliberately NOT applied to 8.r1 (the reference of 6.11.8 reaches the sound through the
starter's `applySound()`, which sits before the keys; the same restriction would fail the 6.11.8 reference). 8.r2's flag-only rule is NOT applied to 4.r4 (6.11.4's reference mutes with
`masterVolume(0)` / `masterVolume(1)` and no flag).

## 7. Files

- Report: `/home/shuff57/Documents/GitHub/shCode/codehs-review/loop/sound-advanced.md`
- Patches: `/home/shuff57/Documents/GitHub/shCode/codehs-review/loop/sound-advanced-patterns.json`
- Harness (scratchpad, not in the repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/s11/`
- Overlap with `codehs-review/loop/sound-moderate.md`: its G3 (alias of the pitch / the pick, 6.11.5 r1 r2) is reproduced and fixed here; its G4 (6.11.8 M with the 6.11.4 flip) is reproduced as 1.3 and fixed.
