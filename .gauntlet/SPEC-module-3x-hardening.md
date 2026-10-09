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
- [ ] **4. Charts (3.4.9, 3.4.15, 3.4.20, 3.5.11, 3.5.21, 3.6.7, 3.7.5, 3.7.16, 3.8.17)** accept nonsense labels (structural rules only).
      Measure like 3.2/3.3 (`scripts/measure-chart-agreement.mjs`), then add gate + AI rubric + `solution/chart.mmd`
      (3.6.7, 3.7.5, 3.7.16 have none). Decide which count toward the grade (owner).
- [ ] **5. Hints on all 146 requirements**, then content fixes: 3.4.21 steps 2-4 have no instructions; 3.9.2 r10 (spread) asked by no
      step and r6 refuses `makeItem(...)` seeds; 3.6 promises 3.7 explains `sort`/`splice` (it does not); 3.6.13/16 need a
      `structuredClone` live block first; 3.6.10 before 3.6.9; 3.8.3 before the JSON readings; 3.4.9/3.6.7/3.7.5/3.8.17 chart
      a decision or print the code lacks; 3.10.5 needs "mark one record on its own copy" taught; wrong Help links
      (3.5.25, 3.6.12, 3.6.16, 3.8.23); 3.8 claims storage survives the page but the console runner resets it per Run;
      3.8.24 says eight questions (nine), 3.8.21 four lines (three); 3.7.23 key is B in 6 of 8; 3.5.17 pasted text.
