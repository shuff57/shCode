# Advanced lens, round 6: module 6.9 Grids and Tile Maps

Run 2026-10-31 against commit 55d851cb (round-5 fixes). Labs 6.9.4, .6, .7, .8, .10, .11, .14. Policy: LAX for honest answers; only passes with no real code are listed. Leftovers declared in rounds 1 to 5 (dead never-called functions, empty-if and computed-but-unused guards, hybrid loops, wrong cell read, one-character string compare on 6.9.6 r2, Array.from/spread builders, forEach drawing, row-alias flips, wrong-cell flip, TOP on the column, counter not named n, 6.9.14 "any one challenge") are not re-reported.

## Verdict: NOT CLEAN. Three lexical gaps; each scores FULL MARKS on every graded lab with no working code. All three are the same defect as rounds 4 and 5 (the cleaner reads as code something JavaScript reads as a comment), and one 59-line patch to `lib/js-source-clean.ts` closes all three.

## Method

- Real grader: `lib/grader.ts` bundled with esbuild from the current tree and each lab's CURRENT `lesson.json`. No repo file edited (the patch was built in the scratch directory only).
- Replay: the 615 case files from rounds 1 to 5 (cheat and honest, every lab) re-run on HEAD and compared with the round-5 patched baseline: every earlier close still closed, the only differences are the two round-5 fixes (6.9.4 string-only 5/5 -> 0/5, 6.9.6 all-strings 2/5 -> 0/5). Every starter 0, every reference full.
- Round-5 smuggles (template-expression comment, string-paren, regex-literal quote): the 15 files in `r5/c` all 0 on HEAD.
- New: the round-5 grammar fuzzer rebuilt with V8 (`vm.Script`) as the validity oracle instead of the TypeScript parser. TypeScript does not know `<!--` and so called such programs invalid; V8 is what the sketch actually runs on. Added generators for object literals before `/`, `<!--`, `-->`, and a regex after a block. HEAD on 3 seeds of 60000: 40000+ comment-marker leaks per seed in `stripJsComments` output, 7000+ lost-code. Patched: 0 and 0 (one seed shows 3 leak/3 lost, all from a generator artifact: `${TPL3Q` followed by a backtick is a TAGGED template in real JS, so the "lost" text is a string).
- Browser check (Chrome, `playwright-cli`, a `<script>` element with `textContent`, exactly what `public/moshion/runner.html` line 195 does): `<!-- function collect() {}` leaves `typeof collect` = `undefined`; `--> function f() {}` the same; `#! function hb() {}` the same; `window.t = {} / 1 // function zz() {}` gives `NaN` and `typeof zz` = `undefined`.
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r6/` (`c1`, `c2`, `c5`, `c6` = smuggle files, `patch/cur2.ts` = patched file, `patch/js-source-clean.r6.diff`, `fuzz4.cjs`, `hon.cjs`, `honB.cjs`, `h10.fixed.json`).

## GAMEABLE, cheapest first

### 1. `<!--` and `-->` are line comments in a classic script; the cleaner keeps them as code (BIGGEST: every lab, trivial to find)

Annex B of the language: in a non-module script `<!--` starts a single-line comment anywhere, and `-->` does the same at the start of a line. The sketch runs as a classic script, so the text after them never runs. `stripJsComments` knows only `//` and `/* */`.

Minimum passing input, 6.9.7 (parses, runs, defines `collect` and `checkGoal`, both empty): 4/4.
```
function collect() {
<!-- player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; });
}
function checkGoal() {
<!-- if (coins.length === 0 && player.overlaps(goals)) { won = true; }
}
```
Generic recipe, run on the REFERENCE of each lab, every line prefixed `<!-- ` (or `--> `): nothing is defined at all (`Object.keys(globalThis)` empty). Scores on HEAD, both prefixes: 6.9.4 5/5, 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6, 6.9.14 2/2. 6.9.14 minimal, two lines, 2/2:
```
// it gives five points
<!-- score += 5;
```
Patched: all of the above 0 (6.9.14 1/2: r2 is the comment itself and reads raw text by design).

### 2. A hashbang line is a comment too (first two characters of the file are `#!`)

`#!` at the very start of a script is a comment to the end of that line (Chrome 74+, Node). It is one line, but a line can hold the entire reference:
```
#!function collect() { player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }); } function checkGoal() { if (coins.length === 0 && player.overlaps(goals)) { won = true; } }
```
6.9.7 4/4, nothing defined. The same one-line form of each reference (comments removed, lines joined): 6.9.4 5/5, 6.9.6 5/5, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6 (6.9.14 1/2, its r2 wants a comment first). Patched: 0.

### 3. Division after a function or class expression is read as a regex start, which swallows the `//` of a comment

`slashStartsRegex` answers "regex" after any `}`. After a block that is right; after an object literal, a function expression or a class expression it is division. So `x = function () {} / 1 // note` makes the cleaner take `/ 1 /` as a regex literal, then the second slash of `//` is not a comment start either, and the text after it is kept as code. Round 4 closed the same family for `await`, `new`, `instanceof` and `k+++/re/`; the `}` door was open. Related: `x = {} / 1 // note`, `x = {a(){}} / 2 // note`, `x = class {} / 1 // note`, `x = async function(){} / 1 // note`, `x = typeof function(){} / 2 // note` all leak (all valid JavaScript, all evaluate to NaN).

Minimum passing input, 6.9.7: 4/4.
```
function collect() {
  const t = function () {} / 1 // player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; })
}
function checkGoal() {
  const t = function () {} / 1 // if (coins.length === 0 && player.overlaps(goals)) { won = true; }
}
```
A payload with a `/` in it (`floor(x / CELL)`) pairs off with the swallowed slash and loses its front half; one sacrificial slash at the front of the comment fixes the parity (`// / floor(x / CELL)`). With that, every graded body of every lab is `const t = function () {} / 1 // / <reference body on one line>`: 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6; and 6.9.4 as the single line `const t = function () {} / 1 // / <whole reference on one line>` 5/5 (no global defined). Patched: all 0.

## Tighten (one file, `lib/js-source-clean.ts`; tested; diff below)

1. `stripJsComments`: treat `<!--` (anywhere outside strings, templates and regex literals) as a line comment; treat `-->` as one when only whitespace has come before it on its line, or since a block comment that itself contained a line break; treat `#!` at index 0 as a line comment.
2. Both scanners (`stripJsComments` and `blankStringContents`): a candidate regex literal whose closing slash is directly followed by `/` or `*` is not a regex. That slash opened a `//` or `/* */` comment, so the first slash was a division. This closes every `}` division variant at once (object literal, function expression, class expression, arrow-adjacent) without having to classify braces; a first attempt that tracked object-literal braces did NOT close the function-expression and class-expression forms, which is why this rule is the one proposed.

Cheap answers that now fail: items 1, 2, 3 above on every lab (0/n; 6.9.14 1/2).

Must still pass (all run):
- every lab's `solution.js` full, every starter 0 (6.9.4 5/5, 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6, 6.9.14 2/2);
- all 574 lesson starters and references in `lessons/` graded old vs new: 0 differences;
- all 615 earlier case files: byte-identical grades;
- `stripJsComments` and `blankStringContents` over 2588 files (every `.js .mjs .cjs .ts .tsx .md .json` in `lessons`, `scripts`, `lib`, `components`, `app`, `functions`, `curriculum`, `pa-pseudocode`, `public/moshion/docs`): 0 differences, except the first line of real hashbang scripts;
- honest idioms that look close to the new rules, unchanged: `while (n --> 0)`, `k = i-->0 ? 1 : 2`, `a = b <! --c`, `"<!-- text"`, `` `<!-- ${x}` ``, `/<!--/.test(s)`, `if (a) { } /x/.test(s); // c`, `x = {a:1} / 2 / 3; // c` (this last one was mis-read before: the `2 /` was blanked as a regex and the comment survived);
- `scripts/test-2-7-3-comments.mjs` ok, `scripts/check-starters.mjs` ok, `node --import ./scripts/register-ts.mjs scripts/audit-grader-tolerance.mjs --gate` ok (all run against a scratch copy of `lib/` with the patch; repo untouched);
- fuzzer with the V8 oracle on the patched file: 0 comment-marker leaks and 0 lost code in 3 x 60000 programs plus a 30000-program run with block/regex/object generators (the single 3-leak seed is the tagged-template artifact above); strip-only mode (graders without `ignoreStrings`) 0 comment leaks as well;
- speed: 5000 ordinary lines (170 KB) 146 ms patched vs 221 ms on HEAD (run to run noise); no new quadratic step (the `-->` check looks only at the current line).

```diff
--- patch/orig.ts	2026-10-31 23:18:40.941772154 -0700
+++ patch/cur2.ts	2026-10-31 23:31:08.980708065 -0700
@@ -19,6 +19,7 @@
   // Template literals nest: `${ ... }` is code (comments in it are comments), and a backtick inside it opens another template.
   const exprDepth: number[] = []; // open-brace depth inside each active ${ }
   const blankOf = (t: string) => t.replace(/[^\n]/g, ' ');
+  let newlineCommentAt = -1;
   while (i < n) {
     const c = src[i];
     const nx = src[i + 1];
@@ -64,18 +65,29 @@
         exprDepth[exprDepth.length - 1]--;
       }
     }
+    // Annex B: a classic <script> (which is how the sketch runs) treats `<!--` anywhere as a line comment, and `-->` as one
+    // when only whitespace (or comments) came before it on the line. Without this `<!-- player.overlaps(...)` ran nothing and read as code.
+    // A hashbang line (`#!` as the very first two characters) is a comment too (ES2023, Chrome 74+ in a classic script).
+    if (i === 0 && c === '#' && nx === '!') { while (i < n && src[i] !== '\n') i++; continue; }
+    if ((c === '<' && src.startsWith('<!--', i)) || (c === '-' && src.startsWith('-->', i) && /^[ \t\r\f\v]*$/.test(out.slice(Math.max(out.lastIndexOf('\n') + 1, newlineCommentAt))))) {
+      while (i < n && src[i] !== '\n') i++;
+      continue;
+    }
     if (c === '/' && nx === '/') {
       while (i < n && src[i] !== '\n') i++;
       continue;
     }
     if (c === '/' && nx === '*') {
+      const start = i;
       i += 2;
       while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
       i += 2;
+      if (src.slice(start, i).includes('\n')) newlineCommentAt = out.length; // a block comment with a line break in it counts as a line start for `-->`
       continue;
     }
     if (c === '/' && slashStartsRegex(shadow)) {
-      // A regular-expression literal: copy it whole, so a quote inside it ( /'/ ) does not open a phantom string
+      // A regular-expression literal: copy it whole (unless a '/' or '*' follows its closing slash: that slash opened a // or /* comment
+      // and this one is a division, as in `x = function () {} / 1 // note`), so a quote inside it ( /'/ ) does not open a phantom string
       // that carries the comments after it through as code.
       let j = i + 1;
       let inClass = false;
@@ -88,7 +100,7 @@
         else if (d === '/' && !inClass) { closed = true; break; }
         j++;
       }
-      if (closed && j > i + 1) {
+      if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
         out += src.slice(i, j + 1);
         shadow += '/' + blankOf(src.slice(i + 1, j)) + '/';
         i = j + 1;
@@ -188,7 +200,7 @@
           else if (d === '/' && !inClass) { closed = true; break; }
           j++;
         }
-        if (closed && j > i + 1) {
+        if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
           out += '/' + ' '.repeat(j - i - 1) + '/';
           i = j + 1;
           continue;
```

## Honest answers refused (elegance half, run as named tests)

75 fresh honest answers, run on HEAD and again on the patch (identical result both times). 70 green, 5 red:
- 6.9.10 `countLit` with `grid.forEach(row => row.forEach(cell => { if (cell) n++; }))` r6 (forEach, declared family; the lesson teaches `for`).
- 6.9.10 `makeGrid` with `g[r] = []; ... g[r][c] = false;` instead of `push` r1. Not taught anywhere in the course (6.9.9 and the earlier modules only build with `push`), so left alone; if it should be accepted, the leaf alternative in r1 needs `\]\s*\[[^\]]+\]\s*=\s*(?:false|0)` beside `.push(false)`.
- 6.9.7 `checkGoal` guard-return, both `if (coins.length > 0) return;` and `if (coins.length !== 0) { return; }` followed by the overlaps test, r3 (declared).
- 6.9.7 `collect` with `player.overlapping(coin)` in a loop, r1. `overlapping` is not taught (the step prescribes the `overlaps(group, callback)` form), so not a defect.
Green and worth recording (new this round): 6.9.10 clickCell with `c < 0 || c >= COLS || r < 0 || r >= ROWS` return, `y < TOP` return then `r < ROWS && c < COLS`, `col`/`row` names, `=== true ? false : true` flip, if/else flip, `y -= TOP` first, nested ifs, an `inside` const, `grid.length`/`grid[0].length`, `grid[r].length`, `let` for r and c, a `y >= TOP` wrapper, an `x`-range early return, an `now = grid[r][c]` alias; countLit `for...of` with `n++`, `while` with `n = n + 1`, `flat().filter(Boolean).length`, `reduce` with `filter`, `n += grid[r][c] ? 1 : 0`, `=== true`; makeGrid `while` loops, `push([])` then `g[r].push`, `new Array(COLS).fill(false)`, `push(0)`; drawGrid if/else fills, `square(...)`, `x`/`y` consts, a `lit` const, `=== true ? :`, `!grid ? :`. 6.9.11 hitAt with early returns, nested ifs, `wallY` const, flag variable, `y < TOP` return, `onWall` const, `-= 1`; bricksLeft `for...of` with `n++`, `n += bricks[r][c]`, `while`; makeBricks `while`, `push(true)`. 6.9.7 `function (p, coin)` callback with `coin.remove()`, a reverse `for` over `coins[i]`, `5` points, `won = A && B`, nested ifs, `< 1`, `== 0`, a `allGone` const, if/else. 6.9.8 `levelNum++` with `>=`, last-level check first, nested ifs, a `total` const, `deleteAll()` x3, `if (level) {}` with braces and `player.pos = {...}`, `levels[n]` passed straight in. 6.9.6 `findStart` with `while`, `charAt`, a `half` const, `indexOf` per row, `'P' === ...`, `(c + 0.5) * TILE`, a `letter` const; `tileAt` with `Math.floor`, one line, bounds guard, `charAt`, literal `40`.
Declined on purpose: 6.9.4 `collider = 's'` (p5play shorthand, never taught in the course).

## What I tried and could not break

- All round-5 closes: template-expression comments, string-paren desync, `||`-joined bounds, precedence slip, early-return plus two plain ifs, TOP division, regex-literal quote smuggle, `await`/`new`/`instanceof` regex, `k+++/re/`, plain-string cheats on 6.9.4 and 6.9.6, `x < TOP` guard (6.9.10 r4, 6.9.11 r3 now need a name containing y).
- `\r` and U+2028 line breaks: JS ends a `//` comment there and the cleaner keeps stripping to `\n`; that over-strips (refuses code), it never lets text through.
- Multi-line `[ // ... ]` character-class tricks and a regex that spans a comment: the swallowed text is blanked by `blankStringContents`, so only a grader without `ignoreStrings` could see it; no 6.9 lab is such a grader, and strip-only fuzzing on the patched file shows 0 leaks anyway.
- `extractFunctionBody` brace balancing: a stray `{` or `}` inside a string, regex, comment or template is blanked or stripped first, so a body cannot be stretched into the next function.
- Identifiers with zero-width joiners (`coin.delete‍()`): an undefined name at run time, same family as a typo; not a grader question.
- 6.9.14: `score += 1; // a b c d` is 2/2 by design (any one challenge), declared.
- Quiz 6.9.13 not re-opened this round (unchanged since round 4).

## Summary of what to change

1. `lib/js-source-clean.ts`: apply the diff above (items 1 to 3). One edit, no lesson file touched, no requirement changed. Course-wide: every `ignoreStrings` and strip-comments grader benefits (574 lesson files compared, 0 grade changes).
2. Optional, unchanged from round 5: nothing further in 6.9 lesson.json.
