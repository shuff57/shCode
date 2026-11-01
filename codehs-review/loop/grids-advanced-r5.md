# Advanced lens, round 5: module 6.9 Grids and Tile Maps

Run 2026-10-31 against commit eaa92f4b (round-4 fixes). Labs 6.9.4, .6, .7, .8, .10, .11, .14. Policy: grading is LAX for honest answers; only no-code or empty-of-learning passes are listed as gaps. Declared leftovers from rounds 1 to 4 (dead never-called functions, empty-if / computed-but-unused guards, hybrid loops, wrong cell read, `ROWS > r`, `r <= ROWS`, hardcoded start with real loops, `0 <= ROWS` style decoys) are not re-reported.

## Verdict: NOT CLEAN. Three gaps; the first scores full marks on every graded lab with no working code.

## Method

- Real grader: `lib/grader.ts` bundled with esbuild from the current tree, each lab's CURRENT `lesson.json`. No repo file edited.
- Replay: all 456 earlier case files (rounds 1 to 4) rerun: every round-4 close is still closed (`||`-joined bounds x3, two plain ifs + return guard, `floor(y / CELL) - TOP / CELL`, regex-literal quote smuggle). Every starter 0, every reference full.
- Round-4 shapes re-tried on the live files: `/'/; // payload '` 0/4, `await /re/`, `new /re/`, `k+++/re/` closed.
- New: a grammar fuzzer (`fuzz.cjs`, valid JS checked with the TypeScript parser) that plants a marker in every comment, string, template text and regex body and checks the marker never reaches `blankStringContents(stripJsComments(src))`, and that code markers are never lost. HEAD: 115 leaks in 18086 programs with parenthesised strings, 9146 in 17843 with templates; 0 leaks when neither is present (so these two are the only classes it can find).
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r5/` (`c/` = 15 smuggle files, `patch/js-source-clean.diff`, `p4.json`, `p6.json`, `p10.json` = proposed patterns, `fuzz.cjs`, `course.cjs`).

## GAMEABLE, cheapest first

### 1. `${ ... }` inside a template literal carries any comment through as code (BIGGEST GAP; affects every `ignoreStrings` grader in the course)

`stripJsComments` treats a backtick string as plain text up to the next backtick, with no `${` handling. `blankStringContents` does handle `${ ... }` as code. So a comment inside `${ }` is kept by the first scan ("it is inside a string") and read as code by the second. Same bypass class as round 4 item 1, different door.

Minimum passing input, 6.9.7 (parses, runs, does nothing):
```
function collect() {
  const t = `${ 1 /* player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }) */ }`;
}
function checkGoal() {
  const t = `${ 1 /* if (coins.length === 0 && player.overlaps(goals)) { won = true; } */ }`;
}
```
Scores 4/4. `//` line comments inside the `${` work the same way. Generic recipe: take the untouched starter and replace each graded function's body with `` const t = `${ 1 /* <the reference body> */ }`; ``. Run result, all functions doing nothing: 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6; 6.9.14 2/2 (with a 4-word `//` comment on top and `score += 1` in the block comment). 69 lessons use `ignoreStrings: true`, so this is course-wide, not 6.9 only.

Related desync, same effect, harder to find (6.9.7 4/4): a `/` after the `)` of an `if` head is a regex only if `closesStatementHead` says so, and it counts parentheses INSIDE strings in `stripJsComments` (strings still intact there) but not in `blankStringContents` (strings blanked). So the two scans disagree about whether `/` is a regex:
```
function collect() {
  if (typeof score == "(") /'/; // player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }) '
}
function checkGoal() {
  if (typeof score == "(") /'/; // if (coins.length === 0 && player.overlaps(goals)) { won = true; } '
}
```

Tighten (`lib/js-source-clean.ts`, tested diff `patch/js-source-clean.diff`): make `stripJsComments` template-aware (a stack of `${` brace depths, comments inside `${ }` are comments; a backtick inside opens a nested template), and keep a `shadow` copy of `out` with string and template text and regex bodies blanked, then call `slashStartsRegex(shadow)` so both scans answer the regex question on the same text.
- Now fails: all 15 smuggle files (block comment, line comment, string-paren, on 6.9.6/.7/.8/.10/.11): 0/n.
- Must still pass (run): every lab's `solution.js` full, every starter 0; all 456 earlier case files give byte-identical grades; all 574 lesson starters and references in `lessons/` graded old vs new: 0 differences; 2912 text blocks (every `.js`, fenced js block and long JSON string in `lessons/`, `pa-pseudocode/`, `scripts/`, `lib/`) give identical `stripJsComments` and `blankStringContents` output; honest templates unchanged: `` `score: ${score}` ``, `` `${a} // not a comment ${b}` ``, `` `${ f({a:1}) } x` ``, nested `` `${ `inner ${x}` }` ``, `` `${ '}' }` ``, escaped backtick, multi-line, `` `${ a / b }` ``, ternary with templates. The only changed output is a REAL `/* */` or `//` inside `${ }`, which is now stripped (the intent). Fuzzer on the patched file: 0 leaks, 0 lost code in 120000 programs. Timing: 162000 characters in 31 ms.
- Not run: `scripts/test-2-7-3-comments.mjs` (it imports the repo file, which I did not edit); run it before shipping.

### 2. 6.9.4 and 6.9.6 r1/r2: a plain string still scores (declared before; re-confirmed, now with a tested fix)

6.9.4 has no `ignoreStrings` on any card, and 6.9.6 r1 and r2 lack it too.
```
// 6.9.4, appended to the untouched starter: 5/5, nothing runs
"walls.collider='static';coins.collider='none';goals.collider='none';new Tiles(m,20,20,1,1,{'#':walls,'c':coins,'G':goals})";
```
```
// 6.9.6 findStart with no scan at all: 5/5 (r1 loops and r2 letter P satisfied by a string or a regex literal)
function findStart(map) {
  const s = "for (r) for (c) map[r][c] === 'P'";
  return { x: 1 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 };
}
```
Tighten with `ignoreStrings: true`, matching a blanked string by its LENGTH (blanking keeps length): 6.9.4 `p4.json`: r1 `walls.collider = (['"`])\s{6}\1` (static is 6, none is 4: r2/r3 `\s{4}`), r4 keys as `['"`]\s['"`]\s*:\s*walls`, r5 just `ignoreStrings`. 6.9.6 `p6.json`: r1 `.indexOf\s*\(\s*(['"`])\s\1\s*\)`, r2 `===?\s*(['"`])\s\1|(['"`])\s\2\s*===?|\.(?:includes|indexOf)\s*\(\s*(['"`])\s\3`.
- Now fails: both cheats above (6.9.4 0/5; 6.9.6 r1 and r2 red), the same cheat as a template literal and as a regex literal.
- Must still pass (run against `solution.js`, 6.9.4: 5/5, 6.9.6: 5/5; starters 0): 6.9.4 double quotes everywhere, legend in a variable, legend over several lines, `(TILE / 2)` and `0.5` centres, backtick `` `static` `` (was red, now green); 6.9.6 `while` loops, `for...of`, `indexOf('P')` per row, `"P" === ch`, `charAt(c) == 'P'`, `includes` then `indexOf`. All earlier 6.9.4 and 6.9.6 case files give the same grade except the string-only cheats (now red). Cost: the check no longer proves the letter is P (any one-character string passes; `' '` too), and `'staaat'` style wrong values of the right length pass; both are wrong-answer cases, not skipping the exercise.

### 3. 6.9.10 r4 and 6.9.11 r3: the "strip click" early return accepts ANY identifier compared with TOP. Medium-low

The round-3 alternative `\b[A-Za-z_$][\w$]*\s*(?:<|>=|<=|>)\s*(?:TOP|60|40)\b` was meant for `if (y < TOP) return;`. It also takes the wrong variable:
```
// 6.9.10 clickCell tail, after the correct r and c lines; 6/6
if (x < TOP) return;                    // typo for y: the strip click (r = -1) still throws
if (r < ROWS && c < COLS) { grid[r][c] = !grid[r][c]; }
// same with `c < TOP` (c is never >= 40, so EVERY click returns: the sketch does nothing) or `score < TOP`
```
Behaviour (run): `x < TOP` throws on the strip click; `c < TOP` and `score < TOP` leave the grid dark for all 11 test clicks. Both 6/6. 6.9.11 the same (`hitAt`: `x < TOP` throws, `c < TOP` returns false for every click).

Tighten (`10:r4`, `11:r3`): replace that identifier class by `\b[\w$]*[yY][\w$]*` (y, mouseY, my, pixelY). Now fails (r4 on 6.9.10, r3 on 6.9.11): `x < TOP`, `c < TOP`, `score < TOP`. Must still pass (run): `y < TOP`, `mouseY < TOP`, `y < 40`, the reference, every other guard shape in the 152 (10) and 84 (11) earlier case files (0 changed), starters 0. `p10.json` has both finished strings.

## Honest answers refused (elegance half, run as named tests: behaviour equal to the reference in every case below)

Fresh set of 51 short honest answers on the current labs; 42 green. The 9 red:
- 6.9.10 r1 `Array.from({ length: ROWS }, () => Array(COLS).fill(false))` and `[...Array(ROWS)].map(...)` (Array.from, spread: not taught in the module; declared earlier).
- 6.9.10 r2 `grid.forEach((row, r) => row.forEach((lit, c) => ...))` (declared earlier).
- 6.9.10 r5 `const row = grid[r]; row[c] = !row[c];` (row alias; declared earlier).
- 6.9.10 r4 `y -= TOP; if (y < 0) return; ... if (r < ROWS && c < COLS)` and `if (TOP > y) return;` before an upper-only test: both correct, both red. Low; a `y\s*<\s*0` alternative (only when `y -= TOP` / `y = y - TOP` precedes) and a reversed `TOP > y` would take them.
- 6.9.10 r6 `let count = 0; ... count++` (the starter declares `let n = 0` and the step says "adding 1 to n", so renaming is the student's own change; low, optional: accept `\b(?:n|count|total|lit)\b`).
- 6.9.11 r1 `Array.from(...)` (same as 6.9.10 r1).
- 6.9.7 r3 `if (coins.length > 0) return; if (player.overlaps(goals)) won = true;` (guard-return, declared).
Green and worth recording: `makeGrid` with `for` + `new Array(COLS).fill(false)`, `while` loops, `drawGrid` `for...of`/alias/ternary, `clickCell` one-liner guard, early return with `===`, `!== undefined` pair, `0 <= r && r < ROWS` chain, `r <= ROWS - 1`, `Math.floor`, `countLit` with `flat().filter`, `n += grid[r][c] ? 1 : 0`, `for...of`; `hitAt` guard-return, hit flag, `-= 1`/`score = score + 10`, truthy test, `!== 0`; `bricksLeft` filter, sum, `n = n + 1`; 6.9.7 function-expression callback, `coin.remove()`, `!coins.length`, `< 1`, `goals.overlaps(player)`, `won = A && B`, brace-less nested ifs, `==`; 6.9.8 `levelNum++`, `>= levels.length`, `levels.length - 1`, `const total = levels.length`, guard returns, `level?.delete()`, `walls/coins/goals.deleteAll()`, `player.pos`, destructured start; 6.9.6 `tileAt` inline/const/`charAt`/`40`/`Math.trunc`, `findStart` with `(c + 0.5) * TILE`, `indexOf`, `while`, array return.

## What I tried and could not break

- Round-4 closes: `||`-joined bounds (3 shapes), precedence slip, early-return plus two plain ifs, TOP division, regex-literal quote smuggle, `await`/`new`/`instanceof` regex, `k+++/re/`: all red.
- `await`-style keyword regex, division after `)` of a non-head call, `++`/`--` runs: no leak in the fuzzer on HEAD.
- Catastrophic backtracking: bodies of 8 to 16 KB of repeated trigger tokens under 150 ms; 44 to 68 KB reaches 1.3 to 2.9 s (quadratic, not exponential; not realistic input).
- 6.9.8 `levelNum`/`won` patterns: hardcoded `=== 3`, `=== 9`, `won = true` before `loadLevel` are lax-accepted/declared; an empty goal `if` followed by an ungated increment is 5/5 (declared "computed-but-unused guard" family).
- 6.9.14: any `score += 1` / `SHAPE[r][c]` read counts by design ("any one challenge"); `// if` comment declared.
- Quiz 6.9.13 not re-opened this round (unchanged since round 4).

## Summary of what to change

1. `lib/js-source-clean.ts`: apply `patch/js-source-clean.diff` (item 1). One edit closes the template-expression comment smuggle for the whole course and the string-paren desync.
2. 6.9.4 r1 to r5 and 6.9.6 r1, r2: `ignoreStrings: true` with the length-based patterns in `p4.json` and `p6.json` (item 2).
3. 6.9.10 r4 and 6.9.11 r3: restrict the `< TOP` identifier to names containing y (item 3, `p10.json`).
