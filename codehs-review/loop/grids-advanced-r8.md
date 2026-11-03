# Advanced lens, round 8: module 6.9 Grids and Tile Maps

Run 2026-11-01 against commit dc57cfcf (round 7, the one-pass scanner in `lib/js-source-clean.ts`). Labs 6.9.4, .6, .7, .8, .10, .11, .14. Policy: LAX for honest answers; only passes with no real code are listed. Declared leftovers (6.9.6 r2 one-char string compare, Array.from/spread builders, forEach drawing, row-alias flips, wrong-cell flip, TOP on the column, counter not named n, index-assignment grid building, dead never-called functions, empty-if guards, hybrid loops, 6.9.14 "any one challenge") are not re-reported.

## Verdict: NOT CLEAN. Fifteen lexical doors, fourteen of them scoring FULL MARKS on every graded lab with no working code. Honest side: CLEAN (no new refusal).

Same family as rounds 4 to 7, but this time the doors were found by differential fuzzing against two independent oracles (oxc-parser spans and V8 validity), not by hand. The round-7 scanner is correct on ordinary code (see "Held") and wrong on a defined, finite set of token contexts. The cheapest door is a single regex literal followed by a comment.

Ranked cheapest first. Every program below is valid JavaScript (V8 `vm.Script`) and, for all 20 programs tried, was also run as a `<script>` in Chrome the way `public/moshion/runner.html` does it: **nothing is defined, no error is thrown** (positive control, the reference: `collect`, `checkGoal`, `findStart` all defined). Scores are the real `lib/grader.ts` with each lab's current `lesson.json`.

`P` below is the whole graded part of the 6.9.7 reference on one line, 190 characters, no `/` in it:
```
function collect() { player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }); } function checkGoal() { if (coins.length === 0 && player.overlaps(goals)) { won = true; } }
```
For the other labs the same recipe with that lab's reference on one line (each `/` written `\/`, `x++` written `x += 1`, `TILE / 2` written `20` where r5 of 6.9.4 asks for it; 6.9.14 gets a first line `// it gives five points here` because its r2 reads raw comment text by design).

### 1. A regex literal followed straight away by a comment (BIGGEST: two characters on the end of one line)

Round 6 added "a regex whose closing slash is followed by `/` or `*` is really a division" (to survive `x = function () {} / 1 // note`). Round 7's brace classification made that guard unnecessary, but both scanners still carry it, so a real regex literal that ends right before `//` or `/*` is read as division and its whole body becomes code.
```
const t = /P///
const t = /P//* x */
```
(`/` + body + `/` + `//`. JavaScript: a regex literal, then a comment.) 6.9.7 4/4. All labs with their own reference as the body: 6.9.4 5/5, .6 5/5, .7 4/4, .8 5/5, .10 6/6, .11 6/6, .14 2/2. The same shape is also hit by `a = /re/` followed by an ordinary trailing comment with no space (`y = /re//* c */`). With one space between the regex and the comment it is correct (0/n), which is why no earlier hand case found it.

### 2. Escapes in identifiers: `\u{61}return`, `a\u{61}`

`wordStart` stops at `}` so `\u{61}return` is read as the keyword `return` (then `/` opens a regex) and an identifier that ENDS in `\u{..}` is read as a `}` block close. JavaScript: an ordinary identifier, so `/` divides, and the `'/'` + `// '..'` trap flips the comment into a string.
```
var \u{61}return = 4; const t = \u{61}return / 1 + `/` // `P`
var a\u{61} = 4;      const t = a\u{61} / 1 + `/` // `P`
```
7 labs full (6.9.7 4/4, 6.9.4 5/5, .6 5/5, .8 5/5, .10 6/6, .11 6/6, .14 2/2). Same direction as round 7's `éreturn`, new door.

### 3. A keyword after a dot with white space or a comment between them

The "not a property name" test looks only at the character right before the word.
```
var a = {return: 4}; const t = a. return / 1 + `/` // `P`
var a = {return: 4}; const t = a.<newline>return / 1 + `/` // `P`
var a = {if(){return 4}}; const t = a. if () / 1 + `/` // `P`
```
7 labs full. Works for every reserved word the lists know (`typeof in of new void delete instanceof throw case else do yield await`) and for `if while for with` (`a. while (1) / ...`, which `statementHeadBefore` takes for a statement head).

### 4. `of`, `yield`, `await` as ordinary names (sloppy script)

They are identifiers in a classic script outside `for..of`, generators and async functions, so `/` divides. The list always reads them as regex starters.
```
var of = 4;    const t = of / 1 + `/` // `P`
var yield = 4; const t = yield / 1 + `/` // `P`
var await = 4; const t = await / 1 + `/` // `P`
```
7 labs full each.

### 5. `...` and `extends` in front of a regex, and a class expression with a head the brace test cannot see

```
const t = {.../P/};                       // regex after the spread dots ('.' is not a regex-starter); also [.../P/] and f(.../P/)
try { class A extends /P/ {} } catch (e) {}   // regex after `extends` (valid, TypeError only at run time, caught)
const t = class extends (Object) {} / 1 + `/` // `P`   // class expression with a ( ) head: read as a block, so '/' opens a regex
function f(){return Object} const t = class A extends f() {} / 1 + `/` // `P`
```
`{.../P/}` and `extends /P/` need the body regex-valid (no `x++`, escaped slashes), done above. 7 labs full for each. `extends (X)`, `extends f()`, `extends f({})`, `extends new X()`, `extends (class{})`, `extends (function(){})` all leak; `extends X`, `extends X.Y`, `extends X[0]` do not.

### 6. A prefix `++` / `--` in front of a regex

The `+`/`-` run rule says an even run is a postfix pair and `/` divides; it cannot tell a prefix pair after an operator or `;`.
```
var q = 0; ++/P/.x;
```
(valid: increments a property of the regex object, NaN, no error). 7 labs full. `x = ++/P/.x` and `;--/P/.x` the same.

### 7. A deleted block comment fuses its neighbours

`stripJsComments` removes a comment and puts nothing in its place, and the second scanner (`blankStringContents`) then reads the fused text. JavaScript treats a comment as white space (a comment holding a line end is a line end).
```
var x = 1 +/**/+/P/.source;                       // JS: 1 + (+regex); cleaner sees `++` then division
var t = 1/**/in /P/;                               // JS: `1 in regex` is false; cleaner sees the word `1in`
var ret, urn = 4; function f1(){ ret/*<newline>*/urn / 1 + `/` // `P`<newline>}   // JS: two names, a division; cleaner sees `return`
```
7 labs full each (the third defines only `f1`, not a graded name). Also gives `fun/**/ction collect() {...}` the text `function collect()` (see "Structural" below: V8 rejects that whole file).

### Counts

| Door | 6.9.4 | .6 | .7 | .8 | .10 | .11 | .14 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 `/re///`, `/re//* */` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 2 `\u{61}return`, `a\u{61}` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 3 `a. return`, `a.<nl>return`, `a. if (..)` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 4 `of`, `yield`, `await` names | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 5 `{.../re/}`, `extends /re/`, `class extends (X) {}`, `extends f()` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 6 `++/re/.x` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |
| 7 `+/**/+`, `1/**/in`, `ret/*nl*/urn` | 5/5 | 5/5 | 4/4 | 5/5 | 6/6 | 6/6 | 2/2 |

(In every row the last column is 2/2 because the 6.9.14 file starts with a comment line; the code part of r1 is the lexical cheat.) 140 case files, `door` x lab, are in the scratch directory.

### Not a door: `let`

`var let = 4; const t = let / 1 + ...` is 0 on HEAD (the heuristic is right). It matters only for the Lezer option below.

## How the doors were found (method)

- Oracles. V8 (`vm.Script` and Chrome) for "is this valid and what runs"; `oxc-parser` (already installed, script mode, understands Annex B `<!--` / `-->`) for the exact comment, string, template-text and regex spans. For each valid program the expected `stripJsComments` output is the source minus oxc's comment spans and the expected `blankStringContents(strip)` output is the same with string, template text and regex bodies blanked; the harness diffs both against the real functions, character for character.
- Generator. Statement and expression families aimed at the places a heuristic scanner has to guess: `/` after every kind of left-hand side (identifiers named like keywords, escapes, `a.return`, `a?.if(x)`, numbers, postfix, calls, brackets, objects, function and class expressions with ten head shapes, templates, tagged templates, regex literals), regex starts after `)` of if/while/for/with/for-await, `}` of blocks vs objects vs functions vs classes vs arrow bodies vs static blocks, generators/async/getters/methods, ASI (`return` newline regex, `do..while` without a semicolon), line terminators U+2028/U+2029, `<!--` and `-->` in every position, comments inside `${ }` inside templates inside regexes, string line continuations, `</script>` text in strings, comments and regexes.
- Systematic matrices. About 130 "regex expected here" prefixes (every operator, assignment form, keyword, statement head, bracket and template opener, closed off so the program stays valid) x 10 enclosing contexts (top level, function, async, generator, method, arrow, template substitution, getter, block, async generator): 1077 valid programs. 693 valid "division expected here" left-hand sides x 3 comment/string traps.
- Comment-insertion fuzz. `/**/` and `/*<nl>*/` inserted at about 6000 random token boundaries of the references and generated programs that stay valid: that is what found door 7.
- Corpus. 711 `.js/.cjs/.mjs` files in the repo (lessons, moshion, scripts, lib, components, functions, app, curriculum, slides) diffed against oxc: 550 script-mode files and, in module mode, 706: 0 disagreements.
- Result. With the doors above kept out of the generator, 0 disagreements in about 70,000 valid programs (14 seeds). With them in, about 10% of valid programs disagree. Door 1 reappears only if the generator may put a comment directly after a regex (4 to 6 programs per 6000).
- Scratch (not in the repo, no repo file edited): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r8/` (`oracle.cjs`, `cmp.cjs`, `gen.cjs`, `fuzz.cjs`, `matrix.cjs`, `matrix2.cjs`, `ins.cjs`, `corpus.cjs`, `doors.cjs`, `min7.cjs`, `c/` = 140 smuggle files named `<lab>__cheat__<door>.js`, `chrome.html`, `clean2.cjs` = Lezer prototype, `both.cjs`, `patchA/` = the one-line patch).
- Chrome: throwaway session `r8` (closed; `mom` untouched), pages served from a throwaway local server on :18765 (killed by pid); each program in its own iframe, injected the way the runner does it (`script.textContent`).

## Held (tried and could not break)

- All earlier smuggles: 570 distinct case files from rounds 1 to 8, cheat and honest, re-graded on HEAD. Cheats still scoring full are exactly the declared leftover families (`cases/` and `r3a/` semantic ones: dead functions, wrong cell, OR-for-AND, constant `tileAt`, ...). None of the rounds 4 to 7 lexical smuggles scores above its round-7 value.
- `htmlComments` flag, `#!` first line, `<!--`, `-->` after whitespace, after a block comment holding a line end, after U+00A0, U+FEFF, U+2003, U+2028, U+2029: fuzzed, no disagreement.
- `</script>`, `<script>` text inside strings, comments, templates and regex bodies: no cleaner disagreement over about 37,000 valid programs. Not an HTML hazard either: the runner injects with `script.textContent`, so the HTML tokenizer never sees it.
- Unicode identifiers (`éreturn`, `ɵof`, `ofé`), ZWJ, numeric separators, `a?.b / 2`, `(a ?? 1) / 2`, `a.return / 2` with no space: no leak.
- Regex starts after every operator, assignment form, `?`/`:`, `=>`, `return`/`typeof`/`void`/`delete`/`in`/`instanceof`/`new`/`throw`/`case`/`else`/`do`/`await`/`yield`, after `)` of if/while/for/with/for-await and after block `}`: all 1077 matrix programs agree except the spread dots (`[...`, `f(...`, `{...`, door 5) and the prefix `++`/`--` ones (door 6).
- `\` + CRLF continuation inside a string would desynchronise the string scan; CodeMirror normalises line breaks, so a student cannot type it. Still true, only a raw-API concern.

## Structural note (not re-reported, but it caps what any tokenizer fix buys)

The grader has no syntax gate. The reference with one stray brace, one missing brace or `fun/**/ction collect() {...}` scores full on all 7 labs (`}}}` appended: 4/4 on 6.9.7, V8: `Unexpected token '}'`, nothing defined). So every door above is "text says X, V8 says Y", and a syntax error is the same thing done by accident. That is within the declared policy (broken code is not no code), but it means the lexical doors are only worth closing as a class, not one by one: the only change that ends the class is asking the engine (the sketch frame already runs the code and could report which top-level function names exist; `inFunction` requirements could then require the name to be a real function). Not built or measured here.

## Would building the cleaner on @lezer/javascript close the whole class?

Short answer: it closes most of it, not all of it, and not by itself.

Prototype (scratch `clean2.cjs`, about 70 lines): Lezer's `LineComment`, `BlockComment`, `String`, `RegExp`, `TemplateString` (minus `Interpolation`) spans for both `stripJsComments` and `blankStringContents`, plus a pre-pass for Annex B `<!--`, `-->` and `#!`.

- Out of the box Lezer is right on doors 1, 3, 5 (all four shapes), 6, 7's lexing and on `of`, and wrong on three things that need three small normalisations before it parses (length-preserving, so spans map back): CR, U+2028 and U+2029 must become LF (JavaScript ends a `//` comment there, Lezer does not); `\uXXXX` / `\u{X}` escapes must be replaced by same-length underscores (Lezer cannot lex them in identifiers: door 2 and a desync after them); a comment must leave one space (or its line ends) in the output instead of nothing, and `blankStringContents` must work from the same spans, not from the stripped text (otherwise door 7 survives: measured, `+/**/+/P/` stayed 5/5 on 6.9.4 until the comment became a space).
- With those: 0 on all 19 door programs EXCEPT one. **`var let = 4; const t = let / 1 + `/` // `P``: 6.9.4 5/5, .6 5/5, .7 4/4, .8 5/5, .10 6/6, .11 6/6, .14 2/2** (Lezer reads `let` as a declaration keyword, `/` as a regex start; the current heuristic scores this 0). So Lezer-only trades one door for another and reopens a door the heuristic already shut.
- Lezer is also not spec-exact on exotic template text (`\${${ ... }` escapes next to interpolations differed from V8 in the fuzz).
- Agreement with the heuristic scanner on honest and real code is total: 574 lesson starters, references and `solution/` variants, 169 honest case files, all 7 references (full), all 7 starters (0), and the 550 script-mode corpus files: no requirement changed result.

**What does close the class, measured: run both cleaners and pass a requirement only if it passes on both readings** (heuristic AND Lezer-with-the-normalisations). The two wrong-lists are disjoint (heuristic: doors 1 to 7; Lezer: `let`), and a cheat has to read as code to both. Measured on all 20 programs (the 19 above + `let`, each x 7 labs): **0 on every lab and door** (6.9.14: 1/2, r2 is the comment). Must-still-pass, all run, not guessed:

- Each lab's own `solution.js`, per lab: 5/5, 5/5, 4/4, 5/5, 6/6, 6/6, 2/2 under the combination. Each starter: 0.
- Honest, named, both readings: round 7's 43 + 10 batteries give the same 3 declared reds as HEAD and nothing new; 11 new honest shapes written this round (below) all green on HEAD and under the combination; 169 honest case files from rounds 1 to 8: 0 marks lost.
- All 574 lesson starter/reference/variant gradings in `lessons/`: identical per requirement.
- Earlier cheats (261 cheat files): no requirement that failed on HEAD passes under the combination.

Cost: the Lezer parser is already in the page bundle (CodeMirror), so the weight is the second pass and about 70 lines. I did not time it on adversarial input (Lezer is linear; the heuristic's budget guard is from round 7) and did not prototype the single-lexer "union of dead ranges" variant.

## Heuristic point fixes, if the author prefers to keep patching (only door 1 measured)

Door 1, measured: delete `&& !(src[j + 1] === '/' || src[j + 1] === '*')` from both regex branches (`stripJsComments` line 161 and `blankStringContents` line 444, the `if (closed && j > i + 1 && ...)` conditions). Results: door 1 programs 0 on all labs (6.9.14 1/2); the fuzz with comments allowed directly after regexes goes from 4, 5, 6, 6 disagreements per 6000 to 0, 0, 0, 0; hand cases `x = function(){} / 1 // note`, `{} / 1 + '/' // ' c '`, `a / b / c // note`, `a /* c */ / b // z`, `4 / 2 //` all still correct; of 570 case files from every round only the 14 door-1 files change (full to 0); 574 lesson variants and 711 corpus files unchanged. Must still pass: every `solution.js` (full), every starter (0), `x = function () {} / 1 // note` and the round-6 `fnexpr_division_comment_sacrificial` (still 0).

Doors 2 to 7, untested sketches (each needs its own must-still-pass run before use): 2 treat `\u{..}` / `\uXXXX` as identifier characters in `wordStart`; 3 skip white space and comments back to the `.` / `?.` in `wordIn` and `statementHeadBefore`; 4 `of`/`yield`/`await` are regex starters only after `for (... of`, inside a generator / async, or when not declared as a name; 5 treat `...` and `extends` as regex starters and run `classHeadStart` before the `)` branch in `opensValue`; 6 a `++`/`--` run is prefix when the token before it expects a value; 7 emit a space when the two characters around a removed comment would fuse. Seven separate patches is how rounds 4 to 7 went; the combination above does it with one.

## Honest answers refused (elegance half, run as named tests)

New this round, 11 shapes written to tickle the scanner (all green on HEAD and under the combination):
6.9.6 `findStart` with comments hugging the braces (`{// each row`, `{/* each column */`, `};// pixel centre`); `tileAt` with `floor((y) / TILE)` and a trailing `// column`.
6.9.7 `collect` with `player.overlaps(/*who*/coins, ...` and `score += 1;// +1`; `checkGoal` with `coins.length/* none left */ === 0 && ...`.
6.9.8 `loadLevel` with a template literal holding a division, `${(n + 1) / levels.length}`; `checkGoal` with `++levelNum` and `>=`.
6.9.10 `countLit` with the goes-to idiom `while (r --> 0)` over the rows; `drawGrid` with `grid[r][c] ? 'gold' /* on */ : '#334' /* off */`; `clickCell` with `Math.floor` and the bounds reordered, `}// off the grid`.
6.9.11 `bricksLeft` with `n += bricks[r][c] ? 1 : 0`; `hitAt` with an early-return bounds `||` and `{/* a brick */`; `makeBricks` with two `while` loops and trailing comments.
Re-run: round 7's 43-case battery (3 red, all declared: 6.9.7 `collect` with `player.overlapping`, `checkGoal` guard-return both forms) and 10 shapes. 6.9.13 (quiz) and 6.9.14's challenge answers were not re-tested this round, nothing in the scanner reaches the quiz. No new refusal found; the scanner changes of round 7 did not cost an honest answer anywhere I looked, and neither would the proposed combination.

## Bottom line

NOT CLEAN. A student who knows one of seven small JavaScript facts scores 100% on every regex lab for a file that defines nothing; the cheapest is `/<anything>///` on one line. Fix door 1 now with the one-line change above; for the rest stop adding doors to a heuristic and read every requirement on two independent readings (the existing scanner and a Lezer-based one with three normalisations), or move to asking the engine which names exist.
