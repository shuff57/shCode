## Four techniques, and none of them optional

In practice computational thinking is taught as four techniques, called its **cornerstones**:

| Cornerstone | What it does |
|---|---|
| **Decomposition** | Systematically breaking a complex problem into smaller, manageable subproblems |
| **Logical thinking and pattern recognition** | Identifying similarities among and within problems; spotting recurring structures |
| **Abstraction** | Focusing on the important information while ignoring irrelevant detail |
| **Algorithms** | Detailed step-by-step instructions that solve the problem |

BBC Bitesize's image for them is a **table**: each cornerstone is a leg, and losing any one collapses the rest. Decompose without abstracting and you drown in detail. Abstract without decomposing and you oversimplify. Do all three and write no algorithm and you have understood a problem you never solved.

They also come in that order surprisingly often: break it up, notice what repeats, throw away what does not matter, write down the steps.

Two more steps belong alongside the four — **testing**, which uncovers errors in the instructions, and **debugging**, which finds and fixes them. Lessons 1.5.40–1.5.43 take both up.

> **A running example.** A **programmer** is someone who writes instructions for a computer to follow. The standard illustration is a programmer instructing a robot to make a jam sandwich. It sounds trivial until you try it — the robot knows nothing, so every assumption you would normally skip has to be written down. The next several lessons follow that one example through all four techniques.

**What you'll learn from it:**
- The four cornerstones: decomposition, pattern recognition, abstraction, algorithms.
- Lose one and the other three stop working — the table analogy.
- They usually apply in that order.
- Testing and debugging sit alongside the four.

**Try it:**

All four, applied to a tiny problem: work out which of three students scored highest.

```js live plain
// DECOMPOSITION — the problem breaks into: hold the scores,
//   compare them, report the winner.
let scores = [78, 91, 84];
let names = ["Ada", "Bo", "Cy"];

// PATTERN RECOGNITION — "compare and keep the bigger" repeats
//   for every score, so one rule covers all of them.
let bestIndex = 0;

// ABSTRACTION — nothing here needs the students' ages, classes
//   or the subject. Only names and scores matter.
for (let i = 1; i < scores.length; i = i + 1) {
  if (scores[i] > scores[bestIndex]) {
    bestIndex = i;
  }
}

// ALGORITHM — the ordered steps above, ending in a result.
console.log(names[bestIndex] + " scored highest with " + scores[bestIndex]);
```

Read the comments, not the code. Each one names a decision that was made *before* anything was typed — which is the point the whole module keeps making.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **cornerstones** | The four techniques of computational thinking |
| **decomposition** | Breaking a complex problem into smaller manageable parts |
| **pattern recognition** | Spotting similarities and recurring structures |
| **abstraction** | Keeping what matters, discarding what does not |
| **algorithm** | Detailed step-by-step instructions that solve the problem |
| **programmer** | Someone who writes instructions for a computer to follow |
