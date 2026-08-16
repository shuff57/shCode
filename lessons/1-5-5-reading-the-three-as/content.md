## A shorter framing

The four cornerstones can be collapsed into **three As**:

| | Step | What it covers |
|---|---|---|
| **1** | **Abstraction** | Formulating the problem — deciding what it actually is and what matters in it |
| **2** | **Automation** | Expressing the solution — writing the steps down so something can carry them out |
| **3** | **Analysis** | Executing and evaluating the solution — running it and judging whether it worked |

The four cornerstones live almost entirely inside the first two. **Analysis is the one people skip**, and it is the one that decides whether any of the earlier work was correct. A solution you never evaluated is a guess with extra steps.

The ISTE list is longer and worth seeing once, because two of its items do not appear in the four cornerstones at all:

- Decomposition
- Pattern recognition — logically organising and analysing data
- Representing data through abstractions
- Automation through algorithmic thinking
- **Identification, analysis and implementation of solutions** — finding candidates and combining them into the most effective one
- **Generalisation and transferability** — carrying the same process across different problems

Generalisation is the pay-off for all of it. The reason to name these techniques is that once named, they transfer: the four steps that get a robot to make a sandwich also budget your month and sequence DNA.

Those abilities rest on habits rather than knowledge: confidence facing complexity, persistence on hard problems, tolerance for ambiguity, comfort with open-ended questions, and working with other people toward a shared solution.

**What you'll learn from it:**
- The three As: abstraction (formulate), automation (express), analysis (evaluate).
- Analysis is the step most often skipped, and the one that checks the rest.
- Generalisation means the same process transfers to unrelated problems.
- The underlying requirements are habits — persistence, tolerance for ambiguity.

**Try it:**

The three As on one small problem. Note that step 3 is where the work actually pays.

```js live plain
// ABSTRACTION — formulate: "is this year a leap year?"
//   What matters: the year number. What does not: the month, the day.
let year = 2024;

// AUTOMATION — express the rule as steps.
let isLeap = false;
if (year % 4 === 0) {
  isLeap = true;
}

// ANALYSIS — evaluate against cases you know the answer to.
console.log(year + " -> " + isLeap);   // 2024 is a leap year: correct
console.log("check 1900: " + (1900 % 4 === 0));
```

The last line is the analysis, and it fails. 1900 divides by 4 but was **not** a leap year — the real rule excludes century years unless they divide by 400. The abstraction was too aggressive: a detail was dropped that turned out to matter.

Nothing in steps 1 or 2 could have told you that. Only checking against a case whose answer you already knew did.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **abstraction (three As)** | Formulating the problem |
| **automation** | Expressing the solution as steps something can carry out |
| **analysis** | Executing and evaluating the solution |
| **generalisation** | Carrying the same problem-solving process to other problems |
| **transferability** | Why naming these techniques is worth the trouble |
