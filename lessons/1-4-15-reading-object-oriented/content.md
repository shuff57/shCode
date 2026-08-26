## Put the behaviour where the data is

**Object-oriented programming** (OOP) organises a program around **objects**: values that bundle data together with the operations that work on that data.

You already met the first half in §1.2.22, when you wrote an object literal. It holds data:

An object like `{ title: "JavaScript Guide", pages: 200 }` keeps two related facts in one value instead of two loose variables. The object-oriented idea is to put the *behaviour* in there too, so a bank account object would hold the balance **and** know how to deposit into it, rather than the balance sitting in one place and the depositing happening somewhere else.

> **Definition 1.4.4: Object-oriented programming.** A paradigm that organises a program around objects, each bundling **data** (its properties) with the **behaviour** that operates on that data (its methods).

The contrast with procedural style is the whole point:

| | Procedural | Object-oriented |
|---|---|---|
| Data and behaviour | kept separate | bundled together |
| A program is | a sequence of steps on data | a set of objects that interact |
| You mostly write | procedures | objects and their methods |

Neither is better in the abstract. Procedural code is direct and easy to follow for a small job. Object-oriented code pays off as a program grows, because each object keeps its own data in order and you can use one without knowing how it works inside.

**What you'll learn from it:**
- An object bundles data (properties) with behaviour (methods).
- You have already written the data half: an object literal, §1.2.22.
- Procedural keeps data and behaviour apart; object-oriented puts them together.
- Neither wins in general: direct for small jobs, bundled as programs grow.

**Try it:**

```js live plain
let book = { title: "JavaScript Guide", pages: 200 };

console.log(book.title);
console.log(book.pages);
```

That object holds data and nothing else: no behaviour yet. Methods arrive in Chapter 5, which is where OOP stops being a description and becomes something you write. Next quarter's moSHion work is built this way: every sprite is an object with its own data and its own behaviour.

It is fine: expected, even, to find this abstract right now. You cannot really see the point of bundling data with behaviour until you have written a program big enough to be annoying without it. Chapter 5 builds one.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **object-oriented programming** | Organising a program around objects that bundle data with behaviour |
| **object** | One value holding related data, and (in Chapter 5) the operations on it |
| **property** | A named piece of data inside an object: `book.pages` |
| **method** | A function that belongs to an object: its behaviour. Chapter 5 |
| **object literal** | Writing an object out directly: `{ title: "...", pages: 200 }` |
