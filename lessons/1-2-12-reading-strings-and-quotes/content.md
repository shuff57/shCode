## Three kinds of quote, two kinds of behaviour

A **string** is a piece of text. In JavaScript it must be wrapped in quotes — and there are three marks you can wrap it with.

> **Definition 1.2.3 — Three types of quotes.** Double quotes `"Hello"`, single quotes `'Hello'` and backticks `` `Hello` ``. Double and single are *simple* quotes and work the same way. Backticks are *extended functionality* quotes — they let you embed variables and expressions directly into a string using `${...}`.

So it is not three options, it is two: simple, and the one that can do the extra thing.

**There is no separate character type in JavaScript.** Some languages (C++, Java) have a special type for a single character. JavaScript does not. Zero characters, one character, a whole paragraph — it is all the `string` type.

**What you'll learn from it:**
- A string is text, and must be wrapped in quotes.
- Double and single quotes behave identically — pick one and be consistent.
- Backticks are the only quotes that evaluate `${...}`.
- There is no separate single-character type; `""` and `"a"` are both strings.

**Try it:**

```js live plain
let str = "Hello";
console.log(str);

let str2 = 'Single quotes are ok too';
console.log(str2);

let phrase = `can embed another ${str}`;
console.log(phrase);

let empty = "";
console.log(empty.length);   // 0 — still a string
```

The third one did something the first two cannot. Swap its backticks for double quotes and run it again: you will get the literal text `can embed another ${str}` instead of the value. Double and single quotes treat `${...}` as ordinary characters and do nothing with it.

That embedding is worth its own lesson — 1.2.13.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **string** | A data type for text, enclosed in quotes. Zero or more characters |
| **double / single quotes** | Simple quotes. Interchangeable — `"a"` and `'a'` behave identically |
| **backtick** | `` ` `` — the extended quote, the only one that evaluates `${...}` |
| **empty string** | `""` — a string containing no characters. Still a string |
