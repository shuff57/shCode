## Nothing, and you meant it

> **Definition 1.2.5: null.** A special value belonging to its own type. It represents "nothing", "empty", or "value unknown".

`null` is a type with exactly one value in it, and that value is `null`. That sounds like a technicality until you compare it with the next lesson's `undefined`, which is a *different* type with exactly one value in it. The language distinguishes between them on purpose.

In some other languages `null` means "a reference to a non-existing object". In JavaScript it does not mean that. It simply means: **this variable intentionally has no value right now.**

Intentionally is the operative word. `null` is something you write. It is a statement of intent: "there is deliberately nothing here yet", and that is exactly what makes it different from a variable you simply forgot to fill in.

**What you'll learn from it:**
- `null` is its own type, with one value.
- It means "nothing", "empty", or "not known yet".
- You write it deliberately: it is your statement, not JavaScript's.
- `typeof null` gives a wrong answer, for historical reasons. See 1.2.23.

**Try it:**

```js live plain
let age = null;
console.log(age);

let chosenColour = null;    // no choice made yet, on purpose
console.log(chosenColour);

console.log(typeof age);    // "object": this is a known bug
```

That last line is wrong and JavaScript knows it is wrong. `typeof null` reports `"object"`, which it is not: `null` is its own separate type. The bug dates from the very first version of the language and has been kept ever since, because fixing it would break a great deal of existing code. Lesson 1.2.23 has the full story.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`null`** | A value meaning "nothing", "empty", or "value unknown" |
| **deliberately empty** | The reason you write `null` rather than leaving a variable unset |
| **its own type** | `null` is not an object and not a number; it is the sole value of its type |
