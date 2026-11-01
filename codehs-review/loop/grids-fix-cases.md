# 6.9 fix round: grader case table

Run 2026-10-31 with `lib/grader.ts` bundled by esbuild against the edited `lesson.json` files. Each case is the lab's reference (`solution.js`) or starter with one function replaced. "Expected" is what the policy wants (LAX on honest shapes, strings and comments never satisfy a code card). 0 mismatches. Every starter scores 0 (6.9.14: 0 of 2), every reference scores full. Every regex was timed on 5000-character adversarial input (repeated trigger tokens, with and without braces): worst case 11 ms, no lookbehind.

Also green at the end: `node --import ./scripts/register-ts.mjs scripts/audit-grader-tolerance.mjs --gate` (0 hits), `scripts/check-starters.mjs`, `scripts/check-lesson-citations.mjs`.

Runtime check (moSHion node harness): 6.9.10 reference lights and unlights cells under the new top strip (`lit: 1 of 64` after the scripted clicks, a click in the strip does nothing), all edited starters and references run with no error, the 6.9.5 live block runs, and the new 6.9.5 Try 3 (canvas 440, delete `r < map.length &&`, mouse in the empty strip) really stops the sketch.

| Lab | Case | Expected | Got | Verdict |
| --- | --- | --- | --- | --- |
| 6.9.4 | honest: (TILE / 2) in parens | all green | all green | OK |
| 6.9.4 | honest: double quotes + legend const | record only | all green | OK |
| 6.9.4 | wrong: centre 0, 0 | red: r5 | red: r5 | OK |
| 6.9.4 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.6 | reference | all green | all green | OK |
| 6.9.6 | honest: c * TILE + (TILE / 2) | all green | all green | OK |
| 6.9.6 | honest: (c * TILE) + (TILE / 2) | all green | all green | OK |
| 6.9.6 | honest: TILE * c + TILE / 2 | all green | all green | OK |
| 6.9.6 | honest: cellToPixel helper (5.5.2) defined + called | all green | all green | OK |
| 6.9.6 | honest: half variable | all green | all green | OK |
| 6.9.6 | honest: (c + 0.5) * TILE | all green | all green | OK |
| 6.9.6 | wrong: forgot the half tile (c * TILE) | red: r3 | red: r3 | OK |
| 6.9.6 | cheat: whole reference body as a string | fail-r3-r4-r5 | red: r3,r4,r5 | OK |
| 6.9.6 | honest: tileAt Math.floor + one-line | all green | all green | OK |
| 6.9.6 | declined: x/y swapped (needs P off the diagonal; P is at 1,1) | still green (declined) | all green | OK |
| 6.9.6 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.7 | reference | all green | all green | OK |
| 6.9.7 | cheat: bare expression then won = true | red: r4 | red: r4 | OK |
| 6.9.7 | cheat: || instead of && | red: r3 | red: r3 | OK |
| 6.9.7 | cheat: strings | all red | red: r1,r2,r3,r4 | OK |
| 6.9.7 | honest: nested ifs | all green | all green | OK |
| 6.9.7 | honest: swapped order | all green | all green | OK |
| 6.9.7 | honest: !coins.length | all green | all green | OK |
| 6.9.7 | honest: flag variable | all green | all green | OK |
| 6.9.7 | honest: won = A && B (no if) | all green | all green | OK |
| 6.9.7 | honest: no braces | all green | all green | OK |
| 6.9.7 | honest: score = score + 1, function (p, coin) | record only | all green | OK |
| 6.9.7 | honest: score++ | all green | all green | OK |
| 6.9.7 | starter | red: r1,r2,r3,r4 | red: r1,r2,r3,r4 | OK |
| 6.9.8 | reference | all green | all green | OK |
| 6.9.8 | cheat: ungated levelNum += 1 | red: r4 | red: r4 | OK |
| 6.9.8 | cheat: strings in checkGoal | red: r4,r5 | red: r4,r5 | OK |
| 6.9.8 | cheat: strings in loadLevel | r1-r3-fail | red: r1,r2,r3,r4,r5 | OK |
| 6.9.8 | honest: levelNum++  | all green | all green | OK |
| 6.9.8 | honest: levelNum = levelNum + 1, >= | all green | all green | OK |
| 6.9.8 | honest: check before increment | all green | all green | OK |
| 6.9.8 | honest: swapped overlaps/coins order | all green | all green | OK |
| 6.9.8 | honest: guard return | all green | all green | OK |
| 6.9.8 | honest: no braces if/else | all green | all green | OK |
| 6.9.8 | honest: if (level) braces + level?.delete | all green | all green | OK |
| 6.9.8 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.10 | reference | all green | all green | OK |
| 6.9.10 | cheat: === 1 fill copied from 6.9.9 | red: r2 | red: r2 | OK |
| 6.9.10 | honest: == 1 fill (true == 1 works) | all green | all green | OK |
| 6.9.10 | honest: === true fill | all green | all green | OK |
| 6.9.10 | honest: if/else fill | all green | all green | OK |
| 6.9.10 | honest: for...of draw | all green | all green | OK |
| 6.9.10 | cheat: guard AFTER read (!== undefined) | red: r4 | red: r4 | OK |
| 6.9.10 | cheat: flip then unused ok const | red: r4 | red: r4 | OK |
| 6.9.10 | honest: early return | all green | all green | OK |
| 6.9.10 | honest: grid.length / grid[r].length | all green | all green | OK |
| 6.9.10 | honest: grid[r] === undefined return | all green | all green | OK |
| 6.9.10 | honest: !grid[r] return | all green | all green | OK |
| 6.9.10 | honest: grid[r] && grid[r][c] !== undefined | all green | all green | OK |
| 6.9.10 | honest: ?.[  | all green | all green | OK |
| 6.9.10 | honest: Math.floor, row/col names | all green | all green | OK |
| 6.9.10 | cheat: self-assignment flip | red: r5 | red: r5 | OK |
| 6.9.10 | honest: if/else flip | all green | all green | OK |
| 6.9.10 | honest: ternary flip | all green | all green | OK |
| 6.9.10 | honest: count n++ | all green | all green | OK |
| 6.9.10 | honest: count n = n + 1  | all green | all green | OK |
| 6.9.10 | honest: count nested for...of (3.3.20) | all green | all green | OK |
| 6.9.10 | honest: count alias const lit = grid[r][c] | all green | all green | OK |
| 6.9.10 | honest: count ternary | all green | all green | OK |
| 6.9.10 | cheat: empty if (count never goes up) | red: r6 | red: r6 | OK |
| 6.9.10 | cheat: n = 64 in loops | red: r6 | red: r6 | OK |
| 6.9.10 | cheat: all functions as strings | all red | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.10 | honest: makeGrid .fill(false) | all green | all green | OK |
| 6.9.10 | starter | red: r1,r2,r3,r4,r5,r6 | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.11 | reference | all green | all green | OK |
| 6.9.11 | honest: const localY = y - TOP; floor(localY / BH) | all green | all green | OK |
| 6.9.11 | honest: y = y - TOP; floor(y / BH) | all green | all green | OK |
| 6.9.11 | honest: y -= TOP | all green | all green | OK |
| 6.9.11 | honest: floor(y / BH - 3) | all green | all green | OK |
| 6.9.11 | honest: floor(y / BH) - 3 | all green | all green | OK |
| 6.9.11 | honest: Math.floor((y - 60) / 20) | all green | all green | OK |
| 6.9.11 | wrong: forgot TOP (floor(y / BH)) | red: r2 | red: r2 | OK |
| 6.9.11 | wrong: round instead of floor | red: r2 | red: r2 | OK |
| 6.9.11 | cheat: column-only bounds, row read first | red: r3 | red: r3 | OK |
| 6.9.11 | cheat: bounds after the read | red: r3 | red: r3 | OK |
| 6.9.11 | cheat: !== undefined read first | red: r3 | red: r3 | OK |
| 6.9.11 | honest: early return bounds | all green | all green | OK |
| 6.9.11 | honest: bricks.length form | all green | all green | OK |
| 6.9.11 | honest: bricks[r] === undefined return | all green | all green | OK |
| 6.9.11 | honest: -= 1, == 1 | all green | all green | OK |
| 6.9.11 | cheat: all functions as strings | all red | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.11 | honest: count nested for...of | all green | all green | OK |
| 6.9.11 | honest: count alias | all green | all green | OK |
| 6.9.11 | honest: count sum | all green | all green | OK |
| 6.9.11 | honest: count == 1 n++ | all green | all green | OK |
| 6.9.11 | cheat: empty if (count never rises) | red: r6 | red: r6 | OK |
| 6.9.11 | honest: makeBricks .fill(1) rows | all green | all green | OK |
| 6.9.11 | starter | red: r1,r2,r3,r4,r5,r6 | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.14 | reference | all green | all green | OK |
| 6.9.14 | challenge 1: (BRICK_ROWS - r) * 10 | all green | all green | OK |
| 6.9.14 | challenge 1: score = score + (BRICK_ROWS - r) * 10 | all green | all green | OK |
| 6.9.14 | challenge 1: points variable | all green | all green | OK |
| 6.9.14 | challenge 1: if/else per row | all green | all green | OK |
| 6.9.14 | challenge 2: -= 1 | all green | all green | OK |
| 6.9.14 | challenge 2: if (=== 2) = 1 else = 0 | all green | all green | OK |
| 6.9.14 | challenge 3: SHAPE[r][c] === "#" | all green | all green | OK |
| 6.9.14 | challenge 3: alias const ch = SHAPE[r][c] | all green | all green | OK |
| 6.9.14 | challenge 3: switch (SHAPE[r][c]) | all green | all green | OK |
| 6.9.14 | rule changed but no sentence (r2 red) | red: r2 | red: r2 | OK |
| 6.9.14 | cheat: score rule only in a string | red: r1 | red: r1 | OK |
| 6.9.14 | starter | red: r1,r2 | red: r1,r2 | OK |

## Declined or left open on purpose

- 6.9.4 and any lab: a never-called function or a dead variable holding the right text still passes (only `tests`-type requirements close that).
- 6.9.4 keeps strings in play (patterns need `'static'`, `'none'`, `'#'`), so a string statement can still satisfy it.
- 6.9.6: swapped x/y and a hard-coded start stay green because P sits at row 1, column 1 in 6.9.4 to 6.9.7. Only 6.9.8 level 3 was moved (P now at row 3, column 1), as asked. 6.9.6 r1/r2 still read the quoted `'P'`.
- 6.9.7: `coins[0].delete()` inside the overlap, and the result of `findStart` ignored, are left alone (needs a deliberate dummy).
- 6.9.8: `level.delete()` placed after `new Tiles(...)` is not ordered (the advanced report did not build it).
- 6.9.10/6.9.11: counting the wrong cell (`!grid[r][c]`) still passes; the starting screen (`lit: 64`) shows it.
- 6.9.11 r3: a zero test that is only on the column, with the row bounded above, passes; the row upper bound against `BRICK_ROWS`/`5` is required.
- 6.9.13 quiz: only q6 had a real tell (the one option in code formatting); it was rewritten with four code-formatted options. The mild content tells in q1, q3, q4, q5 are left. The answer key shipping to the browser is an author decision (formative quiz).

## Round 2 additions (2026-10-31)

Same method (lib/grader.ts bundled, current lesson.json). Round-1 replay: 159 cases and the 60 round-2 report cases, all as expected; the only changes are the intended closes (10 r4, 10 r3 TOP, 11 r3, 11 r4 cell gate, 7 r4 won under the test, regex literal after if/else) and the intended opens (11 r5 named points, 10 r6 row alias, 14 r2 any wording). Old 10 honest cases written before TOP existed read red on r3 by design. Starters 0, references full for 4, 6, 7, 8, 10, 11, 14. Worst regex time on 5000-char adversarial input: 14 ms (no lookbehind). New cases below (expected = observed):

| Lab | Case | Result |
| --- | --- | --- |
| 6.9.7 | cheat: brace_slip  | 3/4 r1+ r2+ r3+ r4- |
| 6.9.7 | cheat: won_under_empty_ifs  | 3/4 r1+ r2+ r3+ r4- |
| 6.9.7 | honest: braceless  | 4/4 r1+ r2+ r3+ r4+ |
| 6.9.7 | honest: nested  | 4/4 r1+ r2+ r3+ r4+ |
| 6.9.8 | cheat: lastLevel_unrelated_var  | 4/5 r1+ r2+ r3+ r4+ r5- |
| 6.9.8 | honest: lastLevel_helper_after_inc  | 5/5 r1+ r2+ r3+ r4+ r5+ |
| 6.9.8 | honest: lastLevel_helper  | 5/5 r1+ r2+ r3+ r4+ r5+ |
| 6.9.10 | cheat: click_col_guard_only  | 5/6 r1+ r2+ r3+ r4- r5+ r6+ |
| 6.9.10 | cheat: click_no_TOP  | 5/6 r1+ r2+ r3- r4+ r5+ r6+ |
| 6.9.10 | cheat: click_read_first_andand  | 5/6 r1+ r2+ r3+ r4- r5+ r6+ |
| 6.9.10 | cheat: click_row_upper_only  | 5/6 r1+ r2+ r3+ r4- r5+ r6+ |
| 6.9.10 | cheat: count_row_alias_unused  | 5/6 r1+ r2+ r3+ r4+ r5+ r6- |
| 6.9.10 | cheat: make_one_loop_push_false  | 5/6 r1- r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: click_early_return_four  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: click_inline_40  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: click_optional_chain  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: click_strip_return_then_upper  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: click_y_minus_TOP_var  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: count_hybrid_forof_row  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: count_row_alias  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: make_index_empty  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: make_push_empty  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.10 | honest: make_while  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | cheat: hit_flag_never_true  | 5/6 r1+ r2+ r3+ r4+ r5- r6+ |
| 6.9.11 | cheat: hit_no_return_true  | 5/6 r1+ r2+ r3+ r4+ r5- r6+ |
| 6.9.11 | cheat: hit_row_upper_only  | 5/6 r1+ r2+ r3- r4+ r5+ r6+ |
| 6.9.11 | cheat: make_one_loop  | 5/6 r1- r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: count_hybrid  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: count_row_alias  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: hit_alias_cell_gate  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: hit_const_points  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: hit_flag  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: make_index_push  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: make_push_empty  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.11 | honest: make_while  | 6/6 r1+ r2+ r3+ r4+ r5+ r6+ |
| 6.9.14 | cheat: no_rule_just_zero  | 1/2 r1- r2+ |
| 6.9.14 | cheat: no_sentence_title_only  | 1/2 r1+ r2- |
| 6.9.14 | cheat: self_assign  | 1/2 r1- r2+ |
| 6.9.14 | cheat: sentence_below_code_no_keyword  | 1/2 r1+ r2- |
| 6.9.14 | cheat: sentence_numbers  | 1/2 r1+ r2- |
| 6.9.14 | cheat: sentence_too_short  | 1/2 r1+ r2- |
| 6.9.14 | honest: ch3_line_alias  | 2/2 r1+ r2+ |
| 6.9.14 | honest: rhs_reads_cell  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_any_words_after_blank  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_any_words  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_below_with_keyword  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_If_capital  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_Remove  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_Removing  | 2/2 r1+ r2+ |
| 6.9.14 | honest: sentence_Without_capital  | 2/2 r1+ r2+ |
| 6.9.14 | honest: ternary_other  | 2/2 r1+ r2+ |
| 6.9.14 | honest: ternary_two_hit  | 2/2 r1+ r2+ |

Declined: named callback passed to overlaps (6.9.7), niche shapes no lesson models (hybrid wrong-cell counts, second hp array), the `||` double-if forms and a dummy statement before an ungated increment (needs a runtime test), 6.9.6 cellToPixel body, `// if` alone still passes the keyword alternative of 14 r2. Regex-literal fix in lib/js-source-clean.ts: a '/' after else/do/case/throw/void/delete/in or after the ) of an if/while/for/with head now starts a regex; `(a + b) / 2`, `f(x) / 3`, `arr[i] / n` still divide.

## Round 3 additions (2026-10-31)

Same method (lib/grader.ts bundled, current lesson.json). Replayed the 159 round-1 + 60 round-2 + 65 round-3 advanced cases: only the intended closes changed, every starter 0, every reference full. Worst regex time on 5000-char adversarial input: 10 ms; no lookbehind. `audit-grader-tolerance --gate` and `check-starters` green. `lib/js-source-clean.ts`: 700 lesson/pa-pseudocode js blocks, 0 changed; `test-2-7-3-comments` ok.

| Lab | Case | Result |
| --- | --- | --- |
| 6.9.10 | cheat: column-only bounds (`c < 8`, `c < ROWS`, `c < grid.length`) | 5/6 r4- |
| 6.9.10 | cheat: empty `if (y < TOP) {}` plus column test | 5/6 r4- |
| 6.9.11 | cheat: `c < 5` / `c < BRICK_ROWS` column-only, `y > TOP` empty plus `c < 5` | 5/6 r3- |
| 6.9.10 | cheat: unused `const t = y - TOP`, `floor(y / CELL) - TOP`, TOP inside a comparison | 5/6 r3- |
| 6.9.11 | cheat: `y + TOP`, `y * TOP`, unused `y - TOP` | 5/6 r2- |
| 6.9.10 | cheat: two plain ifs (true then false), `= true; = false;` in a row | 5/6 r5- |
| 6.9.10 | honest: drawGrid nested while; countLit nested while, for/while mix | 6/6 |
| 6.9.11 | honest: bricksLeft nested while | 6/6 |
| 6.9.10 | honest: flip with `!`, ternary, if/else (either order), early return, old-value ternary | 6/6 |
| 6.9.10/11 | honest: 83 guard spellings, 24 offset spellings (round 1-3 sets) | unchanged |
| js-source-clean | `1 / /player.overlaps(coins) coin.delete()/` no longer hides code; `i++ / 2; coins.delete()` no longer false-reds | fixed |

Declined: computed-but-unused guards (10 r4, 11 r4, 6.9.7 r4), hybrid index/of loops, forEach, `row[c] = false; g[r] = row` builds, reversed operands `ROWS > r`.

## Round 4 additions (2026-10-31)

Same method (lib/grader.ts bundled, current lesson.json). Replayed the 344 earlier advanced case files: byte-identical results. Every starter 0, every reference full. Worst regex time on 5000-char adversarial input: under 20 ms; no lookbehind. `lib/js-source-clean.ts`: 1494 lesson / pa-pseudocode / scratch blocks, 0 changed; `test-2-7-3-comments`, `test-grader`, `test-grader-tolerance`, `test-grader-alternatives-2x`, `test-find-and-fix`, `test-console-labs`, `test-runtime-labs`, `check-starters` and `audit-grader-tolerance --gate` green.

| Lab | Case | Result |
| --- | --- | --- |
| 6.9.7 | cheat: `/'/` regex literal plus a trailing comment that carries code; `await /re/`, `new /re/`; `k+++/re/` | 0/4 (was 4/4) |
| 6.9.10 | cheat: bounds joined by `||` (`r >= 0 \|\| r < ROWS`, pair, precedence slip), `r < 0 && r >= ROWS` | 5/6 r4- |
| 6.9.11 | cheat: `(r >= 0 \|\| r < BRICK_ROWS) && ...`, `... \|\| bricks[r][c] === 1` | 5/6 r3- |
| 6.9.10 | cheat: early-return guard plus two plain ifs, or `= true; = false;` | 5/6 r5- |
| 6.9.10 | cheat: `floor(y / CELL) - TOP / CELL` (TOP / CELL is 0.8 here) | 5/6 r3- |
| 6.9.10 | honest: `\|\|` return guard (either order), nested ifs, two returns, `r > -1`, `!(...)`, if/else (any layout), early-return flip with or without semicolons, else-if chain, ternary; 7 offset spellings | 6/6 |
| 6.9.11 | honest: `bricks[r]?.[c] === 1` as the brick test (r4 now accepts it, like 6.9.10 r4), return guard, alias cell | 6/6 |

Declined: wrong-cell flip (`!grid[c][r]`), TOP applied to the column, count of one cell, `grid[c] !== undefined` as the whole guard.

## Round 5 additions (2026-10-31)

Source: `codehs-review/loop/grids-advanced-r5.md`. Same method (lib/grader.ts bundled; OLD = HEAD stripper + HEAD lesson.json, NEW = this round). Replayed the 456 earlier advanced case files: only two string-only cheats changed (6.9.4 `string_only` 5/5 to 0/5, 6.9.6 `ALL_functions_as_string_statements` 2/5 to 0/5); all 203 honest cases identical. Every 6.9 starter 0, every reference full. Whole course: 293 graded lessons (70 with `ignoreStrings`), 589 starters / references / solution directories / per-problem variants / starter variants graded old vs new: 0 differences. `stripJsComments` + `blankStringContents` on 7569 text blocks (11.3 M characters: every js/ts file and fenced js block in lessons, pa-pseudocode, scripts, lib, components, app, functions, curriculum, reshape docs, plus long lesson.json strings): 0 changed. Fuzzer with the TypeScript parser as the oracle for what each marker is: 0 leaks and 0 lost code in 53,597 valid programs (HEAD: 3668 leaks in 7152). Worst regex time on 5000-char adversarial input: 21 ms (the `[\w$]*[yY][\w$]*` class on a 5000-letter identifier); no lookbehind.

`lib/js-source-clean.ts`: `stripJsComments` now tracks `${ }` inside template literals (a comment there is a comment; a backtick there opens a nested template) and asks "does this `/` start a regex" on a shadow copy with string, template and regex text blanked, the same text `blankStringContents` sees, so a `"("` can no longer make the two scans disagree. Also `slashStartsRegex` trims with `trimEnd()` instead of `.replace(/\s+$/, '')`: that regex is quadratic on every long blank run, and this runs once per `/`. A 4000-character string followed by 500 divisions took 23 to 53 s per grade at HEAD (in the student's browser); it now takes under 25 ms. Same character set, so no output changes.

| Lab | Case | Result |
| --- | --- | --- |
| 6.9.6/7/8/10/11 | cheat: `` const t = `${ 1 /* reference body */ }`; `` in every graded function | 0/n (was full on 7, 8, 10, 11; 5/5 on 6) |
| 6.9.6/7/8/10/11 | cheat: the same with a `//` line comment inside `${ }` | 0/n (was 4/4 to 5/6) |
| 6.9.7/8/10/11 | cheat: `if (typeof score == "(") /'/; // reference body '` | 0/n (was 3/5 to 5/6) |
| 6.9.6 | cheat: the same string-paren shape | 1/5 r2+ (was 4/5): the decoy's own `== "("` is a real comparison with a one-character string, which the new r2 accepts by design; the comment no longer counts |
| 6.9.4 | cheat: the whole answer as one string, as a template, or in `/* */` inside a template expression | 0/5 (was 5/5) |
| 6.9.6 | cheat: hard-coded start plus a string, a template or a regex literal holding the loops and `'P'` | 3/5 r1- r2- (was 5/5 or 4/5) |
| 6.9.10 | cheat: `if (x < TOP) return;`, `c < TOP`, an unrelated `k < 40`, before an upper-only test | 5/6 r4- (was 6/6) |
| 6.9.11 | cheat: `x < TOP`, `c < TOP`, `score < TOP` return before an upper-only test | 5/6 r3- (was 6/6) |
| 6.9.4 | honest: double quotes everywhere, legend in a variable, legend over several lines, `0.5` and `(TILE / 2)` centres | 5/5 (unchanged) |
| 6.9.4 | honest: `` walls.collider = `static` `` | 5/5 (was 4/5) |
| 6.9.6 | honest: `while` loops, `for...of`, `indexOf('P')` per row, `"P" === ch`, `charAt(c) == 'P'`, `includes` then `indexOf` | 5/5 (unchanged) |
| 6.9.10 | honest: `y < TOP`, `mouseY < TOP`, `y < 40` return guards; 152 earlier 6.9.10 case files | 6/6, 0 changed |
| 6.9.11 | honest: `y < TOP`, `mouseY < TOP` return guards; 84 earlier 6.9.11 case files | 6/6, 0 changed |
| all | honest templates: `` `score: ${score}` ``, `` `${a} // not a comment ${b}` ``, `` `${ f({a:1}) } x` ``, nested templates, `` `${ '}' }` ``, escaped backtick, multi-line, `` `${ a / b }` ``, ternary of templates | unchanged |

Cost, accepted: with strings blanked, 6.9.4 r1 to r3 check the length of the collider value (6 for static, 4 for none) and r4 checks one-character keys, and 6.9.6 r1 and r2 accept any one-character string (`' '` or `'Q'` too). Both are wrong-answer cases, not skipping the exercise.

Still red, unchanged and declared before: 6.9.10 r1 / 6.9.11 r1 `Array.from` and spread builds, 6.9.10 r2 `forEach`, r5 row alias, r4 `y -= TOP; if (y < 0) return;` and reversed `TOP > y`, r6 a counter not named `n`; 6.9.7 r3 guard-return.

Not changed: `server.js` (the Express dev server) keeps its own older `stripJsComments` copy for its `POST /api/grade` route; the browser grader and every check script use `lib/js-source-clean.ts`.
