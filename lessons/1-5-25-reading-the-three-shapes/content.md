## Three shapes carry nearly everything

A **flowchart** shows the same kind of plan as a picture: boxes for steps, arrows for the order they happen in. Where pseudocode is easier to *write*, a flowchart is easier to *see*, especially when a program branches.

> **Definition 1.5.6: Flowchart.** A diagram of a program's steps, using ovals for start and end, rectangles for actions, and diamonds for decisions, connected by arrows showing the order of execution.

| Shape | Meaning |
|---|---|
| **Oval** | Start or end |
| **Rectangle** | A step: do this |
| **Diamond** | A decision: a question with two exits, labelled yes and no |

That is Table 1.5.2, and it is nearly all of it. Standard flowcharting has more symbols, and you will meet four extra ones in this course as they become useful, but three shapes will draw almost any plan you write this year.

This course adds a fourth from the start, the **parallelogram** for input and output. That one is ours rather than the book's, and 1.5.29 explains why.

**What you'll learn from it:**
- Oval = start or end; rectangle = a step; diamond = a decision.
- Arrows show the order of execution.
- A flowchart and pseudocode express the same plan differently.
- Flowcharts are better at showing branching; pseudocode is faster to write.

**Try it:**

The voting decision from 1.5.21, as a chart. Read the shape names in the comments and match them to the code beneath.

```js live plain
// OVAL      Start
// RECTANGLE get the age
let age = 20;

// DIAMOND   is age >= 18?  -- two ways out
if (age >= 18) {
  // RECTANGLE (yes path)
  console.log("You may vote");
} else {
  // RECTANGLE (no path)
  console.log("Too young to vote");
}

// OVAL      End -- both paths arrive here
console.log("done");
```

Five shapes and one join. The last line is reached from both branches, which is the flowchart's arrows meeting again before the End oval.

A chart whose paths never meet again has two endings, and that almost always means a step was forgotten.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **flowchart** | A diagram of a program's steps, with shapes and arrows |
| **oval** | Start or end |
| **rectangle** | An action: one step |
| **diamond** | A decision: one way in, two ways out |
| **arrow** | The order of execution |
