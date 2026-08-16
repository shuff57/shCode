## Categories are compression

Decomposition leaves you with a pile of parts. **Pattern recognition** groups those parts into categories, and spots where the same structure repeats.

For the jam sandwich, the things decomposition turned up sort naturally into three groups:

| Ingredients | Equipment | Actions |
|---|---|---|
| Bread | Plate | Repeat *x* times |
| Jam | Knife | Left hand (LH) |
| Butter | | Right hand (RH) |
| | | Pick up |
| | | Unscrew |

Once "pick up", "unscrew" and "spread" are all filed under *actions*, you stop tracking twelve unrelated facts and start tracking three groups. **That is the entire trick** — pattern recognition makes a big problem small enough to hold in your head.

Applying decomposition and pattern recognition together also pushes you to think of *more* things, not fewer. Having an "equipment" column makes you notice you never mentioned a plate. The categories act as prompts.

The second half of pattern recognition is noticing where a structure **repeats**. "Pick up the knife", "pick up the jar", "pick up the bread" are three instructions or one instruction applied three times, and seeing the second reading is what later becomes a loop.

**What you'll learn from it:**
- Pattern recognition groups the parts decomposition produced.
- Grouping compresses many facts into few — that is why it helps.
- Categories act as prompts and make you notice what is missing.
- Spotting a repeated structure is what later becomes a loop.

**Try it:**

The same four instructions, before and after the repetition is noticed.

```js live plain
// Before: four separate facts to track
console.log("pick up the knife");
console.log("pick up the jar");
console.log("pick up the bread");
console.log("pick up the plate");

console.log("---");

// After: one pattern, applied four times
let things = ["knife", "jar", "bread", "plate"];

for (let i = 0; i < things.length; i = i + 1) {
  console.log("pick up the " + things[i]);
}
```

Identical output. The second version has one instruction and a list, and adding a fifth object costs a word rather than a line. You are not expected to write the loop yet — §2.2 does that. Notice only that the loop became *possible* because a pattern was spotted first.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **pattern recognition** | Grouping parts into categories and spotting recurring structures |
| **category** | A group of parts that behave alike — ingredients, equipment, actions |
| **compression** | Tracking three groups instead of twelve facts |
| **repeated structure** | The same action applied to different things — a loop, later |
