## The box labelled "books"

Some programmers try to save effort by reusing the same variable for different purposes. Rather than declaring a new variable, they change the value of an existing one to hold something completely different.

It is a bad habit, and it is worth breaking now, while your programs are small enough that the damage is still theoretical.

Imagine a box labelled **"books"**. You use it to store shoes. Then dishes. Then toys. You never change the label. After a while nobody knows what is actually inside, including you, and the label has become worse than useless, because it is confidently wrong.

That is exactly what a reused variable is. The name promised one thing. The contents are something else. And because JavaScript is dynamically typed (1.2.4), nothing stops you: the type can change too, silently, with no error.

A variable should have **one clear purpose** for its whole life. If you need a second thing, declare a second variable. They are free.

**What you'll learn from it:**
- Reusing a variable for a different purpose makes the name a lie.
- JavaScript will not stop you: dynamic typing means the type can change too.
- One variable, one purpose, for its whole life.
- If you need a second thing, declare a second variable.

**Try it:**

```js live plain
// Bad: one variable, three unrelated purposes
let item = 42;
console.log(item);
item = "hello";
console.log(item);
item = true;
console.log(item);

// Good: each variable has one clear purpose
let answer = 42;
console.log(answer);
let greeting = "hello";
console.log(greeting);
let isComplete = true;
console.log(isComplete);
```

Both halves print the same three values. But point at the word `item` in the top half and ask "what does this hold?": the honest answer is "depends which line you are on", and that is a question the bottom half never raises.

Note the difference from 1.2.5, where changing a variable's type was the *point* of the exercise. Reassigning `score = score + 10` is fine: same purpose, new value. Reassigning `score = "Alice"` is not.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **variable reuse** | Using one variable for different purposes: harder to read and debug |
| **one purpose** | The rule: a variable means one thing for its whole life |
| **reassignment** | Giving a variable a new value. Fine when the *purpose* stays the same |
| **stale label** | A name that no longer describes what is inside |
