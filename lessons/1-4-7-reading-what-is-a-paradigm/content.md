## A paradigm is a way of organising, not a syntax

Two programs can solve the same problem and be organised in completely different ways. The name for that difference is a **paradigm**.

> **Definition 1.4.2: Programming paradigm.** An approach to organising and structuring code. It shapes how a program is broken into pieces and how those pieces fit together.

A paradigm is not a language, and it is not punctuation. It is a set of ideas about what a program is *made of*: steps? objects? functions? Different answers give different paradigms, and the same language can often support more than one.

Three are worth knowing at this stage:

| Paradigm | A program is made of | Named in |
|---|---|---|
| **Procedural** | a sequence of steps acting on separately held data | 1.4.8 |
| **Object-oriented** | objects that bundle data with behaviour | 1.4.15 |
| **Functional** | functions that take values in and hand results back | 1.4.18 |

You will *write* all three later in this course. The goal here is only to recognise them.

**What you'll learn from it:**
- A paradigm is an approach to organising and structuring code.
- It shapes how a program is broken into pieces and how the pieces fit together.
- The three worth knowing now: procedural, object-oriented, functional.
- Recognising them is this week's job; writing them comes later.

**Try it:**

Both halves below hold the same two facts about the same book. The difference is not what they know: it is how they are organised.

```js live plain
// Organised as separate values
let title = "JavaScript Guide";
let pages = 200;
console.log(title + " has " + pages + " pages.");

// Organised as one bundle
let book = { title: "JavaScript Guide", pages: 200 };
console.log(book.title + " has " + book.pages + " pages.");
```

Same output, twice. That gap: where the data lives relative to the code using it: is the beginning of the difference between two paradigms. The next lessons give each one a name.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **programming paradigm** | An approach to organising and structuring code |
| **procedural** | A program as a sequence of steps acting on separately held data |
| **object-oriented** | A program as objects bundling data with behaviour |
| **functional** | A program as functions that take values in and hand results back |
