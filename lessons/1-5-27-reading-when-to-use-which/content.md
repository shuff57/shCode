## Good at different things

Neither tool is better. They fail in opposite directions.

| | Pseudocode | Flowchart |
|---|---|---|
| **Speed to write** | Fast: it is typing | Slower: shapes and arrows |
| **Speed to edit** | Fast: insert a line | Slower: the layout has to move |
| **Long programs** | Handles them; stays a list | Becomes enormous and unreadable |
| **Branching and looping** | Has to be traced by reading | Obvious at a glance |
| **Explaining to someone else** | Fine | Better: you can point at it |

In practice most programmers reach for **pseudocode by default**, and draw a **flowchart when a piece of logic gets tangled** enough that they cannot hold it in their head.

Which is the honest description of when a flowchart earns its cost: not for every program, but for the one branch you keep getting wrong.

> **This course is stricter than that.** From here on, every graded build artifact opens with a flowchart, and the in-app coding lesson stays locked until the chart passes the structural checks. That is a teaching decision, not industry practice: the point is to build the design-before-code habit while the programs are small enough for it to be quick. 1.5.29 covers the rule in full.

**What you'll learn from it:**
- Pseudocode is faster to write and edit, and scales to long programs.
- Flowcharts make branching and looping visible at a glance.
- Most programmers default to pseudocode and draw a chart for tangled logic.
- This course requires a chart every time, deliberately, as a habit-builder.

**Try it:**

Here is logic tangled enough that reading it is genuinely harder than seeing it.

```js live plain
let age = 15;
let hasPermit = true;
let isSupervised = false;

if (age >= 18) {
  console.log("may drive alone");
} else {
  if (hasPermit) {
    if (isSupervised) {
      console.log("may drive supervised");
    } else {
      console.log("permit only, needs supervision");
    }
  } else {
    console.log("may not drive");
  }
}
```

Four outcomes, three nested decisions. Try to answer "which inputs produce *may not drive*?" by reading, then imagine the same question with a diagram in front of you, where you would trace two arrows and stop.

That is the case for drawing it. Change the three values to check whether your reading was right.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **nesting** | A decision inside another decision |
| **trace** | Following a plan step by step with specific values |
| **tangled logic** | Enough branching that you cannot hold the outcome in your head |
| **design-before-code** | The habit this course enforces with the flowchart gate |
