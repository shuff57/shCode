# Spec: harden modules 3.4-3.8 (from the three student-lens walks, 2026-10-09)

Beginner, moderate and advanced lenses read 3.4-3.8 (no browser) and graded ~60 answers per lab through the real grader.
Findings, ranked. Tick a step when it is committed and `npm test` is green.

- [x] **1. ignoreStrings on every regex requirement (151).** `console.log("<reference as text>")` scored full marks in 28 of 34 labs.
      Pinned by `scripts/test-grader-tolerance-3x.mjs` (reference passes, starter fails, reference-as-string fails, for every lab).
- [x] **2. Accept every function form the course taught.** Declaration, function expression and arrow in 3.4.5, 3.4.13, 3.4.19,
      3.4.21 (`3-1-10-functions`), 3.5.12/15/18/22/24, 3.6.4/12/16, 3.7.21; `n => ..` without parentheses; a callback named `log`
      is not `console.log`; a defined-but-uncalled `greet` no longer passes req4; copyBook's structuredClone must sit in copyBook.
- [x] **3. Runtime `tests` for the labs a regex cannot judge** (2026-10-09). 3.4.13/17/19, 3.4.10/16 (all three results printed),
      3.5.5/12/15/18/22/24/25, 3.6.4/8/12/13/16, 3.7.4/8/11/17/18/22, 3.8.7/10/11/14/18/19/22/23. The lab text now NAMES what is graded
      (`transform`, `countMatching`, `describeBox`, `describe`, `players`, `cart`, `readSave`, `saveState`/`loadState`, `restored`...), and
      3.7.4 / 3.7.18 ship `prices` / `settings` in the starter so the check can prove the original is unchanged. The node twin
      (`lib/run-tests-node.ts`) now evaluates the runner with `vm.runInThisContext`, so the `localStorage` stand-in is visible to
      student code the way it is in a Worker; 3.8.22 verified green in a real browser with the reference. Pinned by 182 cases in
      `scripts/test-grader-tolerance-3x.mjs`.
      Two limits learned: `output` is split per LINE, so `output.length` is not a count of console.log calls (use
      `output.filter(l => /^\s*[\[{]/.test(l))` to count printed arrays/objects); and a `checks` expression sees a frozen COPY of each
      variable, so it cannot test identity (`restored !== player`).
      Left for later: 3.5.8 (dot vs bracket: needs `for` + `Object.keys` bound together), 3.4.5 (declaration-to-expression is only
      shape-checked), 3.4.21, 3.6.13 (only checks four printed lines), 3.7.x free-name labs (11, 17, 8: line counts only),
      3.8.19 r2/r4 (null guard / parse-inside-try patterns are still loose).
- [x] **4. Charts** (2026-10-09). All nine now carry a RULES-ONLY `diagram.aiGrader` (20 points, pass 80% = 16, no model call, so no
      cost per submission): three label-free structural items scored from shape kinds and arrow topology (loop-back, order,
      different exits, hexagon, way out of the loop, print before End, ...) plus the relevance gate (caps at 13, below the pass
      line). One deliberate label read: 3.8.17 reads its two decision labels to put the missing-key question before the parse
      question. Specs in `scripts/_chart-3x-spec.cjs`, applied by `scripts/apply-chart-3x.cjs` (idempotent), pinned by
      `scripts/test-diagram-charts-3x.mjs` (reference earns all points; a variant passes; "step N" labels, all-rectangles,
      Start->End and the wrong-arrow mutations fail) and `scripts/test-grade-rules-only.mjs` (the real Pages Function, rules-only).
      Reference charts authored for 3.6.7, 3.7.5, 3.7.16 (`solution/chart.mmd`). Content made to agree with the rubric: 3.7.5 arrows
      (the old text contradicted itself), 3.4.9 implicit-return claim, 3.6.7 "Definition 3.6.1", 3.8.17 code now prints.
      NOT counted toward the grade: none has an `assignmentCode`; owner decides (no real student drafts exist to measure, unlike 3.2/3.3).
      Limits: the rules cannot read WHICH question a diamond asks (except 3.8.17), so a chart with the right shapes and
      on-topic words in the wrong places can still earn partial credit; the gate only needs 2 of 4-5 word groups.
- [x] **5. Hints and content fixes** (2026-10-09). 146 hints added (3.4-3.8, every console-lab requirement now has one; `check-hints`
      covers 3.1-3.8). Content: 3.4.21 steps 2-4 written; 3.9.2 asks for spread (s9) and r6 accepts `makeItem(...)` seeds; 3.7.19 now
      explains the sort comparison function and `.splice` (3.6 promised it); 3.6.9 has a live `structuredClone` block before the labs
      that need it (and `check-live-blocks` gives its sandbox `structuredClone`); 3.6.10's "all flat" line points to it; 3.8.3 has a
      preview line for `JSON.stringify`; 3.8.15 says the practice console forgets the store each Run; 3.8.19 step 1 says to remove the
      save to test the missing-key path; wrong Help links fixed (3.5.25, 3.6.12, 3.6.16, 3.8.23); counts fixed (3.8.24 nine questions,
      3.8.21 three lines); 3.5.17/3.5.20/3.5.26/3.7.2 small text errors; 3.7.23 answer positions rebalanced (1,3,0,2,1,3,0,2).
      Not done on purpose: 3.6.10 was not moved before 3.6.9 (titles carry the order; the text now reads correctly in place);
      3.10.5's "own copy" is the single-record spread override that 3.6.12 and 3.7.15 already teach.

## Round 2: browser walkthroughs (2026-10-09, four agents: beginner, moderate, advanced, teacher)

- [x] **Batch 1, graders.** Regex literals are blanked like strings (`/a.push(.)/` no longer counts). Honest answers that were refused now pass:
      shorthand methods (3.5.15, 3.8.7), `catch {` (3.8.14), a ternary guard (3.8.19), several results in one `console.log`
      (3.4.10, 3.4.16, 3.8.23), labelled prints (`console.log("doubled:", doubled)`), `transform(fn, value)` in either order (3.4.13).
      Hollow answers that passed now fail: the output checks match printed CONTENT against named variables (`doubled`, `middle`, `tail`, `first`/`second`/`joined`,
      `combined`/`framed`, `changed`/`extended`, `bumped`, `laptop`, `user`, `student`/`shallow`/`deep`) instead of counting lines;
      3.8.14 and 3.8.22 try bad text (`{"a":`, a throwing `JSON.parse`); 3.5.25 and 3.5.12 need the computed costs / names printed.
- [x] **Batch 2, charts.** `orientation:'labelled'` pins yes/no on 3.5.21, 3.7.5, 3.7.16 (the lesson now says how to phrase the question);
      the relevance gate needs 3 of 4-5 word groups; the 3.7.16 gate no longer matches the "Start" oval; 3.4.9 is a straight-line chart
      (the old text invented a decision the code does not have); 3.6.7 / 3.4.20 / 3.8.17 text agrees with their checkers.
- [x] **Counted labs (owner decision 2026-10-09: "count every 3.4-3.8 lab").** All 35 console labs got codes A3.4.2-A3.4.8, A3.5.2-A3.5.9,
      A3.6.3-A3.6.7, A3.7.2-A3.7.8, A3.8.2-A3.8.9 (skipping the numbers `curriculum-plan.md` reserves), completion credit, unlimited tries.
      Charts stay practice. Pinned in `scripts/test-grading.mjs`.
- [ ] **Batch 3, teacher screens and phone layout** (see the teacher agent's list): gradebook module filter; chart score explanation in the drawer;
      red requirements per student; Today queue routing for charts; `/module/3.x` at 390px; Late badge only on graded lessons; drawer Late tag;
      review-queue copy; time input clipping; inherited date text; "512 lessons"; Quest badges; lab page at 390px; editor notice for a refused arrow.
- [x] **Batch 4, remaining hollow answers** (2026-10-09). Test harness: `same('a','b')` answers "is variable a the very same object as b" from the live values
      (the frozen copies lose identity); the `localStorage` stand-in gained `key(i)` and `length`. 3.8.10/11/23 and the 3.7 derived arrays now need a NEW object;
      3.8.18 and 3.8.19 need the state really stored; 3.5.15 ties the printed line to the method's return value; 3.5.22 needs three unpacked fields;
      3.4.19 needs a `readings` array of 5+ numbers and a helper that really contains a `for` loop. Lab steps now say which technique the lab is about
      (spread not Object.assign, structuredClone, .concat(), the literal in the call, Object.keys not for...in, dot assignment).
      Charts: each of the nine gained a label-on-topic item (the diamond asks about the program, the print says what it prints; 3.5.21's unpack task must
      say it unpacks); points rebalanced to 20. A chart stuffed with every keyword on every shape can still pass: only labels that say nothing are caught.
      3.10.5 uses the code editor (`aiGrader.input: "code"`, as 2.7.5 does); CodeMirror wraps at spaces, not mid-word.
      Left alone: starters that start partly green (fix-it labs and labs that ship a data line: that is the starter doing its job); array output prints
      one element per line while some readings quote `[1,2,3]`; 3.5.24 loop, 3.5.5 `book.title = book.title`, 3.4.13 stray arrow, 3.6.8 nested-brace reassign.
