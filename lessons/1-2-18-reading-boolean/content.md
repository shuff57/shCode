## Two values, and no third

> **Definition 1.2.4 — Boolean.** The boolean type has exactly two values: **`true`** and **`false`**. Booleans store yes/no answers.

That is the smallest type in the language. There is no "maybe", no "sort of", no third option.

You will sometimes write one by hand — `let isWaterproof = true;` — but most booleans in real code are not typed by a person at all. They come out of a **comparison**. When you ask "is 4 greater than 1?", the answer JavaScript hands back is the value `true`.

That matters more than it looks, because it is the bridge to Chapter 2. An `if` statement does not understand your question; it only understands the `true` or `false` your question produced.

**What you'll learn from it:**
- The boolean type has exactly two values, `true` and `false`.
- Write them without quotes — `true` is a boolean, `"true"` is a string.
- Comparisons produce booleans: `4 > 1` evaluates to `true`.
- Chapter 2's `if` runs on the boolean a comparison produced.

**Try it:**

```js live plain
let nameFieldChecked = true;    // yes, the name field is checked
let ageFieldChecked = false;    // no, it is not

console.log(nameFieldChecked);
console.log(ageFieldChecked);

let isGreater = 4 > 1;          // the comparison produces a boolean
console.log(isGreater);

console.log(typeof true);       // "boolean"
console.log(typeof "true");     // "string" — quotes change everything
```

The last two lines are worth pausing on. `true` and `"true"` look almost identical and are different types. A quoted `"false"` is a piece of text, and in Chapter 2 it will behave in a way that surprises you.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **boolean** | A type with exactly two values: `true` and `false` |
| **`true` / `false`** | The two boolean values. No quotes |
| **comparison** | An expression like `4 > 1` that produces a boolean |
| **yes/no answer** | What a boolean is for — a fact that is either so, or not |
