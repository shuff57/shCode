## The only shape with two ways out

Of the three shapes, the diamond is the one worth studying. It has **one way in and two ways out**, and the two paths **join up again afterwards**.

Ovals and rectangles have exactly one way onward. Only the diamond branches.

That shape is not a drawing convention. It is **selection from §1.4.4, drawn** — the same structure you named as one of the three that every program is built from, in picture form. `if` and `else` are what it becomes in code.

Three rules follow from it, and all three are enforced later by the class convention:

1. **Both exits must exist.** A diamond with one arrow leaving it is a question whose "no" answer was never decided.
2. **Both exits must be labelled** — yes and no. An unlabelled arrow leaves a reader guessing which case they are following.
3. **The paths rejoin.** A chart whose branches never meet again has two endings, which almost always means a step was forgotten.

Rule 3 is the one beginners break most, and it is why 1.5.22's `ELSE do nothing` was worth writing out. An empty branch still has to arrive somewhere.

**What you'll learn from it:**
- The diamond is the only shape with two ways out.
- It is selection — the §1.4 control structure — drawn.
- Both exits must exist and both must be labelled yes and no.
- The branches rejoin; two endings usually means a missing step.

**Try it:**

Watch both branches arrive at the same place.

```js live plain
let temperature = 91;

console.log("start");

if (temperature > 80) {          // the diamond
  console.log("  yes path: take water");
} else {
  console.log("  no path: take a jacket");
}

console.log("leave the house");  // both paths reach this
console.log("end");
```

Change `91` to `60` and run it again. The middle line differs; `leave the house` and `end` print either way, because they are past the rejoin.

If `leave the house` only happened on one branch, you would have written a chart where forgetting to bring water also means never leaving — which is exactly the class of bug the rejoin rule prevents.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **decision (diamond)** | One way in, two ways out, labelled yes and no |
| **branch** | One of the two paths out of a decision |
| **rejoin** | Where the two branches meet again |
| **selection** | The §1.4 control structure a diamond draws |
| **dangling branch** | A path that never rejoins — usually a forgotten step |
