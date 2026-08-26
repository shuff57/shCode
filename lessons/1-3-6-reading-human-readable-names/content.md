## The name is the explanation

A variable name should have a clean, obvious meaning: it should describe the data it stores. Naming is one of the most important skills in programming, and one of the fastest tells there is. Looking at variable names alone will usually tell you whether code was written by a beginner or by someone with experience.

> **Definition 1.3.1: Variable naming rules.** Use human-readable names. Avoid bare abbreviations. Make names descriptive but concise. Agree on terms with your team.

This lesson takes the first of those four. The next three lessons take the others.

**Human-readable** means someone reading your code understands what the variable holds *without needing a comment*. `userName`. `shoppingCart`. `totalPrice`. The name does the explaining, so nothing else has to.

The reason this matters more than it seems: **code is read far more often than it is written.** You write a line once. You, or someone else, read it every time you come back to fix, extend or debug it. A few extra seconds spent on the name saves minutes of confusion every single time after that.

**What you'll learn from it:**
- A name should describe the data it stores.
- Human-readable means understandable with no comment attached.
- Code is read far more often than it is written: optimise for the reader.
- Good naming is about communicating intent, not obeying a rule.

**Try it:**

Both halves calculate the same thing. Read each one and time how long it takes you to say *what it is for*.

```js live plain
// You have to guess
let x = 29.99;
let y = 3;
let z = x * y;
console.log(z);

// You do not
let totalPrice = 29.99;
let itemCount = 3;
let orderTotal = totalPrice * itemCount;
console.log(orderTotal);
```

The computer runs both identically. It has no opinion about names at all. Names exist entirely for people: which is why this counts as documentation, and why it lives in this module.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **coding convention** | A set of guidelines for writing code that is consistent and readable |
| **descriptive name** | A name that clearly communicates what the variable holds |
| **human-readable** | Understandable by a person without an explanation attached |
| **intent** | What the code is *for*: the thing a good name communicates |
