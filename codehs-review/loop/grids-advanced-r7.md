# Advanced lens, round 7: module 6.9 Grids and Tile Maps

Run 2026-11-01 against commit 5912854c (round-6 fixes). Labs 6.9.4, .6, .7, .8, .10, .11, .14. Policy: LAX for honest answers; only passes with no real code are listed. Declared leftovers (dead never-called functions, redefinition that shadows a graded function, empty-if and computed-but-unused guards, hybrid loops, wrong cell read, one-character string compare on 6.9.6 r2, Array.from/spread builders, forEach drawing, row-alias flips, wrong-cell flip, TOP on the column, counter not named n, index-assignment grid building, 6.9.14 "any one challenge") are not re-reported.

## Verdict: NOT CLEAN. Four lexical gaps, each scoring FULL MARKS on every graded lab with no working code (V8 and Chrome define nothing). Same family as rounds 4 to 6: the cleaner reads as code something JavaScript reads as a comment or a regex literal. The round-6 fixes held (all 15 round-5 and all round-6 smuggles still 0); these are different doors in the same wall. One patch to `lib/js-source-clean.ts` closes all four, and a second finding (the new `htmlComments` flag) is clean.

## Method

- Real grader: `lib/grader.ts` bundled with esbuild from the current tree and each lab's CURRENT `lesson.json`. No repo file edited (the patch lives in the scratch directory and in a scratch copy of the repo).
- V8 is the oracle, not the TypeScript parser. Every candidate was parsed with `vm.Script` and, for the headline ones, run as a `<script>` element in Chrome through `playwright-cli` (a throwaway session `r7`, closed; `mom` untouched), the way `public/moshion/runner.html` line 195 does: in all six smuggles below the payload function is `undefined` and no error is thrown.
- `@lezer/javascript` (already installed through CodeMirror) was used as a second opinion: on the nine division/regex smuggles I tried it returns the right `String`, `RegExp` and `LineComment` spans. See "Option".
- Replay: 667 case files from rounds 1 to 6 re-run on HEAD and on the patch; the HEAD lines are the round-6 lines, still closed. Every starter 0, every reference full.
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r7/` (`c/` = the 42 smuggle files, `patch/cur.ts` = patched file, `patch/js-source-clean.r7.diff`, `fuzz8.cjs` = V8-validity fuzzer, `brace.cjs` = 40 hand cases for `}` then `/`, `honC.cjs`, `repo/` = scratch repo copy used for the repo's own tests).

## GAMEABLE, cheapest first

### 1. Any whitespace JavaScript knows but the cleaner does not, before `-->` (BIGGEST: verbatim reference, every lab, one prefix per line)

Annex B: `-->` is a line comment when only white space and comments came before it on its line. JavaScript's white space is `\s`: tab, vertical tab, form feed, space, **NBSP (U+00A0)**, **BOM (U+FEFF)** and every Zs space (U+2003 EM SPACE and so on). Line ends are `\n`, `\r`, **U+2028** and **U+2029**. The cleaner's test is `/^[ \t\r\f\v]*$/` on the text since the last `\n`, so any of those characters before `-->`, or a U+2028/2029/lone `\r` line end in front of it, makes the cleaner say "code". NBSP is what Option+Space types on a Mac.

Minimum passing input, 6.9.7 (two lines, `<NBSP>` is the single character U+00A0): HEAD 4/4, patched 0/4. Chrome: nothing defined.
```
<NBSP>--> function collect() { player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }); }
<NBSP>--> function checkGoal() { if (coins.length === 0 && player.overlaps(goals)) { won = true; } }
```
Generic recipe: the unmodified `solution.js` of each lab with `<NBSP>--> ` put in front of every line (also tried with U+FEFF and U+2003). Nothing is defined; HEAD scores 6.9.4 5/5, 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6, 6.9.14 2/2, for all three characters. Patched: 0 on every lab except 6.9.14 1/2 (r2 is the comment itself and reads raw text by design).

### 2. A U+2028 line end hides the whole file on one line

Same cause, one line. `;<U+2028>--> ` followed by the reference with its comments removed and newlines turned into spaces: JavaScript sees `;`, a line end, then a `-->` comment that runs to the end of the file. The cleaner never sees a `\n`, so the `-->` is "after code" and is kept. Chrome: nothing defined.
```
;<U+2028>--> function collect() { player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }); } function checkGoal() { if (coins.length === 0 && player.overlaps(goals)) { won = true; } }
```
6.9.7 4/4; the one-line reference on every lab: 6.9.4 5/5, .6 5/5, .8 5/5, .10 6/6, .11 6/6, .14 2/2 (with a `// it gives five points` line first). Patched: 0 (14: 1/2).

### 3. Division after `}` or after a regex literal, with a quote or backtick pair that flips the comment into a string

Round 6 closed `x = function () {} / 1 // note` by refusing a "regex" whose closing slash is followed by `/` or `*`. That only works when the second slash is the comment. Put a second slash INSIDE a string or template on the same line and the cleaner's phantom regex ends there, the closing quote of the string then opens a phantom string that runs into the comment, and the comment's own quote closes it, so the text after it is code. Valid JavaScript throughout (all evaluate to `NaN` or a string).

Minimum passing input, 6.9.7: HEAD 4/4, patched 0/4. Chrome: both functions defined, bodies empty.
```
function collect() {
  const t = {} / 1 + '/' // ' player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }); '
}
function checkGoal() {
  const t = {} / 1 + '/' // ' if (coins.length === 0 && player.overlaps(goals)) { won = true; } '
}
```
This form needs the payload to hold no single quote. The backtick form keeps the payload exactly as the reference wrote it (the cleaner reads the three backticks as one balanced template): replace each graded body of the reference with
```
  const t = {} / 1 + `/` // `player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; });
```
HEAD: 6.9.6 5/5, 6.9.7 4/4, 6.9.8 5/5, 6.9.10 6/6, 6.9.11 6/6; 6.9.4 as one line `const t = {} / 1 + `/` // `<reference on one line>` 5/5 and 6.9.14 2/2 (`// it gives five points` then `const t = {} / 1 + `/` // `score += 5;`). Patched: 0 on all (14: 1/2). Other left-hand sides that take the same road (each leaks on HEAD in the 40-case battery; every one is closed by the patch): a named, async or generator function expression, `var x = function () {} / 1 ...`, `return class {} / 1`, `new class {}`, `{}` after `typeof`, `in`, `||`, `??`, `yield`, `a ? ... :` or `return`, an object-literal value `{ k: {} }`, a getter object, `${ {} / 1 ... }` inside a template, and a regex literal (`/a/ / 1 + '/' // ' payload '`: the cleaner reads the slash after a regex literal as the start of a second regex). `[{}]`, `({})` and `(function () {})` do not leak: they end in a bracket, which already divides.

The opposite direction (cleaner says division, JavaScript says regex) is item 4's `of` / `yield` / `for await` door; the unicode-identifier form in item 4 is this item's direction (cleaner says regex, JavaScript says division).

### 4. Words that precede a regex literal and are not in the cleaner's list, so a regex body reads as code

`slashStartsRegex` knows `return typeof else do case throw void delete in new instanceof await`. Missing: `of` (`for (const q of /.../.source)`), `yield`, and `for await (...)` as a statement head (`closesStatementHead` knows only `if while for with`). And its `[^\w$.]` word boundary is ASCII, so an identifier ending in a keyword after a non-ASCII letter (`éreturn`) is read as the keyword `return` followed by a regex, which is the item-3 mechanism again.

Minimum passing input, 6.9.7: HEAD 4/4 (the reference text sits inside regex literals, which JavaScript never runs; the cleaner thinks `/` after `of` is division and leaves the "regex" body as code). Patched 0/4. Chrome: both functions defined, bodies empty.
```
function collect() { for (const q of /player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; })/.source) {} }
function checkGoal() { for (const q of /if (coins.length === 0 && player.overlaps(goals)) { won = true; }/.source) {} }
```
Unicode-identifier form, 6.9.4 5/5 on HEAD, 0/5 patched: `var éreturn = 4; const t = éreturn / 1 + `/` // `<reference on one line>`. `yield /body/` inside a generator and `for await (const q of []) /body/.test(q)` inside an async function behave like `of` (verified on the cleaner output, not graded for full marks; same mechanism).

## The new `htmlComments` flag in `lib/grader.ts`: no hole opened

`readableSource` passes `htmlComments = !/\.(md|txt)$/i.test(req.file || '')`. Every 6.9 requirement has `file: "script.js"`, and the only other file name any lesson grades is `README.md` (42 lessons, none in 6.9); `lessons/` contains no `.html`/`.css` requirement. The student never chooses `req.file` (it comes from `lesson.json`), so a `.js` lab cannot be graded with a `.md` name. Consequence for README labs, unchanged by this flag: `<!-- hidden text -->` in a `.md` file is kept as readable text, exactly as before round 6, because it was never stripped. That is a baseline property of the 42 README-graded plan/flowchart labs, not a regression, and outside this module; noted only so it is not mistaken for a new hole. Side note: `server.js` still carries its own old `stripJsComments` (no template, regex or HTML-comment handling). It runs only in the dev server's `POST /api/grade` route (`server.js` line 538), not in the shipped client grader, so it does not affect students; it will disagree with the real grader on every item above and in rounds 4 to 6.

## Tighten (one file, `lib/js-source-clean.ts`; tested; diff below)

1. Line ends and white space: add `isLT` (`\n \r U+2028 U+2029`); `//`, `<!--`, `-->`, `#!` comments and regex-literal scans stop at any of them; the "only white space before `-->`" test becomes `/^\s*$/` on the text since the last such line end (JavaScript's `\s` is exactly WhiteSpace plus LineTerminator); a `"`/`'` string also ends at `\r`.
2. A `/` straight after a regex literal divides: remember where the last regex literal ended (`regexEnd`), in both scanners.
3. A `/` after `}`: read what stood before the matching `{` (a value position such as `=`, `(`, `,`, `[`, `?`, `return`, `${`, `: ` of an object key or of `a ? b :` means object literal, function expression or class expression, so `/` divides; a statement position, `case x:`/`default:`/label colon, an arrow body, or a function/class declaration means block, so `/` starts a regex). Replaces "always regex after `}`".
4. Add `of` and `yield` to the regex-after words, `for await` to the statement heads, and make the word boundary Unicode-aware (`\p{ID_Continue}`, `$`, `.`, ZWNJ, ZWJ).
5. All backward walks share a 3,000,000-step budget per call; past it a `}` is read as a block (HEAD behaviour). Without it a 120 KB file of `}/` repeated took 7.8 s; with it 0.4 s, same as HEAD.

Cheap answers that now fail: items 1 to 4 on every lab (0/n; 6.9.14 1/2 because its r2 reads raw text by design).

Must still pass (all run, on a scratch copy of `lib/` with the patch; repo untouched):
- every lab's `solution.js` full (5/5, 5/5, 4/4, 5/5, 6/6, 6/6, 2/2), every starter 0;
- all 580 lesson starters, references and `solution/` variants in `lessons/` graded old vs new: 0 differences;
- all 667 earlier case files (cheat and honest, rounds 1 to 6): identical grades to HEAD;
- honest batteries: round 6's 43 + 32 named cases give the same 3 + 2 declared reds as HEAD and nothing new; 10 new honest 6.9.6/6.9.8 shapes (below) all green on both;
- `stripJsComments`/`blankStringContents` over 2590 files in `lessons scripts lib components app functions curriculum pa-pseudocode public/moshion/docs`: 0 differences except 6 `.tsx` files where JSX `/>` after an expression container (`{a ? <A /> : <B />}`) was mis-read as a regex on HEAD and is now read correctly (the patch is more right than HEAD there; no lesson file is affected);
- `scripts/test-2-7-3-comments.mjs` ok, `scripts/check-starters.mjs` ok, `scripts/test-grader-tolerance.mjs` 334 cases ok, `scripts/test-grader-tolerance-3x.mjs` 953 ok, `scripts/test-grader-alternatives-2x.mjs` 24 ok, `scripts/test-rubric-tolerance-2-1.mjs` ok, `audit-grader-tolerance.mjs --gate` ok;
- the `}`-then-`/` hand battery: 40 cases (label, `case`, `default`, `else`, `try/finally`, `do/while`, class and function declarations, arrow bodies, object literals after every operator, IIFE and function/class expressions in every value position): all classified as V8 does; the one "honest" regex-after-newline case in that file is a V8 syntax error and is ignored;
- fuzz with V8 as validity oracle, generators for object/function/class/regex-literal left-hand sides, quote and backtick traps, labels, switch/case, NBSP/BOM/EM SPACE/U+2028/U+2029 before `-->`: HEAD leaks on 11538 of 17137 valid programs, patched 0 leaks and 0 lost code over about 210,000 generated programs on 8 seeds (the one "leak" seen on two seeds is the known `${NAME` + backtick tagged-template generator artifact: a tagged template is code, not a string);
- speed: normal 289 KB input 2.1 s patched vs 2.5 s HEAD (both slow because of `out.slice`; unchanged order of magnitude); adversarial `}/` x60000 408 ms vs 422 ms HEAD, `a:{}/` x30000 612 vs 587 ms, 5000 `{` then 5000 `}/` 73 vs 13 ms.

New honest shapes run this round (10, all green on HEAD and patched): 6.9.6 findStart with `while` loops and `==`; double-quoted `"P"` with `(col + 0.5) * TILE`; `includes('P')` guard then `charAt`; tileAt with `Math.floor` + `charAt`, one-liner `map[floor(y / TILE)][floor(x / TILE)]`, and literal `40`; 6.9.8 loadLevel with three `deleteAll()`; checkGoal with `levelNum++` and braceless if/else, with a `total` const and `levelNum = levelNum + 1`, and with an early `return` on `coins.length > 0`.

## Honest answers refused (elegance half, run as named tests)

Run: 10 new honest answers above plus round 6's 75 and the 43 + 32 batteries re-run. Result: 0 new refusals. The standing reds are all declared or untaught: 6.9.10 `countLit` with `forEach`; 6.9.10 `makeGrid` with `g[r][c] = false` index assignment; 6.9.7 `checkGoal` guard-return (`if (coins.length > 0) return;`, both forms); 6.9.7 `collect` with `player.overlapping(coin)`. Not tested this round: 6.9.13 (quiz, unchanged since round 4) and 6.9.10 / 6.9.11 / 6.9.7 / 6.9.4 fresh shapes beyond the round-6 set (nothing in the patch changes how plain code is read: 667 + 580 grade comparisons are byte-identical).

## What I tried and could not break

- All round-5 and round-6 smuggles (template-expression comments, string-paren desync, regex-literal quote, `await`/`new`/`instanceof`, `k+++/re/`, `<!--`, `-->` after code and after a multi-line block comment, hashbang, `}`-division with a comment directly after): 0 on HEAD.
- A `.js` lab graded under a `.md` name (see flag section).
- Dead `return;` at the top of the graded function, and a second empty `function collect() {}` after the graded one: both still score 4/4 on 6.9.7 (declared dead-code family), not re-reported.
- U+2028 inside a string literal (`'a<U+2028>b'; // note`): no disagreement on HEAD or patched (JavaScript allows it in strings and the cleaner treats it as an ordinary character there). `\` + CRLF continuation inside a string would desynchronise the cleaner, but CodeMirror normalises line breaks to `\n`, so a student cannot put a CR in the document; noted for graders fed raw API bodies.
- A zero-width joiner inside an identifier, numeric separators with BigInt (`1_000n / 2n`), `a?.b / 2`, `(a ?? 1) / 2`, and `a.return / 2` (property named like a keyword), each followed by the quote-and-comment trap: no leak on HEAD or patched.

## Option (not tested end to end)

`@lezer/javascript` is already a dependency (CodeMirror). On the nine division/regex smuggles I fed it (`{}`, function expression, class expression, regex literal, unicode identifier, `of`, `yield`, `for await`, and a block followed by a regex) it returns the right `String`, `RegExp` and `LineComment` spans, including `of`, `yield`, `for await`, labels and the unicode identifier. A cleaner built on its spans (plus a small pre-pass for `<!--`, `-->` and `#!` on the code regions) would remove the whole class instead of closing doors one at a time. Not built here; the heuristic patch below is what was verified.

## The patch

```diff
@@ -7,7 +7,18 @@
 // survive. Template literals (with `${ }` code inside them) and regex
 // literals are tracked so their text is never read as a comment, and a
 // comment inside `${ }` is never kept as string text.
+// The four characters JavaScript ends a line with (ECMA-262 LineTerminator). Comments end at any of them, and `-->` is only a comment
+// at the start of such a line; reading only '\n' let `\u00a0-->`, `\u2028-->` and `\r-->` ride through as code.
+const isLT = (ch: string | undefined) => ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029';
+// Index just past the last line terminator in `s`.
+function lineStartIn(s: string): number {
+  let k = s.length;
+  while (k > 0 && !isLT(s[k - 1])) k--;
+  return k;
+}
+
 export function stripJsComments(src: string, htmlComments = true): string {
+  scanBudget = SCAN_BUDGET;
   let out = '';
   // `shadow` is `out` as blankStringContents would see it (string and template text and regex bodies blanked), so the
   // "does this / start a regex" question is answered on the same text by both scanners. Parentheses inside a string
@@ -20,6 +31,7 @@
   const exprDepth: number[] = []; // open-brace depth inside each active ${ }
   const blankOf = (t: string) => t.replace(/[^\n]/g, ' ');
   let newlineCommentAt = -1;
+  let regexEnd = -1; // length of `shadow` just after the last regex literal: a '/' straight after one divides
   while (i < n) {
     const c = src[i];
     const nx = src[i + 1];
@@ -33,7 +45,7 @@
       // "string content", so a fix written in a comment satisfies the regex.
       // Measured on 2.7.3, whose starter opens with an unterminated string.
       out += c;
-      if (c === inStr || ((inStr === '"' || inStr === "'") && c === '\n')) { shadow += c === '\n' ? '\n' : c; inStr = null; }
+      if (c === inStr || ((inStr === '"' || inStr === "'") && (c === '\n' || c === '\r'))) { shadow += c; inStr = null; }
       else shadow += c === '\n' ? '\n' : ' ';
       i++;
       continue;
@@ -49,7 +61,7 @@
       if (c !== '`') {
         let j = i + 1;
         let closed = false;
-        while (j < n && src[j] !== '\n') {
+        while (j < n && src[j] !== '\n' && src[j] !== '\r') {
           if (src[j] === '\\') { j += 2; continue; }
           if (src[j] === c) { closed = true; break; }
           j++;
@@ -68,13 +80,15 @@
     // Annex B: a classic <script> (which is how the sketch runs) treats `<!--` anywhere as a line comment, and `-->` as one
     // when only whitespace (or comments) came before it on the line. Without this `<!-- player.overlaps(...)` ran nothing and read as code.
     // A hashbang line (`#!` as the very first two characters) is a comment too (ES2023, Chrome 74+ in a classic script).
-    if (htmlComments && i === 0 && c === '#' && nx === '!') { while (i < n && src[i] !== '\n') i++; continue; }
-    if (htmlComments && ((c === '<' && src.startsWith('<!--', i)) || (c === '-' && src.startsWith('-->', i) && /^[ \t\r\f\v]*$/.test(out.slice(Math.max(out.lastIndexOf('\n') + 1, newlineCommentAt)))))) {
-      while (i < n && src[i] !== '\n') i++;
+    if (htmlComments && i === 0 && c === '#' && nx === '!') { while (i < n && !isLT(src[i])) i++; continue; }
+    // `-->` starts a comment when only white space (JavaScript's own set: \s is exactly WhiteSpace plus LineTerminator, so NBSP, BOM
+    // and the Zs spaces count) came before it on its line.
+    if (htmlComments && ((c === '<' && src.startsWith('<!--', i)) || (c === '-' && src.startsWith('-->', i) && /^\s*$/.test(out.slice(Math.max(lineStartIn(out), newlineCommentAt)))))) {
+      while (i < n && !isLT(src[i])) i++;
       continue;
     }
     if (c === '/' && nx === '/') {
-      while (i < n && src[i] !== '\n') i++;
+      while (i < n && !isLT(src[i])) i++;
       continue;
     }
     if (c === '/' && nx === '*') {
@@ -82,17 +96,17 @@
       i += 2;
       while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
       i += 2;
-      if (src.slice(start, i).includes('\n')) newlineCommentAt = out.length; // a block comment with a line break in it counts as a line start for `-->`
+      if (/[\n\r\u2028\u2029]/.test(src.slice(start, i))) newlineCommentAt = out.length; // a block comment with a line break in it counts as a line start for `-->`
       continue;
     }
-    if (c === '/' && slashStartsRegex(shadow)) {
+    if (c === '/' && slashStartsRegex(shadow, regexEnd)) {
       // A regular-expression literal: copy it whole (unless a '/' or '*' follows its closing slash: that slash opened a // or /* comment
       // and this one is a division, as in `x = function () {} / 1 // note`), so a quote inside it ( /'/ ) does not open a phantom string
       // that carries the comments after it through as code.
       let j = i + 1;
       let inClass = false;
       let closed = false;
-      while (j < n && src[j] !== '\n') {
+      while (j < n && !isLT(src[j])) {
         const d = src[j];
         if (d === '\\') { j += 2; continue; }
         if (d === '[') inClass = true;
@@ -103,6 +117,7 @@
       if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
         out += src.slice(i, j + 1);
         shadow += '/' + blankOf(src.slice(i + 1, j)) + '/';
+        regexEnd = shadow.length;
         i = j + 1;
         continue;
       }
@@ -124,7 +139,7 @@
     if (ch === ')') depth++;
     else if (ch === '(') {
       depth--;
-      if (depth === 0) return /(?:^|[^\w$.])(?:if|while|for|with)\s*$/.test(before.slice(0, k));
+      if (depth === 0) return /(?:^|[^\p{ID_Continue}$.\u200c\u200d])(?:if|while|for(?:\s+await)?|with)\s*$/u.test(before.slice(0, k));
     }
   }
   return false;
@@ -137,13 +152,115 @@
   return k;
 }
 
+// Walking back over earlier text to classify a '}' is bounded: a file built from thousands of `}/` would otherwise cost a scan each.
+// Past the budget a '}' is read as the end of a block (the old behaviour).
+let scanBudget = 0;
+const SCAN_BUDGET = 3_000_000;
+
+const NOT_ID = '(?:^|[^\\p{ID_Continue}$.\\u200c\\u200d])';
+// Words after which an expression starts, so a '/' there opens a regex literal. `of` (for (x of /re/)) and `yield` count too.
+const VALUE_WORD = 'return|typeof|void|delete|in|of|new|instanceof|await|yield|throw|case';
+const REGEX_AFTER_WORD = new RegExp(NOT_ID + '(?:' + VALUE_WORD + '|else|do)$', 'u');
+const VALUE_AFTER_WORD = new RegExp(NOT_ID + '(?:' + VALUE_WORD + ')$', 'u');
+
+// The index of the innermost bracket in `t` that is still open at its end, or -1 at the top level. Strings and regex bodies are already blank.
+function innermostOpen(t: string): number {
+  let depth = 0;
+  const floor = Math.max(0, t.length - 20000);
+  for (let k = t.length - 1; k >= floor; k--) {
+    if (--scanBudget < 0) return -1;
+    const ch = t[k];
+    if (ch === ')' || ch === ']' || ch === '}') depth++;
+    else if (ch === '(' || ch === '[' || ch === '{') { if (depth === 0) return k; depth--; }
+  }
+  return -1;
+}
+
+// `t` ends with ':'. Does a value follow it? True for an object key (`{ k:`) and the else side of `a ? b :`; false for the colon of a
+// label or of `case x:` / `default:`, which start a statement.
+function colonStartsValue(t: string): boolean {
+  const q = t.slice(0, -1);
+  const open = innermostOpen(q);
+  // `a ? b :` : more '?' than ':' since the statement (or the enclosing bracket) began
+  let depth = 0;
+  let qs = 0;
+  let cs = 0;
+  for (let k = q.length - 1; k > open && k >= q.length - 20000; k--) {
+    if (--scanBudget < 0) return false;
+    const ch = q[k];
+    if (ch === ')' || ch === ']' || ch === '}') depth++;
+    else if (ch === '(' || ch === '[' || ch === '{') depth--;
+    else if (depth === 0) {
+      if (ch === ';') break;
+      if (ch === ':') cs++;
+      else if (ch === '?' && q[k - 1] !== '?' && q[k + 1] !== '?' && q[k + 1] !== '.') qs++;
+    }
+  }
+  if (qs > cs) return true;
+  if (open < 0) return false; // top level: a label
+  if (q[open] !== '{') return true; // inside ( or [ : a value
+  return opensValue(q, open); // `{ k:` is an object key, `{ lbl:` / `case x:` inside a block starts a statement
+}
+
+// Does `before` leave the parser expecting a VALUE next (`x =`, `f(`, `return`, `a ?`)? A statement start (`;`, `{`, `}`, `)`, nothing) is not one.
+function expectsValue(before: string): boolean {
+  const t = before.trimEnd();
+  if (t === '') return false;
+  const last = t[t.length - 1];
+  if (last === '>' && t.endsWith('=>')) return true;
+  if (t.endsWith('${')) return true;
+  if (/[=(,\[?!&|+\-*%<>~^]/.test(last)) return true;
+  if (last === ':') return colonStartsValue(t);
+  return VALUE_AFTER_WORD.test(t);
+}
+
+// Does the '{' at text[open] open a VALUE (an object literal, the body of a function expression, a class expression's body)?
+// Found by reading what stands in front of it.
+function opensValue(text: string, open: number): boolean {
+  const p = text.slice(0, open).trimEnd();
+  if (p === '' || p.endsWith('=>')) return false; // an arrow function body is not something you divide
+  if (p[p.length - 1] === ')') {
+    // `function name (...) {` / `async function* (...) {`: a value only when `function` itself sits where a value goes
+    let d = 0;
+    let k = p.length - 1;
+    for (; k >= 0; k--) {
+      if (--scanBudget < 0) return false;
+      if (p[k] === ')') d++;
+      else if (p[k] === '(') { d--; if (d === 0) break; }
+    }
+    if (k < 0) return false;
+    const m = new RegExp(NOT_ID + '((?:async\\s+)?function\\s*\\*?\\s*(?:[\\p{ID_Start}$_][\\p{ID_Continue}$]*)?\\s*)$', 'u').exec(p.slice(0, k));
+    return !!m && expectsValue(p.slice(0, m.index + m[0].length - m[1].length));
+  }
+  const cm = new RegExp(NOT_ID + '(class(?:\\s+[\\p{ID_Start}$_][\\p{ID_Continue}$]*)?(?:\\s+extends\\s+[^{;]*)?\\s*)$', 'u').exec(p);
+  if (cm) return expectsValue(p.slice(0, cm.index + cm[0].length - cm[1].length));
+  return expectsValue(p); // an object literal: `x = {`, `f({`, `return {`, `{ k: {`
+}
+
+// `before` ends with '}'. Does that brace close a VALUE (`x = {} / 1`, `x = function () {} / 1`, `x = class {} / 1`), after which '/' divides,
+// rather than a block, after which '/' starts a regex? Found by walking back to the matching '{'.
+function braceClosesValue(before: string): boolean {
+  let depth = 0;
+  const floor = Math.max(0, before.length - 20000);
+  for (let k = before.length - 1; k >= floor; k--) {
+    if (--scanBudget < 0) return false;
+    const ch = before[k];
+    if (ch === '}') depth++;
+    else if (ch === '{') { depth--; if (depth === 0) return opensValue(before, k); }
+  }
+  return false;
+}
+
 // Shared by stripJsComments and blankStringContents: does a '/' that follows `out` start a regex literal?
-function slashStartsRegex(out: string): boolean {
+// `regexEnd` is the length `out` had just after the last regex literal; a '/' right after one divides (`/a/ / 2`).
+function slashStartsRegex(out: string, regexEnd = -1): boolean {
   // trimEnd, not .replace(/\s+$/, ''): that regex is quadratic on every long blank run (a blanked string is one), and
   // this runs once per '/', so 4000 characters of string then 500 divisions took 4 to 7 seconds. Same character set.
   const before = out.trimEnd();
+  if (regexEnd >= 0 && before.length === regexEnd) return false;
   const last = before[before.length - 1];
-  return before === '' || (/[(,=:\[!&|?{};*%<>~^/]/.test(last) || (/[+\-]/.test(last) && signRun(before) % 2 === 1)) || /(?:^|[^\w$.])(?:return|typeof|else|do|case|throw|void|delete|in|new|instanceof|await)$/.test(before) || closesStatementHead(before);
+  if (last === '}') return !braceClosesValue(before);
+  return before === '' || (/[(,=:\[!&|?{};*%<>~^/]/.test(last) || (/[+\-]/.test(last) && signRun(before) % 2 === 1)) || REGEX_AFTER_WORD.test(before) || closesStatementHead(before);
 }
 
 // Blank the CONTENT of string literals and template-literal text (the quote
@@ -154,11 +271,13 @@
 // OPT-IN per requirement (`ignoreStrings: true`): 49 other lessons match text
 // inside strings on purpose (printed output, asset paths, SQL-ish literals).
 export function blankStringContents(src: string): string {
+  scanBudget = SCAN_BUDGET;
   let out = '';
   let i = 0;
   const n = src.length;
   const braces: number[] = []; // open-brace depth inside each active ${ }
   let inTemplate = false;
+  let regexEnd = -1; // length of `out` just after the last regex literal: a '/' straight after one divides
   while (i < n) {
     const c = src[i];
     if (inTemplate) {
@@ -172,7 +291,7 @@
     if (c === '"' || c === "'") {
       let j = i + 1;
       let closed = false;
-      while (j < n && src[j] !== '\n') {
+      while (j < n && src[j] !== '\n' && src[j] !== '\r') {
         if (src[j] === '\\') { j += 2; continue; }
         if (src[j] === c) { closed = true; break; }
         j++;
@@ -187,12 +306,12 @@
     // A '/' starts one when the last thing before it is an operator, an opening bracket, a
     // separator (a '/' after a division '/' too; a '+' or '-' only when it is not the second sign of ++ / --), or return/typeof; after an identifier, a number or ')' / ']' it is division.
     if (c === '/') {
-      const startsRegex = slashStartsRegex(out);
+      const startsRegex = slashStartsRegex(out, regexEnd);
       if (startsRegex) {
         let j = i + 1;
         let inClass = false;
         let closed = false;
-        while (j < n && src[j] !== '\n') {
+        while (j < n && !isLT(src[j])) {
           const d = src[j];
           if (d === '\\') { j += 2; continue; }
           if (d === '[') inClass = true;
@@ -202,6 +321,7 @@
         }
         if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
           out += '/' + ' '.repeat(j - i - 1) + '/';
+          regexEnd = out.length;
           i = j + 1;
           continue;
         }
```
