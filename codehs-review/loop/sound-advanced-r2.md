# 6.11 Sound and Music -- strong-student lens, round 2 (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD d62de274 (sound lens round 1). Labs 6.11.3, .4, .5, .7, .8, .10. No lesson file touched.
Grading is `lib/grader.ts` bundled with esbuild (byte-identical to round 0's bundle) and called directly, each lab's own `lesson.json` requirements, no mocks.
Harness and case files are in the scratchpad (`.../scratchpad/r2/`: `lib.cjs`, `n3/n4/n4b/n5/n5b/n7/n8/n10.cjs`, `m.cjs`, `re.cjs`, `v.cjs`, `v2.cjs`, `mk.cjs`
builds the patch, `t2/t3/timing-new.cjs` timing); not in the repo. Fixes: `codehs-review/loop/sound-advanced-r2-patterns.json` (same shape as round 1's file).

**Verdict: GAP LIST (not clean).** Round 1 held: all six references full, all six starters 0, empty file 0, the 29 round-0/1 cheats I re-ran are all still red, the 349-case
replay gives exactly the 87 open items the round-1 report predicted (0 new, 0 lost), and the 102 mechanical restyles are unchanged (all full except the same two).
But the cards still read tokens, not wiring, in places round 1 did not look: **seven gaming gaps are new** (section 1; six have a tested pattern fix, one has none that does
not refuse an honest shape), **five honest 6.11.7 shapes are wrongly refused** and have a tested fix (section 2), plus a short list of rarer ones that do not (also section 2), and four lessons teach a thing that nothing grades (section 1.8).

Run: **198 new named cases** (mismatch = my expectation not met) + **137 patch-validation cases** (48 cheat / 89 honest, written after the fixes; 35 of them wrong at HEAD, 0 wrong
patched) + the 349-case and 102-restyle replays + three timing sweeps. With the patch file: **0 regressions** in the 349 + 198 + 29 (compared case by case against HEAD), references
full, starters 0, restyles identical.

---

## 1. GAMEABLE (cheapest first)

### 1.1 6.11.4 r4 -- 4/4 with a mute key that only turns the sound ON (or only OFF)
```js
// in setup(), before music.loop();
  masterVolume(0);
// in soundKeys(), replacing the whole M block
  if (kb.presses('m')) masterVolume(1);
```
**4/4.** Four sibling shapes also 4/4: the `masterVolume(0)` in a function nothing calls (`function unused() { masterVolume(0); }`), a dead `on = !on;` at the bottom of the file,
a dead `let q = score > 3 ? 1 : 0);`, and the mirror: `if (kb.presses('m')) masterVolume(0);` with `masterVolume(1);` at the top of `setup()`. The game starts silent (or M only ever turns it on):
the player can never mute, or never unmute.
Cause: round 1 added "an off value must exist" and kept "an on value must exist" as two whole-file lookaheads (`^(?=off anywhere)(?=on anywhere)(?=something under a key)`). Each half is
satisfied anywhere in the file, so neither has to be wired to the M key. The third lookahead (under a key) is satisfied by the on half alone.
**Fix** (in the patch file): off AND on must each sit under a `kb.presses` test (key `if` body, `&&` head, an alias of the key, or a helper called from one: the same five shapes the card already
follows), OR a flag toggle sits under one. Must still pass (run, 13, plus the 17 honest shapes of round 1's `guard` set): reference; `masterVolume(0)` on M and `masterVolume(1)` on N (two keys); `masterVolume(masterVolume() > 0 ? 0 : 1)`;
`masterVolume(1 - masterVolume())`; a saved-volume restore; `sound = sound === 1 ? 0 : 1; masterVolume(sound);`; `muted = !muted; masterVolume(muted ? 0 : 1);` under the key; the flag
applied each frame in `draw()`; `toggleMute()` defined before or after; nested ifs with `0.0` / `( 1 )`; `&&` heads; a `const m = kb.presses('m')` alias; 
Must still fail (run, 8, plus the 2 cheats of `guard`): the five above, `masterVolume(5)`, `masterVolume(masterVolume())`, and the round-1 cheats.

### 1.2 6.11.3 r1 -- 3/3 with no sound loaded (the load is inside a string)
```js
function setup() {
  ...
  let s = "x = loadSound('/moshion/assets/coin.wav')";     // replaces the three load lines
}
```
**3/3** (also a template literal, and a `console.log('chime = loadSound("/moshion/assets/coin.wav")')`). The first catch then throws on `chime.play()`, so the student sees a red error:
this is a free point, not a hidden bug.
Cause: r1 reads the path on purpose, so it is the one 6.11 code card without `ignoreStrings`, and the pattern `=\s*\[?\s*loadSound\s*\(` matches inside the quotes.
**Fix:** `(?:^|\n)(?:[^'"\x60\n]|'[^'\n]*'|"[^"\n]*"|\x60[^\x60\n]*\x60)*?(?:old pattern)`: the load must not start inside a quote (whole string literals before it on the line are consumed;
no lookbehind). Must still pass (run, 15): reference; double quotes; backticks; relative path; two loads on one line; `console.log('loading'); chime = loadSound(...)` on one line; array
(one line and over lines); `.push(loadSound(...))`; object of sounds (one line and over lines); a `loadSounds()` helper; trailing comments with quotes in them (`// don't`); CRLF; tabs.
Must still fail: the three string shapes.

### 1.3 6.11.3 r2 + r3 -- 3/3 with one `if` for both events and one sound
```js
  if (star.overlaps(basket) || star.y > 410) {      // replaces both ifs
    score += 1;
    chime.play();
    dropStar();
  }
```
**3/3.** r2 sees `overlaps` in the head and `.play(` in the body; r3 sees `star.y > 410` in the head and the same `.play(`. Every miss now counts as a catch and rings the chime; `thud` is
never played. (Reversed head, `star.y > 410 || star.overlaps(basket)`, is 3/3 as well.) Round 1 refused `|| true` only.
**Fix:** a head that holds `||` AND a y-comparison no longer counts for r2; a head that holds `||` AND an `overlaps` call no longer counts for r3. Must still pass (run): `overlaps(a) || overlaps(b)`;
`overlaps(a) || b.overlaps(a)`; `star.y > 410 || star.pos.y > 410`; `star.y > 410 && !star.overlaps(basket)`; `overlaps(basket) && star.y < 400`; `else if`; the `caught` / `missed` aliases.
Must still fail: both shapes above (1/3).

### 1.4 6.11.8 r3 -- 4/4 with a fixed number in disguise
```js
function soundChanged() {
  applySound();
  chime.play();
  storeItem('soundLevel', 5e0);        // also 0x5, 0b101, Infinity, NaN, Math.PI, Number(5), abs(5), int(5), Math.max(5, 5), parseInt("5"), ({a: 5})
  storeItem('soundMuted', 5e0);
}
```
**4/4** for every one of those eleven (`5`, `5 + 0`, `[5]`, `true`, `null`, `-1`, `"level"` are red, as round 1 intended). What is saved is never the setting.
Cause: round 1's "not a bare literal" rule is `[^)]*[A-Za-z_$]` (any letter), and `e`, `x`, `b`, `Infinity`, `Math`, `Number`, `abs` are letters.
**Fix:** the second argument must contain a bare variable (an identifier that is not after a dot, not a keyword or a known number wrapper, not a callee, not a key) or an empty call `f()`.
Must still pass (run, 21): `level`, `muted`, `level / 10`, `String(level)`, `Number(level)`, `Math.round(level)`, `muted ? 1 : 0`, `!muted`, `level + 0`, `level * 2`, `(level)`, `getLevel()`,
`{ level, muted }`, `{ level: level, muted: muted }`, `JSON.stringify({ level, muted })`, `[level]`, `settings.level`, `savedLevel + 1`, `max(0, level)`, `min(level, 10)`, `int(level)`; plus the
twelve S1-S12 shapes of round 1. Must still fail: the eleven above and the round-1 literals. Cost, named: `getLevel(2)` (a helper whose argument is a literal) now fails like `Number(5)`: they cannot
be told apart. Not fixed (declared wrong-variable class): `storeItem('soundLevel', score)`.

### 1.5 6.11.8 r1 and r2 -- 4/4 with the wrong variable (a boolean stepped, a flag nothing reads)
```js
  if (kb.presses('up')) { muted += 1; soundChanged(); }       // r1: 4/4. down: muted -= 1.
  if (kb.presses('m'))  { other = !other; soundChanged(); }   // r2: 4/4. also  speed = !speed;
```
**4/4** each. The level never changes (r1) and M mutes nothing (r2).
Cause: r1 accepts any variable that appears in a `masterVolume(...)` earlier in the file. The starter's own `masterVolume(muted ? 0 : level / 10)` offers `muted` too, because the
candidate list allows an identifier before `?`. r2 accepts any variable flipped under M ("any name works", so a rename is legal); nothing says the flipped name is the one `applySound()` reads.
**Fix:** r1's candidate may no longer be followed by `?` (a variable before `?` is a condition, not a number; `level / 10`, `level * 0.1`, `level)` still qualify). r2: the flipped name must occur in a
`masterVolume(...)` argument or in an `if (name) masterVolume(` head, before or after the key (two branches; the "before" branch is guarded so it stays fast, see section 4). Must still pass
(run): reference; `muted = muted === false`; `muted = muted ? false : true`; if/else, braced and brace-less; the flag renamed everywhere (`silent`, with `level` renamed `vol` too); a
`toggleMute()` helper before or after; a `const pm = kb.presses('m')` alias; `applySound()` rewritten as `if (muted) masterVolume(0); else masterVolume(level / 10);`; `applySound()` moved below the
keys; `masterVolume(level > 0 && !muted ? level / 10 : 0)`; `masterVolume(level * 0.1)`. Must still fail: the three shapes above. Cost, named: `applySound()` written with the flag in a variable that
is not itself in a `masterVolume` argument or an `if` head would be refused; nobody is asked to write that.

### 1.6 6.11.10 r1 + r2 -- 2/2 by splitting the starter's own random roll
```js
// Challenges: Make it yours. Pick one sound rule and add it.
// if                                   <- r2: one word. Anything with would/without/otherwise/instead/if/remove* passes, anywhere in the file
...
    const r = random(0.8, 1.25);        // was: chime.rate = random(0.8, 1.25);
    chime.rate = r;
```
**2/2** (with a four-word sentence instead of `// if` as well: the declared floor). r1's last alternative accepts `.rate = <any expression with a letter>` unless `random(` is on that line, so
moving the starter's own line into a variable turns a line that is excluded into one that counts. No new rule, nothing heard differently.
**Fix (r1):** a bare identifier on the right of `.rate =` counts only when that name was assigned from something with no `random(` earlier in the file (`const rate = 1 + streak * 0.1; chime.rate = rate;`).
Must still pass (run): reference; `chime.rate = 1 + score * 0.05`; `chime.rate = stepFor(score)`; `chime.rate = rates[score]`; `chime.rate += 0.05`; `chime.rate = 1 + score / 10`; a named step; pan only.
Must still fail: `const r = random(...); chime.rate = r;`, `let rate = ...`, `(r)`, and the bonus `chime.rate = rate` with `rate` never defined (was 2/2). Cost, named: `function setRate(r) { chime.rate = r; }`
(a parameter) is refused. Not fixed: the `// if` one-word floor of r2 (declared floor, same class as `// a b c d`, just two characters).

### 1.7 6.11.4 r3 -- 4/4 when the volume line lives where it never follows the keys (no safe fix)
```js
  if (kb.presses('up') && level < 10) level += 1;
  if (kb.presses('down') && level > 0) level -= 1;      // keys only step level
  ...
  if (star.y > 410) { misses += 1; thud.play(); music.volume = level / 10; dropStar(); }   // the only volume-from-level line after the keys
```
**4/4** (the same line in the catch block is 4/4; `function setup()` moved below `soundKeys()` with its taught `music.volume = level / 10` is 4/4). The volume changes only on the next miss.
Cause: the "volume line later" branch accepts any `.volume = ... level` after the key `if` in the file, wherever it sits. Round 1 closed only the one-time `setup()` line that came first.
**No safe fix.** The honest shapes that must pass are a volume line in `draw()` after `soundKeys()`, in `drawTop()`, and in a change-detect `if (level !== last) { music.volume = level / 10; last = level; }`:
they are blocks of a function that is not the keys function, exactly like the miss block. A regex cannot tell a per-frame line from an event line without depth. I would leave it, and say so in the card text if wanted.

### 1.8 Missing measurement (nothing in the lab grades it)
All are 4/4 or full with the step undone; the student who does the step and the one who does not get the same mark.
- **6.11.4 step 1:** `music = loadSound(...)` is never required (r1 is `.loop(`, r2 is `.volume =`). Deleting the line is 4/4; the file then throws on its first line, so the error teaches. Low.
- **6.11.3 step 1:** the thud's `thud.rate = 0.5` ("the same file at half speed") is ungraded; `thud = chime;` in place of the second load is 3/3. Low (audible only).
- **6.11.5 step 2:** the three rates ("each with its own rate") are ungraded; three identical thuds are 2/2.
- **6.11.7 steps 2-3:** `music.rate` per screen (0.8 / 1 / 1.25 / 0.6) is ungraded; a goTo with no `.rate` line anywhere is 3/3. This is the audible half of "music for every screen".
  Candidate new card (inFunction, same function list as r1): `^(?=(?:[\s\S]*?\.\s*rate\s*(?:=(?![=>])|\+=|-=|\*=)){2})|\.\s*rate\s*(?:=(?![=>])|\+=|-=|\*=)[^;\n]*(?:\?|\[)|\[\s*[A-Za-z_$][\w$]*\s*\]\s*\??\.\s*rate\b`.
  Run: reference and 7 honest shapes pass (a rates table, a ternary rate, `switch` with rates, per-screen tune objects with their own rate, a first-line `rate = 1` plus overrides); the starter,
  the no-rate goTo and a single `music.rate = 1` fail. Not in the patch file (it adds a requirement, and the points total changes).
  The same idea for 6.11.5 fails an honest shape (`for (...) { thuds[i].rate = 0.4 + i * 0.1; }`, `forEach`), so I do not propose it there.

---

## 2. PUNISHED ELEGANCE (honest answers refused at HEAD)

Run as named tests, recorded. The five 6.11.7 rows have a tested fix in the patch file; the list under the table does not. "Patched" = passes with `sound-advanced-r2-patterns.json`.

| Lab / card | Honest answer (taught: `default:` in 2.3, `return;` in this module's own `drawTop`, `? :` in its own `drawTop`) | HEAD | Patched |
| --- | --- | --- | --- |
| 6.11.7 r3 | `switch (next) { case 'title': ... case 'won': ... default: music.rate = 0.6; music.play(); }` (a `default:` for the last screen) | **2/3** (red r3) | 3/3 |
| 6.11.7 r3 | early returns: `if (next === 'title') { ...; music.loop(); return; }` x2, then `music.rate = next === 'won' ? 1.25 : 0.6; music.play();` | **2/3** (red r3) | 3/3 |
| 6.11.7 r2 | the same with `if (next === 'won' \|\| next === 'lost') { ...play(); return; }` then a bare `music.rate = ...; music.loop();` | **2/3** (red r2) | 3/3 |
| 6.11.7 r3 | ternary chain ending in the play: `next === 'title' ? music.loop() : next === 'play' ? music.loop() : music.play();` | **2/3** (red r3) | 3/3 |
| 6.11.7 r2 | a boolean for the compound test: `const looping = next === 'title' \|\| next === 'play'; if (looping) music.loop(); else music.play();` | **2/3** (red r2) | 3/3 |

Cause: r2/r3 count a `.loop(` / `.play(` only right after `if (...)`, `else`, `case`, `?` or `&&`, and need two of them (or one under an `||` head / an `else`). A `default:` label, a play that follows a
`return; }` block, the `:` side of a ternary, and an `if` on a name are all the same "this runs for some screens" the card is after. Fix: add `default:`, `: ...`, `return ... }` as control tokens, standalone
for r3's single trailing play (as `else` already is), and the boolean-alias form for both. Must still fail (run, 5): unconditional `music.loop(); music.play();`, the same with doubled lines, an object literal
with colons then unconditional calls, a `switch` that holds no play and an unconditional play below. The five declared "test is not read" shapes (`if (next)` twice, `else { loop; play }`, `1 ? x : 0`, `state && x`, `chime.stop()`
as the stop) are still 3/3 and stay in the declared class.

**Still refused, not fixed (honest, low):**
- 6.11.3 r2 / r3: a predicate helper, `function isCaught() { return star.overlaps(basket); }` then `if (isCaught()) {...chime.play()}` (2/3, red r2; same for `isMissed()`/r3). The aliases `const caught = star.overlaps(basket)` and `const missed = star.y > 410` pass.
- 6.11.4 r2: `music.volume = level / MAX` (a constant divisor), `Math.round(level) / 10`, `constrain(level, 0, 10) / 10` in `setup()` (3/4, red r2); 6.11.4 r3 `setVol(level)` with `function setVol(v) { music.volume = v / 10; }` (3/4, red r3).
  Same family as the declared named constant and helper, so no new work.
- 6.11.4 r3 and 6.11.8 r1: `level = 1 + level` (number first). 3/4. The pattern wants `level + n`.
- 6.11.8 r3: `storeItem` inside `applySound()` (key -> `soundChanged()` -> `applySound()`, two hops, defined above); and a change-detect `if (level !== savedLevel) { storeItem(...) }` in `draw()`. Both 3/4, red r3. The second is
  refused by the card's own text ("when a key changes a setting"). The first is a two-hop chain that the round-1 note says is followed; it is followed when the helper is defined after the caller, not when it sits above.
- 6.11.5 r2: a pick made before the miss block (top of `draw()`, or in `dropStar()`), `random([low, mid, high]).play()` with no `thuds` list, an `if/else if` on `floor(random(3))`: 1/2. Not findings: the step says
  the pick goes inside the miss block, and `random(list)` is not taught. 6.11.5 r1: the rate rolled in `dropStar()` for the next catch: same, by the step text.

**Tested and accepted (no finding), all four lab shapes of the brief:** nested ifs (6.11.4 r3, 6.11.8 r1); flat `&&` in any order and three-part (`level < 10 && kb.presses('up')`, `... && !muted`); `else if` key chains; clamps by ternary,
`min`/`max`, `Math.min`, `constrain`, `if (level > 10) level = 10` after; `++`/`--` prefix and postfix, `+= 2`; one-line braces, brace-less with a comma; `const STEP`; helper names (`applyVolume`, `playTune`, `toggleMute`, `loadSounds`, `saveAll`,
`playRandom(list)`, `playSound(chime)`); aliases (`caught`, `missed`, `pm = kb.presses('m')`, the store-the-pick alias `const t = thuds[idx]`); `let`/`const`/`var`; objects and arrays of sounds; renamed `muted` / `level`; brace
placement, tabs, CRLF, no-semicolon, extra parentheses (the 17 x 6 restyles).

---

## 3. Declared leftovers re-tried (not counted above)

Re-run so the list is a measurement: code written but never called (decoy `changeState`, `music.loop()` in an uncalled helper or `if (false)`, `loadSettings()` not called from `setup()`); 6.11.8 step 1 never calls `soundChanged()`
(keys that step and save `level` directly: 4/4); key alias `const up = kb.presses('up')`; `changeLevel(1)`; `music.volume = VOL`; `getItem(...) || 5`; empty-`if` bodies and `if (true)` around the music starts; wrong value (`star.y > 999`,
`music.volume = 5 / 1`, `chime.volume = 0.1`, `thuds[floor(random(1))]`); wrong direction (`!star.overlaps(basket)`, `level++; level--;` in one `if`); wrong variable saved or loaded (`storeItem('soundLevel', score)`,
`misses = getItem(...)`, a `getItem` result assigned and never used, a null test on another name); random pick under any `if`; `masterVolume(0); masterVolume(1);` in one press; 6.11.10's four-word floor. All as declared. Nothing in `lib/js-source-clean.ts` was probed.

---

## 4. Regex timing (5000-character adversarial input, real grader, comment stripper and string blanker included)

Three sweeps: 491 inputs per card (150 seeds x 3 shapes from 68 trigger tokens + 41 hand-made shapes, one aimed at each structure the patch touches), then 10 and 22 repeated shapes aimed
at 6.11.4 r3/r4 and 6.11.8 r1/r2.
**HEAD: worst 70 ms (6.11.8 r1, on `masterVolume(a) if (kb.presses(x)) { a = !a; ` repeated; `if (muted) masterVolume(` x200 is 64 ms; the growth is quadratic).
Patched: worst 69 ms (the same 8.r1, which the patch only narrows), 6.11.8 r2 68 ms (HEAD 31 ms), 6.11.4 r3 31 ms, 6.11.4 r4 29 ms, every other card <= 10 ms.** All under the ~100 ms budget.
One draft of the 8.r2 fix scored 5,400 ms on `if (muted) masterVolume(` x200 (an unbounded argument scan times a whole-file scan per candidate); it is now bounded to `[^;\n)]{0,80}`, guarded by "a `kb.presses`
exists" and "this name is also toggled somewhere", and takes 5 ms on that input. No lookbehind and no duplicate group name anywhere in the patch (each copy of a repeated sub-pattern gets its own suffix).
Size: 6.11.4 r4 and 6.11.8 r2 are now ~11 KB each.

---

## 5. What the patch file holds and what ran against it

`sound-advanced-r2-patterns.json`: `{lab: {requirement: {pattern}}}` for 3.r1 r2 r3, 4.r3 r4, 7.r2 r3, 8.r1 r2 r3, 10.r1. Every pattern compiles.

| Fix | Cards | Must pass (ran) | Must fail (ran) |
| --- | --- | --- | --- |
| off and on both under a key (or a flag under a key) | 4.r4 | 13 + the 17 honest `guard` shapes | 8 + the 2 `guard` cheats |
| load not inside a quote | 3.r1 | 15 load shapes | 3 string shapes |
| `\|\|` with the other event refused | 3.r2 3.r3 | 8 heads | 2 combined ifs |
| stored value has a bare variable | 8.r3 | 21 values + 12 round-1 S1-S12 | 22 literals/wrappers |
| `?` not a number; flag must reach a `masterVolume` | 8.r1 8.r2 (4.r3 shares r1's fix; unchanged on every case) | 5 + 11 | 2 + 3 |
| `default:`, `return }`, `: ` tail, boolean alias | 7.r2 7.r3 | 8 shapes + the c7 set | 5 |
| random-rolled name does not count | 10.r1 | 8 | 3 |

Per the standing rule, the 6.11.4 r3 `?` change is also run on 4.r3 (reference, the 18 `c4c` shapes, the 67 `c4` cases: identical to HEAD), and 8.r2's flag rule is NOT applied to 4.r4's flag branch (6.11.4's reference mutes with `masterVolume(0)` / `masterVolume(1)` and no flag).
A gap with no fix that avoids an honest refusal: 1.7. Everything else in section 1 has one.

## 6. Files

- Report: `/home/shuff57/Documents/GitHub/shCode/codehs-review/loop/sound-advanced-r2.md`
- Patches: `/home/shuff57/Documents/GitHub/shCode/codehs-review/loop/sound-advanced-r2-patterns.json`
- Harness (scratchpad, not in the repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/r2/`
- Previous rounds: `sound-advanced.md`, `sound-advanced-patterns.json`, `sound-fix-cases.md`.
