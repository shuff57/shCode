# Spec: harden modules 3.4-3.8 (from the three student-lens walks, 2026-10-09)

Beginner, moderate and advanced lenses read 3.4-3.8 (no browser) and graded ~60 answers per lab through the real grader.
Findings, ranked. Tick a step when it is committed and `npm test` is green.

- [x] **1. ignoreStrings on every regex requirement (151).** `console.log("<reference as text>")` scored full marks in 28 of 34 labs.
      Pinned by `scripts/test-grader-tolerance-3x.mjs` (reference passes, starter fails, reference-as-string fails, for every lab).
- [x] **2. Accept every function form the course taught.** Declaration, function expression and arrow in 3.4.5, 3.4.13, 3.4.19,
      3.4.21 (`3-1-10-functions`), 3.5.12/15/18/22/24, 3.6.4/12/16, 3.7.21; `n => ..` without parentheses; a callback named `log`
      is not `console.log`; a defined-but-uncalled `greet` no longer passes req4; copyBook's structuredClone must sit in copyBook.
- [ ] **3. Runtime `tests` for labs a regex cannot judge** (one module at a time): 3.4.17 (`=> 0` passes), 3.5.5, 3.5.24, 3.5.25,
      3.6.8, 3.6.12, 3.6.16, 3.7.22, 3.8.10/11/18/22/23 (object never goes through stringify/parse). The node twin
      `lib/run-tests-node.ts` has no `localStorage`; give it the runner's shim before any 3.8 `tests` requirement.
- [ ] **4. Charts (3.4.9, 3.4.15, 3.4.20, 3.5.11, 3.5.21, 3.6.7, 3.7.5, 3.7.16, 3.8.17)** accept nonsense labels (structural rules only).
      Measure like 3.2/3.3 (`scripts/measure-chart-agreement.mjs`), then add gate + AI rubric + `solution/chart.mmd`
      (3.6.7, 3.7.5, 3.7.16 have none). Decide which count toward the grade (owner).
- [ ] **5. Hints on all 146 requirements**, then content fixes: 3.4.21 steps 2-4 have no instructions; 3.9.2 r10 (spread) asked by no
      step and r6 refuses `makeItem(...)` seeds; 3.6 promises 3.7 explains `sort`/`splice` (it does not); 3.6.13/16 need a
      `structuredClone` live block first; 3.6.10 before 3.6.9; 3.8.3 before the JSON readings; 3.4.9/3.6.7/3.7.5/3.8.17 chart
      a decision or print the code lacks; 3.10.5 needs "mark one record on its own copy" taught; wrong Help links
      (3.5.25, 3.6.12, 3.6.16, 3.8.23); 3.8 claims storage survives the page but the console runner resets it per Run;
      3.8.24 says eight questions (nine), 3.8.21 four lines (three); 3.7.23 key is B in 6 of 8; 3.5.17 pasted text.
